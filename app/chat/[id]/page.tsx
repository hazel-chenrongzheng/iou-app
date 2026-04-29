'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../supabase'

type Message = {
  id: string
  content: string
  sender_id: string
  created_at: string
  profiles: { username: string }
}

type Exchange = {
  id: string
  status: string
  favor_cost: number
  due_date: string
  payment_type: string
  cash_amount: number | null
  borrower_id: string
  lender_id: string
  pickup_location: string | null
  rated_by_borrower: boolean
  rated_by_lender: boolean
  items: { name: string; emoji: string }
  borrower: { username: string }
  lender: { username: string }
}

const STATUS_STEPS = ['requested', 'accepted', 'picked_up', 'returned', 'completed']

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const [exchange, setExchange] = useState<Exchange | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [pickupLocation, setPickupLocation] = useState('')
  const [showPickupInput, setShowPickupInput] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUserId(session.user.id)
      await loadExchange(session.user.id)
      await loadMessages()
    })

    const channel = supabase
      .channel(`chat-${params.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `exchange_id=eq.${params.id}`
      }, payload => {
        loadMessages()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadExchange(uid: string) {
    const { data } = await supabase
      .from('exchanges')
      .select(`*, items(name, emoji), borrower:profiles!exchanges_borrower_id_fkey(username), lender:profiles!exchanges_lender_id_fkey(username)`)
      .eq('id', params.id)
      .single()
    if (data) {
      setExchange(data)
      setPickupLocation(data.pickup_location || '')
    }
    setLoading(false)
  }

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(username)')
      .eq('exchange_id', params.id)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  async function sendMessage() {
    if (!newMessage.trim() || !userId) return
    setSending(true)
    await supabase.from('messages').insert({
      exchange_id: params.id,
      sender_id: userId,
      content: newMessage.trim(),
    })
    setNewMessage('')
    setSending(false)
  }

  async function updateStatus(newStatus: string) {
    await supabase.from('exchanges').update({ status: newStatus }).eq('id', params.id)
    setExchange(prev => prev ? { ...prev, status: newStatus } : null)
    await supabase.from('messages').insert({
      exchange_id: params.id,
      sender_id: userId,
      content: `📦 Status updated to: ${newStatus.replace('_', ' ')}`,
    })
    await loadMessages()
  }

  async function savePickupLocation() {
    await supabase.from('exchanges').update({ pickup_location: pickupLocation }).eq('id', params.id)
    setExchange(prev => prev ? { ...prev, pickup_location: pickupLocation } : null)
    setShowPickupInput(false)
    await supabase.from('messages').insert({
      exchange_id: params.id,
      sender_id: userId,
      content: `📍 Pickup location set: ${pickupLocation}`,
    })
    await loadMessages()
  }

  if (loading) return (
    <div style={{ maxWidth: '100%', margin: '0 auto', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ fontSize: 14, color: '#888' }}>Loading…</div>
    </div>
  )

  if (!exchange) return null

  const isLender = userId === exchange.lender_id
  const isBorrower = userId === exchange.borrower_id
  const otherUser = isLender ? exchange.borrower?.username : exchange.lender?.username
  const currentStepIndex = STATUS_STEPS.indexOf(exchange.status)
  const needsRating = exchange.status === 'returned' && ((isLender && !exchange.rated_by_lender) || (isBorrower && !exchange.rated_by_borrower))

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto', height: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#fff' }}>

      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #e5e5e5', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.back()} style={{ width: 30, height: 30, borderRadius: '50%', border: '0.5px solid #e5e5e5', background: 'transparent', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div style={{ fontSize: 18 }}>{exchange.items?.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{exchange.items?.name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>with @{otherUser}</div>
          </div>
          <div style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, background: '#E1F5EE', color: '#085041' }}>{exchange.status.replace('_', ' ')}</div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
          {STATUS_STEPS.map((step, i) => (
            <div key={step} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= currentStepIndex ? '#1D9E75' : '#e5e5e5', transition: 'background 0.3s' }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          {STATUS_STEPS.map((step, i) => (
            <div key={step} style={{ fontSize: 9, color: i <= currentStepIndex ? '#1D9E75' : '#aaa', textAlign: 'center', flex: 1 }}>{step.replace('_', ' ')}</div>
          ))}
        </div>
      </div>

      {/* Pickup location banner */}
      {exchange.pickup_location && (
        <div style={{ padding: '8px 16px', background: '#E1F5EE', borderBottom: '0.5px solid #5DCAA5', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>📍</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#085041', fontWeight: 500 }}>Pickup location</div>
            <div style={{ fontSize: 12, color: '#0F6E56' }}>{exchange.pickup_location}</div>
          </div>
          <button onClick={() => setShowPickupInput(true)} style={{ fontSize: 11, color: '#1D9E75', background: 'transparent', border: 'none', cursor: 'pointer' }}>Edit</button>
        </div>
      )}

      {/* Rating prompt */}
      {needsRating && (
        <div style={{ padding: '10px 16px', background: '#FAEEDA', borderBottom: '0.5px solid #FAC775', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⭐</span>
          <div style={{ flex: 1, fontSize: 13, color: '#633806' }}>Exchange complete! Rate @{otherUser}</div>
          <button onClick={() => router.push(`/rate/${params.id}`)} style={{ fontSize: 12, padding: '5px 12px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>Rate now</button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#aaa', fontSize: 13 }}>
            Start the conversation — agree on pickup time and location!
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === userId
          const isSystem = msg.content.startsWith('📦') || msg.content.startsWith('📍')
          if (isSystem) return (
            <div key={msg.id} style={{ textAlign: 'center', fontSize: 12, color: '#888', padding: '2px 0' }}>{msg.content}</div>
          )
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '100%', padding: '8px 12px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isMe ? '#1D9E75' : '#f5f5f5', color: isMe ? '#fff' : '#111' }}>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{msg.content}</div>
                <div style={{ fontSize: 10, marginTop: 3, opacity: 0.7 }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Action buttons */}
      <div style={{ padding: '8px 16px', borderTop: '0.5px solid #e5e5e5', display: 'flex', flexDirection: 'column', gap: 6 }}>

        {/* Set pickup location */}
        {!exchange.pickup_location && !showPickupInput && exchange.status === 'accepted' && (
          <button onClick={() => setShowPickupInput(true)} style={{ width: '100%', padding: '8px', background: '#E1F5EE', color: '#085041', border: '0.5px solid #5DCAA5', borderRadius: 10, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
            📍 Set pickup location
          </button>
        )}

        {showPickupInput && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} placeholder="e.g. Moffitt lobby, Sather Gate…" style={{ flex: 1, padding: '8px 12px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 13, outline: 'none' }} />
            <button onClick={savePickupLocation} style={{ padding: '8px 14px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>Save</button>
          </div>
        )}

        {/* Status action buttons */}
        {isLender && exchange.status === 'requested' && (
          <button onClick={() => updateStatus('accepted')} style={{ width: '100%', padding: 10, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            ✓ Accept borrow request
          </button>
        )}
        {exchange.status === 'accepted' && (
          <button onClick={() => updateStatus('picked_up')} style={{ width: '100%', padding: 10, background: '#185FA5', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            📦 Confirm pickup
          </button>
        )}
        {isLender && exchange.status === 'picked_up' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => updateStatus('returned')} style={{ flex: 1, padding: 10, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>✓ Mark returned</button>
            <button onClick={() => updateStatus('disputed')} style={{ padding: '10px 14px', background: 'transparent', color: '#A32D2D', border: '0.5px solid #F09595', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>Dispute</button>
          </div>
        )}

        {/* Message input */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Message…"
            style={{ flex: 1, padding: '10px 14px', border: '0.5px solid #e5e5e5', borderRadius: 22, fontSize: 14, outline: 'none', background: '#f5f5f5' }}
          />
          <button onClick={sendMessage} disabled={sending || !newMessage.trim()} style={{ width: 40, height: 40, borderRadius: '50%', background: newMessage.trim() ? '#1D9E75' : '#e5e5e5', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
        </div>
      </div>
    </div>
  )
}