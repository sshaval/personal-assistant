import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Cookie-backed Supabase client for AUTH (uses the public anon key + the user's
 * session cookie). This is separate from the service-role data client in
 * `src/lib/supabase.ts` — this one represents the logged-in user, the other
 * bypasses RLS to read/write app data. Call from Server Components / actions.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Called from a Server Component where cookies are read-only —
          // the middleware refreshes the session cookie instead.
        }
      },
    },
  })
}
