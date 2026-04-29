'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'
type Exchange = {
  id: string
  status: string
  favor_cost: number
  created_at: string
  returned_at: string | null
  borrower_id: string
  lender_id: string
  items: { name: string; emoji: string }
  borrower: { username: string }
  lender: { username: string }
}

type Profile = {
  username: string
  favor_balance: number
  trust_tier: string
  avg_rating: number
  total_lends: number
}

const TIER_INFO = [
  { name: 'Newcomer', emoji: '🌱', req: '0+ lends', perk: 'Borrow 1 item at a time', minLends: 0, minRating: 0 },
  { name: 'Trusted',  emoji: '🤝', req: '5+ lends · 4.5★', perk: 'Borrow up to 3 items · priority access', minLends: 5, minRating: 4.5 },
  { name: 'Pillar',   emoji: '⭐', req: '20+ lends · 4.8★', perk: 'Unlimited borrows · Pillar badge', minLends: 20, minRating: 4.8 },
]

const EARN_WAYS = [
  { icon: '📦', action: 'Lend an item', reward: '+2 🤝' },
  { icon: '⏰', action: 'Return on time', reward: '+1 🤝' },
  { icon: '⭐', action: 'Receive a 5★ rating', reward: '+1 🤝' },
  { icon: '👋', action: 'Invite a neighbor', reward: '+3 🤝' },
  { icon: '🆕', action: 'Sign up bonus', reward: '+5 🤝' },
]

export default function FavorsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUserId(session.user.id)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, favor_balance, trust_tier, avg_rating, total_lends')
        .eq('id', session.user.id)
        .single()
      if (profileData) setProfile(profileData)

      const { data: exchangeData } = await supabase
        .from('exchanges')
        .select(`
          *,
          items(name, emoji),
          borrower:profiles!exchanges_borrower_id_fkey(username),
          lender:profiles!exchanges_lender_id_fkey(username)
        `)
        .or(`borrower_id.eq.${session.user.id},lender_id.eq.${session.user.id}`)
        .in('status', ['returned', 'completed'])
        .order('created_at', { ascending: false })
        .limit(20)
      if (exchangeData) setExchanges(exchangeData)

      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{ maxWidth: 420, margin: '0 auto', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ fontSize: 14, color: '#888' }}>Loading…</div>
    </div>
  )

  const tier = profile?.trust_tier || 'Newcomer'
  const currentTierIndex = TIER_INFO.findIndex(t => t.name === tier)

  // Calculate earned and spent from exchange history
  const earned = exchanges
    .filter(e => e.lender_id === userId)
    .reduce((sum, e) => sum + (e.favor_cost || 0) + 1, 0)
  const spent = exchanges
    .filter(e => e.borrower_id === userId)
    .reduce((sum, e) => sum + (e.favor_cost || 0), 0)

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', height: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#fff' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #e5e5e5' }}>
        <button onClick={() => router.push('/')} style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid #e5e5e5', background: 'transparent', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>Favors wallet</div>
        <div style={{ width: 32 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Balance card */}
        <div style={{ margin: '16px 16px 0', background: '#1D9E75', borderRadius: 16, padding: '20px' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Current balance</div>
          <div style={{ fontSize: 42, fontWeight: 700, color: '#fff', letterSpacing: -1 }}>🤝 {profile?.favor_balance || 0}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>favors</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>+{earned}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>earned</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>-{spent}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>spent</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{TIER_INFO[currentTierIndex]?.emoji} {tier}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>trust tier</div>
            </div>
          </div>
        </div>

        {/* Trust tiers */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Trust tiers</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TIER_INFO.map((t, i) => {
              const isCurrent = t.name === tier
              const isUnlocked = i <= currentTierIndex
              return (
                <div key={t.name} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px', background: isCurrent ? '#E1F5EE' : '#f5f5f5', borderRadius: 12, border: `0.5px solid ${isCurrent ? '#5DCAA5' : '#e5e5e5'}` }}>
                  <div style={{ fontSize: 24, width: 32, textAlign: 'center' }}>{t.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: isCurrent ? '#085041' : '#111' }}>{t.name}</div>
                      {isCurrent && <span style={{ fontSize: 10, padding: '2px 7px', background: '#1D9E75', color: '#fff', borderRadius: 8 }}>you</span>}
                      {!isUnlocked && <span style={{ fontSize: 10, padding: '2px 7px', background: '#f5f5f5', color: '#aaa', borderRadius: 8, border: '0.5px solid #e5e5e5' }}>locked</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{t.req}</div>
                    <div style={{ fontSize: 11, color: isCurrent ? '#0F6E56' : '#aaa', marginTop: 2 }}>{t.perk}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* How to earn */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>How to earn favors</div>
          <div style={{ background: '#f5f5f5', borderRadius: 14, overflow: 'hidden' }}>
            {EARN_WAYS.map(({ icon, action, reward }, i) => (
              <div key={action} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < EARN_WAYS.length - 1 ? '0.5px solid #e5e5e5' : 'none' }}>
                <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{icon}</span>
                <div style={{ flex: 1, fontSize: 13, color: '#111' }}>{action}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1D9E75' }}>{reward}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction history */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recent activity</div>
          {exchanges.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#aaa', fontSize: 14 }}>No completed exchanges yet</div>
          )}
          {exchanges.map(ex => {
            const isBorrower = ex.borrower_id === userId
            const amount = isBorrower ? -(ex.favor_cost || 0) : +(ex.favor_cost || 0) + 1
            return (
              <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid #e5e5e5' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: amount > 0 ? '#1D9E75' : '#D85A30', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#111' }}>
                    {isBorrower ? `Borrowed ${ex.items?.emoji} ${ex.items?.name}` : `Lent ${ex.items?.emoji} ${ex.items?.name}`}
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                    {isBorrower ? `from @${ex.lender?.username}` : `to @${ex.borrower?.username}`} · {new Date(ex.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: amount > 0 ? '#1D9E75' : '#D85A30' }}>
                  {amount > 0 ? '+' : ''}{amount} 🤝
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ height: 24 }} />
      </div>

      {/* Bottom nav */}
      <div style={{ display: 'flex', borderTop: '0.5px solid #e5e5e5', background: '#fff', padding: '8px 0 12px' }}>
        {[
          { icon: '⌂', label: 'Browse', path: '/' },
          { icon: '🤝', label: 'Favors', path: '/favors' },
          { icon: '↕', label: 'Activity', path: '/activity' },
          { icon: '◉', label: 'Profile', path: '/profile' },
        ].map(({ icon, label, path }) => (
          <div key={label} onClick={() => router.push(path)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
            <div style={{ fontSize: 18 }}>{icon}</div>
            <div style={{ fontSize: 10, color: label === 'Favors' ? '#1D9E75' : '#aaa', fontWeight: label === 'Favors' ? 500 : 400 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
