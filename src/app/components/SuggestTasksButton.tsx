'use client'

import { useEffect, useState, useTransition } from 'react'
import type { TaskSuggestion, SuggestionStatus } from '@/lib/types'
import { CATEGORY_META } from '@/lib/types'
import {
  requestTaskSuggestions,
  getSuggestionState,
  getSuggestions,
  approveTaskSuggestions,
  dismissTaskSuggestions,
} from '../actions'

const priChip: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
}

// "Auto-generate tasks" — kicks off a background scan of the last 3 days of email /
// Teams / Granola, then lets Shayan review the suggestions and pick which to add.
// The web app can't read those sources; the task-scan watcher does the scan and
// writes suggestions, and this button polls for them + shows the review popup.
export function SuggestTasksButton({
  initialStatus,
  initialCount,
}: {
  initialStatus: SuggestionStatus
  initialCount: number
}) {
  const [status, setStatus] = useState<SuggestionStatus>(initialStatus)
  const [count, setCount] = useState(initialCount)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, startStart] = useTransition()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([])
  const [checked, setChecked] = useState<Set<string>>(() => new Set())
  const [isSaving, startSave] = useTransition()

  // While a scan is running, poll for it to finish.
  useEffect(() => {
    if (status !== 'working') return
    let alive = true
    const iv = setInterval(async () => {
      const s = await getSuggestionState()
      if (!alive) return
      if (s.status !== 'working') {
        setStatus(s.status as SuggestionStatus)
        setCount(s.count)
      }
    }, 8000)
    return () => {
      alive = false
      clearInterval(iv)
    }
  }, [status])

  function start() {
    setError(null)
    startStart(async () => {
      const res = await requestTaskSuggestions()
      if (res.ok) setStatus('working')
      else setError(res.error)
    })
  }

  async function openModal() {
    setOpen(true)
    setLoading(true)
    const list = await getSuggestions()
    setSuggestions(list)
    setChecked(new Set(list.map((s) => s.id))) // default: all ticked
    setLoading(false)
  }

  function toggle(id: string) {
    setChecked((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function approve() {
    startSave(async () => {
      const res = await approveTaskSuggestions([...checked])
      if (res.ok) {
        setOpen(false)
        setStatus('idle')
        setCount(0)
      } else setError(res.error)
    })
  }

  function discard() {
    startSave(async () => {
      await dismissTaskSuggestions()
      setOpen(false)
      setStatus('idle')
      setCount(0)
    })
  }

  return (
    <div className="flex items-center gap-2">
      {status === 'working' ? (
        <span className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-black/60 dark:border-white/10 dark:bg-white/[.03] dark:text-white/60">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="h-4 w-4 animate-spin text-blue-600"
          >
            <path d="M12 3a9 9 0 1 0 9 9" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          Scanning email, Teams &amp; Granola…
        </span>
      ) : status === 'ready' && count > 0 ? (
        <button
          type="button"
          onClick={openModal}
          className="inline-flex animate-pulse items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:animate-none hover:bg-emerald-500"
        >
          ✨ {count} suggestion{count === 1 ? '' : 's'} ready — Review
        </button>
      ) : status === 'ready' && count === 0 ? (
        <span className="inline-flex items-center gap-2 text-sm text-black/50 dark:text-white/50">
          No new tasks found
          <button
            type="button"
            onClick={discard}
            className="rounded-md border border-black/10 px-2 py-1 text-xs font-medium text-black/60 hover:bg-black/[.04] dark:border-white/10 dark:text-white/60"
          >
            Dismiss
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={isStarting}
          title="Scan the last 3 days of email, Teams & Granola for task ideas to review"
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-black/70 transition hover:bg-black/[.04] disabled:opacity-60 dark:border-white/10 dark:bg-white/[.03] dark:text-white/70 dark:hover:bg-white/[.06]"
        >
          ✨ {isStarting ? 'Starting…' : 'Auto-generate tasks'}
        </button>
      )}
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => !isSaving && setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Review suggested tasks"
        >
          <div
            className="my-8 w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-start justify-between">
              <h2 className="text-base font-semibold">Suggested tasks</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-black/40 hover:text-black/70 dark:text-white/40"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-xs text-black/45 dark:text-white/45">
              Tick the ones to add to your board — the rest are discarded.
            </p>

            {loading ? (
              <p className="py-10 text-center text-sm text-black/40 dark:text-white/40">Loading…</p>
            ) : suggestions.length === 0 ? (
              <p className="py-10 text-center text-sm text-black/50 dark:text-white/50">
                No suggestions in this batch.
              </p>
            ) : (
              <>
                <div className="mb-2 flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setChecked(new Set(suggestions.map((s) => s.id)))}
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setChecked(new Set())}
                    className="font-medium text-black/45 hover:underline dark:text-white/45"
                  >
                    Select none
                  </button>
                </div>
                <ul className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                  {suggestions.map((s) => {
                    const on = checked.has(s.id)
                    return (
                      <li
                        key={s.id}
                        className={`rounded-xl border p-3 transition ${
                          on
                            ? 'border-blue-500/50 bg-blue-500/[.04]'
                            : 'border-black/10 dark:border-white/10'
                        }`}
                      >
                        <label className="flex cursor-pointer items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggle(s.id)}
                            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-blue-600"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-medium">{s.title}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priChip[s.priority] ?? priChip.medium}`}
                              >
                                {s.priority}
                              </span>
                              <span className="rounded-full bg-black/[.05] px-2 py-0.5 text-[10px] font-medium text-black/55 dark:bg-white/10 dark:text-white/60">
                                {CATEGORY_META[s.category]?.label ?? s.category}
                              </span>
                              {s.company && (
                                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                                  {s.company}
                                </span>
                              )}
                              {s.due_date && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                                  {s.due_date}
                                </span>
                              )}
                              {s.source && (
                                <span className="text-[10px] text-black/35 dark:text-white/35">
                                  · {s.source}
                                </span>
                              )}
                            </div>
                            {s.notes && (
                              <p className="mt-1 text-xs text-black/55 dark:text-white/55">
                                {s.notes}
                              </p>
                            )}
                          </div>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-black/[.06] pt-3.5 dark:border-white/[.06]">
              <button
                type="button"
                onClick={discard}
                disabled={isSaving}
                className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                Discard all
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isSaving}
                  className="rounded-lg px-3 py-2 text-sm text-black/55 transition hover:text-black/80 dark:text-white/55 dark:hover:text-white/80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={approve}
                  disabled={isSaving || checked.size === 0}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSaving ? 'Adding…' : `Add ${checked.size} selected`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
