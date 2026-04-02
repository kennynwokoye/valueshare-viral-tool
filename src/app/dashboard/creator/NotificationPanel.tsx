'use client'

import type { Notification, NotificationType } from '@/types'

interface Props {
  notifications: Notification[]
  onClose: () => void
  onMarkAllRead: () => void
  onMarkRead: (id: string) => void
}

function typeIcon(type: NotificationType): string {
  if (type === 'new_participant') return '🧑'
  if (type === 'reward_unlocked') return '🏆'
  if (type === 'fraud_spike') return '⚠️'
  return '🔔'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function NotificationPanel({
  notifications,
  onMarkAllRead,
  onMarkRead,
}: Props) {
  const hasUnread = notifications.some((n) => !n.is_read)

  return (
    <div className="np-panel" onClick={(e) => e.stopPropagation()}>
      <div className="np-header">
        <span className="np-title">Notifications</span>
        {hasUnread && (
          <button className="np-mark-btn" onClick={onMarkAllRead}>
            Mark all as read
          </button>
        )}
      </div>
      <div className="np-list">
        {notifications.length === 0 ? (
          <div className="np-empty">No notifications yet</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`np-item${n.is_read ? '' : ' unread'}`}
              onClick={() => { if (!n.is_read) onMarkRead(n.id) }}
            >
              <div className={`np-item-bar ${n.type}`} />
              <div className="np-item-icon">{typeIcon(n.type)}</div>
              <div className="np-item-body">
                <div className="np-item-title">{n.title}</div>
                <div className="np-item-msg">{n.message}</div>
                <div className="np-item-time">{timeAgo(n.created_at)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
