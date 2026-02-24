import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateEffectiveRate } from '../../src/utils/pricing-engine.js';
import type { PricingRule } from '../../src/types/index.js';

function makeRule(overrides: Partial<PricingRule> = {}): PricingRule {
  return {
    id: 'rule-1',
    room_type_id: 'rt-1',
    name: 'Test Rule',
    rule_type: 'weekend',
    adjustment_type: 'percentage',
    adjustment_value: 20,
    priority: 1,
    is_active: true,
    days_of_week: null,
    date_from: null,
    date_to: null,
    days_before_checkin: null,
    occupancy_threshold: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('calculateEffectiveRate', () => {
  it('should return base price when no rules', () => {
    const result = calculateEffectiveRate(10000, '2026-03-15', []);
    expect(result.effectivePrice).toBe(10000);
    expect(result.basePrice).toBe(10000);
    expect(result.appliedRules).toHaveLength(0);
    expect(result.date).toBe('2026-03-15');
  });

  it('should skip inactive rules', () => {
    const rule = makeRule({ is_active: false, days_of_week: [6, 7] });
    const result = calculateEffectiveRate(10000, '2026-03-14', [rule]); // Saturday
    expect(result.effectivePrice).toBe(10000);
    expect(result.appliedRules).toHaveLength(0);
  });

  it('should apply weekend surcharge on matching days', () => {
    // 2026-03-15 is Saturday → getDay()=6 → dayOfWeek=6
    const rule = makeRule({ days_of_week: [6, 7], adjustment_value: 20 });
    const result = calculateEffectiveRate(10000, '2026-03-15', [rule]);
    expect(result.effectivePrice).toBe(12000); // +20%
    expect(result.appliedRules).toHaveLength(1);
    expect(result.appliedRules[0].ruleName).toBe('Test Rule');
  });

  it('should not apply weekend surcharge on non-matching days', () => {
    // 2026-03-17 is Tuesday → getDay()=2 → dayOfWeek=2
    const rule = makeRule({ days_of_week: [6, 7], adjustment_value: 20 });
    const result = calculateEffectiveRate(10000, '2026-03-17', [rule]);
    expect(result.effectivePrice).toBe(10000);
    expect(result.appliedRules).toHaveLength(0);
  });

  it('should apply seasonal rule within date range', () => {
    const rule = makeRule({
      rule_type: 'seasonal',
      name: 'Summer Season',
      date_from: '2026-06-01',
      date_to: '2026-08-31',
      adjustment_value: 30,
    });
    const result = calculateEffectiveRate(10000, '2026-07-15', [rule]);
    expect(result.effectivePrice).toBe(13000); // +30%
    expect(result.appliedRules[0].ruleName).toBe('Summer Season');
  });

  it('should not apply seasonal rule outside date range', () => {
    const rule = makeRule({
      rule_type: 'seasonal',
      date_from: '2026-06-01',
      date_to: '2026-08-31',
      adjustment_value: 30,
    });
    const result = calculateEffectiveRate(10000, '2026-03-15', [rule]);
    expect(result.effectivePrice).toBe(10000);
  });

  it('should apply last_minute discount when within days_before_checkin', () => {
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 86400000);
    const dateStr = twoDaysFromNow.toISOString().split('T')[0];

    const rule = makeRule({
      rule_type: 'last_minute',
      name: 'Last Minute Deal',
      days_before_checkin: 3,
      adjustment_value: -15,
    });
    const result = calculateEffectiveRate(10000, dateStr, [rule]);
    expect(result.effectivePrice).toBe(8500); // -15%
  });

  it('should not apply last_minute when too far out', () => {
    const farFuture = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const rule = makeRule({
      rule_type: 'last_minute',
      days_before_checkin: 3,
      adjustment_value: -15,
    });
    const result = calculateEffectiveRate(10000, farFuture, [rule]);
    expect(result.effectivePrice).toBe(10000);
  });

  it('should apply occupancy rule when threshold met', () => {
    const rule = makeRule({
      rule_type: 'occupancy',
      name: 'High Demand',
      occupancy_threshold: 80,
      adjustment_value: 10,
    });
    const result = calculateEffectiveRate(10000, '2026-03-15', [rule], 90);
    expect(result.effectivePrice).toBe(11000); // +10%
  });

  it('should not apply occupancy rule when below threshold', () => {
    const rule = makeRule({
      rule_type: 'occupancy',
      occupancy_threshold: 80,
      adjustment_value: 10,
    });
    const result = calculateEffectiveRate(10000, '2026-03-15', [rule], 50);
    expect(result.effectivePrice).toBe(10000);
  });

  it('should apply fixed adjustment correctly', () => {
    // 2026-03-15 is Saturday → dayOfWeek=6
    const rule = makeRule({
      adjustment_type: 'fixed',
      adjustment_value: 25, // +$25
      days_of_week: [6, 7],
    });
    const result = calculateEffectiveRate(10000, '2026-03-15', [rule]);
    expect(result.effectivePrice).toBe(12500); // +2500 cents
  });

  it('should stack multiple rules in priority order', () => {
    const rules = [
      makeRule({ id: 'r1', priority: 2, rule_type: 'seasonal', name: 'Season', date_from: '2026-03-01', date_to: '2026-03-31', adjustment_value: 20 }),
      makeRule({ id: 'r2', priority: 1, rule_type: 'weekend', name: 'Weekend', days_of_week: [6, 7], adjustment_value: 10 }),
    ];
    // 2026-03-15 is Saturday (dayOfWeek=6) — both rules apply
    const result = calculateEffectiveRate(10000, '2026-03-15', rules);
    // Priority 1 (weekend) first: 10000 + 10% = 11000
    // Priority 2 (seasonal) second: 11000 + 20% = 13200
    expect(result.effectivePrice).toBe(13200);
    expect(result.appliedRules).toHaveLength(2);
  });

  it('should never return a negative price', () => {
    const rule = makeRule({
      rule_type: 'seasonal',
      date_from: '2026-01-01',
      date_to: '2026-12-31',
      adjustment_value: -200,
    });
    const result = calculateEffectiveRate(5000, '2026-03-15', [rule]);
    expect(result.effectivePrice).toBe(0);
  });

  it('should handle Sunday as dayOfWeek 7', () => {
    // 2026-03-16 is Sunday → getDay()=0 → mapped to 7
    const rule = makeRule({ days_of_week: [7], adjustment_value: 15 });
    const result = calculateEffectiveRate(10000, '2026-03-16', [rule]);
    expect(result.effectivePrice).toBe(11500);
  });
});
