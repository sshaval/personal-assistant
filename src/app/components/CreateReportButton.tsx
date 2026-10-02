'use client'

import { useState, useTransition } from 'react'
import { requestCallReport } from '../actions'

// "Build this day's call report." Clicking records a request in Supabase
// (call_reports.requested_at); Claudia's background watcher pulls that day's
// Granola calls, summarizes + tiers them, and writes the rows. The app itself
// can't read Granola, so this is a request, not an instant fetch.
export function CreateReportButton({
  date,
  hasReport,
  generatedLabel,
  pending,
}: {
  date: string
  hasReport: boolean
  generatedLabel: string | null
  pending: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [requested, setRequested] = useState(pending)
  const [error, setError] = useState<string | null>(null)

  function onClick() {
    setError(null)
    startTransition(async () => {
      const res = await requestCallReport(date)
      if (res.ok) setRequested(true)
      else setError(res.error)
    })
  }

  const status = error
    ? { text: error, cls: 'text-red-600 dark:text-red-400' }
    : requested
      ? {
          text: 'Report requested — Claudia will build this within ~10 min',
          cls: 'text-amber-600 dark:text-amber-400',
        }
      : generatedLabel
        ? { text: `Generated ${generatedLabel}`, cls: 'text-black/40 dark:text-white/40' }
        : { text: 'No report yet', cls: 'text-black/40 dark:text-white/40' }

  const label = isPending
    ? 'Requesting…'
    : hasReport
      ? 'Re-generate Report'
      : 'Create Report'

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        title="Ask Claudia to summarize and tier this day's Granola calls"
        className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-black/70 transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/10 dark:bg-white/[.03] dark:text-white/70 dark:hover:bg-white/[.06]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`}
        >
          <path
            d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        {label}
      </button>
      <span className={`text-xs ${status.cls}`}>{status.text}</span>
    </div>
  )
}
