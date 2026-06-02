'use client'

import { useState, useTransition } from 'react'
import { requestDayRefresh } from '../actions'

// "Redo the Day's View." Clicking records a request in Supabase; Claudia's
// background task re-pulls the calendar and rewrites the day's meetings. The app
// itself can't read the calendar, so this is a request, not an instant fetch —
// the status line reflects that.
export function RefreshButton({
  date,
  updatedLabel,
  pending,
}: {
  date: string
  updatedLabel: string | null
  pending: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [requested, setRequested] = useState(pending)
  const [error, setError] = useState<string | null>(null)

  function onClick() {
    setError(null)
    startTransition(async () => {
      const res = await requestDayRefresh(date)
      if (res.ok) setRequested(true)
      else setError(res.error)
    })
  }

  const status = error
    ? { text: error, cls: 'text-red-600 dark:text-red-400' }
    : requested
      ? {
          text: 'Refresh requested — Claudia will update this shortly',
          cls: 'text-amber-600 dark:text-amber-400',
        }
      : updatedLabel
        ? { text: `Updated ${updatedLabel}`, cls: 'text-black/40 dark:text-white/40' }
        : { text: 'Not refreshed yet', cls: 'text-black/40 dark:text-white/40' }

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        title="Ask Claudia to re-pull the calendar for this day"
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
        {isPending ? 'Requesting…' : 'Refresh'}
      </button>
      <span className={`text-xs ${status.cls}`}>{status.text}</span>
    </div>
  )
}
