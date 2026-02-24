import crypto from 'crypto';

export function hashObject(obj: Record<string, unknown>): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash('md5').update(str).digest('hex');
}

export function parseDateRange(checkIn: string, checkOut: string): Date[] {
  const dates: Date[] = [];
  const current = new Date(checkIn);
  const end = new Date(checkOut);

  while (current < end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
