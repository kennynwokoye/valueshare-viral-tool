import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') || '/'
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  // Error from auth provider
  if (error) {
    const params = new URLSearchParams({ error })
    if (error_description) params.set('description', error_description)
    return NextResponse.redirect(`${origin}/auth/error?${params.toString()}`)
  }

  const supabase = await createServerSupabaseClient()

  // PKCE code exchange
  if (code) {
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(
        `${origin}/auth/error?error=exchange_failed`
      )
    }

    // Smart redirect based on role when next is default
    if (next === '/') {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'creator') {
          return NextResponse.redirect(`${origin}/dashboard/creator`)
        }
        if (profile?.role === 'participant') {
          return NextResponse.redirect(`${origin}/dashboard/participant`)
        }
      }
    }

    return NextResponse.redirect(`${origin}${next}`)
  }

  // Token hash verification (admin-generated magic links)
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    })

    if (verifyError) {
      return NextResponse.redirect(
        `${origin}/auth/error?error=exchange_failed`
      )
    }

    return NextResponse.redirect(`${origin}${next}`)
  }

  // Fallback
  return NextResponse.redirect(`${origin}/auth/error`)
}
