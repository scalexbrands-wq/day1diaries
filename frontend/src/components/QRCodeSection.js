import React from 'react'
import { QRCodeCanvas } from 'qrcode.react'

export default function QRCodeSection({ url }) {
  if (!url) return null
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      width: '100%', boxSizing: 'border-box', background: 'white',
      border: '1px solid #EADFCF', borderRadius: 16, padding: '22px 20px',
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#3A2E22' }}>Verify This Certificate</div>
      <div style={{ padding: 10, background: 'white', borderRadius: 12, border: '1px solid #EADFCF' }}>
        <QRCodeCanvas value={url} size={120} fgColor="#0F172A" level="H" />
      </div>
      <div style={{ fontSize: 11.5, color: '#6B5347', textAlign: 'center' }}>Scan to view the original story</div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: 11.5, color: '#FF6B2B', fontWeight: 600, wordBreak: 'break-all', textAlign: 'center', maxWidth: '100%' }}
      >
        {url}
      </a>
    </div>
  )
}
