'use client'

import { useState } from 'react'
import type { CreatedBy } from '@/lib/types'

export function CreatorBadge({
  by,
  size = 22,
}: {
  by: CreatedBy
  size?: number
}) {
  const [imgOk, setImgOk] = useState(true)
  const dim = { width: size, height: size }

  // Claudia-created (only when explicitly attributed); everything else is "you".
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
