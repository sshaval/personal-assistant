#!/usr/bin/env node
// Write a batch of task SUGGESTIONS for Shayan to review, and flip the suggestion
// state to "ready". Used by the task-scan watcher after it reads recent
// email / Teams / Granola. These are NOT live tasks — Shayan approves them in the
// app, which is what actually creates tasks.
//
// Usage:
//   node --env-file=.env.local scripts/write-suggestions.mjs path/to/payload.json
//   echo '<json>' | node --env-file=.env.local scripts/write-suggestions.mjs
//
// Payload:
//   { "note": "scan: 12 emails, 3 Teams, 1 call",
//     "suggestions": [
//       { "title": "...", "notes": "why I suggested this", "priority": "high",
//         "category": "pipeline", "company": "Volie", "due_date": "2026-09-26",
//         "source": "email" }
//     ] }
// Use "suggestions": [] for a scan that found nothing (still marks ready, count 0).

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function die(m) {
  console.error(`write-suggestions: ${m}`)
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

const suggestionsIn = Array.isArray(payload.suggestions) ? payload.suggestions : null
if (!suggestionsIn) die('"suggestions" must be an array (use [] for none)')

const PRI = new Set(['low', 'medium', 'high'])
const CAT = new Set(['portfolio', 'pipeline', 'general', 'recurring'])
const rows = suggestionsIn.map((s, i) => {
  const title = String(s?.title ?? '').trim()
  if (!title) die(`suggestion #${i + 1} is missing a title`)
  let priority = String(s?.priority ?? 'medium')
  if (!PRI.has(priority)) priority = 'medium'
  let category = String(s?.category ?? 'general')
  if (!CAT.has(category)) category = 'general'
  return {
    title,
    notes: s.notes ?? null,
    priority,
    category,
    company: s.company ?? null,
    due_date: s.due_date ?? null,
    source: s.source ?? null,
    sort_order: i,
  }
})

const supabase = createClient(url, key, { auth: { persistSession: false } })
const now = new Date().toISOString()

// Replace the current batch wholesale.
const del = await supabase.from('task_suggestions').delete().not('id', 'is', null)
if (del.error) die(`clearing old suggestions failed: ${del.error.message}`)
if (rows.length) {
  const ins = await supabase.from('task_suggestions').insert(rows)
  if (ins.error) die(`inserting suggestions failed: ${ins.error.message}`)
}

// Flip to "ready" and advance the watermark (last_scanned_at = now), which is also
// what pending-suggestions.mjs uses as the next window floor.
const stamp = await supabase.from('suggestion_state').upsert(
  {
    id: 'singleton',
    status: 'ready',
    ready_at: now,
    last_scanned_at: now,
    count: rows.length,
    note: payload.note ?? null,
    updated_at: now,
  },
  { onConflict: 'id' },
)
if (stamp.error) die(`stamping suggestion_state failed: ${stamp.error.message}`)

console.log(`write-suggestions: ${rows.length} suggestion(s); status=ready; last_scanned_at=${now}`)
