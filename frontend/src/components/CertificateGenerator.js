import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateCertificate } from '../lib/api'
import { toast } from './Toast'

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid rgba(26,8,0,.12)', fontSize: 14, fontFamily: 'inherit',
}
const labelStyle = { fontSize: 12.5, fontWeight: 600, color: '#3A2E22', marginBottom: 4, display: 'block' }

export default function CertificateGenerator({ storyId, onClose }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    companyName: '', jobTitle: '', joiningDate: '', industry: '', location: '', companyLogoUrl: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.companyName.trim() || !form.jobTitle.trim()) {
      toast.error('Company name and job title are required')
      return
    }
    setSubmitting(true)
    const { data, error } = await generateCertificate({ storyId, ...form })
    setSubmitting(false)
    if (error) { toast.error(error.message || 'Could not generate certificate'); return }
    toast.success('Certificate generated! 🎖')
    navigate(`/certificate/${data.id}`)
  }

  return (
    <div className="modal-overlay" onClick={submitting ? undefined : onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Generate Certificate</h3>
          <button className="close-btn" onClick={onClose} disabled={submitting}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Company Name *</label>
              <input style={inputStyle} value={form.companyName} onChange={update('companyName')} required />
            </div>
            <div>
              <label style={labelStyle}>Job Title *</label>
              <input style={inputStyle} value={form.jobTitle} onChange={update('jobTitle')} required />
            </div>
            <div>
              <label style={labelStyle}>Joining Date</label>
              <input type="date" style={inputStyle} value={form.joiningDate} onChange={update('joiningDate')} />
            </div>
            <div>
              <label style={labelStyle}>Industry</label>
              <input style={inputStyle} value={form.industry} onChange={update('industry')} />
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <input style={inputStyle} value={form.location} onChange={update('location')} />
            </div>
            <div>
              <label style={labelStyle}>Company Logo URL (optional)</label>
              <input style={inputStyle} value={form.companyLogoUrl} onChange={update('companyLogoUrl')} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '⏳ Generating…' : '🎖 Generate Certificate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
