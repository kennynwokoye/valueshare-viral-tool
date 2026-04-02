import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

export async function POST(request: Request) {
  try {
    const { email, campaign_id } = await request.json()
    const emailLower = email?.toLowerCase().trim()

    if (!emailLower || !campaign_id) {
      return NextResponse.json(
        { error: 'Email and campaign are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Step 1: Verify campaign exists and is active
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, status, participant_cap')
      .eq('id', campaign_id)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    if (campaign.status !== 'active') {
      return NextResponse.json({ error: 'This campaign is no longer active' }, { status: 400 })
    }

    // Step 1b: Enforce participant cap (if set)
    if (campaign.participant_cap != null) {
      const { count } = await supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign_id)
      if (count != null && count >= campaign.participant_cap) {
        return NextResponse.json({ error: 'This campaign has reached its maximum number of participants' }, { status: 400 })
      }
    }

    // Step 2: Create or find the user account
    let userId: string | null = null

    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: emailLower,
      email_confirm: true,
      user_metadata: { role: 'participant' },
    })

    if (!createError) {
      // New user created — trigger handle_new_auth_user auto-creates public.users row
      userId = createData.user.id
    } else if (createError.message?.toLowerCase().includes('already')) {
      // User already exists — find their ID from public.users
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', emailLower)
        .single()
      userId = existingUser?.id ?? null
    } else {
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Could not resolve user account' }, { status: 500 })
    }

    // Step 3: Get or create participant record
    let participantReferralCode: string

    const { data: existingParticipant } = await supabase
      .from('participants')
      .select('id, referral_code')
      .eq('user_id', userId)
      .eq('campaign_id', campaign_id)
      .single()

    if (existingParticipant) {
      participantReferralCode = existingParticipant.referral_code
    } else {
      // Generate unique referral code and insert
      const { data: newCode } = await supabase.rpc('generate_referral_code')
      participantReferralCode = newCode as string

      const { error: participantError } = await supabase
        .from('participants')
        .insert({
          user_id: userId,
          campaign_id,
          referral_code: participantReferralCode,
          email: emailLower,
        })

      if (participantError) {
        if (!participantError.message?.includes('duplicate') && !participantError.message?.includes('unique')) {
          return NextResponse.json({ error: 'Failed to join campaign' }, { status: 500 })
        }
        // Race condition — fetch the winner's code
        const { data: raced } = await supabase
          .from('participants')
          .select('referral_code')
          .eq('user_id', userId)
          .eq('campaign_id', campaign_id)
          .single()
        if (raced) participantReferralCode = raced.referral_code
      }
    }

    // Step 4: Generate magic link for instant login
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: emailLower,
    })

    if (linkError || !linkData) {
      return NextResponse.json({ error: 'Failed to generate session' }, { status: 500 })
    }

    // Step 5: Build URLs
    const tokenHash = linkData.properties.hashed_token
    const next = `/dashboard/participant?campaign=${campaign_id}`
    const magicLink = `${APP_URL}/auth/callback?token_hash=${tokenHash}&type=magiclink&next=${encodeURIComponent(next)}`
    const referralUrl = `${APP_URL}/api/track/${participantReferralCode}`

    return NextResponse.json({
      success: true,
      magic_link: magicLink,
      referral_code: participantReferralCode,
      referral_url: referralUrl,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
