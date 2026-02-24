import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, attachErrorHandler } from '../helpers/test-app.js';
import { testUsers, mockAuthMiddleware } from '../helpers/auth-mock.js';

vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: mockAuthMiddleware(testUsers.host),
}));

vi.mock('../../src/services/analytics.service.js', () => ({
  getDashboardKPIs: vi.fn(),
  getRevenueTimeSeries: vi.fn(),
  getOccupancyTimeSeries: vi.fn(),
  getChannelMix: vi.fn(),
  getPlatformMetrics: vi.fn(),
}));

const analyticsService = await import('../../src/services/analytics.service.js');
const analyticsRoutes = (await import('../../src/routes/analytics.routes.js')).default;

const app = createTestApp();
app.use('/api/analytics', analyticsRoutes);
attachErrorHandler(app);

beforeEach(() => vi.clearAllMocks());

describe('GET /api/analytics/dashboard', () => {
  it('should return KPIs', async () => {
    const kpis = { totalRevenueCents: 100000, netRevenueCents: 85000, totalBookings: 10, confirmedBookings: 8, cancelledBookings: 2, avgBookingValueCents: 10000, occupancyRate: 75, adr: 5000, revpar: 3750 };
    (analyticsService.getDashboardKPIs as ReturnType<typeof vi.fn>).mockResolvedValue(kpis);

    const res = await request(app).get('/api/analytics/dashboard?period=30d');
    expect(res.status).toBe(200);
    expect(res.body.totalBookings).toBe(10);
  });
});

describe('GET /api/analytics/revenue', () => {
  it('should return revenue time series', async () => {
    (analyticsService.getRevenueTimeSeries as ReturnType<typeof vi.fn>).mockResolvedValue([{ date: '2026-03-15', grossRevenueCents: 10000, netRevenueCents: 8500, bookingCount: 2 }]);

    const res = await request(app).get('/api/analytics/revenue?granularity=day');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('GET /api/analytics/occupancy', () => {
  it('should return occupancy time series', async () => {
    (analyticsService.getOccupancyTimeSeries as ReturnType<typeof vi.fn>).mockResolvedValue([{ date: '2026-03-15', occupancyPercent: 80, bookedRooms: 8, totalRooms: 10 }]);

    const res = await request(app).get('/api/analytics/occupancy');
    expect(res.status).toBe(200);
    expect(res.body[0].occupancyPercent).toBe(80);
  });
});

describe('GET /api/analytics/channel-mix', () => {
  it('should return channel breakdown', async () => {
    (analyticsService.getChannelMix as ReturnType<typeof vi.fn>).mockResolvedValue([{ source: 'platform', bookingCount: 5, revenueCents: 50000, percentage: 100 }]);

    const res = await request(app).get('/api/analytics/channel-mix');
    expect(res.status).toBe(200);
    expect(res.body[0].source).toBe('platform');
  });
});

describe('GET /api/analytics/platform', () => {
  it('should return 403 for non-admin', async () => {
    // Host user is injected by mock — requireRole('admin') should reject
    const res = await request(app).get('/api/analytics/platform');
    expect(res.status).toBe(403);
  });
});
