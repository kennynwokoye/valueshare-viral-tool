'use client'

import { useEffect } from 'react'
import confetti from 'canvas-confetti'

interface CelebrationOverlayProps {
  rewardLabel: string
  rewardType: string
  tierLabel: string
  onDismiss: () => void
  onViewReward: () => void
}

const typeEmoji: Record<string, string> = {
  file: '📁',
  video_url: '🎬',
  call_booking: '📞',
  external_url: '🔗',
}

export default function CelebrationOverlay({
  rewardLabel,
  rewardType,
  tierLabel,
  onDismiss,
  onViewReward,
}: CelebrationOverlayProps) {
  useEffect(() => {
    // Fire confetti burst
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.55 },
      colors: ['#e85d3a', '#059669', '#d97706', '#3b82f6', '#8b5cf6'],
    })
    // Second burst after a brief delay
    const timer = setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 100,
        origin: { y: 0.4, x: 0.3 },
      })
      confetti({
        particleCount: 60,
        spread: 100,
        origin: { y: 0.4, x: 0.7 },
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onDismiss])

  return (
    <div className="cele-backdrop" onClick={onDismiss}>
      <div className="cele-card" onClick={(e) => e.stopPropagation()}>
        <div className="cele-emoji">{typeEmoji[rewardType] ?? '🎁'}</div>
        <div className="cele-title">You unlocked it!</div>
        <div className="cele-reward">{rewardLabel}</div>
        <div className="cele-tier">{tierLabel}</div>
        <div className="cele-actions">
          <button className="cele-btn-primary" onClick={onViewReward}>
            View My Reward →
          </button>
          <button className="cele-btn-secondary" onClick={onDismiss}>
            Keep Sharing
          </button>
        </div>
      </div>
    </div>
  )
}
