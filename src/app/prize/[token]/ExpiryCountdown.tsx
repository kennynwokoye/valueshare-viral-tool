'use client'

import { useState, useEffect } from 'react'

function calcRemaining(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export default function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(calcRemaining(expiresAt))

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(calcRemaining(expiresAt))
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  if (!remaining) {
    return (
      <div className="pz-expiry pz-expiry-ended">
        This reward link has expired.
      </div>
    )
  }

  const parts: string[] = []
  if (remaining.days > 0) parts.push(`${remaining.days}d`)
  parts.push(`${remaining.hours}h`)
  parts.push(`${remaining.minutes}m`)
  if (remaining.days === 0) parts.push(`${remaining.seconds}s`)

  return (
    <div className="pz-expiry">
      Access expires in {parts.join(' ')}
    </div>
  )
}
