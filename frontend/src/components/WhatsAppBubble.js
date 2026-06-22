import React from 'react'

// TODO: replace with the real WhatsApp community invite link.
const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/REPLACE_WITH_REAL_INVITE_LINK'

export default function WhatsAppBubble() {
  return (
    <button
      onClick={() => window.open(WHATSAPP_COMMUNITY_URL, '_blank', 'noopener,noreferrer')}
      title="Join our WhatsApp community"
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 998,
        width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: '#25D366', color: 'white', fontSize: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(37,211,102,.45)', transition: 'transform .2s, box-shadow .2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(37,211,102,.55)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,211,102,.45)' }}
    >
      💬
    </button>
  )
}
