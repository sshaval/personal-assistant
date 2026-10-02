import 'server-only'
import { createSupabaseServerClient } from './supabase/server'
import { getSupabase } from './supabase'
import { ALL_TAB_KEYS, sanitizeTabs, type TabKey } from './tabs'

export type Role = 'admin' | 'user'

export interface SessionUser {
  id: string
  email: string | null
  role: Role
  displayName: string | null
  /** App tabs this user may see/open. Admins always get all of them. */
  allowedTabs: TabKey[]
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

  // Admins always see every tab. For everyone else, read their grant (separate
  // query so a missing allowed_tabs column pre-migration_v10 can't affect role).
  let allowedTabs: TabKey[] = ALL_TAB_KEYS
  if (role !== 'admin') {
    try {
      const { data, error } = await getSupabase()
        .from('profiles')
        .select('allowed_tabs')
        .eq('id', user.id)
        .maybeSingle()
      if (!error && data && data.allowed_tabs != null) {
        allowedTabs = sanitizeTabs(data.allowed_tabs)
      }
    } catch {
      // allowed_tabs column not there yet — default to all tabs.
    }
  }

  return { id: user.id, email: user.email ?? null, role, displayName, allowedTabs }
}

/** Convenience for route guards: the user if they're an admin, else null. */
export async function getAdminUser(): Promise<SessionUser | null> {
  const u = await getSessionUser()
  return u && u.role === 'admin' ? u : null
}
