import { loadTasks, loadSuggestionState } from '@/lib/data'
import { torontoTodayISO } from '@/lib/util'
import { KanbanBoard } from '../components/KanbanBoard'
import { TaskItem } from '../components/TaskItem'
import { SuggestTasksButton } from '../components/SuggestTasksButton'

export default async function TasksPage() {
  const { tasks, error } = await loadTasks()
  const todayIso = torontoTodayISO()
  const suggestionState = await loadSuggestionState()

  const open = tasks.filter((t) => !t.done)
  const done = tasks
    .filter((t) => t.done)
    .sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''))

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col px-4 py-8 sm:px-8 sm:py-10 lg:h-[100dvh] lg:overflow-hidden">
      <header className="mb-6 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tasks</h1>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            Sort with the controls, or switch to Manual to drag cards between columns.{' '}
            <span className="text-black/40 dark:text-white/40">· {open.length} open</span>
          </p>
        </div>
        <SuggestTasksButton
          initialStatus={suggestionState.status}
          initialCount={suggestionState.count}
        />
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
          <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
            <KanbanBoard tasks={tasks} todayIso={todayIso} />
          </div>

          {done.length > 0 && (
            <details className="mt-6 shrink-0 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[.02]">
              <summary className="cursor-pointer text-sm font-medium text-black/60 select-none dark:text-white/60">
                Completed ({done.length})
              </summary>
              <ul className="mt-3 space-y-2 lg:max-h-[28vh] lg:overflow-y-auto lg:pr-1">
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
