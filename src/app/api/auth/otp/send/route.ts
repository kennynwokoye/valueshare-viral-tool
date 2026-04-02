import { NextResponse, after } from 'next/server'
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

    // Fire email in the background — response returns immediately so users
    // aren't blocked waiting for SMTP to complete (was causing 15–20s delays).
    after(async () => {
      await sendOtpEmail({ to: emailLower, otp: otpResult.otp_code })
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
