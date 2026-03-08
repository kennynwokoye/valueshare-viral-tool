import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import OnboardingWizard from './OnboardingWizard'
import type { Campaign, RewardTier, CampaignPromoAsset } from '@/types'

export default async function ParticipantOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>
}) {
  const { campaign: campaignId } = await searchParams
  const supabase = await createServerSupabaseClient()

  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/join')
  }

  // If no campaign specified, go straight to dashboard
  if (!campaignId) {
    redirect('/dashboard/participant')
  }

  // Fetch full campaign record
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id,name,slug,template,headline,subheadline,description,hero_image_url,hero_video_url,benefits,how_it_works,creator_display_name,creator_photo_url,destination_url,thankyou_page_url,kpi_type,deadline,show_countdown,participant_cap,social_proof_visible,status,total_participants,total_clicks,marketplace_listed,created_at,updated_at,creator_id')
    .eq('id', campaignId)
    .single()

  if (!campaign) {
    redirect('/dashboard/participant')
  }

  // Check if participant already exists for this user + campaign
  const { data: existing } = await supabase
    .from('participants')
    .select('id, referral_code, email')
    .eq('user_id', user.id)
    .eq('campaign_id', campaignId)
    .single()

  if (existing) {
    // Already joined — go to dashboard with campaign pre-selected
    redirect(`/dashboard/participant?campaign=${campaignId}`)
  }

  // Create participant record with auto-generated referral code
  const { data: referralCode } = await supabase.rpc('generate_referral_code')

  const { error: insertError } = await supabase
    .from('participants')
    .insert({
      user_id: user.id,
      campaign_id: campaignId,
      email: user.email!,
      referral_code: referralCode as string,
    })

  if (insertError) {
    // If unique constraint violation, participant was created concurrently
    if (insertError.code === '23505') {
      redirect(`/dashboard/participant?campaign=${campaignId}`)
    }
    // For other errors, go to dashboard without campaign selection
    redirect('/dashboard/participant')
  }

  // Fetch first reward tier and promo assets in parallel
  const [{ data: tiersData }, { data: assetsData }] = await Promise.all([
    supabase
      .from('reward_tiers')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('tier_order', { ascending: true }),
    supabase
      .from('campaign_promo_assets')
      .select('*')
      .eq('campaign_id', campaignId),
  ])

  const firstTier: RewardTier | null = tiersData?.[0] ?? null
  const promoAssets: CampaignPromoAsset[] = assetsData ?? []

  return (
    <OnboardingWizard
      referralCode={referralCode as string}
      email={user.email!}
      campaign={campaign as Campaign}
      firstTier={firstTier}
      promoAssets={promoAssets}
    />
  )
}
