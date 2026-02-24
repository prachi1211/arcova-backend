import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, attachErrorHandler } from '../helpers/test-app.js';
import { testUsers, mockAuthMiddleware } from '../helpers/auth-mock.js';

// Default: traveller user (most review operations need traveller)
vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: mockAuthMiddleware(testUsers.traveller),
}));

vi.mock('../../src/services/review.service.js', () => ({
  createReview: vi.fn(),
  getPropertyReviews: vi.fn(),
  getReview: vi.fn(),
  updateReview: vi.fn(),
  deleteReview: vi.fn(),
  addHostResponse: vi.fn(),
}));

const reviewService = await import('../../src/services/review.service.js');
const reviewRoutes = (await import('../../src/routes/review.routes.js')).default;

const app = createTestApp();
app.use('/api/reviews', reviewRoutes);
attachErrorHandler(app);

beforeEach(() => vi.clearAllMocks());

const fakeReview = { id: 'rev-1', booking_id: 'b-1', rating: 5, comment: 'Great!' };

describe('POST /api/reviews', () => {
  it('should create review and return 201', async () => {
    (reviewService.createReview as ReturnType<typeof vi.fn>).mockResolvedValue(fakeReview);

    const res = await request(app)
      .post('/api/reviews')
      .send({ booking_id: '550e8400-e29b-41d4-a716-446655440000', rating: 5, comment: 'Great!' });

    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(5);
  });

  it('should return 400 for missing rating', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .send({ booking_id: '550e8400-e29b-41d4-a716-446655440000' });

    expect(res.status).toBe(400);
  });

  it('should return 400 for rating out of range', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .send({ booking_id: '550e8400-e29b-41d4-a716-446655440000', rating: 6 });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/reviews', () => {
  it('should return paginated reviews (public, no auth)', async () => {
    (reviewService.getPropertyReviews as ReturnType<typeof vi.fn>).mockResolvedValue({ results: [fakeReview], totalCount: 1, page: 0, pageSize: 20, hasNextPage: false });

    const res = await request(app).get('/api/reviews?propertyId=550e8400-e29b-41d4-a716-446655440000');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
  });

  it('should return 400 for missing propertyId', async () => {
    const res = await request(app).get('/api/reviews');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/reviews/:id', () => {
  it('should return a single review', async () => {
    (reviewService.getReview as ReturnType<typeof vi.fn>).mockResolvedValue(fakeReview);

    const res = await request(app).get('/api/reviews/rev-1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('rev-1');
  });
});

describe('PUT /api/reviews/:id', () => {
  it('should update review', async () => {
    (reviewService.updateReview as ReturnType<typeof vi.fn>).mockResolvedValue({ ...fakeReview, rating: 4 });

    const res = await request(app)
      .put('/api/reviews/rev-1')
      .send({ rating: 4 });

    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(4);
  });
});

describe('DELETE /api/reviews/:id', () => {
  it('should delete review and return 204', async () => {
    (reviewService.deleteReview as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await request(app).delete('/api/reviews/rev-1');
    expect(res.status).toBe(204);
  });
});

describe('PATCH /api/reviews/:id/response', () => {
  it('should return 403 for traveller (needs host)', async () => {
    // requireRole('host') will reject the traveller user
    const res = await request(app)
      .patch('/api/reviews/rev-1/response')
      .send({ response: 'Thank you!' });

    expect(res.status).toBe(403);
  });
});
