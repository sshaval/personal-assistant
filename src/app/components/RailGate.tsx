'use client'

import { usePathname } from 'next/navigation'
import type { Task } from '@/lib/types'
import { RightRail } from './RightRail'

// The CIM Analyzer needs the full width for its PDF viewer, so the task rail is
// hidden there. Everywhere else it renders normally. (Client component just so we
// can read the current path; the data still comes from the server layout.)
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
  if (pathname.startsWith('/cim')) return null
  return <RightRail tasks={tasks} error={error} todayIso={todayIso} />
}
