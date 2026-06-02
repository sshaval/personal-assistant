import { loadLatestBriefing } from '@/lib/data'
import { friendlyDate } from '@/lib/util'
import { BriefingPanel } from './components/BriefingPanel'

export default async function SummaryPage() {
  const { briefing, error } = await loadLatestBriefing()

  const now = new Date()
  const today = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Toronto',
  })
  const hour = Number(
    now.toLocaleString('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'America/Toronto',
    }),
  )
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-6">
        <p className="text-sm text-black/50 dark:text-white/50">{today}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting}, Shayan
        </h1>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="font-semibold">Database not connected yet</p>
          <p className="mt-1">
            Add your Supabase keys to <code className="font-mono">.env.local</code>, run the SQL in{' '}
            <code className="font-mono">supabase/schema.sql</code> (and the v2 migration), then
            restart the dev server.
          </p>
          <p className="mt-2 font-mono text-xs text-amber-800/80 dark:text-amber-200/70">{error}</p>
        </div>
      )}

      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:p-6 dark:border-white/10 dark:bg-white/[.02]">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Today&apos;s Briefing</h2>
          {briefing && (
            <span className="text-xs text-black/40 dark:text-white/40">
              {friendlyDate(briefing.briefing_date)}
            </span>
          )}
        </div>
        {briefing ? (
          <BriefingPanel content={briefing.content} />
        ) : (
          !error && (
            <p className="text-sm text-black/50 dark:text-white/50">
              No briefing yet. Ask Claude Code to “prepare my briefing” and it will appear here.
            </p>
          )
        )}
      </section>
    </div>
  )
}
