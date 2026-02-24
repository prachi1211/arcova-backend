import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
vi.mock('../../src/config/supabase.js', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const { listRules, createRule, updateRule, deleteRule, previewRates } = await import(
  '../../src/services/pricing.service.js'
);

beforeEach(() => vi.clearAllMocks());

function chain(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const obj: Record<string, any> = {};
  ['select', 'eq', 'insert', 'update', 'delete', 'order', 'range', 'single', 'in'].forEach((m) => {
    obj[m] = vi.fn().mockReturnValue(obj);
  });
  obj.single = vi.fn().mockResolvedValue({ data: result.data, error: result.error ?? null });
  obj.then = (resolve: Function) => resolve({ data: result.data, error: result.error ?? null, count: result.count ?? null });
  return obj;
}

const fakeRule = { id: 'rule-1', room_type_id: 'rt-1', name: 'Weekend', rule_type: 'weekend', adjustment_type: 'percentage', adjustment_value: 20, priority: 1, is_active: true };

describe('listRules', () => {
  it('should verify ownership and return rules', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ data: { property_id: 'p-1' } }); // room_type lookup
      if (callIdx === 2) return chain({ data: { id: 'p-1' } }); // property ownership
      return chain({ data: [fakeRule] }); // rules list
    });

    const result = await listRules('rt-1', 'host-1', 'host');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Weekend');
  });

  it('should skip ownership check for admin', async () => {
    // Admin: first call is the rules query directly (after admin check returns early)
    mockFrom.mockReturnValue(chain({ data: [fakeRule] }));

    const result = await listRules('rt-1', 'admin-1', 'admin');
    expect(result).toHaveLength(1);
  });

  it('should throw when room type not found', async () => {
    mockFrom.mockReturnValue(chain({ data: null }));
    await expect(listRules('rt-x', 'host-1', 'host')).rejects.toThrow('Room type not found');
  });
});

describe('createRule', () => {
  it('should verify ownership and create rule', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ data: { property_id: 'p-1' } });
      if (callIdx === 2) return chain({ data: { id: 'p-1' } });
      return chain({ data: fakeRule }); // insert
    });

    const result = await createRule(
      { room_type_id: 'rt-1', name: 'Weekend', rule_type: 'weekend', adjustment_type: 'percentage', adjustment_value: 20 },
      'host-1',
    );
    expect(result.name).toBe('Weekend');
  });
});

describe('updateRule', () => {
  it('should fetch rule, verify ownership, then update', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ data: { room_type_id: 'rt-1' } }); // fetch existing
      if (callIdx === 2) return chain({ data: { property_id: 'p-1' } }); // room type lookup
      if (callIdx === 3) return chain({ data: { id: 'p-1' } }); // ownership
      return chain({ data: { ...fakeRule, adjustment_value: 25 } }); // update
    });

    const result = await updateRule('rule-1', 'host-1', { adjustment_value: 25 });
    expect(result.adjustment_value).toBe(25);
  });

  it('should throw when rule not found', async () => {
    mockFrom.mockReturnValue(chain({ data: null }));
    await expect(updateRule('rule-x', 'host-1', {})).rejects.toThrow('Pricing rule not found');
  });
});

describe('deleteRule', () => {
  it('should fetch rule, verify ownership, then delete', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ data: { room_type_id: 'rt-1' } });
      if (callIdx === 2) return chain({ data: { property_id: 'p-1' } });
      if (callIdx === 3) return chain({ data: { id: 'p-1' } });
      const c = chain({ data: null });
      c.then = (resolve: Function) => resolve({ error: null });
      return c;
    });

    await expect(deleteRule('rule-1', 'host-1')).resolves.toBeUndefined();
  });
});

describe('previewRates', () => {
  it('should return effective rates for date range', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation((table: string) => {
      callIdx++;
      // Admin skips ownership check, goes straight to room_types + pricing_rules
      if (table === 'room_types') return chain({ data: { base_price_cents: 10000 } });
      if (table === 'pricing_rules') return chain({ data: [] });
      return chain({ data: null });
    });

    const result = await previewRates('rt-1', '2026-03-15', '2026-03-17', 'admin-1', 'admin');
    expect(result).toHaveLength(2); // 2 nights
    expect(result[0].basePrice).toBe(10000);
    expect(result[0].effectivePrice).toBe(10000); // no rules
  });
});
