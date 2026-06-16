import React, { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { signUp, signInGoogle, confirmSignUp, resendConfirmationCode } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { toast } from '../components/Toast'

export default function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const { reloadSession } = useAuth()
  const [step, setStep] = useState(location.state?.step === 'confirm' ? 'confirm' : 'signup')
  const [form, setForm] = useState({
    email: location.state?.email || '', password: '', full_name: '', username: ''
  })
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // ── Step 1: create the Cognito account ──────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters, with upper/lowercase and a number'); return }
    setLoading(true)
    const username = form.username.toLowerCase().replace(/\s+/g, '-')
    const { error } = await signUp(form.email, form.password, { full_name: form.full_name, username })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Check your email for a 6-digit verification code!')
    setStep('confirm')
  }

  // ── Step 2: confirm the email with the 6-digit code ──────────
  const handleConfirm = async (e) => {
    e.preventDefault()
    setLoading(true)
    const username = form.username.toLowerCase().replace(/\s+/g, '-')
    const { error } = await confirmSignUp(form.email, code, form.password, username, form.full_name)
    if (error) { setLoading(false); toast.error(error.message); return }
    await reloadSession()
    setLoading(false)
    toast.success('Account verified! Welcome to Day1 Diaries 🎉')
    navigate('/feed')
  }

  const handleResend = async () => {
    await resendConfirmationCode(form.email)
    toast.success('Verification code resent — check your email.')
  }

  const handleGoogle = () => signInGoogle()

  // ── CONFIRMATION STEP ──────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div style={{ minHeight:'100vh', background:'var(--cream)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
        <div style={{ background:'white', borderRadius:24, padding:'40px 36px', width:'100%', maxWidth:420, boxShadow:'0 12px 40px rgba(26,10,0,.10)' }}>
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <div style={{ fontFamily:'Playfair Display,serif', fontSize:'24px', fontWeight:900, color:'var(--orange)', marginBottom:6 }}>Day1 Diaries</div>
            <h2 style={{ fontSize:'1.2rem', marginBottom:4 }}>Verify your email</h2>
            <p style={{ fontSize:'13px', color:'var(--gray-400)' }}>We sent a 6-digit code to <strong>{form.email}</strong></p>
          </div>
          <form onSubmit={handleConfirm}>
            <div className="form-group">
              <label className="form-label">Verification Code</label>
              <input type="text" inputMode="numeric" maxLength={6} className="form-control" placeholder="123456" value={code} onChange={e=>setCode(e.target.value)} required style={{ textAlign:'center', fontSize:'20px', letterSpacing:'0.3em', fontWeight:700 }}/>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ justifyContent:'center', marginTop:6 }}>
              {loading ? <span className="spinner spinner-sm"/> : 'Verify & Continue'}
            </button>
          </form>
          <p style={{ textAlign:'center', fontSize:'13px', color:'var(--gray-400)', marginTop:20 }}>
            Didn't get a code?{' '}
            <button onClick={handleResend} style={{ color:'var(--orange)', background:'none', border:'none', cursor:'pointer', fontWeight:600, padding:0, textDecoration:'underline' }}>
              Resend code
            </button>
          </p>
        </div>
      </div>
    )
  }

  // ── SIGNUP STEP ─────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'var(--cream)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'white', borderRadius:24, padding:'40px 36px', width:'100%', maxWidth:440, boxShadow:'0 12px 40px rgba(26,10,0,.10)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontFamily:'Playfair Display,serif', fontSize:'24px', fontWeight:900, color:'var(--orange)', marginBottom:6 }}>Day1 Diaries</div>
          <h2 style={{ fontSize:'1.2rem', marginBottom:4 }}>Join 10,000+ freshers</h2>
          <p style={{ fontSize:'13px', color:'var(--gray-400)' }}>Share your story. Find your people.</p>
        </div>

        <button onClick={handleGoogle} className="btn btn-secondary w-full" style={{ marginBottom:16, justifyContent:'center', gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332Z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58Z"/></svg>
          Sign up with Google
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <div style={{ flex:1, height:1, background:'var(--gray-100)' }}/><span style={{ fontSize:'12px', color:'var(--gray-400)' }}>or</span><div style={{ flex:1, height:1, background:'var(--gray-100)' }}/>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-control" placeholder="Priya Sharma" value={form.full_name} onChange={set('full_name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input type="text" className="form-control" placeholder="priya_s" value={form.username} onChange={set('username')} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-control" placeholder="At least 8 characters" value={form.password} onChange={set('password')} required />
            <div style={{ fontSize:'11px', color:'var(--gray-400)', marginTop:4 }}>Must include uppercase, lowercase, and a number.</div>
          </div>

          <p style={{ fontSize:'11.5px', color:'var(--gray-400)', lineHeight:1.6, marginTop:4, marginBottom:6 }}>
            By creating an account, you agree to our{' '}
            <Link to="/terms" style={{ color:'var(--orange)' }}>Terms of Service</Link>,{' '}
            <Link to="/privacy" style={{ color:'var(--orange)' }}>Privacy Policy</Link>,{' '}
            and <Link to="/content-policy" style={{ color:'var(--orange)' }}>Content Policy</Link>.
          </p>

          <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ justifyContent:'center', marginTop:6 }}>
            {loading ? <span className="spinner spinner-sm"/> : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign:'center', fontSize:'13px', color:'var(--gray-400)', marginTop:20 }}>
          Already have an account? <Link to="/login" style={{ color:'var(--orange)', fontWeight:600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
