import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json()
    const emailLower = email?.toLowerCase().trim()

    if (!emailLower || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Step 1: Find valid OTP in email_otps table
    const { data: otpRecord } = await supabase
      .from('email_otps')
      .select('id, otp_code, campaign_id, expires_at')
      .eq('email', emailLower)
      .eq('otp_code', code)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      )
    }

    // Step 2: Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Code has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Step 3: Mark OTP as used
    await supabase
      .from('email_otps')
      .update({ used_at: new Date().toISOString() })
      .eq('id', otpRecord.id)

    // Step 4: Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', emailLower)
      .single()

    let isNewUser = false

    if (!existingUser) {
      isNewUser = true
      // Create auth user — triggers handle_new_auth_user which creates public.users row
      const { error: createError } = await supabase.auth.admin.createUser({
        email: emailLower,
        email_confirm: true,
        user_metadata: { role: 'participant' },
      })

      if (createError) {
        // Edge case: user exists in auth.users but not in public.users
        if (!createError.message?.toLowerCase().includes('already')) {
          return NextResponse.json(
            { error: 'Failed to create account' },
            { status: 500 }
          )
        }
        // User exists in auth — treat as returning user for redirect purposes
        isNewUser = false
      }
    }

    // Step 5: Generate magic link for session establishment
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: emailLower,
      })

    if (linkError || !linkData) {
      return NextResponse.json(
        { error: 'Failed to generate session' },
        { status: 500 }
      )
    }

    // Step 6: Build redirect URL
    const tokenHash = linkData.properties.hashed_token
    const campaignId = otpRecord.campaign_id

    let next: string
    if (isNewUser && campaignId) {
      next = `/participant/onboarding?campaign=${campaignId}`
    } else {
      next = '/dashboard/participant'
    }

    const magicLink = `${APP_URL}/auth/callback?token_hash=${tokenHash}&type=magiclink&next=${encodeURIComponent(next)}`

    return NextResponse.json({ success: true, magic_link: magicLink })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
