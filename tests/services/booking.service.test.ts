import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
vi.mock('../../src/config/supabase.js', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const { createBooking, getBookings, getBooking, cancelBooking, getBookingSummary } = await import(
  '../../src/services/booking.service.js'
);

beforeEach(() => vi.clearAllMocks());

// Helpers to build chainable mocks
function chain(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const obj: Record<string, any> = {};
  const methods = ['select', 'eq', 'in', 'gte', 'lte', 'neq', 'order', 'range', 'single', 'insert', 'update', 'delete'];
  for (const m of methods) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }
  obj.single = vi.fn().mockResolvedValue({ data: result.data, error: result.error ?? null });
  // For non-single (list) queries
  obj.then = (resolve: Function) => resolve({ data: result.data, error: result.error ?? null, count: result.count ?? null });
  return obj;
}

const futureDate = (daysFromNow: number) => {
  const d = new Date(Date.now() + daysFromNow * 86400000);
  return d.toISOString().split('T')[0];
};

describe('createBooking', () => {
  it('should create a booking with calculated total price', async () => {
    const checkIn = futureDate(10);
    const checkOut = futureDate(12);

    // Room type query
    const rtChain = chain({ data: { id: 'rt-1', property_id: 'p-1', base_price_cents: 10000, max_guests: 2, total_inventory: 5, status: 'active' } });
    // Availability query
    const availChain = chain({ data: [] });
    // Pricing rules
    const rulesChain = chain({ data: [] });
    // Insert booking
    const insertChain = chain({ data: { id: 'b-1', status: 'confirmed', total_price_cents: 20000 } });
    // Availability updates (insert/update)
    const updateChain = chain({ data: null });

    let callIdx = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'room_types') return rtChain;
      if (table === 'availability') {
        callIdx++;
        return callIdx <= 1 ? availChain : updateChain;
      }
      if (table === 'pricing_rules') return rulesChain;
      if (table === 'bookings') return insertChain;
      return chain({ data: null });
    });

    const result = await createBooking(
      { property_id: 'p-1', room_type_id: 'rt-1', check_in: checkIn, check_out: checkOut, num_guests: 2, num_rooms: 1 },
      'trav-1',
    );
    expect(result.status).toBe('confirmed');
  });

  it('should throw when check-in is in the past', async () => {
    const pastDate = '2020-01-01';
    await expect(
      createBooking(
        { property_id: 'p-1', room_type_id: 'rt-1', check_in: pastDate, check_out: '2020-01-03', num_guests: 1, num_rooms: 1 },
        'trav-1',
      ),
    ).rejects.toThrow('Check-in date must be in the future');
  });

  it('should throw when check-out before check-in', async () => {
    const checkIn = futureDate(10);
    const checkOut = futureDate(8);
    await expect(
      createBooking(
        { property_id: 'p-1', room_type_id: 'rt-1', check_in: checkIn, check_out: checkOut, num_guests: 1, num_rooms: 1 },
        'trav-1',
      ),
    ).rejects.toThrow('Check-out must be after check-in');
  });

  it('should throw when room type not found', async () => {
    const checkIn = futureDate(10);
    const checkOut = futureDate(12);
    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'not found' } }));
    await expect(
      createBooking(
        { property_id: 'p-1', room_type_id: 'rt-x', check_in: checkIn, check_out: checkOut, num_guests: 1, num_rooms: 1 },
        'trav-1',
      ),
    ).rejects.toThrow('Room type not found');
  });
});

describe('getBookings', () => {
  it('should return paginated bookings for traveller', async () => {
    const bookings = [{ id: 'b-1', status: 'confirmed' }];
    const listChain: Record<string, any> = {};
    const methods = ['select', 'eq', 'in', 'order', 'range', 'neq'];
    for (const m of methods) listChain[m] = vi.fn().mockReturnValue(listChain);
    listChain.then = (resolve: Function) => resolve({ data: bookings, error: null, count: 1 });

    mockFrom.mockReturnValue(listChain);

    const result = await getBookings('trav-1', 'traveller', { page: 0, limit: 20 });
    expect(result.results).toHaveLength(1);
    expect(result.totalCount).toBe(1);
  });

  it('should return empty for host with no properties', async () => {
    // Properties query returns empty
    const propChain: Record<string, any> = {};
    ['select', 'eq'].forEach((m) => (propChain[m] = vi.fn().mockReturnValue(propChain)));
    propChain.then = (resolve: Function) => resolve({ data: [], error: null });

    mockFrom.mockReturnValue(propChain);

    const result = await getBookings('host-1', 'host', { page: 0, limit: 20 });
    expect(result.results).toHaveLength(0);
  });
});

describe('getBooking', () => {
  it('should return booking for authorized traveller', async () => {
    const booking = { id: 'b-1', traveller_id: 'trav-1', property_id: 'p-1', status: 'confirmed' };
    mockFrom.mockReturnValue(chain({ data: booking }));

    const result = await getBooking('b-1', 'trav-1', 'traveller');
    expect(result.id).toBe('b-1');
  });

  it('should throw forbidden for wrong traveller', async () => {
    const booking = { id: 'b-1', traveller_id: 'trav-other', property_id: 'p-1' };
    mockFrom.mockReturnValue(chain({ data: booking }));

    await expect(getBooking('b-1', 'trav-1', 'traveller')).rejects.toThrow('Insufficient permissions');
  });

  it('should throw not found for missing booking', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'not found' } }));
    await expect(getBooking('b-x', 'trav-1', 'traveller')).rejects.toThrow('Booking not found');
  });
});

describe('cancelBooking', () => {
  it('should cancel a confirmed booking', async () => {
    const farCheckIn = futureDate(10);
    const booking = { id: 'b-1', traveller_id: 'trav-1', room_type_id: 'rt-1', status: 'confirmed', check_in: farCheckIn, check_out: futureDate(12), num_rooms: 1 };
    const updated = { ...booking, status: 'cancelled' };

    let bookingCallIdx = 0;
    const availChain = chain({ data: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'bookings') {
        bookingCallIdx++;
        if (bookingCallIdx === 1) return chain({ data: booking }); // fetch
        return chain({ data: updated }); // update
      }
      if (table === 'availability') return availChain;
      return chain({ data: null });
    });

    const result = await cancelBooking('b-1', 'trav-1');
    expect(result.status).toBe('cancelled');
  });

  it('should throw when booking not confirmed', async () => {
    const booking = { id: 'b-1', traveller_id: 'trav-1', status: 'completed', check_in: futureDate(10), check_out: futureDate(12), num_rooms: 1 };
    mockFrom.mockReturnValue(chain({ data: booking }));
    await expect(cancelBooking('b-1', 'trav-1')).rejects.toThrow('Only confirmed bookings can be cancelled');
  });

  it('should throw when within 24 hours of check-in', async () => {
    const tomorrow = new Date(Date.now() + 12 * 3600000).toISOString().split('T')[0]; // ~12 hours from now
    const booking = { id: 'b-1', traveller_id: 'trav-1', status: 'confirmed', check_in: tomorrow, check_out: futureDate(3), num_rooms: 1 };
    mockFrom.mockReturnValue(chain({ data: booking }));
    await expect(cancelBooking('b-1', 'trav-1')).rejects.toThrow('Cannot cancel within 24 hours');
  });
});

describe('getBookingSummary', () => {
  it('should return aggregated summary', async () => {
    const bookings = [
      { status: 'confirmed', total_price_cents: 10000, net_revenue_cents: 8500 },
      { status: 'cancelled', total_price_cents: 5000, net_revenue_cents: 4250 },
      { status: 'completed', total_price_cents: 20000, net_revenue_cents: 17000 },
    ];

    let callIdx = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'properties') {
        return chain({ data: [{ id: 'p-1' }] });
      }
      if (table === 'bookings') {
        const c: Record<string, any> = {};
        ['select', 'eq', 'in', 'gte'].forEach((m) => (c[m] = vi.fn().mockReturnValue(c)));
        c.then = (resolve: Function) => resolve({ data: bookings, error: null });
        return c;
      }
      return chain({ data: null });
    });

    const result = await getBookingSummary('host-1', 'host', { period: '30d' });
    expect(result.totalBookings).toBe(3);
    expect(result.confirmedCount).toBe(1);
    expect(result.cancelledCount).toBe(1);
    expect(result.completedCount).toBe(1);
    expect(result.totalRevenueCents).toBe(35000);
  });
});
