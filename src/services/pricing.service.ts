import { supabaseAdmin } from '../config/supabase.js';
import { Errors } from '../utils/errors.js';
import { calculateEffectiveRate } from '../utils/pricing-engine.js';
import { parseDateRange } from '../utils/helpers.js';
import type { PricingRule, PricingResult } from '../types/index.js';

// Verify that the caller owns the property chain: room_type → property → host
async function verifyOwnership(roomTypeId: string, userId: string, role: string): Promise<void> {
  if (role === 'admin') return; // Admin bypasses ownership check

  const { data: roomType } = await supabaseAdmin
    .from('room_types')
    .select('property_id')
    .eq('id', roomTypeId)
    .single();

  if (!roomType) throw Errors.notFound('Room type');

  const { data: property } = await supabaseAdmin
    .from('properties')
    .select('id')
    .eq('id', roomType.property_id)
    .eq('host_id', userId)
    .single();

  if (!property) throw Errors.forbidden();
}

export async function listRules(
  roomTypeId: string,
  userId: string,
  role: string,
): Promise<PricingRule[]> {
  await verifyOwnership(roomTypeId, userId, role);

  const { data, error } = await supabaseAdmin
    .from('pricing_rules')
    .select('*')
    .eq('room_type_id', roomTypeId)
    .order('priority', { ascending: true });

  if (error) throw Errors.internal(error.message);
  return (data ?? []) as PricingRule[];
}

export async function createRule(
  input: {
    room_type_id: string;
    name: string;
    rule_type: string;
    adjustment_type: string;
    adjustment_value: number;
    priority?: number;
    days_of_week?: number[];
    date_from?: string;
    date_to?: string;
    days_before_checkin?: number;
    occupancy_threshold?: number;
  },
  userId: string,
): Promise<PricingRule> {
  await verifyOwnership(input.room_type_id, userId, 'host');

  const { data, error } = await supabaseAdmin
    .from('pricing_rules')
    .insert({
      room_type_id: input.room_type_id,
      name: input.name,
      rule_type: input.rule_type,
      adjustment_type: input.adjustment_type,
      adjustment_value: input.adjustment_value,
      priority: input.priority ?? 1,
      days_of_week: input.days_of_week ?? null,
      date_from: input.date_from ?? null,
      date_to: input.date_to ?? null,
      days_before_checkin: input.days_before_checkin ?? null,
      occupancy_threshold: input.occupancy_threshold ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error || !data) throw Errors.internal(error?.message ?? 'Failed to create pricing rule');
  return data as PricingRule;
}

export async function updateRule(
  ruleId: string,
  userId: string,
  updates: Partial<Pick<PricingRule, 'name' | 'adjustment_type' | 'adjustment_value' | 'priority' | 'days_of_week' | 'date_from' | 'date_to' | 'days_before_checkin' | 'occupancy_threshold' | 'is_active'>>,
): Promise<PricingRule> {
  // Fetch rule to get room_type_id for ownership check
  const { data: existing } = await supabaseAdmin
    .from('pricing_rules')
    .select('room_type_id')
    .eq('id', ruleId)
    .single();

  if (!existing) throw Errors.notFound('Pricing rule');
  await verifyOwnership(existing.room_type_id, userId, 'host');

  const { data, error } = await supabaseAdmin
    .from('pricing_rules')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', ruleId)
    .select()
    .single();

  if (error || !data) throw Errors.internal(error?.message ?? 'Failed to update pricing rule');
  return data as PricingRule;
}

export async function deleteRule(
  ruleId: string,
  userId: string,
): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('pricing_rules')
    .select('room_type_id')
    .eq('id', ruleId)
    .single();

  if (!existing) throw Errors.notFound('Pricing rule');
  await verifyOwnership(existing.room_type_id, userId, 'host');

  const { error } = await supabaseAdmin
    .from('pricing_rules')
    .delete()
    .eq('id', ruleId);

  if (error) throw Errors.internal(error.message);
}

export async function previewRates(
  roomTypeId: string,
  startDate: string,
  endDate: string,
  userId: string,
  role: string,
): Promise<PricingResult[]> {
  await verifyOwnership(roomTypeId, userId, role);

  // Fetch room type base price
  const { data: roomType } = await supabaseAdmin
    .from('room_types')
    .select('base_price_cents')
    .eq('id', roomTypeId)
    .single();

  if (!roomType) throw Errors.notFound('Room type');

  // Fetch active rules
  const { data: rules } = await supabaseAdmin
    .from('pricing_rules')
    .select('*')
    .eq('room_type_id', roomTypeId)
    .eq('is_active', true);

  // Calculate effective rate for each date in range
  const dates = parseDateRange(startDate, endDate);
  return dates.map((d) => {
    const dateStr = d.toISOString().split('T')[0];
    return calculateEffectiveRate(roomType.base_price_cents, dateStr, (rules ?? []) as PricingRule[]);
  });
}
