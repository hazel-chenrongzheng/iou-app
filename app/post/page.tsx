'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const CATEGORIES = ['Tools', 'Kitchen', 'Books', 'Outdoors', 'Tech', 'Games', 'Other']
const EMOJIS = ['🔧', '🍳', '📚', '🏕️', '🎮', '🎾', '💻', '🪴', '🎸', '🧲', '🪑', '🧹']
const CONDITIONS = ['Like new', 'Excellent', 'Good', 'Fair']

export default function PostItem() {
  const router = useRouter()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const marker = useRef<mapboxgl.Marker | null>(null)
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
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 37.8695, lng: -122.2596 })
  const [listingType, setListingType] = useState<'borrow' | 'rent'>('borrow')
  const [hourlyRate, setHourlyRate] = useState('')
  const [dailyRate, setDailyRate] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [mapReady, setMapReady] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/auth')
    })
    navigator.geolocation.getCurrentPosition(
      pos => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCoords(c)
        if (marker.current) marker.current.setLngLat([c.lng, c.lat])
        if (map.current) map.current.flyTo({ center: [c.lng, c.lat], zoom: 15 })
      },
      () => {}
    )
  }, [])

  useEffect(() => {
    if (!mapContainer.current || map.current) return
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [coords.lng, coords.lat],
      zoom: 15,
    })
    map.current.on('load', () => {
      const el = document.createElement('div')
      el.innerHTML = `<div style="background:white;border:2.5px solid #1D9E75;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:22px;cursor:grab;box-shadow:0 2px 8px rgba(0,0,0,0.2);">📍</div>`
      marker.current = new mapboxgl.Marker({ element: el, draggable: true, anchor: 'center' })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map.current!)
      marker.current.on('dragend', () => {
        const lngLat = marker.current!.getLngLat()
        setCoords({ lat: lngLat.lat, lng: lngLat.lng })
      })
      map.current!.on('click', (e) => {
        marker.current!.setLngLat(e.lngLat)
        setCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng })
      })
      setMapReady(true)
    })
  }, [])

  async function searchLocation(query: string) {
    if (query.length < 3) { setSearchResults([]); return }
    const res = await fetch(
  `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query + ' UC Berkeley')}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&proximity=-122.2596,37.8695&bbox=-122.32,37.85,-122.22,37.90&limit=5`
)
    const data = await res.json()
    setSearchResults(data.features || [])
    setShowResults(true)
  }

  function selectLocation(feature: any) {
    const [lng, lat] = feature.center
    setCoords({ lat, lng })
    setSearchQuery(feature.place_name)
    setShowResults(false)
    setSearchResults([])
    if (marker.current) marker.current.setLngLat([lng, lat])
    if (map.current) map.current.flyTo({ center: [lng, lat], zoom: 16 })
  }

  async function handlePost() {
    if (!name.trim()) { setError('Please add an item name'); return }
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

  const inputStyle = { width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 16, color: '#111', outline: 'none', WebkitAppearance: 'none' as const }

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#fff' }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '0.5px solid #e5e5e5', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <button onClick={() => router.push('/')} style={{ width: 36, height: 36, borderRadius: '50%', border: '0.5px solid #e5e5e5', background: 'transparent', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
        <div style={{ fontSize: 17, fontWeight: 500, color: '#111' }}>List something</div>
      </div>style: 'mapbox://styles/mapbox/streets-v12',

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 8 }}>Listing type</div>
          <div style={{ display: 'flex', border: '0.5px solid #e5e5e5', borderRadius: 12, overflow: 'hidden', background: '#f5f5f5' }}>
            {(['borrow', 'rent'] as const).map(t => (
              <button key={t} onClick={() => setListingType(t)} style={{ flex: 1, padding: '12px 0', fontSize: 15, border: 'none', background: listingType === t ? '#fff' : 'transparent', fontWeight: listingType === t ? 500 : 400, color: listingType === t ? '#111' : '#888', cursor: 'pointer', borderRadius: listingType === t ? 10 : 0, margin: listingType === t ? 2 : 0 }}>
                {t === 'borrow' ? '🤝 Free borrow' : '💵 Paid rental'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 6 }}>What are you listing? *</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Power drill, camping tent…" style={inputStyle} />
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 8 }}>Pick an icon</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)} style={{ width: 48, height: 48, borderRadius: 10, border: `1.5px solid ${emoji === e ? '#1D9E75' : '#e5e5e5'}`, background: emoji === e ? '#E1F5EE' : '#f5f5f5', fontSize: 24, cursor: 'pointer' }}>{e}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 8 }}>Category</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} style={{ padding: '8px 14px', borderRadius: 20, fontSize: 14, border: `0.5px solid ${category === cat ? '#5DCAA5' : '#e5e5e5'}`, background: category === cat ? '#E1F5EE' : '#fff', color: category === cat ? '#0F6E56' : '#888', cursor: 'pointer' }}>{cat}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 6 }}>Description</div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Condition, what's included…" rows={3} style={{ ...inputStyle, resize: 'none' }} />
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 8 }}>Condition</div>
          <div style={{ display: 'flex', gap: 7 }}>
            {CONDITIONS.map(c => (
              <button key={c} onClick={() => setCondition(c)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, border: `0.5px solid ${condition === c ? '#5DCAA5' : '#e5e5e5'}`, background: condition === c ? '#E1F5EE' : '#fff', color: condition === c ? '#0F6E56' : '#888', cursor: 'pointer' }}>{c}</button>
            ))}
          </div>
        </div>

        {listingType === 'borrow' && (
          <>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 8 }}>Favor cost — <span style={{ color: '#1D9E75' }}>🤝 {favorCost}</span></div>
              <input type="range" min={1} max={5} value={favorCost} onChange={e => setFavorCost(Number(e.target.value))} style={{ width: '100%', height: 6 }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 8 }}>Max duration — <span style={{ color: '#1D9E75' }}>{maxDays} days</span></div>
              <input type="range" min={1} max={14} value={maxDays} onChange={e => setMaxDays(Number(e.target.value))} style={{ width: '100%', height: 6 }} />
            </div>
          </>
        )}

        {listingType === 'rent' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 6 }}>Hourly rate ($)</div>
                <input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="5.00" style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 6 }}>Daily rate ($)</div>
                <input type="number" value={dailyRate} onChange={e => setDailyRate(e.target.value)} placeholder="20.00" style={inputStyle} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 6 }}>Security deposit ($)</div>
              <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="50.00" style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 8 }}>Max duration — <span style={{ color: '#1D9E75' }}>{maxDays} days</span></div>
              <input type="range" min={1} max={14} value={maxDays} onChange={e => setMaxDays(Number(e.target.value))} style={{ width: '100%', height: 6 }} />
            </div>
          </>
        )}

        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 6 }}>Pickup instructions</div>
          <input value={pickupNotes} onChange={e => setPickupNotes(e.target.value)} placeholder="e.g. Front door, text me first…" style={inputStyle} />
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 8 }}>📍 Set pickup location</div>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); searchLocation(e.target.value) }}
              placeholder="Search address or building name…"
              style={inputStyle}
            />
            {showResults && searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, zIndex: 100, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                {searchResults.map((r: any) => (
                  <div key={r.id} onClick={() => selectLocation(r)} style={{ padding: '12px 14px', borderBottom: '0.5px solid #f5f5f5', cursor: 'pointer', fontSize: 13, color: '#111' }}>
                    <div style={{ fontWeight: 500 }}>{r.text}</div>
<div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{r.place_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Or drag the pin / tap anywhere on the map</div>
          <div ref={mapContainer} style={{ width: '100%', height: 220, borderRadius: 12, overflow: 'hidden', border: '0.5px solid #e5e5e5' }} />
          {mapReady && (
            <div style={{ fontSize: 12, color: '#1D9E75', marginTop: 6 }}>
              📍 {searchQuery || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}
            </div>
          )}
        </div>

        {error && <div style={{ padding: '12px 14px', background: '#FCEBEB', borderRadius: 10, fontSize: 14, color: '#A32D2D' }}>{error}</div>}
      </div>

      <div style={{ padding: '12px 16px 32px', borderTop: '0.5px solid #e5e5e5', background: '#fff' }}>
        <button onClick={handlePost} disabled={loading} style={{ width: '100%', padding: 16, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Posting…' : listingType === 'borrow' ? '🤝 Post for borrowing' : '💵 Post for rental'}
        </button>
      </div>
    </div>
  )
}