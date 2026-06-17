import React, { useState, useRef, useEffect } from 'react'
import { toast } from './Toast'

const APP_URL = 'https://d1kxji3yv78nbx.cloudfront.net'
const APP_NAME = 'Day1 Diaries'
const APP_TAGLINE = "India's community where freshers share their real Day 1 stories 🚀"

export function storyShareText(title, storyId) {
  return `📖 "${title}"\n\nRead this story on ${APP_NAME} — ${APP_TAGLINE}\n${APP_URL}/story/${storyId}`
}

export function profileShareText(name, username, bio) {
  const bioLine = bio ? `\n"${bio}"` : ''
  return `✨ Check out ${name}'s journey on ${APP_NAME}!${bioLine}\n\nJoin 10,000+ freshers sharing their real professional stories.\n${APP_URL}/profile/${username}`
}

const PLATFORMS = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    color: '#25D366',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
      </svg>
    ),
    getUrl: (text) => `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
  {
    key: 'twitter',
    label: 'X (Twitter)',
    color: '#000000',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    getUrl: (text, url) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    color: '#0A66C2',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    getUrl: (text, url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    getUrl: (text, url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
  },
]

export default function ShareButton({ text, url, label = 'Share', size = 'sm' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const shareUrl = url || APP_URL
  const shareText = text || APP_TAGLINE

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: APP_NAME, text: shareText, url: shareUrl }).catch(() => {})
      setOpen(false)
      return
    }
    setOpen(v => !v)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
      toast.success('Copied to clipboard!')
      setOpen(false)
    }).catch(() => {
      toast.error('Could not copy')
    })
  }

  const btnStyle = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: size === 'sm' ? '6px 12px' : '9px 18px',
    borderRadius: 100,
    background: 'transparent',
    border: '1px solid rgba(26,8,0,.08)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: size === 'sm' ? 13.5 : 14,
    color: '#4A2800',
    fontWeight: 600,
    transition: 'all .15s',
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        style={btnStyle}
        onClick={handleNativeShare}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,43,.06)'; e.currentTarget.style.borderColor = 'rgba(255,107,43,.3)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(26,8,0,.08)' }}
      >
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
        </svg>
        {label}
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
          background: 'white', borderRadius: 16, boxShadow: '0 8px 32px rgba(26,8,0,.15)',
          border: '1px solid #F0EAE4', padding: '12px', zIndex: 200,
          minWidth: 220, animation: 'shareIn .15s ease',
        }}>
          <style>{`@keyframes shareIn { from{opacity:0;transform:translateX(-50%) translateY(6px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }`}</style>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8C7B6E', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10, paddingLeft: 4 }}>
            Share on
          </div>
          {PLATFORMS.map(p => (
            <a
              key={p.key}
              href={p.getUrl(shareText, shareUrl)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderRadius: 10, color: p.color, textDecoration: 'none', fontWeight: 600,
                fontSize: 13, transition: 'background .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${p.color}12`}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {p.icon}
              {p.label}
            </a>
          ))}
          <div style={{ height: 1, background: '#F0EAE4', margin: '8px 0' }}/>
          <button
            onClick={copyLink}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              borderRadius: 10, color: '#4A2800', background: 'transparent', border: 'none',
              cursor: 'pointer', fontWeight: 600, fontSize: 13, width: '100%', transition: 'background .15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,8,0,.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy Link
          </button>
        </div>
      )}
    </div>
  )
}
