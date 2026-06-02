#!/usr/bin/env node
// Rewrite ONE day's meetings in Supabase from a JSON payload, then stamp the
// day_refresh row as freshly refreshed. This is how Claudia "redoes the Day's
// View" from the live Outlook calendar — used both interactively and by the
// scheduled background refresh task. (The Next.js app can't reach the calendar;
// only Claude Code can, so the actual rebuild happens here.)
//
// Usage:
//   node --env-file=.env.local scripts/write-day.mjs path/to/payload.json
//   echo '<json>' | node --env-file=.env.local scripts/write-day.mjs
//
// Payload shape:
//   {
//     "date": "2026-06-03",
//     "note": "optional one-line note about this run",
//     "meetings": [
//       { "start_time": "10:30 AM", "end_time": "11:00 AM", "title": "...",
//         "category": "pipeline", "attendees": "...", "summary": "...", "prep": "..." }
//     ]
//   }
// Use "meetings": [] for a day that genuinely has no meetings (clears the day).

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function die(msg) {
  console.error(`write-day: ${msg}`)
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

const meetingsIn = Array.isArray(payload.meetings) ? payload.meetings : null
if (!meetingsIn) die('"meetings" must be an array (use [] for a day with no meetings)')

const now = new Date().toISOString()
const rows = meetingsIn.map((m, i) => {
  const title = String(m?.title ?? '').trim()
  if (!title) die(`meeting #${i + 1} is missing a title`)
  return {
    meeting_date: date,
    sort_order: i,
    title,
    start_time: m.start_time ?? null,
    end_time: m.end_time ?? null,
    category: m.category ?? null,
    attendees: m.attendees ?? null,
    summary: m.summary ?? null,
    prep: m.prep ?? null,
    updated_at: now,
  }
})

const supabase = createClient(url, key, { auth: { persistSession: false } })

// Replace the day's meetings wholesale (delete + insert) so removed/moved
// events disappear instead of lingering.
const del = await supabase.from('meetings').delete().eq('meeting_date', date)
if (del.error) die(`deleting old meetings failed: ${del.error.message}`)

if (rows.length) {
  const ins = await supabase.from('meetings').insert(rows)
  if (ins.error) die(`inserting meetings failed: ${ins.error.message}`)
}

// Stamp refreshed_at = now. We deliberately do NOT clear requested_at: the UI
// treats a day as "pending" only when requested_at > refreshed_at, so stamping
// a newer refreshed_at marks it fulfilled while avoiding a race with a click
// that lands mid-run (that newer request will still read as pending next time).
const stamp = await supabase
  .from('day_refresh')
  .upsert(
    { meeting_date: date, refreshed_at: now, note: payload.note ?? null, updated_at: now },
    { onConflict: 'meeting_date' },
  )
if (stamp.error) die(`stamping day_refresh failed: ${stamp.error.message}`)

console.log(`write-day: ${date} <- ${rows.length} meeting(s); refreshed_at=${now}`)
