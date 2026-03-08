import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendOtpEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { email, campaign_id } = await request.json()
    const emailLower = email?.toLowerCase().trim()

    if (!emailLower) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Generate OTP via RPC (works for any email, new or returning)
    const { data: otpResult, error: rpcError } = await supabase.rpc(
      'generate_email_otp',
      { p_email: emailLower, p_campaign_id: campaign_id || null }
    )

    if (rpcError || !otpResult?.success) {
      return NextResponse.json(
        { error: rpcError?.message || 'Failed to generate code' },
        { status: 500 }
      )
    }

    // Send OTP email via Resend
    await sendOtpEmail({ to: emailLower, otp: otpResult.otp_code })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
