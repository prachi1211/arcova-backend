import { supabaseAdmin } from '../config/supabase.js';
import { Errors } from '../utils/errors.js';
import type { Review, CreateReviewInput, PaginatedResponse } from '../types/index.js';

export async function createReview(
  input: CreateReviewInput,
  travellerId: string,
): Promise<Review> {
  // Verify booking exists, is completed, and belongs to this traveller
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .select('id, traveller_id, property_id, status')
    .eq('id', input.booking_id)
    .single();

  if (bookingError || !booking) throw Errors.notFound('Booking');
  if (booking.traveller_id !== travellerId) throw Errors.forbidden();
  if (booking.status !== 'completed') {
    throw Errors.badRequest('Only completed bookings can be reviewed');
  }

  // Check for existing review on this booking
  const { data: existing } = await supabaseAdmin
    .from('reviews')
    .select('id')
    .eq('booking_id', input.booking_id)
    .single();

  if (existing) throw Errors.conflict('A review already exists for this booking');

  const { data: review, error: insertError } = await supabaseAdmin
    .from('reviews')
    .insert({
      booking_id: input.booking_id,
      traveller_id: travellerId,
      property_id: booking.property_id,
      rating: input.rating,
      comment: input.comment ?? null,
    })
    .select()
    .single();

  if (insertError || !review) throw Errors.internal(insertError?.message ?? 'Failed to create review');
  return review as Review;
}

export async function getPropertyReviews(
  propertyId: string,
  params: { page: number; limit: number },
): Promise<PaginatedResponse<Review>> {
  const { data, count, error } = await supabaseAdmin
    .from('reviews')
    .select('*', { count: 'exact' })
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .range(params.page * params.limit, (params.page + 1) * params.limit - 1);

  if (error) throw Errors.internal(error.message);

  return {
    results: (data ?? []) as Review[],
    totalCount: count ?? 0,
    page: params.page,
    pageSize: params.limit,
    hasNextPage: (params.page + 1) * params.limit < (count ?? 0),
  };
}

export async function getReview(reviewId: string): Promise<Review> {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (error || !data) throw Errors.notFound('Review');
  return data as Review;
}

export async function updateReview(
  reviewId: string,
  travellerId: string,
  updates: { rating?: number; comment?: string },
): Promise<Review> {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('reviews')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (fetchError || !existing) throw Errors.notFound('Review');
  if (existing.traveller_id !== travellerId) throw Errors.forbidden();

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('reviews')
    .update({
      ...(updates.rating !== undefined && { rating: updates.rating }),
      ...(updates.comment !== undefined && { comment: updates.comment }),
    })
    .eq('id', reviewId)
    .select()
    .single();

  if (updateError || !updated) throw Errors.internal(updateError?.message ?? 'Failed to update review');
  return updated as Review;
}

export async function deleteReview(
  reviewId: string,
  travellerId: string,
): Promise<void> {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('reviews')
    .select('id, traveller_id')
    .eq('id', reviewId)
    .single();

  if (fetchError || !existing) throw Errors.notFound('Review');
  if (existing.traveller_id !== travellerId) throw Errors.forbidden();

  const { error: deleteError } = await supabaseAdmin
    .from('reviews')
    .delete()
    .eq('id', reviewId);

  if (deleteError) throw Errors.internal(deleteError.message);
}

export async function addHostResponse(
  reviewId: string,
  hostId: string,
  response: string,
): Promise<Review> {
  // Fetch review and verify the host owns the reviewed property
  const { data: review, error: fetchError } = await supabaseAdmin
    .from('reviews')
    .select('*, properties(host_id)')
    .eq('id', reviewId)
    .single();

  if (fetchError || !review) throw Errors.notFound('Review');

  const property = review.properties as { host_id: string } | null;
  if (!property || property.host_id !== hostId) throw Errors.forbidden();

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('reviews')
    .update({
      host_response: response,
      host_responded_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .select()
    .single();

  if (updateError || !updated) throw Errors.internal(updateError?.message ?? 'Failed to add response');
  return updated as Review;
}
