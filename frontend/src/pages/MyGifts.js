import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getMyGifts, getReceivedGifts, getMyGiftPayments, getGiftDownloadUrl, getGiftTracking } from '../lib/api'
import GiftTrackingTimeline from '../components/GiftTrackingTimeline'

const STATUS_LABELS = {
  pending_payment: 'Ordered', processing: 'Creating Your Gift…', ready: 'Ready', failed: 'Failed',
  shipped: 'Shipped', in_transit: 'In Transit', out_for_delivery: 'Out For Delivery',
  delivered: 'Delivered', delivery_failed: 'Delivery Failed', returned: 'Returned', cancelled: 'Cancelled',
}
const STATUS_COLORS = {
  pending_payment: '#F59E0B', processing: '#2563EB', ready: '#059669', failed: '#DC2626',
  shipped: '#2563EB', in_transit: '#2563EB', out_for_delivery: '#2563EB',
  delivered: '#059669', delivery_failed: '#DC2626', returned: '#DC2626', cancelled: '#DC2626',
}
const TRACKABLE_STATUSES = ['shipped', 'in_transit', 'out_for_delivery', 'delivered', 'delivery_failed', 'returned']

const SUB_TABS = [['sent', 'Sent'], ['received', 'Received'], ['payments', 'Payments & History']]

export default function MyGifts() {
  const [tab, setTab] = useState('sent')

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
      <h2 style={{ fontFamily: "'Playfair Display',serif", marginBottom: 14 }}>🎁 Gifts</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid #F0EAE4' }}>
        {SUB_TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            color: tab === k ? '#FF6B2B' : '#8C7B6E', borderBottom: tab === k ? '2px solid #FF6B2B' : '2px solid transparent', marginBottom: -2,
          }}>{l}</button>
        ))}
      </div>
      {tab === 'sent' && <SentGiftsList />}
      {tab === 'received' && <ReceivedGiftsList />}
      {tab === 'payments' && <PaymentsList />}
    </div>
  )
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="empty-state" style={{ textAlign: 'center', padding: '60px 16px' }}>
      <div style={{ fontSize: 40 }}>{icon}</div>
      <h3>{title}</h3>
      <p style={{ color: '#8C7B6E' }}>{subtitle}</p>
    </div>
  )
}

function SentGiftsList() {
  const [gifts, setGifts] = useState(null)
  const [trackingId, setTrackingId] = useState(null)
  const load = useCallback(() => { getMyGifts().then(({ data }) => setGifts(data || [])) }, [])
  useEffect(() => { load() }, [load])

  if (gifts === null) return <div className="loading-center"><div className="spinner" /></div>
  if (gifts.length === 0) return <EmptyState icon="🎁" title="No gifts sent yet" subtitle="Surprise a friend by turning their story into a tribute." />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {gifts.map(g => (
        <div key={g.id} style={{ background: 'white', border: '1px solid #F0EAE4', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A0800' }}>{g.category_emoji} {g.category_label} — {g.recipient_name}</div>
              <div style={{ fontSize: 12, color: '#8C7B6E', marginTop: 2 }}>
                {g.story_title} · {g.gift_type_label}{g.is_physical && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#D4AF37' }}>📦 PHYSICAL</span>}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: g.payment_status === 'refunded' ? '#DC2626' : STATUS_COLORS[g.status], marginTop: 4 }}>
                {g.payment_status === 'refunded' ? 'Cancelled (Refunded)' : (STATUS_LABELS[g.status] || g.status)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {g.status === 'ready' && !g.is_physical && (
                <a href={getGiftDownloadUrl(g.id, 'png')} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>Download</a>
              )}
              {(g.status === 'ready' || TRACKABLE_STATUSES.includes(g.status)) && (
                <Link to={`/tribute/${g.tribute_slug}`} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>View Tribute</Link>
              )}
              {g.is_physical && (
                <button className="btn btn-secondary btn-sm" onClick={() => setTrackingId(trackingId === g.id ? null : g.id)}>
                  {trackingId === g.id ? 'Hide Tracking' : 'Track'}
                </button>
              )}
            </div>
          </div>
          {trackingId === g.id && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0EAE4' }}>
              <GiftTrackingTimeline orderId={g.id} fetcher={getGiftTracking} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ReceivedGiftsList() {
  const [gifts, setGifts] = useState(null)
  const [trackingId, setTrackingId] = useState(null)
  useEffect(() => { getReceivedGifts().then(({ data }) => setGifts(data || [])) }, [])

  if (gifts === null) return <div className="loading-center"><div className="spinner" /></div>
  if (gifts.length === 0) return <EmptyState icon="💌" title="No gifts received yet" subtitle="When a friend surprises you, it'll show up here." />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {gifts.map(g => (
        <div key={g.id} style={{ background: 'white', border: '1px solid #F0EAE4', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A0800' }}>{g.category_emoji} {g.category_label} from {g.sender_name}</div>
              <div style={{ fontSize: 12, color: '#8C7B6E', marginTop: 2 }}>
                {g.story_title} · {g.gift_type_label}{g.is_physical && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#D4AF37' }}>📦 PHYSICAL</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {(g.status === 'ready' || TRACKABLE_STATUSES.includes(g.status)) && (
                <Link to={`/tribute/${g.tribute_slug}`} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>View Tribute</Link>
              )}
              {g.is_physical && (
                <button className="btn btn-secondary btn-sm" onClick={() => setTrackingId(trackingId === g.id ? null : g.id)}>
                  {trackingId === g.id ? 'Hide Tracking' : 'Track'}
                </button>
              )}
            </div>
          </div>
          {trackingId === g.id && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0EAE4' }}>
              <GiftTrackingTimeline orderId={g.id} fetcher={getGiftTracking} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function PaymentsList() {
  const [payments, setPayments] = useState(null)
  useEffect(() => { getMyGiftPayments().then(({ data }) => setPayments(data || [])) }, [])

  if (payments === null) return <div className="loading-center"><div className="spinner" /></div>
  if (payments.length === 0) return <EmptyState icon="🧾" title="No payment history yet" subtitle="Payments for gifts you've sent will show up here." />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {payments.map(p => (
        <div key={p.id} style={{ background: 'white', border: '1px solid #F0EAE4', borderRadius: 12, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A0800' }}>{p.gift_type_label} — for {p.recipient_name}</div>
            <div style={{ fontSize: 11.5, color: '#8C7B6E', marginTop: 2 }}>
              {p.method === 'coins' ? `${p.coins_spent?.toLocaleString()} coins` : `₹${Number(p.amount).toFixed(0)} via ${p.method}`}
              {' · '}{new Date(p.created_at).toLocaleDateString('en-IN')}
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: p.status === 'verified' ? '#059669' : p.status === 'refunded' ? '#DC2626' : '#F59E0B', flexShrink: 0 }}>
            {p.status}
          </div>
        </div>
      ))}
    </div>
  )
}
