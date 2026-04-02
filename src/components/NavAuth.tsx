'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NavAuth() {
  const [status, setStatus] = useState<'loading' | 'authed' | 'guest'>('loading')

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setStatus(user ? 'authed' : 'guest')
    })
  }, [])

  if (status === 'authed') {
    return (
      <div className="nav-r">
        <Link href="/dashboard/creator" className="n-go">Dashboard →</Link>
      </div>
    )
  }

  // 'loading' and 'guest' both render the logged-out state (no layout flash)
  return (
    <div className="nav-r">
      <Link href="/auth/login" className="n-si">Sign in</Link>
      <Link href="/auth/signup" className="n-go">Get started free →</Link>
    </div>
  )
}
