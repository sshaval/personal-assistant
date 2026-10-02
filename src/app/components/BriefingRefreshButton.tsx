'use client'

import { useState, useTransition } from 'react'
import { requestBriefingRefresh } from '../actions'

// "Regenerate" the Daily Briefing. Clicking records a request in the shared
// `briefing_state` DB row; Claudia's content-refresh watcher (running every
// ~10 min) notices it, re-pulls today's calendar / Granola / email / Teams,
// rebuilds the briefing, and republishes it (which clears the request). The app
// itself can't read those sources, so this is a request, not an instant rebuild
// — the status line reflects that, and also shows when the briefing was last
// generated.
export function BriefingRefreshButton({
  lastRunLabel,
  requestPending,
}: {
  lastRunLabel: string | null
  requestPending: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [requested, setRequested] = useState(requestPending)
  const [error, setError] = useState<string | null>(null)

  function onClick() {
    setError(null)
    startTransition(async () => {
      const res = await requestBriefingRefresh()
      if (res.ok) setRequested(true)
      else setError(res.error)
    })
  }

  const status = error
    ? { text: error, cls: 'text-red-600 dark:text-red-400' }
    : requested
      ? {
          text: 'Regeneration requested — Claudia will rebuild this within ~10 min',
          cls: 'text-amber-600 dark:text-amber-400',
        }
      : lastRunLabel
        ? { text: `Last generated ${lastRunLabel}`, cls: 'text-black/40 dark:text-white/40' }
        : { text: 'Not generated yet', cls: 'text-black/40 dark:text-white/40' }

  return (
    <div className="flex items-center gap-2.5">
      <span className={`text-xs ${status.cls}`}>{status.text}</span>
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        title="Ask Claudia to re-pull today's calendar, calls & email and rebuild the briefing"
        className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-black/70 transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/10 dark:bg-white/[.03] dark:text-white/70 dark:hover:bg-white/[.06]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`}
        >
          <path
            d="M3 12a9 9 0 0 1 15.5-6.3L21 8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M21 3v5h-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path
            d="M21 12a9 9 0 0 1-15.5 6.3L3 16"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M3 21v-5h5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {isPending ? 'Requesting…' : 'Regenerate'}
      </button>
    </div>
  )
}
