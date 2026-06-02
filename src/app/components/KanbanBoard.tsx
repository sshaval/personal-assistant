'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
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
import type { Task, TaskCategory } from '@/lib/types'
import { CATEGORY_ORDER, CATEGORY_META, RECURRENCE_LABEL } from '@/lib/types'
import { dueMeta, sortByOrder } from '@/lib/util'
import { moveTask, toggleTask, deleteTask } from '../actions'
import { CreatorBadge } from './CreatorBadge'
import { AddTaskForm } from './AddTaskForm'

type Containers = Record<TaskCategory, string[]>

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

/** Presentational card content, shared by the sortable card and the drag overlay. */
function CardFace({ task, todayIso }: { task: Task; todayIso: string }) {
  const due = dueMeta(task.due_date, todayIso)
  return (
    <>
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium">{task.title}</p>
        <CreatorBadge by={task.created_by} size={20} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityStyles[task.priority]}`}
        >
          {task.priority}
        </span>
        {due.tone !== 'none' && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${dueStyles[due.tone]}`}>
            {due.label}
          </span>
        )}
        {task.recurrence && task.recurrence !== 'none' && (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
            ↻ {RECURRENCE_LABEL[task.recurrence]}
          </span>
        )}
        {task.tag && (
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">
            {task.tag}
          </span>
        )}
      </div>
    </>
  )
}

function KanbanCard({ task, todayIso }: { task: Task; todayIso: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })
  const [isPending, startTransition] = useTransition()
  const stop = (e: React.PointerEvent) => e.stopPropagation()

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`group touch-none rounded-xl border border-black/10 bg-white p-3 shadow-sm transition dark:border-white/10 dark:bg-zinc-900 ${
        isDragging ? 'opacity-40' : ''
      } ${isPending ? 'opacity-50' : ''} cursor-grab active:cursor-grabbing`}
    >
      <CardFace task={task} todayIso={todayIso} />
      <div className="mt-2 flex items-center justify-between border-t border-black/[.06] pt-2 dark:border-white/[.06]">
        <label
          className="flex cursor-pointer items-center gap-1.5 text-[11px] text-black/45 dark:text-white/45"
          onPointerDown={stop}
        >
          <input
            type="checkbox"
            checked={task.done}
            onChange={() => startTransition(() => toggleTask(task.id, !task.done))}
            className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
          />
          Done
        </label>
        <button
          onPointerDown={stop}
          onClick={() => startTransition(() => deleteTask(task.id))}
          className="rounded px-1 text-[11px] text-black/30 opacity-0 transition group-hover:opacity-100 hover:text-red-600 dark:text-white/30"
        >
          delete
        </button>
      </div>
    </li>
  )
}

function Column({
  cat,
  tasks,
  todayIso,
}: {
  cat: TaskCategory
  tasks: Task[]
  todayIso: string
}) {
  const meta = CATEGORY_META[cat]
  const { setNodeRef, isOver } = useDroppable({ id: cat })

  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-black/10 bg-black/[.015] dark:border-white/10 dark:bg-white/[.02]">
      <div className="flex items-center gap-2 px-3.5 pt-3.5 pb-2">
        <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
        <h3 className="text-sm font-semibold">{meta.label}</h3>
        <span className="text-xs text-black/40 dark:text-white/40">{tasks.length}</span>
      </div>
      <p className="px-3.5 pb-2 text-[11px] text-black/40 dark:text-white/40">{meta.blurb}</p>

      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 px-2.5 pb-2 transition-colors ${
          isOver ? 'bg-blue-500/[.06]' : ''
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {tasks.map((t) => (
              <KanbanCard key={t.id} task={t} todayIso={todayIso} />
            ))}
          </ul>
        </SortableContext>
        {tasks.length === 0 && (
          <div className="rounded-lg border border-dashed border-black/10 py-4 text-center text-[11px] text-black/30 dark:border-white/10 dark:text-white/30">
            Drop tasks here
          </div>
        )}
      </div>

      <div className="px-2.5 pb-3">
        <AddTaskForm variant="column" fixedCategory={cat} />
      </div>
    </div>
  )
}

export function KanbanBoard({ tasks, todayIso }: { tasks: Task[]; todayIso: string }) {
  const open = tasks.filter((t) => !t.done)
  const tasksById = Object.fromEntries(open.map((t) => [t.id, t])) as Record<string, Task>

  const [containers, setContainers] = useState<Containers>(() => buildContainers(open))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

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
    if (id in containers) return id as TaskCategory
    return (Object.keys(containers) as TaskCategory[]).find((k) => containers[k].includes(id))
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
    const activeC = findContainer(active.id as string)
    if (!activeC) return

    const items = containers[activeC]
    const oldIndex = items.indexOf(active.id as string)
    let newIndex = items.length - 1
    if (over && !((over.id as string) in containers)) {
      const oi = items.indexOf(over.id as string)
      if (oi >= 0) newIndex = oi
    }
    const reordered = oldIndex === newIndex ? items : arrayMove(items, oldIndex, newIndex)
    const next = { ...containers, [activeC]: reordered }
    setContainers(next)
    startTransition(() => moveTask(active.id as string, activeC, reordered))
  }

  const activeTask = activeId ? tasksById[activeId] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {CATEGORY_ORDER.map((cat) => (
          <Column
            key={cat}
            cat={cat}
            todayIso={todayIso}
            tasks={containers[cat]
              .map((id) => tasksById[id])
              .filter((t): t is Task => Boolean(t))}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-2 rounded-xl border border-black/10 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-zinc-900">
            <CardFace task={activeTask} todayIso={todayIso} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
