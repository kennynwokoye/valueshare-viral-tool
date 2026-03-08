import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = [
  '/',
  '/embed.js',
]

const PUBLIC_PREFIXES = [
  '/auth/',
  '/c/',
  '/campaign/',
  '/r/',
  '/prize/',
  '/api/',
]

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1. Refresh Supabase session on every request ─────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() refreshes the session — must run before any checks
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── 2. Public routes — always pass through ───────────
  if (isPublicRoute(pathname)) {
    // ── 4. Auth page redirects for logged-in users ─────
    if (user && pathname.startsWith('/auth/')) {
      if (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup')) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard/creator'
        url.search = ''
        return NextResponse.redirect(url)
      }
      if (pathname.startsWith('/auth/join')) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard/participant'
        url.search = ''
        return NextResponse.redirect(url)
      }
    }
    return supabaseResponse
  }

  // ── 3. Protected routes — require authentication ─────
  const isCreatorDashboard = pathname.startsWith('/dashboard/creator')
  const isParticipantDashboard = pathname.startsWith('/dashboard/participant')

  if (!user) {
    if (isCreatorDashboard) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }
    if (isParticipantDashboard) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/join'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // ── 4. Role-based routing for authenticated users ────
  if (isCreatorDashboard || isParticipantDashboard) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    if (role === 'participant' && isCreatorDashboard) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard/participant'
      return NextResponse.redirect(url)
    }

    if (role === 'creator' && isParticipantDashboard) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard/creator'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
