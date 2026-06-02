import { loadTasks } from '@/lib/data'
import { torontoTodayISO } from '@/lib/util'
import { KanbanBoard } from '../components/KanbanBoard'
import { TaskItem } from '../components/TaskItem'

export default async function TasksPage() {
  const { tasks, error } = await loadTasks()
  const todayIso = torontoTodayISO()

  const open = tasks.filter((t) => !t.done)
  const done = tasks
    .filter((t) => t.done)
    .sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''))

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tasks</h1>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            Drag cards to reorder or move between columns.
          </p>
        </div>
        <span className="text-sm text-black/40 dark:text-white/40">{open.length} open</span>
      </header>

      {error ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="font-semibold">Database not connected yet</p>
          <p className="mt-1">
            Run <code className="font-mono">migration_v2.sql</code> in Supabase, then restart the
            dev server.
          </p>
          <p className="mt-2 font-mono text-xs text-amber-800/80 dark:text-amber-200/70">{error}</p>
        </div>
      ) : (
        <>
          <KanbanBoard tasks={tasks} todayIso={todayIso} />

          {done.length > 0 && (
            <details className="mt-8 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[.02]">
              <summary className="cursor-pointer text-sm font-medium text-black/60 select-none dark:text-white/60">
                Completed ({done.length})
              </summary>
              <ul className="mt-3 space-y-2">
                {done.map((t) => (
                  <TaskItem key={t.id} task={t} todayIso={todayIso} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  )
}
