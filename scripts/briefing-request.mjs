#!/usr/bin/env node
// Print whether there's a PENDING manual "regenerate briefing" request — i.e. the
// "Regenerate" button on the Summary page was clicked but Claudia hasn't rebuilt
// the briefing since. State lives in the shared `briefing_state` singleton row
// (migration_v8), NOT in local files: the button sets requested_at;
// write-briefing.mjs sets last_run_at on every successful publish. A request is
// pending when requested_at is newer than last_run_at. (DB, not files, so this
// works the same whether the app runs locally or hosted.)
//
// Output: one line of JSON, e.g.
//   {"pending":true,"requested_at":"2026-06-04T15:00:00.000Z","last_run_at":null}
// Always exits 0 (a missing row / unreachable DB just means "no pending request")
// so the watcher scheduled task can always run.
//
// Usage: node --env-file=.env.local scripts/briefing-request.mjs

import { createClient } from '@supabase/supabase-js'

function out(pending, requestedAt, lastRunAt) {
  console.log(
    JSON.stringify({ pending, requested_at: requestedAt, last_run_at: lastRunAt }),
  )
  process.exit(0)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
// No env (not run with --env-file) or DB unreachable → treat as "nothing pending"
// so the watcher stops quietly rather than erroring.
if (!url || !key) out(false, null, null)

try {
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data } = await supabase
    .from('briefing_state')
    .select('requested_at, last_run_at')
    .eq('id', 'singleton')
    .maybeSingle()

  const requestedAt = data?.requested_at ?? null
  const lastRunAt = data?.last_run_at ?? null
  const pending =
    !!requestedAt && (!lastRunAt || new Date(requestedAt) > new Date(lastRunAt))

  out(pending, requestedAt, lastRunAt)
} catch {
  out(false, null, null)
}
