#!/usr/bin/env node
// Print the dates that have a PENDING manual refresh request — i.e. the Refresh
// button on the Day's View was clicked but Claudia hasn't rebuilt that day since.
// Output: a JSON array of "YYYY-MM-DD" strings on stdout (e.g. ["2026-06-03"]).
// Degrades to [] (exit 0) if the day_refresh table doesn't exist yet, so the
// scheduled task can always run.
//
// Usage: node --env-file=.env.local scripts/pending-days.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('pending-days: missing Supabase env (run with --env-file=.env.local)')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const { data, error } = await supabase
  .from('day_refresh')
  .select('meeting_date, requested_at, refreshed_at')
  .not('requested_at', 'is', null)

if (error) {
  // Table missing (pre-migration) or some other read issue — treat as "nothing
  // pending" so the caller still refreshes today/tomorrow normally.
  console.error(`pending-days: ${error.message}`)
  console.log('[]')
  process.exit(0)
}

const pending = (data ?? [])
  .filter((r) => !r.refreshed_at || new Date(r.requested_at) > new Date(r.refreshed_at))
  .map((r) => r.meeting_date)
  .sort()

console.log(JSON.stringify(pending))
