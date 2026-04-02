import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sendCreatorConfirmationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Generate a magic link for the just-created user.
    // Clicking it logs them in AND confirms their email via our own Zeptomail SMTP.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://valueshare.co'

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/dashboard/creator`,
      },
    })

    if (error || !data?.properties?.hashed_token) {
      console.error('[send-creator-confirmation] generateLink error:', error?.message)
      return NextResponse.json({ error: 'Failed to generate confirmation link' }, { status: 500 })
    }

    // Use hashed_token to build a direct callback URL — this bypasses Supabase's own
    // /auth/v1/verify endpoint (which uses implicit flow with URL fragments that the
    // server-side Next.js callback cannot read), so the user lands cleanly on /dashboard/creator.
    const confirmationUrl =
      `${appUrl}/auth/callback` +
      `?token_hash=${data.properties.hashed_token}&type=magiclink&next=/dashboard/creator`

    await sendCreatorConfirmationEmail({
      to: email,
      confirmationUrl,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[send-creator-confirmation]', err)
    return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500 })
  }
}
