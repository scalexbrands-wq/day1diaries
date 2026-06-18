import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCertificate } from '../lib/api'
import CertificatePreview from '../components/CertificatePreview'
import AIInsightsBadge from '../components/AIInsightsBadge'
import ImpactLevelCard from '../components/ImpactLevelCard'
import QRCodeSection from '../components/QRCodeSection'
import CertificateDownloadButton from '../components/CertificateDownloadButton'
import CertificateShareModal from '../components/CertificateShareModal'

export default function CertificateViewer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [certificate, setCertificate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    getCertificate(id).then(({ data }) => {
      setCertificate(data)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (!certificate) return (
    <div className="empty-state">
      <div className="empty-state-icon">🎖</div>
      <h3>Certificate not found</h3>
      <button className="btn btn-primary" onClick={() => navigate('/feed')}>Back to Feed</button>
    </div>
  )

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <CertificatePreview certificate={certificate} />

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px' }}>
          <ImpactLevelCard level={certificate.impact_level} />
        </div>
        <div style={{ flex: '2 1 320px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#6B5347' }}>AI Insights</div>
          <AIInsightsBadge tags={certificate.ai_insights?.tags} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <CertificateDownloadButton certificateId={certificate.id} />
        <button className="btn btn-secondary" onClick={() => setShareOpen(true)}>Share Certificate</button>
      </div>

      <QRCodeSection url={certificate.qr_target_url} />

      {shareOpen && <CertificateShareModal certificate={certificate} onClose={() => setShareOpen(false)} />}
    </div>
  )
}
