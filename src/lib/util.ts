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
  if (due < todayIso) return { label: 'Overdue', tone: 'overdue' }
  if (due === todayIso) return { label: 'Today', tone: 'today' }
  const label = new Date(due + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  return { label, tone: 'upcoming' }
}
