'use server'

import { revalidatePath } from 'next/cache'
import { getSupabase } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth'
import type { Priority, Recurrence, TaskCategory, TaskSuggestion } from '@/lib/types'

// Revalidate the whole tree so the persistent right rail updates on every page.
function refresh() {
  revalidatePath('/', 'layout')
}

/**
 * Email of the signed-in person, for stamping task authorship (shows their avatar
 * on the card). Never throws — no session, or auth not configured, yields null.
 */
async function currentAuthorEmail(): Promise<string | null> {
  try {
    return (await getSessionUser())?.email ?? null
  } catch {
    return null
  }
}

const CATEGORIES: TaskCategory[] = ['portfolio', 'pipeline', 'general', 'recurring']
const RECURRENCES: Recurrence[] = ['none', 'daily', 'weekly', 'monthly']
const PRIORITIES: Priority[] = ['low', 'medium', 'high']

/**
 * Normalize the recurrence-day form value:
 *   weekly  -> 0..6  (day of week)
 *   monthly -> 1..31 (day of month)
 *   anything else -> null
 */
function parseRecurrenceDay(rec: Recurrence, raw: FormDataEntryValue | null): number | null {
  if (rec !== 'weekly' && rec !== 'monthly') return null
  const n = parseInt(String(raw ?? ''), 10)
  if (Number.isNaN(n)) return null
  if (rec === 'weekly') return n >= 0 && n <= 6 ? n : null
  return n >= 1 && n <= 31 ? n : null
}

/** The next due date for a recurring task, honoring its recurrence_day when set. */
function advanceDate(due: string | null, rec: Recurrence, recDay: number | null): string {
  const base = due ? new Date(due + 'T00:00:00Z') : new Date()
  const d = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()),
  )
  if (rec === 'daily') {
    d.setUTCDate(d.getUTCDate() + 1)
  } else if (rec === 'weekly') {
    if (recDay != null && recDay >= 0 && recDay <= 6) {
      // Walk forward to the next occurrence of that weekday (strictly future).
      do {
        d.setUTCDate(d.getUTCDate() + 1)
      } while (d.getUTCDay() !== recDay)
    } else {
      d.setUTCDate(d.getUTCDate() + 7)
    }
  } else if (rec === 'monthly') {
    if (recDay != null && recDay >= 1 && recDay <= 31) {
      // Jump to next month, then clamp to that month's last day.
      d.setUTCDate(1)
      d.setUTCMonth(d.getUTCMonth() + 1)
      const lastDay = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
      ).getUTCDate()
      d.setUTCDate(Math.min(recDay, lastDay))
    } else {
      d.setUTCMonth(d.getUTCMonth() + 1)
    }
  }
  return d.toISOString().slice(0, 10)
}

async function nextSortOrder(category: TaskCategory): Promise<number> {
  const { data } = await getSupabase()
    .from('tasks')
    .select('sort_order')
    .eq('category', category)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const max = (data?.sort_order as number | undefined) ?? -1
  return max + 1
}

export async function addTask(formData: FormData) {
  const title = (formData.get('title') as string | null)?.trim()
  if (!title) return

  let priority = ((formData.get('priority') as string) || 'medium') as Priority
  if (!PRIORITIES.includes(priority)) priority = 'medium'
  const due = (formData.get('due_date') as string) || null
  const company = ((formData.get('company') as string) || '').trim() || null

  let category = ((formData.get('category') as string) || 'general') as TaskCategory
  if (!CATEGORIES.includes(category)) category = 'general'

  let recurrence = ((formData.get('recurrence') as string) || 'none') as Recurrence
  if (!RECURRENCES.includes(recurrence)) recurrence = 'none'
  // A task in the Recurring column should actually repeat.
  if (category === 'recurring' && recurrence === 'none') recurrence = 'weekly'

  const recurrence_day = parseRecurrenceDay(recurrence, formData.get('recurrence_day'))

  const { error } = await getSupabase()
    .from('tasks')
    .insert({
      title,
      priority,
      due_date: due,
      company,
      category,
      recurrence,
      recurrence_day,
      source: 'manual',
      created_by: 'user',
      created_by_email: await currentAuthorEmail(),
      sort_order: await nextSortOrder(category),
    })
  if (error) throw new Error(error.message)

  refresh()
}

/** Edit an existing task's fields (from the task-edit modal). */
export async function updateTask(formData: FormData) {
  const id = (formData.get('id') as string | null)?.trim()
  if (!id) return

  const title = (formData.get('title') as string | null)?.trim()
  if (!title) return // title is required; ignore a blank save

  const notes = ((formData.get('notes') as string) || '').trim() || null
  const company = ((formData.get('company') as string) || '').trim() || null
  const due = (formData.get('due_date') as string) || null

  let priority = ((formData.get('priority') as string) || 'medium') as Priority
  if (!PRIORITIES.includes(priority)) priority = 'medium'

  let category = ((formData.get('category') as string) || 'general') as TaskCategory
  if (!CATEGORIES.includes(category)) category = 'general'

  let recurrence = ((formData.get('recurrence') as string) || 'none') as Recurrence
  if (!RECURRENCES.includes(recurrence)) recurrence = 'none'
  if (category === 'recurring' && recurrence === 'none') recurrence = 'weekly'

  const recurrence_day = parseRecurrenceDay(recurrence, formData.get('recurrence_day'))

  const { error } = await getSupabase()
    .from('tasks')
    .update({
      title,
      notes,
      company,
      due_date: due,
      priority,
      category,
      recurrence,
      recurrence_day,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)

  refresh()
}

export async function toggleTask(id: string, done: boolean) {
  const supabase = getSupabase()

  // If we're completing a recurring task, spawn its next occurrence first.
  if (done) {
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (task && task.recurrence && task.recurrence !== 'none') {
      const { error: insErr } = await supabase.from('tasks').insert({
        title: task.title,
        notes: task.notes,
        priority: task.priority,
        due_date: advanceDate(task.due_date, task.recurrence, task.recurrence_day),
        category: task.category,
        recurrence: task.recurrence,
        recurrence_day: task.recurrence_day,
        source: task.source,
        tag: task.tag,
        company: task.company,
        created_by: task.created_by,
        created_by_email: task.created_by_email,
        sort_order: task.sort_order,
      })
      if (insErr) throw new Error(insErr.message)
    }
  }

  const { error } = await supabase
    .from('tasks')
    .update({
      done,
      done_at: done ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)

  refresh()
}

export async function deleteTask(id: string) {
  const { error } = await getSupabase().from('tasks').delete().eq('id', id)
  if (error) throw new Error(error.message)
  refresh()
}

export async function setPriority(id: string, priority: Priority) {
  const { error } = await getSupabase()
    .from('tasks')
    .update({ priority, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  refresh()
}

/** Inline card edits — update a single field straight from the Kanban card. */
export async function setTitle(id: string, title: string) {
  const t = title.trim()
  if (!t) return // never blank out the title
  const { error } = await getSupabase()
    .from('tasks')
    .update({ title: t, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  refresh()
}

export async function setCompany(id: string, company: string) {
  const c = company.trim() || null // empty clears the company
  const { error } = await getSupabase()
    .from('tasks')
    .update({ company: c, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  refresh()
}

export async function setDueDate(id: string, due: string | null) {
  const d = due && /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null
  const { error } = await getSupabase()
    .from('tasks')
    .update({ due_date: d, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  refresh()
}

/**
 * Bulk-complete tasks (from a multi-select on the board). Mirrors toggleTask's
 * recurrence behavior: any recurring task being completed first spawns its next
 * occurrence, then all are marked done in one update.
 */
export async function bulkComplete(ids: string[]) {
  if (!ids.length) return
  const supabase = getSupabase()
  const now = new Date().toISOString()

  const { data: rows } = await supabase.from('tasks').select('*').in('id', ids)
  const recurring = (rows ?? []).filter((t) => t.recurrence && t.recurrence !== 'none')
  if (recurring.length) {
    const inserts = recurring.map((t) => ({
      title: t.title,
      notes: t.notes,
      priority: t.priority,
      due_date: advanceDate(t.due_date, t.recurrence, t.recurrence_day),
      category: t.category,
      recurrence: t.recurrence,
      recurrence_day: t.recurrence_day,
      source: t.source,
      tag: t.tag,
      company: t.company,
      created_by: t.created_by,
      created_by_email: t.created_by_email,
      sort_order: t.sort_order,
    }))
    const { error: insErr } = await supabase.from('tasks').insert(inserts)
    if (insErr) throw new Error(insErr.message)
  }

  const { error } = await supabase
    .from('tasks')
    .update({ done: true, done_at: now, updated_at: now })
    .in('id', ids)
  if (error) throw new Error(error.message)
  refresh()
}

/** Bulk-delete tasks (from a multi-select on the board). */
export async function bulkDelete(ids: string[]) {
  if (!ids.length) return
  const { error } = await getSupabase().from('tasks').delete().in('id', ids)
  if (error) throw new Error(error.message)
  refresh()
}

/**
 * Persist a drag-and-drop move on the Kanban board.
 * `orderedIds` is the full, post-move ordering of the destination column.
 * The moved task also gets re-categorized to `toCategory`.
 */
export async function moveTask(
  id: string,
  toCategory: TaskCategory,
  orderedIds: string[],
) {
  if (!CATEGORIES.includes(toCategory)) return
  const supabase = getSupabase()
  const now = new Date().toISOString()

  const updates = orderedIds.map((taskId, index) =>
    supabase
      .from('tasks')
      .update({
        sort_order: index,
        updated_at: now,
        ...(taskId === id ? { category: toCategory } : {}),
      })
      .eq('id', taskId),
  )

  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new Error(failed.error.message)

  refresh()
}

/**
 * "Redo the Day's View." The web app can't read the Outlook calendar itself —
 * only Claudia (Claude Code) can — so this just records a request. Claudia's
 * background refresh task picks it up, re-pulls the calendar, rewrites the day's
 * meetings, and clears the request. Returns a result instead of throwing so the
 * button can show a friendly message.
 */
export async function requestDayRefresh(
  date: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: 'Invalid date' }
  }
  try {
    const now = new Date().toISOString()
    const { error } = await getSupabase()
      .from('day_refresh')
      .upsert(
        { meeting_date: date, requested_at: now, updated_at: now },
        { onConflict: 'meeting_date' },
      )
    if (error) throw new Error(error.message)
    refresh()
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not request a refresh',
    }
  }
}

/**
 * "Regenerate today's briefing." Same bridge as requestDayRefresh — the web app
 * can't read Outlook / Teams / Granola / the calendar, so this records a request
 * in the shared `briefing_state` row (requested_at = now). Claudia's
 * content-refresh watcher (every ~10 min) notices it, re-pulls today's context,
 * rebuilds the briefing, and republishes it via write-briefing.mjs (which stamps
 * last_run_at on the same row and thereby clears the request). A DB row (not a
 * local file) so the hosted button and the Mac engine share state. Returns a
 * result instead of throwing so the button can show a friendly message.
 */
export async function requestBriefingRefresh(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const now = new Date().toISOString()
    const { error } = await getSupabase()
      .from('briefing_state')
      .upsert({ id: 'singleton', requested_at: now, updated_at: now }, { onConflict: 'id' })
    if (error) throw new Error(error.message)
    refresh()
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not request a briefing refresh',
    }
  }
}

/**
 * "Create / Re-generate this day's call report." Same bridge as requestDayRefresh
 * — the web app can't read Granola, only Claudia (Claude Code) can — so this
 * records a request keyed by date in the `call_reports` table. Claudia's
 * call-report watcher (every ~10 min) notices it, pulls that day's calls from the
 * Granola folders, summarizes + tiers them, writes the `calls` rows, and stamps
 * generated_at (which clears the pending state). Returns a result instead of
 * throwing so the button can show a friendly message.
 */
export async function requestCallReport(
  date: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: 'Invalid date' }
  }
  try {
    const now = new Date().toISOString()
    const { error } = await getSupabase()
      .from('call_reports')
      .upsert(
        { report_date: date, requested_at: now, updated_at: now },
        { onConflict: 'report_date' },
      )
    if (error) throw new Error(error.message)
    refresh()
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not request a report',
    }
  }
}

// ---- Suggest-and-approve task creation --------------------------------------

/**
 * "Auto-generate tasks." The web app can't read email / Teams / Granola — only
 * Claudia (Claude Code) can — so this flips the shared state to "working".
 * Claudia's task-scan watcher (every ~30 min) notices it, scans the last 3 days
 * (or since this click, whichever is sooner) READ-ONLY, and writes SUGGESTIONS to
 * `task_suggestions` + sets status "ready". Nothing is added to the board until
 * Shayan approves the suggestions. Returns a result so the button can react.
 */
export async function requestTaskSuggestions(): Promise<
  { ok: true; already?: boolean } | { ok: false; error: string }
> {
  try {
    const supabase = getSupabase()
    const { data: state } = await supabase
      .from('suggestion_state')
      .select('status')
      .eq('id', 'singleton')
      .maybeSingle()
    if (state?.status === 'working') return { ok: true, already: true }

    const now = new Date().toISOString()
    // Fresh batch — clear any leftover suggestions, then flip to working.
    await supabase.from('task_suggestions').delete().not('id', 'is', null)
    const { error } = await supabase.from('suggestion_state').upsert(
      { id: 'singleton', status: 'working', requested_at: now, ready_at: null, count: 0, note: null, updated_at: now },
      { onConflict: 'id' },
    )
    if (error) throw new Error(error.message)
    refresh()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not start a scan' }
  }
}

/** Poll target for the button while a scan is running. */
export async function getSuggestionState(): Promise<{
  status: string
  count: number
  note: string | null
}> {
  try {
    const { data } = await getSupabase()
      .from('suggestion_state')
      .select('status, count, note')
      .eq('id', 'singleton')
      .maybeSingle()
    return {
      status: (data?.status as string) ?? 'idle',
      count: (data?.count as number) ?? 0,
      note: (data?.note as string) ?? null,
    }
  } catch {
    return { status: 'idle', count: 0, note: null }
  }
}

/** The current suggestion batch, for the review popup. */
export async function getSuggestions(): Promise<TaskSuggestion[]> {
  try {
    const { data } = await getSupabase()
      .from('task_suggestions')
      .select('*')
      .order('sort_order', { ascending: true })
    return (data ?? []) as TaskSuggestion[]
  } catch {
    return []
  }
}

/**
 * Approve the ticked suggestions → real tasks; discard the rest. Resolves the
 * whole batch (deletes all suggestions) and returns the board to idle.
 */
export async function approveTaskSuggestions(
  ids: string[],
): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  try {
    const supabase = getSupabase()
    const now = new Date().toISOString()
    let added = 0

    if (ids.length) {
      const { data: sugg, error: selErr } = await supabase
        .from('task_suggestions')
        .select('*')
        .in('id', ids)
      if (selErr) throw new Error(selErr.message)
      const list = (sugg ?? []) as TaskSuggestion[]

      // Append to the bottom of each destination column.
      const byCat = new Map<TaskCategory, TaskSuggestion[]>()
      for (const s of list) {
        const arr = byCat.get(s.category) ?? []
        arr.push(s)
        byCat.set(s.category, arr)
      }
      const rows: Record<string, unknown>[] = []
      for (const [cat, arr] of byCat) {
        const base = await nextSortOrder(cat)
        arr.forEach((s, i) =>
          rows.push({
            title: s.title,
            notes: s.notes,
            priority: s.priority,
            due_date: s.due_date,
            company: s.company,
            category: s.category,
            source: s.source ?? 'email',
            created_by: 'claudia',
            sort_order: base + i,
          }),
        )
      }
      if (rows.length) {
        const { error: insErr } = await supabase.from('tasks').insert(rows)
        if (insErr) throw new Error(insErr.message)
        added = rows.length
      }
    }

    await supabase.from('task_suggestions').delete().not('id', 'is', null)
    await supabase
      .from('suggestion_state')
      .upsert({ id: 'singleton', status: 'idle', count: 0, updated_at: now }, { onConflict: 'id' })
    refresh()
    return { ok: true, added }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not add tasks' }
  }
}

/** Discard the whole suggestion batch without adding anything. */
export async function dismissTaskSuggestions(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const supabase = getSupabase()
    await supabase.from('task_suggestions').delete().not('id', 'is', null)
    await supabase.from('suggestion_state').upsert(
      { id: 'singleton', status: 'idle', count: 0, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    )
    refresh()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not discard suggestions' }
  }
}
