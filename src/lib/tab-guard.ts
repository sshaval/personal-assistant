import 'server-only'
import { redirect } from 'next/navigation'
import { getSessionUser } from './auth'
import { firstAllowedHref, type TabKey } from './tabs'

/**
 * Server-side guard for a tab-gated page. Call it at the TOP of the page (before
 * loading any data) so a user without access never receives that tab's data.
 * Redirects them to their first allowed tab, or /no-access if they have none.
 * No-ops when auth isn't configured (the middleware handles signed-out visitors).
 */
export async function guardTab(tab: TabKey): Promise<void> {
  const me = await getSessionUser()
  if (!me) return
  if (me.allowedTabs.includes(tab)) return
  redirect(firstAllowedHref(me.allowedTabs) ?? '/no-access')
}
