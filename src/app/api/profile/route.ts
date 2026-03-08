import { NextResponse } from 'next/server'
import {
  createServerSupabaseClient,
  createAdminClient,
} from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('creator_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code === 'PGRST116') {
      return NextResponse.json({
        name: '',
        bio: '',
        website: '',
        photo_url: null,
        email: user.email,
        notification_preferences: null,
      })
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ...profile,
      email: user.email,
      notification_preferences:
        user.user_metadata?.notification_preferences ?? null,
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, bio, website, photo_url, notification_preferences } = body

    // Build profileData with only defined fields
    const profileData: Record<string, unknown> = {}
    if (name !== undefined) profileData.name = name
    if (bio !== undefined) profileData.bio = bio
    if (website !== undefined) profileData.website = website
    if (photo_url !== undefined) profileData.photo_url = photo_url

    // Upsert creator_profiles if there are profile fields to update
    if (Object.keys(profileData).length > 0) {
      const { error: upsertError } = await supabase
        .from('creator_profiles')
        .upsert(
          {
            user_id: user.id,
            name: name ?? '',
            ...profileData,
          },
          { onConflict: 'user_id' }
        )

      if (upsertError) {
        return NextResponse.json(
          { error: upsertError.message },
          { status: 500 }
        )
      }
    }

    // Update user metadata if notification_preferences or name changed
    if (notification_preferences !== undefined || name !== undefined) {
      const metadataUpdate: Record<string, unknown> = {}
      if (notification_preferences !== undefined) {
        metadataUpdate.notification_preferences = notification_preferences
      }
      if (name !== undefined) {
        metadataUpdate.name = name
      }

      const { error: metaError } = await supabase.auth.updateUser({
        data: metadataUpdate,
      })

      if (metaError) {
        return NextResponse.json(
          { error: metaError.message },
          { status: 500 }
        )
      }
    }

    // Fetch and return updated profile
    const { data: updatedProfile, error: fetchError } = await supabase
      .from('creator_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      )
    }

    // Re-fetch user to get updated metadata
    const {
      data: { user: updatedUser },
    } = await supabase.auth.getUser()

    return NextResponse.json({
      ...updatedProfile,
      email: updatedUser?.email ?? user.email,
      notification_preferences:
        updatedUser?.user_metadata?.notification_preferences ?? null,
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { error } = await admin.auth.admin.deleteUser(user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
