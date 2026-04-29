'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

type Exchange = {
  id: string
  status: string
  favor_cost: number
  due_date: string
  created_at: string
  borrower_id: string
  lender_id: string
  borrower_review: string | null
  lender_review: string | null
  borrower_rating: number | null
  lender_rating: number | null
  items: {
    id: string
    name: string
    emoji: string
  }
  borrower: {
    username: string
  }
  lender: {
    username: string
  }
}

const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
  requested:  { label: 'Requested',   color: '#633806', bg: '#FAEEDA' },
  accepted:   { label: 'Accepted',    color: '#0F6E56', bg: '#E1F5EE' },
  picked_up:  { label: 'Active',      color: '#185FA5', bg: '#E6F1FB' },
  returned:   { label: 'Returned',    color: '#888',    bg: '#f5f5f5' },
  completed:  { label: 'Completed',   color: '#888',    bg: '#f5f5f5' },
  disputed:   { label: 'Disputed',    color: '#A32D2D', bg: '#FCEBEB' },
}

export default function ActivityPage() {
  const router = useRouter()
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'borrowing' | 'lending'>('borrowing')
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUserId(session.user.id)

      const { data } = await supabase
        .from('exchanges')
        .select(`
          *,
          items(id, name, emoji),
          borrower:profiles!exchanges_borrower_id_fkey(username),
          lender:profiles!exchanges_lender_id_fkey(username)
        `)
        .or(`borrower_id.eq.${session.user.id},lender_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false })

      if (data) setExchanges(data)
      setLoading(false)
    })
  }, [])

  async function handleAccept(exchangeId: string, itemId: string) {
    await supabase.from('exchanges').update({ status: 'accepted' }).eq('id', exchangeId)
    setExchanges(prev => prev.map(e => e.id === exchangeId ? { ...e, status: 'accepted' } : e))
  }

  async function handleMarkReturned(exchangeId: string) {
    await supabase.from('exchanges').update({ status: 'returned', returned_at: new Date().toISOString() }).eq('id', exchangeId)
    setExchanges(prev => prev.map(e => e.id === exchangeId ? { ...e, status: 'returned' } : e))
  }

  async function handleDispute(exchangeId: string) {
    await supabase.from('exchanges').update({ status: 'disputed' }).eq('id', exchangeId)
    setExchanges(prev => prev.map(e => e.id === exchangeId ? { ...e, status: 'disputed' } : e))
  }

  const borrowing = exchanges.filter(e => e.borrower_id === userId)
  const lending = exchanges.filter(e => e.lender_id === userId)
  const displayed = tab === 'borrowing' ? borrowing : lending

  const active = displayed.filter(e => !['completed', 'returned'].includes(e.status))
  const past = displayed.filter(e => ['completed', 'returned'].includes(e.status))

  function isOverdue(due_date: string) {
    return new Date(due_date) < new Date()
  }

  if (loading) return (
    <div style={{ maxWidth: 420, margin: '0 auto', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ fontSize: 14, color: '#888' }}>Loading…</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', height: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#fff' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #e5e5e5' }}>
        <button onClick={() => router.push('/')} style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid #e5e5e5', background: 'transparent', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>Activity</div>
        <div style={{ width: 32 }} />
      </div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', margin: '10px 16px 0', border: '0.5px solid #e5e5e5', borderRadius: 12, overflow: 'hidden', background: '#f5f5f5' }}>
        {(['borrowing', 'lending'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '8px 0', fontSize: 13, border: 'none', background: tab === t ? '#fff' : 'transparent', fontWeight: tab === t ? 500 : 400, color: tab === t ? '#111' : '#888', cursor: 'pointer', borderRadius: tab === t ? 10 : 0, margin: tab === t ? 2 : 0 }}>
            {t === 'borrowing' ? `Borrowing (${borrowing.length})` : `Lending (${lending.length})`}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>

        {displayed.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#aaa', fontSize: 14 }}>
            {tab === 'borrowing' ? 'No borrows yet — find something on the map!' : 'No lends yet — post an item to get started!'}
          </div>
        )}

        {/* Active exchanges */}
        {active.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Active</div>
            {active.map(ex => {
              const info = STATUS_INFO[ex.status] || STATUS_INFO.requested
              const overdue = ex.due_date && isOverdue(ex.due_date) && ex.status === 'picked_up'
              return (
                <div key={ex.id} style={{ background: '#fff', border: `0.5px solid ${overdue ? '#F09595' : '#e5e5e5'}`, borderRadius: 14, padding: '14px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 26 }}>{ex.items?.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{ex.items?.name}</div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                        {tab === 'borrowing' ? `from @${ex.lender?.username}` : `to @${ex.borrower?.username}`}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 10, background: info.bg, color: info.color, fontWeight: 500 }}>{info.label}</span>
                  </div>

                  {ex.due_date && (
                    <div style={{ fontSize: 12, color: overdue ? '#A32D2D' : '#888', marginBottom: 10 }}>
                      {overdue ? '⚠️ Overdue — ' : '⏰ Due '}{new Date(ex.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  )}

                  {/* Lender actions */}
                  <button onClick={() => router.push(`/chat/${ex.id}`)} style={{ width: '100%', padding: '8px', background: '#f5f5f5', color: '#111', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 12, cursor: 'pointer', marginBottom: 6 }}>
  💬 Open chat
</button>
                  {tab === 'lending' && ex.status === 'requested' && (
                    <button onClick={() => handleAccept(ex.id, ex.items?.id)} style={{ width: '100%', padding: '10px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                      Accept request
                    </button>
                  )}

                  {/* Borrower actions */}
                  {tab === 'borrowing' && ex.status === 'accepted' && (
                    <div style={{ fontSize: 12, color: '#0F6E56', background: '#E1F5EE', padding: '8px 12px', borderRadius: 8 }}>
                      ✓ Accepted! Arrange pickup with @{ex.lender?.username}
                    </div>
                  )}

                  {/* Mark returned */}
                  {tab === 'lending' && ex.status === 'picked_up' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleMarkReturned(ex.id)} style={{ flex: 1, padding: '10px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                        Mark returned
                      </button>
                      <button onClick={() => handleDispute(ex.id)} style={{ padding: '10px 14px', background: 'transparent', color: '#A32D2D', border: '0.5px solid #F09595', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>
                        Dispute
                      </button>
                    </div>
                  )}

                  {ex.status === 'disputed' && (
                    <div style={{ fontSize: 12, color: '#A32D2D', background: '#FCEBEB', padding: '8px 12px', borderRadius: 8 }}>
                      ⚠️ Dispute filed — our team will review this exchange within 24 hours.
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* Past exchanges */}
        {past.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: active.length > 0 ? 16 : 0 }}>Past</div>
            {past.map(ex => (
              <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#f5f5f5', borderRadius: 12, marginBottom: 8 }}>
                <div style={{ fontSize: 22 }}>{ex.items?.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{ex.items?.name}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    {tab === 'borrowing' ? `from @${ex.lender?.username}` : `to @${ex.borrower?.username}`} · 🤝 {ex.favor_cost}
                  </div>
                </div>
                <div style={{ fontSize: 11, padding: '3px 9px', borderRadius: 10, background: '#f5f5f5', color: '#888', border: '0.5px solid #e5e5e5' }}>Done</div>
              </div>
            ))}
          </>
        )}

        <div style={{ height: 16 }} />
      </div>

      {/* Bottom nav */}
      <div style={{ display: 'flex', borderTop: '0.5px solid #e5e5e5', background: '#fff', padding: '8px 0 12px' }}>
        {[
          { icon: '⌂', label: 'Browse', path: '/' },
          { icon: '🤝', label: 'Favors', path: '/' },
          { icon: '↕', label: 'Activity', path: '/activity' },
          { icon: '◉', label: 'Profile', path: '/profile' },
        ].map(({ icon, label, path }) => (
          <div key={label} onClick={() => router.push(path)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
            <div style={{ fontSize: 18 }}>{icon}</div>
            <div style={{ fontSize: 10, color: label === 'Activity' ? '#1D9E75' : '#aaa', fontWeight: label === 'Activity' ? 500 : 400 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}