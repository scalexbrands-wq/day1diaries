import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import SiteLayout from './SiteLayout'
import { getCareersJob, applyToJob } from '../lib/api'

function formatSalary(min, max, currency) {
  if (!min && !max) return null
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'
  const fmt = (n) => n >= 100000 ? `${(n/100000).toFixed(1)}L` : n.toLocaleString()
  if (min && max) return `${sym}${fmt(min)} – ${sym}${fmt(max)} /yr`
  return `${sym}${fmt(min || max)} /yr`
}

export default function JobDetail() {
  const { id } = useParams()
  const [job, setJob] = useState(undefined)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', resume_url: '', cover_note: '' })
  const [status, setStatus] = useState(null) // null | 'sending' | 'sent' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    getCareersJob(id).then(({ data, error }) => setJob(error ? null : data))
  }, [id])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')
    const { error } = await applyToJob(id, form)
    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }
    setStatus('sent')
  }

  if (job === undefined) {
    return (
      <SiteLayout>
        <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}>
          <div style={{ width:28, height:28, border:'3px solid rgba(255,107,43,.2)', borderTopColor:'#FF6B2B', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </SiteLayout>
    )
  }

  if (job === null) {
    return (
      <SiteLayout eyebrow="Careers" title="Role not found">
        <div className="site-card" style={{ textAlign:'center' }}>
          <p>This role doesn't exist or is no longer open.</p>
          <Link to="/careers" className="site-btn" style={{ textDecoration:'none', display:'inline-flex', background:'transparent', border:'1.5px solid rgba(26,8,0,.15)', color:'#1A0800' }}>← Back to Careers</Link>
        </div>
      </SiteLayout>
    )
  }

  const salary = formatSalary(job.salary_min, job.salary_max, job.currency)
  const requirements = (job.requirements || '').split('\n').map(s => s.trim()).filter(Boolean)

  return (
    <SiteLayout
      eyebrow="Careers"
      title={job.title}
      subtitle={[job.department, job.location, job.job_type].filter(Boolean).join(' · ')}
    >
      {salary && (
        <div style={{ display:'inline-block', background:'rgba(255,107,43,.1)', color:'#FF6B2B', borderRadius:100, padding:'6px 16px', fontSize:13, fontWeight:600, marginBottom:20 }}>
          {salary}
        </div>
      )}

      <div className="site-card" style={{ marginBottom:20 }}>
        <h2 style={{ marginTop:0 }}>About this role</h2>
        <p style={{ whiteSpace:'pre-wrap' }}>{job.description}</p>

        {requirements.length > 0 && (
          <>
            <h2>What we're looking for</h2>
            <ul style={{ margin:0, paddingLeft:20 }}>
              {requirements.map((r,i) => <li key={i} style={{ fontSize:14.5, lineHeight:1.8, color:'#4A2800', marginBottom:6 }}>{r}</li>)}
            </ul>
          </>
        )}
      </div>

      {/* ── APPLICATION FORM ── */}
      <div className="site-card">
        <h2 style={{ marginTop:0 }}>Apply for this role</h2>

        {status === 'sent' ? (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:36, marginBottom:10 }}>🎉</div>
            <p style={{ fontWeight:600, color:'#1A0800' }}>Application submitted!</p>
            <p style={{ color:'#8C7B6E' }}>Thanks for applying — our team will review your application and get in touch if there's a fit.</p>
            <Link to="/careers" className="site-btn" style={{ textDecoration:'none', display:'inline-flex', marginTop:10, background:'transparent', border:'1.5px solid rgba(26,8,0,.15)', color:'#1A0800' }}>← Back to Careers</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="site-form-row">
              <div>
                <label className="site-label">Full name *</label>
                <input className="site-input" required value={form.full_name} onChange={set('full_name')} placeholder="Your name" />
              </div>
              <div>
                <label className="site-label">Email *</label>
                <input type="email" className="site-input" required value={form.email} onChange={set('email')} placeholder="you@example.com" />
              </div>
            </div>
            <div className="site-form-row">
              <div>
                <label className="site-label">Phone</label>
                <input className="site-input" value={form.phone} onChange={set('phone')} placeholder="Optional" />
              </div>
              <div>
                <label className="site-label">Resume link</label>
                <input className="site-input" value={form.resume_url} onChange={set('resume_url')} placeholder="Link to resume (Drive, LinkedIn, etc.)" />
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label className="site-label">Cover note</label>
              <textarea className="site-input" rows={5} value={form.cover_note} onChange={set('cover_note')} placeholder="Tell us why you're a great fit for this role..." style={{ resize:'vertical', fontFamily:'inherit' }} />
            </div>
            {status === 'error' && <p style={{ color:'#DC2626', fontSize:13, marginBottom:12 }}>{errorMsg}</p>}
            <button type="submit" className="site-btn" disabled={status === 'sending'}>
              {status === 'sending' ? 'Submitting…' : 'Submit Application'}
            </button>
          </form>
        )}
      </div>
    </SiteLayout>
  )
}
