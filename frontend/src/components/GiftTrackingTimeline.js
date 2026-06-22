import React, { useEffect, useState } from 'react'

// Renders the unified payment + shipping timeline for a physical gift
// order. Shared by MyGifts.js (sender + recipient views) and
// AdminDashboard.js so the render logic — and the meaning of "one
// place to see all tracking" — isn't duplicated.
export default function GiftTrackingTimeline({ timeline, fetcher, orderId }) {
  const [items, setItems] = useState(timeline || null)

  useEffect(() => {
    if (timeline) { setItems(timeline); return }
    if (!fetcher || !orderId) return
    fetcher(orderId).then(({ data }) => setItems(data?.timeline || []))
  }, [timeline, fetcher, orderId])

  if (items === null) return <div style={{ fontSize: 12, color: '#8C7B6E', padding: '8px 0' }}>Loading tracking…</div>
  if (!items.length) return <div style={{ fontSize: 12, color: '#8C7B6E', padding: '8px 0' }}>No tracking updates yet.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '6px 0' }}>
      {items.map((ev, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: i === items.length - 1 ? 0 : 14, position: 'relative' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: i === items.length - 1 ? '#FF6B2B' : '#D4AF37', flexShrink: 0 }} />
            {i !== items.length - 1 && <div style={{ width: 2, flex: 1, background: '#F0EAE4', marginTop: 2 }} />}
          </div>
          <div style={{ paddingBottom: 2 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1A0800' }}>{ev.label || ev.status}</div>
            {(ev.detail || ev.location) && (
              <div style={{ fontSize: 11, color: '#8C7B6E', marginTop: 1 }}>{[ev.detail, ev.location].filter(Boolean).join(' · ')}</div>
            )}
            <div style={{ fontSize: 10.5, color: '#B0A398', marginTop: 1 }}>{new Date(ev.occurred_at).toLocaleString('en-IN')}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
