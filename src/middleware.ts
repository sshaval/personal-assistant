import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Gate the whole app behind login. If a request has no session, redirect to
// /login; if a logged-in user hits /login, send them home.
//
// If the Supabase AUTH env (anon key) isn't configured:
//   • development → let requests through unchanged, so the app still works
//     locally before the key is added.
//   • production (any real deployment) → FAIL CLOSED: never serve app content
//     without the gate. Redirect everything except the auth routes to /login, so
//     a missing/mis-set key on a host can't expose data even for a moment.
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    if (process.env.NODE_ENV === 'production') {
      const path = request.nextUrl.pathname
      const isAuthRoute = path === '/login' || path.startsWith('/auth')
      if (!isAuthRoute) {
        const to = request.nextUrl.clone()
        to.pathname = '/login'
        to.search = ''
        return NextResponse.redirect(to)
      }
    }
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAuthRoute = path === '/login' || path.startsWith('/auth')

  if (!user && !isAuthRoute) {
    const to = request.nextUrl.clone()
    to.pathname = '/login'
    to.search = ''
    return NextResponse.redirect(to)
  }
  if (user && path === '/login') {
    const to = request.nextUrl.clone()
    to.pathname = '/'
    return NextResponse.redirect(to)
  }

  return response
}

export const config = {
  // Run on everything except Next internals and static image assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)'],
}
