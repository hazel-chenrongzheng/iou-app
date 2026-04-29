'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

type ISORequest = {
  id: string
  title: string
  description: string
  category: string
  favor_cost: number
  cash_offer: number | null
  lat: number
  lng: number
  status: string
  expires_at: string
  created_at: string
  profiles: { username: string; avg_rating: number; trust_tier: string }
}

const CATEGORIES = ['All', 'Tools', 'Kitchen', 'Books', 'Outdoors', 'Tech', 'Games', 'Other']

function timeLeft(expires_at: string) {
  const diff = new Date(expires_at).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) return `${hrs}h ${mins % 60}m left`
  return `${mins}m left`
}

export default function ISOPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<ISORequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUserId(session.user.id)
      await loadRequests()
    })

    const channel = supabase
      .channel('iso_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iso_requests' }, () => loadRequests())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadRequests() {
    const { data } = await supabase
      .from('iso_requests')
      .select('*, profiles(username, avg_rating, trust_tier)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    if (data) setRequests(data)
    setLoading(false)
  }

  const filtered = activeCategory === 'All'
    ? requests
    : requests.filter(r => r.category === activeCategory)

  if (loading) return (
    <div style={{ maxWidth: '100%', margin: '0 auto', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ fontSize: 14, color: '#888' }}>Loading…</div>
    </div>
  )

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto', height: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#fff', position: 'relative' }}>

      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #e5e5e5' }}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -1 }}>io<span style={{ color: '#1D9E75' }}>U</span></div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#185FA5', background: '#E6F1FB', padding: '4px 10px', borderRadius: 20 }}>📍 ISO Feed</div>
      </div>

      <div style={{ display: 'flex', gap: 7, padding: '10px 16px 6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, border: `0.5px solid ${activeCategory === cat ? '#5DCAA5' : '#e5e5e5'}`, background: activeCategory === cat ? '#E1F5EE' : '#fff', color: activeCategory === cat ? '#0F6E56' : '#888', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {cat}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#aaa' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 14 }}>No open ISO requests right now</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Be the first to post one!</div>
          </div>
        )}
        {filtered.map(req => (
          <div key={req.id} onClick={() => router.push(`/iso/${req.id}`)} style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 14, padding: '14px', marginBottom: 10, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#E6F1FB', color: '#185FA5', fontWeight: 500 }}>ISO</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f5f5f5', color: '#888' }}>{req.category}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>{req.title}</div>
                {req.description && <div style={{ fontSize: 13, color: '#888', marginTop: 3, lineHeight: 1.5 }}>{req.description}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#9FE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#085041' }}>
                {req.profiles?.username?.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ fontSize: 12, color: '#888' }}>@{req.profiles?.username}</span>
              <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>⏰ {timeLeft(req.expires_at)}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {req.favor_cost > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#FAEEDA', color: '#633806' }}>🤝 {req.favor_cost} favors</span>}
              {req.cash_offer && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#E1F5EE', color: '#085041' }}>💵 ${req.cash_offer} offer</span>}
              {req.profiles?.trust_tier && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f5f5f5', color: '#888' }}>{req.profiles.trust_tier}</span>}
            </div>
          </div>
        ))}
        <div style={{ height: 80 }} />
      </div>

      <div onClick={() => router.push('/iso/new')} style={{ position: 'absolute', bottom: 72, right: 16, width: 52, height: 52, borderRadius: '50%', background: '#185FA5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.15)', zIndex: 20 }}>+</div>

      <div style={{ display: 'flex', borderTop: '0.5px solid #e5e5e5', background: '#fff', padding: '8px 0 12px' }}>
        {[
          { icon: '⌂', label: 'Browse', path: '/' },
          { icon: '📍', label: 'ISO', path: '/iso' },
          { icon: '↕', label: 'Activity', path: '/activity' },
          { icon: '◉', label: 'Profile', path: '/profile' },
        ].map(({ icon, label, path }) => (
          <div key={label} onClick={() => router.push(path)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
            <div style={{ fontSize: 18 }}>{icon}</div>
            <div style={{ fontSize: 10, color: label === 'ISO' ? '#185FA5' : '#aaa', fontWeight: label === 'ISO' ? 500 : 400 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}