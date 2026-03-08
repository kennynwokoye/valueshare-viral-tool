import { NextResponse } from 'next/server'
import {
  createServerSupabaseClient,
  createAdminClient,
} from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface Props {
  params: Promise<{ id: string }>
}

export async function PATCH(_request: Request, { params }: Props) {
  try {
    const { id } = await params

    // 1. Authenticate user
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Look up the reward_unlock + campaign (admin bypasses RLS)
    const admin = createAdminClient()

    const { data: unlock, error: lookupError } = await admin
      .from('reward_unlocks')
      .select(
        'id, delivered_at, campaign_id, campaigns!inner(id, creator_id)'
      )
      .eq('id', id)
      .single()

    if (lookupError || !unlock) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 })
    }

    // 3. Verify the user is the campaign creator
    const campaign = unlock.campaigns as unknown as {
      id: string
      creator_id: string
    }

    if (campaign.creator_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 4. Already delivered?
    if (unlock.delivered_at) {
      return NextResponse.json(
        { error: 'Already marked as delivered' },
        { status: 409 }
      )
    }

    // 5. Mark as delivered (admin client — no UPDATE RLS on reward_unlocks)
    const { error: updateError } = await admin
      .from('reward_unlocks')
      .update({ delivered_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
