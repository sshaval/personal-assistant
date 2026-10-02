import 'server-only'
import { getSupabase } from '@/lib/supabase'

// Daily-Briefing refresh state, read from the shared `briefing_state` singleton
// row (migration_v8). The Summary page (a server component) uses this to show
// when the briefing was last generated and whether a "Regenerate" click is still
// pending. This replaced the old local-file pattern (.briefing-state.json /
// .briefing-request.json) so the hosted app and the Mac engine share one source
// of truth. Server-only: it uses the service-role client.

export type BriefingState = {
  /** ISO timestamp the briefing was last generated (stamped by write-briefing.mjs), or null. */
  lastRunAt: string | null
  /** ISO timestamp of a pending manual "Regenerate" request, if any. */
  requestedAt: string | null
  /** True when a manual request is newer than the last generation. */
  requestPending: boolean
}

export async function getBriefingState(): Promise<BriefingState> {
  try {
    const { data } = await getSupabase()
      .from('briefing_state')
      .select('requested_at, last_run_at')
      .eq('id', 'singleton')
      .maybeSingle()

    const lastRunAt = (data?.last_run_at as string | null) ?? null
    const requestedAt = (data?.requested_at as string | null) ?? null
    const requestPending =
      !!requestedAt && (!lastRunAt || new Date(requestedAt) > new Date(lastRunAt))

    return { lastRunAt, requestedAt, requestPending }
  } catch {
    // Missing table (pre-migration) or DB unreachable — degrade so the page
    // still renders; the button just shows "Not generated yet".
    return { lastRunAt: null, requestedAt: null, requestPending: false }
  }
}
