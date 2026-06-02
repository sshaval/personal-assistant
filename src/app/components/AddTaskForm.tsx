'use client'

import { useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { addTask } from '../actions'
import { CATEGORY_ORDER, CATEGORY_META } from '@/lib/types'
import type { TaskCategory } from '@/lib/types'

function SubmitButton({ label = 'Add' }: { label?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
    >
      {pending ? '…' : label}
    </button>
  )
}

const field =
  'rounded-lg border border-black/10 bg-white px-2 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/15 dark:bg-black/30'

export function AddTaskForm({
  fixedCategory,
  variant = 'rail',
}: {
  fixedCategory?: TaskCategory
  variant?: 'rail' | 'column'
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(variant === 'rail')
  const isRecurring = fixedCategory === 'recurring'

  if (variant === 'column' && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-black/15 py-2 text-sm font-medium text-black/45 transition hover:border-black/30 hover:text-black/70 dark:border-white/15 dark:text-white/45 dark:hover:text-white/80"
      >
        + Add task
      </button>
    )
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addTask(formData)
        formRef.current?.reset()
        if (variant === 'column') setOpen(false)
      }}
      className={
        variant === 'rail'
          ? 'flex flex-col gap-2 rounded-xl border border-black/10 bg-black/[.02] p-3 dark:border-white/10 dark:bg-white/[.03]'
          : 'flex flex-col gap-2 rounded-lg border border-black/10 bg-black/[.02] p-2.5 dark:border-white/10 dark:bg-black/20'
      }
    >
      {fixedCategory && <input type="hidden" name="category" value={fixedCategory} />}

      <input
        name="title"
        required
        autoFocus={variant === 'column'}
        placeholder={isRecurring ? 'Recurring task…' : 'Add a task…'}
        autoComplete="off"
        className={`w-full ${field}`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <select name="priority" defaultValue="medium" className={field} aria-label="Priority">
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {!fixedCategory && (
          <select name="category" defaultValue="general" className={field} aria-label="Category">
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_META[c].label}
              </option>
            ))}
          </select>
        )}

        {isRecurring && (
          <select name="recurrence" defaultValue="weekly" className={field} aria-label="Repeats">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        )}

        <input type="date" name="due_date" className={field} aria-label="Due date" />

        <div className="ml-auto flex items-center gap-1.5">
          {variant === 'column' && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-2 text-sm text-black/45 hover:text-black/70 dark:text-white/45"
            >
              Cancel
            </button>
          )}
          <SubmitButton label={variant === 'rail' ? 'Add task' : 'Add'} />
        </div>
      </div>
    </form>
  )
}
