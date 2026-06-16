import React, { useState } from 'react'
import SiteLayout from './SiteLayout'
import { sendContactMessage } from '../lib/api'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState(null) // null | 'sending' | 'sent' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')
    const { error } = await sendContactMessage(form)
    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }
    setStatus('sent')
    setForm({ name: '', email: '', subject: '', message: '' })
  }

  return (
    <SiteLayout eyebrow="Contact" title="Get in Touch" subtitle="Questions, feedback, partnership ideas, or just want to say hi? Send us a message and we'll get back to you.">
      <div className="site-card">
        {status === 'sent' ? (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:36, marginBottom:10 }}>📨</div>
            <p style={{ fontWeight:600, color:'#1A0800' }}>Message sent!</p>
            <p style={{ color:'#8C7B6E' }}>Thanks for reaching out — we'll get back to you as soon as we can.</p>
            <button className="site-btn" style={{ marginTop:10, background:'transparent', border:'1.5px solid rgba(26,8,0,.15)', color:'#1A0800' }} onClick={()=>setStatus(null)}>Send another message</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="site-form-row">
              <div>
                <label className="site-label">Name *</label>
                <input className="site-input" required value={form.name} onChange={set('name')} placeholder="Your name" />
              </div>
              <div>
                <label className="site-label">Email *</label>
                <input type="email" className="site-input" required value={form.email} onChange={set('email')} placeholder="you@example.com" />
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label className="site-label">Subject</label>
              <input className="site-input" value={form.subject} onChange={set('subject')} placeholder="What's this about?" />
            </div>
            <div style={{ marginBottom:16 }}>
              <label className="site-label">Message *</label>
              <textarea className="site-input" required rows={6} value={form.message} onChange={set('message')} placeholder="Write your message here..." style={{ resize:'vertical', fontFamily:'inherit' }} />
            </div>
            {status === 'error' && <p style={{ color:'#DC2626', fontSize:13, marginBottom:12 }}>{errorMsg}</p>}
            <button type="submit" className="site-btn" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </SiteLayout>
  )
}
