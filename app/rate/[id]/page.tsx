'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../supabase'

type Exchange = {
  id: string
  borrower_id: string
  lender_id: string
  items: { name: string; emoji: string }
  borrower: { username: string }
  lender: { username: string }
}

export default function RatePage() {
  const router = useRouter()
  const params = useParams()
  const [exchange, setExchange] = useState<Exchange | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUserId(session.user.id)
      const { data } = await supabase
        .from('exchanges')
        .select('*, items(name, emoji), borrower:profiles!exchanges_borrower_id_fkey(username), lender:profiles!exchanges_lender_id_fkey(username)')
        .eq('id', params.id)
        .single()
      if (data) setExchange(data)
    })
  }, [])

  async function handleSubmit() {
    if (!exchange || !userId) return
    setSubmitting(true)
    const isLender = userId === exchange.lender_id
    const otherUserId = isLender ? exchange.borrower_id : exchange.lender_id

    const updateData = isLender
      ? { lender_rating: rating, lender_review: review, rated_by_lender: true }
      : { borrower_rating: rating, borrower_review: review, rated_by_borrower: true }

    await supabase.from('exchanges').update(updateData).eq('id', params.id)

    const { data: otherProfile } = await supabase
      .from('profiles')
      .select('avg_rating, total_lends')
      .eq('id', otherUserId)
      .single()

    if (otherProfile) {
      const newTotal = (otherProfile.total_lends || 0) + (isLender ? 0 : 1)
      const newAvg = otherProfile.avg_rating
        ? ((otherProfile.avg_rating * (otherProfile.total_lends || 1)) + rating) / ((otherProfile.total_lends || 1) + 1)
        : rating

      const tier = newAvg >= 4.8 && newTotal >= 20 ? 'Pillar'
        : newAvg >= 4.5 && newTotal >= 5 ? 'Trusted'
        : 'Newcomer'

      await supabase.from('profiles').update({
        avg_rating: Math.round(newAvg * 10) / 10,
        total_lends: newTotal,
        trust_tier: tier,
      }).eq('id', otherUserId)

      if (!isLender) {
        const { data: myProfile } = await supabase.from('profiles').select('favor_balance').eq('id', userId).single()
        if (myProfile) {
          await supabase.from('profiles').update({ favor_balance: myProfile.favor_balance + (rating === 5 ? 1 : 0) }).eq('id', userId)
        }
      }
    }

    const { data: ex } = await supabase.from('exchanges').select('rated_by_borrower, rated_by_lender').eq('id', params.id).single()
    if (ex?.rated_by_borrower && ex?.rated_by_lender) {
      await supabase.from('exchanges').update({ status: 'completed' }).eq('id', params.id)
    }

    setDone(true)
    setSubmitting(false)
  }

  if (!exchange) return null

  const isLender = userId === exchange.lender_id
  const otherUser = isLender ? exchange.borrower?.username : exchange.lender?.username

  if (done) return (
    <div style={{ maxWidth: 420, margin: '0 auto', height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: '0 24px', textAlign: 'center', gap: 10 }}>
      <div style={{ fontSize: 52 }}>🎉</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: '#111' }}>Rating submitted!</div>
      <div style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>Your feedback helps @{otherUser} build trust in the community.</div>
      {rating === 5 && <div style={{ fontSize: 14, color: '#1D9E75', fontWeight: 500 }}>+1 favor earned for the 5★ rating 🤝</div>}
      <button onClick={() => router.push('/')} style={{ marginTop: 16, padding: '12px 28px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Back to browse</button>
    </div>
  )

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#fff' }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '0.5px solid #e5e5e5' }}>
        <button onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid #e5e5e5', background: 'transparent', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>Rate @{otherUser}</div>
      </div>

      <div style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px', background: '#f5f5f5', borderRadius: 12 }}>
          <div style={{ fontSize: 32 }}>{exchange.items?.emoji}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{exchange.items?.name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>Exchange with @{otherUser}</div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#111', marginBottom: 14, textAlign: 'center' }}>How was the experience?</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setRating(s)} style={{ fontSize: 32, background: 'transparent', border: 'none', cursor: 'pointer', opacity: s <= rating ? 1 : 0.3, transition: 'opacity 0.15s' }}>★</button>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: '#888' }}>
            {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>Leave a note (shown on their profile)</div>
          <textarea value={review} onChange={e => setReview(e.target.value)} placeholder="e.g. Super easy pickup, item was in great condition…" rows={3} style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', outline: 'none', resize: 'none' }} />
        </div>

        <div style={{ padding: '12px 14px', background: '#E1F5EE', borderRadius: 12, fontSize: 13, color: '#085041', lineHeight: 1.6 }}>
          Your rating directly affects @{otherUser}'s trust tier and their ability to borrow in the community. Be honest and fair.
          {rating === 5 && <div style={{ marginTop: 6, fontWeight: 500 }}>🤝 You'll earn +1 favor for giving a 5★ rating!</div>}
        </div>
      </div>

      <div style={{ padding: '12px 16px 24px', borderTop: '0.5px solid #e5e5e5' }}>
        <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', padding: 14, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? 'Submitting…' : 'Submit rating ★'}
        </button>
      </div>
    </div>
  )
}