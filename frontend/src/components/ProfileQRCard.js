import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { getInitials, getAvatarColor } from './Sidebar'
import { toast } from './Toast'
import ShareButton, { profileShareText } from './ShareButton'

const APP_URL = 'https://d1kxji3yv78nbx.cloudfront.net'

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawInitialsAvatar(ctx, cx, cy, size, color, label) {
  ctx.beginPath()
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `700 ${size * 0.36}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, cx, cy + 2)
  ctx.textBaseline = 'alphabetic'
}

/* ── Profile QR share card — preview modal + downloadable PNG ── */
export default function ProfileQRCard({ profile }) {
  const [open, setOpen] = useState(false)
  const qrWrapRef = useRef(null)
  const profileUrl = `${APP_URL}/profile/${profile.username}`
  const avatarColor = getAvatarColor(profile.full_name || profile.username || '')
  const initials = getInitials(profile.full_name || profile.username || '?')

  const handleDownload = async () => {
    const qrCanvas = qrWrapRef.current?.querySelector('canvas')
    if (!qrCanvas) return

    const W = 480, H = 700, pad = 24
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')

    const bgGrad = ctx.createLinearGradient(0, 0, W, H)
    bgGrad.addColorStop(0, '#FF6B2B')
    bgGrad.addColorStop(1, '#FFD166')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = '#FFFFFF'
    roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 28)
    ctx.fill()

    ctx.fillStyle = '#FF6B2B'
    ctx.font = '900 17px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText('Day1 Diaries', W / 2, 62)

    const cx = W / 2
    const avatarY = 130
    const avatarSize = 100
    if (profile.avatar_url) {
      try {
        const img = await loadImage(profile.avatar_url)
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, avatarY, avatarSize / 2, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(img, cx - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize)
        ctx.restore()
      } catch {
        drawInitialsAvatar(ctx, cx, avatarY, avatarSize, avatarColor, initials)
      }
    } else {
      drawInitialsAvatar(ctx, cx, avatarY, avatarSize, avatarColor, initials)
    }

    ctx.fillStyle = '#1A0800'
    ctx.font = '700 24px Georgia, serif'
    ctx.fillText(profile.full_name || profile.username, cx, avatarY + 80)

    ctx.fillStyle = '#8C7B6E'
    ctx.font = '500 15px Arial'
    ctx.fillText(`@${profile.username}`, cx, avatarY + 106)

    const statsY = avatarY + 150
    const stats = [
      [`${profile.stories_count || 0}`, 'Stories'],
      [`${profile.followers_count || 0}`, 'Followers'],
      [`${profile.likes_received || 0}`, 'Likes'],
    ]
    const colW = (W - pad * 2 - 60) / 3
    stats.forEach(([v, l], i) => {
      const x = pad + 30 + colW * i + colW / 2
      ctx.fillStyle = '#FF6B2B'
      ctx.font = '700 19px Georgia, serif'
      ctx.fillText(v, x, statsY)
      ctx.fillStyle = '#8C7B6E'
      ctx.font = '500 11px Arial'
      ctx.fillText(l, x, statsY + 18)
    })

    ctx.strokeStyle = '#F0EAE4'
    ctx.beginPath()
    ctx.moveTo(pad + 40, statsY + 38)
    ctx.lineTo(W - pad - 40, statsY + 38)
    ctx.stroke()

    const qrSize = 200
    const qrY = statsY + 58
    ctx.fillStyle = '#FFFFFF'
    roundRect(ctx, cx - qrSize / 2 - 10, qrY - 10, qrSize + 20, qrSize + 20, 16)
    ctx.fill()
    ctx.drawImage(qrCanvas, cx - qrSize / 2, qrY, qrSize, qrSize)

    ctx.fillStyle = '#1A0800'
    ctx.font = '700 14px Arial'
    ctx.fillText('Scan to view my Day1 Diaries profile', cx, qrY + qrSize + 36)
    ctx.fillStyle = '#8C7B6E'
    ctx.font = '500 12px Arial'
    ctx.fillText("India's home for real Day 1 stories", cx, qrY + qrSize + 54)

    const dataUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `day1diaries-${profile.username}-qr.png`
    a.click()
    toast.success('QR card downloaded!')
  }

  return (
    <>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => setOpen(true)}
      >
        🔗 QR Code
      </button>

      {open && createPortal((
        // Portaled onto document.body — Profile's banner wrapper has a
        // persistent `transform: translateY(0)` (from its mount animation's
        // fill-mode:both), which creates a new containing block for
        // position:fixed descendants, so this would otherwise center inside
        // the banner box instead of the viewport (see SurprisePopup.js).
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: 320 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Share via QR</h3>
              <button className="close-btn" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
              <div ref={qrWrapRef} style={{ display: 'inline-block', padding: 10, background: 'white', borderRadius: 12, border: '1px solid #F0EAE4' }}>
                <QRCodeCanvas value={profileUrl} size={160} fgColor="#1A0800" level="H" />
              </div>
              <div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, color: '#1A0800' }}>
                  {profile.full_name || profile.username}
                </div>
                <div style={{ fontSize: 12, color: '#8C7B6E' }}>@{profile.username}</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <ShareButton
                  text={profileShareText(profile.full_name || profile.username, profile.username, profile.bio)}
                  url={profileUrl}
                  label="Share"
                  size="sm"
                />
                <button className="btn btn-secondary btn-sm" onClick={handleDownload}>⬇ Download</button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </>
  )
}
