import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, attachErrorHandler } from '../helpers/test-app.js';
import { testUsers, mockAuthMiddleware } from '../helpers/auth-mock.js';

vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: mockAuthMiddleware(testUsers.admin),
}));

vi.mock('../../src/services/admin.service.js', () => ({
  listUsers: vi.fn(),
  updateUserRole: vi.fn(),
  updatePropertyStatus: vi.fn(),
  getRevenueReport: vi.fn(),
  getBookingReport: vi.fn(),
}));

const adminService = await import('../../src/services/admin.service.js');
const adminRoutes = (await import('../../src/routes/admin.routes.js')).default;

const app = createTestApp();
app.use('/api/admin', adminRoutes);
attachErrorHandler(app);

beforeEach(() => vi.clearAllMocks());

describe('GET /api/admin/users', () => {
  it('should return paginated user list', async () => {
    (adminService.listUsers as ReturnType<typeof vi.fn>).mockResolvedValue({ results: [{ id: 'u-1' }], totalCount: 1, page: 0, pageSize: 20, hasNextPage: false });

    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
  });

  it('should filter by role', async () => {
    (adminService.listUsers as ReturnType<typeof vi.fn>).mockResolvedValue({ results: [], totalCount: 0, page: 0, pageSize: 20, hasNextPage: false });

    const res = await request(app).get('/api/admin/users?role=host');
    expect(res.status).toBe(200);
    expect(adminService.listUsers).toHaveBeenCalledWith(expect.objectContaining({ role: 'host' }));
  });
});

describe('PATCH /api/admin/users/:id/role', () => {
  it('should update user role', async () => {
    (adminService.updateUserRole as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u-1', role: 'host' });

    const res = await request(app)
      .patch('/api/admin/users/u-1/role')
      .send({ role: 'host' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('host');
  });

  it('should return 400 for invalid role', async () => {
    const res = await request(app)
      .patch('/api/admin/users/u-1/role')
      .send({ role: 'superuser' });

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/admin/properties/:id/status', () => {
  it('should update property status', async () => {
    (adminService.updatePropertyStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'p-1', status: 'inactive' });

    const res = await request(app)
      .patch('/api/admin/properties/p-1/status')
      .send({ status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('inactive');
  });
});

describe('GET /api/admin/reports/revenue', () => {
  it('should return revenue report', async () => {
    (adminService.getRevenueReport as ReturnType<typeof vi.fn>).mockResolvedValue({ totalRevenueCents: 100000, bookingCount: 10, byMonth: [] });

    const res = await request(app).get('/api/admin/reports/revenue');
    expect(res.status).toBe(200);
    expect(res.body.totalRevenueCents).toBe(100000);
  });
});

describe('GET /api/admin/reports/bookings', () => {
  it('should return booking report', async () => {
    (adminService.getBookingReport as ReturnType<typeof vi.fn>).mockResolvedValue({ totalBookings: 50, byStatus: [], byMonth: [] });

    const res = await request(app).get('/api/admin/reports/bookings');
    expect(res.status).toBe(200);
    expect(res.body.totalBookings).toBe(50);
  });
});
