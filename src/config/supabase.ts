import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { mockSupabaseClient } from './mock-supabase.js';

const isMockMode = env.SUPABASE_SERVICE_KEY === 'placeholder';

if (isMockMode) {
  console.log('[arcova] SUPABASE_SERVICE_KEY=placeholder — running in mock data mode. All data is in-memory.');
}

// Admin client — bypasses RLS, used for all backend operations.
// Falls back to in-memory mock when SUPABASE_SERVICE_KEY=placeholder.
export const supabaseAdmin: SupabaseClient = isMockMode
  ? (mockSupabaseClient as unknown as SupabaseClient)
  : createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

// User client factory — RLS-aware, used when we need row-level security per user
export function createUserClient(token: string): SupabaseClient {
  if (isMockMode) return mockSupabaseClient as unknown as SupabaseClient;
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
