import Link from 'next/link'
import type { Task } from '@/lib/types'
import { sortOpen } from '@/lib/util'
import { TaskItem } from './TaskItem'

export function RightRail({
  tasks,
  error,
  todayIso,
}: {
  tasks: Task[]
  error: string | null
  todayIso: string
}) {
  // Only what's actionable today: due today or already overdue. Tasks with no
  // due date or a future due date are intentionally hidden here — the full list
  // lives on the Tasks board.
  const due = tasks
    .filter((t) => !t.done && t.due_date && t.due_date <= todayIso)
    .sort(sortOpen)

  return (
    <aside className="shrink-0 border-t border-black/10 bg-white/60 px-4 py-6 md:px-5 xl:sticky xl:top-0 xl:h-screen xl:w-[340px] xl:overflow-y-auto xl:border-t-0 xl:border-l dark:border-white/10 dark:bg-zinc-900/40">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-black/70 uppercase dark:text-white/70">
          Today&apos;s Tasks
        </h2>
        <span className="text-xs text-black/40 dark:text-white/40">
          {due.length} due
        </span>
      </div>

      <ul className="space-y-2">
        {error && (
          <li className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            Database not connected. Add Supabase keys to{' '}
            <code className="font-mono">.env.local</code> and run the SQL.
          </li>
        )}
        {!error && due.length === 0 && (
          <li className="rounded-xl border border-dashed border-black/15 p-4 text-center text-sm text-black/40 dark:border-white/15 dark:text-white/40">
            Nothing due today. You&apos;re all caught up.
          </li>
        )}
        {due.map((task) => (
          <TaskItem key={task.id} task={task} todayIso={todayIso} />
        ))}
      </ul>

      <Link
        href="/tasks"
        className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        Open the Tasks board →
      </Link>
    </aside>
  )
}
