'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../supabase'

type Item = {
  id: string
  name: string
  emoji: string
  description: string
  category: string
  favor_cost: number
  max_duration_days: number
  condition: string
  pickup_notes: string
  is_available: boolean
  profiles: {
    username: string
    avg_rating: number
    trust_tier: string
    favor_balance: number
  }
}

export default function ItemDetail() {
  const router = useRouter()
  const params = useParams()
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userFavors, setUserFavors] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setCurrentUserId(session.user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('favor_balance')
        .eq('id', session.user.id)
        .single()
      if (profile) setUserFavors(profile.favor_balance)

      const { data } = await supabase
        .from('items')
        .select('*, profiles(username, avg_rating, trust_tier, favor_balance)')
        .eq('id', params.id)
        .single()
      if (data) setItem(data)
      setLoading(false)
    })
  }, [])

  async function handleRequest() {
    if (!item || !currentUserId) return
    if (userFavors < item.favor_cost) {
      alert(`You need ${item.favor_cost} favors to borrow this. You have ${userFavors}. Lend something first to earn more!`)
      return
    }
    setRequesting(true)

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + item.max_duration_days)

    const { error } = await supabase.from('exchanges').insert({
      item_id: item.id,
      borrower_id: currentUserId,
      lender_id: (await supabase.from('items').select('owner_id').eq('id', item.id).single()).data?.owner_id,
      status: 'requested',
      favor_cost: item.favor_cost,
      due_date: dueDate.toISOString().split('T')[0],
    })

    if (!error) setSuccess(true)
    setRequesting(false)
  }

  if (loading) return (
    <div style={{ maxWidth: 420, margin: '0 auto', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ fontSize: 14, color: '#888' }}>Loading…</div>
    </div>
  )

  if (!item) return (
    <div style={{ maxWidth: 420, margin: '0 auto', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ fontSize: 14, color: '#888' }}>Item not found</div>
    </div>
  )

  if (success) return (
    <div style={{ maxWidth: 420, margin: '0 auto', height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', fontFamily: 'system-ui, sans-serif', textAlign: 'center', gap: 10 }}>
      <div style={{ fontSize: 52 }}>🎉</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: '#111' }}>Request sent!</div>
      <div style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>@{item.profiles.username} will be notified. You'll hear back soon — no awkward follow-ups needed.</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: '#1D9E75', marginTop: 4 }}>🤝 {item.favor_cost} favors will be deducted at pickup</div>
      <button onClick={() => router.push('/')} style={{ marginTop: 20, padding: '12px 28px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Back to browse</button>
    </div>
  )

  const tierColors: Record<string, string> = {
    Newcomer: '#888',
    Trusted: '#1D9E75',
    Pillar: '#085041',
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#fff' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '0.5px solid #e5e5e5', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid #e5e5e5', background: 'transparent', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>Item detail</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Hero */}
        <div style={{ background: '#f5f5f5', padding: '32px 0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 64 }}>{item.emoji}</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#111' }}>{item.name}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 10, background: '#FAEEDA', color: '#633806' }}>🤝 {item.favor_cost} favors</span>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 10, background: '#e5e5e5', color: '#666' }}>{item.category}</span>
          </div>
        </div>

        {/* Owner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 16px 0', padding: '12px 14px', background: '#f5f5f5', borderRadius: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#9FE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: '#085041', flexShrink: 0 }}>
            {item.profiles.username.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>@{item.profiles.username}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>★ {item.profiles.avg_rating} avg rating</div>
          </div>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, background: '#E1F5EE', color: tierColors[item.profiles.trust_tier] || '#888', fontWeight: 500 }}>
            {item.profiles.trust_tier}
          </span>
        </div>

        {/* Description */}
        {item.description && (
          <div style={{ margin: '14px 16px 0' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>About this item</div>
            <div style={{ fontSize: 14, color: '#333', lineHeight: 1.6 }}>{item.description}</div>
          </div>
        )}

        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '14px 16px 0' }}>
          {[
            { label: 'Condition', value: item.condition },
            { label: 'Max duration', value: `${item.max_duration_days} ${item.max_duration_days === 1 ? 'day' : 'days'}` },
            { label: 'Pickup', value: item.pickup_notes || 'Message to arrange' },
            { label: 'Returns', value: 'Auto-reminded' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#f5f5f5', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: '#888' }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#111', marginTop: 3 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Friction-free callout */}
        <div style={{ margin: '14px 16px 0', padding: '12px 14px', background: '#E1F5EE', borderRadius: 12 }}>
          <div style={{ fontSize: 13, color: '#085041', lineHeight: 1.6 }}>
            📸 Photo check-in at pickup and return — no awkward conversations if something goes wrong. IoU handles it.
          </div>
        </div>

        {/* Cost box */}
        <div style={{ margin: '14px 16px 0', padding: '12px 14px', background: '#FAEEDA', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: '#633806' }}>Cost to borrow</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#412402' }}>🤝 {item.favor_cost} favors</div>
        </div>

        <div style={{ height: 100 }} />
      </div>

      {/* Bottom CTA */}
      <div style={{ padding: '12px 16px 24px', borderTop: '0.5px solid #e5e5e5', background: '#fff' }}>
        <button
          onClick={handleRequest}
          disabled={requesting || !item.is_available}
          style={{ width: '100%', padding: 14, background: item.is_available ? '#1D9E75' : '#ccc', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: item.is_available ? 'pointer' : 'not-allowed' }}
        >
          {!item.is_available ? 'Currently unavailable' : requesting ? 'Sending request…' : `Request to borrow · 🤝 ${item.favor_cost}`}
        </button>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#aaa' }}>Favors deducted at pickup, not now</div>
      </div>
    </div>
  )
}