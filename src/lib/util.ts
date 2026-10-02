import type { Task } from './types'

export const priorityRank: Record<Task['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2,
}

export function sortOpen(a: Task, b: Task): number {
  if (priorityRank[a.priority] !== priorityRank[b.priority]) {
    return priorityRank[a.priority] - priorityRank[b.priority]
  }
  const ad = a.due_date ?? '9999-12-31'
  const bd = b.due_date ?? '9999-12-31'
  if (ad !== bd) return ad < bd ? -1 : 1
  return a.created_at < b.created_at ? -1 : 1
}

export function sortByOrder(a: Task, b: Task): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
  return a.created_at < b.created_at ? -1 : 1
}

/** Today's date in America/Toronto as YYYY-MM-DD (en-CA formats this way). */
export function torontoTodayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Friendly label for a YYYY-MM-DD date, e.g. "Wednesday, June 3". */
export function friendlyDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

/** Friendly label for a full timestamp, in America/Toronto, e.g. "Jun 2, 7:02 AM". */
export function friendlyDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export type DueTone = 'overdue' | 'today' | 'upcoming' | 'none'

export function dueMeta(
  due: string | null,
  todayIso: string,
): { label: string; tone: DueTone } {
  if (!due) return { label: '', tone: 'none' }
  const short = new Date(due + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  if (due < todayIso) return { label: `Overdue · ${short}`, tone: 'overdue' }
  if (due === todayIso) return { label: `Today · ${short}`, tone: 'today' }
  return { label: short, tone: 'upcoming' }
}

// ---- Task sorting (Kanban "Sort by" control) --------------------------------

export type TaskSortMode = 'manual' | 'created' | 'due' | 'priority' | 'company'

export const TASK_SORT_LABELS: Record<TaskSortMode, string> = {
  manual: 'Manual',
  created: 'Created',
  due: 'Due date',
  priority: 'Priority',
  company: 'Company',
}

const DUE_FAR = '9999-12-31' // undated tasks sort to the bottom of a due-date sort

export type SortDir = 'asc' | 'desc'

// Each field's default direction when first picked (the most useful view):
// newest-created first, soonest-due first, highest-priority first, company A→Z.
export const TASK_SORT_DEFAULT_DIR: Record<TaskSortMode, SortDir> = {
  manual: 'asc', // unused — manual has no direction
  created: 'desc',
  due: 'asc',
  priority: 'desc',
  company: 'asc',
}

/**
 * Return a column's tasks in display order for the chosen sort + direction.
 * 'manual' keeps the user's drag order (sort_order) and ignores dir. Ties fall
 * back to sort_order so ordering stays stable; undated / company-less tasks
 * always sink to the bottom regardless of direction.
 */
export function sortTasks(
  tasks: Task[],
  mode: TaskSortMode,
  dir: SortDir = TASK_SORT_DEFAULT_DIR[mode],
): Task[] {
  const arr = [...tasks]
  const flip = dir === 'desc' ? -1 : 1 // applied to "value ascending" comparators
  switch (mode) {
    case 'created':
      // asc = oldest first, desc = newest first.
      return arr.sort((a, b) =>
        a.created_at === b.created_at
          ? sortByOrder(a, b)
          : (a.created_at < b.created_at ? -1 : 1) * flip,
      )
    case 'due':
      // asc = soonest first, desc = latest first; undated always last.
      return arr.sort((a, b) => {
        const an = !a.due_date
        const bn = !b.due_date
        if (an || bn) return an && bn ? sortByOrder(a, b) : an ? 1 : -1
        if (a.due_date === b.due_date) return sortByOrder(a, b)
        return (a.due_date! < b.due_date! ? -1 : 1) * flip
      })
    case 'priority': {
      // desc = high→low (most important first), asc = low→high.
      const pflip = dir === 'desc' ? 1 : -1
      return arr.sort((a, b) => {
        if (priorityRank[a.priority] !== priorityRank[b.priority]) {
          return (priorityRank[a.priority] - priorityRank[b.priority]) * pflip
        }
        const ad = a.due_date ?? DUE_FAR
        const bd = b.due_date ?? DUE_FAR
        return ad !== bd ? (ad < bd ? -1 : 1) : sortByOrder(a, b)
      })
    }
    case 'company':
      // asc = A→Z, desc = Z→A; tasks with no company always last.
      return arr.sort((a, b) => {
        const ac = (a.company ?? '').trim().toLowerCase()
        const bc = (b.company ?? '').trim().toLowerCase()
        const an = !ac
        const bn = !bc
        if (an || bn) return an && bn ? sortByOrder(a, b) : an ? 1 : -1
        if (ac === bc) return sortByOrder(a, b)
        return (ac < bc ? -1 : 1) * flip
      })
    case 'manual':
    default:
      return arr.sort(sortByOrder)
  }
}
