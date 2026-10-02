'use client'

import { createBrowserClient } from '@supabase/ssr'

/** Browser-side Supabase client for AUTH actions (sign in/out) — anon key only. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}
