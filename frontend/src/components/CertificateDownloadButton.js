import React from 'react'
import { certificateDownloadUrl } from '../lib/api'

export default function CertificateDownloadButton({ certificateId }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <a className="btn btn-primary" href={certificateDownloadUrl(certificateId, 'png')}>
        ⬇ Download PNG
      </a>
      <a className="btn btn-secondary" href={certificateDownloadUrl(certificateId, 'pdf')}>
        ⬇ Download PDF
      </a>
    </div>
  )
}
