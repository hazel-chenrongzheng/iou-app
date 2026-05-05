'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  exchange_id: string | null
  is_read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) setNotifications(data)

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false)

      setLoading(false)
    })
  }, [])

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    const hrs = Math.floor(mins / 60)
    const days = Math.floor(hrs / 24)
    if (days > 0) return `${days}d ago`
    if (hrs > 0) return `${hrs}h ago`
    if (mins > 0) return `${mins}m ago`
    return 'just now'
  }

  function notifIcon(type: string) {
    if (type === 'message') return '💬'
    if (type === 'status') return '📦'
    if (type === 'request') return '🤝'
    if (type === 'rating') return '⭐'
    return '🔔'
  }

  if (loading) return (
    <div style={{ maxWidth: '100%', margin: '0 auto', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ fontSize: 14, color: '#888' }}>Loading…</div>
    </div>
  )

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#fff' }}>

      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '0.5px solid #e5e5e5', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid #e5e5e5', background: 'transparent', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>Notifications</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {notifications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#aaa' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 14 }}>No notifications yet</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>You'll be notified when someone messages or requests to borrow</div>
          </div>
        )}
        {notifications.map(notif => (
          <div
            key={notif.id}
            onClick={() => notif.exchange_id && router.push(`/chat/${notif.exchange_id}`)}
            style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: '0.5px solid #e5e5e5', cursor: notif.exchange_id ? 'pointer' : 'default', background: notif.is_read ? 'transparent' : '#F0FAF6' }}
          >
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {notifIcon(notif.type)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: notif.is_read ? 400 : 500, color: '#111' }}>{notif.title}</div>
              {notif.body && <div style={{ fontSize: 13, color: '#888', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notif.body}</div>}
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{timeAgo(notif.created_at)}</div>
            </div>
            {!notif.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', flexShrink: 0, marginTop: 6 }} />}
          </div>
        ))}
      </div>
    </div>
  )
}