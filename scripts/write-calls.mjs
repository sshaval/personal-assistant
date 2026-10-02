#!/usr/bin/env node
// Rewrite ONE day's call report in Supabase from a JSON payload, then stamp the
// call_reports row as freshly generated. This is how Claudia builds the Calls tab
// from the live Granola folders — used both interactively and by the scheduled
// call-report watcher. (The Next.js app can't reach Granola; only Claude Code can,
// so the actual summarizing + tiering happens in Claude Code and lands here.)
//
// Usage:
//   node --env-file=.env.local scripts/write-calls.mjs path/to/payload.json
//   echo '<json>' | node --env-file=.env.local scripts/write-calls.mjs
//
// Payload shape:
//   {
//     "date": "2026-06-04",
//     "note": "optional one-line note about this run",
//     "calls": [
//       { "granola_id": "uuid", "folder": "direct", "title": "RCC-Acme",
//         "company": "Acme", "lead": "adriana", "attendees": "Adriana, Jane Doe",
//         "summary": "Intro call. $4M ARR, growing 20%, founder open to selling.",
//         "tier": "hot", "tier_rationale": ">$3M rev, growing, ready to sell",
//         "start_time": "10:30 AM" }
//     ]
//   }
// folder    : internal | live_opps | direct | brokered | divestitures
// tier      : hot | warm | cold | null   (null/omit for internal & live_opps)
// lead      : shayan | adriana | sarina | team | other | null
// Use "calls": [] for a day that genuinely has no calls (clears the day).

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function die(msg) {
  console.error(`write-calls: ${msg}`)
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  die('missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local)')
}

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

const callsIn = Array.isArray(payload.calls) ? payload.calls : null
if (!callsIn) die('"calls" must be an array (use [] for a day with no calls)')

const FOLDERS = new Set(['internal', 'live_opps', 'direct', 'brokered', 'divestitures'])
const TIERS = new Set(['hot', 'warm', 'cold'])
const LEADS = new Set(['shayan', 'adriana', 'sarina', 'will', 'team', 'other'])

const now = new Date().toISOString()
const rows = callsIn.map((c, i) => {
  const title = String(c?.title ?? '').trim()
  if (!title) die(`call #${i + 1} is missing a title`)
  const folder = String(c?.folder ?? '').trim()
  if (!FOLDERS.has(folder)) {
    die(`call #${i + 1} has bad folder "${folder}" (need one of ${[...FOLDERS].join(', ')})`)
  }
  const tier = c.tier == null || c.tier === '' ? null : String(c.tier).trim()
  if (tier && !TIERS.has(tier)) die(`call #${i + 1} has bad tier "${tier}" (need hot|warm|cold)`)
  const lead = c.lead == null || c.lead === '' ? null : String(c.lead).trim()
  if (lead && !LEADS.has(lead)) die(`call #${i + 1} has bad lead "${lead}"`)
  return {
    call_date: date,
    sort_order: i,
    granola_id: c.granola_id ?? null,
    folder,
    title,
    company: c.company ?? null,
    lead,
    attendees: c.attendees ?? null,
    summary: c.summary ?? null,
    tier,
    tier_rationale: c.tier_rationale ?? null,
    start_time: c.start_time ?? null,
    updated_at: now,
  }
})

const supabase = createClient(url, key, { auth: { persistSession: false } })

// Replace the day's calls wholesale (delete + insert) so a re-generate reflects
// the current Granola state instead of piling up duplicates.
const del = await supabase.from('calls').delete().eq('call_date', date)
if (del.error) die(`deleting old calls failed: ${del.error.message}`)

if (rows.length) {
  const ins = await supabase.from('calls').insert(rows)
  if (ins.error) die(`inserting calls failed: ${ins.error.message}`)
}

// Stamp generated_at = now + call_count. Like write-day, we set generated_at to
// "now" rather than clearing requested_at: the UI treats a date as pending only
// when requested_at > generated_at, which avoids a race with a click that lands
// mid-run (that newer request still reads as pending next time).
const stamp = await supabase
  .from('call_reports')
  .upsert(
    {
      report_date: date,
      generated_at: now,
      call_count: rows.length,
      note: payload.note ?? null,
      updated_at: now,
    },
    { onConflict: 'report_date' },
  )
if (stamp.error) die(`stamping call_reports failed: ${stamp.error.message}`)

console.log(`write-calls: ${date} <- ${rows.length} call(s); generated_at=${now}`)
