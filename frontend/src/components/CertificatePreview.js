import React from 'react'

export default function CertificatePreview({ certificate }) {
  if (!certificate) return null
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden', border: '1px solid #EADFCF',
      boxShadow: '0 12px 40px rgba(15,23,42,.12)',
    }}>
      <img
        src={certificate.certificate_image_url}
        alt="Certificate of Story Contribution"
        style={{ width: '100%', display: 'block' }}
      />
    </div>
  )
}
