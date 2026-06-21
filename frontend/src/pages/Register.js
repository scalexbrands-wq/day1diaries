import React, { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { signUp, confirmSignUp, resendConfirmationCode } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { toast } from '../components/Toast'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { reloadSession } = useAuth()
  const [step, setStep] = useState(location.state?.step === 'confirm' ? 'confirm' : 'signup')
  const [form, setForm] = useState({
    email: location.state?.email || '', password: '', full_name: '', username: '', phone: ''
  })
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // ── Step 1: create the account ───────────────────────────────
  // If an admin has turned off email verification, signUp() comes
  // back already confirmed (with tokens stored) — skip straight to
  // the feed instead of showing a confirmation step that has no
  // code to enter.
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters, with upper/lowercase and a number'); return }
    setLoading(true)
    const username = form.username.toLowerCase().replace(/\s+/g, '-')
    const { data, error } = await signUp(form.email, form.password, { full_name: form.full_name, username, phone: form.phone })
    if (error) { setLoading(false); toast.error(error.message); return }

    if (data?.autoConfirmed) {
      await reloadSession()
      setLoading(false)
      toast.success('Welcome to Day1 Diaries 🎉')
      navigate('/feed')
      return
    }

    setLoading(false)
    toast.success('Check your email for a 6-digit verification code!')
    setStep('confirm')
  }

  // ── Step 2: confirm the email with the 6-digit code ──────────
  const handleConfirm = async (e) => {
    e.preventDefault()
    setLoading(true)
    const username = form.username.toLowerCase().replace(/\s+/g, '-')
    const { error } = await confirmSignUp(form.email, code, form.password, username, form.full_name, form.phone)
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
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}><LanguageSwitcher /></div>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontFamily:'Playfair Display,serif', fontSize:'24px', fontWeight:900, color:'var(--orange)', marginBottom:6 }}>Day1 Diaries</div>
          <h2 style={{ fontSize:'1.2rem', marginBottom:4 }}>{t('auth.registerTitle')}</h2>
          <p style={{ fontSize:'13px', color:'var(--gray-400)' }}>{t('auth.registerSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">{t('auth.fullName')}</label>
              <input type="text" className="form-control" placeholder="Priya Sharma" value={form.full_name} onChange={set('full_name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('auth.username')}</label>
              <input type="text" className="form-control" placeholder="priya_s" value={form.username} onChange={set('username')} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('auth.email')}</label>
            <input type="email" className="form-control" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label">WhatsApp Number</label>
            <input type="tel" className="form-control" placeholder="+91XXXXXXXXXX" value={form.phone} onChange={set('phone')} required />
            <div style={{ fontSize:'11px', color:'var(--gray-400)', marginTop:4 }}>We'll send you a welcome message with our WhatsApp community invite.</div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('auth.password')}</label>
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
            {loading ? <span className="spinner spinner-sm"/> : t('auth.registerButton')}
          </button>
        </form>

        <p style={{ textAlign:'center', fontSize:'13px', color:'var(--gray-400)', marginTop:20 }}>
          {t('auth.haveAccount')} <Link to="/login" style={{ color:'var(--orange)', fontWeight:600 }}>{t('auth.loginLink')}</Link>
        </p>
      </div>
    </div>
  )
}
