'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

const SLIDES = [
  {
    emoji: '👋',
    title: 'Welcome to IoU',
    body: 'IoU is a community lending app for your college neighborhood. Borrow things you need, lend things you have, and build trust with your neighbors.',
    highlight: null,
  },
  {
    emoji: '🤝',
    title: 'How favors work',
    body: 'Favors are IoU\'s community currency. You earn favors by lending items and being a good neighbor. You spend favors to borrow things. No cash needed for everyday items.',
    highlight: 'You start with 5 favors — enough to borrow right away.',
  },
  {
    emoji: '🌱',
    title: 'Build your trust tier',
    body: 'The more you lend (for free, using favors), the higher your trust tier. Higher tiers unlock more borrowing power and priority access to items.',
    highlight: 'Trust tiers are based on favor lends only — not cash rentals.',
  },
  {
    emoji: '💵',
    title: 'Cash rentals',
    body: 'For high-value items like cameras, power tools, or gear, lenders can charge a daily or hourly cash rate. This protects valuable items while keeping everyday stuff free.',
    highlight: 'Cash rentals don\'t count toward your trust tier. Lend freely to grow your reputation.',
  },
  {
    emoji: '📍',
    title: 'ISO requests',
    body: 'Need something right now? Post an ISO (In Search Of) request with your location. Nearby lenders get notified and can respond instantly — great for quick hand-offs on campus.',
    highlight: 'Coming soon — stay tuned!',
  },
  {
    emoji: '📸',
    title: 'No awkward conversations',
    body: 'IoU handles the uncomfortable stuff. Photo check-ins at pickup and return create a shared record. If something goes wrong, our dispute system steps in — so you never have to be the bad guy.',
    highlight: null,
  },
  {
    emoji: '⭐',
    title: 'The golden rule',
    body: 'Lend freely when you can. The more generous you are, the more the community gives back. IoU works because neighbors trust each other — and trust is built one lend at a time.',
    highlight: null,
  },
]

export default function Onboarding() {
  const router = useRouter()
  const [slide, setSlide] = useState(0)
  const [finishing, setFinishing] = useState(false)

  const isLast = slide === SLIDES.length - 1
  const current = SLIDES[slide]

  async function handleFinish() {
    setFinishing(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('profiles').update({ onboarded: true }).eq('id', session.user.id)
    }
    router.push('/')
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', height: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#fff' }}>

      {/* Progress bar */}
      <div style={{ height: 3, background: '#f5f5f5' }}>
        <div style={{ height: '100%', background: '#1D9E75', width: `${((slide + 1) / SLIDES.length) * 100}%`, transition: 'width 0.3s ease' }} />
      </div>

      {/* Skip */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}>
        <button onClick={handleFinish} style={{ fontSize: 13, color: '#aaa', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center', gap: 16 }}>
        <div style={{ fontSize: 72, lineHeight: 1 }}>{current.emoji}</div>
        <div style={{ fontSize: 24, fontWeight: 600, color: '#111', letterSpacing: -0.5 }}>{current.title}</div>
        <div style={{ fontSize: 15, color: '#555', lineHeight: 1.7, maxWidth: 320 }}>{current.body}</div>
        {current.highlight && (
          <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#085041', fontWeight: 500, lineHeight: 1.5 }}>
            {current.highlight}
          </div>
        )}
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingBottom: 24 }}>
        {SLIDES.map((_, i) => (
          <div key={i} onClick={() => setSlide(i)} style={{ width: i === slide ? 20 : 6, height: 6, borderRadius: 3, background: i === slide ? '#1D9E75' : '#e5e5e5', cursor: 'pointer', transition: 'width 0.2s ease' }} />
        ))}
      </div>

      {/* Buttons */}
      <div style={{ padding: '0 16px 32px', display: 'flex', gap: 10 }}>
        {slide > 0 && (
          <button onClick={() => setSlide(s => s - 1)} style={{ flex: 1, padding: 14, background: 'transparent', color: '#888', border: '0.5px solid #e5e5e5', borderRadius: 12, fontSize: 15, cursor: 'pointer' }}>
            Back
          </button>
        )}
        <button
          onClick={isLast ? handleFinish : () => setSlide(s => s + 1)}
          disabled={finishing}
          style={{ flex: 2, padding: 14, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: 'pointer', opacity: finishing ? 0.7 : 1 }}
        >
          {finishing ? 'Loading…' : isLast ? "Let's go! 🚀" : 'Next →'}
        </button>
      </div>
    </div>
  )
}