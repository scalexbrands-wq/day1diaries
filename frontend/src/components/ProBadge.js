import React from 'react'

export default function ProBadge({ profile, size = 'sm' }) {
  if (!profile?.is_pro) return null
  const label = profile.pro_badge_label || '👑 PRO'
  const sizes = {
    xs: { fontSize: 9,  padding: '1px 6px',  borderRadius: 100 },
    sm: { fontSize: 10, padding: '2px 8px',  borderRadius: 100 },
    md: { fontSize: 12, padding: '3px 10px', borderRadius: 100 },
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: 'linear-gradient(135deg,#FF6B2B,#FFD166)',
      color: 'white', fontWeight: 700, letterSpacing: '.03em',
      flexShrink: 0, whiteSpace: 'nowrap',
      ...sizes[size]
    }}>
      {label}
    </span>
  )
}
