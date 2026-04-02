import { createServerSupabaseClient } from '@/lib/supabase/server'
import MarketplaceClient from './MarketplaceClient'
import type { MarketplaceCampaign } from '@/types'

export const metadata = {
  title: 'Campaign Marketplace — ValueShare',
  description: 'Browse live campaigns and earn rewards by sharing your unique ValueShare link.',
}

export default async function MarketplacePage() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc('get_marketplace_campaigns')

  if (error) {
    console.error('Marketplace fetch error:', error.message)
  }

  const campaigns: MarketplaceCampaign[] = !error && Array.isArray(data) ? data : []

  return <MarketplaceClient campaigns={campaigns} />
}
