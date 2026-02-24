import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
vi.mock('../../src/config/supabase.js', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const { listUsers, updateUserRole, updatePropertyStatus, getRevenueReport, getBookingReport } = await import(
  '../../src/services/admin.service.js'
);

beforeEach(() => vi.clearAllMocks());

function chain(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const obj: Record<string, any> = {};
  ['select', 'eq', 'or', 'gte', 'lte', 'neq', 'order', 'range', 'single', 'insert', 'update'].forEach((m) => {
    obj[m] = vi.fn().mockReturnValue(obj);
  });
  obj.single = vi.fn().mockResolvedValue({ data: result.data, error: result.error ?? null });
  obj.then = (resolve: Function) => resolve({ data: result.data, error: result.error ?? null, count: result.count ?? null });
  return obj;
}

const fakeUser = { id: 'u-1', email: 'user@test.com', full_name: 'User One', role: 'traveller' };

describe('listUsers', () => {
  it('should return paginated user list', async () => {
    mockFrom.mockReturnValue(chain({ data: [fakeUser], count: 1 }));
    const result = await listUsers({ page: 0, limit: 20 });
    expect(result.results).toHaveLength(1);
    expect(result.totalCount).toBe(1);
  });

  it('should filter by role', async () => {
    const c = chain({ data: [], count: 0 });
    mockFrom.mockReturnValue(c);
    await listUsers({ role: 'host', page: 0, limit: 20 });
    expect(c.eq).toHaveBeenCalled();
  });

  it('should search by name or email', async () => {
    const c = chain({ data: [], count: 0 });
    mockFrom.mockReturnValue(c);
    await listUsers({ search: 'test', page: 0, limit: 20 });
    expect(c.or).toHaveBeenCalled();
  });
});

describe('updateUserRole', () => {
  it('should update and return user profile', async () => {
    mockFrom.mockReturnValue(chain({ data: { ...fakeUser, role: 'host' } }));
    const result = await updateUserRole('u-1', 'host');
    expect(result.role).toBe('host');
  });

  it('should throw not found for missing user', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: null }));
    await expect(updateUserRole('u-x', 'admin')).rejects.toThrow('User not found');
  });
});

describe('updatePropertyStatus', () => {
  it('should update and return property', async () => {
    mockFrom.mockReturnValue(chain({ data: { id: 'p-1', status: 'inactive' } }));
    const result = await updatePropertyStatus('p-1', 'inactive');
    expect(result.status).toBe('inactive');
  });

  it('should throw not found for missing property', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: null }));
    await expect(updatePropertyStatus('p-x', 'active')).rejects.toThrow('Property not found');
  });
});

describe('getRevenueReport', () => {
  it('should return revenue aggregates and monthly breakdown', async () => {
    const bookings = [
      { booked_at: '2026-01-15T10:00:00Z', total_price_cents: 10000, net_revenue_cents: 8500, status: 'confirmed' },
      { booked_at: '2026-02-10T10:00:00Z', total_price_cents: 20000, net_revenue_cents: 17000, status: 'completed' },
    ];
    mockFrom.mockReturnValue(chain({ data: bookings }));

    const result = await getRevenueReport({});
    expect(result.totalRevenueCents).toBe(30000);
    expect(result.totalNetRevenueCents).toBe(25500);
    expect(result.totalCommissionCents).toBe(4500);
    expect(result.bookingCount).toBe(2);
    expect(result.byMonth).toHaveLength(2);
  });
});

describe('getBookingReport', () => {
  it('should return booking aggregates by status and month', async () => {
    const bookings = [
      { booked_at: '2026-01-15T10:00:00Z', status: 'confirmed' },
      { booked_at: '2026-01-20T10:00:00Z', status: 'cancelled' },
      { booked_at: '2026-02-05T10:00:00Z', status: 'completed' },
    ];
    mockFrom.mockReturnValue(chain({ data: bookings }));

    const result = await getBookingReport({});
    expect(result.totalBookings).toBe(3);
    expect(result.byStatus.find((s) => s.status === 'confirmed')?.count).toBe(1);
    expect(result.byMonth).toHaveLength(2);
  });
});
