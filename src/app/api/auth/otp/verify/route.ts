import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    // Derive app URL from request origin so the magic link always uses the user's current
    // domain — avoids build-time NEXT_PUBLIC_APP_URL inlining issues.
    const appUrl = new URL(request.url).origin
    const { email, code, name } = await request.json()
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

    const trimmedName = typeof name === 'string' ? name.trim() : ''

    if (!existingUser) {
      // Create auth user — triggers handle_new_auth_user which creates public.users row
      const { error: createError } = await supabase.auth.admin.createUser({
        email: emailLower,
        email_confirm: true,
        user_metadata: { role: 'participant', ...(trimmedName && { name: trimmedName }) },
      })

      if (createError && !createError.message?.toLowerCase().includes('already')) {
        return NextResponse.json(
          { error: 'Failed to create account' },
          { status: 500 }
        )
      }
    } else if (trimmedName) {
      // Update name for existing user if they provided one and don't have one yet
      const { data: authUser } = await supabase.auth.admin.getUserById(existingUser.id)
      if (!authUser.user?.user_metadata?.name) {
        await supabase.auth.admin.updateUserById(existingUser.id, {
          user_metadata: { name: trimmedName },
        })
      }
    }

    // Step 5: Generate magic link for session establishment
    const campaignId = otpRecord.campaign_id
    const next = campaignId
      ? `/participant/onboarding?campaign=${campaignId}`
      : '/dashboard/participant'

    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: emailLower,
        options: {
          // redirectTo ensures the Supabase backup email also lands on the right page
          redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })

    if (linkError || !linkData) {
      return NextResponse.json(
        { error: 'Failed to generate session' },
        { status: 500 }
      )
    }

    // Step 6: Build our own magic link using the hashed token directly
    const tokenHash = linkData.properties.hashed_token
    const magicLink = `${appUrl}/auth/callback?token_hash=${tokenHash}&type=magiclink&next=${encodeURIComponent(next)}`

    return NextResponse.json({ success: true, magic_link: magicLink })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
