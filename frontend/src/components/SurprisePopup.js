import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { getActiveSurprise, claimSurprise } from '../lib/api'
import { toast } from './Toast'

export default function SurprisePopup({ isOpen, onClose }) {
  const [surprise, setSurprise] = useState(undefined)
  const [claiming, setClaiming] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!isOpen) return
    setSurprise(undefined)
    setResult(null)
    getActiveSurprise().then(({ data }) => setSurprise(data))
  }, [isOpen])

  if (!isOpen) return null

  const handleClaim = async () => {
    setClaiming(true)
    const { data, error } = await claimSurprise(surprise.id)
    setClaiming(false)
    if (error) { toast.error(error.message); return }
    setResult(data)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(result?.couponCode || '')
    toast.success('Coupon code copied!')
  }

  // Rendered via portal straight onto document.body — TopBar (the
  // natural parent for this popup) has backdrop-filter on it, which
  // creates a new CSS containing block, so a plain position:fixed
  // child would center inside the 60px-tall topbar instead of the
  // viewport. The portal escapes that regardless of where it's mounted.
  return createPortal((
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(26,8,0,.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, animation: 'fadeInBg .25s ease',
    }}>
      <style>{`
        @keyframes fadeInBg { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(32px) scale(.97)} to{opacity:1;transform:none} }
      `}</style>

      <div style={{
        background: 'white', borderRadius: 24, width: '100%', maxWidth: 440, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(26,8,0,.25)', animation: 'slideUp .3s cubic-bezier(.22,.68,0,1.2)',
      }}>
        <div style={{
          background: surprise?.image_url ? `url(${surprise.image_url}) center/cover` : 'linear-gradient(135deg,#FF6B2B,#FF6B2Bcc)',
          padding: '28px 28px 20px', textAlign: 'center', position: 'relative', minHeight: surprise?.image_url ? 160 : undefined,
        }}>
          {surprise?.image_url && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.55) 100%)' }} />}
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 48, marginBottom: 10, lineHeight: 1 }}>🎁</div>
            <h2 style={{ margin: 0, color: 'white', fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.1rem,3vw,1.4rem)', fontWeight: 800, lineHeight: 1.3 }}>
              {surprise === undefined ? 'Loading…' : surprise === null ? 'No surprise today' : surprise.title}
            </h2>
          </div>
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,.2)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: '50%', width: 28, height: 28, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ padding: '20px 28px 28px' }}>
          {surprise === null && (
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#8C7B6E', textAlign: 'center' }}>Check back soon — the team is cooking up something for you!</p>
          )}

          {surprise && (
            <>
              {surprise.description && (
                <p style={{ margin: '0 0 16px', fontSize: 14.5, lineHeight: 1.7, color: '#4A2800', textAlign: 'center', whiteSpace: 'pre-wrap' }}>{surprise.description}</p>
              )}
              {surprise.link_url && (
                <a href={surprise.link_url} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', fontSize: 12.5, color: '#FF6B2B', fontWeight: 600, marginBottom: 16 }}>Learn more →</a>
              )}

              {result ? (
                <div style={{ textAlign: 'center' }}>
                  {result.rewardType === 'coins' ? (
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#059669', marginBottom: 4 }}>🪙 {result.coins} coins added to your wallet!</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, color: '#8C7B6E', marginBottom: 8 }}>Your coupon code:</div>
                      <div onClick={copyCode} style={{ cursor: 'pointer', display: 'inline-block', padding: '10px 20px', borderRadius: 10, border: '1.5px dashed #FF6B2B', fontWeight: 800, fontSize: 16, letterSpacing: 1, color: '#FF6B2B', marginBottom: 6 }}>
                        {result.couponCode || '—'}
                      </div>
                      <div style={{ fontSize: 11, color: '#8C7B6E' }}>Tap to copy · use it while gifting someone</div>
                    </>
                  )}
                </div>
              ) : surprise.claimed ? (
                <div style={{ textAlign: 'center', fontSize: 13.5, color: '#8C7B6E', fontWeight: 600 }}>✓ Already claimed — check back when a new surprise drops!</div>
              ) : (
                <button onClick={handleClaim} disabled={claiming} style={{
                  width: '100%', padding: '13px 24px', background: '#FF6B2B', color: 'white',
                  border: 'none', borderRadius: 100, fontSize: 14, fontWeight: 700,
                  cursor: claiming ? 'not-allowed' : 'pointer', opacity: claiming ? .7 : 1, fontFamily: 'inherit',
                }}>
                  {claiming ? 'Claiming…' : 'Claim Now 🎉'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  ), document.body)
}
