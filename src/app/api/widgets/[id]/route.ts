import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

/* ------------------------------------------------------------------ */
/*  Helper: authenticate + verify widget ownership via campaigns join */
/* ------------------------------------------------------------------ */

async function getAuthAndWidget(widgetId: string) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: widget, error } = await supabase
    .from('embed_widgets')
    .select('*, campaigns!inner(id, creator_id)')
    .eq('id', widgetId)
    .single()

  if (error || !widget) {
    return { error: NextResponse.json({ error: 'Widget not found' }, { status: 404 }) }
  }

  const campaign = widget.campaigns as unknown as {
    id: string
    creator_id: string
  }

  if (campaign.creator_id !== user.id) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabase, user, widget }
}

/* ------------------------------------------------------------------ */
/*  GET — widget details + analytics                                  */
/* ------------------------------------------------------------------ */

export async function GET(_request: Request, { params }: Props) {
  try {
    const { id } = await params
    const result = await getAuthAndWidget(id)
    if ('error' in result && result.error instanceof NextResponse) return result.error
    const { supabase, widget } = result as Awaited<ReturnType<typeof getAuthAndWidget>> & {
      supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
      widget: Record<string, unknown>
    }

    // Fetch widget_events for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: events } = await supabase
      .from('widget_events')
      .select('event_type, referrer_domain, created_at')
      .eq('widget_id', id)
      .gte('created_at', thirtyDaysAgo.toISOString())

    const allEvents = events ?? []

    // Totals by event_type
    let views = 0
    let clicks = 0
    let submits = 0

    for (const e of allEvents) {
      if (e.event_type === 'view') views++
      else if (e.event_type === 'click') clicks++
      else if (e.event_type === 'submit') submits++
    }

    const conversionRate = views > 0 ? submits / views : 0

    // Daily breakdown (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const dailyMap = new Map<string, Record<string, number>>()

    for (const e of allEvents) {
      const eventDate = new Date(e.created_at)
      if (eventDate < sevenDaysAgo) continue

      const day = eventDate.toISOString().split('T')[0]
      if (!dailyMap.has(day)) dailyMap.set(day, {})

      const dayBucket = dailyMap.get(day)!
      dayBucket[e.event_type] = (dayBucket[e.event_type] ?? 0) + 1
    }

    const daily = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, counts]) => ({ day, ...counts }))

    // Top 5 referrer domains
    const referrerMap = new Map<string, number>()

    for (const e of allEvents) {
      if (e.referrer_domain) {
        referrerMap.set(
          e.referrer_domain,
          (referrerMap.get(e.referrer_domain) ?? 0) + 1
        )
      }
    }

    const topReferrers = Array.from(referrerMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, count }))

    // Strip the joined campaigns object before returning the widget
    const { campaigns: _campaigns, ...widgetData } = widget as Record<string, unknown>

    return NextResponse.json({
      widget: widgetData,
      analytics: {
        views,
        clicks,
        submits,
        conversionRate,
        daily,
        topReferrers,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH — update widget customization fields                        */
/* ------------------------------------------------------------------ */

const ALLOWED_FIELDS = new Set([
  'widget_headline',
  'widget_subtext',
  'widget_cta',
  'widget_theme',
  'widget_accent_color',
  'widget_success_headline',
  'widget_success_message',
])

export async function PATCH(request: Request, { params }: Props) {
  try {
    const { id } = await params
    const result = await getAuthAndWidget(id)
    if ('error' in result && result.error instanceof NextResponse) return result.error
    const { supabase } = result as Awaited<ReturnType<typeof getAuthAndWidget>> & {
      supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
    }

    const body = await request.json()

    // Only pick allowed fields
    const updates: Record<string, unknown> = {}
    for (const key of Object.keys(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        updates[key] = body[key]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    updates.updated_at = new Date().toISOString()

    const { data: updated, error: updateError } = await supabase
      .from('embed_widgets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
