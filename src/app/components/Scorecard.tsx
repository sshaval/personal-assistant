'use client'

import type { AnalysisEntry } from '@/lib/cim-meta'
import { CRITERIA_BY_N, ratingBand, scoreChipClass } from '@/lib/cim-meta'

function tooltipFor(n: number, score: number | null): string {
  const m = CRITERIA_BY_N[n]
  if (!m) return ''
  const lines = [`${m.label}  ·  weight ${m.weight}  ·  ${m.type === 'quant' ? 'Quantitative' : 'Qualitative'}`]
  if (score != null && m.tiers[score]) lines.push(`\nScore ${score}/5 — ${m.tiers[score]}`)
  lines.push(`\n${m.rationale}`)
  return lines.join('\n')
}

export function Scorecard({ entry }: { entry: AnalysisEntry }) {
  const band = ratingBand(entry.score)
  const pct = entry.score != null ? Math.max(0, Math.min(100, entry.score)) : 0

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{entry.company}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${band.chip}`}>
          {entry.rating ?? band.label}
        </span>
        <div className="ml-auto flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums">
            {entry.score != null ? entry.score.toFixed(1) : '—'}
          </span>
          <span className="text-xs text-black/40 dark:text-white/40">/ 100</span>
        </div>
      </div>

      {/* Score bar */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/[.06] dark:bg-white/10">
        <div className={`h-full rounded-full ${band.bar}`} style={{ width: `${pct}%` }} />
      </div>

      {/* 15 criteria */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {entry.cells.map((c) => {
          const meta = CRITERIA_BY_N[c.n]
          return (
            <div
              key={c.n}
              title={tooltipFor(c.n, c.score)}
              className="rounded-lg border border-black/[.06] bg-black/[.015] p-2.5 dark:border-white/[.06] dark:bg-white/[.02]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold leading-tight">{meta?.short ?? `#${c.n}`}</p>
                  <p className="text-[9px] uppercase tracking-wide text-black/35 dark:text-white/35">
                    wt {meta?.weight ?? '—'}
                  </p>
                </div>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${scoreChipClass(c.score)}`}
                >
                  {c.score ?? '–'}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-black/55 dark:text-white/55">
                {c.detail || '—'}
              </p>
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-[10px] text-black/30 dark:text-white/30">
        Hover any criterion for its scoring rule. Weights total 100; score = Σ(points × weight) / 500 × 100.
      </p>
    </div>
  )
}
