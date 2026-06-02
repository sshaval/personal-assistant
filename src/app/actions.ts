'use server'

import { revalidatePath } from 'next/cache'
import { getSupabase } from '@/lib/supabase'
import type { Priority, Recurrence, TaskCategory } from '@/lib/types'

// Revalidate the whole tree so the persistent right rail updates on every page.
function refresh() {
  revalidatePath('/', 'layout')
}

const CATEGORIES: TaskCategory[] = ['portfolio', 'pipeline', 'general', 'recurring']
const RECURRENCES: Recurrence[] = ['none', 'daily', 'weekly', 'monthly']

function advanceDate(due: string | null, rec: Recurrence): string {
  const base = due ? new Date(due + 'T00:00:00Z') : new Date()
  const d = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()),
  )
  if (rec === 'daily') d.setUTCDate(d.getUTCDate() + 1)
  else if (rec === 'weekly') d.setUTCDate(d.getUTCDate() + 7)
  else if (rec === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1)
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

  const priority = ((formData.get('priority') as string) || 'medium') as Priority
  const due = (formData.get('due_date') as string) || null

  let category = ((formData.get('category') as string) || 'general') as TaskCategory
  if (!CATEGORIES.includes(category)) category = 'general'

  let recurrence = ((formData.get('recurrence') as string) || 'none') as Recurrence
  if (!RECURRENCES.includes(recurrence)) recurrence = 'none'
  // A task in the Recurring column should actually repeat.
  if (category === 'recurring' && recurrence === 'none') recurrence = 'weekly'

  const { error } = await getSupabase()
    .from('tasks')
    .insert({
      title,
      priority,
      due_date: due,
      category,
      recurrence,
      source: 'manual',
      created_by: 'user',
      sort_order: await nextSortOrder(category),
    })
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
        due_date: advanceDate(task.due_date, task.recurrence),
        category: task.category,
        recurrence: task.recurrence,
        source: task.source,
        tag: task.tag,
        created_by: task.created_by,
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
