import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
vi.mock('../../src/config/supabase.js', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const { getDashboardKPIs, getRevenueTimeSeries, getOccupancyTimeSeries, getChannelMix, getPlatformMetrics } = await import(
  '../../src/services/analytics.service.js'
);

beforeEach(() => vi.clearAllMocks());

function chain(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const obj: Record<string, any> = {};
  ['select', 'eq', 'in', 'gte', 'lte', 'neq', 'order', 'range', 'single'].forEach((m) => {
    obj[m] = vi.fn().mockReturnValue(obj);
  });
  obj.single = vi.fn().mockResolvedValue({ data: result.data, error: result.error ?? null });
  obj.then = (resolve: Function) => resolve({ data: result.data, error: result.error ?? null, count: result.count ?? null });
  return obj;
}

describe('getDashboardKPIs', () => {
  it('should return aggregated KPIs for admin', async () => {
    const bookings = [
      { status: 'confirmed', total_price_cents: 10000, net_revenue_cents: 8500, num_rooms: 1, check_in: '2026-03-01', check_out: '2026-03-03' },
      { status: 'completed', total_price_cents: 20000, net_revenue_cents: 17000, num_rooms: 2, check_in: '2026-03-05', check_out: '2026-03-07' },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'bookings') return chain({ data: bookings });
      if (table === 'room_types') return chain({ data: [{ total_inventory: 10 }] });
      return chain({ data: null });
    });

    const result = await getDashboardKPIs('admin-1', 'admin', { period: '30d' });
    expect(result.totalBookings).toBe(2);
    expect(result.totalRevenueCents).toBe(30000);
    expect(result.confirmedBookings).toBe(2); // confirmed + completed
  });

  it('should return zeros for host with no properties', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'properties') return chain({ data: [] });
      return chain({ data: [] });
    });

    const result = await getDashboardKPIs('host-1', 'host', { period: '30d' });
    expect(result.totalBookings).toBe(0);
    expect(result.totalRevenueCents).toBe(0);
  });
});

describe('getRevenueTimeSeries', () => {
  it('should return grouped revenue data', async () => {
    const bookings = [
      { booked_at: '2026-03-15T10:00:00Z', total_price_cents: 10000, net_revenue_cents: 8500, status: 'confirmed' },
      { booked_at: '2026-03-15T14:00:00Z', total_price_cents: 5000, net_revenue_cents: 4250, status: 'completed' },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'bookings') return chain({ data: bookings });
      return chain({ data: [] });
    });

    const result = await getRevenueTimeSeries('admin-1', 'admin', { granularity: 'day' });
    expect(result).toHaveLength(1); // Both on same day
    expect(result[0].bookingCount).toBe(2);
    expect(result[0].grossRevenueCents).toBe(15000);
  });

  it('should return empty for host with no properties', async () => {
    mockFrom.mockReturnValue(chain({ data: [] }));
    const result = await getRevenueTimeSeries('host-1', 'host', { granularity: 'day' });
    expect(result).toHaveLength(0);
  });
});

describe('getOccupancyTimeSeries', () => {
  it('should return daily occupancy', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'room_types') return chain({ data: [{ total_inventory: 10 }] });
      if (table === 'bookings') return chain({ data: [] });
      return chain({ data: [] });
    });

    const result = await getOccupancyTimeSeries('admin-1', 'admin', { start: '2026-03-15', end: '2026-03-16' });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].totalRooms).toBe(10);
  });

  it('should return empty when no rooms exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'room_types') return chain({ data: [] });
      return chain({ data: [] });
    });

    const result = await getOccupancyTimeSeries('admin-1', 'admin', { start: '2026-03-15', end: '2026-03-16' });
    expect(result).toHaveLength(0);
  });
});

describe('getChannelMix', () => {
  it('should return channel breakdown', async () => {
    const bookings = [
      { booking_source: 'platform', total_price_cents: 10000 },
      { booking_source: 'platform', total_price_cents: 5000 },
      { booking_source: 'direct', total_price_cents: 8000 },
    ];

    mockFrom.mockReturnValue(chain({ data: bookings }));

    const result = await getChannelMix('admin-1', 'admin', { period: '30d' });
    expect(result.length).toBeGreaterThanOrEqual(1);
    const platform = result.find((c) => c.source === 'platform');
    expect(platform?.bookingCount).toBe(2);
  });
});

describe('getPlatformMetrics', () => {
  it('should return platform-wide metrics', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return chain({ data: null, count: 100 });
      if (table === 'properties') return chain({ data: null, count: 50 });
      if (table === 'bookings') return chain({ data: [{ total_price_cents: 10000, net_revenue_cents: 8500, status: 'confirmed' }] });
      return chain({ data: null });
    });

    const result = await getPlatformMetrics();
    expect(result.totalUsers).toBe(100);
    expect(result.totalProperties).toBe(50);
    expect(result.totalRevenueCents).toBe(10000);
  });
});
