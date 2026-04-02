import { NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

// GET /api/campaigns/[id]/webhook-secret
// Returns existing secret or generates a new one.
// Only the campaign's creator can call this.
export async function GET(_request: Request, { params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Verify ownership
  const { data: campaign } = await admin
    .from('campaigns')
    .select('id, creator_id, webhook_secret')
    .eq('id', id)
    .single()

  if (!campaign || campaign.creator_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Return existing secret or generate one
  let secret = campaign.webhook_secret
  if (!secret) {
    secret = randomBytes(24).toString('hex')
    await admin
      .from('campaigns')
      .update({ webhook_secret: secret })
      .eq('id', id)
  }

  return NextResponse.json({ secret })
}

// DELETE /api/campaigns/[id]/webhook-secret
// Regenerates the webhook secret (rotation).
export async function DELETE(_request: Request, { params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: campaign } = await admin
    .from('campaigns')
    .select('id, creator_id')
    .eq('id', id)
    .single()

  if (!campaign || campaign.creator_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const newSecret = randomBytes(24).toString('hex')
  await admin
    .from('campaigns')
    .update({ webhook_secret: newSecret })
    .eq('id', id)

  return NextResponse.json({ secret: newSecret })
}
