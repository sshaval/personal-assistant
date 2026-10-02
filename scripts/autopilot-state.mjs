#!/usr/bin/env node
// Print Claudia's "task autopilot" watermark so the 6pm scheduled run knows how
// far back to look. The watermark records the moment Claudia last scanned
// Shayan's email / Teams / Granola for action items. It lives in a small LOCAL
// file (no DB migration needed) because only the local scripts + the local
// scheduled task ever touch it — the web app doesn't need it.
//
// Usage:
//   node scripts/autopilot-state.mjs
//
// Prints one line of JSON, e.g.:
//   {"last_checked_at":"2026-06-02T22:00:00.000Z","last_run_at":"...","last_run_note":"...","created_count":3,"now":"2026-06-03T22:00:00.000Z"}
//
// On the very first run the file won't exist yet, so last_checked_at is null —
// the caller should then default its look-back window to roughly the last 24h.

import { readFileSync } from 'node:fs'

// Resolve the watermark next to the project root, independent of cwd.
const stateFile = new URL('../.autopilot-state.json', import.meta.url)

let state = {
  last_checked_at: null,
  last_run_at: null,
  last_run_note: null,
  created_count: 0,
}

try {
  const raw = readFileSync(stateFile, 'utf8')
  const parsed = JSON.parse(raw)
  state = { ...state, ...parsed }
} catch {
  // No file yet (first run) or unreadable — fall back to the null defaults.
}

process.stdout.write(JSON.stringify({ ...state, now: new Date().toISOString() }))
