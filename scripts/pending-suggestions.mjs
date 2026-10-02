#!/usr/bin/env node
// STEP 0 for the task-scan watcher. Prints one line of JSON:
//   {status, requested_at, last_scanned_at, window_start}
// window_start = the LATER of (now - 3 days) and last_scanned_at (the watermark),
// so a scan looks back at most 3 days — or only to the last click, if that's sooner.
// Degrades to {"status":"idle"} (exit 0) if the table doesn't exist yet.
//
// Usage: node --env-file=.env.local scripts/pending-suggestions.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('pending-suggestions: missing Supabase env (run with --env-file=.env.local)')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })
const { data, error } = await supabase
  .from('suggestion_state')
  .select('status, requested_at, last_scanned_at')
  .eq('id', 'singleton')
  .maybeSingle()

if (error) {
  // Table missing (pre-migration) or read issue — treat as nothing pending.
  console.error(`pending-suggestions: ${error.message}`)
  console.log(JSON.stringify({ status: 'idle' }))
  process.exit(0)
}

const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
const lastScanned = data?.last_scanned_at ? new Date(data.last_scanned_at) : null
const windowStart = lastScanned && lastScanned > threeDaysAgo ? lastScanned : threeDaysAgo

console.log(
  JSON.stringify({
    status: data?.status ?? 'idle',
    requested_at: data?.requested_at ?? null,
    last_scanned_at: data?.last_scanned_at ?? null,
    window_start: windowStart.toISOString(),
  }),
)
