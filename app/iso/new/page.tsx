'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../supabase'

const CATEGORIES = ['Tools', 'Kitchen', 'Books', 'Outdoors', 'Tech', 'Games', 'Other']
const EXPIRY_OPTIONS = [
  { label: '30 min', hours: 0.5 },
  { label: '1 hour', hours: 1 },
  { label: '2 hours', hours: 2 },
  { label: '4 hours', hours: 4 },
]

export default function NewISO() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Tools')
  const [favorCost, setFavorCost] = useState(2)
  const [cashOffer, setCashOffer] = useState('')
  const [expiryHours, setExpiryHours] = useState(2)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/auth')
    })
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false) },
      () => { setCoords({ lat: 37.8695, lng: -122.2596 }); setLocating(false) }
    )
  }, [])

  async function handlePost() {
    if (!title.trim()) { setError('Please describe what you need'); return }
    if (!coords) { setError('Getting your location…'); return }
    setLoading(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }

    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString()

    const { error: insertError } = await supabase.from('iso_requests').insert({
      requester_id: session.user.id,
      title: title.trim(),
      description: description.trim(),
      category,
      favor_cost: favorCost,
      cash_offer: cashOffer ? parseFloat(cashOffer) : null,
      lat: coords.lat,
      lng: coords.lng,
      status: 'open',
      expires_at: expiresAt,
    })

    if (insertError) { setError(insertError.message); setLoading(false); return }
    router.push('/iso')
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#fff' }}>

      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '0.5px solid #e5e5e5', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid #e5e5e5', background: 'transparent', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>Post ISO request</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div style={{ padding: '12px 14px', background: '#E6F1FB', borderRadius: 12, fontSize: 13, color: '#185FA5', lineHeight: 1.6 }}>
          📍 ISO = "In Search Of" — post what you need right now and nearby neighbors can respond instantly.
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>What do you need? *</div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Need a phone charger near Moffitt Library" style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', outline: 'none' }} />
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>More details</div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Any specifics — type, size, how long you need it…" rows={2} style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', outline: 'none', resize: 'none' }} />
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 8 }}>Category</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, border: `0.5px solid ${category === cat ? '#5DCAA5' : '#e5e5e5'}`, background: category === cat ? '#E1F5EE' : '#fff', color: category === cat ? '#0F6E56' : '#888', cursor: 'pointer' }}>{cat}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 8 }}>Offer — <span style={{ color: '#1D9E75' }}>🤝 {favorCost} favors</span></div>
          <input type="range" min={1} max={5} step={1} value={favorCost} onChange={e => setFavorCost(Number(e.target.value))} style={{ width: '100%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginTop: 4 }}>
            <span>1 favor</span><span>5 favors</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>Cash offer (optional)</div>
          <input type="number" value={cashOffer} onChange={e => setCashOffer(e.target.value)} placeholder="e.g. 5.00 — for urgent or high-value needs" style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', outline: 'none' }} />
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 8 }}>Request expires in</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {EXPIRY_OPTIONS.map(opt => (
              <button key={opt.label} onClick={() => setExpiryHours(opt.hours)} style={{ flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 13, border: `0.5px solid ${expiryHours === opt.hours ? '#5DCAA5' : '#e5e5e5'}`, background: expiryHours === opt.hours ? '#E1F5EE' : '#fff', color: expiryHours === opt.hours ? '#0F6E56' : '#888', cursor: 'pointer' }}>{opt.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: coords ? '#E1F5EE' : '#f5f5f5', borderRadius: 10 }}>
          <span style={{ fontSize: 16 }}>{coords ? '📍' : '⏳'}</span>
          <span style={{ fontSize: 13, color: coords ? '#085041' : '#888' }}>
            {locating ? 'Getting your location…' : 'Location captured — nearby lenders will see this'}
          </span>
        </div>

        {error && <div style={{ padding: '10px 14px', background: '#FCEBEB', borderRadius: 10, fontSize: 13, color: '#A32D2D' }}>{error}</div>}
      </div>

      <div style={{ padding: '12px 16px 24px', borderTop: '0.5px solid #e5e5e5', background: '#fff' }}>
        <button onClick={handlePost} disabled={loading || locating} style={{ width: '100%', padding: 14, background: '#185FA5', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading || locating ? 0.7 : 1 }}>
          {loading ? 'Posting…' : '📍 Post ISO request'}
        </button>
      </div>
    </div>
  )
}