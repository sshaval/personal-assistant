#!/usr/bin/env node
// Upsert ONE day's "Daily Briefing" (markdown) into Supabase. This is how
// Claudia publishes the morning briefing that the Summary page (/) displays.
// The Next.js app can't reach Granola/Outlook/Teams — only Claude Code can —
// so the briefing is synthesized in Claude Code and written here. Used both
// interactively and by the morning `morning-briefing` scheduled task.
//
// Usage:
//   node --env-file=.env.local scripts/write-briefing.mjs path/to/payload.json
//   echo '<json>' | node --env-file=.env.local scripts/write-briefing.mjs
//
// Payload shape:
//   { "date": "2026-06-03", "content": "# 🗞️ Daily Briefing — ...markdown..." }
//
// One row per day (briefings.briefing_date is unique) — re-running replaces
// that day's briefing.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function die(msg) {
  console.error(`write-briefing: ${msg}`)
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  die('missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local)')
}

// Payload from a file arg, or stdin if no arg.
const arg = process.argv[2]
let raw
try {
  raw = readFileSync(arg ?? 0, 'utf8')
} catch (e) {
  die(`could not read payload${arg ? ` from ${arg}` : ' from stdin'}: ${e.message}`)
}
if (!raw.trim()) die('empty payload')

let payload
try {
  payload = JSON.parse(raw)
} catch (e) {
  die(`payload is not valid JSON: ${e.message}`)
}

const date = String(payload.date ?? '').trim()
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  die(`bad or missing "date" (need YYYY-MM-DD): ${date || '(none)'}`)
}

const content = String(payload.content ?? '')
if (!content.trim()) die('"content" is empty — refusing to publish a blank briefing')

const supabase = createClient(url, key, { auth: { persistSession: false } })

// Upsert on the unique briefing_date so re-running replaces that day's briefing
// instead of erroring or duplicating.
const { error } = await supabase
  .from('briefings')
  .upsert({ briefing_date: date, content }, { onConflict: 'briefing_date' })
if (error) die(`upserting briefing failed: ${error.message}`)

// Stamp the shared `briefing_state` row (migration_v8) so the Summary page can
// show "last generated" and the content-refresh watcher knows a pending
// "Regenerate" request has been fulfilled (pending = requested_at > last_run_at).
// A DB row, not a local file, so the hosted app and the Mac engine share one
// source of truth. Non-fatal if it fails — the briefing IS published either way.
const stampedAt = new Date().toISOString()
{
  const { error: stampErr } = await supabase
    .from('briefing_state')
    .upsert(
      { id: 'singleton', last_run_at: stampedAt, briefing_date: date, updated_at: stampedAt },
      { onConflict: 'id' },
    )
  if (stampErr) {
    console.error(`write-briefing: published but failed to stamp briefing_state: ${stampErr.message}`)
  }
}

console.log(`write-briefing: ${date} <- ${content.length} chars`)
