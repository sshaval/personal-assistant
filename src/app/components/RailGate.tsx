'use client'

import { usePathname } from 'next/navigation'
import type { Task } from '@/lib/types'
import { RightRail } from './RightRail'

// The rail is hidden on the CIM Analyzer (its PDF viewer needs the full width),
// the Tasks page (the Kanban board already lists every task, so the rail would be
// redundant), and the Calls page (its calendar + report list want the full width).
// Everywhere else it renders normally. (Client component just so we can read the
// current path; data still comes from the server layout.)
export function RailGate({
  tasks,
  error,
  todayIso,
}: {
  tasks: Task[]
  error: string | null
  todayIso: string
}) {
  const pathname = usePathname()
  if (
    pathname.startsWith('/cim') ||
    pathname.startsWith('/tasks') ||
    pathname.startsWith('/calls')
  )
    return null
  return <RightRail tasks={tasks} error={error} todayIso={todayIso} />
}
