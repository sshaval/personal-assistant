'use client'

import { useState } from 'react'
import { avatarFor, colorForEmail, initialsOf } from '@/lib/avatars'

// A user's avatar: a photo, an emoji badge, or coloured initials — chosen by
// avatarFor(email). If a photo fails to load it degrades to initials, so an
// avatar always renders.
export function Avatar({
  email,
  name,
  size = 32,
}: {
  email: string | null | undefined
  name?: string | null
  size?: number
}) {
  const spec = avatarFor(email)
  const [imgOk, setImgOk] = useState(true)
  const dim = { width: size, height: size }
  const label = name?.trim() || email || 'User'

  if (spec.kind === 'image' && imgOk) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={spec.src}
        alt={label}
        title={label}
        style={dim}
        onError={() => setImgOk(false)}
        className="shrink-0 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/15"
      />
    )
  }

  if (spec.kind === 'emoji') {
    return (
      <span
        title={label}
        aria-label={label}
        style={{ ...dim, fontSize: Math.round(size * 0.56) }}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-100 leading-none ring-1 ring-black/10 dark:bg-zinc-800 dark:ring-white/15"
      >
        <span aria-hidden>{spec.emoji}</span>
      </span>
    )
  }

  // Initials fallback (also used when a photo fails to load).
  return (
    <span
      title={label}
      aria-label={label}
      style={{ ...dim, fontSize: Math.round(size * 0.4) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none text-white ring-1 ring-black/10 ${colorForEmail(
        email,
      )}`}
    >
      {initialsOf(name, email)}
    </span>
  )
}
