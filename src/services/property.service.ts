import { supabaseAdmin } from '../config/supabase.js';
import { Errors } from '../utils/errors.js';
import type { Property, RoomType, PaginatedResponse } from '../types/index.js';

export async function listProperties(
  userId: string,
  role: string,
  params: { status?: string; page: number; limit: number },
): Promise<PaginatedResponse<Property>> {
  let query = supabaseAdmin
    .from('properties')
    .select('*, room_types(id, name, base_price_cents, total_inventory, status)', { count: 'exact' });

  // Host sees own properties, admin sees all
  if (role === 'host') {
    query = query.eq('host_id', userId);
  }

  if (params.status) {
    query = query.eq('status', params.status);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(params.page * params.limit, (params.page + 1) * params.limit - 1);

  const { data, count, error } = await query;
  if (error) throw Errors.internal(error.message);

  return {
    results: (data ?? []) as Property[],
    totalCount: count ?? 0,
    page: params.page,
    pageSize: params.limit,
    hasNextPage: (params.page + 1) * params.limit < (count ?? 0),
  };
}

export async function getProperty(
  propertyId: string,
  userId: string,
  role: string,
): Promise<Property & { room_types: RoomType[] }> {
  const { data, error } = await supabaseAdmin
    .from('properties')
    .select('*, room_types(*)')
    .eq('id', propertyId)
    .single();

  if (error || !data) throw Errors.notFound('Property');

  // Host can only see own properties
  if (role === 'host' && data.host_id !== userId) throw Errors.forbidden();

  return data as Property & { room_types: RoomType[] };
}

export async function createProperty(
  input: {
    name: string;
    description?: string;
    city: string;
    country: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    star_rating?: number;
    property_type?: string;
    amenities?: string[];
    images?: string[];
    total_rooms?: number;
  },
  hostId: string,
): Promise<Property> {
  const { data, error } = await supabaseAdmin
    .from('properties')
    .insert({
      host_id: hostId,
      name: input.name,
      description: input.description ?? null,
      city: input.city,
      country: input.country,
      address: input.address ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      star_rating: input.star_rating ?? null,
      property_type: input.property_type ?? null,
      amenities: input.amenities ?? [],
      images: input.images ?? [],
      total_rooms: input.total_rooms ?? 1,
      status: 'active',
    })
    .select()
    .single();

  if (error || !data) throw Errors.internal(error?.message ?? 'Failed to create property');
  return data as Property;
}

export async function updateProperty(
  propertyId: string,
  hostId: string,
  updates: Partial<Pick<Property, 'name' | 'description' | 'city' | 'country' | 'address' | 'latitude' | 'longitude' | 'star_rating' | 'property_type' | 'amenities' | 'images' | 'total_rooms' | 'status'>>,
): Promise<Property> {
  const { data, error } = await supabaseAdmin
    .from('properties')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', propertyId)
    .eq('host_id', hostId)
    .select()
    .single();

  if (error || !data) throw Errors.notFound('Property');
  return data as Property;
}

export async function createRoomType(
  propertyId: string,
  hostId: string,
  input: {
    name: string;
    description?: string;
    max_guests?: number;
    bed_type?: string;
    base_price_cents: number;
    currency?: string;
    total_inventory?: number;
    amenities?: string[];
  },
): Promise<RoomType> {
  // Verify host owns the property
  const { data: property } = await supabaseAdmin
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('host_id', hostId)
    .single();

  if (!property) throw Errors.notFound('Property');

  const { data, error } = await supabaseAdmin
    .from('room_types')
    .insert({
      property_id: propertyId,
      name: input.name,
      description: input.description ?? null,
      max_guests: input.max_guests ?? 2,
      bed_type: input.bed_type ?? null,
      base_price_cents: input.base_price_cents,
      currency: input.currency ?? 'USD',
      total_inventory: input.total_inventory ?? 1,
      amenities: input.amenities ?? [],
      status: 'active',
    })
    .select()
    .single();

  if (error || !data) throw Errors.internal(error?.message ?? 'Failed to create room type');
  return data as RoomType;
}

export async function updateRoomType(
  propertyId: string,
  roomTypeId: string,
  hostId: string,
  updates: Partial<Pick<RoomType, 'name' | 'description' | 'max_guests' | 'bed_type' | 'base_price_cents' | 'currency' | 'total_inventory' | 'amenities' | 'status'>>,
): Promise<RoomType> {
  // Verify host owns the property
  const { data: property } = await supabaseAdmin
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('host_id', hostId)
    .single();

  if (!property) throw Errors.notFound('Property');

  const { data, error } = await supabaseAdmin
    .from('room_types')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', roomTypeId)
    .eq('property_id', propertyId)
    .select()
    .single();

  if (error || !data) throw Errors.notFound('Room type');
  return data as RoomType;
}
