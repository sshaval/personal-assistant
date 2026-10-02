'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { signOut } from '../auth/actions'
import { Avatar } from './Avatar'

type NavItem = { href: string; label: string; icon: React.ReactNode }

const ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'Summary',
    icon: (
      <path d="M4 5h16M4 10h16M4 15h10M4 20h7" strokeWidth="2" strokeLinecap="round" />
    ),
  },
  {
    href: '/day',
    label: "Day's View",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" strokeWidth="2" />
        <path d="M3 9h18M8 2v4M16 2v4" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  // Hidden 2026-09-30 per Shayan (not using Calls for now). The /calls route + code
  // still exist — restore the tab by uncommenting this item.
  // {
  //   href: '/calls',
  //   label: 'Calls',
  //   icon: (
  //     <path
  //       d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"
  //       strokeWidth="2"
  //       strokeLinecap="round"
  //       strokeLinejoin="round"
  //     />
  //   ),
  // },
  {
    href: '/tasks',
    label: 'Tasks',
    icon: (
      <>
        <rect x="3" y="4" width="5" height="16" rx="1.5" strokeWidth="2" />
        <rect x="10" y="4" width="5" height="11" rx="1.5" strokeWidth="2" />
        <rect x="17" y="4" width="4" height="7" rx="1.5" strokeWidth="2" />
      </>
    ),
  },
  // Hidden 2026-09-30 per Shayan (not using CIM Analyzer for now). The /cim route +
  // code still exist — restore the tab by uncommenting this item.
  // {
  //   href: '/cim',
  //   label: 'CIM Analyzer',
  //   icon: (
  //     <>
  //       <circle cx="10.5" cy="10.5" r="6.5" strokeWidth="2" />
  //       <path d="m20 20-4.2-4.2" strokeWidth="2" strokeLinecap="round" />
  //       <path d="M8.5 11.5v1.5M10.5 8.5v4.5M12.5 10v3" strokeWidth="2" strokeLinecap="round" />
  //     </>
  //   ),
  // },
]

function BrandMark() {
  const [ok, setOk] = useState(true)
  if (ok) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/claudia.png"
        alt="Claudia"
        onError={() => setOk(false)}
        className="h-9 w-9 rounded-xl object-cover ring-1 ring-black/10 dark:ring-white/15"
      />
    )
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-lg font-black text-white ring-1 ring-black/10">
      C
    </span>
  )
}

export function Sidebar({
  isAdmin,
  user,
}: {
  isAdmin: boolean
  user?: { email: string | null; displayName?: string | null } | null
}) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className="flex shrink-0 items-center gap-2 border-b border-black/10 bg-white/80 px-3 py-2 backdrop-blur md:sticky md:top-0 md:h-screen md:w-56 md:flex-col md:items-stretch md:gap-1 md:border-b-0 md:border-r md:px-3 md:py-5 dark:border-white/10 dark:bg-zinc-900/60">
      <div className="flex items-center gap-2.5 px-1 md:mb-5 md:px-2">
        <BrandMark />
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Claudia</p>
          <p className="hidden text-[11px] text-black/45 md:block dark:text-white/45">
            Daily prep & tasks
          </p>
        </div>
      </div>

      <div className="flex gap-1 md:flex-col md:gap-0.5">
        {ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'text-black/65 hover:bg-black/[.05] dark:text-white/65 dark:hover:bg-white/[.06]',
              ].join(' ')}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="h-[18px] w-[18px] shrink-0"
              >
                {item.icon}
              </svg>
              <span>{item.label}</span>
            </Link>
          )
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className={[
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive('/admin')
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'text-black/65 hover:bg-black/[.05] dark:text-white/65 dark:hover:bg-white/[.06]',
            ].join(' ')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-[18px] w-[18px] shrink-0"
            >
              <path
                d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
            <span>Admin</span>
          </Link>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        {user && (
          <div className="hidden items-center gap-2.5 rounded-lg px-2 py-1.5 md:flex">
            <Avatar email={user.email} name={user.displayName} size={32} />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium">
                {user.displayName || user.email || 'Signed in'}
              </p>
              {user.email && (
                <p className="truncate text-[11px] text-black/45 dark:text-white/45">{user.email}</p>
              )}
            </div>
          </div>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-black/60 transition-colors hover:bg-black/[.05] dark:text-white/60 dark:hover:bg-white/[.06]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-[18px] w-[18px] shrink-0"
            >
              <path
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Sign out</span>
          </button>
        </form>
        <p className="hidden px-2 text-[11px] leading-relaxed text-black/35 md:block dark:text-white/35">
          Summary &amp; Day&apos;s View are prepared by Claude Code. Tasks are live.
        </p>
      </div>
    </nav>
  )
}
