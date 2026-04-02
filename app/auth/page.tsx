'use client'
import { useState } from 'react'
import { supabase } from '../supabase'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) { setError(signUpError.message); setLoading(false); return }

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          username,
          full_name: username,
          neighborhood,
          favor_balance: 5,
          trust_tier: 'Newcomer',
        })
        if (profileError) { setError(profileError.message); setLoading(false); return }
        setSuccess('Account created! Check your email to confirm, then log in.')
        setMode('login')
      }
    } else {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) { setError(loginError.message); setLoading(false); return }
      router.push('/')
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', height: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px', fontFamily: 'system-ui, sans-serif', background: '#fff' }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -2 }}>io<span style={{ color: '#1D9E75' }}>U</span></div>
        <div style={{ fontSize: 14, color: '#888', marginTop: 6 }}>borrow from neighbors, build trust</div>
      </div>

      {/* Toggle */}
      <div style={{ display: 'flex', border: '0.5px solid #e5e5e5', borderRadius: 12, overflow: 'hidden', background: '#f5f5f5', marginBottom: 24 }}>
        {(['login', 'signup'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }} style={{ flex: 1, padding: '9px 0', fontSize: 14, border: 'none', background: mode === m ? '#fff' : 'transparent', fontWeight: mode === m ? 500 : 400, color: mode === m ? '#111' : '#888', cursor: 'pointer', borderRadius: mode === m ? 10 : 0, margin: mode === m ? 2 : 0 }}>
            {m === 'login' ? 'Log in' : 'Sign up'}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mode === 'signup' && (
          <>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>Username</div>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. jamie_lee" style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', background: '#fff', outline: 'none' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>Neighborhood</div>
              <input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="e.g. Southside, Northside, Downtown" style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', background: '#fff', outline: 'none' }} />
            </div>
          </>
        )}
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>Email</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@berkeley.edu" style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', background: '#fff', outline: 'none' }} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>Password</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="min 6 characters" style={{ width: '100%', padding: '11px 14px', border: '0.5px solid #e5e5e5', borderRadius: 10, fontSize: 14, color: '#111', background: '#fff', outline: 'none' }} />
        </div>
      </div>

      {/* Error / success */}
      {error && <div style={{ marginTop: 14, padding: '10px 14px', background: '#FCEBEB', borderRadius: 10, fontSize: 13, color: '#A32D2D' }}>{error}</div>}
      {success && <div style={{ marginTop: 14, padding: '10px 14px', background: '#E1F5EE', borderRadius: 10, fontSize: 13, color: '#085041' }}>{success}</div>}

      {/* Submit */}
      <button onClick={handleSubmit} disabled={loading} style={{ marginTop: 20, padding: '14px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
        {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
      </button>

      <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#aaa' }}>
        New users start with <span style={{ color: '#1D9E75', fontWeight: 500 }}>5 favors</span> to get borrowing right away
      </div>
    </div>
  )
}