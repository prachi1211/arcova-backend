import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
vi.mock('../../src/config/supabase.js', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const { listProperties, getProperty, createProperty, updateProperty, createRoomType, updateRoomType } = await import(
  '../../src/services/property.service.js'
);

beforeEach(() => vi.clearAllMocks());

function chain(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const obj: Record<string, any> = {};
  ['select', 'eq', 'insert', 'update', 'order', 'range', 'single', 'in'].forEach((m) => {
    obj[m] = vi.fn().mockReturnValue(obj);
  });
  obj.single = vi.fn().mockResolvedValue({ data: result.data, error: result.error ?? null });
  obj.then = (resolve: Function) => resolve({ data: result.data, error: result.error ?? null, count: result.count ?? null });
  return obj;
}

const fakeProperty = { id: 'p-1', host_id: 'host-1', name: 'Test Hotel', city: 'Paris', country: 'France', status: 'active' };

describe('listProperties', () => {
  it('should return paginated properties for host', async () => {
    const listChain = chain({ data: [fakeProperty], count: 1 });
    mockFrom.mockReturnValue(listChain);

    const result = await listProperties('host-1', 'host', { page: 0, limit: 20 });
    expect(result.results).toHaveLength(1);
    expect(result.totalCount).toBe(1);
    expect(result.hasNextPage).toBe(false);
  });

  it('should filter by status when provided', async () => {
    const c = chain({ data: [], count: 0 });
    mockFrom.mockReturnValue(c);

    await listProperties('host-1', 'host', { status: 'active', page: 0, limit: 20 });
    expect(c.eq).toHaveBeenCalled();
  });
});

describe('getProperty', () => {
  it('should return property with room types', async () => {
    const prop = { ...fakeProperty, room_types: [{ id: 'rt-1', name: 'Standard' }] };
    mockFrom.mockReturnValue(chain({ data: prop }));

    const result = await getProperty('p-1', 'host-1', 'host');
    expect(result.name).toBe('Test Hotel');
    expect(result.room_types).toHaveLength(1);
  });

  it('should throw forbidden when host does not own property', async () => {
    const prop = { ...fakeProperty, host_id: 'other-host', room_types: [] };
    mockFrom.mockReturnValue(chain({ data: prop }));

    await expect(getProperty('p-1', 'host-1', 'host')).rejects.toThrow('Insufficient permissions');
  });

  it('should allow admin to view any property', async () => {
    const prop = { ...fakeProperty, host_id: 'other-host', room_types: [] };
    mockFrom.mockReturnValue(chain({ data: prop }));

    const result = await getProperty('p-1', 'admin-1', 'admin');
    expect(result.name).toBe('Test Hotel');
  });

  it('should throw not found for missing property', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'not found' } }));
    await expect(getProperty('p-x', 'host-1', 'host')).rejects.toThrow('Property not found');
  });
});

describe('createProperty', () => {
  it('should create and return property', async () => {
    mockFrom.mockReturnValue(chain({ data: fakeProperty }));

    const result = await createProperty({ name: 'Test Hotel', city: 'Paris', country: 'France' }, 'host-1');
    expect(result.name).toBe('Test Hotel');
  });

  it('should throw on insert error', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'insert failed' } }));
    await expect(createProperty({ name: 'X', city: 'Y', country: 'Z' }, 'host-1')).rejects.toThrow();
  });
});

describe('updateProperty', () => {
  it('should update and return property', async () => {
    const updated = { ...fakeProperty, name: 'Updated Hotel' };
    mockFrom.mockReturnValue(chain({ data: updated }));

    const result = await updateProperty('p-1', 'host-1', { name: 'Updated Hotel' });
    expect(result.name).toBe('Updated Hotel');
  });

  it('should throw not found when property does not exist or host mismatch', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: null }));
    await expect(updateProperty('p-x', 'host-1', { name: 'X' })).rejects.toThrow('Property not found');
  });
});

describe('createRoomType', () => {
  it('should verify ownership and create room type', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ data: { id: 'p-1' } }); // verify ownership
      return chain({ data: { id: 'rt-1', name: 'Deluxe', base_price_cents: 20000 } }); // insert
    });

    const result = await createRoomType('p-1', 'host-1', { name: 'Deluxe', base_price_cents: 20000 });
    expect(result.name).toBe('Deluxe');
  });

  it('should throw when host does not own property', async () => {
    mockFrom.mockReturnValue(chain({ data: null }));
    await expect(createRoomType('p-1', 'wrong-host', { name: 'X', base_price_cents: 100 })).rejects.toThrow('Property not found');
  });
});

describe('updateRoomType', () => {
  it('should verify ownership and update room type', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ data: { id: 'p-1' } }); // verify ownership
      return chain({ data: { id: 'rt-1', name: 'Updated', base_price_cents: 25000 } }); // update
    });

    const result = await updateRoomType('p-1', 'rt-1', 'host-1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });

  it('should throw when room type not found', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ data: { id: 'p-1' } });
      return chain({ data: null, error: null });
    });
    await expect(updateRoomType('p-1', 'rt-x', 'host-1', { name: 'X' })).rejects.toThrow('Room type not found');
  });
});
