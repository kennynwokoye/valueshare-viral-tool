'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'info' | 'success' | 'celebration' | 'warning'
  icon?: string
  duration?: number
  onDismiss: () => void
}

export default function Toast({ message, type = 'info', icon, duration = 4000, onDismiss }: ToastProps) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(onDismiss, 300) // wait for exit animation
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  const typeColors: Record<string, string> = {
    info: 'var(--ink2)',
    success: 'var(--emerald)',
    celebration: 'var(--vs-accent, #e85d3a)',
    warning: 'var(--amber, #d97706)',
  }

  return (
    <div
      className={`vs-toast${exiting ? ' vs-toast-exit' : ''}`}
      style={{ borderLeftColor: typeColors[type] }}
      onClick={() => { setExiting(true); setTimeout(onDismiss, 300) }}
    >
      {icon && <span className="vs-toast-icon">{icon}</span>}
      <span className="vs-toast-msg">{message}</span>
    </div>
  )
}
