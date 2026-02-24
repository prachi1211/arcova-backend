import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, attachErrorHandler } from '../helpers/test-app.js';
import { testUsers, mockAuthMiddleware } from '../helpers/auth-mock.js';
import { AppError } from '../../src/utils/errors.js';

vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: mockAuthMiddleware(testUsers.host),
}));

vi.mock('../../src/services/availability.service.js', () => ({
  getAvailability: vi.fn(),
  bulkUpdateAvailability: vi.fn(),
}));

const availabilityService = await import('../../src/services/availability.service.js');
const availabilityRoutes = (await import('../../src/routes/availability.routes.js')).default;

const app = createTestApp();
app.use('/api/availability', availabilityRoutes);
attachErrorHandler(app);

beforeEach(() => vi.clearAllMocks());

describe('GET /api/availability', () => {
  it('should return availability data', async () => {
    const mockData = [{ roomTypeId: 'rt-1', roomTypeName: 'Standard', availability: [] }];
    (availabilityService.getAvailability as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

    const res = await request(app).get('/api/availability?propertyId=550e8400-e29b-41d4-a716-446655440000&start=2026-03-15&end=2026-03-20');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('should return 400 for missing required params', async () => {
    const res = await request(app).get('/api/availability');
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/availability/bulk', () => {
  it('should bulk update and return availability', async () => {
    const mockData = [{ room_type_id: 'rt-1', date: '2026-03-15', available_rooms: 5 }];
    (availabilityService.bulkUpdateAvailability as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

    const res = await request(app)
      .put('/api/availability/bulk')
      .send({
        entries: [
          { room_type_id: '550e8400-e29b-41d4-a716-446655440000', date: '2026-03-15', available_rooms: 5 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('should pass empty entries through validation (service rejects)', async () => {
    // Zod schema allows empty arrays; the service layer throws badRequest
    (availabilityService.bulkUpdateAvailability as ReturnType<typeof vi.fn>).mockRejectedValue(
      new AppError(400, 'No entries provided', 'BAD_REQUEST'),
    );

    const res = await request(app)
      .put('/api/availability/bulk')
      .send({ entries: [] });

    expect(res.status).toBe(400);
  });
});
