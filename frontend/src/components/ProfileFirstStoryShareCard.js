import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getStories } from '../lib/api'
import { getAvatarColor, getInitials } from './Sidebar'
import { toast } from './Toast'
import ShareButton, { storyShareUrl, storyShareText } from './ShareButton'

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

function wrapText(ctx, text, maxWidth) {
  const words = (text || '').split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

// Combines the profile photo with the author's first story into one
// downloadable/shareable card — distinct from ProfileQRCard, which is
// purely a "scan to view my profile" QR card with no story content.
export default function ProfileFirstStoryShareCard({ profile }) {
  const [open, setOpen] = useState(false)
  const [firstStory, setFirstStory] = useState(null)
  const [loading, setLoading] = useState(false)
  const canvasPreviewRef = useRef(null)
  const avatarColor = getAvatarColor(profile.full_name || profile.username || '')
  const initials = getInitials(profile.full_name || profile.username || '?')

  useEffect(() => {
    if (!open || firstStory) return
    setLoading(true)
    getStories({ userId: profile.id, limit: 1, sort: 'oldest' }).then(({ data }) => {
      setFirstStory(data?.[0] || null)
      setLoading(false)
    })
  }, [open, firstStory, profile.id])

  const draw = async (canvas) => {
    const W = 480, H = 760, pad = 24
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
    ctx.fillText('Day1 Diaries', W / 2, 60)

    const cx = W / 2
    const avatarY = 118
    const avatarSize = 88
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
    ctx.font = '700 21px Georgia, serif'
    ctx.fillText(profile.full_name || profile.username, cx, avatarY + 70)
    ctx.fillStyle = '#8C7B6E'
    ctx.font = '500 14px Arial'
    ctx.fillText(`@${profile.username}`, cx, avatarY + 94)

    const panelY = avatarY + 120
    const panelH = 420
    ctx.fillStyle = '#FBF6F0'
    roundRect(ctx, pad + 24, panelY, W - pad * 2 - 48, panelH, 18)
    ctx.fill()

    ctx.fillStyle = '#FF6B2B'
    ctx.font = '800 11px Arial'
    ctx.textAlign = 'left'
    ctx.fillText('MY FIRST DAY 1 STORY', pad + 44, panelY + 32)

    if (firstStory?.cover_image_url) {
      try {
        const coverImg = await loadImage(firstStory.cover_image_url)
        const coverW = W - pad * 2 - 88, coverH = 180
        ctx.save()
        roundRect(ctx, pad + 44, panelY + 48, coverW, coverH, 12)
        ctx.clip()
        const scale = Math.max(coverW / coverImg.width, coverH / coverImg.height)
        const dw = coverImg.width * scale, dh = coverImg.height * scale
        ctx.drawImage(coverImg, pad + 44 - (dw - coverW) / 2, panelY + 48 - (dh - coverH) / 2, dw, dh)
        ctx.restore()
      } catch { /* skip cover if it fails to load */ }
    }

    ctx.fillStyle = '#1A0800'
    ctx.font = '700 19px Georgia, serif'
    ctx.textAlign = 'left'
    const titleY = firstStory?.cover_image_url ? panelY + 260 : panelY + 70
    const titleLines = wrapText(ctx, firstStory ? `"${firstStory.title}"` : 'No published story yet', W - pad * 2 - 88)
    titleLines.slice(0, 3).forEach((line, i) => ctx.fillText(line, pad + 44, titleY + i * 26))

    ctx.fillStyle = '#8C7B6E'
    ctx.font = '500 13px Arial'
    ctx.fillText('Tap to read the full story →', pad + 44, panelY + panelH - 20)

    ctx.fillStyle = '#1A0800'
    ctx.textAlign = 'center'
    ctx.font = '700 13px Arial'
    ctx.fillText("India's home for real Day 1 stories", cx, H - 36)
  }

  useEffect(() => {
    if (open && canvasPreviewRef.current && !loading) draw(canvasPreviewRef.current)
  }, [open, loading, firstStory])

  const handleDownload = () => {
    const canvas = canvasPreviewRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `day1diaries-${profile.username}-first-story.png`
    a.click()
    toast.success('Card downloaded!')
  }

  if (!profile?.id) return null

  return (
    <>
      <button className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}>
        📖 Share First Story
      </button>

      {open && createPortal((
        // Portaled onto document.body — Profile's banner wrapper has a
        // persistent `transform: translateY(0)` (from its mount animation's
        // fill-mode:both), which creates a new containing block for
        // position:fixed descendants, so this would otherwise center inside
        // the banner box instead of the viewport (see SurprisePopup.js).
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Share My First Story</h3>
              <button className="close-btn" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              {loading ? (
                <p style={{ color: '#8C7B6E', fontSize: 13 }}>Loading…</p>
              ) : !firstStory ? (
                <p style={{ color: '#8C7B6E', fontSize: 13, textAlign: 'center' }}>
                  {profile.full_name || profile.username} hasn't published a story yet.
                </p>
              ) : (
                <>
                  <canvas ref={canvasPreviewRef} style={{ width: '100%', maxWidth: 280, borderRadius: 16, border: '1px solid #F0EAE4' }} />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <ShareButton
                      text={storyShareText(firstStory.title, firstStory.id)}
                      url={storyShareUrl(firstStory.id)}
                      label="Share"
                      size="sm"
                    />
                    <button className="btn btn-secondary btn-sm" onClick={handleDownload}>⬇ Download</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ), document.body)}
    </>
  )
}
