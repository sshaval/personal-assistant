import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Server-only Supabase client. It uses the service-role key, which bypasses
// Row Level Security, so this module must NEVER be imported from a Client
// Component — the `server-only` import above turns any such import into a BUILD
// error, so the key can never be shipped to the browser. Created lazily so
// `next build` doesn't crash when env is absent.
let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and ' +
        'SUPABASE_SERVICE_ROLE_KEY to .env.local (see .env.local for the blanks).',
    )
  }

  client = createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
  return client
}
