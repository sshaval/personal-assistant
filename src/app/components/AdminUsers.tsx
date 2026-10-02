'use client'

import { useState, useTransition } from 'react'
import type { AdminUser } from '@/lib/admin-data'
import { friendlyDateTime } from '@/lib/util'
import { setUserRole, addUser, removeUser } from '../admin/actions'
import { Avatar } from './Avatar'

const input =
  'rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-white/15 dark:bg-black/30'

export function AdminUsers({ users, meId }: { users: AdminUser[]; meId: string }) {
  const [isPending, start] = useTransition()
  const [notice, setNotice] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newCred, setNewCred] = useState<{ email: string; password: string } | null>(null)

  function toggleRole(u: AdminUser) {
    setNotice(null)
    start(async () => {
      const r = await setUserRole(u.id, u.role === 'admin' ? 'user' : 'admin')
      if (!r.ok) setNotice(r.error)
    })
  }

  function remove(u: AdminUser) {
    setNotice(null)
    if (!confirm(`Remove ${u.email}? They lose access immediately.`)) return
    start(async () => {
      const r = await removeUser(u.id)
      if (!r.ok) setNotice(r.error)
    })
  }

  function submitAdd(formData: FormData) {
    setNotice(null)
    start(async () => {
      const r = await addUser(formData)
      if (r.ok) {
        setNewCred({ email: r.email, password: r.password })
        setShowAdd(false)
      } else setNotice(r.error)
    })
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Users ({users.length})</h2>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-lg border border-black/10 px-3 py-1 text-xs font-medium text-black/70 hover:bg-black/[.04] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/[.06]"
        >
          + Add user
        </button>
      </div>

      {notice && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{notice}</p>}

      {newCred && (
        <div className="mb-3 rounded-xl border border-emerald-400/50 bg-emerald-50 p-3 text-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="font-medium">Created {newCred.email}</p>
          <p className="mt-1">
            Temporary password:{' '}
            <code className="rounded bg-black/10 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">
              {newCred.password}
            </code>{' '}
            — share it securely; they should change it after signing in.
          </p>
          <button
            type="button"
            onClick={() => setNewCred(null)}
            className="mt-1 text-xs text-black/50 hover:underline dark:text-white/50"
          >
            dismiss
          </button>
        </div>
      )}

      {showAdd && (
        <form
          action={submitAdd}
          className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-black/10 p-3 dark:border-white/10"
        >
          <input name="email" type="email" required placeholder="email" className={input} />
          <input name="display_name" placeholder="name (optional)" className={input} />
          <select name="role" defaultValue="user" className={input}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            Create
          </button>
        </form>
      )}

      <ul className="space-y-2">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 p-3 dark:border-white/10"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar email={u.email} name={u.displayName} size={38} />
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {u.displayName || u.email}{' '}
                  {u.id === meId && <span className="text-[11px] text-black/40 dark:text-white/40">(you)</span>}
                </p>
                <p className="text-[11px] text-black/45 dark:text-white/45">
                  {u.email} · last sign-in{' '}
                  {u.lastSignInAt ? friendlyDateTime(u.lastSignInAt) : 'never'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  u.role === 'admin'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                    : 'bg-black/[.05] text-black/55 dark:bg-white/10 dark:text-white/60'
                }`}
              >
                {u.role}
              </span>
              <button
                type="button"
                onClick={() => toggleRole(u)}
                disabled={isPending || u.id === meId}
                className="rounded-md border border-black/10 px-2 py-1 text-xs font-medium text-black/70 hover:bg-black/[.04] disabled:opacity-40 dark:border-white/10 dark:text-white/70"
              >
                {u.role === 'admin' ? 'Revoke admin' : 'Make admin'}
              </button>
              <button
                type="button"
                onClick={() => remove(u)}
                disabled={isPending || u.id === meId}
                className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
