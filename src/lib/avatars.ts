// How each user is shown as an avatar. Known people get a specific look; anyone
// else (e.g. a user added later from the Admin panel) automatically falls back to
// coloured initials — so EVERY user always has an avatar. Pure data + helpers,
// safe to import from client components.

export type AvatarSpec =
  | { kind: 'image'; src: string } // a photo in /public
  | { kind: 'emoji'; emoji: string } // an emoji in a neutral circle
  | { kind: 'initials' } // coloured initials (the default fallback)

// Keyed by lowercase email.
const MAP: Record<string, AvatarSpec> = {
  // Shayan — the 😈 "evil face" already used for his tasks on the board.
  's.shabanpour@valsoftcorp.com': { kind: 'emoji', emoji: '😈' },
  // Atlas — his AI Chief of Staff.
  'atlasthecos7@gmail.com': { kind: 'image', src: '/atlas.webp' },
}

export function avatarFor(email: string | null | undefined): AvatarSpec {
  const e = (email ?? '').toLowerCase().trim()
  return MAP[e] ?? { kind: 'initials' }
}

// Friendly first-name labels for known people (e.g. "Added by Atlas"). Unknown
// emails fall back to the part before the @; null/empty returns null so callers
// can decide (the task modal shows "you" for legacy authorless tasks).
const NAMES: Record<string, string> = {
  's.shabanpour@valsoftcorp.com': 'Shayan',
  'atlasthecos7@gmail.com': 'Atlas',
}

export function displayNameFor(email: string | null | undefined): string | null {
  const e = (email ?? '').toLowerCase().trim()
  if (!e) return null
  return NAMES[e] ?? e.split('@')[0]
}

/** 1–2 letters for the initials fallback, from a display name or email. */
export function initialsOf(name: string | null | undefined, email: string | null | undefined): string {
  const base = (name || '').trim() || (email || '').trim()
  if (!base) return '?'
  const parts = base.split(/[\s@._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return base.slice(0, 2).toUpperCase()
}

// A stable background colour per email for the initials fallback.
const PALETTE = [
  'bg-rose-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-sky-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-fuchsia-500',
]

export function colorForEmail(email: string | null | undefined): string {
  const e = (email ?? '').toLowerCase()
  let h = 0
  for (let i = 0; i < e.length; i++) h = (h * 31 + e.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}
