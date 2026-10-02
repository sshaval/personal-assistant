import 'server-only'
import { getSupabase } from './supabase'
import { ALL_TAB_KEYS, sanitizeTabs, type TabKey } from './tabs'

export interface AdminUser {
  id: string
  email: string
  role: 'admin' | 'user'
  displayName: string | null
  /** Tabs this user can access (admins always get all). */
  allowedTabs: TabKey[]
  lastSignInAt: string | null
  createdAt: string | null
}

/** All accounts (from Supabase Auth) joined to their profile role + tab grants. */
export async function loadAdminUsers(): Promise<AdminUser[]> {
  const supabase = getSupabase()
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })

  // Include allowed_tabs when the column exists; fall back if not (pre-migration_v10).
  let profiles: Record<string, unknown>[] | null = null
  const r = await supabase.from('profiles').select('id, role, display_name, allowed_tabs')
  if (r.error) {
    const r2 = await supabase.from('profiles').select('id, role, display_name')
    profiles = (r2.data as Record<string, unknown>[] | null) ?? null
  } else {
    profiles = (r.data as Record<string, unknown>[] | null) ?? null
  }
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]))

  return (list?.users ?? [])
    .map((u): AdminUser => {
      const p = byId.get(u.id)
      const role: 'admin' | 'user' = p?.role === 'admin' ? 'admin' : 'user'
      const allowedTabs: TabKey[] =
        role === 'admin'
          ? ALL_TAB_KEYS
          : p && p.allowed_tabs != null
            ? sanitizeTabs(p.allowed_tabs)
            : ALL_TAB_KEYS
      return {
        id: u.id,
        email: u.email ?? '',
        role,
        displayName: (p?.display_name as string | null) ?? null,
        allowedTabs,
        lastSignInAt: u.last_sign_in_at ?? null,
        createdAt: u.created_at ?? null,
      }
    })
    .sort((a, b) => a.email.localeCompare(b.email))
}

export interface SystemStatus {
  dayLastRefreshed: string | null
  briefingLatestDate: string | null
  briefingCreatedAt: string | null
  suggestionStatus: string | null
  suggestionLastScanned: string | null
  openTasks: number
}

/** A read-only snapshot of whether the local Mac engine is keeping Supabase fresh. */
export async function loadSystemStatus(): Promise<SystemStatus> {
  const s = getSupabase()
  const out: SystemStatus = {
    dayLastRefreshed: null,
    briefingLatestDate: null,
    briefingCreatedAt: null,
    suggestionStatus: null,
    suggestionLastScanned: null,
    openTasks: 0,
  }

  try {
    const { data } = await s
      .from('day_refresh')
      .select('refreshed_at')
      .not('refreshed_at', 'is', null)
      .order('refreshed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    out.dayLastRefreshed = (data?.refreshed_at as string | null) ?? null
  } catch {}

  try {
    const { data } = await s
      .from('briefings')
      .select('briefing_date, created_at')
      .order('briefing_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    out.briefingLatestDate = (data?.briefing_date as string | null) ?? null
    out.briefingCreatedAt = (data?.created_at as string | null) ?? null
  } catch {}

  try {
    const { data } = await s
      .from('suggestion_state')
      .select('status, last_scanned_at')
      .eq('id', 'singleton')
      .maybeSingle()
    out.suggestionStatus = (data?.status as string | null) ?? null
    out.suggestionLastScanned = (data?.last_scanned_at as string | null) ?? null
  } catch {}

  try {
    const { count } = await s.from('tasks').select('id', { count: 'exact', head: true }).eq('done', false)
    out.openTasks = count ?? 0
  } catch {}

  return out
}
