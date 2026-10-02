// Streams a company's document (CIM PDF / MTD PDF / Excel model) from the local
// "CIM Analyzer" folder. The client only passes kind + company; the path is
// re-resolved server-side (never trusted from the client) and validated to stay
// inside CIM_ANALYZER_DIR by resolveDoc().

import { readFile } from 'node:fs/promises'
import { resolveDoc, CimConfigError } from '@/lib/cim'
import type { CimKind } from '@/lib/cim-meta'

export const dynamic = 'force-dynamic'

const CONTENT_TYPE: Record<'pdf' | 'xlsx', string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const kind = searchParams.get('kind')
  const company = searchParams.get('company')?.trim()

  if ((kind !== 'cim' && kind !== 'portfolio') || !company) {
    return new Response('Bad request: expected ?kind=cim|portfolio&company=…', { status: 400 })
  }

  try {
    const doc = await resolveDoc(kind as CimKind, company)
    if (!doc) return new Response('No document found for this company.', { status: 404 })

    const bytes = new Uint8Array(await readFile(doc.absPath))
    const disposition = doc.type === 'pdf' ? 'inline' : 'attachment'
    return new Response(bytes, {
      headers: {
        'Content-Type': CONTENT_TYPE[doc.type],
        'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    // CIM folder not present on this host (e.g. hosted deployment) — not a crash.
    if (e instanceof CimConfigError) return new Response(e.message, { status: 503 })
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return new Response(`Unable to read document. ${msg}`, { status: 500 })
  }
}
