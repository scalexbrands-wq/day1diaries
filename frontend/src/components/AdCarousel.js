import React, { useState, useEffect, useRef } from 'react'
import { getActiveAds, logAdImpression, logAdClick } from '../lib/api'
import { adTagStyle } from './AdSlot'

/* ── Auto-rotating ad slideshow — multiple active campaigns for the given
   placement, cycling every `intervalMs`. Used in My Feed's sidebar, above
   "People to Follow". Logs an impression the first time each ad is shown,
   and a click (+ follows the link) on click. ── */
export default function AdCarousel({ placement, intervalMs = 5000 }) {
  const [ads, setAds] = useState([])
  const [index, setIndex] = useState(0)
  const loggedFor = useRef(new Set())

  useEffect(() => {
    let cancelled = false
    getActiveAds(placement).then(({ data }) => { if (!cancelled) setAds(data || []) })
    return () => { cancelled = true }
  }, [placement])

  useEffect(() => {
    if (ads.length < 2) return
    const timer = setInterval(() => setIndex(i => (i + 1) % ads.length), intervalMs)
    return () => clearInterval(timer)
  }, [ads, intervalMs])

  const current = ads[index]

  useEffect(() => {
    if (current && !loggedFor.current.has(current.id)) {
      loggedFor.current.add(current.id)
      logAdImpression(current.id, placement)
    }
  }, [current, placement])

  if (!current) return null

  const handleClick = async () => {
    const { data: clickUrl } = await logAdClick(current.id, placement)
    if (clickUrl) window.open(clickUrl, '_blank', 'noopener,noreferrer')
  }

  const media = current.ad_type === 'video' ? (
    <video src={current.creative_url} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  ) : (
    <img src={current.creative_url} alt={current.advertiser_name || 'Sponsored'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  )

  return (
    <div className="ad-carousel" onClick={handleClick} style={{ borderRadius: 16, overflow: 'hidden', cursor: 'pointer', marginBottom: 14, border: '1px solid #F0EAE4', background: '#fff' }}>
      <div style={{ position: 'relative', width: '100%', height: 150 }}>
        <span style={adTagStyle}>Sponsored</span>
        {media}
        {ads.length > 1 && (
          <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
            {ads.map((_, i) => (
              <span key={i} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i === index ? '#fff' : 'rgba(255,255,255,.45)', boxShadow: '0 0 0 1px rgba(0,0,0,.2)',
              }} />
            ))}
          </div>
        )}
      </div>
      {current.advertiser_name && (
        <div style={{ padding: '8px 14px', fontSize: 11.5, color: '#8C7B6E', fontWeight: 600 }}>{current.advertiser_name}</div>
      )}
    </div>
  )
}
