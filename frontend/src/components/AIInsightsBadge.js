import React from 'react'

const PALETTE = ['#FF6B35', '#0F172A', '#D4AF37']

export default function AIInsightsBadge({ tags = [] }) {
  if (!tags.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {tags.map((tag, i) => {
        const color = PALETTE[i % PALETTE.length]
        return (
          <span
            key={tag}
            style={{
              display: 'inline-flex', alignItems: 'center', padding: '6px 14px',
              borderRadius: 100, fontSize: 12.5, fontWeight: 600,
              background: `${color}1A`, color, border: `1px solid ${color}40`,
            }}
          >
            {tag}
          </span>
        )
      })}
    </div>
  )
}
