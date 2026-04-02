import { cookies, headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('campaigns')
    .select('name, headline')
    .eq('slug', slug)
    .single()

  return {
    title: data ? `Thanks — ${data.name}` : 'Thank You',
    description: data?.headline || 'Thank you for registering!',
  }
}

export default async function ThanksPage({ params }: Props) {
  const { slug } = await params
  const supabase = createAdminClient()

  // Look up campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, slug, headline, hero_image_url, status, landing_config')
    .eq('slug', slug)
    .single()

  if (!campaign) notFound()

  const cookieStore = await cookies()
  const pendingRef = cookieStore.get('vs_pending_ref')?.value
  let conversionRecorded = false

  if (pendingRef && campaign.status === 'active') {
    // Look up the referring participant
    const { data: referrer } = await supabase
      .from('participants')
      .select('id')
      .eq('referral_code', pendingRef)
      .eq('campaign_id', campaign.id)
      .single()

    if (referrer) {
      // Get visitor IP for server-side dedup
      const hdrs = await headers()
      const ip =
        hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        hdrs.get('x-real-ip') ||
        '0.0.0.0'

      // Server-side dedup: check if conversion already recorded for this ref + IP in last 24h
      const { count } = await supabase
        .from('conversions')
        .select('id', { count: 'exact', head: true })
        .eq('ref_code', pendingRef)
        .eq('ip_address', ip)
        .gte('created_at', new Date(Date.now() - 86400000).toISOString())

      if ((count ?? 0) === 0) {
        // Record conversion — triggers handle_conversion_insert (increments conversion_count, checks rewards)
        const { error } = await supabase.from('conversions').insert({
          participant_id: referrer.id,
          campaign_id: campaign.id,
          ref_code: pendingRef,
          event_type: 'registration',
          metadata: { source: 'thankyou_page' },
          ip_address: ip,
          user_agent: hdrs.get('user-agent'),
        })

        conversionRecorded = !error
      }
    }

    // Clear cookie to prevent duplicate on refresh (set expired)
    cookieStore.delete('vs_pending_ref')
  }

  // Parse accent color from landing_config
  const config = (campaign.landing_config ?? {}) as Record<string, string>
  const accent = config.accentColor || '#e85d3a'

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background: '#f4f3f0',
        fontFamily: "'Cabinet Grotesk', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          background: '#ffffff',
          borderRadius: 16,
          padding: '3rem 2rem',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        {/* Checkmark */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: '#1c1917',
            margin: '0 0 0.75rem',
            lineHeight: 1.2,
          }}
        >
          You&apos;re registered!
        </h1>

        <p
          style={{
            fontSize: '1.05rem',
            color: '#57534e',
            margin: '0 0 2rem',
            lineHeight: 1.6,
          }}
        >
          Thanks for signing up for <strong>{campaign.name}</strong>.
          {conversionRecorded
            ? ' Your registration has been confirmed.'
            : ' We look forward to seeing you there.'}
        </p>

        {campaign.hero_image_url && (
          <img
            src={campaign.hero_image_url}
            alt={campaign.name}
            style={{
              width: '100%',
              borderRadius: 10,
              marginBottom: '1.5rem',
              objectFit: 'cover',
              maxHeight: 200,
            }}
          />
        )}

        <a
          href={`/c/${campaign.slug}`}
          style={{
            display: 'inline-block',
            padding: '0.75rem 2rem',
            background: accent,
            color: '#fff',
            borderRadius: 9,
            fontWeight: 600,
            fontSize: '0.95rem',
            textDecoration: 'none',
          }}
        >
          View campaign page
        </a>
      </div>

      <p
        style={{
          marginTop: '2rem',
          fontSize: '0.8rem',
          color: '#a8a29e',
        }}
      >
        Powered by{' '}
        <a href="https://valueshare.co" style={{ color: accent, textDecoration: 'none' }}>
          ValueShare
        </a>
      </p>
    </div>
  )
}
