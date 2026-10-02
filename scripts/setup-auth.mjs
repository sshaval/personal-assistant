#!/usr/bin/env node
// One-time: create the app's login accounts (pre-confirmed so they work without
// an email round-trip) + their profile rows/roles. Idempotent — re-running skips
// users that already exist and just re-asserts their role. Temp passwords are
// written to a LOCAL gitignored file (.auth-credentials.txt), never printed in a
// way that lands in a transcript.
//
// Run AFTER migration_v7.sql, from the project dir:
//   node --env-file=.env.local scripts/setup-auth.mjs

import { writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('setup-auth: missing Supabase env (run with --env-file=.env.local)')
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { persistSession: false } })

const USERS = [
  { email: 's.shabanpour@valsoftcorp.com', display_name: 'Shayan Shabanpour', role: 'admin' },
  { email: 'atlasthecos7@gmail.com', display_name: 'Atlas', role: 'user' },
]

const tempPassword = () => 'Claudia-' + randomBytes(9).toString('base64url')

const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
if (listErr) {
  console.error(`setup-auth: could not list users: ${listErr.message}`)
  process.exit(1)
}

const created = []
for (const u of USERS) {
  const existing = (list?.users ?? []).find(
    (x) => (x.email ?? '').toLowerCase() === u.email.toLowerCase(),
  )
  let userId
  if (existing) {
    userId = existing.id
    console.log(`exists:  ${u.email}`)
  } else {
    const password = tempPassword()
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password,
      email_confirm: true,
    })
    if (error) {
      console.error(`create ${u.email} FAILED: ${error.message}`)
      continue
    }
    userId = data.user.id
    created.push({ email: u.email, password })
    console.log(`created: ${u.email}  (temp password written to .auth-credentials.txt)`)
  }

  const { error: pe } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email: u.email,
      display_name: u.display_name,
      role: u.role,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  console.log(pe ? `profile ${u.email} FAILED: ${pe.message}` : `profile: ${u.email} -> ${u.role}`)
}

if (created.length) {
  const body =
    'Claudia — temporary login passwords (change these after first sign-in)\n' +
    '================================================================\n' +
    created.map((c) => `${c.email}\n  ${c.password}`).join('\n\n') +
    '\n'
  writeFileSync('.auth-credentials.txt', body, 'utf8')
  console.log('\n→ Temp passwords saved to .auth-credentials.txt (gitignored). Open it, then change them.')
} else {
  console.log('\n(no new users created; no temp passwords to write)')
}
