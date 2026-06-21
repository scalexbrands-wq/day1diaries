import React from 'react'

// Same audience-targeting model as the gift/marketing modules' "who can
// see this" picker — Everyone vs a restricted set of membership tiers,
// roles, or a hand-picked custom username list — just applied per-group
// instead of as one global app_settings row.
const AUDIENCE_LABELS = {
  member: ['💳', 'Paid Members', 'Anyone with an active membership'],
  free: ['🆓', 'Non-Paid (Free)', "Users without an active membership"],
  contributor: ['✍️', 'Contributors', 'Users with the contributor role'],
  admin: ['🛡️', 'Admins', 'Site admins'],
  custom: ['👤', 'Custom Users', 'Hand-picked usernames'],
}

export default function GroupAudiencePicker({ value, onChange }) {
  const audiences = value.allowed_audiences
  const customUsernames = value.custom_usernames
  const restricted = !audiences.includes('everyone')

  const setEveryone = () => onChange({ ...value, allowed_audiences: ['everyone'] })
  const setRestricted = () => onChange({ ...value, allowed_audiences: audiences.includes('everyone') ? [] : audiences })

  const toggleAudience = (key) => {
    const next = audiences.includes(key) ? audiences.filter(a => a !== key) : [...audiences.filter(a => a !== 'everyone'), key]
    onChange({ ...value, allowed_audiences: next })
  }

  return (
    <div className="form-group">
      <label className="form-label">Who can see &amp; join this group?</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: restricted ? 10 : 0 }}>
        <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '9px 12px', border: `1.5px solid ${!restricted ? '#FF6B2B' : '#DDD3CA'}`, borderRadius: 10, cursor: 'pointer', background: !restricted ? 'rgba(255,107,43,.06)' : 'white' }}>
          <input type="radio" checked={!restricted} onChange={setEveryone} style={{ display: 'none' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: !restricted ? '#FF6B2B' : '#1A0800' }}>🌍 Everyone</span>
          <span style={{ fontSize: 10, color: '#8C7B6E' }}>Anyone can find, view, and join instantly</span>
        </label>
        <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '9px 12px', border: `1.5px solid ${restricted ? '#FF6B2B' : '#DDD3CA'}`, borderRadius: 10, cursor: 'pointer', background: restricted ? 'rgba(255,107,43,.06)' : 'white' }}>
          <input type="radio" checked={restricted} onChange={setRestricted} style={{ display: 'none' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: restricted ? '#FF6B2B' : '#1A0800' }}>🔒 Restricted</span>
          <span style={{ fontSize: 10, color: '#8C7B6E' }}>Only specific audiences can see &amp; join</span>
        </label>
      </div>

      {restricted && (
        <div style={{ border: '1.5px solid #DDD3CA', borderRadius: 10, padding: 12 }}>
          {Object.entries(AUDIENCE_LABELS).map(([key, [emoji, label, desc]]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', cursor: 'pointer' }}>
              <input type="checkbox" checked={audiences.includes(key)} onChange={() => toggleAudience(key)} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1A0800' }}>{emoji} {label}</div>
                <div style={{ fontSize: 10.5, color: '#8C7B6E' }}>{desc}</div>
              </div>
            </label>
          ))}

          {audiences.includes('custom') && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F0EAE4' }}>
              <label className="form-label" style={{ fontSize: 11 }}>Usernames (comma-separated)</label>
              <input
                className="form-control"
                placeholder="priya, rahul_kumar, alok99"
                value={customUsernames}
                onChange={e => onChange({ ...value, custom_usernames: e.target.value })}
              />
            </div>
          )}

          {audiences.length === 0 && (
            <div style={{ fontSize: 11, color: '#DC2626', marginTop: 6 }}>Pick at least one audience, or switch back to Everyone.</div>
          )}
        </div>
      )}
    </div>
  )
}
