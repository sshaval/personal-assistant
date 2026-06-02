import { getSupabase } from './supabase'
import type { Task, Briefing, Meeting, DayRefresh } from './types'

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
