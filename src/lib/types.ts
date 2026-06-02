export type Priority = 'low' | 'medium' | 'high'

export type TaskSource =
  | 'manual'
  | 'briefing'
  | 'email'
  | 'call'
  | 'teams'
  | 'calendar'

export type TaskCategory = 'portfolio' | 'pipeline' | 'general' | 'recurring'

export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly'

export type CreatedBy = 'user' | 'claudia'

export interface Task {
  id: string
  title: string
  notes: string | null
  done: boolean
  priority: Priority
  due_date: string | null
  source: TaskSource
  tag: string | null
  category: TaskCategory
  created_by: CreatedBy
  recurrence: Recurrence
  sort_order: number
  created_at: string
  updated_at: string
  done_at: string | null
}

export interface Briefing {
  id: string
  briefing_date: string
  content: string
  created_at: string
}

export interface Meeting {
  id: string
  meeting_date: string
  start_time: string | null
  end_time: string | null
  sort_order: number
  title: string
  category: string | null
  attendees: string | null
  summary: string | null
  prep: string | null
  created_at: string
  updated_at: string
}

export interface DayRefresh {
  meeting_date: string
  requested_at: string | null // set by the Refresh button; null once fulfilled
  refreshed_at: string | null // last time Claudia rebuilt this date from the calendar
  note: string | null
  updated_at: string
}

// ---- Shared display metadata -------------------------------------------------

export const CATEGORY_ORDER: TaskCategory[] = [
  'portfolio',
  'pipeline',
  'general',
  'recurring',
]

export const CATEGORY_META: Record<
  TaskCategory,
  { label: string; blurb: string; dot: string; ring: string; chip: string }
> = {
  portfolio: {
    label: 'Portfolio',
    blurb: 'Businesses we own',
    dot: 'bg-emerald-500',
    ring: 'border-emerald-500/30',
    chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  pipeline: {
    label: 'Pipeline',
    blurb: 'Businesses we’re pursuing',
    dot: 'bg-sky-500',
    ring: 'border-sky-500/30',
    chip: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  general: {
    label: 'General',
    blurb: 'Admin & everything else',
    dot: 'bg-zinc-400',
    ring: 'border-zinc-400/30',
    chip: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300',
  },
  recurring: {
    label: 'Recurring',
    blurb: 'Repeats on a schedule',
    dot: 'bg-violet-500',
    ring: 'border-violet-500/30',
    chip: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
}

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: 'One-time',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}
