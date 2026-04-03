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
  hourly_rate: number | null
  daily_rate: number | null
  deposit_amount: number
  max_duration_days: number
  condition: string
  pickup_notes: string
  is_available: boolean
  listing_type: string
  profiles: {
    username: string
    avg_rating: number
    trust_tier: string
  }
}

export default function RentItem() {
  const router = useRouter()
  const params = useParams()
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [rentalType, setRentalType] = useState<'hourly' | 'daily'>('daily')
  const [quantity, setQuantity] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUserId(session.user.id)

      const { data } = await supabase
        .from('items')
        .select('*, profiles(username, avg_rating, trust_tier)')
        .eq('id', params.id)
        .single()
      if (data) {
        setItem(data)
        if (data.hourly_rate && !data.daily_rate) setRentalType('hourly')
      }
      setLoading(false)
    })
  }, [])

  const rate = rentalType === 'hourly' ? (item?.hourly_rate || 0) : (item?.daily_rate || 0)
  const unit = rentalType === 'hourly' ? 'hour' : 'day'
  const subtotal = rate * quantity
  const deposit = item?.deposit_amount || 0
  const total = subtotal + deposit

  async function handleRent() {
    if (!item || !userId) return
    setSubmitting(true)
    setError('')

    const dueDate = new Date()
    if (rentalType === 'daily') {
      dueDate.setDate(dueDate.getDate() + quantity)
    } else {
      dueDate.setHours(dueDate.getHours() + quantity)
    }

    const { error: insertError } = await supabase.from('exchanges').insert({
      item_id: item.id,
      borrower_id: userId,
      lender_id: (await supabase.from('items').select('owner_id').eq('id', item.id).single()).data?.owner_id,
      status: 'requested',
      favor_cost: 0,
      payment_type: 'cash',
      cash_amount: subtotal,
      deposit_held: deposit,
      rental_hours: rentalType === 'hourly' ? quantity : null,
      rental_days: rentalType === 'daily' ? quantity : null,
      due_date: dueDate.toISOString().split('T')[0],
    })

    if (insertError) { setError(insertError.message); setSubmitting(false); return }
    setSuccess(true)
    setSubmitting(false)
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
      <div style={{ fontSize: 20, fontWeight: 600, color: '#111' }}>Rental requested!</div>
      <div style={{ fontSize: 14, color: '#888', lineHeight: 1.6, maxWidth: 300 }}>
        @{item.profiles.username} will confirm your rental. Payment of <strong>${subtotal.toFixed(2)}</strong> is due at pickup.
      </div>
      {deposit > 0 && (
        <div style={{ fontSize: 13, color: '#185FA5', background: '#E6F1FB', padding: '10px 16px', borderRadius: 10 }}>
          💳 ${deposit.toFixed(2)} deposit held — returned when item comes back in good condition
        </div>
      )}
      <button onClick={() => router.push('/activity')} style={{ marginTop: 16, padding: '12px 28px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
        View in activity
      </button>
    </div>
  )

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#fff' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '0.5px solid #e5e5e5', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid #e5e5e5', background: 'transparent', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>Rent this item</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

        {/* Item summary */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px', background: '#f5f5f5', borderRadius: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 36 }}>{item.emoji}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>{item.name}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>@{item.profiles.username} · ★{item.profiles.avg_rating} · {item.profiles.trust_tier}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{item.condition} condition</div>
          </div>
        </div>

        {/* Rental type toggle */}
        {item.hourly_rate && item.daily_rate && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 8 }}>Rental period</div>
            <div style={{ display: 'flex', border: '0.5px solid #e5e5e5', borderRadius: 12, overflow: 'hidden', background: '#f5f5f5' }}>
              {(['hourly', 'daily'] as const).map(t => (
                <button key={t} onClick={() => { setRentalType(t); setQuantity(1) }} style={{ flex: 1, padding: '9px 0', fontSize: 13, border: 'none', background: rentalType === t ? '#fff' : 'transparent', fontWeight: rentalType === t ? 500 : 400, color: rentalType === t ? '#111' : '#888', cursor: 'pointer', borderRadius: rentalType === t ? 10 : 0, margin: rentalType === t ? 2 : 0 }}>
                  {t === 'hourly' ? `⏱ Hourly ($${item.hourly_rate}/hr)` : `📅 Daily ($${item.daily_rate}/day)`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity picker */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 8 }}>
            How many {unit}s?
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{ width: 40, height: 40, borderRadius: '50%', border: '0.5px solid #e5e5e5', background: '#f5f5f5', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#111', minWidth: 40, textAlign: 'center' }}>{quantity}</div>
            <button onClick={() => setQuantity(q => Math.min(rentalType === 'daily' ? item.max_duration_days : 24, q + 1))} style={{ width: 40, height: 40, borderRadius: '50%', border: '0.5px solid #e5e5e5', background: '#f5f5f5', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            <div style={{ fontSize: 14, color: '#888' }}>{unit}{quantity > 1 ? 's' : ''}</div>
          </div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>
            Max: {rentalType === 'daily' ? `${item.max_duration_days} days` : '24 hours'}
          </div>
        </div>

        {/* Pickup notes */}
        {item.pickup_notes && (
          <div style={{ marginBottom: 20, padding: '10px 14px', background: '#f5f5f5', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>Pickup instructions</div>
            <div style={{ fontSize: 13, color: '#333' }}>{item.pickup_notes}</div>
          </div>
        )}

        {/* Dispute protection */}
        <div style={{ marginBottom: 20, padding: '12px 14px', background: '#FCEBEB', borderRadius: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#A32D2D', marginBottom: 4 }}>Rental protection</div>
          <div style={{ fontSize: 12, color: '#A32D2D', lineHeight: 1.6 }}>Photo check-ins at pickup and return protect both parties. If the item is damaged or not returned, the deposit covers the lender and a dispute can be filed.</div>
        </div>

        {/* Price breakdown */}
        <div style={{ background: '#f5f5f5', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#111' }}>
            <span>${rate.toFixed(2)} × {quantity} {unit}{quantity > 1 ? 's' : ''}</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {deposit > 0 && (
            <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#888' }}>
              <span>Security deposit (refundable)</span>
              <span>${deposit.toFixed(2)}</span>
            </div>
          )}
          <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 600, color: '#111' }}>
            <span>Total due at pickup</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        {error && <div style={{ padding: '10px 14px', background: '#FCEBEB', borderRadius: 10, fontSize: 13, color: '#A32D2D', marginBottom: 12 }}>{error}</div>}
      </div>

      {/* CTA */}
      <div style={{ padding: '12px 16px 24px', borderTop: '0.5px solid #e5e5e5', background: '#fff' }}>
        <button onClick={handleRent} disabled={submitting} style={{ width: '100%', padding: 14, background: '#111', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? 'Requesting…' : `Request rental · $${total.toFixed(2)}`}
        </button>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#aaa' }}>Payment collected at pickup — not charged now</div>
      </div>
    </div>
  )
}