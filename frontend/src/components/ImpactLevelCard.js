import React from 'react'

const ICONS = {
  'Emerging Contributor': '🌱',
  'Career Guide': '🧭',
  'Future Inspirer': '✨',
  'Community Mentor': '🏆',
}

export default function ImpactLevelCard({ level }) {
  if (!level) return null
  return (
    <div style={{
      background: '#0F172A', color: 'white', borderRadius: 16,
      padding: 18, textAlign: 'center',
    }}>
      <div style={{ fontSize: 30 }}>{ICONS[level] || '🌟'}</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, marginTop: 4 }}>
        {level}
      </div>
      <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>Impact Level</div>
    </div>
  )
}
