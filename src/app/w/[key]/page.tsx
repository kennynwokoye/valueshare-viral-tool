import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import WidgetForm from './WidgetForm'

interface Props {
  params: Promise<{ key: string }>
  searchParams: Promise<{ email?: string }>
}

export default async function WidgetPage({ params, searchParams }: Props) {
  const { key } = await params
  const { email: prefillEmail } = await searchParams
  const supabase = createAdminClient()

  const { data: widget, error } = await supabase
    .from('embed_widgets')
    .select('*, campaigns!inner(id, name, slug, headline, subheadline, status, total_participants)')
    .eq('widget_key', key)
    .single()

  if (error || !widget) {
    notFound()
  }

  const campaign = widget.campaigns as unknown as {
    id: string
    name: string
    slug: string
    headline: string | null
    subheadline: string | null
    status: string
    total_participants: number
  }

  // Record view event (fire-and-forget)
  supabase.from('widget_events').insert({
    widget_id: widget.id,
    event_type: 'view',
  }).then(() => {})

  if (campaign.status !== 'active') {
    return (
      <div className="wf-root wf-light">
        <div className="wf-card">
          <div className="wf-logo">&#9670; Value<span>Share</span></div>
          <div className="wf-ended">
            <div style={{ fontSize: 32, marginBottom: 12 }}>&#127937;</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Campaign has ended</div>
            <div style={{ fontSize: 13 }}>This campaign is no longer accepting new participants.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <WidgetForm
      campaignId={campaign.id}
      widgetId={widget.id}
      headline={widget.widget_headline ?? campaign.headline ?? 'Join & earn rewards'}
      subtext={widget.widget_subtext ?? campaign.subheadline ?? 'Get your unique referral link.'}
      ctaText={widget.widget_cta ?? 'Get Your Free Link \u2192'}
      theme={(widget.widget_theme as 'light' | 'dark') ?? 'light'}
      accentColor={widget.widget_accent_color ?? '#e85d3a'}
      successHeadline={widget.widget_success_headline ?? null}
      successMessage={widget.widget_success_message ?? null}
      participantCount={campaign.total_participants ?? 0}
      prefillEmail={prefillEmail}
    />
  )
}
