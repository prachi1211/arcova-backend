import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, attachErrorHandler } from '../helpers/test-app.js';
import { testUsers, mockAuthMiddleware } from '../helpers/auth-mock.js';

vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: mockAuthMiddleware(testUsers.host),
}));

vi.mock('../../src/services/property.service.js', () => ({
  listProperties: vi.fn(),
  getProperty: vi.fn(),
  createProperty: vi.fn(),
  updateProperty: vi.fn(),
  createRoomType: vi.fn(),
  updateRoomType: vi.fn(),
}));

const propertyService = await import('../../src/services/property.service.js');
const propertyRoutes = (await import('../../src/routes/property.routes.js')).default;

const app = createTestApp();
app.use('/api/properties', propertyRoutes);
attachErrorHandler(app);

beforeEach(() => vi.clearAllMocks());

const fakeProperty = { id: 'p-1', host_id: 'host-001', name: 'Test Hotel', city: 'Paris', country: 'France', status: 'active' };

describe('GET /api/properties', () => {
  it('should return paginated properties', async () => {
    (propertyService.listProperties as ReturnType<typeof vi.fn>).mockResolvedValue({ results: [fakeProperty], totalCount: 1, page: 0, pageSize: 20, hasNextPage: false });

    const res = await request(app).get('/api/properties');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
  });
});

describe('POST /api/properties', () => {
  it('should create property and return 201', async () => {
    (propertyService.createProperty as ReturnType<typeof vi.fn>).mockResolvedValue(fakeProperty);

    const res = await request(app)
      .post('/api/properties')
      .send({ name: 'Test Hotel', city: 'Paris', country: 'France' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Hotel');
  });

  it('should return 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/properties')
      .send({ name: 'Test' }); // missing city and country

    expect(res.status).toBe(400);
  });
});

describe('GET /api/properties/:id', () => {
  it('should return property with room types', async () => {
    (propertyService.getProperty as ReturnType<typeof vi.fn>).mockResolvedValue({ ...fakeProperty, room_types: [] });

    const res = await request(app).get('/api/properties/p-1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Test Hotel');
  });
});

describe('PUT /api/properties/:id', () => {
  it('should update property', async () => {
    (propertyService.updateProperty as ReturnType<typeof vi.fn>).mockResolvedValue({ ...fakeProperty, name: 'Updated' });

    const res = await request(app)
      .put('/api/properties/p-1')
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
  });
});

describe('POST /api/properties/:id/rooms', () => {
  it('should create room type', async () => {
    (propertyService.createRoomType as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'rt-1', name: 'Deluxe', base_price_cents: 20000 });

    const res = await request(app)
      .post('/api/properties/p-1/rooms')
      .send({ name: 'Deluxe', base_price_cents: 20000 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Deluxe');
  });

  it('should return 400 for missing base_price_cents', async () => {
    const res = await request(app)
      .post('/api/properties/p-1/rooms')
      .send({ name: 'Deluxe' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/properties/:id/rooms/:roomId', () => {
  it('should update room type', async () => {
    (propertyService.updateRoomType as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'rt-1', name: 'Super Deluxe' });

    const res = await request(app)
      .put('/api/properties/p-1/rooms/rt-1')
      .send({ name: 'Super Deluxe' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Super Deluxe');
  });
});
