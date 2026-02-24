import { supabaseAdmin } from '../config/supabase.js';
import { Errors } from '../utils/errors.js';
import { calculateEffectiveRate } from '../utils/pricing-engine.js';
import { parseDateRange } from '../utils/helpers.js';
import type {
  Booking,
  CreateBookingInput,
  PaginatedResponse,
  PricingRule,
} from '../types/index.js';

export async function createBooking(
  input: CreateBookingInput,
  travellerId: string,
): Promise<Booking> {
  const checkIn = new Date(input.check_in);
  const checkOut = new Date(input.check_out);
  const now = new Date();

  // Validate dates
  if (checkIn < now) throw Errors.badRequest('Check-in date must be in the future');
  if (checkOut <= checkIn) throw Errors.badRequest('Check-out must be after check-in');

  // Fetch room type and verify it belongs to the property
  const { data: roomType, error: rtError } = await supabaseAdmin
    .from('room_types')
    .select('*')
    .eq('id', input.room_type_id)
    .eq('property_id', input.property_id)
    .eq('status', 'active')
    .single();

  if (rtError || !roomType) throw Errors.notFound('Room type');

  if (input.num_guests > roomType.max_guests * input.num_rooms) {
    throw Errors.badRequest(`Max ${roomType.max_guests * input.num_rooms} guests for ${input.num_rooms} room(s)`);
  }

  // Check availability for each date in range
  const dates = parseDateRange(input.check_in, input.check_out);
  const dateStrings = dates.map((d) => d.toISOString().split('T')[0]);

  const { data: availRows } = await supabaseAdmin
    .from('availability')
    .select('*')
    .eq('room_type_id', input.room_type_id)
    .in('date', dateStrings);

  const availMap = new Map((availRows ?? []).map((a) => [a.date, a]));

  for (const dateStr of dateStrings) {
    const avail = availMap.get(dateStr);
    const available = avail ? avail.available_rooms : roomType.total_inventory;
    if (avail?.is_closed) {
      throw Errors.conflict(`No availability on ${dateStr} — closed`);
    }
    if (available < input.num_rooms) {
      throw Errors.conflict(`Only ${available} room(s) available on ${dateStr}`);
    }
  }

  // Fetch pricing rules for this room type
  const { data: rules } = await supabaseAdmin
    .from('pricing_rules')
    .select('*')
    .eq('room_type_id', input.room_type_id)
    .eq('is_active', true);

  // Calculate total price: sum effective rate for each night × num_rooms
  let totalPriceCents = 0;
  for (const dateStr of dateStrings) {
    const result = calculateEffectiveRate(
      roomType.base_price_cents,
      dateStr,
      (rules ?? []) as PricingRule[],
    );
    totalPriceCents += result.effectivePrice;
  }
  totalPriceCents *= input.num_rooms;

  const commissionRate = 15;

  // Insert booking
  const { data: booking, error: insertError } = await supabaseAdmin
    .from('bookings')
    .insert({
      traveller_id: travellerId,
      property_id: input.property_id,
      room_type_id: input.room_type_id,
      check_in: input.check_in,
      check_out: input.check_out,
      num_guests: input.num_guests,
      num_rooms: input.num_rooms,
      total_price_cents: totalPriceCents,
      commission_rate: commissionRate,
      net_revenue_cents: totalPriceCents - Math.round(totalPriceCents * commissionRate / 100),
      status: 'confirmed',
      booking_source: 'platform',
      special_requests: input.special_requests ?? null,
    })
    .select()
    .single();

  if (insertError || !booking) throw Errors.internal(insertError?.message ?? 'Failed to create booking');

  // Decrement availability for each date
  for (const dateStr of dateStrings) {
    const avail = availMap.get(dateStr);
    if (avail) {
      const { error: availError } = await supabaseAdmin
        .from('availability')
        .update({ available_rooms: avail.available_rooms - input.num_rooms })
        .eq('id', avail.id);
      if (availError) throw Errors.internal(availError.message);
    } else {
      // No availability row yet — create one with reduced count
      const { error: insertError } = await supabaseAdmin
        .from('availability')
        .insert({
          room_type_id: input.room_type_id,
          date: dateStr,
          available_rooms: roomType.total_inventory - input.num_rooms,
          is_closed: false,
        });
      if (insertError) throw Errors.internal(insertError.message);
    }
  }

  return booking as Booking;
}

export async function getBookings(
  userId: string,
  role: string,
  params: { status?: string; page: number; limit: number },
): Promise<PaginatedResponse<Booking>> {
  let query = supabaseAdmin
    .from('bookings')
    .select('*, properties(name, city), room_types(name)', { count: 'exact' });

  // Scope by role
  if (role === 'traveller') {
    query = query.eq('traveller_id', userId);
  } else if (role === 'host') {
    // First get host's property IDs
    const { data: props } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('host_id', userId);
    const propIds = (props ?? []).map((p) => p.id);
    if (propIds.length === 0) {
      return { results: [], totalCount: 0, page: params.page, pageSize: params.limit, hasNextPage: false };
    }
    query = query.in('property_id', propIds);
  }
  // admin: no filter

  if (params.status) {
    query = query.eq('status', params.status);
  }

  query = query
    .order('booked_at', { ascending: false })
    .range(params.page * params.limit, (params.page + 1) * params.limit - 1);

  const { data, count, error } = await query;
  if (error) throw Errors.internal(error.message);

  return {
    results: (data ?? []) as Booking[],
    totalCount: count ?? 0,
    page: params.page,
    pageSize: params.limit,
    hasNextPage: (params.page + 1) * params.limit < (count ?? 0),
  };
}

export async function getBooking(
  bookingId: string,
  userId: string,
  role: string,
): Promise<Booking> {
  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .select('*, properties(name, city), room_types(name)')
    .eq('id', bookingId)
    .single();

  if (error || !booking) throw Errors.notFound('Booking');

  // Authorize
  if (role === 'traveller' && booking.traveller_id !== userId) {
    throw Errors.forbidden();
  }
  if (role === 'host') {
    const { data: prop } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', booking.property_id)
      .eq('host_id', userId)
      .single();
    if (!prop) throw Errors.forbidden();
  }

  return booking as Booking;
}

export async function cancelBooking(
  bookingId: string,
  userId: string,
): Promise<Booking> {
  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('traveller_id', userId)
    .single();

  if (error || !booking) throw Errors.notFound('Booking');
  if (booking.status !== 'confirmed') throw Errors.badRequest('Only confirmed bookings can be cancelled');

  // Check if check-in is within 24 hours
  const checkIn = new Date(booking.check_in);
  const hoursUntilCheckIn = (checkIn.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntilCheckIn < 24) {
    throw Errors.badRequest('Cannot cancel within 24 hours of check-in');
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (updateError || !updated) throw Errors.internal(updateError?.message ?? 'Failed to cancel booking');

  // Restore availability
  const dates = parseDateRange(booking.check_in, booking.check_out);
  for (const date of dates) {
    const dateStr = date.toISOString().split('T')[0];
    const { data: avail } = await supabaseAdmin
      .from('availability')
      .select('*')
      .eq('room_type_id', booking.room_type_id)
      .eq('date', dateStr)
      .single();

    if (avail) {
      const { error: restoreError } = await supabaseAdmin
        .from('availability')
        .update({ available_rooms: avail.available_rooms + booking.num_rooms })
        .eq('id', avail.id);
      if (restoreError) throw Errors.internal(restoreError.message);
    }
  }

  return updated as Booking;
}

export async function getBookingSummary(
  userId: string,
  role: string,
  params: { propertyId?: string; period: string },
): Promise<{
  totalBookings: number;
  confirmedCount: number;
  cancelledCount: number;
  completedCount: number;
  totalRevenueCents: number;
  netRevenueCents: number;
  avgBookingValueCents: number;
}> {
  // Determine date range from period
  const now = new Date();
  const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
  const days = daysMap[params.period] ?? 30;
  const startDate = new Date(now.getTime() - days * 86400000).toISOString();

  let query = supabaseAdmin
    .from('bookings')
    .select('status, total_price_cents, net_revenue_cents')
    .gte('booked_at', startDate);

  // Scope by role
  if (role === 'host') {
    if (params.propertyId) {
      // Verify host owns this property
      const { data: prop } = await supabaseAdmin
        .from('properties')
        .select('id')
        .eq('id', params.propertyId)
        .eq('host_id', userId)
        .single();
      if (!prop) throw Errors.forbidden();
      query = query.eq('property_id', params.propertyId);
    } else {
      const { data: props } = await supabaseAdmin
        .from('properties')
        .select('id')
        .eq('host_id', userId);
      const propIds = (props ?? []).map((p) => p.id);
      if (propIds.length === 0) {
        return { totalBookings: 0, confirmedCount: 0, cancelledCount: 0, completedCount: 0, totalRevenueCents: 0, netRevenueCents: 0, avgBookingValueCents: 0 };
      }
      query = query.in('property_id', propIds);
    }
  }
  // admin: no additional filter

  const { data: bookings, error } = await query;
  if (error) throw Errors.internal(error.message);

  const rows = bookings ?? [];
  const totalBookings = rows.length;
  const confirmedCount = rows.filter((b) => b.status === 'confirmed').length;
  const cancelledCount = rows.filter((b) => b.status === 'cancelled').length;
  const completedCount = rows.filter((b) => b.status === 'completed').length;
  const totalRevenueCents = rows.reduce((sum, b) => sum + (b.total_price_cents ?? 0), 0);
  const netRevenueCents = rows.reduce((sum, b) => sum + (b.net_revenue_cents ?? 0), 0);
  const avgBookingValueCents = totalBookings > 0 ? Math.round(totalRevenueCents / totalBookings) : 0;

  return { totalBookings, confirmedCount, cancelledCount, completedCount, totalRevenueCents, netRevenueCents, avgBookingValueCents };
}
