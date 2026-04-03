'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../supabase'

type ISORequest = {
  id: string
  title: string
  description: string
  category: string
  favor_cost: number
  cash_offer: number | null
  status: string
  expires_at: string
  requester_id: string
  profiles: { username: string; avg_rating: number; trust_tier: string }
}

type ISOResponse = {
  id: string
  message: string
  meet_location: string
  created_at: string
  responder_id: string
  profiles: { username: string; avg_rating: number; trust_tier: string }
}

function timeLeft(expires_at: string) {
  const diff = new Date(expires_at).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) return `${hrs}h ${mins % 60}m left`
  return `${mins}m left`
}

export default function ISODetail() {
  const router = useRouter()
  const params = useParams()
  const [request, setRequest] = useState<ISORequest | null>(null)
  const [responses, setResponses] = useState<ISOResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [meetLocation, setMeetLocation] = useState('')
  const [responding, setResponding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUserId(session.user.id)

      const { data: reqData } = await supabase
        .from('iso_requests')
        .select('*, profiles(username, avg_rating, trust_tier)')
        .eq('id', params.id)
        .single()
      if (reqData) setRequest(reqData)

      const { data: resData } = await supabase
        .from('iso_responses')
        .select('*, profiles:profiles!iso_responses_responder_id_fkey(username, avg_rating, trust_tier)')
        .eq('iso_request_id', params.id)
        .order('created_at', { ascending: true })
      if (resData) setResponses(resData)

      setLoading(false)
    })
  }, [])

  async function handleRespond() {
    if (!message.trim()) return
    setResponding(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error } = await supabase.from('iso_responses').insert({
      iso_request_id: params.id,
      responder_id: session.user.id,
      message: message.trim(),
      meet_location: meetLocation.trim(),
    })

    if (!error) {
      setSubmitted(true)
      setShowForm(false)
    }
    setResponding(false)
  }

  if (loading) return (
    <div style={{ maxWidth: 420, margin: '0 auto', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ fontSize: 14, color: '#888' }}>Loading…</div>
    </div>
  )

  if (!request) return (
    <div style={{ maxWidth: 420, margin: '0 auto', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ fontSize: 14, color: '#888' }}>Request not found</div>
    </div>
  )

  const isOwner = userId === request.requester_id
  const alreadyResponded = responses.some(r => r.responder_id === userId)

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#fff' }}>

      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '0.5px solid #e5e5e5', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid #e5e5e5', background: 'transparent', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>ISO Request</div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888' }}>⏰ {timeLeft(request.expires_at)}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        <div style={{ padding: '16px', borderBottom: '0.5px solid #e5e5e5' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#E6F1FB', color: '#185FA5', fontWeight: 500 }}>ISO</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f5f5f5', color: '#888' }}>{request.category}</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#111', marginBottom: 8 }}>{request.title}</div>
          {request.description && <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6, marginBottom: 12 }}>{request.description}</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f5f5f5', borderRadius: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#9FE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#085041' }}>
              {request.profiles?.username?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>@{request.profiles?.username}</div>
              <div style={{ fontSize: 11, color: '#888' }}>★ {request.profiles?.avg_rating} · {request.profiles?.trust_tier}</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              {request.favor_cost > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#FAEEDA', color: '#633806' }}>🤝 {request.favor_cost}</span>}
              {request.cash_offer && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#E1F5EE', color: '#085041' }}>💵 ${request.cash_offer}</span>}
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Responses ({responses.length})
          </div>

          {responses.length === 0 && !submitted && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#aaa', fontSize: 14 }}>
              No responses yet — be the first to help!
            </div>
          )}

          {submitted && (
            <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '14px', marginBottom: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>✓</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#085041' }}>Response sent!</div>
              <div style={{ fontSize: 13, color: '#0F6E56', marginTop: 4 }}>@{request.profiles?.username} will see your offer.</div>
            </div>
          )}

          {responses.map(res => (
            <div key={res.id} style={{ background: '#f5f5f5', borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#B5D4F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#0C447C' }}>
                  {res.profiles?.username?.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>@{res.profiles?.username}</span>
                <span style={{ fontSize: 11, color: '#888', marginLeft: 'auto' }}>★ {res.profiles?.avg_rating}</span>
              </div>
              <div style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>{res.message}</div>
              {res.meet_location && (
                <div style={{ fontSize: 12, color: '#185FA5', marginTop: 6 }}>📍 Meet at: {res.meet_location}</div>
              )}
            </div>
          ))}
        </div>

        {showForm && (
          <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>Your response</div>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="I have this! I can meet you in 10 minutes…" rows={3} style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', outline: 'none', resize: 'none' }} />
            <input value={meetLocation} onChange={e => setMeetLocation(e.target.value)} placeholder="Where can you meet? e.g. Moffitt lobby, Sather Gate…" style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', outline: 'none' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: 12, background: 'transparent', color: '#888', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleRespond} disabled={responding || !message.trim()} style={{ flex: 2, padding: 12, background: '#185FA5', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: responding ? 0.7 : 1 }}>
                {responding ? 'Sending…' : 'Send response'}
              </button>
            </div>
          </div>
        )}

        <div style={{ height: 100 }} />
      </div>

      {!isOwner && !alreadyResponded && !submitted && !showForm && (
        <div style={{ padding: '12px 16px 24px', borderTop: '0.5px solid #e5e5e5', background: '#fff' }}>
          <button onClick={() => setShowForm(true)} style={{ width: '100%', padding: 14, background: '#185FA5', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
            📍 I can help with this!
          </button>
        </div>
      )}
    </div>
  )
}