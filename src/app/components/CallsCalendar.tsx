'use client'

import Link from 'next/link'
import { useState } from 'react'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const pad = (n: number) => String(n).padStart(2, '0')
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

// A month-grid calendar for picking which day to report on. Past + today are
// clickable (they navigate to /calls?d=ISO); future days are disabled. Days that
// already have a generated report get a dot. Month nav is pure client state.
export function CallsCalendar({
  selected,
  today,
  reportDates,
}: {
  selected: string
  today: string
  reportDates: string[]
}) {
  const [sy, sm] = selected.split('-').map(Number) // year, month(1-12)
  const [view, setView] = useState({ year: sy, month: sm - 1 }) // month 0-11
  const reportSet = new Set(reportDates)

  const startWeekday = new Date(Date.UTC(view.year, view.month, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate()

  const cells: (string | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(isoOf(view.year, view.month, d))

  function shift(delta: number) {
    setView((v) => {
      const m = v.month + delta
      return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 }
    })
  }

  const navBtn =
    'flex h-8 w-8 items-center justify-center rounded-lg text-black/50 transition-colors hover:bg-black/[.05] dark:text-white/50 dark:hover:bg-white/[.06]'
  const cellBase =
    'relative mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sm'

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[.02]">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} className={navBtn} aria-label="Previous month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
            <path d="M15 6l-6 6 6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <p className="text-sm font-semibold">
          {MONTHS[view.month]} {view.year}
        </p>
        <button type="button" onClick={() => shift(1)} className={navBtn} aria-label="Next month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
            <path d="M9 6l6 6-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-[11px] font-medium text-black/40 dark:text-white/40">
            {w}
          </div>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <div key={`b${i}`} />
          const day = Number(iso.slice(8, 10))
          const isFuture = iso > today
          const isSelected = iso === selected
          const isToday = iso === today
          const hasReport = reportSet.has(iso)

          if (isFuture) {
            return (
              <div key={iso} className={`${cellBase} text-black/20 dark:text-white/20`}>
                {day}
              </div>
            )
          }
          return (
            <Link
              key={iso}
              href={`/calls?d=${iso}`}
              className={[
                cellBase,
                'transition-colors',
                isSelected
                  ? 'bg-zinc-900 font-semibold text-white dark:bg-white dark:text-zinc-900'
                  : 'hover:bg-black/[.05] dark:hover:bg-white/[.06]',
                !isSelected && isToday ? 'font-semibold ring-1 ring-inset ring-zinc-400/50' : '',
              ].join(' ')}
            >
              {day}
              {hasReport && (
                <span
                  className={`absolute bottom-1 h-1 w-1 rounded-full ${
                    isSelected ? 'bg-white/80 dark:bg-zinc-900/80' : 'bg-emerald-500'
                  }`}
                />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
