#!/usr/bin/env node
// Print whether there's a PENDING manual "run task scan now" request — i.e. the
// "Run scan now" button on the Tasks board was clicked but Claudia's autopilot
// hasn't run since. Both files are LOCAL (no DB): the button writes
// .autopilot-request.json ({"requested_at": "..."}); assign-tasks.mjs stamps
// .autopilot-state.json (last_run_at) on every run. A request is pending when
// it's newer than the last completed run.
//
// Output: one line of JSON, e.g.
//   {"pending":true,"requested_at":"2026-06-04T15:00:00.000Z","last_run_at":null}
// Always exits 0 (missing files just mean "no request" / "never ran") so the
// watcher scheduled task can always run.
//
// Usage: node scripts/scan-request.mjs

import { readFileSync } from 'node:fs'

function readJson(url) {
  try {
    return JSON.parse(readFileSync(url, 'utf8'))
  } catch {
    return null
  }
}

const request = readJson(new URL('../.autopilot-request.json', import.meta.url))
const state = readJson(new URL('../.autopilot-state.json', import.meta.url))

const requestedAt = request?.requested_at ?? null
const lastRunAt = state?.last_run_at ?? null

const pending =
  !!requestedAt && (!lastRunAt || new Date(requestedAt) > new Date(lastRunAt))

console.log(
  JSON.stringify({ pending, requested_at: requestedAt, last_run_at: lastRunAt }),
)
