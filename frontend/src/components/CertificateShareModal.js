import React, { useState } from 'react'
import { toast } from './Toast'
import { shareCertificate } from '../lib/api'

const APP_URL = 'https://d1kxji3yv78nbx.cloudfront.net'

function certificateShareText(fullName, companyName) {
  return `🎖 I just earned my "Certificate of Story Contribution" on Day1 Diaries for sharing my Day 1 journey at ${companyName}!\n\nEvery Fresher Story Is A Memory. For Someone Else, It's A Roadmap.`
}

const PLATFORMS = [
  { key: 'whatsapp', label: 'WhatsApp', color: '#25D366', getUrl: (text) => `https://wa.me/?text=${encodeURIComponent(text)}` },
  { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2', getUrl: (text, url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}` },
  { key: 'facebook', label: 'Facebook', color: '#1877F2', getUrl: (text, url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}` },
]

export default function CertificateShareModal({ certificate, onClose }) {
  const [copied, setCopied] = useState(false)
  const shareUrl = `${APP_URL}/certificate/${certificate.id}`
  const shareText = certificateShareText(certificate.snapshot?.fullName, certificate.company_name)

  const handleShareClick = (platform) => {
    shareCertificate(certificate.id, platform).catch(() => {})
  }

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      toast.success('Link copied to clipboard!')
      handleShareClick('copy_link')
    }).catch(() => toast.error('Could not copy'))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Share Your Certificate</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PLATFORMS.map(p => (
              <a
                key={p.key}
                href={p.getUrl(shareText, shareUrl)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleShareClick(p.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  borderRadius: 10, color: p.color, textDecoration: 'none', fontWeight: 600,
                  fontSize: 14, border: `1px solid ${p.color}30`, background: `${p.color}0D`,
                }}
              >
                Share to {p.label}
              </a>
            ))}
            <button
              onClick={copyLink}
              className="btn btn-secondary"
              style={{ marginTop: 4 }}
            >
              {copied ? '✓ Link Copied' : 'Copy Public Link'}
            </button>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
