'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

type Profile = {
  username: string
  full_name: string
  neighborhood: string
  favor_balance: number
  trust_tier: string
  avg_rating: number
  total_lends: number
}

type Item = {
  id: string
  name: string
  emoji: string
  category: string
  favor_cost: number
  is_available: boolean
  created_at: string
}

const TIER_INFO: Record<string, { emoji: string; color: string; bg: string; next: string }> = {
  Newcomer: { emoji: '🌱', color: '#888', bg: '#f5f5f5', next: 'Reach 4.5★ and 5 lends to become Trusted' },
  Trusted: { emoji: '🤝', color: '#0F6E56', bg: '#E1F5EE', next: 'Reach 4.8★ and 20 lends to become a Pillar' },
  Pillar: { emoji: '⭐', color: '#633806', bg: '#FAEEDA', next: "You've reached the top tier!" },
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      if (profileData) setProfile(profileData)

      const { data: itemsData } = await supabase
        .from('items')
        .select('id, name, emoji, category, favor_cost, is_available, created_at')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: false })
      if (itemsData) setItems(itemsData)

      setLoading(false)
    })
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  async function toggleAvailability(itemId: string, current: boolean) {
    await supabase.from('items').update({ is_available: !current }).eq('id', itemId)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, is_available: !current } : i))
  }

  if (loading) return (
    <div style={{ maxWidth: 420, margin: '0 auto', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ fontSize: 14, color: '#888' }}>Loading…</div>
    </div>
  )

  const tier = profile?.trust_tier || 'Newcomer'
  const tierInfo = TIER_INFO[tier]

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#fff' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #e5e5e5' }}>
        <button onClick={() => router.push('/')} style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid #e5e5e5', background: 'transparent', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>My profile</div>
        <button onClick={handleSignOut} style={{ fontSize: 12, color: '#888', background: 'transparent', border: '0.5px solid #e5e5e5', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>Sign out</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Avatar + name */}
        <div style={{ padding: '24px 16px 16px', display: 'flex', gap: 16, alignItems: 'center', borderBottom: '0.5px solid #e5e5e5' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#9FE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 600, color: '#085041', flexShrink: 0 }}>
            {profile?.username?.slice(0, 2).toUpperCase() || '??'}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>@{profile?.username}</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{profile?.neighborhood || 'UC Berkeley'}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '3px 10px', borderRadius: 10, background: tierInfo.bg }}>
              <span style={{ fontSize: 13 }}>{tierInfo.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: tierInfo.color }}>{tier}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, padding: '14px 16px' }}>
          {[
            { label: 'Avg rating', value: profile?.avg_rating ? `★ ${profile.avg_rating}` : '★ —' },
            { label: 'Total lends', value: profile?.total_lends || 0 },
            { label: 'Favors', value: `🤝 ${profile?.favor_balance || 0}` },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#f5f5f5', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>{value}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Trust tier progress */}
        <div style={{ margin: '0 16px 14px', padding: '12px 14px', background: tierInfo.bg, borderRadius: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: tierInfo.color, marginBottom: 4 }}>Trust tier — {tier}</div>
          <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{tierInfo.next}</div>
        </div>

        {/* How to earn more favors */}
        <div style={{ margin: '0 16px 14px', padding: '12px 14px', background: '#FAEEDA', borderRadius: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#633806', marginBottom: 6 }}>Earn more favors</div>
          {[
            { action: 'Lend an item', reward: '+2' },
            { action: 'Return on time', reward: '+1' },
            { action: 'Get a 5★ rating', reward: '+1' },
            { action: 'Invite a neighbor', reward: '+3' },
          ].map(({ action, reward }) => (
            <div key={action} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#633806', padding: '3px 0' }}>
              <span>{action}</span>
              <span style={{ fontWeight: 600 }}>{reward} 🤝</span>
            </div>
          ))}
        </div>

        {/* My listings */}
        <div style={{ padding: '0 16px 8px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>My listings ({items.length})</div>
          {items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#aaa', fontSize: 14 }}>
              No listings yet —{' '}
              <span onClick={() => router.push('/post')} style={{ color: '#1D9E75', cursor: 'pointer', fontWeight: 500 }}>post your first item</span>
            </div>
          )}
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#f5f5f5', borderRadius: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 22, width: 36, textAlign: 'center' }}>{item.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{item.category} · 🤝 {item.favor_cost}</div>
              </div>
              <div
                onClick={() => toggleAvailability(item.id, item.is_available)}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 10, background: item.is_available ? '#E1F5EE' : '#f5f5f5', color: item.is_available ? '#0F6E56' : '#aaa', border: `0.5px solid ${item.is_available ? '#5DCAA5' : '#e5e5e5'}`, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {item.is_available ? 'Available' : 'Unavailable'}
              </div>
            </div>
          ))}
        </div>

        {/* Add item CTA */}
        <div style={{ padding: '0 16px 32px' }}>
          <button onClick={() => router.push('/post')} style={{ width: '100%', padding: 13, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            + List a new item
          </button>
        </div>

      </div>

      {/* Bottom nav */}
      <div style={{ display: 'flex', borderTop: '0.5px solid #e5e5e5', background: '#fff', padding: '8px 0 12px' }}>
        {[
          { icon: '⌂', label: 'Browse', path: '/' },
          { icon: '🤝', label: 'Favors', path: '/' },
          { icon: '↕', label: 'Activity', path: '/' },
          { icon: '◉', label: 'Profile', path: '/profile' },
        ].map(({ icon, label, path }) => (
          <div key={label} onClick={() => router.push(path)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
            <div style={{ fontSize: 18 }}>{icon}</div>
            <div style={{ fontSize: 10, color: label === 'Profile' ? '#1D9E75' : '#aaa', fontWeight: label === 'Profile' ? 500 : 400 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}