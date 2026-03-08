import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: templates, error } = await supabase
      .from('campaign_templates_ref')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(templates ?? [])
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
