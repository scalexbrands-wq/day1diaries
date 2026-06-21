import React, { useState, useEffect, useRef } from 'react'
import { getActiveAds, logAdImpression, logAdClick } from '../lib/api'

/* ── Admin-managed ad slot (image or video creative) — fetches one active
   campaign for the given placement, logs an impression once it renders,
   and logs + follows the click-through link on click.
   variant="card"   — inline in the Discover feed, sized like a StoryCard
   variant="banner" — below the story content on Story Detail ── */
export default function AdSlot({ placement, storyId, variant = 'card' }) {
  const [ad, setAd] = useState(null)
  const loggedImpression = useRef(false)

  useEffect(() => {
    let cancelled = false
    getActiveAds(placement).then(({ data }) => {
      if (cancelled || !data?.length) return
      setAd(data[Math.floor(Math.random() * data.length)])
    })
    return () => { cancelled = true }
  }, [placement])

  useEffect(() => {
    if (ad && !loggedImpression.current) {
      loggedImpression.current = true
      logAdImpression(ad.id, placement, storyId)
    }
  }, [ad, placement, storyId])

  if (!ad) return null

  const handleClick = async () => {
    const { data: clickUrl } = await logAdClick(ad.id, placement, storyId)
    if (clickUrl) window.open(clickUrl, '_blank', 'noopener,noreferrer')
  }

  const media = ad.ad_type === 'video' ? (
    <video src={ad.creative_url} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  ) : (
    <img src={ad.creative_url} alt={ad.advertiser_name || 'Sponsored'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}  loading="lazy" />
  )

  if (variant === 'banner') {
    return (
      <div className="ad-slot-banner" onClick={handleClick} style={{
        position: 'relative', borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        marginBottom: 16, border: '1px solid #F0EAE4', background: '#fff', maxHeight: 320,
      }}>
        <span style={adTagStyle}>Sponsored</span>
        <div style={{ width: '100%', height: 220 }}>{media}</div>
        {ad.advertiser_name && (
          <div style={{ padding: '10px 16px', fontSize: 12, color: '#8C7B6E', fontWeight: 600 }}>{ad.advertiser_name}</div>
        )}
      </div>
    )
  }

  // "card" variant — slots inline among StoryCards in the Discover feed
  return (
    <div className="story-card ad-slot-card" onClick={handleClick} style={{ padding: 0, overflow: 'hidden', position: 'relative', cursor: 'pointer' }}>
      <span style={adTagStyle}>Sponsored</span>
      <div style={{ width: '100%', height: 180 }}>{media}</div>
      {ad.advertiser_name && (
        <div style={{ padding: '12px 16px', fontSize: 12.5, fontWeight: 700, color: '#1A0800' }}>{ad.advertiser_name}</div>
      )}
    </div>
  )
}

export const adTagStyle = {
  position: 'absolute', top: 10, left: 10, zIndex: 2,
  background: 'rgba(26,8,0,.72)', color: '#fff', fontSize: 10.5, fontWeight: 700,
  letterSpacing: '.04em', textTransform: 'uppercase', borderRadius: 100, padding: '4px 10px',
}
