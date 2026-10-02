'use client'

import { useEffect, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { updateTask, deleteTask } from '../actions'
import type { Task, Recurrence } from '@/lib/types'
import { CATEGORY_ORDER, CATEGORY_META, WEEKDAYS_LONG } from '@/lib/types'
import { displayNameFor } from '@/lib/avatars'

const field =
  'rounded-lg border border-black/10 bg-white px-2.5 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/15 dark:bg-black/30'
const label = 'text-[11px] font-medium uppercase tracking-wide text-black/40 dark:text-white/40'

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
    >
      {pending ? 'Saving…' : 'Save changes'}
    </button>
  )
}

export function TaskEditModal({ task, onClose }: { task: Task; onClose: () => void }) {
  // Recurrence is controlled so the day-picker can react to the chosen cadence.
  const [recurrence, setRecurrence] = useState<Recurrence>(task.recurrence ?? 'none')
  const [recDay, setRecDay] = useState<number>(task.recurrence_day ?? 1)
  const [isDeleting, startDelete] = useTransition()

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // When switching cadence, keep the day in range for the new mode.
  function changeRecurrence(r: Recurrence) {
    setRecurrence(r)
    if (r === 'weekly') setRecDay((d) => (d >= 0 && d <= 6 ? d : 1))
    else if (r === 'monthly') setRecDay((d) => (d >= 1 && d <= 31 ? d : 1))
  }

  const createdLabel = new Date(task.created_at).toLocaleString('en-US', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  // Who created it: Claudia, the specific person (migration_v9+), or "you" for
  // legacy tasks with no recorded author.
  const authorLabel =
    task.created_by === 'claudia'
      ? 'Claudia'
      : (displayNameFor(task.created_by_email) ?? 'you')

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Edit task"
    >
      <div
        className="my-8 w-full max-w-lg rounded-2xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold">Edit task</h2>
            <p className="mt-0.5 text-xs text-black/45 dark:text-white/45">
              Added by {authorLabel} · {createdLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-black/40 transition hover:text-black/70 dark:text-white/40 dark:hover:text-white/80"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form
          action={async (formData) => {
            await updateTask(formData)
            onClose()
          }}
          className="flex flex-col gap-3.5"
        >
          <input type="hidden" name="id" value={task.id} />

          <div className="flex flex-col gap-1">
            <label className={label} htmlFor="edit-title">
              Task
            </label>
            <input
              id="edit-title"
              name="title"
              required
              autoFocus
              defaultValue={task.title}
              autoComplete="off"
              className={`w-full ${field}`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={label} htmlFor="edit-company">
              Company
            </label>
            <input
              id="edit-company"
              name="company"
              defaultValue={task.company ?? ''}
              placeholder="e.g. Volie"
              autoComplete="off"
              className={`w-full ${field}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={label} htmlFor="edit-priority">
                Priority
              </label>
              <select
                id="edit-priority"
                name="priority"
                defaultValue={task.priority}
                className={field}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className={label} htmlFor="edit-category">
                Column
              </label>
              <select
                id="edit-category"
                name="category"
                defaultValue={task.category}
                className={field}
              >
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_META[c].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={label} htmlFor="edit-due">
              Due date
            </label>
            <input
              id="edit-due"
              type="date"
              name="due_date"
              defaultValue={task.due_date ?? ''}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker()
                } catch {}
              }}
              className={`${field} cursor-pointer`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={label} htmlFor="edit-recurrence">
                Repeats
              </label>
              <select
                id="edit-recurrence"
                name="recurrence"
                value={recurrence}
                onChange={(e) => changeRecurrence(e.target.value as Recurrence)}
                className={field}
              >
                <option value="none">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {(recurrence === 'weekly' || recurrence === 'monthly') && (
              <div className="flex flex-col gap-1">
                <label className={label} htmlFor="edit-recday">
                  {recurrence === 'weekly' ? 'On day' : 'Day of month'}
                </label>
                <select
                  id="edit-recday"
                  name="recurrence_day"
                  value={String(recDay)}
                  onChange={(e) => setRecDay(Number(e.target.value))}
                  className={field}
                >
                  {recurrence === 'weekly'
                    ? WEEKDAYS_LONG.map((d, i) => (
                        <option key={i} value={i}>
                          {d}
                        </option>
                      ))
                    : Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className={label} htmlFor="edit-notes">
              Notes
            </label>
            <textarea
              id="edit-notes"
              name="notes"
              defaultValue={task.notes ?? ''}
              rows={3}
              placeholder="Optional details…"
              className={`w-full resize-y ${field}`}
            />
          </div>

          <div className="mt-1 flex items-center justify-between border-t border-black/[.06] pt-3.5 dark:border-white/[.06]">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() =>
                startDelete(async () => {
                  await deleteTask(task.id)
                  onClose()
                })
              }
              className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-sm text-black/55 transition hover:text-black/80 dark:text-white/55 dark:hover:text-white/80"
              >
                Cancel
              </button>
              <SaveButton />
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
