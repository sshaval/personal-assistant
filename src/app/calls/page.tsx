import { loadCalls, loadCallReport, loadReportDates } from '@/lib/data'
import { torontoTodayISO, friendlyDate, friendlyDateTime } from '@/lib/util'
import { CallsCalendar } from '../components/CallsCalendar'
import { CreateReportButton } from '../components/CreateReportButton'
import { CallsView } from '../components/CallsView'

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>
}) {
  const today = torontoTodayISO()
  const { d } = await searchParams
  // Only honor a valid, non-future date; otherwise default to today.
  const selected = d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today ? d : today

  const [{ calls, error }, report, reportDates] = await Promise.all([
    loadCalls(selected),
    loadCallReport(selected),
    loadReportDates(),
  ])

  const pending = Boolean(
    report?.requested_at &&
      (!report.generated_at || new Date(report.requested_at) > new Date(report.generated_at)),
  )
  const generatedLabel = report?.generated_at ? friendlyDateTime(report.generated_at) : null
  const hasReport = Boolean(report?.generated_at)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Calls</h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          Pick a day, then have Claudia summarize &amp; tier that day&apos;s calls from Granola.
        </p>
      </header>

      <CallsCalendar selected={selected} today={today} reportDates={reportDates} />

      <div className="mt-5 mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">{friendlyDate(selected)}</p>
        <CreateReportButton
          date={selected}
          hasReport={hasReport}
          generatedLabel={generatedLabel}
          pending={pending}
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="font-semibold">Database not connected yet</p>
          <p className="mt-1">
            Run <code className="font-mono">migration_v4.sql</code> in the Supabase SQL editor, then
            restart Claudia.
          </p>
          <p className="mt-2 font-mono text-xs text-amber-800/80 dark:text-amber-200/70">{error}</p>
        </div>
      ) : (
        <CallsView calls={calls} hasReport={hasReport} pending={pending} />
      )}
    </div>
  )
}
