import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, attachErrorHandler } from '../helpers/test-app.js';
import { testUsers, mockAuthMiddleware } from '../helpers/auth-mock.js';

vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: mockAuthMiddleware(testUsers.traveller),
}));

vi.mock('../../src/services/payment.service.js', () => ({
  createPaymentIntent: vi.fn(),
  confirmPayment: vi.fn(),
  getPaymentHistory: vi.fn(),
  handleWebhook: vi.fn(),
}));

const paymentService = await import('../../src/services/payment.service.js');
const paymentRoutes = (await import('../../src/routes/payment.routes.js')).default;

const app = createTestApp();
app.use('/api/payments', paymentRoutes);
attachErrorHandler(app);

beforeEach(() => vi.clearAllMocks());

const fakePayment = { id: 'pay-1', booking_id: 'b-1', amount_cents: 20000, status: 'pending', stripe_client_secret: 'secret' };

describe('POST /api/payments/create-intent', () => {
  it('should create payment intent and return 201', async () => {
    (paymentService.createPaymentIntent as ReturnType<typeof vi.fn>).mockResolvedValue({ payment: fakePayment, clientSecret: 'secret' });

    const res = await request(app)
      .post('/api/payments/create-intent')
      .send({ booking_id: '550e8400-e29b-41d4-a716-446655440000' });

    expect(res.status).toBe(201);
    expect(res.body.clientSecret).toBe('secret');
  });

  it('should return 400 for missing booking_id', async () => {
    const res = await request(app)
      .post('/api/payments/create-intent')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('POST /api/payments/confirm', () => {
  it('should confirm payment', async () => {
    (paymentService.confirmPayment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...fakePayment, status: 'succeeded' });

    const res = await request(app)
      .post('/api/payments/confirm')
      .send({ payment_id: '550e8400-e29b-41d4-a716-446655440000' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('succeeded');
  });
});

describe('GET /api/payments/history', () => {
  it('should return payment history', async () => {
    (paymentService.getPaymentHistory as ReturnType<typeof vi.fn>).mockResolvedValue({ results: [fakePayment], totalCount: 1, page: 0, pageSize: 20, hasNextPage: false });

    const res = await request(app).get('/api/payments/history');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
  });
});
