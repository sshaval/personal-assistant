'use client'

import { useState } from 'react'
import type { Meeting } from '@/lib/types'
import { BriefingPanel } from './BriefingPanel'

const catChip: Record<string, string> = {
  portfolio: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  pipeline: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  internal: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300',
  external: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
}

export function MeetingCard({ meeting }: { meeting: Meeting }) {
  const [open, setOpen] = useState(false)
  const cat = meeting.category?.toLowerCase() ?? ''
  const chip = catChip[cat] ?? 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300'
  const hasDetail = Boolean(meeting.attendees || meeting.prep)

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white transition dark:border-white/10 dark:bg-white/[.02]">
      <button
        onClick={() => hasDetail && setOpen((v) => !v)}
        className={`flex w-full items-start gap-3 p-3.5 text-left sm:p-4 ${
          hasDetail ? 'cursor-pointer hover:bg-black/[.02] dark:hover:bg-white/[.03]' : 'cursor-default'
        }`}
        aria-expanded={open}
      >
        {/* Time column */}
        <div className="w-16 shrink-0 pt-0.5 text-right">
          <p className="text-sm font-semibold tracking-tight">{meeting.start_time ?? '—'}</p>
          {meeting.end_time && (
            <p className="text-[11px] text-black/40 dark:text-white/40">{meeting.end_time}</p>
          )}
        </div>

        {/* Main */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{meeting.title}</h3>
            {meeting.category && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${chip}`}>
                {meeting.category}
              </span>
            )}
          </div>
          {meeting.summary && (
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">{meeting.summary}</p>
          )}
        </div>

        {/* Chevron */}
        {hasDetail && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className={`mt-1 h-4 w-4 shrink-0 text-black/35 transition-transform dark:text-white/35 ${
              open ? 'rotate-180' : ''
            }`}
          >
            <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {open && hasDetail && (
        <div className="border-t border-black/10 px-4 pt-3 pb-4 dark:border-white/10">
          {meeting.attendees && (
            <p className="mb-2 text-xs text-black/55 dark:text-white/55">
              <span className="font-medium text-black/70 dark:text-white/70">With:</span>{' '}
              {meeting.attendees}
            </p>
          )}
          {meeting.prep && (
            <div className="rounded-lg bg-black/[.02] p-3 dark:bg-white/[.03]">
              <p className="mb-1 text-[11px] font-semibold tracking-wide text-black/45 uppercase dark:text-white/45">
                Prep
              </p>
              <BriefingPanel content={meeting.prep} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
