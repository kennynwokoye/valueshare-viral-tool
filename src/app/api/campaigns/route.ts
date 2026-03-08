import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { CreateCampaignPayload } from '@/types'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch reward tiers for all campaigns in one query
    const campaignIds = (campaigns ?? []).map((c) => c.id)
    let tiers: Record<string, unknown[]> = {}

    if (campaignIds.length > 0) {
      const { data: allTiers } = await supabase
        .from('reward_tiers')
        .select('*')
        .in('campaign_id', campaignIds)
        .order('tier_order', { ascending: true })

      // Group tiers by campaign_id
      for (const tier of allTiers ?? []) {
        const cid = tier.campaign_id as string
        if (!tiers[cid]) tiers[cid] = []
        tiers[cid].push(tier)
      }
    }

    const result = (campaigns ?? []).map((c) => ({
      ...c,
      reward_tiers: tiers[c.id] ?? [],
    }))

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateCampaignPayload = await request.json()

    // Validate required fields
    const errors: string[] = []
    if (!body.name?.trim()) errors.push('name is required')
    if (!body.headline?.trim()) errors.push('headline is required')
    if (!body.destination_url?.trim()) errors.push('destination_url is required')
    if (!body.kpi_type) errors.push('kpi_type is required')
    if (!body.reward_tiers?.length) errors.push('At least one reward tier is required')

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 })
    }

    // Generate slug
    const { data: slug, error: slugError } = await supabase.rpc(
      'generate_campaign_slug',
      { campaign_name: body.name }
    )
    if (slugError) {
      return NextResponse.json({ error: slugError.message }, { status: 500 })
    }

    // Extract reward_tiers from payload — everything else goes into campaigns
    const { reward_tiers, ...campaignFields } = body

    const { data: campaign, error: insertError } = await supabase
      .from('campaigns')
      .insert({
        ...campaignFields,
        creator_id: user.id,
        slug,
        status: 'draft',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Insert reward tiers
    const tierRows = reward_tiers.map((tier, i) => ({
      ...tier,
      campaign_id: campaign.id,
      tier_order: tier.tier_order ?? i + 1,
    }))

    const { data: insertedTiers, error: tierError } = await supabase
      .from('reward_tiers')
      .insert(tierRows)
      .select()

    if (tierError) {
      return NextResponse.json({ error: tierError.message }, { status: 500 })
    }

    // Create embed widget with defaults
    const { error: widgetError } = await supabase.from('embed_widgets').insert({ campaign_id: campaign.id })
    if (widgetError) {
      console.error('Failed to create embed widget:', widgetError.message)
    }

    return NextResponse.json(
      { ...campaign, reward_tiers: insertedTiers ?? [] },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
