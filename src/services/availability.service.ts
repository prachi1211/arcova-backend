import { supabaseAdmin } from '../config/supabase.js';
import { Errors } from '../utils/errors.js';
import type { Availability } from '../types/index.js';

export async function getAvailability(
  propertyId: string,
  startDate: string,
  endDate: string,
  userId: string,
  role: string,
): Promise<{ roomTypeId: string; roomTypeName: string; availability: Availability[] }[]> {
  // Verify ownership (host sees own, admin sees all)
  if (role === 'host') {
    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('host_id', userId)
      .single();

    if (!property) throw Errors.forbidden();
  }

  // Fetch room types for this property
  const { data: roomTypes, error: rtError } = await supabaseAdmin
    .from('room_types')
    .select('id, name')
    .eq('property_id', propertyId);

  if (rtError) throw Errors.internal(rtError.message);
  if (!roomTypes?.length) return [];

  const rtIds = roomTypes.map((rt) => rt.id);

  // Fetch availability rows for date range
  const { data: availRows, error: availError } = await supabaseAdmin
    .from('availability')
    .select('*')
    .in('room_type_id', rtIds)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (availError) throw Errors.internal(availError.message);

  // Group by room type
  return roomTypes.map((rt) => ({
    roomTypeId: rt.id,
    roomTypeName: rt.name,
    availability: (availRows ?? []).filter((a) => a.room_type_id === rt.id) as Availability[],
  }));
}

export async function bulkUpdateAvailability(
  entries: { room_type_id: string; date: string; available_rooms: number; is_closed?: boolean }[],
  userId: string,
): Promise<Availability[]> {
  if (entries.length === 0) throw Errors.badRequest('No entries provided');

  // Collect unique room type IDs and verify ownership for all of them
  const roomTypeIds = [...new Set(entries.map((e) => e.room_type_id))];

  for (const rtId of roomTypeIds) {
    const { data: roomType } = await supabaseAdmin
      .from('room_types')
      .select('property_id')
      .eq('id', rtId)
      .single();

    if (!roomType) throw Errors.notFound(`Room type ${rtId}`);

    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', roomType.property_id)
      .eq('host_id', userId)
      .single();

    if (!property) throw Errors.forbidden();
  }

  // Upsert all entries
  const upsertRows = entries.map((e) => ({
    room_type_id: e.room_type_id,
    date: e.date,
    available_rooms: e.available_rooms,
    is_closed: e.is_closed ?? false,
  }));

  const { data, error } = await supabaseAdmin
    .from('availability')
    .upsert(upsertRows, { onConflict: 'room_type_id,date' })
    .select();

  if (error) throw Errors.internal(error.message);
  return (data ?? []) as Availability[];
}
