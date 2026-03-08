import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params
  const admin = createAdminClient()

  /* ── Look up the widget and its parent campaign ── */
  const { data: widget } = await admin
    .from('embed_widgets')
    .select('id, campaign_id, campaigns!inner(slug)')
    .eq('widget_key', key)
    .single()

  if (!widget) {
    return NextResponse.redirect(new URL('/', request.url), 302)
  }

  /* ── Extract metadata from request headers ── */
  const referer = request.headers.get('referer')
  let referrerDomain: string | null = null
  if (referer) {
    try {
      referrerDomain = new URL(referer).hostname
    } catch {
      // malformed Referer — ignore
    }
  }

  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    null

  /* ── Record the click event ── */
  await admin.from('widget_events').insert({
    widget_id: widget.id,
    event_type: 'click',
    referrer_domain: referrerDomain,
    ip_address: ipAddress,
  })

  /* ── Redirect to the campaign landing page ── */
  const campaign = widget.campaigns as unknown as { slug: string }

  return NextResponse.redirect(
    new URL(`/c/${campaign.slug}`, request.url),
    302
  )
}
