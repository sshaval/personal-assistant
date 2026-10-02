// Canonical list of the user-facing app tabs that can be granted per user.
// The Admin tab is NOT here — it's gated by role. Calls/CIM are hidden globally.
// Pure data + helpers, safe to import from client components.

export type TabKey = 'summary' | 'day' | 'tasks'

export interface AppTab {
  key: TabKey
  label: string
  href: string
}

export const APP_TABS: AppTab[] = [
  { key: 'summary', label: 'Summary', href: '/' },
  { key: 'day', label: "Day's View", href: '/day' },
  { key: 'tasks', label: 'Tasks', href: '/tasks' },
]

export const ALL_TAB_KEYS: TabKey[] = APP_TABS.map((t) => t.key)

/** Keep only valid tab keys, in canonical order (drops junk / unknown values). */
export function sanitizeTabs(list: unknown): TabKey[] {
  if (!Array.isArray(list)) return []
  return ALL_TAB_KEYS.filter((k) => list.includes(k))
}

/** Which tab a pathname belongs to (for route guards). '/day?d=x' → 'day'. */
export function tabForPath(pathname: string): TabKey | null {
  if (pathname === '/') return 'summary'
  if (pathname === '/day' || pathname.startsWith('/day/')) return 'day'
  if (pathname === '/tasks' || pathname.startsWith('/tasks/')) return 'tasks'
  return null
}

/** Where to send a user who lacks the requested tab: their first allowed tab. */
export function firstAllowedHref(allowed: TabKey[]): string | null {
  const t = APP_TABS.find((tab) => allowed.includes(tab.key))
  return t ? t.href : null
}
