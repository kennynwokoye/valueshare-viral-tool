import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { UpdateCampaignPayload } from '@/types'

async function getAuthAndCampaign(campaignId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (error || !campaign) {
    return { error: NextResponse.json({ error: 'Campaign not found' }, { status: 404 }) }
  }

  if (campaign.creator_id !== user.id) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabase, user, campaign }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await getAuthAndCampaign(id)
    if ('error' in result && result.error instanceof NextResponse) return result.error
    const { supabase, campaign } = result as Awaited<ReturnType<typeof getAuthAndCampaign>> & { supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>; campaign: Record<string, unknown> }

    const [tiersRes, assetsRes, widgetRes] = await Promise.all([
      supabase.from('reward_tiers').select('*').eq('campaign_id', id).order('tier_order'),
      supabase.from('campaign_promo_assets').select('*').eq('campaign_id', id).order('created_at'),
      supabase.from('embed_widgets').select('*').eq('campaign_id', id).single(),
    ])

    return NextResponse.json({
      ...campaign,
      reward_tiers: tiersRes.data ?? [],
      campaign_promo_assets: assetsRes.data ?? [],
      embed_widgets: widgetRes.data ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await getAuthAndCampaign(id)
    if ('error' in result && result.error instanceof NextResponse) return result.error
    const { supabase } = result as Awaited<ReturnType<typeof getAuthAndCampaign>> & { supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> }

    const body: UpdateCampaignPayload = await request.json()
    const { reward_tiers, ...campaignFields } = body

    // If name is changing (and different from current), regenerate slug
    if (campaignFields.name && campaignFields.name !== (result.campaign as Record<string, unknown>).name) {
      const { data: slug } = await supabase.rpc('generate_campaign_slug', {
        campaign_name: campaignFields.name,
      })
      if (slug) (campaignFields as Record<string, unknown>).slug = slug
    }

    // Update campaign fields (only if there are any)
    let updatedCampaign = result.campaign
    if (Object.keys(campaignFields).length > 0) {
      const { data, error } = await supabase
        .from('campaigns')
        .update(campaignFields)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      updatedCampaign = data
    }

    // If reward_tiers provided, replace them
    let tiers
    if (reward_tiers) {
      await supabase.from('reward_tiers').delete().eq('campaign_id', id)

      const tierRows = reward_tiers.map((tier, i) => ({
        ...tier,
        campaign_id: id,
        tier_order: tier.tier_order ?? i + 1,
      }))

      const { data: newTiers, error: tierError } = await supabase
        .from('reward_tiers')
        .insert(tierRows)
        .select()

      if (tierError) {
        return NextResponse.json({ error: tierError.message }, { status: 500 })
      }
      tiers = newTiers
    } else {
      const { data } = await supabase
        .from('reward_tiers')
        .select('*')
        .eq('campaign_id', id)
        .order('tier_order')
      tiers = data
    }

    return NextResponse.json({ ...updatedCampaign, reward_tiers: tiers ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await getAuthAndCampaign(id)
    if ('error' in result && result.error instanceof NextResponse) return result.error
    const { supabase } = result as Awaited<ReturnType<typeof getAuthAndCampaign>> & { supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> }

    const { error } = await supabase.from('campaigns').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
