import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as EmailOtpType | null
  const next       = searchParams.get('next') || '/'
  const error      = searchParams.get('error')
  const error_desc = searchParams.get('error_description')

  if (error) {
    const p = new URLSearchParams({ error })
    if (error_desc) p.set('description', error_desc)
    return NextResponse.redirect(`${origin}/auth/error?${p}`)
  }

  /**
   * Build a Supabase client whose setAll writes session cookies directly onto
   * the given NextResponse — not via cookies() from next/headers. This ensures
   * the session cookies are included in the redirect response that goes to the
   * browser. (Using cookies() + NextResponse.redirect() loses the mutations.)
   */
  function makeSupabase(res: NextResponse) {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll()             { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            )
          },
        },
      }
    )
  }

  // ── PKCE code exchange ────────────────────────────────────────────────
  if (code) {
    const res      = NextResponse.redirect(`${origin}${next}`)
    const supabase = makeSupabase(res)
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(`${origin}/auth/error?error=exchange_failed`)
    }

    // Smart redirect based on role when next is default '/'
    if (next === '/') {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        const dest =
          profile?.role === 'creator'     ? '/dashboard/creator' :
          profile?.role === 'both'        ? '/dashboard/creator' :
          profile?.role === 'participant' ? '/dashboard/participant' : '/'

        const res2 = NextResponse.redirect(`${origin}${dest}`)
        res.cookies.getAll().forEach(c => res2.cookies.set(c.name, c.value))
        return res2
      }
    }
    return res
  }

  // ── Token hash verification (admin-generated magic links) ─────────────
  if (token_hash && type) {
    const res      = NextResponse.redirect(`${origin}${next}`)
    const supabase = makeSupabase(res)
    const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash, type })

    if (verifyError) {
      return NextResponse.redirect(`${origin}/auth/error?error=exchange_failed`)
    }
    return res
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
