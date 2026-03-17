import { supabaseAdmin } from '../config/supabase.js';
import { Errors } from '../utils/errors.js';
import type { Profile, Property, PaginatedResponse, PropertyStatus } from '../types/index.js';

// ─── Admin-specific shapes ────────────────────────────────────────────────────

export interface AdminProperty {
  id: string;
  name: string;
  city: string;
  country: string;
  status: PropertyStatus;
  star_rating: number | null;
  total_rooms: number;
  rejection_reason: string | null;
  created_at: string;
  host: { id: string; full_name: string | null; email: string } | null;
}

export interface AdminBooking {
  id: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_price_cents: number;
  status: string;
  booked_at: string;
  traveller: { id: string; full_name: string | null; email: string } | null;
  property: { id: string; name: string; city: string } | null;
}

export interface PlatformStats {
  totalUsers: number;
  totalHosts: number;
  totalTravellers: number;
  totalProperties: number;
  pendingProperties: number;
  activeProperties: number;
  inactiveProperties: number;
  totalBookings: number;
  confirmedBookings: number;
  totalRevenueCents: number;
}

export async function listUsers(
  params: { role?: string; search?: string; page: number; limit: number },
): Promise<PaginatedResponse<Profile>> {
  let query = supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact' });

  if (params.role) {
    query = query.eq('role', params.role);
  }
  if (params.search) {
    query = query.or(`email.ilike.%${params.search}%,full_name.ilike.%${params.search}%`);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(params.page * params.limit, (params.page + 1) * params.limit - 1);

  const { data, count, error } = await query;
  if (error) throw Errors.internal(error.message);

  return {
    results: (data ?? []) as Profile[],
    totalCount: count ?? 0,
    page: params.page,
    pageSize: params.limit,
    hasNextPage: (params.page + 1) * params.limit < (count ?? 0),
  };
}

export async function updateUserRole(
  userId: string,
  newRole: 'traveller' | 'host' | 'admin',
): Promise<Profile> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error || !data) throw Errors.notFound('User');
  return data as Profile;
}

export async function updatePropertyStatus(
  propertyId: string,
  status: PropertyStatus,
  rejectionReason?: string,
): Promise<Property> {
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  // Store reason when rejecting (inactive), clear it when approving
  if (status === 'inactive') {
    update.rejection_reason = rejectionReason ?? null;
  } else if (status === 'active') {
    update.rejection_reason = null;
  }

  const { data, error } = await supabaseAdmin
    .from('properties')
    .update(update)
    .eq('id', propertyId)
    .select()
    .single();

  if (error || !data) throw Errors.notFound('Property');
  return data as Property;
}

export async function listProperties(
  params: { status?: string; page: number; limit: number },
): Promise<PaginatedResponse<AdminProperty>> {
  let query = supabaseAdmin
    .from('properties')
    .select('id, name, city, country, status, star_rating, total_rooms, rejection_reason, created_at, host_id, profiles!properties_host_id_fkey(id, full_name, email)', { count: 'exact' });

  if (params.status) query = query.eq('status', params.status);

  query = query
    .order('created_at', { ascending: false })
    .range(params.page * params.limit, (params.page + 1) * params.limit - 1);

  const { data, count, error } = await query;
  if (error) throw Errors.internal(error.message);

  const results: AdminProperty[] = (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      name: row.name,
      city: row.city,
      country: row.country,
      status: row.status,
      star_rating: row.star_rating,
      total_rooms: row.total_rooms,
      rejection_reason: row.rejection_reason ?? null,
      created_at: row.created_at,
      host: profile ? { id: profile.id, full_name: profile.full_name, email: profile.email } : null,
    };
  });

  return {
    results,
    totalCount: count ?? 0,
    page: params.page,
    pageSize: params.limit,
    hasNextPage: (params.page + 1) * params.limit < (count ?? 0),
  };
}

export async function listAllBookings(
  params: { status?: string; page: number; limit: number },
): Promise<PaginatedResponse<AdminBooking>> {
  let query = supabaseAdmin
    .from('bookings')
    .select(
      'id, check_in, check_out, total_price_cents, status, booked_at, traveller_id, property_id, profiles!bookings_traveller_id_fkey(id, full_name, email), properties!bookings_property_id_fkey(id, name, city)',
      { count: 'exact' },
    );

  if (params.status) query = query.eq('status', params.status);

  query = query
    .order('booked_at', { ascending: false })
    .range(params.page * params.limit, (params.page + 1) * params.limit - 1);

  const { data, count, error } = await query;
  if (error) throw Errors.internal(error.message);

  const results: AdminBooking[] = (data ?? []).map((row) => {
    const traveller = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
    const checkIn = new Date(row.check_in);
    const checkOut = new Date(row.check_out);
    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
    return {
      id: row.id,
      check_in: row.check_in,
      check_out: row.check_out,
      nights,
      total_price_cents: row.total_price_cents,
      status: row.status,
      booked_at: row.booked_at,
      traveller: traveller ? { id: traveller.id, full_name: traveller.full_name, email: traveller.email } : null,
      property: property ? { id: property.id, name: property.name, city: property.city } : null,
    };
  });

  return {
    results,
    totalCount: count ?? 0,
    page: params.page,
    pageSize: params.limit,
    hasNextPage: (params.page + 1) * params.limit < (count ?? 0),
  };
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const [usersRes, propertiesRes, bookingsRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('role', { count: 'exact' }),
    supabaseAdmin.from('properties').select('status', { count: 'exact' }),
    supabaseAdmin.from('bookings').select('status, total_price_cents', { count: 'exact' }),
  ]);

  if (usersRes.error) throw Errors.internal(usersRes.error.message);
  if (propertiesRes.error) throw Errors.internal(propertiesRes.error.message);
  if (bookingsRes.error) throw Errors.internal(bookingsRes.error.message);

  const users = usersRes.data ?? [];
  const properties = propertiesRes.data ?? [];
  const bookings = bookingsRes.data ?? [];

  return {
    totalUsers: users.length,
    totalHosts: users.filter((u) => u.role === 'host').length,
    totalTravellers: users.filter((u) => u.role === 'traveller').length,
    totalProperties: properties.length,
    pendingProperties: properties.filter((p) => p.status === 'pending_review').length,
    activeProperties: properties.filter((p) => p.status === 'active').length,
    inactiveProperties: properties.filter((p) => p.status === 'inactive').length,
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter((b) => b.status === 'confirmed').length,
    totalRevenueCents: bookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((s, b) => s + (b.total_price_cents ?? 0), 0),
  };
}

export async function getRevenueReport(
  params: { start?: string; end?: string },
): Promise<{
  totalRevenueCents: number;
  totalCommissionCents: number;
  totalNetRevenueCents: number;
  bookingCount: number;
  avgBookingValueCents: number;
  byMonth: { month: string; revenueCents: number; commissionCents: number; count: number }[];
}> {
  let query = supabaseAdmin
    .from('bookings')
    .select('booked_at, total_price_cents, net_revenue_cents, status')
    .neq('status', 'cancelled');

  if (params.start) query = query.gte('booked_at', params.start);
  if (params.end) query = query.lte('booked_at', params.end + 'T23:59:59');

  const { data, error } = await query;
  if (error) throw Errors.internal(error.message);

  const rows = data ?? [];
  const totalRevenueCents = rows.reduce((s, b) => s + (b.total_price_cents ?? 0), 0);
  const totalNetRevenueCents = rows.reduce((s, b) => s + (b.net_revenue_cents ?? 0), 0);
  const totalCommissionCents = totalRevenueCents - totalNetRevenueCents;
  const bookingCount = rows.length;
  const avgBookingValueCents = bookingCount > 0 ? Math.round(totalRevenueCents / bookingCount) : 0;

  // Group by month
  const byMonthMap = new Map<string, { revenueCents: number; commissionCents: number; count: number }>();
  for (const row of rows) {
    const d = new Date(row.booked_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const entry = byMonthMap.get(key) ?? { revenueCents: 0, commissionCents: 0, count: 0 };
    entry.revenueCents += row.total_price_cents ?? 0;
    entry.commissionCents += (row.total_price_cents ?? 0) - (row.net_revenue_cents ?? 0);
    entry.count += 1;
    byMonthMap.set(key, entry);
  }

  const byMonth = Array.from(byMonthMap.entries())
    .map(([month, vals]) => ({ month, ...vals }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return { totalRevenueCents, totalCommissionCents, totalNetRevenueCents, bookingCount, avgBookingValueCents, byMonth };
}

export async function getBookingReport(
  params: { start?: string; end?: string },
): Promise<{
  totalBookings: number;
  byStatus: { status: string; count: number }[];
  byMonth: { month: string; total: number; confirmed: number; cancelled: number; completed: number }[];
}> {
  let query = supabaseAdmin
    .from('bookings')
    .select('booked_at, status');

  if (params.start) query = query.gte('booked_at', params.start);
  if (params.end) query = query.lte('booked_at', params.end + 'T23:59:59');

  const { data, error } = await query;
  if (error) throw Errors.internal(error.message);

  const rows = data ?? [];
  const totalBookings = rows.length;

  // By status
  const statusMap = new Map<string, number>();
  for (const row of rows) {
    statusMap.set(row.status, (statusMap.get(row.status) ?? 0) + 1);
  }
  const byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

  // By month
  const monthMap = new Map<string, { total: number; confirmed: number; cancelled: number; completed: number }>();
  for (const row of rows) {
    const d = new Date(row.booked_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthMap.get(key) ?? { total: 0, confirmed: 0, cancelled: 0, completed: 0 };
    entry.total += 1;
    if (row.status === 'confirmed') entry.confirmed += 1;
    else if (row.status === 'cancelled') entry.cancelled += 1;
    else if (row.status === 'completed') entry.completed += 1;
    monthMap.set(key, entry);
  }

  const byMonth = Array.from(monthMap.entries())
    .map(([month, vals]) => ({ month, ...vals }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return { totalBookings, byStatus, byMonth };
}
