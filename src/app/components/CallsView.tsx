'use client'

import { useState } from 'react'
import type { Call, CallFolder, CallLead, CallTier } from '@/lib/types'
import {
  CALL_FOLDER_ORDER,
  CALL_FOLDER_META,
  CALL_TIER_ORDER,
  CALL_TIER_META,
  CALL_LEAD_ORDER,
  CALL_LEAD_META,
} from '@/lib/types'

type TierSel = 'all' | CallTier
type LeadSel = 'all' | CallLead

export function CallsView({
  calls,
  hasReport,
  pending,
}: {
  calls: Call[]
  hasReport: boolean
  pending: boolean
}) {
  const [tierSel, setTierSel] = useState<TierSel>('all')
  const [leadSel, setLeadSel] = useState<LeadSel>('all')

  if (calls.length === 0) {
    const msg = pending
      ? 'Report requested — Claudia is building it (within ~10 min). Refresh the page to check.'
      : hasReport
        ? 'No calls were found in Granola for this day.'
        : 'No report yet. Click “Create Report” above to have Claudia summarize this day’s calls.'
    return (
      <div className="rounded-2xl border border-dashed border-black/15 p-10 text-center dark:border-white/15">
        <p className="text-sm text-black/50 dark:text-white/50">{msg}</p>
      </div>
    )
  }

  const anyTiered = calls.some((c) => c.tier)
  const leadsPresent = new Set(calls.map((c) => c.lead).filter(Boolean) as CallLead[])

  const filtered = calls.filter((c) => {
    if (leadSel !== 'all' && c.lead !== leadSel) return false
    if (tierSel !== 'all' && c.tier !== tierSel) return false
    return true
  })

  const groups = CALL_FOLDER_ORDER.map((folder) => ({
    folder,
    items: filtered.filter((c) => c.folder === folder),
  })).filter((g) => g.items.length > 0)

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2.5">
        {anyTiered && (
          <FilterRow label="Tier">
            <FilterBtn active={tierSel === 'all'} onClick={() => setTierSel('all')}>
              All
            </FilterBtn>
            {CALL_TIER_ORDER.map((t) => (
              <FilterBtn
                key={t}
                active={tierSel === t}
                onClick={() => setTierSel(t)}
                dot={CALL_TIER_META[t].dot}
              >
                {CALL_TIER_META[t].label}
              </FilterBtn>
            ))}
          </FilterRow>
        )}
        <FilterRow label="Led by">
          <FilterBtn active={leadSel === 'all'} onClick={() => setLeadSel('all')}>
            All
          </FilterBtn>
          {CALL_LEAD_ORDER.filter((l) => leadsPresent.has(l)).map((l) => (
            <FilterBtn
              key={l}
              active={leadSel === l}
              onClick={() => setLeadSel(l)}
              dot={CALL_LEAD_META[l].dot}
            >
              {CALL_LEAD_META[l].label}
            </FilterBtn>
          ))}
        </FilterRow>
      </div>

      {pending && (
        <p className="mb-4 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Re-generating… showing the previous report until Claudia finishes.
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 p-10 text-center dark:border-white/15">
          <p className="text-sm text-black/50 dark:text-white/50">No calls match these filters.</p>
        </div>
      ) : (
        groups.map((g) => <FolderSection key={g.folder} folder={g.folder} items={g.items} />)
      )}
    </div>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 w-12 text-[11px] font-medium tracking-wide text-black/40 uppercase dark:text-white/40">
        {label}
      </span>
      {children}
    </div>
  )
}

function FilterBtn({
  active,
  onClick,
  dot,
  children,
}: {
  active: boolean
  onClick: () => void
  dot?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
          : 'border border-black/10 text-black/60 hover:bg-black/[.04] dark:border-white/10 dark:text-white/60 dark:hover:bg-white/[.06]',
      ].join(' ')}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      {children}
    </button>
  )
}

function FolderSection({ folder, items }: { folder: CallFolder; items: Call[] }) {
  const meta = CALL_FOLDER_META[folder]
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
        <h2 className="text-sm font-semibold">{meta.label}</h2>
        <span className="text-xs text-black/40 dark:text-white/40">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.map((c) => (
          <CallCard key={c.id} call={c} />
        ))}
      </div>
    </section>
  )
}

function CallCard({ call }: { call: Call }) {
  const [open, setOpen] = useState(false)
  const tier = call.tier ? CALL_TIER_META[call.tier] : null
  const lead = call.lead ? CALL_LEAD_META[call.lead] : null
  const hasDetail = Boolean(call.summary || call.attendees || call.tier_rationale)

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white transition dark:border-white/10 dark:bg-white/[.02]">
      <button
        onClick={() => hasDetail && setOpen((v) => !v)}
        className={`flex w-full items-start gap-3 p-3.5 text-left ${
          hasDetail
            ? 'cursor-pointer hover:bg-black/[.02] dark:hover:bg-white/[.03]'
            : 'cursor-default'
        }`}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{call.title}</h3>
            {tier && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tier.chip}`}>
                {tier.label}
              </span>
            )}
            {call.company && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                {call.company}
              </span>
            )}
          </div>
          {(lead || call.start_time) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-black/45 dark:text-white/45">
              {lead && (
                <span className="inline-flex items-center gap-1">
                  Led by
                  <span className={`rounded-full px-1.5 py-0.5 font-medium ${lead.chip}`}>
                    {lead.label}
                  </span>
                </span>
              )}
              {lead && call.start_time && <span aria-hidden>·</span>}
              {call.start_time && <span>{call.start_time}</span>}
            </div>
          )}
        </div>

        {hasDetail && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className={`mt-1 h-4 w-4 shrink-0 text-black/35 transition-transform dark:text-white/35 ${
              open ? 'rotate-180' : ''
            }`}
          >
            <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {open && hasDetail && (
        <div className="border-t border-black/10 px-4 pt-3 pb-4 dark:border-white/10">
          {call.summary && (
            <p className="text-sm whitespace-pre-line text-black/65 dark:text-white/65">
              {call.summary}
            </p>
          )}
          {tier && call.tier_rationale && (
            <div className="mt-3 rounded-lg bg-black/[.02] p-3 dark:bg-white/[.03]">
              <p className="mb-1 text-[11px] font-semibold tracking-wide text-black/45 uppercase dark:text-white/45">
                Why {tier.label}
              </p>
              <p className="text-sm text-black/65 dark:text-white/65">{call.tier_rationale}</p>
            </div>
          )}
          {call.attendees && (
            <p className="mt-3 text-xs text-black/55 dark:text-white/55">
              <span className="font-medium text-black/70 dark:text-white/70">With:</span>{' '}
              {call.attendees}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
