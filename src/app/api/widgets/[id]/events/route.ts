import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const VALID_EVENT_TYPES = new Set(['view', 'click', 'submit'])

interface Props {
  params: Promise<{ id: string }>
}

/* ------------------------------------------------------------------ */
/*  POST — record a widget event (no auth — called from embeds)       */
/* ------------------------------------------------------------------ */

export async function POST(request: Request, { params }: Props) {
  try {
    const { id: widgetId } = await params
    const body = await request.json()

    const eventType: string | undefined = body.event_type
    const referrerDomain: string | undefined = body.referrer_domain

    // Validate event_type
    if (!eventType || !VALID_EVENT_TYPES.has(eventType)) {
      return NextResponse.json(
        { error: 'event_type must be one of: view, click, submit' },
        { status: 400 }
      )
    }

    // Extract client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwarded?.split(',')[0]?.trim() ?? realIp ?? 'unknown'

    // Admin client (synchronous — bypasses RLS)
    const admin = createAdminClient()

    // Simple rate limit: reject duplicate widget_id + event_type + ip within 60s
    const oneMinuteAgo = new Date()
    oneMinuteAgo.setSeconds(oneMinuteAgo.getSeconds() - 60)

    const { data: recent } = await admin
      .from('widget_events')
      .select('id')
      .eq('widget_id', widgetId)
      .eq('event_type', eventType)
      .eq('ip_address', ipAddress)
      .gte('created_at', oneMinuteAgo.toISOString())
      .limit(1)

    if (recent && recent.length > 0) {
      // Silently accept — don't leak rate-limit info but skip the insert
      return NextResponse.json({ ok: true })
    }

    // Insert the event
    const { error: insertError } = await admin.from('widget_events').insert({
      widget_id: widgetId,
      event_type: eventType,
      referrer_domain: referrerDomain ?? null,
      ip_address: ipAddress,
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
