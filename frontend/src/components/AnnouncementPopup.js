import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getActiveAnnouncements, dismissAnnouncement } from '../lib/api'

export default function AnnouncementPopup() {
  const { user } = useAuth()
  const [queue, setQueue] = useState([])
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  useEffect(() => {
    if (!user) return
    getActiveAnnouncements().then(({ data }) => {
      if (data?.length) {
        setQueue(data)
        setIdx(0)
        setVisible(true)
      }
    })
  }, [user])

  if (!visible || !queue.length) return null

  const ann = queue[idx]
  const total = queue.length
  const isLast = idx === total - 1
  const bg = ann.bg_color || '#FF6B2B'

  const handleDismiss = async () => {
    setDismissing(true)
    await dismissAnnouncement(ann.id)
    if (isLast) {
      setVisible(false)
    } else {
      setIdx(i => i + 1)
    }
    setDismissing(false)
  }

  const handleDismissAll = async () => {
    setDismissing(true)
    await Promise.all(queue.map(a => dismissAnnouncement(a.id)))
    setVisible(false)
    setDismissing(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(26,8,0,.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      animation: 'fadeInBg .25s ease',
    }}>
      <style>{`
        @keyframes fadeInBg { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(32px) scale(.97)} to{opacity:1;transform:none} }
      `}</style>

      <div style={{
        background: 'white',
        borderRadius: 24,
        width: '100%',
        maxWidth: 440,
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(26,8,0,.25)',
        animation: 'slideUp .3s cubic-bezier(.22,.68,0,1.2)',
      }}>
        {/* Coloured header band */}
        <div style={{
          background: `linear-gradient(135deg, ${bg}, ${bg}cc)`,
          padding: '28px 28px 20px',
          textAlign: 'center',
          position: 'relative',
        }}>
          <div style={{ fontSize: 48, marginBottom: 10, lineHeight: 1 }}>
            {ann.emoji || '📢'}
          </div>
          <h2 style={{
            margin: 0, color: 'white',
            fontFamily: "'Playfair Display',serif",
            fontSize: 'clamp(1.1rem,3vw,1.4rem)',
            fontWeight: 800, lineHeight: 1.3,
          }}>
            {ann.title}
          </h2>

          {/* Pagination dots */}
          {total > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
              {queue.map((_, i) => (
                <div key={i} style={{
                  width: i === idx ? 18 : 6, height: 6,
                  borderRadius: 100,
                  background: i === idx ? 'white' : 'rgba(255,255,255,.45)',
                  transition: 'all .25s',
                }} />
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '20px 28px 28px' }}>
          <p style={{
            margin: '0 0 24px', fontSize: 14.5, lineHeight: 1.7,
            color: '#4A2800', textAlign: 'center',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {ann.message}
          </p>

          <button
            onClick={handleDismiss}
            disabled={dismissing}
            style={{
              width: '100%', padding: '13px 24px',
              background: bg, color: 'white',
              border: 'none', borderRadius: 100,
              fontSize: 14, fontWeight: 700,
              cursor: dismissing ? 'not-allowed' : 'pointer',
              opacity: dismissing ? .7 : 1,
              fontFamily: 'inherit',
              marginBottom: total > 1 ? 10 : 0,
              transition: 'opacity .2s',
            }}
          >
            {dismissing ? '…' : isLast ? 'Got it! 👍' : `Next (${idx + 1}/${total})`}
          </button>

          {total > 1 && !isLast && (
            <button
              onClick={handleDismissAll}
              disabled={dismissing}
              style={{
                width: '100%', padding: '10px 24px',
                background: 'transparent', color: '#8C7B6E',
                border: '1.5px solid #E8DDD7', borderRadius: 100,
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Dismiss all
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
