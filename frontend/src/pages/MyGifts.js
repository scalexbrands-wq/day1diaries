import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyGifts, getGiftDownloadUrl } from '../lib/api'

const STATUS_LABELS = {
  pending_payment: 'Awaiting Payment', processing: 'Creating Your Gift…', ready: 'Ready', failed: 'Failed',
}
const STATUS_COLORS = {
  pending_payment: '#F59E0B', processing: '#2563EB', ready: '#059669', failed: '#DC2626',
}

export default function MyGifts() {
  const [gifts, setGifts] = useState(null)

  useEffect(() => { getMyGifts().then(({ data }) => setGifts(data || [])) }, [])

  if (gifts === null) return <div className="loading-center"><div className="spinner" /></div>

  if (gifts.length === 0) {
    return (
      <div className="empty-state" style={{ textAlign: 'center', padding: '60px 16px' }}>
        <div style={{ fontSize: 40 }}>🎁</div>
        <h3>No gifts sent yet</h3>
        <p style={{ color: '#8C7B6E' }}>Surprise a friend by turning their story into a tribute.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
      <h2 style={{ fontFamily: "'Playfair Display',serif", marginBottom: 18 }}>🎁 Gifts I've Sent</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {gifts.map(g => (
          <div key={g.id} style={{ background: 'white', border: '1px solid #F0EAE4', borderRadius: 14, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A0800' }}>{g.category_emoji} {g.category_label} — {g.recipient_name}</div>
              <div style={{ fontSize: 12, color: '#8C7B6E', marginTop: 2 }}>{g.story_title} · {g.gift_type_label}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLORS[g.status], marginTop: 4 }}>{STATUS_LABELS[g.status] || g.status}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {g.status === 'ready' && (
                <>
                  <a href={getGiftDownloadUrl(g.id, 'png')} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>Download</a>
                  <Link to={`/tribute/${g.tribute_slug}`} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>View Tribute</Link>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
