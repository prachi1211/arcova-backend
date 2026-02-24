import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
vi.mock('../../src/config/supabase.js', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const { createItinerary, getItineraries, getItinerary, updateItinerary, deleteItinerary, addItem, removeItem, createFromTripPlan } = await import(
  '../../src/services/itinerary.service.js'
);

beforeEach(() => vi.clearAllMocks());

function chain(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const obj: Record<string, any> = {};
  ['select', 'eq', 'insert', 'update', 'delete', 'order', 'range', 'single', 'limit', 'in'].forEach((m) => {
    obj[m] = vi.fn().mockReturnValue(obj);
  });
  obj.single = vi.fn().mockResolvedValue({ data: result.data, error: result.error ?? null });
  obj.then = (resolve: Function) => resolve({ data: result.data, error: result.error ?? null, count: result.count ?? null });
  return obj;
}

const fakeItinerary = { id: 'it-1', traveller_id: 'trav-1', name: 'Paris Trip', start_date: '2026-04-01', end_date: '2026-04-05', items: [], itinerary_items: [] };
const fakeItem = { id: 'item-1', itinerary_id: 'it-1', type: 'activity', title: 'Eiffel Tower', date: '2026-04-01', sort_order: 0 };

describe('createItinerary', () => {
  it('should create an itinerary', async () => {
    mockFrom.mockReturnValue(chain({ data: { ...fakeItinerary } }));
    const result = await createItinerary({ name: 'Paris Trip', start_date: '2026-04-01', end_date: '2026-04-05' }, 'trav-1');
    expect(result.name).toBe('Paris Trip');
    expect(result.items).toEqual([]);
  });

  it('should throw when end date is before start date', async () => {
    await expect(
      createItinerary({ name: 'Trip', start_date: '2026-04-05', end_date: '2026-04-01' }, 'trav-1'),
    ).rejects.toThrow('End date must be after start date');
  });
});

describe('getItineraries', () => {
  it('should return paginated itineraries', async () => {
    mockFrom.mockReturnValue(chain({ data: [{ ...fakeItinerary, itinerary_items: [] }], count: 1 }));
    const result = await getItineraries('trav-1', { page: 0, limit: 20 });
    expect(result.results).toHaveLength(1);
    expect(result.totalCount).toBe(1);
  });
});

describe('getItinerary', () => {
  it('should return itinerary with sorted items', async () => {
    mockFrom.mockReturnValue(chain({ data: { ...fakeItinerary, itinerary_items: [{ ...fakeItem, sort_order: 1 }, { ...fakeItem, id: 'item-0', sort_order: 0 }] } }));
    const result = await getItinerary('it-1', 'trav-1');
    expect(result.items[0].sort_order).toBe(0);
    expect(result.items[1].sort_order).toBe(1);
  });

  it('should throw not found for missing itinerary', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'not found' } }));
    await expect(getItinerary('it-x', 'trav-1')).rejects.toThrow('Itinerary not found');
  });
});

describe('updateItinerary', () => {
  it('should update and return itinerary', async () => {
    mockFrom.mockReturnValue(chain({ data: { ...fakeItinerary, name: 'Updated Trip', itinerary_items: [] } }));
    const result = await updateItinerary('it-1', 'trav-1', { name: 'Updated Trip' });
    expect(result.name).toBe('Updated Trip');
  });

  it('should throw when new end date is before start date', async () => {
    await expect(
      updateItinerary('it-1', 'trav-1', { start_date: '2026-04-05', end_date: '2026-04-01' }),
    ).rejects.toThrow('End date must be after start date');
  });
});

describe('deleteItinerary', () => {
  it('should verify ownership and delete', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ data: { id: 'it-1' } }); // verify
      const c = chain({ data: null });
      c.then = (resolve: Function) => resolve({ error: null });
      return c; // delete
    });

    await expect(deleteItinerary('it-1', 'trav-1')).resolves.toBeUndefined();
  });

  it('should throw not found when itinerary does not exist', async () => {
    mockFrom.mockReturnValue(chain({ data: null }));
    await expect(deleteItinerary('it-x', 'trav-1')).rejects.toThrow('Itinerary not found');
  });
});

describe('addItem', () => {
  it('should add item and auto-assign sort order', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation((table: string) => {
      callIdx++;
      if (table === 'itineraries' && callIdx === 1) return chain({ data: { id: 'it-1' } }); // ownership
      if (table === 'itinerary_items' && callIdx === 2) return chain({ data: { sort_order: 2 } }); // last item
      if (table === 'itinerary_items' && callIdx === 3) return chain({ data: fakeItem }); // insert
      if (table === 'itinerary_items') return chain({ data: [{ estimated_cost_cents: 1000 }] }); // recalculate
      return chain({ data: null }); // update total
    });

    const result = await addItem('it-1', 'trav-1', { type: 'activity', title: 'Eiffel Tower', date: '2026-04-01' } as any);
    expect(result.title).toBe('Eiffel Tower');
  });

  it('should throw when itinerary not found', async () => {
    mockFrom.mockReturnValue(chain({ data: null }));
    await expect(addItem('it-x', 'trav-1', { type: 'activity', title: 'X', date: '2026-04-01' } as any)).rejects.toThrow('Itinerary not found');
  });
});

describe('removeItem', () => {
  it('should remove item and recalculate cost', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation((table: string) => {
      callIdx++;
      if (table === 'itineraries' && callIdx === 1) return chain({ data: { id: 'it-1' } }); // ownership
      if (table === 'itinerary_items' && callIdx === 2) {
        const c = chain({ data: null });
        c.then = (resolve: Function) => resolve({ error: null });
        return c; // delete
      }
      if (table === 'itinerary_items') return chain({ data: [] }); // recalculate
      return chain({ data: null }); // update total
    });

    await expect(removeItem('it-1', 'item-1', 'trav-1')).resolves.toBeUndefined();
  });
});

describe('createFromTripPlan', () => {
  it('should convert trip plan to itinerary', async () => {
    const tripPlan = {
      destination: 'Paris',
      dates: { start: '2026-04-01', end: '2026-04-03' },
      budget: { total: 2000, currency: 'USD' },
      itinerary: [
        {
          day: 1,
          date: '2026-04-01',
          activities: [
            { time: '09:00', title: 'Eiffel Tower', description: 'Visit the tower', type: 'activity', estimatedCost: 25 },
          ],
        },
      ],
      tips: [],
    };

    let callIdx = 0;
    mockFrom.mockImplementation((table: string) => {
      callIdx++;
      if (table === 'itineraries' && callIdx === 1) return chain({ data: { id: 'it-1', traveller_id: 'trav-1' } }); // create
      if (table === 'itinerary_items' && callIdx === 2) {
        const c = chain({ data: null });
        c.then = (resolve: Function) => resolve({ error: null });
        return c; // batch insert
      }
      if (table === 'itinerary_items') return chain({ data: [{ estimated_cost_cents: 2500 }] }); // recalculate items
      if (table === 'itineraries') return chain({ data: { ...fakeItinerary, itinerary_items: [{ ...fakeItem, sort_order: 0 }] } }); // update cost + getItinerary
      return chain({ data: null });
    });

    const result = await createFromTripPlan('trav-1', tripPlan as any);
    expect(result.name).toBe('Paris Trip');
  });
});
