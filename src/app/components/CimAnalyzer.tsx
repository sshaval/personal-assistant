'use client'

import { useMemo, useState } from 'react'
import type { AnalysisEntry, CimKind } from '@/lib/cim-meta'
import { ratingBand } from '@/lib/cim-meta'
import { Scorecard } from './Scorecard'

const TABS: { key: CimKind; label: string; blurb: string }[] = [
  { key: 'cim', label: 'CIMs', blurb: 'Acquisition targets, scored from their CIM' },
  { key: 'portfolio', label: 'Portfolio', blurb: 'Businesses we own — scorecard + MTD' },
]

type Props = {
  cims: AnalysisEntry[]
  portfolio: AnalysisEntry[]
  cimError: string | null
  portfolioError: string | null
}

function docTag(entry: AnalysisEntry): string {
  if (entry.doc.type === 'pdf') return entry.doc.label === 'CIM Analysis' ? 'PDF' : entry.doc.label
  if (entry.doc.type === 'xlsx') return 'XLS'
  return '—'
}

export function CimAnalyzer({ cims, portfolio, cimError, portfolioError }: Props) {
  const [tab, setTab] = useState<CimKind>('cim')
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState<{ cim: string | null; portfolio: string | null }>({
    cim: null,
    portfolio: null,
  })

  const all = tab === 'cim' ? cims : portfolio
  const error = tab === 'cim' ? cimError : portfolioError

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? all.filter((e) => e.company.toLowerCase().includes(q)) : all
  }, [all, query])

  const selected =
    sel[tab] && filtered.some((e) => e.company === sel[tab])
      ? sel[tab]
      : (filtered[0]?.company ?? null)
  const entry = all.find((e) => e.company === selected) ?? null

  const fileUrl =
    entry && entry.doc.type
      ? `/cim/file?kind=${tab}&company=${encodeURIComponent(entry.company)}`
      : null

  return (
    <div className="px-4 py-5 md:px-6 lg:px-8">
      {/* Header + tabs */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">CIM Analyzer</h1>
          <p className="mt-0.5 text-[13px] text-black/50 dark:text-white/50">
            {TABS.find((t) => t.key === tab)?.blurb} · auto-updates from the analysis folder.
          </p>
        </div>
        <div className="flex gap-1 rounded-xl bg-black/[.04] p-1 dark:bg-white/[.06]">
          {TABS.map((t) => {
            const count = t.key === 'cim' ? cims.length : portfolio.length
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key)
                  setQuery('')
                }}
                className={[
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                    : 'text-black/55 hover:text-black/80 dark:text-white/55 dark:hover:text-white/85',
                ].join(' ')}
              >
                {t.label}
                <span className="ml-1.5 text-[11px] text-black/35 dark:text-white/35">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="font-semibold">Couldn’t read the CIM Analyzer folder.</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-[13px] text-amber-800/80 dark:text-amber-200/70">
            Check that <code className="rounded bg-black/10 px-1">CIM_ANALYZER_DIR</code> in{' '}
            <code className="rounded bg-black/10 px-1">.env.local</code> points to the folder, then
            restart the dev server.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4 lg:flex-row">
          {/* Company list */}
          <div className="w-full shrink-0 lg:w-72">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${all.length} companies…`}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/25 dark:border-white/10 dark:bg-zinc-900 dark:focus:border-white/25"
            />
            <ul className="mt-2 max-h-[78vh] space-y-1 overflow-y-auto pr-1">
              {filtered.map((e) => {
                const band = ratingBand(e.score)
                const active = e.company === selected
                return (
                  <li key={e.company}>
                    <button
                      onClick={() => setSel((s) => ({ ...s, [tab]: e.company }))}
                      className={[
                        'flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors',
                        active
                          ? 'border-black/15 bg-black/[.04] dark:border-white/20 dark:bg-white/[.07]'
                          : 'border-transparent hover:bg-black/[.03] dark:hover:bg-white/[.04]',
                      ].join(' ')}
                    >
                      <span
                        className={`flex h-7 w-9 shrink-0 items-center justify-center rounded-md text-xs font-bold tabular-nums ${band.chip}`}
                      >
                        {e.score != null ? e.score.toFixed(0) : '—'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{e.company}</span>
                        <span className="block truncate text-[11px] text-black/40 dark:text-white/40">
                          {e.rating ?? band.label}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-[10px] font-medium ${
                          entry && e.doc.type === null
                            ? 'text-black/25 dark:text-white/25'
                            : 'text-black/40 dark:text-white/40'
                        }`}
                      >
                        {docTag(e)}
                      </span>
                    </button>
                  </li>
                )
              })}
              {filtered.length === 0 && (
                <li className="rounded-lg border border-dashed border-black/10 py-6 text-center text-[12px] text-black/30 dark:border-white/10 dark:text-white/30">
                  No companies match “{query}”.
                </li>
              )}
            </ul>
          </div>

          {/* Detail */}
          <div className="min-w-0 flex-1">
            {!entry ? (
              <div className="rounded-2xl border border-dashed border-black/10 py-20 text-center text-sm text-black/40 dark:border-white/10 dark:text-white/40">
                Select a company to see its scorecard.
              </div>
            ) : (
              <>
                <Scorecard entry={entry} />

                {/* Document */}
                <div className="mt-4">
                  {fileUrl && entry.doc.type === 'pdf' ? (
                    <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
                      <div className="flex items-center justify-between gap-2 border-b border-black/[.06] bg-black/[.02] px-3 py-2 dark:border-white/[.06] dark:bg-white/[.03]">
                        <span className="truncate text-[12px] font-medium text-black/60 dark:text-white/60">
                          {entry.doc.label}: {entry.doc.filename}
                        </span>
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-md px-2 py-1 text-[12px] font-medium text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"
                        >
                          Open ↗
                        </a>
                      </div>
                      <iframe
                        key={fileUrl}
                        src={fileUrl}
                        title={`${entry.company} — ${entry.doc.label}`}
                        className="h-[80vh] w-full bg-white"
                      />
                    </div>
                  ) : entry.doc.type === 'xlsx' && fileUrl ? (
                    <div className="rounded-2xl border border-black/10 bg-black/[.015] p-6 text-center dark:border-white/10 dark:bg-white/[.02]">
                      <p className="text-sm font-medium">Only an Excel model is available</p>
                      <p className="mx-auto mt-1 max-w-md text-[13px] text-black/50 dark:text-white/50">
                        No MTD/DD-Update PDF has been generated for {entry.company} yet. You can open
                        the financial model directly.
                      </p>
                      <a
                        href={fileUrl}
                        className="mt-3 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        Download {entry.doc.filename}
                      </a>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-black/10 p-6 text-center dark:border-white/10">
                      <p className="text-sm font-medium text-black/60 dark:text-white/60">
                        No document yet
                      </p>
                      <p className="mx-auto mt-1 max-w-md text-[13px] text-black/45 dark:text-white/45">
                        The scorecard is ready. The{' '}
                        {tab === 'cim' ? 'CIM analysis PDF' : 'MTD / DD-Update PDF'} will appear here
                        automatically once it’s added to the folder.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
