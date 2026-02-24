import { supabaseAdmin } from '../config/supabase.js';
import { Errors } from '../utils/errors.js';
import type {
  Itinerary,
  ItineraryItem,
  CreateItineraryInput,
  CreateItineraryItemInput,
  PaginatedResponse,
  TripPlan,
  ItineraryItemType,
} from '../types/index.js';

export async function createItinerary(
  input: CreateItineraryInput,
  travellerId: string,
): Promise<Itinerary> {
  const startDate = new Date(input.start_date);
  const endDate = new Date(input.end_date);
  if (endDate <= startDate) throw Errors.badRequest('End date must be after start date');

  const { data, error } = await supabaseAdmin
    .from('itineraries')
    .insert({
      traveller_id: travellerId,
      name: input.name,
      description: input.description ?? null,
      start_date: input.start_date,
      end_date: input.end_date,
      cover_image_url: input.cover_image_url ?? null,
      total_estimated_cost_cents: 0,
    })
    .select()
    .single();

  if (error || !data) throw Errors.internal(error?.message ?? 'Failed to create itinerary');
  return { ...data, items: [] } as Itinerary;
}

export async function getItineraries(
  travellerId: string,
  params: { page: number; limit: number },
): Promise<PaginatedResponse<Itinerary>> {
  const { data, count, error } = await supabaseAdmin
    .from('itineraries')
    .select('*, itinerary_items(*)', { count: 'exact' })
    .eq('traveller_id', travellerId)
    .order('created_at', { ascending: false })
    .range(params.page * params.limit, (params.page + 1) * params.limit - 1);

  if (error) throw Errors.internal(error.message);

  const itineraries = (data ?? []).map((row) => ({
    ...row,
    items: ((row.itinerary_items ?? []) as ItineraryItem[]).sort((a, b) => a.sort_order - b.sort_order),
  })) as Itinerary[];

  return {
    results: itineraries,
    totalCount: count ?? 0,
    page: params.page,
    pageSize: params.limit,
    hasNextPage: (params.page + 1) * params.limit < (count ?? 0),
  };
}

export async function getItinerary(
  itineraryId: string,
  travellerId: string,
): Promise<Itinerary> {
  const { data, error } = await supabaseAdmin
    .from('itineraries')
    .select('*, itinerary_items(*)')
    .eq('id', itineraryId)
    .eq('traveller_id', travellerId)
    .single();

  if (error || !data) throw Errors.notFound('Itinerary');

  return {
    ...data,
    items: ((data.itinerary_items ?? []) as ItineraryItem[]).sort((a, b) => a.sort_order - b.sort_order),
  } as Itinerary;
}

export async function updateItinerary(
  itineraryId: string,
  travellerId: string,
  updates: Partial<Pick<Itinerary, 'name' | 'description' | 'start_date' | 'end_date' | 'cover_image_url'>>,
): Promise<Itinerary> {
  if (updates.start_date && updates.end_date) {
    if (new Date(updates.end_date) <= new Date(updates.start_date)) {
      throw Errors.badRequest('End date must be after start date');
    }
  }

  const { data, error } = await supabaseAdmin
    .from('itineraries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', itineraryId)
    .eq('traveller_id', travellerId)
    .select('*, itinerary_items(*)')
    .single();

  if (error || !data) throw Errors.notFound('Itinerary');

  return {
    ...data,
    items: ((data.itinerary_items ?? []) as ItineraryItem[]).sort((a, b) => a.sort_order - b.sort_order),
  } as Itinerary;
}

export async function deleteItinerary(
  itineraryId: string,
  travellerId: string,
): Promise<void> {
  // Verify ownership before deleting
  const { data: existing } = await supabaseAdmin
    .from('itineraries')
    .select('id')
    .eq('id', itineraryId)
    .eq('traveller_id', travellerId)
    .single();

  if (!existing) throw Errors.notFound('Itinerary');

  const { error } = await supabaseAdmin
    .from('itineraries')
    .delete()
    .eq('id', itineraryId);

  if (error) throw Errors.internal(error.message);
}

export async function addItem(
  itineraryId: string,
  travellerId: string,
  input: CreateItineraryItemInput,
): Promise<ItineraryItem> {
  // Verify ownership
  const { data: itinerary } = await supabaseAdmin
    .from('itineraries')
    .select('id')
    .eq('id', itineraryId)
    .eq('traveller_id', travellerId)
    .single();

  if (!itinerary) throw Errors.notFound('Itinerary');

  // Auto-assign sort_order if not provided
  let sortOrder = input.sort_order;
  if (sortOrder == null) {
    const { data: lastItem } = await supabaseAdmin
      .from('itinerary_items')
      .select('sort_order')
      .eq('itinerary_id', itineraryId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();
    sortOrder = lastItem ? lastItem.sort_order + 1 : 0;
  }

  const { data: item, error } = await supabaseAdmin
    .from('itinerary_items')
    .insert({
      itinerary_id: itineraryId,
      type: input.type,
      booking_id: input.booking_id ?? null,
      title: input.title,
      description: input.description ?? null,
      date: input.date,
      time: input.time ?? null,
      end_time: input.end_time ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
      estimated_cost_cents: input.estimated_cost_cents ?? null,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error || !item) throw Errors.internal(error?.message ?? 'Failed to add item');

  // Recalculate total estimated cost
  await recalculateTotalCost(itineraryId);

  return item as ItineraryItem;
}

export async function removeItem(
  itineraryId: string,
  itemId: string,
  travellerId: string,
): Promise<void> {
  // Verify ownership
  const { data: itinerary } = await supabaseAdmin
    .from('itineraries')
    .select('id')
    .eq('id', itineraryId)
    .eq('traveller_id', travellerId)
    .single();

  if (!itinerary) throw Errors.notFound('Itinerary');

  const { error } = await supabaseAdmin
    .from('itinerary_items')
    .delete()
    .eq('id', itemId)
    .eq('itinerary_id', itineraryId);

  if (error) throw Errors.internal(error.message);

  // Recalculate total estimated cost
  await recalculateTotalCost(itineraryId);
}

export async function createFromTripPlanBySession(
  travellerId: string,
  sessionId: string,
  name?: string,
): Promise<Itinerary> {
  const { data: conversation, error } = await supabaseAdmin
    .from('conversations')
    .select('trip_plan')
    .eq('session_id', sessionId)
    .eq('traveller_id', travellerId)
    .single();

  if (error || !conversation) throw Errors.notFound('Conversation');
  if (!conversation.trip_plan) throw Errors.badRequest('No trip plan found in this conversation');

  return createFromTripPlan(travellerId, conversation.trip_plan as TripPlan, name);
}

export async function createFromTripPlan(
  travellerId: string,
  tripPlan: TripPlan,
  name?: string,
): Promise<Itinerary> {
  const itineraryName = name ?? `Trip to ${tripPlan.destination}`;

  // Create the itinerary
  const { data: itinerary, error: createError } = await supabaseAdmin
    .from('itineraries')
    .insert({
      traveller_id: travellerId,
      name: itineraryName,
      description: `AI-generated trip plan for ${tripPlan.destination}`,
      start_date: tripPlan.dates.start,
      end_date: tripPlan.dates.end,
      total_estimated_cost_cents: 0,
    })
    .select()
    .single();

  if (createError || !itinerary) throw Errors.internal(createError?.message ?? 'Failed to create itinerary');

  // Convert trip plan activities to itinerary items
  const items: {
    itinerary_id: string;
    type: ItineraryItemType;
    title: string;
    description: string;
    date: string;
    time: string;
    estimated_cost_cents: number;
    sort_order: number;
  }[] = [];

  let sortOrder = 0;
  for (const day of tripPlan.itinerary) {
    for (const activity of day.activities) {
      // Map TripActivity type to ItineraryItemType
      const typeMap: Record<string, ItineraryItemType> = {
        activity: 'activity',
        meal: 'meal',
        transport: 'transport',
        accommodation: 'hotel',
      };

      items.push({
        itinerary_id: itinerary.id,
        type: typeMap[activity.type] ?? 'activity',
        title: activity.title,
        description: activity.description,
        date: day.date,
        time: activity.time,
        estimated_cost_cents: Math.round(activity.estimatedCost * 100),
        sort_order: sortOrder++,
      });
    }
  }

  if (items.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from('itinerary_items')
      .insert(items);

    if (insertError) throw Errors.internal(insertError.message);
  }

  // Recalculate total cost
  await recalculateTotalCost(itinerary.id);

  // Return full itinerary with items
  return getItinerary(itinerary.id, travellerId);
}

async function recalculateTotalCost(itineraryId: string): Promise<void> {
  const { data: items } = await supabaseAdmin
    .from('itinerary_items')
    .select('estimated_cost_cents')
    .eq('itinerary_id', itineraryId);

  const total = (items ?? []).reduce(
    (sum, item) => sum + (item.estimated_cost_cents ?? 0),
    0,
  );

  const { error } = await supabaseAdmin
    .from('itineraries')
    .update({ total_estimated_cost_cents: total, updated_at: new Date().toISOString() })
    .eq('id', itineraryId);

  if (error) throw Errors.internal(error.message);
}
