import { getSupabase } from './supabase'
import type {
  Task,
  Briefing,
  Meeting,
  DayRefresh,
  Call,
  CallReport,
  SuggestionState,
  TaskSuggestion,
} from './types'

export async function loadTasks(): Promise<{ tasks: Task[]; error: string | null }> {
  try {
    const { data, error } = await getSupabase().from('tasks').select('*')
    if (error) throw new Error(error.message)
    return { tasks: (data ?? []) as Task[], error: null }
  } catch (e) {
    return { tasks: [], error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function loadLatestBriefing(): Promise<{
  briefing: Briefing | null
  error: string | null
}> {
  try {
    const { data, error } = await getSupabase()
      .from('briefings')
      .select('*')
      .order('briefing_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return { briefing: (data ?? null) as Briefing | null, error: null }
  } catch (e) {
    return { briefing: null, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function loadMeetings(
  date: string,
): Promise<{ meetings: Meeting[]; error: string | null }> {
  try {
    const { data, error } = await getSupabase()
      .from('meetings')
      .select('*')
      .eq('meeting_date', date)
      .order('sort_order', { ascending: true })
    if (error) throw new Error(error.message)
    return { meetings: (data ?? []) as Meeting[], error: null }
  } catch (e) {
    return { meetings: [], error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

/**
 * Refresh state for a single day (when Claudia last rebuilt it, whether a manual
 * refresh is pending). Degrades quietly to null if the table doesn't exist yet
 * (pre-migration) so it never breaks the Day's View.
 */
export async function loadDayRefresh(date: string): Promise<DayRefresh | null> {
  try {
    const { data, error } = await getSupabase()
      .from('day_refresh')
      .select('*')
      .eq('meeting_date', date)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data ?? null) as DayRefresh | null
  } catch {
    return null
  }
}

/** Calls for one day (a generated report), ordered for display. */
export async function loadCalls(
  date: string,
): Promise<{ calls: Call[]; error: string | null }> {
  try {
    const { data, error } = await getSupabase()
      .from('calls')
      .select('*')
      .eq('call_date', date)
      .order('sort_order', { ascending: true })
    if (error) throw new Error(error.message)
    return { calls: (data ?? []) as Call[], error: null }
  } catch (e) {
    return { calls: [], error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

/**
 * Report state for a single day (when Claudia last built it, whether a report is
 * pending). Degrades quietly to null if the table doesn't exist yet (pre-migration).
 */
export async function loadCallReport(date: string): Promise<CallReport | null> {
  try {
    const { data, error } = await getSupabase()
      .from('call_reports')
      .select('*')
      .eq('report_date', date)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data ?? null) as CallReport | null
  } catch {
    return null
  }
}

/** Dates that already have a generated report — used to dot the calendar. */
export async function loadReportDates(): Promise<string[]> {
  try {
    const { data, error } = await getSupabase()
      .from('call_reports')
      .select('report_date, generated_at')
      .not('generated_at', 'is', null)
    if (error) throw new Error(error.message)
    return (data ?? []).map((r) => r.report_date as string)
  } catch {
    return []
  }
}

/**
 * State of the "Auto-generate tasks" scan (idle / working / ready + how many
 * suggestions are waiting). Degrades to a safe idle default if the table doesn't
 * exist yet (pre-migration_v6) so the Tasks page still renders.
 */
export async function loadSuggestionState(): Promise<SuggestionState> {
  const fallback: SuggestionState = {
    status: 'idle',
    requested_at: null,
    ready_at: null,
    last_scanned_at: null,
    note: null,
    count: 0,
  }
  try {
    const { data, error } = await getSupabase()
      .from('suggestion_state')
      .select('*')
      .eq('id', 'singleton')
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as SuggestionState) ?? fallback
  } catch {
    return fallback
  }
}

/** The current batch of task suggestions awaiting review. */
export async function loadSuggestions(): Promise<TaskSuggestion[]> {
  try {
    const { data, error } = await getSupabase()
      .from('task_suggestions')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []) as TaskSuggestion[]
  } catch {
    return []
  }
}
