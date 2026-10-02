'use client'

import { useState } from 'react'
import type { CreatedBy } from '@/lib/types'
import { Avatar } from './Avatar'

export function CreatorBadge({
  by,
  email,
  size = 22,
}: {
  by: CreatedBy
  /** Email of the human author (migration_v9+). Null/absent for legacy tasks. */
  email?: string | null
  size?: number
}) {
  const [imgOk, setImgOk] = useState(true)
  const dim = { width: size, height: size }

  // Claudia-created (only when explicitly attributed).
  if (by === 'claudia' && imgOk) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/claudia.png"
        alt="Added by Claudia"
        title="Added by Claudia"
        style={dim}
        onError={() => setImgOk(false)}
        className="shrink-0 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/15"
      />
    )
  }
  if (by === 'claudia') {
    // Logo missing — fall back to a branded monogram.
    return (
      <span
        title="Added by Claudia"
        style={dim}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white ring-1 ring-black/10"
      >
        C
      </span>
    )
  }

  // A person created it — show their specific avatar when we know who (migration_v9+).
  if (email) return <Avatar email={email} size={size} />

  // Legacy task with no recorded author — the original "you" badge.
  return (
    <span
      title="Added by you"
      aria-label="Added by you"
      style={{ ...dim, fontSize: Math.round(size * 0.62) }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-100 leading-none ring-1 ring-black/10 dark:bg-zinc-800 dark:ring-white/15"
    >
      <span aria-hidden>😈</span>
    </span>
  )
}
