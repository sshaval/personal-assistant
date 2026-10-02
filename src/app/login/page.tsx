'use client'

import { useActionState } from 'react'
import { signIn, type SignInState } from '../auth/actions'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, null)

  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-6">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900"
      >
        <div className="mb-5 flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/claudia.png"
            alt=""
            className="h-9 w-9 rounded-xl object-cover ring-1 ring-black/10 dark:ring-white/15"
          />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Claudia</p>
            <p className="text-[11px] text-black/45 dark:text-white/45">Sign in to continue</p>
          </div>
        </div>

        <label
          htmlFor="email"
          className="mb-1 block text-[11px] font-medium tracking-wide text-black/40 uppercase dark:text-white/40"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          className="mb-3 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/15 dark:bg-black/30"
        />

        <label
          htmlFor="password"
          className="mb-1 block text-[11px] font-medium tracking-wide text-black/40 uppercase dark:text-white/40"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mb-4 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/15 dark:bg-black/30"
        />

        {state?.error && (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
