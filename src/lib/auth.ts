import 'server-only'
import { createSupabaseServerClient } from './supabase/server'
import { getSupabase } from './supabase'

export type Role = 'admin' | 'user'

export interface SessionUser {
  id: string
  email: string | null
  role: Role
  displayName: string | null
}

/**
 * The currently signed-in user + their role, or null if not signed in.
 * Role comes from the `profiles` table (read via the service-role data client,
 * which bypasses RLS). Degrades to role 'user' if the profiles table doesn't
 * exist yet (pre-migration_v7).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  let role: Role = 'user'
  let displayName: string | null = null
  try {
    const { data } = await getSupabase()
      .from('profiles')
      .select('role, display_name')
      .eq('id', user.id)
      .maybeSingle()
    if (data?.role === 'admin') role = 'admin'
    displayName = (data?.display_name as string | null) ?? null
  } catch {
    // profiles table missing — treat as a plain user.
  }

  return { id: user.id, email: user.email ?? null, role, displayName }
}

/** Convenience for route guards: the user if they're an admin, else null. */
export async function getAdminUser(): Promise<SessionUser | null> {
  const u = await getSessionUser()
  return u && u.role === 'admin' ? u : null
}
