import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
vi.mock('../../src/config/supabase.js', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const mockStripe = {
  paymentIntents: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
};
vi.mock('../../src/config/stripe.js', () => ({ stripe: mockStripe }));

const { createPaymentIntent, confirmPayment, getPaymentHistory, handleWebhook } = await import(
  '../../src/services/payment.service.js'
);

beforeEach(() => vi.clearAllMocks());

function chain(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const obj: Record<string, any> = {};
  ['select', 'eq', 'insert', 'update', 'order', 'range', 'single'].forEach((m) => {
    obj[m] = vi.fn().mockReturnValue(obj);
  });
  obj.single = vi.fn().mockResolvedValue({ data: result.data, error: result.error ?? null });
  obj.then = (resolve: Function) => resolve({ data: result.data, error: result.error ?? null, count: result.count ?? null });
  return obj;
}

const fakePayment = { id: 'pay-1', booking_id: 'b-1', traveller_id: 'trav-1', amount_cents: 20000, currency: 'usd', status: 'pending', stripe_payment_intent_id: 'pi_test', stripe_client_secret: 'secret_test' };

describe('createPaymentIntent', () => {
  it('should create a Stripe payment intent and store payment record', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation((table: string) => {
      callIdx++;
      if (table === 'bookings' && callIdx === 1) return chain({ data: { id: 'b-1', traveller_id: 'trav-1', total_price_cents: 20000, status: 'confirmed', payment_id: null } });
      if (table === 'payments') return chain({ data: fakePayment });
      if (table === 'bookings') return chain({ data: null }); // update
      return chain({ data: null });
    });
    mockStripe.paymentIntents.create.mockResolvedValue({ id: 'pi_test', client_secret: 'secret_test' });

    const result = await createPaymentIntent('b-1', 'trav-1');
    expect(result.payment.status).toBe('pending');
    expect(result.clientSecret).toBe('secret_test');
  });

  it('should throw not found for missing booking', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'not found' } }));
    await expect(createPaymentIntent('b-x', 'trav-1')).rejects.toThrow('Booking not found');
  });

  it('should throw forbidden when traveller does not own booking', async () => {
    mockFrom.mockReturnValue(chain({ data: { id: 'b-1', traveller_id: 'other', total_price_cents: 20000, status: 'confirmed', payment_id: null } }));
    await expect(createPaymentIntent('b-1', 'trav-1')).rejects.toThrow('Insufficient permissions');
  });

  it('should throw when booking is not confirmed', async () => {
    mockFrom.mockReturnValue(chain({ data: { id: 'b-1', traveller_id: 'trav-1', total_price_cents: 20000, status: 'cancelled', payment_id: null } }));
    await expect(createPaymentIntent('b-1', 'trav-1')).rejects.toThrow('not in a payable state');
  });

  it('should return existing pending payment (idempotent)', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation((table: string) => {
      callIdx++;
      if (table === 'bookings') return chain({ data: { id: 'b-1', traveller_id: 'trav-1', total_price_cents: 20000, status: 'confirmed', payment_id: 'pay-1' } });
      if (table === 'payments') return chain({ data: fakePayment });
      return chain({ data: null });
    });

    const result = await createPaymentIntent('b-1', 'trav-1');
    expect(result.payment.id).toBe('pay-1');
    expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
  });
});

describe('confirmPayment', () => {
  it('should retrieve Stripe status and update payment', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation((table: string) => {
      callIdx++;
      if (table === 'payments' && callIdx === 1) return chain({ data: { ...fakePayment, traveller_id: 'trav-1' } });
      if (table === 'payments') return chain({ data: { ...fakePayment, status: 'succeeded' } });
      return chain({ data: null });
    });
    mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: 'succeeded', payment_method: 'pm_test' });

    const result = await confirmPayment('pay-1', 'trav-1');
    expect(result.status).toBe('succeeded');
  });

  it('should throw forbidden for wrong traveller', async () => {
    mockFrom.mockReturnValue(chain({ data: { ...fakePayment, traveller_id: 'other' } }));
    await expect(confirmPayment('pay-1', 'trav-1')).rejects.toThrow('Insufficient permissions');
  });
});

describe('getPaymentHistory', () => {
  it('should return paginated payment history', async () => {
    mockFrom.mockReturnValue(chain({ data: [fakePayment], count: 1 }));
    const result = await getPaymentHistory('trav-1', { page: 0, limit: 20 });
    expect(result.results).toHaveLength(1);
    expect(result.totalCount).toBe(1);
  });
});

describe('handleWebhook', () => {
  it('should process payment_intent.succeeded event', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test' } },
    });

    // Mock the DB lookups in updatePaymentByIntentId
    let callIdx = 0;
    mockFrom.mockImplementation((table: string) => {
      callIdx++;
      if (table === 'payments' && callIdx === 1) return chain({ data: { id: 'pay-1', booking_id: 'b-1' } });
      return chain({ data: null });
    });

    await expect(handleWebhook(Buffer.from(''), 'sig')).resolves.toBeUndefined();
  });

  it('should process payment_intent.payment_failed event', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_test', last_payment_error: { message: 'Declined' } } },
    });

    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ data: { id: 'pay-1', booking_id: 'b-1' } });
      return chain({ data: null });
    });

    await expect(handleWebhook(Buffer.from(''), 'sig')).resolves.toBeUndefined();
  });
});
