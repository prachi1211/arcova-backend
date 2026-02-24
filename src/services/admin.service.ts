import { supabaseAdmin } from '../config/supabase.js';
import { Errors } from '../utils/errors.js';
import type { Profile, Property, PaginatedResponse, PropertyStatus } from '../types/index.js';

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
): Promise<Property> {
  const { data, error } = await supabaseAdmin
    .from('properties')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', propertyId)
    .select()
    .single();

  if (error || !data) throw Errors.notFound('Property');
  return data as Property;
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
