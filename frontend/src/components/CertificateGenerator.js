import React, { useState, useEffect, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { adminGetUserStories, generateCertificate, getCertificate } from '../lib/api'
import { toast } from './Toast'
import CertificateDownloadButton from './CertificateDownloadButton'
import CertificateShareModal from './CertificateShareModal'

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid rgba(26,8,0,.12)', fontSize: 14, fontFamily: 'inherit',
}
const labelStyle = { fontSize: 12.5, fontWeight: 600, color: '#3A2E22', marginBottom: 4, display: 'block' }

// Admin-only: generate a Story Contributor Certificate on behalf of a user.
// Rendering happens in the background (Puppeteer + S3 upload can take a while),
// so this polls the certificate row until status flips to 'completed'/'failed'.
export default function CertificateGenerator({ user, onClose }) {
  const [stories, setStories] = useState([])
  const [form, setForm] = useState({
    storyId: '', companyName: '', jobTitle: '', joiningDate: '', industry: '', location: '', companyLogoUrl: '',
    communityManagerName: '', coFounderName: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [certificate, setCertificate] = useState(null)
  const pollRef = useRef(null)

  useEffect(() => {
    adminGetUserStories(user.id).then(({ data }) => setStories(data || []))
  }, [user.id])

  useEffect(() => () => clearInterval(pollRef.current), [])

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const startPolling = (certId) => {
    pollRef.current = setInterval(async () => {
      const { data } = await getCertificate(certId)
      if (data && data.status !== 'processing') {
        clearInterval(pollRef.current)
        setCertificate(data)
      }
    }, 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.storyId) { toast.error('Select a story'); return }
    if (!form.companyName.trim() || !form.jobTitle.trim()) {
      toast.error('Company name and job title are required')
      return
    }
    setSubmitting(true)
    const { data, error } = await generateCertificate(form)
    setSubmitting(false)
    if (error) { toast.error(error.message || 'Could not generate certificate'); return }
    setCertificate(data)
    startPolling(data.id)
  }

  if (certificate) {
    return (
      <CertificateResultPopup
        certificate={certificate}
        userName={user.full_name || user.username}
        onClose={onClose}
      />
    )
  }

  return (
    <div className="modal-overlay" onClick={submitting ? undefined : onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Generate Certificate — {user.full_name || user.username}</h3>
          <button className="close-btn" onClick={onClose} disabled={submitting}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Story *</label>
              <select style={inputStyle} value={form.storyId} onChange={update('storyId')} required>
                <option value="">Select a story…</option>
                {stories.map(s => (
                  <option key={s.id} value={s.id}>{s.title} — {s.category}</option>
                ))}
              </select>
              {stories.length === 0 && (
                <div style={{ fontSize: 11.5, color: '#8C7B6E', marginTop: 4 }}>This user has no published stories yet.</div>
              )}
            </div>
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
            <div>
              <label style={labelStyle}>Community Manager Name</label>
              <input style={inputStyle} value={form.communityManagerName} onChange={update('communityManagerName')} placeholder="Rohan Malhotra" />
            </div>
            <div>
              <label style={labelStyle}>Co-Founder Name</label>
              <input style={inputStyle} value={form.coFounderName} onChange={update('coFounderName')} placeholder="Neha Verma" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '⏳ Starting…' : '🎖 Generate Certificate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Centered popup shown while generation runs in the background, then on
// completion shows just the QR code, the recipient's name, and download/share.
function CertificateResultPopup({ certificate, userName, onClose }) {
  const [shareOpen, setShareOpen] = useState(false)
  const processing = certificate.status === 'processing'
  const failed = certificate.status === 'failed'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 340 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Certificate</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          {processing && (
            <>
              <div className="spinner" />
              <div style={{ fontSize: 13, color: '#6B5347' }}>Generating certificate for {userName}…</div>
              <div style={{ fontSize: 11.5, color: '#8C7B6E' }}>You can close this — it'll keep generating in the background.</div>
            </>
          )}
          {failed && (
            <div style={{ fontSize: 13, color: '#DC2626' }}>Certificate generation failed. Please try again.</div>
          )}
          {!processing && !failed && (
            <>
              <div style={{ padding: 10, background: 'white', borderRadius: 12, border: '1px solid #EADFCF' }}>
                <QRCodeCanvas value={certificate.qr_target_url} size={150} fgColor="#0F172A" level="H" />
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, fontFamily: "'Playfair Display',serif", color: '#1A0800' }}>
                {userName}
              </div>
              <CertificateDownloadButton certificateId={certificate.id} />
              <button className="btn btn-secondary" onClick={() => setShareOpen(true)}>Share Certificate</button>
            </>
          )}
        </div>
      </div>
      {shareOpen && <CertificateShareModal certificate={certificate} onClose={() => setShareOpen(false)} />}
    </div>
  )
}
