import { supabaseAdmin } from '../config/supabase.js';
import { Errors } from '../utils/errors.js';

// Helper: get property IDs the host owns, or all if admin
async function getPropertyScope(
  userId: string,
  role: string,
  propertyId?: string,
): Promise<string[]> {
  if (propertyId) {
    if (role === 'host') {
      const { data } = await supabaseAdmin
        .from('properties')
        .select('id')
        .eq('id', propertyId)
        .eq('host_id', userId)
        .single();
      if (!data) throw Errors.forbidden();
    }
    return [propertyId];
  }

  if (role === 'admin') return []; // Empty means "all" — no filter
  // Host: scope to own properties
  const { data: props } = await supabaseAdmin
    .from('properties')
    .select('id')
    .eq('host_id', userId);
  return (props ?? []).map((p) => p.id);
}

function periodToStartDate(period: string): string {
  const days: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
  const d = days[period] ?? 30;
  return new Date(Date.now() - d * 86400000).toISOString().split('T')[0];
}

export async function getDashboardKPIs(
  userId: string,
  role: string,
  params: { propertyId?: string; period: string },
): Promise<{
  totalRevenueCents: number;
  netRevenueCents: number;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  avgBookingValueCents: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
}> {
  const propIds = await getPropertyScope(userId, role, params.propertyId);
  const startDate = periodToStartDate(params.period);

  // If host with no properties, return zeros
  if (role === 'host' && propIds.length === 0) {
    return { totalRevenueCents: 0, netRevenueCents: 0, totalBookings: 0, confirmedBookings: 0, cancelledBookings: 0, avgBookingValueCents: 0, occupancyRate: 0, adr: 0, revpar: 0 };
  }

  let query = supabaseAdmin
    .from('bookings')
    .select('status, total_price_cents, net_revenue_cents, num_rooms, check_in, check_out')
    .gte('booked_at', startDate);

  if (propIds.length > 0) query = query.in('property_id', propIds);

  const { data: bookings, error } = await query;
  if (error) throw Errors.internal(error.message);

  const rows = bookings ?? [];
  const totalBookings = rows.length;
  const confirmedBookings = rows.filter((b) => b.status === 'confirmed' || b.status === 'completed').length;
  const cancelledBookings = rows.filter((b) => b.status === 'cancelled').length;
  const revenueRows = rows.filter((b) => b.status !== 'cancelled');
  const totalRevenueCents = revenueRows.reduce((s, b) => s + (b.total_price_cents ?? 0), 0);
  const netRevenueCents = revenueRows.reduce((s, b) => s + (b.net_revenue_cents ?? 0), 0);
  const avgBookingValueCents = revenueRows.length > 0 ? Math.round(totalRevenueCents / revenueRows.length) : 0;

  // Calculate total room-nights booked
  const totalRoomNights = revenueRows.reduce((s, b) => {
    const nights = Math.max(1, Math.ceil((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000));
    return s + nights * (b.num_rooms ?? 1);
  }, 0);

  // Fetch total room inventory for the property scope
  let inventoryQuery = supabaseAdmin.from('room_types').select('total_inventory').eq('status', 'active');
  if (propIds.length > 0) inventoryQuery = inventoryQuery.in('property_id', propIds);

  const { data: roomTypes } = await inventoryQuery;
  const totalInventory = (roomTypes ?? []).reduce((s, rt) => s + (rt.total_inventory ?? 0), 0);

  const daysInPeriod = ({ '7d': 7, '30d': 30, '90d': 90 })[params.period] ?? 30;
  const totalAvailableRoomNights = totalInventory * daysInPeriod;

  const occupancyRate = totalAvailableRoomNights > 0 ? Math.round((totalRoomNights / totalAvailableRoomNights) * 100) : 0;
  const adr = totalRoomNights > 0 ? Math.round(totalRevenueCents / totalRoomNights) : 0;
  const revpar = totalAvailableRoomNights > 0 ? Math.round(totalRevenueCents / totalAvailableRoomNights) : 0;

  return { totalRevenueCents, netRevenueCents, totalBookings, confirmedBookings, cancelledBookings, avgBookingValueCents, occupancyRate, adr, revpar };
}

export async function getRevenueTimeSeries(
  userId: string,
  role: string,
  params: { propertyId?: string; start?: string; end?: string; granularity: string },
): Promise<{ date: string; grossRevenueCents: number; netRevenueCents: number; bookingCount: number }[]> {
  const propIds = await getPropertyScope(userId, role, params.propertyId);
  const startDate = params.start ?? periodToStartDate('30d');
  const endDate = params.end ?? new Date().toISOString().split('T')[0];

  if (role === 'host' && propIds.length === 0) return [];

  let query = supabaseAdmin
    .from('bookings')
    .select('booked_at, total_price_cents, net_revenue_cents, status')
    .gte('booked_at', startDate)
    .lte('booked_at', endDate + 'T23:59:59')
    .neq('status', 'cancelled');

  if (propIds.length > 0) query = query.in('property_id', propIds);

  const { data, error } = await query;
  if (error) throw Errors.internal(error.message);

  // Group by date bucket
  const buckets = new Map<string, { grossRevenueCents: number; netRevenueCents: number; bookingCount: number }>();

  for (const row of data ?? []) {
    const bookedDate = new Date(row.booked_at);
    let key: string;

    if (params.granularity === 'week') {
      // ISO week start (Monday)
      const d = new Date(bookedDate);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      key = d.toISOString().split('T')[0];
    } else if (params.granularity === 'month') {
      key = `${bookedDate.getFullYear()}-${String(bookedDate.getMonth() + 1).padStart(2, '0')}-01`;
    } else {
      key = bookedDate.toISOString().split('T')[0];
    }

    const bucket = buckets.get(key) ?? { grossRevenueCents: 0, netRevenueCents: 0, bookingCount: 0 };
    bucket.grossRevenueCents += row.total_price_cents ?? 0;
    bucket.netRevenueCents += row.net_revenue_cents ?? 0;
    bucket.bookingCount += 1;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .map(([date, vals]) => ({ date, ...vals }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getOccupancyTimeSeries(
  userId: string,
  role: string,
  params: { propertyId?: string; start?: string; end?: string },
): Promise<{ date: string; occupancyPercent: number; bookedRooms: number; totalRooms: number }[]> {
  const propIds = await getPropertyScope(userId, role, params.propertyId);
  const startDate = params.start ?? periodToStartDate('30d');
  const endDate = params.end ?? new Date().toISOString().split('T')[0];

  if (role === 'host' && propIds.length === 0) return [];

  // Fetch total room inventory
  let inventoryQuery = supabaseAdmin.from('room_types').select('total_inventory').eq('status', 'active');
  if (propIds.length > 0) inventoryQuery = inventoryQuery.in('property_id', propIds);
  const { data: roomTypes } = await inventoryQuery;
  const totalRooms = (roomTypes ?? []).reduce((s, rt) => s + (rt.total_inventory ?? 0), 0);

  if (totalRooms === 0) return [];

  // Fetch non-cancelled bookings overlapping the date range
  let bookingQuery = supabaseAdmin
    .from('bookings')
    .select('check_in, check_out, num_rooms, status')
    .lte('check_in', endDate)
    .gte('check_out', startDate)
    .neq('status', 'cancelled');

  if (propIds.length > 0) bookingQuery = bookingQuery.in('property_id', propIds);
  const { data: bookings } = await bookingQuery;

  // Build daily map
  const dailyMap = new Map<string, number>();
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dailyMap.set(d.toISOString().split('T')[0], 0);
  }

  for (const b of bookings ?? []) {
    const ci = new Date(b.check_in);
    const co = new Date(b.check_out);
    for (let d = new Date(Math.max(ci.getTime(), start.getTime())); d < co && d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + (b.num_rooms ?? 1));
    }
  }

  return Array.from(dailyMap.entries())
    .map(([date, bookedRooms]) => ({
      date,
      bookedRooms,
      totalRooms,
      occupancyPercent: Math.round((bookedRooms / totalRooms) * 100),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getChannelMix(
  userId: string,
  role: string,
  params: { propertyId?: string; period?: string },
): Promise<{ source: string; bookingCount: number; revenueCents: number; percentage: number }[]> {
  const propIds = await getPropertyScope(userId, role, params.propertyId);
  const startDate = periodToStartDate(params.period ?? '30d');

  if (role === 'host' && propIds.length === 0) return [];

  let query = supabaseAdmin
    .from('bookings')
    .select('booking_source, total_price_cents')
    .gte('booked_at', startDate)
    .neq('status', 'cancelled');

  if (propIds.length > 0) query = query.in('property_id', propIds);

  const { data, error } = await query;
  if (error) throw Errors.internal(error.message);

  const bySource = new Map<string, { bookingCount: number; revenueCents: number }>();
  for (const row of data ?? []) {
    const src = row.booking_source ?? 'unknown';
    const entry = bySource.get(src) ?? { bookingCount: 0, revenueCents: 0 };
    entry.bookingCount += 1;
    entry.revenueCents += row.total_price_cents ?? 0;
    bySource.set(src, entry);
  }

  const totalRevenue = Array.from(bySource.values()).reduce((s, e) => s + e.revenueCents, 0);

  return Array.from(bySource.entries())
    .map(([source, vals]) => ({
      source,
      ...vals,
      percentage: totalRevenue > 0 ? Math.round((vals.revenueCents / totalRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents);
}

export async function getPlatformMetrics(): Promise<{
  totalUsers: number;
  totalTravellers: number;
  totalHosts: number;
  totalProperties: number;
  activeProperties: number;
  totalBookings: number;
  totalRevenueCents: number;
  totalCommissionCents: number;
}> {
  // User counts
  const { count: totalUsers } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: totalTravellers } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'traveller');

  const { count: totalHosts } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'host');

  // Property counts
  const { count: totalProperties } = await supabaseAdmin
    .from('properties')
    .select('*', { count: 'exact', head: true });

  const { count: activeProperties } = await supabaseAdmin
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  // Booking aggregate
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('total_price_cents, net_revenue_cents, status');

  const rows = (bookings ?? []).filter((b) => b.status !== 'cancelled');
  const totalBookings = bookings?.length ?? 0;
  const totalRevenueCents = rows.reduce((s, b) => s + (b.total_price_cents ?? 0), 0);
  const totalNetCents = rows.reduce((s, b) => s + (b.net_revenue_cents ?? 0), 0);
  const totalCommissionCents = totalRevenueCents - totalNetCents;

  return {
    totalUsers: totalUsers ?? 0,
    totalTravellers: totalTravellers ?? 0,
    totalHosts: totalHosts ?? 0,
    totalProperties: totalProperties ?? 0,
    activeProperties: activeProperties ?? 0,
    totalBookings,
    totalRevenueCents,
    totalCommissionCents,
  };
}
