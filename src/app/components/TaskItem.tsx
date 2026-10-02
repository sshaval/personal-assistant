'use client'

import { useTransition } from 'react'
import { toggleTask, deleteTask } from '../actions'
import type { Task } from '@/lib/types'
import { CATEGORY_META, recurrenceText } from '@/lib/types'
import { dueMeta } from '@/lib/util'
import { CreatorBadge } from './CreatorBadge'

const priorityStyles: Record<Task['priority'], string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
}

const dueStyles: Record<string, string> = {
  overdue: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  today: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  none: '',
}

export function TaskItem({ task, todayIso }: { task: Task; todayIso: string }) {
  const [isPending, startTransition] = useTransition()
  const due = dueMeta(task.due_date, todayIso)
  const cat = CATEGORY_META[task.category]

  return (
    <li
      className={`group flex items-start gap-2.5 rounded-xl border border-black/10 bg-white p-3 transition dark:border-white/10 dark:bg-white/[.03] ${
        isPending ? 'opacity-50' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={task.done}
        onChange={() => startTransition(() => toggleTask(task.id, !task.done))}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
        aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <span
            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${cat?.dot ?? 'bg-zinc-400'}`}
            title={cat?.label}
          />
          <p
            className={`text-sm ${
              task.done ? 'text-black/40 line-through dark:text-white/40' : ''
            }`}
          >
            {task.title}
          </p>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-3.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityStyles[task.priority]}`}
          >
            {task.priority}
          </span>
          {due.tone !== 'none' && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                task.done ? dueStyles.upcoming : dueStyles[due.tone]
              }`}
            >
              {due.label}
            </span>
          )}
          {task.recurrence && task.recurrence !== 'none' && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              ↻ {recurrenceText(task.recurrence, task.recurrence_day)}
            </span>
          )}
          {task.company ? (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
              {task.company}
            </span>
          ) : task.tag ? (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">
              {task.tag}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1">
        <CreatorBadge by={task.created_by} email={task.created_by_email} />
        <button
          onClick={() => startTransition(() => deleteTask(task.id))}
          className="rounded-md px-1 text-[11px] text-black/30 opacity-0 transition hover:text-red-600 group-hover:opacity-100 dark:text-white/30"
          aria-label="Delete task"
        >
          delete
        </button>
      </div>
    </li>
  )
}
