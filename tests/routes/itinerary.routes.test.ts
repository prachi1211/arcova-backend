import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, attachErrorHandler } from '../helpers/test-app.js';
import { testUsers, mockAuthMiddleware } from '../helpers/auth-mock.js';

vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: mockAuthMiddleware(testUsers.traveller),
}));

vi.mock('../../src/config/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { trip_plan: { destination: 'Paris', dates: { start: '2026-04-01', end: '2026-04-03' }, itinerary: [], tips: [] } }, error: null }),
    }),
  },
}));

vi.mock('../../src/services/itinerary.service.js', () => ({
  createItinerary: vi.fn(),
  getItineraries: vi.fn(),
  getItinerary: vi.fn(),
  updateItinerary: vi.fn(),
  deleteItinerary: vi.fn(),
  addItem: vi.fn(),
  removeItem: vi.fn(),
  createFromTripPlan: vi.fn(),
  createFromTripPlanBySession: vi.fn(),
}));

const itineraryService = await import('../../src/services/itinerary.service.js');
const itineraryRoutes = (await import('../../src/routes/itinerary.routes.js')).default;

const app = createTestApp();
app.use('/api/itineraries', itineraryRoutes);
attachErrorHandler(app);

beforeEach(() => vi.clearAllMocks());

const fakeItinerary = { id: 'it-1', name: 'Paris Trip', start_date: '2026-04-01', end_date: '2026-04-05', items: [] };
const fakeItem = { id: 'item-1', type: 'activity', title: 'Eiffel Tower', date: '2026-04-01', sort_order: 0 };

describe('POST /api/itineraries', () => {
  it('should create itinerary and return 201', async () => {
    (itineraryService.createItinerary as ReturnType<typeof vi.fn>).mockResolvedValue(fakeItinerary);

    const res = await request(app)
      .post('/api/itineraries')
      .send({ name: 'Paris Trip', start_date: '2026-04-01', end_date: '2026-04-05' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Paris Trip');
  });

  it('should return 400 for invalid date format', async () => {
    const res = await request(app)
      .post('/api/itineraries')
      .send({ name: 'Trip', start_date: 'invalid', end_date: '2026-04-05' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/itineraries', () => {
  it('should return paginated itineraries', async () => {
    (itineraryService.getItineraries as ReturnType<typeof vi.fn>).mockResolvedValue({ results: [fakeItinerary], totalCount: 1, page: 0, pageSize: 20, hasNextPage: false });

    const res = await request(app).get('/api/itineraries');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
  });
});

describe('GET /api/itineraries/:id', () => {
  it('should return itinerary with items', async () => {
    (itineraryService.getItinerary as ReturnType<typeof vi.fn>).mockResolvedValue(fakeItinerary);

    const res = await request(app).get('/api/itineraries/it-1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Paris Trip');
  });
});

describe('PUT /api/itineraries/:id', () => {
  it('should update itinerary', async () => {
    (itineraryService.updateItinerary as ReturnType<typeof vi.fn>).mockResolvedValue({ ...fakeItinerary, name: 'Updated' });

    const res = await request(app)
      .put('/api/itineraries/it-1')
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
  });
});

describe('DELETE /api/itineraries/:id', () => {
  it('should delete and return 204', async () => {
    (itineraryService.deleteItinerary as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await request(app).delete('/api/itineraries/it-1');
    expect(res.status).toBe(204);
  });
});

describe('POST /api/itineraries/:id/items', () => {
  it('should add item and return 201', async () => {
    (itineraryService.addItem as ReturnType<typeof vi.fn>).mockResolvedValue(fakeItem);

    const res = await request(app)
      .post('/api/itineraries/it-1/items')
      .send({ type: 'activity', title: 'Eiffel Tower', date: '2026-04-01' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Eiffel Tower');
  });

  it('should return 400 for invalid item type', async () => {
    const res = await request(app)
      .post('/api/itineraries/it-1/items')
      .send({ type: 'invalid_type', title: 'X', date: '2026-04-01' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/itineraries/:id/items/:itemId', () => {
  it('should remove item and return 204', async () => {
    (itineraryService.removeItem as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await request(app).delete('/api/itineraries/it-1/items/item-1');
    expect(res.status).toBe(204);
  });
});

describe('POST /api/itineraries/from-trip-plan', () => {
  it('should convert trip plan to itinerary', async () => {
    (itineraryService.createFromTripPlanBySession as ReturnType<typeof vi.fn>).mockResolvedValue(fakeItinerary);

    const res = await request(app)
      .post('/api/itineraries/from-trip-plan')
      .send({ session_id: 'session-123', name: 'Paris Trip' });

    expect(res.status).toBe(201);
  });
});
