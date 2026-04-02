import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { name, bio } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Creator name is required' }, { status: 400 })

    // Get the authenticated user via the session cookie
    const cookieStore = await cookies()
    const supabaseUser = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )

    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check current role
    const { data: userRow } = await supabaseUser
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (userRow.role === 'creator') {
      return NextResponse.json({ error: 'Already a creator' }, { status: 400 })
    }

    // Use admin client for privileged operations
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Check if creator_profiles row already exists
    const { data: existing } = await admin
      .from('creator_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existing) {
      const { error: profileError } = await admin
        .from('creator_profiles')
        .insert({ user_id: user.id, name: name.trim(), bio: bio?.trim() || null })

      if (profileError) {
        console.error('[add-creator-role] insert creator_profiles:', profileError)
        return NextResponse.json({ error: 'Failed to create creator profile' }, { status: 500 })
      }
    }

    // Update role to 'both' (participant who also has creator access)
    const newRole = userRow.role === 'participant' ? 'both' : userRow.role
    const { error: roleError } = await admin
      .from('users')
      .update({ role: newRole })
      .eq('id', user.id)

    if (roleError) {
      console.error('[add-creator-role] update role:', roleError)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[add-creator-role]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
