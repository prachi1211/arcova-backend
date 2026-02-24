import { describe, it, expect } from 'vitest';
import { hashObject, parseDateRange, formatCurrency } from '../../src/utils/helpers.js';

describe('hashObject', () => {
  it('should return the same hash for the same object', () => {
    const obj = { city: 'Paris', rating: 4 };
    expect(hashObject(obj)).toBe(hashObject(obj));
  });

  it('should return the same hash regardless of key insertion order', () => {
    const a = { city: 'Paris', rating: 4 };
    const b = { rating: 4, city: 'Paris' };
    expect(hashObject(a)).toBe(hashObject(b));
  });

  it('should return different hashes for different objects', () => {
    const a = { city: 'Paris' };
    const b = { city: 'London' };
    expect(hashObject(a)).not.toBe(hashObject(b));
  });

  it('should return a hex string', () => {
    const hash = hashObject({ key: 'value' });
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('parseDateRange', () => {
  it('should return dates between checkIn and checkOut (exclusive of checkOut)', () => {
    const dates = parseDateRange('2026-03-01', '2026-03-04');
    expect(dates).toHaveLength(3);
    expect(dates[0].toISOString().split('T')[0]).toBe('2026-03-01');
    expect(dates[1].toISOString().split('T')[0]).toBe('2026-03-02');
    expect(dates[2].toISOString().split('T')[0]).toBe('2026-03-03');
  });

  it('should return empty array when checkIn equals checkOut', () => {
    const dates = parseDateRange('2026-03-01', '2026-03-01');
    expect(dates).toHaveLength(0);
  });

  it('should return a single date for one-night stay', () => {
    const dates = parseDateRange('2026-03-01', '2026-03-02');
    expect(dates).toHaveLength(1);
  });
});

describe('formatCurrency', () => {
  it('should format cents to USD by default', () => {
    const result = formatCurrency(15000);
    expect(result).toBe('$150.00');
  });

  it('should format zero correctly', () => {
    const result = formatCurrency(0);
    expect(result).toBe('$0.00');
  });

  it('should format cents with decimals', () => {
    const result = formatCurrency(1050);
    expect(result).toBe('$10.50');
  });

  it('should support other currencies', () => {
    const result = formatCurrency(5000, 'EUR');
    expect(result).toContain('50.00');
  });
});
