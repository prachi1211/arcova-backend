import { supabaseAdmin } from '../config/supabase.js';
import { stripe } from '../config/stripe.js';
import { env } from '../config/env.js';
import { Errors } from '../utils/errors.js';
import type { Payment, PaginatedResponse, PaymentStatus } from '../types/index.js';

export async function createPaymentIntent(
  bookingId: string,
  travellerId: string,
): Promise<{ payment: Payment; clientSecret: string }> {
  if (!stripe) throw Errors.badRequest('Payment processing is not configured');

  // Verify booking exists and belongs to traveller
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .select('id, traveller_id, total_price_cents, status, payment_id')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) throw Errors.notFound('Booking');
  if (booking.traveller_id !== travellerId) throw Errors.forbidden();
  if (booking.status !== 'confirmed') throw Errors.badRequest('Booking is not in a payable state');

  // Idempotent: return existing pending payment if one exists
  if (booking.payment_id) {
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('id', booking.payment_id)
      .single();

    if (existingPayment && (existingPayment.status === 'pending' || existingPayment.status === 'processing')) {
      return {
        payment: existingPayment as Payment,
        clientSecret: existingPayment.stripe_client_secret,
      };
    }
  }

  // Create Stripe PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: booking.total_price_cents,
    currency: 'usd',
    metadata: { booking_id: bookingId, traveller_id: travellerId },
  });

  // Insert payment record
  const { data: payment, error: insertError } = await supabaseAdmin
    .from('payments')
    .insert({
      booking_id: bookingId,
      traveller_id: travellerId,
      amount_cents: booking.total_price_cents,
      currency: 'usd',
      status: 'pending',
      stripe_payment_intent_id: paymentIntent.id,
      stripe_client_secret: paymentIntent.client_secret,
    })
    .select()
    .single();

  if (insertError || !payment) throw Errors.internal(insertError?.message ?? 'Failed to create payment record');

  // Link payment to booking
  const { error: linkError } = await supabaseAdmin
    .from('bookings')
    .update({ payment_id: payment.id, payment_status: 'pending' })
    .eq('id', bookingId);

  if (linkError) throw Errors.internal(linkError.message);

  return {
    payment: payment as Payment,
    clientSecret: paymentIntent.client_secret!,
  };
}

export async function confirmPayment(
  paymentId: string,
  travellerId: string,
): Promise<Payment> {
  if (!stripe) throw Errors.badRequest('Payment processing is not configured');

  const { data: payment, error: fetchError } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (fetchError || !payment) throw Errors.notFound('Payment');
  if (payment.traveller_id !== travellerId) throw Errors.forbidden();
  if (!payment.stripe_payment_intent_id) throw Errors.badRequest('No Stripe payment intent associated');

  // Retrieve latest status from Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);

  const statusMap: Record<string, PaymentStatus> = {
    requires_payment_method: 'pending',
    requires_confirmation: 'pending',
    requires_action: 'processing',
    processing: 'processing',
    succeeded: 'succeeded',
    canceled: 'failed',
    requires_capture: 'processing',
  };
  const newStatus: PaymentStatus = statusMap[paymentIntent.status] ?? 'pending';

  // Update payment record
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('payments')
    .update({
      status: newStatus,
      payment_method: paymentIntent.payment_method as string | null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (updateError || !updated) throw Errors.internal(updateError?.message ?? 'Failed to update payment');

  // Update booking payment status
  const { error: syncError } = await supabaseAdmin
    .from('bookings')
    .update({ payment_status: newStatus })
    .eq('id', payment.booking_id);

  if (syncError) throw Errors.internal(syncError.message);

  return updated as Payment;
}

export async function getPaymentHistory(
  travellerId: string,
  params: { page: number; limit: number },
): Promise<PaginatedResponse<Payment>> {
  const { data, count, error } = await supabaseAdmin
    .from('payments')
    .select('*', { count: 'exact' })
    .eq('traveller_id', travellerId)
    .order('created_at', { ascending: false })
    .range(params.page * params.limit, (params.page + 1) * params.limit - 1);

  if (error) throw Errors.internal(error.message);

  return {
    results: (data ?? []) as Payment[],
    totalCount: count ?? 0,
    page: params.page,
    pageSize: params.limit,
    hasNextPage: (params.page + 1) * params.limit < (count ?? 0),
  };
}

export async function handleWebhook(
  payload: Buffer,
  signature: string,
): Promise<void> {
  if (!stripe) throw Errors.badRequest('Payment processing is not configured');
  if (!env.STRIPE_WEBHOOK_SECRET) throw Errors.badRequest('Webhook secret is not configured');

  const event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      await updatePaymentByIntentId(pi.id, 'succeeded');
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      const failureReason = pi.last_payment_error?.message ?? 'Payment failed';
      await updatePaymentByIntentId(pi.id, 'failed', failureReason);
      break;
    }
  }
}

async function updatePaymentByIntentId(
  intentId: string,
  status: PaymentStatus,
  failureReason?: string,
): Promise<void> {
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('id, booking_id')
    .eq('stripe_payment_intent_id', intentId)
    .single();

  if (!payment) return;

  const { error: paymentUpdateError } = await supabaseAdmin
    .from('payments')
    .update({
      status,
      ...(failureReason && { failure_reason: failureReason }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id);

  if (paymentUpdateError) throw Errors.internal(paymentUpdateError.message);

  const { error: bookingUpdateError } = await supabaseAdmin
    .from('bookings')
    .update({ payment_status: status })
    .eq('id', payment.booking_id);

  if (bookingUpdateError) throw Errors.internal(bookingUpdateError.message);
}
