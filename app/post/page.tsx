'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

const CATEGORIES = ['Tools', 'Kitchen', 'Books', 'Outdoors', 'Tech', 'Games', 'Other']
const EMOJIS = ['🔧', '🍳', '📚', '🏕️', '🎮', '🎾', '💻', '🪴', '🎸', '🧲', '🪑', '🧹']
const CONDITIONS = ['Like new', 'Excellent', 'Good', 'Fair']

export default function PostItem() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Tools')
  const [emoji, setEmoji] = useState('🔧')
  const [favorCost, setFavorCost] = useState(2)
  const [maxDays, setMaxDays] = useState(3)
  const [condition, setCondition] = useState('Good')
  const [pickupNotes, setPickupNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [locating, setLocating] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/auth')
    })
    getLocation()
  }, [])

  function getLocation() {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        // Default to UC Berkeley if location denied
        setCoords({ lat: 37.8695, lng: -122.2596 })
        setLocating(false)
      }
    )
  }

  async function handlePost() {
    if (!name.trim()) { setError('Please add an item name'); return }
    if (!coords) { setError('Getting your location…'); return }
    setLoading(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }

    const { error: insertError } = await supabase.from('items').insert({
      owner_id: session.user.id,
      name: name.trim(),
      description: description.trim(),
      category,
      emoji,
      favor_cost: favorCost,
      max_duration_days: maxDays,
      condition,
      pickup_notes: pickupNotes.trim(),
      lat: coords.lat,
      lng: coords.lng,
      is_available: true,
    })

    if (insertError) { setError(insertError.message); setLoading(false); return }
    router.push('/')
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#fff' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '0.5px solid #e5e5e5', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <button onClick={() => router.push('/')} style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid #e5e5e5', background: 'transparent', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>List something to lend</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Item name */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>What are you lending? *</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Power drill, camping tent, textbook…" style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', outline: 'none' }} />
        </div>

        {/* Emoji picker */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 8 }}>Pick an icon</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)} style={{ width: 44, height: 44, borderRadius: 10, border: `1.5px solid ${emoji === e ? '#1D9E75' : '#e5e5e5'}`, background: emoji === e ? '#E1F5EE' : '#f5f5f5', fontSize: 22, cursor: 'pointer' }}>{e}</button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 8 }}>Category</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, border: `0.5px solid ${category === cat ? '#5DCAA5' : '#e5e5e5'}`, background: category === cat ? '#E1F5EE' : '#fff', color: category === cat ? '#0F6E56' : '#888', cursor: 'pointer' }}>{cat}</button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>Description</div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Condition details, what's included, any special notes…" rows={3} style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', outline: 'none', resize: 'none' }} />
        </div>

        {/* Condition */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 8 }}>Condition</div>
          <div style={{ display: 'flex', gap: 7 }}>
            {CONDITIONS.map(c => (
              <button key={c} onClick={() => setCondition(c)} style={{ flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 12, border: `0.5px solid ${condition === c ? '#5DCAA5' : '#e5e5e5'}`, background: condition === c ? '#E1F5EE' : '#fff', color: condition === c ? '#0F6E56' : '#888', cursor: 'pointer' }}>{c}</button>
            ))}
          </div>
        </div>

        {/* Favor cost */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 8 }}>Favor cost to borrow — <span style={{ color: '#1D9E75' }}>🤝 {favorCost}</span></div>
          <input type="range" min={1} max={5} step={1} value={favorCost} onChange={e => setFavorCost(Number(e.target.value))} style={{ width: '100%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginTop: 4 }}>
            <span>1 (small item)</span><span>5 (high value)</span>
          </div>
        </div>

        {/* Max duration */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 8 }}>Max borrow duration — <span style={{ color: '#1D9E75' }}>{maxDays} {maxDays === 1 ? 'day' : 'days'}</span></div>
          <input type="range" min={1} max={14} step={1} value={maxDays} onChange={e => setMaxDays(Number(e.target.value))} style={{ width: '100%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginTop: 4 }}>
            <span>1 day</span><span>2 weeks</span>
          </div>
        </div>

        {/* Pickup notes */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>Pickup instructions</div>
          <input value={pickupNotes} onChange={e => setPickupNotes(e.target.value)} placeholder="e.g. Porch pickup, text me first, front desk…" style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', outline: 'none' }} />
        </div>

        {/* Location status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: coords ? '#E1F5EE' : '#f5f5f5', borderRadius: 10 }}>
          <span style={{ fontSize: 16 }}>{coords ? '📍' : '⏳'}</span>
          <span style={{ fontSize: 13, color: coords ? '#085041' : '#888' }}>
            {locating ? 'Getting your location…' : coords ? 'Location captured — item will appear on the map' : 'Could not get location'}
          </span>
        </div>

        {error && <div style={{ padding: '10px 14px', background: '#FCEBEB', borderRadius: 10, fontSize: 13, color: '#A32D2D' }}>{error}</div>}
      </div>

      {/* Post button */}
      <div style={{ padding: '12px 16px 24px', borderTop: '0.5px solid #e5e5e5', background: '#fff' }}>
        <button onClick={handlePost} disabled={loading || locating} style={{ width: '100%', padding: 14, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading || locating ? 0.7 : 1 }}>
          {loading ? 'Posting…' : '📦 Post listing'}
        </button>
      </div>
    </div>
  )
}