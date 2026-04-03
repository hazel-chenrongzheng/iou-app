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
  const [listingType, setListingType] = useState<'borrow' | 'rent'>('borrow')
  const [hourlyRate, setHourlyRate] = useState('')
  const [dailyRate, setDailyRate] = useState('')
  const [depositAmount, setDepositAmount] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/auth')
    })
    getLocation()
  }, [])

  function getLocation() {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false) },
      () => { setCoords({ lat: 37.8695, lng: -122.2596 }); setLocating(false) }
    )
  }

  async function handlePost() {
    if (!name.trim()) { setError('Please add an item name'); return }
    if (!coords) { setError('Getting your location…'); return }
    if (listingType === 'rent' && !dailyRate && !hourlyRate) { setError('Please set a rental rate'); return }
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
      favor_cost: listingType === 'borrow' ? favorCost : 0,
      max_duration_days: maxDays,
      condition,
      pickup_notes: pickupNotes.trim(),
      lat: coords.lat,
      lng: coords.lng,
      is_available: true,
      listing_type: listingType,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
      daily_rate: dailyRate ? parseFloat(dailyRate) : null,
      deposit_amount: depositAmount ? parseFloat(depositAmount) : 0,
    })

    if (insertError) { setError(insertError.message); setLoading(false); return }
    router.push('/')
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#fff' }}>

      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '0.5px solid #e5e5e5', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <button onClick={() => router.push('/')} style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid #e5e5e5', background: 'transparent', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>List something</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Listing type toggle */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 8 }}>Listing type</div>
          <div style={{ display: 'flex', border: '0.5px solid #e5e5e5', borderRadius: 12, overflow: 'hidden', background: '#f5f5f5' }}>
            {(['borrow', 'rent'] as const).map(t => (
              <button key={t} onClick={() => setListingType(t)} style={{ flex: 1, padding: '10px 0', fontSize: 14, border: 'none', background: listingType === t ? '#fff' : 'transparent', fontWeight: listingType === t ? 500 : 400, color: listingType === t ? '#111' : '#888', cursor: 'pointer', borderRadius: listingType === t ? 10 : 0, margin: listingType === t ? 2 : 0 }}>
                {t === 'borrow' ? '🤝 Free borrow' : '💵 Paid rental'}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 6, padding: '0 4px' }}>
            {listingType === 'borrow' ? 'Neighbors borrow for free using favors — builds trust and community.' : 'Charge a daily or hourly rate. Great for high-value items.'}
          </div>
        </div>

        {/* Item name */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>What are you listing? *</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Power drill, camping tent, camera…" style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', outline: 'none' }} />
        </div>

        {/* Emoji */}
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
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Condition, what's included, any notes…" rows={3} style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', outline: 'none', resize: 'none' }} />
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

        {/* Borrow-specific fields */}
        {listingType === 'borrow' && (
          <>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 8 }}>Favor cost — <span style={{ color: '#1D9E75' }}>🤝 {favorCost}</span></div>
              <input type="range" min={1} max={5} step={1} value={favorCost} onChange={e => setFavorCost(Number(e.target.value))} style={{ width: '100%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginTop: 4 }}>
                <span>1 (small item)</span><span>5 (high value)</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 8 }}>Max borrow duration — <span style={{ color: '#1D9E75' }}>{maxDays} {maxDays === 1 ? 'day' : 'days'}</span></div>
              <input type="range" min={1} max={14} step={1} value={maxDays} onChange={e => setMaxDays(Number(e.target.value))} style={{ width: '100%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginTop: 4 }}>
                <span>1 day</span><span>2 weeks</span>
              </div>
            </div>
          </>
        )}

        {/* Rental-specific fields */}
        {listingType === 'rent' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>Hourly rate ($)</div>
                <input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="e.g. 5.00" style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', outline: 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>Daily rate ($)</div>
                <input type="number" value={dailyRate} onChange={e => setDailyRate(e.target.value)} placeholder="e.g. 20.00" style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', outline: 'none' }} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>Security deposit ($) <span style={{ fontWeight: 400 }}>— optional</span></div>
              <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="e.g. 50.00 — held until item returned" style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', outline: 'none' }} />
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Deposit is held and returned automatically when the item comes back in good condition.</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 8 }}>Max rental duration — <span style={{ color: '#1D9E75' }}>{maxDays} {maxDays === 1 ? 'day' : 'days'}</span></div>
              <input type="range" min={1} max={14} step={1} value={maxDays} onChange={e => setMaxDays(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div style={{ padding: '12px 14px', background: '#FCEBEB', borderRadius: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#A32D2D', marginBottom: 4 }}>Dispute protection</div>
              <div style={{ fontSize: 12, color: '#A32D2D', lineHeight: 1.6 }}>If an item is returned damaged or not returned, you can file a dispute. IoU will review photo check-ins from pickup and return to resolve the case.</div>
            </div>
          </>
        )}

        {/* Pickup notes */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>Pickup instructions</div>
          <input value={pickupNotes} onChange={e => setPickupNotes(e.target.value)} placeholder="e.g. Porch pickup, text me first…" style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', outline: 'none' }} />
        </div>

        {/* Location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: coords ? '#E1F5EE' : '#f5f5f5', borderRadius: 10 }}>
          <span style={{ fontSize: 16 }}>{coords ? '📍' : '⏳'}</span>
          <span style={{ fontSize: 13, color: coords ? '#085041' : '#888' }}>
            {locating ? 'Getting your location…' : coords ? 'Location captured — pin will appear on map' : 'Could not get location'}
          </span>
        </div>

        {error && <div style={{ padding: '10px 14px', background: '#FCEBEB', borderRadius: 10, fontSize: 13, color: '#A32D2D' }}>{error}</div>}
      </div>

      <div style={{ padding: '12px 16px 24px', borderTop: '0.5px solid #e5e5e5', background: '#fff' }}>
        <button onClick={handlePost} disabled={loading || locating} style={{ width: '100%', padding: 14, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading || locating ? 0.7 : 1 }}>
          {loading ? 'Posting…' : listingType === 'borrow' ? '🤝 Post for borrowing' : '💵 Post for rental'}
        </button>
      </div>
    </div>
  )
}