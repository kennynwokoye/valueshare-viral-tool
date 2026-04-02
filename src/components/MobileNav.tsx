'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setAuthed(!!user)
    })
  }, [])

  return (
    <>
      <button className="hp-mob-btn" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu size={22} />
      </button>
      {open && (
        <div className="hp-mob-overlay">
          <div className="hp-mob-header">
            <div className="hp-mob-logo">
              <div className="hp-logo-ic">◆</div>ValueShare
            </div>
            <button className="hp-mob-close" onClick={() => setOpen(false)} aria-label="Close menu">
              <X size={22} />
            </button>
          </div>
          <nav className="hp-mob-links">
            <Link href="/marketplace" onClick={() => setOpen(false)}>Marketplace</Link>
            <a href="#how" onClick={() => setOpen(false)}>How it works</a>
            <a href="#features" onClick={() => setOpen(false)}>Features</a>
            <Link href="/pricing" onClick={() => setOpen(false)}>Pricing</Link>
          </nav>
          <div className="hp-mob-actions">
            {authed ? (
              <Link href="/dashboard/creator" className="n-go" onClick={() => setOpen(false)}>Dashboard →</Link>
            ) : (
              <>
                <Link href="/auth/login" className="n-si" onClick={() => setOpen(false)}>Sign in</Link>
                <Link href="/auth/signup" className="n-go" onClick={() => setOpen(false)}>Get started free →</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
