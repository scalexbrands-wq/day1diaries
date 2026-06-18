import React from 'react'
import { QRCodeCanvas } from 'qrcode.react'

export default function QRCodeSection({ url }) {
  if (!url) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ padding: 10, background: 'white', borderRadius: 12, border: '1px solid #EADFCF' }}>
        <QRCodeCanvas value={url} size={120} fgColor="#0F172A" level="H" />
      </div>
      <div style={{ fontSize: 11.5, color: '#6B5347', textAlign: 'center' }}>Scan to view the original story</div>
    </div>
  )
}
