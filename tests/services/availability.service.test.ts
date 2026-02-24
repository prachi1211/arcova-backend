import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
vi.mock('../../src/config/supabase.js', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const { getAvailability, bulkUpdateAvailability } = await import(
  '../../src/services/availability.service.js'
);

beforeEach(() => vi.clearAllMocks());

function chain(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const obj: Record<string, any> = {};
  ['select', 'eq', 'in', 'gte', 'lte', 'order', 'single', 'upsert', 'insert', 'update'].forEach((m) => {
    obj[m] = vi.fn().mockReturnValue(obj);
  });
  obj.single = vi.fn().mockResolvedValue({ data: result.data, error: result.error ?? null });
  obj.then = (resolve: Function) => resolve({ data: result.data, error: result.error ?? null, count: result.count ?? null });
  return obj;
}

describe('getAvailability', () => {
  it('should return grouped availability by room type for admin', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'room_types') return chain({ data: [{ id: 'rt-1', name: 'Standard' }] });
      if (table === 'availability') return chain({ data: [{ room_type_id: 'rt-1', date: '2026-03-15', available_rooms: 3, is_closed: false }] });
      return chain({ data: null });
    });

    const result = await getAvailability('p-1', '2026-03-15', '2026-03-17', 'admin-1', 'admin');
    expect(result).toHaveLength(1);
    expect(result[0].roomTypeName).toBe('Standard');
    expect(result[0].availability).toHaveLength(1);
  });

  it('should verify host ownership', async () => {
    // Property check returns null → forbidden
    mockFrom.mockImplementation((table: string) => {
      if (table === 'properties') return chain({ data: null });
      return chain({ data: [] });
    });

    await expect(getAvailability('p-1', '2026-03-15', '2026-03-17', 'host-1', 'host')).rejects.toThrow('Insufficient permissions');
  });

  it('should return empty when property has no room types', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'properties') return chain({ data: { id: 'p-1' } });
      if (table === 'room_types') return chain({ data: [] });
      return chain({ data: [] });
    });

    const result = await getAvailability('p-1', '2026-03-15', '2026-03-17', 'host-1', 'host');
    expect(result).toHaveLength(0);
  });
});

describe('bulkUpdateAvailability', () => {
  it('should upsert entries after verifying ownership', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation((table: string) => {
      callIdx++;
      if (table === 'room_types') return chain({ data: { property_id: 'p-1' } });
      if (table === 'properties') return chain({ data: { id: 'p-1' } });
      if (table === 'availability') return chain({ data: [{ room_type_id: 'rt-1', date: '2026-03-15', available_rooms: 5 }] });
      return chain({ data: null });
    });

    const result = await bulkUpdateAvailability(
      [{ room_type_id: 'rt-1', date: '2026-03-15', available_rooms: 5 }],
      'host-1',
    );
    expect(result).toHaveLength(1);
  });

  it('should throw when entries is empty', async () => {
    await expect(bulkUpdateAvailability([], 'host-1')).rejects.toThrow('No entries provided');
  });

  it('should throw when room type not found', async () => {
    mockFrom.mockReturnValue(chain({ data: null }));
    await expect(
      bulkUpdateAvailability([{ room_type_id: 'rt-x', date: '2026-03-15', available_rooms: 5 }], 'host-1'),
    ).rejects.toThrow('Room type rt-x not found');
  });

  it('should throw forbidden when host does not own property', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ data: { property_id: 'p-1' } }); // room type
      return chain({ data: null }); // property ownership fails
    });

    await expect(
      bulkUpdateAvailability([{ room_type_id: 'rt-1', date: '2026-03-15', available_rooms: 5 }], 'wrong-host'),
    ).rejects.toThrow('Insufficient permissions');
  });
});
