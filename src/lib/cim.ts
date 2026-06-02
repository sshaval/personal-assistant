// SERVER-ONLY. Reads the local "CIM Analyzer" folder live on every call so the
// lists auto-update the moment a PDF is dropped or a row is added to the Excel.
// Do not import this from a client component (it pulls in fs + exceljs).

import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import * as XLSX from 'xlsx'
import type { AnalysisEntry, CimKind, CritCell, DocInfo } from './cim-meta'

const WORKBOOK = '!Output_List.xlsx'
const OUTPUT_DIR = '!Output'
const DD_DIR = 'DD Models + MTDs'
const SHEET: Record<CimKind, string> = { cim: 'List', portfolio: 'Portfolio' }

/** Company-name → file-stem overrides for the few cases auto-matching can't get. */
const OVERRIDES: Record<string, string> = {
  hightouchtechnologies: 'cynergie', // "High Touch Technologies (Cynergi Suite)" → Cynergie.pdf
  bidstenders: 'bt', // "Bids & Tenders" → B&T
}

export class CimConfigError extends Error {}

function cimDir(): string {
  const dir = process.env.CIM_ANALYZER_DIR
  if (!dir) throw new CimConfigError('CIM_ANALYZER_DIR is not set in .env.local')
  if (!existsSync(dir)) throw new CimConfigError(`CIM Analyzer folder not found at: ${dir}`)
  return dir
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // drop parentheticals, e.g. "(Cynergi Suite)"
    .replace(/[^a-z0-9]/g, '')
}

/** Longest exact-or-prefix match (>=3 chars), with override substitution. */
function matchStem(companyNorm: string, stems: string[]): string | null {
  const want = OVERRIDES[companyNorm] ?? companyNorm
  if (!want) return null
  if (stems.includes(want)) return want
  const cands = stems
    .filter((s) => s.length >= 3 && (want.startsWith(s) || s.startsWith(want)))
    .sort((a, b) => b.length - a.length)
  return cands[0] ?? null
}

function parseCriterionCell(raw: string): { score: number | null; detail: string } {
  const text = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return { score: null, detail: '' }
  // Cells look like "3 — ~103% est." (em/en dash or hyphen).
  const m = text.match(/^([1-5])\s*[—–-]\s*(.*)$/)
  if (m) return { score: parseInt(m[1], 10), detail: m[2].trim() }
  if (/^[1-5]$/.test(text)) return { score: parseInt(text, 10), detail: '' }
  return { score: null, detail: text }
}

interface SheetRow {
  company: string
  score: number | null
  rating: string | null
  cells: CritCell[]
}

// Column layout (0-indexed): 0=Company, 1=Score, 2=Rating, 3..17 = criteria 1..15.
async function readSheet(kind: CimKind): Promise<SheetRow[]> {
  // Read the bytes ourselves and parse from a buffer. (XLSX.readFile relies on
  // SheetJS dynamically require-ing 'fs', which Turbopack/ESM doesn't provide —
  // it throws "Cannot access file". Reading fresh on every call keeps data live.)
  const buf = await fs.readFile(path.join(cimDir(), WORKBOOK))
  const wb = XLSX.read(buf, { type: 'buffer' })
  const ws = wb.Sheets[SHEET[kind]]
  if (!ws) throw new CimConfigError(`Sheet "${SHEET[kind]}" not found in ${WORKBOOK}`)

  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as string[][]
  const rows: SheetRow[] = []
  for (let i = 1; i < grid.length; i++) {
    const r = grid[i]
    const company = String(r?.[0] ?? '').trim()
    if (!company) continue
    const cells: CritCell[] = []
    for (let n = 1; n <= 15; n++) {
      const { score, detail } = parseCriterionCell(String(r[2 + n] ?? ''))
      cells.push({ n, score, detail })
    }
    const scoreNum = parseFloat(String(r[1] ?? '').trim())
    rows.push({
      company,
      score: Number.isFinite(scoreNum) ? scoreNum : null,
      rating: String(r[2] ?? '').trim() || null,
      cells,
    })
  }
  return rows
}

// ---- File maps ---------------------------------------------------------------

/** norm(company) → "<Company>.pdf" basename for the !Output folder. */
async function cimDocMap(): Promise<Record<string, string>> {
  const dir = path.join(cimDir(), OUTPUT_DIR)
  const map: Record<string, string> = {}
  for (const f of await fs.readdir(dir)) {
    if (f.toLowerCase().endsWith('.pdf')) map[norm(f.slice(0, -4))] = f
  }
  return map
}

type DocType = 'MTD' | 'DD Update' | 'DD Model' | 'Model'
/** norm(company) → { docType → basename } for the DD Models + MTDs folder. */
async function portfolioDocMap(): Promise<Record<string, Partial<Record<DocType, string>>>> {
  const dir = path.join(cimDir(), DD_DIR)
  const map: Record<string, Partial<Record<DocType, string>>> = {}
  // Doc-type token after " - ", tolerating version suffixes ("MTD v1 1",
  // "MTD_v3 1") and the bare "Update" alias for "DD Update".
  const re = /^(.*?) - (DD Update|DD Model|MTD|Model|Update)(?:[ _].*)?\.(pdf|xlsx)$/
  for (const f of await fs.readdir(dir)) {
    const m = f.match(re)
    if (!m) continue
    const k = norm(m[1])
    const t: DocType = m[2] === 'Update' ? 'DD Update' : (m[2] as DocType)
    // First match for a (company, type) wins; don't let a versioned file clobber it.
    ;(map[k] ||= {})[t] ??= f
  }
  return map
}

/** Prefer a viewable PDF (MTD → DD Update), else fall back to the Excel model. */
function pickPortfolioDoc(rec: Partial<Record<DocType, string>>): DocInfo {
  if (rec.MTD) return { type: 'pdf', filename: rec.MTD, label: 'MTD' }
  if (rec['DD Update']) return { type: 'pdf', filename: rec['DD Update'], label: 'DD Update' }
  const xlsx = rec['DD Model'] ?? rec.Model
  if (xlsx) return { type: 'xlsx', filename: xlsx, label: 'Excel model' }
  return { type: null, filename: null, label: 'No document yet' }
}

// ---- Public loaders ----------------------------------------------------------

function sortEntries(a: AnalysisEntry, b: AnalysisEntry): number {
  if (a.score == null && b.score == null) return a.company.localeCompare(b.company)
  if (a.score == null) return 1
  if (b.score == null) return -1
  return b.score - a.score || a.company.localeCompare(b.company)
}

export async function loadCims(): Promise<{ data: AnalysisEntry[]; error: string | null }> {
  try {
    const [rows, docs] = await Promise.all([readSheet('cim'), cimDocMap()])
    const stems = Object.keys(docs)
    const data: AnalysisEntry[] = rows.map((r) => {
      const stem = matchStem(norm(r.company), stems)
      const doc: DocInfo = stem
        ? { type: 'pdf', filename: docs[stem], label: 'CIM Analysis' }
        : { type: null, filename: null, label: 'No PDF yet' }
      return { company: r.company, score: r.score, rating: r.rating, cells: r.cells, doc }
    })
    data.sort(sortEntries)
    return { data, error: null }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function loadPortfolio(): Promise<{ data: AnalysisEntry[]; error: string | null }> {
  try {
    const [rows, docs] = await Promise.all([readSheet('portfolio'), portfolioDocMap()])
    const stems = Object.keys(docs)
    const data: AnalysisEntry[] = rows.map((r) => {
      const stem = matchStem(norm(r.company), stems)
      const doc: DocInfo = stem
        ? pickPortfolioDoc(docs[stem])
        : { type: null, filename: null, label: 'No document yet' }
      return { company: r.company, score: r.score, rating: r.rating, cells: r.cells, doc }
    })
    data.sort(sortEntries)
    return { data, error: null }
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

// ---- Doc resolver (used by the /cim/file route) ------------------------------

export interface ResolvedDoc {
  absPath: string
  type: 'pdf' | 'xlsx'
  filename: string
}

/** Re-derive a company's file path on the server; never trust a client path. */
export async function resolveDoc(kind: CimKind, company: string): Promise<ResolvedDoc | null> {
  const base = path.resolve(cimDir())
  let dirName: string
  let filename: string | null = null
  let type: 'pdf' | 'xlsx' = 'pdf'

  if (kind === 'cim') {
    dirName = OUTPUT_DIR
    const docs = await cimDocMap()
    const stem = matchStem(norm(company), Object.keys(docs))
    if (stem) {
      filename = docs[stem]
      type = 'pdf'
    }
  } else {
    dirName = DD_DIR
    const docs = await portfolioDocMap()
    const stem = matchStem(norm(company), Object.keys(docs))
    if (stem) {
      const info = pickPortfolioDoc(docs[stem])
      if (info.type) {
        filename = info.filename
        type = info.type
      }
    }
  }

  if (!filename) return null
  const absPath = path.resolve(path.join(base, dirName, filename))
  // Path-traversal guard: must stay inside the CIM Analyzer folder.
  if (absPath !== base && !absPath.startsWith(base + path.sep)) return null
  return { absPath, type, filename }
}
