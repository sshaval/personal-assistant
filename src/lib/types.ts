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
  company: string | null
  category: TaskCategory
  created_by: CreatedBy
  // Email of the signed-in person who created it (null for Claudia-created tasks
  // and for legacy tasks created before per-user authorship). Drives which avatar
  // shows on the card.
  created_by_email: string | null
  recurrence: Recurrence
  // For weekly: 0–6 (0 = Sun … 6 = Sat). For monthly: 1–31 (day of month). Else null.
  recurrence_day: number | null
  sort_order: number
  created_at: string
  updated_at: string
  done_at: string | null
}

// ---- Task suggestions (the "Auto-generate tasks" review flow) ----------------

export type SuggestionStatus = 'idle' | 'working' | 'ready' | 'error'

export interface SuggestionState {
  status: SuggestionStatus
  requested_at: string | null
  ready_at: string | null
  last_scanned_at: string | null
  note: string | null
  count: number
}

export interface TaskSuggestion {
  id: string
  title: string
  notes: string | null
  priority: Priority
  category: TaskCategory
  company: string | null
  due_date: string | null
  source: string | null
  sort_order: number
  created_at: string
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

// ---- Calls -------------------------------------------------------------------

// Which Granola space a call came from.
export type CallFolder =
  | 'internal' // "_Internal"      — portfolio management (not tiered)
  | 'live_opps' // "0. Live Opps"   — active opportunities (not tiered)
  | 'direct' // "1. Direct"      — targets we're considering buying (tiered)
  | 'brokered' // "2. Brokered"    — advisors / intermediaries (tiered)
  | 'divestitures' // "3. Divestitures"— carve-outs (tiered)

// Fit rating for the deal folders. Null for internal / live_opps.
export type CallTier = 'hot' | 'warm' | 'cold'

// Who ran the call (the Granola note creator). 'team' = mixed / all of us.
export type CallLead = 'shayan' | 'adriana' | 'sarina' | 'will' | 'team' | 'other'

export interface Call {
  id: string
  call_date: string
  granola_id: string | null
  folder: CallFolder
  title: string
  company: string | null
  lead: CallLead | null
  attendees: string | null
  summary: string | null
  tier: CallTier | null
  tier_rationale: string | null
  start_time: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CallReport {
  report_date: string
  requested_at: string | null // set by the Create/Re-generate button; fulfilled when generated_at is newer
  generated_at: string | null // last time Claudia built this date's report
  note: string | null
  call_count: number
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

// 0 = Sunday … 6 = Saturday, matching JS Date.getUTCDay().
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const WEEKDAYS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** Short human label for a task's recurrence, including the day when set. */
export function recurrenceText(recurrence: Recurrence, day: number | null): string {
  if (recurrence === 'none') return RECURRENCE_LABEL.none
  if (recurrence === 'weekly' && day != null && day >= 0 && day <= 6) {
    return `Weekly · ${WEEKDAYS[day]}`
  }
  if (recurrence === 'monthly' && day != null && day >= 1 && day <= 31) {
    return `Monthly · ${ordinal(day)}`
  }
  return RECURRENCE_LABEL[recurrence]
}

// ---- Calls display metadata --------------------------------------------------

// Tiered deal folders first (their Hot/Warm/Cold ratings are the point), then the
// untiered context folders.
export const CALL_FOLDER_ORDER: CallFolder[] = [
  'direct',
  'brokered',
  'divestitures',
  'live_opps',
  'internal',
]

export const CALL_FOLDER_META: Record<
  CallFolder,
  { label: string; blurb: string; dot: string; tiered: boolean }
> = {
  direct: {
    label: 'Direct',
    blurb: 'Founders / targets we’re considering buying',
    dot: 'bg-blue-500',
    tiered: true,
  },
  brokered: {
    label: 'Brokered',
    blurb: 'Advisors & intermediaries with opportunities',
    dot: 'bg-purple-500',
    tiered: true,
  },
  divestitures: {
    label: 'Divestitures',
    blurb: 'Carve-outs from larger companies & funds',
    dot: 'bg-orange-500',
    tiered: true,
  },
  live_opps: {
    label: 'Live Opps',
    blurb: 'Active opportunities in motion',
    dot: 'bg-emerald-500',
    tiered: false,
  },
  internal: {
    label: 'Internal',
    blurb: 'Portfolio management & internal calls',
    dot: 'bg-zinc-400',
    tiered: false,
  },
}

// rank is for sorting (Hot first) and "higher tier" filters.
export const CALL_TIER_ORDER: CallTier[] = ['hot', 'warm', 'cold']

export const CALL_TIER_META: Record<
  CallTier,
  { label: string; rank: number; chip: string; dot: string }
> = {
  hot: {
    label: 'Hot',
    rank: 0,
    chip: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    dot: 'bg-red-500',
  },
  warm: {
    label: 'Warm',
    rank: 1,
    chip: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
    dot: 'bg-amber-500',
  },
  cold: {
    label: 'Cold',
    rank: 2,
    chip: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    dot: 'bg-sky-500',
  },
}

export const CALL_LEAD_ORDER: CallLead[] = [
  'shayan',
  'adriana',
  'sarina',
  'will',
  'team',
  'other',
]

// Per-person colors: Adriana = purple, Sarina = pinkish-red (rose), Shayan = grey.
export const CALL_LEAD_META: Record<
  CallLead,
  { label: string; short: string; chip: string; dot: string }
> = {
  shayan: {
    label: 'Shayan',
    short: 'SS',
    chip: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-500/25 dark:text-zinc-200',
    dot: 'bg-zinc-400',
  },
  adriana: {
    label: 'Adriana',
    short: 'AS',
    chip: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
    dot: 'bg-purple-500',
  },
  sarina: {
    label: 'Sarina',
    short: 'SG',
    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
  will: {
    label: 'Will',
    short: 'WH',
    chip: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  team: {
    label: 'Team',
    short: 'TM',
    chip: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
    dot: 'bg-teal-500',
  },
  other: {
    label: 'Other',
    short: '?',
    chip: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
}
