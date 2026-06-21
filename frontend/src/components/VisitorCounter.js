import React from 'react'
import { useVisitorCount } from '../contexts/VisitorCountContext'

/* ── Colorful, inline page-visit counter — sits right before the
   "+ Share Story" button in TopBar. The actual count + increment lives
   in VisitorCountContext (mounted once at the app root), so this is
   purely a display. ── */
export default function VisitorCounter() {
  const count = useVisitorCount()
  if (count == null) return null

  return (
    <div className="visitor-counter" style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'linear-gradient(90deg,#FF6B2B,#FF3DAA,#7C3AED)',
      backgroundSize: '200% 100%',
      color: '#fff', borderRadius: 100, padding: '7px 14px',
      fontFamily: "'DM Sans',sans-serif", fontSize: 12.5, fontWeight: 800,
      letterSpacing: '.01em', whiteSpace: 'nowrap', flexShrink: 0,
      boxShadow: '0 3px 12px rgba(124,58,237,.35)',
      animation: 'visitorGradientShift 4s ease infinite',
    }}>
      <span style={{ fontSize: 14 }} role="img" aria-label="fire">🔥</span>
      {count.toLocaleString()}
      <span className="visitor-counter-label" style={{ opacity: .85, fontWeight: 600 }}>vibing rn</span>
      <style>{`
        @keyframes visitorGradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @media (max-width: 480px) {
          .visitor-counter { padding: 6px 10px !important; font-size: 11.5px !important; gap: 4px !important; }
          .visitor-counter-label { display: none !important; }
        }
      `}</style>
    </div>
  )
}
