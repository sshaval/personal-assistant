// Client-safe CIM scoring metadata + display helpers.
// NO node/fs/exceljs imports here so client components can import it freely.
// Source of truth for the rubric: "CIM Scoring Criteria.html" (15 criteria, /100).

export type CimKind = 'cim' | 'portfolio'

export interface CriterionMeta {
  n: number // 1..15, matches column order in !Output_List.xlsx
  short: string // compact label for the scorecard grid
  label: string // full label
  weight: number // points out of 100
  type: 'quant' | 'qual'
  /** Tier descriptions keyed by score (5 best … 1 worst). Qual criteria use 5/3/1 only. */
  tiers: Record<number, string>
  rationale: string
}

export const CRITERIA: CriterionMeta[] = [
  {
    n: 1,
    short: 'NRR',
    label: 'Net Revenue Retention (avg)',
    weight: 11,
    type: 'quant',
    tiers: { 5: '≥ 110%', 4: '105–110%', 3: '100–105%', 2: '95–100%', 1: '< 95%' },
    rationale: 'Strongest predictor of net-revenue growth and value build. Above 100% = net expansion.',
  },
  {
    n: 2,
    short: 'GRR',
    label: 'Gross Retention / Churn (avg)',
    weight: 10,
    type: 'quant',
    tiers: { 5: '≤ 4%', 4: '4–7%', 3: '7–10%', 2: '10–15%', 1: '> 15%' },
    rationale: 'Portfolio median ~7.4%. High-churn quartile (>11%) averages far lower Rule-of-40.',
  },
  {
    n: 3,
    short: 'Mission Crit.',
    label: 'Mission Criticality',
    weight: 9,
    type: 'qual',
    tiers: {
      5: 'High — the software IS the customer’s operating system; removing it halts operations.',
      3: 'Medium — important, but workarounds exist; switching is painful but survivable.',
      1: 'Low — nice-to-have or easily substitutable; low switching cost.',
    },
    rationale: 'Sustains GRR/NRR over time. Top performers are all “operating-system” products.',
  },
  {
    n: 4,
    short: 'ARR %',
    label: 'ARR % of Revenue',
    weight: 8,
    type: 'quant',
    tiers: { 5: '≥ 90%', 4: '78–90%', 3: '60–78%', 2: '40–60%', 1: '< 40%' },
    rationale: 'Strongest value-build predictor. Recurring mix drives valuation.',
  },
  {
    n: 5,
    short: 'GM %',
    label: 'Gross Margin %',
    weight: 8,
    type: 'quant',
    tiers: { 5: '≥ 93%', 4: '88–93%', 3: '80–88%', 2: '70–80%', 1: '< 70%' },
    rationale: 'Strongest EBITDA predictor. At 93%+ GM, total revenue ≈ net revenue. Key valuation lever.',
  },
  {
    n: 6,
    short: 'ARR Growth',
    label: 'ARR Growth (last year)',
    weight: 7,
    type: 'quant',
    tiers: { 5: '≥ 15%', 4: '9–15%', 3: '5–9%', 2: '0–5%', 1: '< 0%' },
    rationale: 'Best momentum signal. Portfolio median ~9.1%.',
  },
  {
    n: 7,
    short: 'EBITDA %',
    label: 'Pre-Acquisition EBITDA %',
    weight: 7,
    type: 'quant',
    tiers: { 5: '≥ 25%', 4: '12–25%', 3: '0–12%', 2: '-10–0%', 1: '< -10%' },
    rationale: 'Profitability at acquisition de-risks execution. Upper-half value build averages ~18.5%.',
  },
  {
    n: 8,
    short: 'Cust. Conc.',
    label: 'Customer Concentration',
    weight: 7,
    type: 'qual',
    tiers: {
      5: 'Low risk — no customer > 10% of revenue; diversified base.',
      3: 'Moderate — top customer 10–25% of revenue, or top 5 at 50–70%.',
      1: 'High risk — top customer > 25% of revenue, or top 3 > 60%.',
    },
    rationale: 'Binary risk factor. Concentrated bases show outsized downside.',
  },
  {
    n: 9,
    short: 'AI Risk',
    label: 'AI Risk (Valsoft 10-factor model)',
    weight: 6,
    type: 'qual',
    tiers: {
      5: 'Low risk (75–100) — deep vertical, system-of-record, hardware/regulatory moat; hard for AI to disrupt.',
      3: 'Medium risk (50–74) — some defensible factors but exposed areas; 3–5 year window to act.',
      1: 'High risk (0–49) — point solution, horizontal, simple workflows; AI can replicate the core value prop.',
    },
    rationale: 'Critical for a permanent-hold model — you can’t exit an AI-disrupted asset.',
  },
  {
    n: 10,
    short: 'Competitive',
    label: 'Competitive Landscape',
    weight: 6,
    type: 'qual',
    tiers: {
      5: 'Favorable — niche vertical, 2–3 competitors, no major platform threat.',
      3: 'Moderate — established market, 4–6 competitors, defensible position.',
      1: 'Crowded — commoditized market, major platform competitors, pricing pressure.',
    },
    rationale: 'Primary qualitative driver of GRR variance. Crowded markets erode retention and margins.',
  },
  {
    n: 11,
    short: 'Rev CAGR',
    label: 'Revenue CAGR',
    weight: 5,
    type: 'quant',
    tiers: { 5: '≥ 10%', 4: '4–10%', 3: '0–4%', 2: '-5–0%', 1: '< -5%' },
    rationale: 'Confirms ARR growth isn’t a one-year blip. Consistency check; median ~4.4%.',
  },
  {
    n: 12,
    short: 'Country',
    label: 'Country',
    weight: 5,
    type: 'quant',
    tiers: {
      5: 'US, CA, UK',
      4: 'AU, DE, CH',
      3: 'BR, SE, ES, IT',
      2: 'BE, FR, IE',
      1: 'NL, Other',
    },
    rationale: 'US/CA/UK show the strongest hit rates; reflects tax, labor and ops complexity.',
  },
  {
    n: 13,
    short: 'Reg. Moat',
    label: 'Regulatory / Compliance Moat',
    weight: 4,
    type: 'qual',
    tiers: {
      5: 'Strong — regulation requires this type of software (AML, gov records, healthcare compliance).',
      3: 'Partial — regulation creates preference but not a hard requirement.',
      1: 'None — no regulatory tailwind; adoption is purely discretionary.',
    },
    rationale: 'Creates a structural churn floor. Powerful when present but vertical-specific.',
  },
  {
    n: 14,
    short: 'Vertical TAM',
    label: 'Vertical Depth vs TAM',
    weight: 4,
    type: 'qual',
    tiers: {
      5: 'Large — deep vertical with room for 5–10%+ organic growth; underpenetrated.',
      3: 'Moderate — niche vertical, 2–5% growth realistic; well-penetrated.',
      1: 'Constrained — fully penetrated niche or structurally declining vertical.',
    },
    rationale: 'Growth ceiling context. Affects whether current ARR growth is sustainable.',
  },
  {
    n: 15,
    short: 'Cross-sell',
    label: 'Cross-sell / Upsell Potential',
    weight: 3,
    type: 'qual',
    tiers: {
      5: 'High — multiple tiers / add-on modules / land-and-expand; NRR > 105% confirms.',
      3: 'Moderate — some expansion paths but not clearly articulated; NRR 100–105%.',
      1: 'Low — single product, flat pricing, limited expansion levers; NRR < 100%.',
    },
    rationale: 'Qualitative overlay on NRR. Matters most when NRR is borderline.',
  },
]

export const CRITERIA_BY_N: Record<number, CriterionMeta> = Object.fromEntries(
  CRITERIA.map((c) => [c.n, c]),
)

// ---- Per-company parsed data (server fills this; serializable to the client) ----

export interface CritCell {
  n: number // 1..15
  score: number | null // 1..5
  detail: string // text after the dash in the cell, e.g. "~103% est."
}

export interface DocInfo {
  /** 'pdf' renders inline; 'xlsx' is download-only; null means nothing found. */
  type: 'pdf' | 'xlsx' | null
  filename: string | null // basename, for display
  label: string // e.g. 'CIM Analysis', 'MTD', 'DD Update', 'Excel model', 'No document yet'
}

export interface AnalysisEntry {
  company: string
  score: number | null // total /100
  rating: string | null // text from the sheet (e.g. "Strong")
  cells: CritCell[]
  doc: DocInfo
}

// ---- Display helpers ---------------------------------------------------------

/** Tailwind classes for a 1–5 score chip (mirrors the rubric tier colors). */
export function scoreChipClass(score: number | null): string {
  switch (score) {
    case 5:
      return 'bg-emerald-500 text-white'
    case 4:
      return 'bg-lime-400 text-lime-950'
    case 3:
      return 'bg-amber-400 text-amber-950'
    case 2:
      return 'bg-orange-400 text-orange-950'
    case 1:
      return 'bg-red-500 text-white'
    default:
      return 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'
  }
}

export interface RatingBand {
  label: string
  /** chip background+text for the headline rating pill */
  chip: string
  /** solid color for the score progress bar */
  bar: string
}

/** Interpretation bands from the rubric (draft): 80+ Exceptional … 20–34 Weak. */
export function ratingBand(score: number | null): RatingBand {
  if (score == null)
    return {
      label: 'Unscored',
      chip: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300',
      bar: 'bg-zinc-400',
    }
  if (score >= 80)
    return {
      label: 'Exceptional',
      chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
      bar: 'bg-emerald-500',
    }
  if (score >= 65)
    return {
      label: 'Strong',
      chip: 'bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-300',
      bar: 'bg-lime-500',
    }
  if (score >= 50)
    return {
      label: 'Average',
      chip: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
      bar: 'bg-amber-500',
    }
  if (score >= 35)
    return {
      label: 'Below average',
      chip: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
      bar: 'bg-orange-500',
    }
  return {
    label: 'Weak',
    chip: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    bar: 'bg-red-500',
  }
}
