'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task, TaskCategory, Priority } from '@/lib/types'
import { CATEGORY_ORDER, CATEGORY_META, recurrenceText } from '@/lib/types'
import {
  dueMeta,
  addDaysISO,
  sortByOrder,
  sortTasks,
  TASK_SORT_DEFAULT_DIR,
  type TaskSortMode,
  type SortDir,
} from '@/lib/util'
import {
  moveTask,
  toggleTask,
  deleteTask,
  setPriority,
  setTitle,
  setCompany,
  setDueDate,
  bulkComplete,
  bulkDelete,
} from '../actions'
import { CreatorBadge } from './CreatorBadge'
import { AddTaskForm } from './AddTaskForm'
import { TaskEditModal } from './TaskEditModal'

type Containers = Record<TaskCategory, string[]>
type PriorityFilter = 'all' | Priority
type DueFilter = 'all' | 'overdue' | 'today' | 'week' | 'none'

const priorityStyles: Record<Task['priority'], string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
}
const dueStyles = {
  overdue: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  today: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  none: '',
}

// Priority highlight for the TOP of a card: high = light red, medium = yellow.
const priorityTint: Record<Task['priority'], string> = {
  high: 'bg-red-100 dark:bg-red-500/15',
  medium: 'bg-yellow-100 dark:bg-yellow-500/15',
  low: '',
}

function catOf(t: Task): TaskCategory {
  return t.category && CATEGORY_ORDER.includes(t.category) ? t.category : 'general'
}

function buildContainers(open: Task[]): Containers {
  const c: Containers = { portfolio: [], pipeline: [], general: [], recurring: [] }
  for (const cat of CATEGORY_ORDER) {
    c[cat] = open
      .filter((t) => catOf(t) === cat)
      .sort(sortByOrder)
      .map((t) => t.id)
  }
  return c
}

function signatureOf(open: Task[]): string {
  return open
    .map((t) => `${t.id}:${t.category}:${t.sort_order}`)
    .sort()
    .join('|')
}

/** Does a task fall in the chosen due-time bucket? */
function matchesDue(task: Task, filter: DueFilter, todayIso: string): boolean {
  const d = task.due_date
  if (filter === 'all') return true
  if (filter === 'none') return !d
  if (!d) return false
  if (filter === 'overdue') return d < todayIso
  if (filter === 'today') return d === todayIso
  // 'week' — due within the next 7 days (after today).
  return d > todayIso && d <= addDaysISO(todayIso, 7)
}

/**
 * Pointer-first collision detection: whichever column/card is literally under
 * the cursor wins. Far more reliable than closestCorners for moving cards
 * between columns of different heights (tall columns put their corners far from
 * the pointer, which made cross-column drops nearly impossible). Falls back to
 * rectangle overlap when the pointer sits in the gap between columns.
 */
const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args)
  return pointerHits.length > 0 ? pointerHits : rectIntersection(args)
}

/** Read-only card content used only by the drag overlay (the drag "ghost"). */
function CardFace({ task }: { task: Task }) {
  return (
    <>
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium">{task.title}</p>
        <CreatorBadge by={task.created_by} email={task.created_by_email} size={20} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityStyles[task.priority]}`}
        >
          {task.priority}
        </span>
        {task.recurrence && task.recurrence !== 'none' && (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
            ↻ {recurrenceText(task.recurrence, task.recurrence_day)}
          </span>
        )}
        {task.company && (
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
            {task.company}
          </span>
        )}
      </div>
    </>
  )
}

function KanbanCard({
  task,
  todayIso,
  onEdit,
  dragDisabled,
  selected,
  onToggleSelect,
}: {
  task: Task
  todayIso: string
  onEdit: (t: Task) => void
  dragDisabled: boolean
  selected: boolean
  onToggleSelect: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: dragDisabled,
  })
  const [isPending, startTransition] = useTransition()
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingCompany, setEditingCompany] = useState(false)
  const stop = (e: React.PointerEvent) => e.stopPropagation()

  // Distinguish a click on the title (open inline edit) from the start of a drag.
  const downPos = useRef<{ x: number; y: number } | null>(null)
  const onTitlePointerDown = (e: React.PointerEvent) => {
    downPos.current = { x: e.clientX, y: e.clientY }
  }
  const onTitleClick = (e: React.MouseEvent) => {
    const d = downPos.current
    downPos.current = null
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return // it was a drag
    setEditingTitle(true)
  }

  function saveTitle(v: string) {
    const val = v.trim()
    setEditingTitle(false)
    if (val && val !== task.title) startTransition(() => setTitle(task.id, val))
  }
  function saveCompany(v: string) {
    const val = v.trim()
    setEditingCompany(false)
    if (val !== (task.company ?? '')) startTransition(() => setCompany(task.id, val))
  }

  const due = dueMeta(task.due_date, todayIso)
  const overdue = due.tone === 'overdue'
  const dueToday = due.tone === 'today'

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`group touch-none overflow-hidden rounded-xl border bg-white shadow-sm transition dark:bg-zinc-900 ${
        selected
          ? 'border-blue-500 ring-1 ring-blue-500/40'
          : 'border-black/10 dark:border-white/10'
      } ${isDragging ? 'opacity-40' : ''} ${isPending ? 'opacity-50' : ''} ${
        dragDisabled ? '' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      {/* Top — highlighted by priority (high = light red, medium = yellow) */}
      <div className={`p-3 ${priorityTint[task.priority]}`}>
        <div className="flex items-start gap-2">
          {/* Mark complete — large round button before the title */}
          <button
            type="button"
            onPointerDown={stop}
            onClick={() => startTransition(() => toggleTask(task.id, !task.done))}
            aria-label="Mark complete"
            title="Mark complete"
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-black/25 text-transparent transition hover:border-emerald-500 hover:text-emerald-500 dark:border-white/30 dark:hover:border-emerald-400"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3 w-3">
              <path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {editingTitle ? (
            <input
              defaultValue={task.title}
              autoFocus
              onPointerDown={stop}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.currentTarget.blur()
                } else if (e.key === 'Escape') {
                  e.currentTarget.value = task.title
                  e.currentTarget.blur()
                }
              }}
              onBlur={(e) => saveTitle(e.currentTarget.value)}
              className="min-w-0 flex-1 rounded border border-blue-500 bg-white px-1.5 py-0.5 text-sm font-medium outline-none dark:bg-black/40"
            />
          ) : (
            <p
              className="min-w-0 flex-1 cursor-text text-sm font-medium hover:underline"
              onPointerDown={onTitlePointerDown}
              onClick={onTitleClick}
              title="Click to edit"
            >
              {task.title}
            </p>
          )}
          <CreatorBadge by={task.created_by} email={task.created_by_email} size={20} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {/* Priority — click opens the dropdown */}
          <select
            value={task.priority}
            onPointerDown={stop}
            onChange={(e) =>
              startTransition(() => setPriority(task.id, e.target.value as Priority))
            }
            title="Change priority"
            className="cursor-pointer rounded-full border border-black/10 bg-black/[.03] px-2 py-0.5 text-[11px] font-medium text-black/70 outline-none hover:bg-black/[.06] dark:border-white/15 dark:bg-white/10 dark:text-white/80"
          >
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </select>

          {task.recurrence && task.recurrence !== 'none' && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              ↻ {recurrenceText(task.recurrence, task.recurrence_day)}
            </span>
          )}

          {/* Company — click to edit inline */}
          {editingCompany ? (
            <input
              defaultValue={task.company ?? ''}
              autoFocus
              placeholder="Company"
              onPointerDown={stop}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.currentTarget.blur()
                } else if (e.key === 'Escape') {
                  e.currentTarget.value = task.company ?? ''
                  e.currentTarget.blur()
                }
              }}
              onBlur={(e) => saveCompany(e.currentTarget.value)}
              className="w-28 rounded-full border border-blue-500 bg-white px-2 py-0.5 text-[11px] font-medium outline-none dark:bg-black/40"
            />
          ) : task.company ? (
            <button
              type="button"
              onPointerDown={stop}
              onClick={() => setEditingCompany(true)}
              title="Click to edit company"
              className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700 hover:brightness-95 dark:bg-indigo-500/15 dark:text-indigo-300"
            >
              {task.company}
            </button>
          ) : (
            <button
              type="button"
              onPointerDown={stop}
              onClick={() => setEditingCompany(true)}
              title="Add company"
              className="rounded-full border border-dashed border-black/20 px-2 py-0.5 text-[11px] font-medium text-black/35 hover:text-black/60 dark:border-white/20 dark:text-white/35 dark:hover:text-white/70"
            >
              + company
            </button>
          )}
        </div>
      </div>

      {/* Bottom — overdue turns it dark red */}
      <div
        className={`flex items-center justify-between gap-2 border-t px-3 py-2 ${
          overdue
            ? 'border-red-700/40 bg-red-600 dark:bg-red-700'
            : dueToday
              ? 'border-yellow-600/40 bg-yellow-500 dark:bg-yellow-600'
              : 'border-black/[.06] dark:border-white/[.06]'
        }`}
      >
        {/* Due date — click opens the calendar; shows "No due date" when empty */}
        <span className="relative inline-flex items-center" onPointerDown={stop}>
          <span
            className={
              overdue
                ? 'text-[11px] font-semibold text-white'
                : dueToday
                  ? 'text-[11px] font-semibold text-black/85'
                  : due.tone !== 'none'
                    ? `rounded-full px-2 py-0.5 text-[11px] font-medium ${dueStyles[due.tone]}`
                    : 'rounded-full border border-dashed border-black/20 px-2 py-0.5 text-[11px] font-medium text-black/40 dark:border-white/20 dark:text-white/40'
            }
          >
            {due.tone !== 'none' ? due.label : 'No due date'}
          </span>
          <input
            type="date"
            value={task.due_date ?? ''}
            onChange={(e) => startTransition(() => setDueDate(task.id, e.target.value || null))}
            onClick={(e) => {
              try {
                e.currentTarget.showPicker()
              } catch {}
            }}
            aria-label="Set due date"
            className="absolute inset-0 w-full cursor-pointer opacity-0"
          />
        </span>

        {/* Right actions — reveal on hover (select stays shown when ticked) */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(task.id)}
            onPointerDown={stop}
            aria-label="Select task"
            title="Select for bulk actions"
            className={`h-3.5 w-3.5 cursor-pointer rounded-sm accent-blue-600 transition ${
              selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          />
          <button
            type="button"
            onPointerDown={stop}
            onClick={() => onEdit(task)}
            aria-label="Edit task"
            title="Edit task details"
            className={`opacity-0 transition group-hover:opacity-100 ${
              overdue
                ? 'text-white/80 hover:text-white'
                : dueToday
                  ? 'text-black/55 hover:text-black/85'
                  : 'text-black/40 hover:text-black/75 dark:text-white/40 dark:hover:text-white/80'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
              <path
                d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onPointerDown={stop}
            onClick={() => startTransition(() => deleteTask(task.id))}
            aria-label="Delete task"
            title="Delete task"
            className={`opacity-0 transition group-hover:opacity-100 ${
              overdue
                ? 'text-white/80 hover:text-white'
                : dueToday
                  ? 'text-black/55 hover:text-red-700'
                  : 'text-black/40 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
              <path
                d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M10 11v6M14 11v6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </li>
  )
}

function Column({
  cat,
  tasks,
  todayIso,
  onEdit,
  dragDisabled,
  selected,
  onToggleSelect,
  onSetMany,
}: {
  cat: TaskCategory
  tasks: Task[]
  todayIso: string
  onEdit: (t: Task) => void
  dragDisabled: boolean
  selected: Set<string>
  onToggleSelect: (id: string) => void
  onSetMany: (ids: string[], on: boolean) => void
}) {
  const meta = CATEGORY_META[cat]
  // The whole column is the drop target, so a card dropped anywhere in it lands.
  const { setNodeRef, isOver } = useDroppable({ id: cat })

  const colIds = tasks.map((t) => t.id)
  const allSel = colIds.length > 0 && colIds.every((id) => selected.has(id))
  const someSel = colIds.some((id) => selected.has(id))
  const cbRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (cbRef.current) cbRef.current.indeterminate = someSel && !allSel
  }, [someSel, allSel])

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-0 flex-col rounded-2xl border bg-black/[.015] transition-colors lg:min-h-0 dark:bg-white/[.02] ${
        isOver
          ? 'border-blue-500/40 ring-2 ring-inset ring-blue-500/30'
          : 'border-black/10 dark:border-white/10'
      }`}
    >
      <div className="flex items-center gap-2 px-3.5 pt-3.5 pb-2">
        <input
          ref={cbRef}
          type="checkbox"
          checked={allSel}
          disabled={colIds.length === 0}
          onChange={() => onSetMany(colIds, !allSel)}
          aria-label={`Select all in ${meta.label}`}
          title={`Select all in ${meta.label}`}
          className="h-4 w-4 cursor-pointer rounded accent-blue-600 disabled:opacity-30"
        />
        <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
        <h3 className="text-sm font-semibold">{meta.label}</h3>
        <span className="text-xs text-black/40 dark:text-white/40">{tasks.length}</span>
      </div>
      <p className="px-3.5 pb-2 text-[11px] text-black/40 dark:text-white/40">{meta.blurb}</p>

      <div
        className={`min-h-[120px] flex-1 space-y-2 rounded-xl px-2.5 pb-2 transition-colors lg:min-h-0 lg:overflow-y-auto ${
          isOver ? 'bg-blue-500/[.06]' : ''
        }`}
      >
        <SortableContext items={colIds} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {tasks.map((t) => (
              <KanbanCard
                key={t.id}
                task={t}
                todayIso={todayIso}
                onEdit={onEdit}
                dragDisabled={dragDisabled}
                selected={selected.has(t.id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </ul>
        </SortableContext>
        {tasks.length === 0 && (
          <div className="rounded-lg border border-dashed border-black/10 py-4 text-center text-[11px] text-black/30 dark:border-white/10 dark:text-white/30">
            No tasks here
          </div>
        )}
      </div>

      <div className="px-2.5 pb-3">
        <AddTaskForm variant="column" fixedCategory={cat} />
      </div>
    </div>
  )
}

/** A native <select> styled as a filter pill (highlighted when a value is set). */
function PillSelect({
  active,
  value,
  onChange,
  title,
  children,
}: {
  active: boolean
  value: string
  onChange: (v: string) => void
  title: string
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={title}
      className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium outline-none transition-colors ${
        active
          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
          : 'border border-black/10 text-black/60 hover:bg-black/[.04] dark:border-white/10 dark:text-white/60 dark:hover:bg-white/[.06]'
      }`}
    >
      {children}
    </select>
  )
}

/** Company filter — a pill that opens a checkbox list so several can be picked. */
function CompanyFilter({
  companies,
  selected,
  onChange,
}: {
  companies: string[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const count = selected.size
  const active = count > 0
  const label = count === 0 ? 'Company' : count === 1 ? [...selected][0] : `${count} companies`

  function toggle(c: string) {
    const n = new Set(selected)
    if (n.has(c)) n.delete(c)
    else n.add(c)
    onChange(n)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Filter by company"
        className={`inline-flex max-w-[12rem] items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          active
            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
            : 'border border-black/10 text-black/60 hover:bg-black/[.04] dark:border-white/10 dark:text-white/60 dark:hover:bg-white/[.06]'
        }`}
      >
        <span className="truncate">{label}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3 w-3 shrink-0">
          <path d="M6 9l6 6 6-6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border border-black/10 bg-white p-1 shadow-lg dark:border-white/15 dark:bg-zinc-900">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-medium tracking-wide text-black/40 uppercase dark:text-white/40">
              Companies
            </span>
            {count > 0 && (
              <button
                type="button"
                onClick={() => onChange(new Set())}
                className="text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Clear
              </button>
            )}
          </div>
          {companies.map((c) => {
            const on = selected.has(c)
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggle(c)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-black/[.04] dark:hover:bg-white/[.06]"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    on
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-black/25 dark:border-white/30'
                  }`}
                >
                  {on && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3 w-3">
                      <path
                        d="M5 13l4 4L19 7"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="truncate">{c}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function KanbanBoard({ tasks, todayIso }: { tasks: Task[]; todayIso: string }) {
  const open = tasks.filter((t) => !t.done)
  const tasksById = Object.fromEntries(open.map((t) => [t.id, t])) as Record<string, Task>

  const [containers, setContainers] = useState<Containers>(() => buildContainers(open))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<TaskSortMode>('created')
  const [sortDir, setSortDir] = useState<SortDir>(TASK_SORT_DEFAULT_DIR.created)
  const [filterPriority, setFilterPriority] = useState<PriorityFilter>('all')
  const [filterCompanies, setFilterCompanies] = useState<Set<string>>(() => new Set())
  const [filterDue, setFilterDue] = useState<DueFilter>('all')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [isBulkPending, startBulk] = useTransition()
  const [, startTransition] = useTransition()

  const filtersActive =
    filterPriority !== 'all' || filterCompanies.size > 0 || filterDue !== 'all'
  // A field sort or an active filter overrides the manual drag order, so dragging
  // is paused then (it would just snap back). Manual + no filters = full DnD.
  const dragDisabled = sortMode !== 'manual' || filtersActive

  function onSortChange(v: string) {
    if (v === 'manual') {
      setSortMode('manual')
      return
    }
    const [field, dir] = v.split(':') as [TaskSortMode, SortDir]
    setSortMode(field)
    setSortDir(dir)
  }
  const sortValue = sortMode === 'manual' ? 'manual' : `${sortMode}:${sortDir}`

  const passesFilters = (t: Task) =>
    (filterPriority === 'all' || t.priority === filterPriority) &&
    (filterCompanies.size === 0 || (t.company != null && filterCompanies.has(t.company))) &&
    matchesDue(t, filterDue, todayIso)

  const companies = Array.from(
    new Set(open.map((t) => t.company).filter((c): c is string => Boolean(c))),
  ).sort((a, b) => a.localeCompare(b))

  // Selection helpers.
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  function setMany(ids: string[], on: boolean) {
    setSelected((prev) => {
      const n = new Set(prev)
      ids.forEach((id) => (on ? n.add(id) : n.delete(id)))
      return n
    })
  }
  function clearSelection() {
    setSelected(new Set())
  }

  // Always-fresh view of the container ordering for drag-end math.
  const containersRef = useRef(containers)
  containersRef.current = containers

  // Re-sync from server data whenever it changes (and we're not mid-drag).
  const sig = signatureOf(open)
  useEffect(() => {
    setContainers(buildContainers(open))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const findContainer = (id: string): TaskCategory | undefined => {
    const c = containersRef.current
    if (id in c) return id as TaskCategory
    return (Object.keys(c) as TaskCategory[]).find((k) => c[k].includes(id))
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string)
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    const activeC = findContainer(active.id as string)
    const overC = findContainer(over.id as string)
    if (!activeC || !overC || activeC === overC) return

    setContainers((prev) => {
      const activeItems = prev[activeC]
      const overItems = prev[overC]
      const overIsContainer = (over.id as string) in prev
      const overIndex = overIsContainer ? overItems.length : overItems.indexOf(over.id as string)
      const insertAt = overIndex >= 0 ? overIndex : overItems.length
      return {
        ...prev,
        [activeC]: activeItems.filter((id) => id !== active.id),
        [overC]: [
          ...overItems.slice(0, insertAt),
          active.id as string,
          ...overItems.slice(insertAt),
        ],
      }
    })
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setActiveId(null)
    const current = containersRef.current
    const activeC = findContainer(active.id as string)
    if (!activeC) return

    const items = current[activeC]
    const oldIndex = items.indexOf(active.id as string)
    let newIndex = items.length - 1
    if (over && !((over.id as string) in current)) {
      const oi = items.indexOf(over.id as string)
      if (oi >= 0) newIndex = oi
    }
    const reordered = oldIndex === newIndex ? items : arrayMove(items, oldIndex, newIndex)
    setContainers({ ...current, [activeC]: reordered })
    startTransition(() => moveTask(active.id as string, activeC, reordered))
  }

  // Filtered (and, when not hand-arranging, sorted) tasks per column.
  const visibleByCat = {} as Record<TaskCategory, Task[]>
  for (const cat of CATEGORY_ORDER) {
    const list = containers[cat]
      .map((id) => tasksById[id])
      .filter((t): t is Task => Boolean(t))
      .filter(passesFilters)
    visibleByCat[cat] = dragDisabled ? sortTasks(list, sortMode, sortDir) : list
  }
  const visibleIds = CATEGORY_ORDER.flatMap((cat) => visibleByCat[cat].map((t) => t.id))
  const selectedIds = visibleIds.filter((id) => selected.has(id))
  const selCount = selectedIds.length
  const allVisibleSelected = visibleIds.length > 0 && selCount === visibleIds.length

  const allRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = selCount > 0 && !allVisibleSelected
  }, [selCount, allVisibleSelected])

  function completeSelected() {
    if (!selCount) return
    const ids = selectedIds
    clearSelection()
    startBulk(() => bulkComplete(ids))
  }
  function deleteSelected() {
    if (!selCount) return
    const ids = selectedIds
    clearSelection()
    startBulk(() => bulkDelete(ids))
  }

  const activeTask = activeId ? tasksById[activeId] : null
  const editingTask = editingId ? tasksById[editingId] : null

  return (
    <>
      {/* Sort (one dropdown) + filter pills */}
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-black/40 uppercase dark:text-white/40">
          Sort
          <select
            value={sortValue}
            onChange={(e) => onSortChange(e.target.value)}
            className="cursor-pointer rounded-lg border border-black/10 bg-white px-2 py-1 text-xs font-medium text-black/70 normal-case outline-none dark:border-white/15 dark:bg-white/[.05] dark:text-white/80"
          >
            <option value="manual">Manual (drag order)</option>
            <optgroup label="Created">
              <option value="created:desc">Newest first</option>
              <option value="created:asc">Oldest first</option>
            </optgroup>
            <optgroup label="Due date">
              <option value="due:asc">Soonest first</option>
              <option value="due:desc">Latest first</option>
            </optgroup>
            <optgroup label="Priority">
              <option value="priority:desc">High first</option>
              <option value="priority:asc">Low first</option>
            </optgroup>
            <optgroup label="Company">
              <option value="company:asc">A–Z</option>
              <option value="company:desc">Z–A</option>
            </optgroup>
          </select>
        </label>

        <span className="mx-1 hidden h-4 w-px bg-black/10 sm:inline-block dark:bg-white/10" />

        <PillSelect
          active={filterPriority !== 'all'}
          value={filterPriority}
          onChange={(v) => setFilterPriority(v as PriorityFilter)}
          title="Filter by priority"
        >
          <option value="all">Priority: all</option>
          <option value="high">Priority: high</option>
          <option value="medium">Priority: medium</option>
          <option value="low">Priority: low</option>
        </PillSelect>

        {companies.length > 0 && (
          <CompanyFilter
            companies={companies}
            selected={filterCompanies}
            onChange={setFilterCompanies}
          />
        )}

        <PillSelect
          active={filterDue !== 'all'}
          value={filterDue}
          onChange={(v) => setFilterDue(v as DueFilter)}
          title="Filter by due date"
        >
          <option value="all">Due: all</option>
          <option value="overdue">Due: overdue</option>
          <option value="today">Due: today</option>
          <option value="week">Due: next week</option>
          <option value="none">Due: no date</option>
        </PillSelect>

        {filtersActive && (
          <button
            type="button"
            onClick={() => {
              setFilterPriority('all')
              setFilterCompanies(new Set())
              setFilterDue('all')
            }}
            className="text-xs font-medium text-black/45 hover:text-black/70 dark:text-white/45 dark:hover:text-white/80"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Selection / bulk-action bar */}
      <div className="mb-4 flex shrink-0 flex-wrap items-center gap-3">
        <label
          className="inline-flex items-center gap-2 text-xs font-medium text-black/60 dark:text-white/60"
          title="Select all shown tasks"
        >
          <input
            ref={allRef}
            type="checkbox"
            checked={allVisibleSelected}
            disabled={visibleIds.length === 0}
            onChange={() => setMany(visibleIds, !allVisibleSelected)}
            className="h-4 w-4 cursor-pointer rounded accent-blue-600 disabled:opacity-30"
          />
          Select all
        </label>

        {selCount > 0 ? (
          <>
            <span className="text-xs text-black/50 dark:text-white/50">{selCount} selected</span>
            <button
              type="button"
              onClick={completeSelected}
              disabled={isBulkPending}
              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              ✓ Mark complete
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              disabled={isBulkPending}
              className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-black/45 hover:text-black/70 dark:text-white/45 dark:hover:text-white/80"
            >
              Clear
            </button>
          </>
        ) : (
          <span className="text-xs text-black/35 dark:text-white/35">
            Tick tasks (or a column) to complete or delete them in bulk
            {dragDisabled ? ' · drag paused while sorted/filtered' : ''}
          </span>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:auto-rows-fr lg:grid-cols-2 2xl:grid-cols-4">
          {CATEGORY_ORDER.map((cat) => (
            <Column
              key={cat}
              cat={cat}
              todayIso={todayIso}
              dragDisabled={dragDisabled}
              onEdit={(t) => setEditingId(t.id)}
              selected={selected}
              onToggleSelect={toggleSelect}
              onSetMany={setMany}
              tasks={visibleByCat[cat]}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rotate-2 rounded-xl border border-black/10 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-zinc-900">
              <CardFace task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {editingTask && <TaskEditModal task={editingTask} onClose={() => setEditingId(null)} />}
    </>
  )
}
