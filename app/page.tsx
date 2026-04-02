'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const SAMPLE_ITEMS = [
  { id: '1', name: 'Power drill + bits', emoji: '🔧', category: 'Tools', favor_cost: 2, condition: 'Excellent', lat: 37.8695, lng: -122.2596, profiles: { username: 'sarah_r', avg_rating: 4.9, trust_tier: 'Trusted' } },
  { id: '2', name: 'Cast iron skillet', emoji: '🍳', category: 'Kitchen', favor_cost: 2, condition: 'Good', lat: 37.8680, lng: -122.2610, profiles: { username: 'marcus_t', avg_rating: 4.7, trust_tier: 'Trusted' } },
  { id: '3', name: 'Camping tent', emoji: '🏕️', category: 'Outdoors', favor_cost: 3, condition: 'Like new', lat: 37.8710, lng: -122.2575, profiles: { username: 'devon_k', avg_rating: 5.0, trust_tier: 'Pillar' } },
  { id: '4', name: 'Orgo textbook', emoji: '📚', category: 'Books', favor_cost: 1, condition: 'Good', lat: 37.8672, lng: -122.2588, profiles: { username: 'priya_m', avg_rating: 4.8, trust_tier: 'Trusted' } },
  { id: '5', name: 'Nintendo Switch', emoji: '🎮', category: 'Tech', favor_cost: 3, condition: 'Good', lat: 37.8660, lng: -122.2620, profiles: { username: 'alex_w', avg_rating: 4.6, trust_tier: 'Trusted' } },
  { id: '6', name: 'Tennis racket', emoji: '🎾', category: 'Outdoors', favor_cost: 1, condition: 'Excellent', lat: 37.8700, lng: -122.2560, profiles: { username: 'jamie_l', avg_rating: 4.9, trust_tier: 'Trusted' } },
]

const CATEGORIES = ['All', 'Tools', 'Kitchen', 'Books', 'Outdoors', 'Tech', 'Games']

type Profile = {
  username: string
  favor_balance: number
  trust_tier: string
  avg_rating: number
}

export default function Home() {
  const router = useRouter()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<mapboxgl.Marker[]>([])
  const [view, setView] = useState<'map' | 'list'>('map')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedItem, setSelectedItem] = useState<typeof SAMPLE_ITEMS[0] | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [dbItems, setDbItems] = useState<any[]>([])

  const allItems = dbItems.length > 0 ? dbItems : SAMPLE_ITEMS
  const filteredItems = activeCategory === 'All'
    ? allItems
    : allItems.filter(i => i.category === activeCategory)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, favor_balance, trust_tier, avg_rating')
        .eq('id', session.user.id)
        .single()
      if (profileData) setProfile(profileData)
      const { data: itemsData } = await supabase
        .from('items')
        .select('*, profiles(username, avg_rating, trust_tier)')
        .eq('is_available', true)
      if (itemsData && itemsData.length > 0) setDbItems(itemsData)
    })
  }, [])

  useEffect(() => {
    if (map.current || !mapContainer.current) return
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-122.2596, 37.8695],
      zoom: 14.5,
    })
    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
  }, [])

  useEffect(() => {
    if (view === 'map' && map.current) {
      setTimeout(() => map.current!.resize(), 50)
    }
  }, [view])

  useEffect(() => {
    if (!map.current) return
    const addMarkers = () => {
      markers.current.forEach(m => m.remove())
      markers.current = []
      filteredItems.forEach(item => {
        const el = document.createElement('div')
        el.innerHTML = `<div style="background:white;border:2px solid #1D9E75;border-radius:50%;width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);">${item.emoji}</div>`
        el.addEventListener('click', () => setSelectedItem(item))
        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([item.lng, item.lat])
          .addTo(map.current!)
        markers.current.push(marker)
      })
    }
    if (map.current.isStyleLoaded()) addMarkers()
    else map.current.on('load', addMarkers)
  }, [filteredItems])

  const initials = profile?.username ? profile.username.slice(0, 2).toUpperCase() : '…'

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', height: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#fff', position: 'relative' }}>

      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #e5e5e5' }}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -1 }}>io<span style={{ color: '#1D9E75' }}>U</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#FAEEDA', borderRadius: 20, padding: '4px 10px', fontSize: 13, fontWeight: 500, color: '#633806' }}>
            🤝 {profile ? profile.favor_balance : '…'} favors
          </div>
          <div onClick={handleSignOut} title="Sign out" style={{ width: 32, height: 32, borderRadius: '50%', background: '#9FE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#085041', cursor: 'pointer' }}>
            {initials}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', margin: '10px 16px 0', border: '0.5px solid #e5e5e5', borderRadius: 12, overflow: 'hidden', background: '#f5f5f5' }}>
        {(['map', 'list'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{ flex: 1, padding: '7px 0', fontSize: 13, border: 'none', background: view === v ? '#fff' : 'transparent', fontWeight: view === v ? 500 : 400, color: view === v ? '#111' : '#888', cursor: 'pointer', borderRadius: view === v ? 10 : 0, margin: view === v ? 2 : 0 }}>
            {v === 'map' ? '⊙ Map' : '≡ List'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 7, padding: '10px 16px 6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => { setActiveCategory(cat); setSelectedItem(null) }} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, border: `0.5px solid ${activeCategory === cat ? '#5DCAA5' : '#e5e5e5'}`, background: activeCategory === cat ? '#E1F5EE' : '#fff', color: activeCategory === cat ? '#0F6E56' : '#888', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {cat}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, position: 'relative', display: view === 'map' ? 'block' : 'none' }}>
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        {selectedItem && (
          <div onClick={() => router.push(`/item/${selectedItem.id}`)} style={{ position: 'absolute', bottom: 16, left: 12, right: 12, background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: 28 }}>{selectedItem.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>{selectedItem.name}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>@{selectedItem.profiles.username} · ★{selectedItem.profiles.avg_rating}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#FAEEDA', color: '#633806' }}>🤝 {selectedItem.favor_cost}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#E1F5EE', color: '#085041' }}>{selectedItem.profiles.trust_tier}</span>
              </div>
            </div>
            <div style={{ fontSize: 18, color: '#aaa' }}>›</div>
          </div>
        )}
      </div>

      {view === 'list' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {filteredItems.map(item => (
            <div key={item.id} onClick={() => router.push(`/item/${item.id}`)} style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 12, marginBottom: 10, cursor: 'pointer' }}>
              <div style={{ width: 52, height: 52, borderRadius: 10, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{item.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>@{item.profiles.username} · ★{item.profiles.avg_rating}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#FAEEDA', color: '#633806' }}>🤝 {item.favor_cost}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f5f5f5', color: '#888' }}>{item.category}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#E1F5EE', color: '#085041' }}>{item.profiles.trust_tier}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div onClick={() => router.push('/post')} style={{ position: 'absolute', bottom: 80, right: 16, width: 52, height: 52, borderRadius: '50%', background: '#1D9E75', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.15)', zIndex: 20 }}>+</div>

      <div style={{ display: 'flex', borderTop: '0.5px solid #e5e5e5', background: '#fff', padding: '8px 0 12px' }}>
  {[
    { icon: '⌂', label: 'Browse', path: '/' },
    { icon: '🤝', label: 'Favors', path: '/favors' },
    { icon: '↕', label: 'Activity', path: '/activity' },
    { icon: '◉', label: 'Profile', path: '/profile' },
  ].map(({ icon, label, path }) => (
    <div key={label} onClick={() => router.push(path)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ fontSize: 10, color: label === 'Browse' ? '#1D9E75' : '#aaa', fontWeight: label === 'Browse' ? 500 : 400 }}>{label}</div>
    </div>
  ))}
</div>

    </div>
  )
}