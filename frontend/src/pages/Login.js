import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn, signInGoogle, resendConfirmationCode } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { toast } from '../components/Toast'

export default function Login() {
  const navigate = useNavigate()
  const { reloadSession } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [unconfirmed, setUnconfirmed] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setLoading(false)
      if (error.status === 403 && error.message?.includes('not confirmed')) {
        setUnconfirmed(true)
        toast.error('Please verify your email before signing in.')
        return
      }
      toast.error(error.message)
      return
    }
    await reloadSession()
    setLoading(false)
    navigate('/feed')
  }

  const handleResend = async () => {
    await resendConfirmationCode(email)
    toast.success('Verification code resent — check your email.')
    navigate('/register', { state: { email, step: 'confirm' } })
  }

  const handleGoogle = () => signInGoogle()

  return (
    <div style={{ minHeight:'100vh', background:'var(--cream)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'white', borderRadius:24, padding:'40px 36px', width:'100%', maxWidth:420, boxShadow:'0 12px 40px rgba(26,10,0,.10)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontFamily:'Playfair Display,serif', fontSize:'24px', fontWeight:900, color:'var(--orange)', marginBottom:6 }}>Day1 Diaries</div>
          <h2 style={{ fontSize:'1.2rem', marginBottom:4 }}>Welcome back</h2>
          <p style={{ fontSize:'13px', color:'var(--gray-400)' }}>Sign in to your account</p>
        </div>

        <button onClick={handleGoogle} className="btn btn-secondary w-full" style={{ marginBottom:16, justifyContent:'center', gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332Z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58Z"/></svg>
          Continue with Google
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <div style={{ flex:1, height:1, background:'var(--gray-100)' }}/><span style={{ fontSize:'12px', color:'var(--gray-400)' }}>or</span><div style={{ flex:1, height:1, background:'var(--gray-100)' }}/>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-control" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>

          {unconfirmed && (
            <div style={{ background:'rgba(255,107,43,.08)', border:'1px solid rgba(255,107,43,.2)', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:13 }}>
              Your account isn't verified yet.{' '}
              <button type="button" onClick={handleResend} style={{ color:'var(--orange)', background:'none', border:'none', cursor:'pointer', fontWeight:600, padding:0, textDecoration:'underline' }}>
                Resend verification code
              </button>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ justifyContent:'center', marginTop:6 }}>
            {loading ? <span className="spinner spinner-sm"/> : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign:'center', fontSize:'13px', color:'var(--gray-400)', marginTop:20 }}>
          Don't have an account? <Link to="/register" style={{ color:'var(--orange)', fontWeight:600 }}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}
