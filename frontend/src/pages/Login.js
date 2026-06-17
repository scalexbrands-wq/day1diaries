import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn, resendConfirmationCode } from '../lib/api'
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

  return (
    <div style={{ minHeight:'100vh', background:'var(--cream)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'white', borderRadius:24, padding:'40px 36px', width:'100%', maxWidth:420, boxShadow:'0 12px 40px rgba(26,10,0,.10)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontFamily:'Playfair Display,serif', fontSize:'24px', fontWeight:900, color:'var(--orange)', marginBottom:6 }}>Day1 Diaries</div>
          <h2 style={{ fontSize:'1.2rem', marginBottom:4 }}>Welcome back</h2>
          <p style={{ fontSize:'13px', color:'var(--gray-400)' }}>Sign in to your account</p>
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
