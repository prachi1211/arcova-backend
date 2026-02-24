import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, attachErrorHandler } from '../helpers/test-app.js';

// Search routes have no auth middleware on most endpoints
vi.mock('../../src/services/search.service.js', () => ({
  searchHotels: vi.fn(),
  getHotelDetail: vi.fn(),
  searchFlights: vi.fn(),
  searchCars: vi.fn(),
  getCarDetail: vi.fn(),
}));

// Mock auth middleware (search routes use optionalAuthMiddleware)
vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: vi.fn((req: any, _res: any, next: any) => next()),
  optionalAuthMiddleware: vi.fn((_req: any, _res: any, next: any) => next()),
}));

const searchService = await import('../../src/services/search.service.js');
const searchRoutes = (await import('../../src/routes/search.routes.js')).default;

const app = createTestApp();
app.use('/api/search', searchRoutes);
attachErrorHandler(app);

beforeEach(() => vi.clearAllMocks());

describe('GET /api/search/hotels', () => {
  it('should return hotel search results', async () => {
    const mockResponse = { results: [{ id: 'h-1', name: 'Hotel Test' }], totalCount: 1, page: 0, pageSize: 20, hasNextPage: false, cacheHit: false };
    (searchService.searchHotels as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    const res = await request(app).get('/api/search/hotels?city=Paris');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
  });

  it('should use default pagination', async () => {
    (searchService.searchHotels as ReturnType<typeof vi.fn>).mockResolvedValue({ results: [], totalCount: 0, page: 0, pageSize: 20, hasNextPage: false, cacheHit: false });

    const res = await request(app).get('/api/search/hotels');
    expect(res.status).toBe(200);
    expect(searchService.searchHotels).toHaveBeenCalled();
  });
});

describe('GET /api/search/hotels/:id', () => {
  it('should return hotel detail', async () => {
    (searchService.getHotelDetail as ReturnType<typeof vi.fn>).mockResolvedValue({ property: { id: 'h-1' }, roomTypes: [], availability: [] });

    const res = await request(app).get('/api/search/hotels/h-1');
    expect(res.status).toBe(200);
    expect(res.body.property.id).toBe('h-1');
  });
});

describe('GET /api/search/flights', () => {
  it('should return flight search results', async () => {
    (searchService.searchFlights as ReturnType<typeof vi.fn>).mockResolvedValue({ results: [{ id: 'fl-1' }], totalCount: 1, page: 0, pageSize: 20, hasNextPage: false, cacheHit: false });

    const res = await request(app).get('/api/search/flights?origin=NYC&dest=LAX');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
  });
});

describe('GET /api/search/cars', () => {
  it('should return car search results', async () => {
    (searchService.searchCars as ReturnType<typeof vi.fn>).mockResolvedValue({ results: [{ id: 'car-1' }], totalCount: 1, page: 0, pageSize: 20, hasNextPage: false, cacheHit: false });

    const res = await request(app).get('/api/search/cars?city=Paris');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
  });
});

describe('GET /api/search/cars/:id', () => {
  it('should return car detail', async () => {
    (searchService.getCarDetail as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'car-1', vehicleName: 'Camry' });

    const res = await request(app).get('/api/search/cars/car-1');
    expect(res.status).toBe(200);
    expect(res.body.vehicleName).toBe('Camry');
  });
});
