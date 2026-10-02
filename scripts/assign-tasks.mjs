#!/usr/bin/env node
// Insert the tasks Claudia decided to create from Shayan's recent email / Teams /
// Granola, then advance the autopilot watermark. This is how the 6pm
// `evening-task-assignment` scheduled task writes its results: the Next.js app
// can't read Granola/Outlook/Teams, so Claude Code synthesizes the action items
// and hands them here. The ONLY write is to Supabase (+ the local watermark file).
//
// Usage:
//   node --env-file=.env.local scripts/assign-tasks.mjs path/to/payload.json
//   echo '<json>' | node --env-file=.env.local scripts/assign-tasks.mjs
//
// Payload shape:
//   {
//     "checked_through": "2026-06-03T22:00:00.000Z",   // advance the watermark to here (required)
//     "run_note": "scanned 18 emails / 4 Teams threads / 2 calls",  // optional one-liner
//     "tasks": [
//       {
//         "title": "Reply to Volie NDA redlines",        // required
//         "notes": "Why: counsel sent redlines 2pm...",  // Claudia's reasoning / context
//         "priority": "high",                            // low|medium|high (default medium)
//         "category": "pipeline",                        // portfolio|pipeline|general|recurring (default general)
//         "company": "Volie",                            // optional (needs migration_v3; omitted automatically if absent)
//         "due_date": "2026-06-05",                      // optional YYYY-MM-DD
//         "source": "email"                              // email|teams|call|calendar|briefing|manual (default email)
//       }
//     ]
//   }
// Use "tasks": [] to simply advance the watermark on a quiet day (nothing actionable).

import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function die(msg) {
  console.error(`assign-tasks: ${msg}`)
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  die('missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local)')
}

const stateFile = new URL('../.autopilot-state.json', import.meta.url)

// ---- Read + parse payload --------------------------------------------------
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

const checkedThrough = String(payload.checked_through ?? '').trim()
if (Number.isNaN(Date.parse(checkedThrough))) {
  die(`bad or missing "checked_through" (need an ISO timestamp): ${checkedThrough || '(none)'}`)
}
const runNote = payload.run_note != null ? String(payload.run_note) : null
const tasksIn = Array.isArray(payload.tasks) ? payload.tasks : null
if (!tasksIn) die('"tasks" must be an array (use [] to just advance the watermark)')

// ---- Normalization helpers -------------------------------------------------
const PRIORITIES = new Set(['low', 'medium', 'high'])
const CATEGORIES = new Set(['portfolio', 'pipeline', 'general', 'recurring'])
const SOURCES = new Set(['manual', 'briefing', 'email', 'call', 'teams', 'calendar'])
const RECURRENCES = new Set(['none', 'daily', 'weekly', 'monthly'])

const normTitle = (t) => String(t ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

function clean(task, i) {
  const title = String(task?.title ?? '').trim()
  if (!title) die(`task #${i + 1} is missing a title`)

  // "granola" is a friendly alias for the meeting-notes source -> 'call'.
  let source = String(task?.source ?? 'email').trim().toLowerCase()
  if (source === 'granola' || source === 'meeting') source = 'call'
  if (!SOURCES.has(source)) source = 'email'

  const priority = PRIORITIES.has(task?.priority) ? task.priority : 'medium'
  const category = CATEGORIES.has(task?.category) ? task.category : 'general'
  const recurrence = RECURRENCES.has(task?.recurrence) ? task.recurrence : 'none'

  let due_date = null
  if (task?.due_date != null && String(task.due_date).trim()) {
    const d = String(task.due_date).trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) due_date = d
  }

  let recurrence_day = null
  if (task?.recurrence_day != null && task.recurrence_day !== '') {
    const n = Number(task.recurrence_day)
    if (Number.isInteger(n) && n >= 0 && n <= 31) recurrence_day = n
  }

  const company =
    task?.company != null && String(task.company).trim() ? String(task.company).trim() : null
  const notes = task?.notes != null && String(task.notes).trim() ? String(task.notes).trim() : null

  return { title, notes, priority, category, source, due_date, company, recurrence, recurrence_day }
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

// ---- Probe whether migration_v3 (company / recurrence_day) is live ---------
const probe = await supabase.from('tasks').select('company, recurrence_day').limit(1)
const hasV3 = !probe.error

// ---- Load existing tasks for dedupe + sort_order placement -----------------
const existing = await supabase.from('tasks').select('title, done, category, sort_order')
if (existing.error) die(`reading existing tasks failed: ${existing.error.message}`)

const openTitles = new Set(
  (existing.data ?? []).filter((t) => !t.done).map((t) => normTitle(t.title)),
)
const maxByCat = {}
for (const t of existing.data ?? []) {
  const c = t.category ?? 'general'
  const so = typeof t.sort_order === 'number' ? t.sort_order : 0
  if (maxByCat[c] == null || so > maxByCat[c]) maxByCat[c] = so
}

// ---- Build rows, skipping duplicates ---------------------------------------
const now = new Date().toISOString()
const seenThisRun = new Set()
const rows = []
const skipped = []

tasksIn.forEach((t, i) => {
  const c = clean(t, i)
  const norm = normTitle(c.title)
  if (openTitles.has(norm) || seenThisRun.has(norm)) {
    skipped.push(c.title)
    return
  }
  seenThisRun.add(norm)

  const nextOrder = (maxByCat[c.category] ?? -1) + 1
  maxByCat[c.category] = nextOrder

  const row = {
    title: c.title,
    notes: c.notes,
    priority: c.priority,
    category: c.category,
    source: c.source,
    created_by: 'claudia',
    due_date: c.due_date,
    recurrence: c.recurrence,
    sort_order: nextOrder,
    created_at: now,
    updated_at: now,
  }
  if (hasV3) {
    row.company = c.company
    row.recurrence_day = c.recurrence_day
  }
  rows.push(row)
})

// ---- Insert ----------------------------------------------------------------
let inserted = 0
if (rows.length) {
  const ins = await supabase.from('tasks').insert(rows)
  if (ins.error) die(`inserting tasks failed: ${ins.error.message}`)
  inserted = rows.length
}

// ---- Advance the watermark (always, even on a quiet day) -------------------
const newState = {
  last_checked_at: checkedThrough,
  last_run_at: now,
  last_run_note: runNote,
  created_count: inserted,
  updated_at: now,
}
try {
  writeFileSync(stateFile, JSON.stringify(newState, null, 2) + '\n', 'utf8')
} catch (e) {
  die(`tasks inserted but failed to write watermark ${stateFile.pathname}: ${e.message}`)
}

const notes = []
if (!hasV3) notes.push('(migration_v3 not detected — Company field skipped)')
if (skipped.length) notes.push(`skipped ${skipped.length} duplicate(s): ${skipped.join('; ')}`)
console.log(
  `assign-tasks: inserted ${inserted} task(s); watermark -> ${checkedThrough}${
    notes.length ? ` | ${notes.join(' | ')}` : ''
  }`,
)
