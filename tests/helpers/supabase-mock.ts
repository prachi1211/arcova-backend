import { vi } from 'vitest';

/**
 * Creates a chainable query builder mock that resolves to { data, error, count }.
 * Supports arbitrary chaining: .from().select().eq().order().range().single() etc.
 */
export function createQueryMock(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const mock: Record<string, unknown> = {};
  const handler: ProxyHandler<typeof mock> = {
    get(_target, prop: string) {
      if (prop === 'then') {
        // Make the proxy thenable — resolves with { data, error, count }
        return (resolve: (v: unknown) => void) =>
          resolve({ data: result.data ?? null, error: result.error ?? null, count: result.count ?? null });
      }
      // Every other property returns a function that returns the proxy (chaining)
      return vi.fn().mockReturnValue(new Proxy({}, handler));
    },
  };
  return new Proxy(mock, handler);
}

/**
 * Creates a full supabaseAdmin mock with `.from(table)` routing and `.auth` stubs.
 * Usage:
 *   const { supabaseAdmin, mockFrom } = createSupabaseMock();
 *   mockFrom('bookings', { data: [...], count: 5 });
 */
export function createSupabaseMock() {
  const tableResults = new Map<string, { data?: unknown; error?: unknown; count?: number | null }>();

  const supabaseAdmin = {
    from: vi.fn((table: string) => {
      const result = tableResults.get(table) ?? { data: null, error: null };
      return createQueryMock(result);
    }),
    auth: {
      getUser: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      admin: {
        updateUserById: vi.fn(),
      },
    },
  };

  function mockFrom(table: string, result: { data?: unknown; error?: unknown; count?: number | null }) {
    tableResults.set(table, result);
  }

  return { supabaseAdmin, mockFrom };
}
