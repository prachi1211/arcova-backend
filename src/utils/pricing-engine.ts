import type { PricingRule, PricingResult } from '../types/index.js';

/**
 * Pure function — calculates the effective rate for a given date
 * by applying all active pricing rules in priority order.
 */
export function calculateEffectiveRate(
  basePriceCents: number,
  date: string,
  rules: PricingRule[],
  occupancyPercent?: number,
): PricingResult {
  const activeRules = rules
    .filter((r) => r.is_active)
    .sort((a, b) => a.priority - b.priority);

  let effectivePrice = basePriceCents;
  const appliedRules: PricingResult['appliedRules'] = [];
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay() === 0 ? 7 : targetDate.getDay(); // 1=Mon, 7=Sun

  for (const rule of activeRules) {
    let applies = false;

    switch (rule.rule_type) {
      case 'weekend':
        applies = rule.days_of_week?.includes(dayOfWeek) ?? false;
        break;

      case 'seasonal':
        if (rule.date_from && rule.date_to) {
          const from = new Date(rule.date_from);
          const to = new Date(rule.date_to);
          applies = targetDate >= from && targetDate <= to;
        }
        break;

      case 'last_minute':
        if (rule.days_before_checkin != null) {
          const now = new Date();
          const diffMs = targetDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          applies = diffDays <= rule.days_before_checkin && diffDays >= 0;
        }
        break;

      case 'occupancy':
        if (rule.occupancy_threshold != null && occupancyPercent != null) {
          applies = occupancyPercent >= rule.occupancy_threshold;
        }
        break;
    }

    if (applies) {
      let adjustment: number;
      if (rule.adjustment_type === 'percentage') {
        adjustment = Math.round(effectivePrice * (rule.adjustment_value / 100));
      } else {
        adjustment = Math.round(rule.adjustment_value * 100);
      }

      effectivePrice += adjustment;
      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        adjustment,
      });
    }
  }

  // Never allow negative prices
  effectivePrice = Math.max(effectivePrice, 0);

  return {
    date,
    basePrice: basePriceCents,
    effectivePrice,
    appliedRules,
  };
}
