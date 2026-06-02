import Link from 'next/link'
import { loadMeetings, loadDayRefresh } from '@/lib/data'
import { torontoTodayISO, addDaysISO, friendlyDate, friendlyDateTime } from '@/lib/util'
import { MeetingCard } from '../components/MeetingCard'
import { RefreshButton } from '../components/RefreshButton'

type DayKey = 'yesterday' | 'today' | 'tomorrow'

export default async function DayPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>
}) {
  const { d } = await searchParams
  const sel: DayKey = d === 'yesterday' ? 'yesterday' : d === 'tomorrow' ? 'tomorrow' : 'today'

  const today = torontoTodayISO()
  const options: { key: DayKey; label: string; iso: string; href: string }[] = [
    { key: 'yesterday', label: 'Yesterday', iso: addDaysISO(today, -1), href: '/day?d=yesterday' },
    { key: 'today', label: 'Today', iso: today, href: '/day' },
    { key: 'tomorrow', label: 'Tomorrow', iso: addDaysISO(today, 1), href: '/day?d=tomorrow' },
  ]
  const active = options.find((o) => o.key === sel)!
  const [{ meetings, error }, dr] = await Promise.all([
    loadMeetings(active.iso),
    loadDayRefresh(active.iso),
  ])
  const pending = Boolean(
    dr?.requested_at &&
      (!dr.refreshed_at || new Date(dr.requested_at) > new Date(dr.refreshed_at)),
  )
  const updatedLabel = dr?.refreshed_at ? friendlyDateTime(dr.refreshed_at) : null

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Day&apos;s View</h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">{friendlyDate(active.iso)}</p>
      </header>

      {/* Day toggle + refresh */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-black/10 bg-white p-1 dark:border-white/10 dark:bg-white/[.03]">
          {options.map((o) => {
            const isActive = o.key === sel
            return (
              <Link
                key={o.key}
                href={o.href}
                className={[
                  'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'text-black/60 hover:bg-black/[.05] dark:text-white/60 dark:hover:bg-white/[.06]',
                ].join(' ')}
              >
                {o.label}
              </Link>
            )
          })}
        </div>
        <RefreshButton date={active.iso} updatedLabel={updatedLabel} pending={pending} />
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="font-semibold">Database not connected yet</p>
          <p className="mt-1">
            Run <code className="font-mono">migration_v2.sql</code> and{' '}
            <code className="font-mono">seed_meetings.sql</code> in Supabase, then restart the dev
            server.
          </p>
          <p className="mt-2 font-mono text-xs text-amber-800/80 dark:text-amber-200/70">{error}</p>
        </div>
      ) : meetings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 p-10 text-center dark:border-white/15">
          <p className="text-sm text-black/50 dark:text-white/50">
            No meetings recorded for {active.label.toLowerCase()}.
          </p>
          <p className="mt-1 text-xs text-black/35 dark:text-white/35">
            Claudia prepares the day&apos;s meetings from Granola, Outlook &amp; Teams.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {meetings.map((m) => (
            <MeetingCard key={m.id} meeting={m} />
          ))}
        </div>
      )}
    </div>
  )
}
