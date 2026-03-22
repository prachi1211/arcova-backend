import crypto from 'crypto';

export function hashObject(obj: Record<string, unknown>): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash('md5').update(str).digest('hex');
}

export function parseDateRange(checkIn: string, checkOut: string): Date[] {
  const dates: Date[] = [];
  // Parse as UTC midnight to avoid timezone-dependent date shifts
  const current = new Date(checkIn + 'T00:00:00Z');
  const end = new Date(checkOut + 'T00:00:00Z');

  while (current < end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

export function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
