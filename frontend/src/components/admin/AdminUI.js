import React from 'react'

// Shared visual primitives for the admin panel — used by AdminDashboard.js
// and AdminLandingContent.js so every tab/sub-tab inherits one consistent
// look from a single place instead of two drifting copies.
//
// `c`/`v` props are kept alongside `children`/`variant` so this is a
// drop-in replacement for both files' previous local definitions without
// touching call sites.

export const L = ({ c, children }) => (
  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5C3D2E', marginBottom: 6 }}>{c ?? children}</label>
)

export const Inp = ({ style, onFocus, onBlur, ...p }) => (
  <input
    {...p}
    style={{
      width: '100%', padding: '9px 13px', border: '1.5px solid #E5DDD2', borderRadius: 10,
      fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 12, transition: 'border-color .15s',
      ...style,
    }}
    onFocus={e => { e.target.style.borderColor = '#FF6B2B'; onFocus?.(e) }}
    onBlur={e => { e.target.style.borderColor = '#E5DDD2'; onBlur?.(e) }}
  />
)

export const TA = ({ style, onFocus, onBlur, ...p }) => (
  <textarea
    {...p}
    style={{
      width: '100%', padding: '9px 13px', border: '1.5px solid #E5DDD2', borderRadius: 10,
      fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: 72, marginBottom: 12, transition: 'border-color .15s',
      ...style,
    }}
    onFocus={e => { e.target.style.borderColor = '#FF6B2B'; onFocus?.(e) }}
    onBlur={e => { e.target.style.borderColor = '#E5DDD2'; onBlur?.(e) }}
  />
)

const BTN_VARIANTS = {
  primary:   { bg: '#FF6B2B',    co: '#fff', bd: '#FF6B2B' },
  secondary: { bg: 'transparent', co: '#FF6B2B', bd: '#FF6B2B' },
  danger:    { bg: 'transparent', co: '#DC2626', bd: '#DC2626' },
  green:     { bg: '#059669',    co: '#fff', bd: '#059669' },
}
export const Btn = ({ children, v, variant, style, onMouseEnter, onMouseLeave, ...p }) => {
  const m = BTN_VARIANTS[v || variant || 'primary']
  return (
    <button
      {...p}
      style={{
        padding: '8px 18px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'inherit', transition: 'transform .15s, box-shadow .15s',
        background: m.bg, color: m.co, border: `1.5px solid ${m.bd}`,
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${m.bd}33`; onMouseEnter?.(e) }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; onMouseLeave?.(e) }}
    >{children}</button>
  )
}

export const Card = ({ children, style, ...rest }) => (
  <div
    {...rest}
    style={{
      background: '#fff', border: '1px solid #F0EAE4', borderRadius: 18, padding: 20, marginBottom: 16,
      boxShadow: '0 1px 2px rgba(26,8,0,.04), 0 1px 8px rgba(26,8,0,.05)',
      ...style,
    }}
  >{children}</div>
)

export const SH = ({ c, children }) => (
  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A0800', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #F0EAE4' }}>{c ?? children}</div>
)

export const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,8,0,.55)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
    <div style={{ background: '#fff', borderRadius: 22, padding: 28, width: '100%', maxWidth: 540, margin: 'auto', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(26,8,0,.25)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#8C7B6E', lineHeight: 1 }}>×</button>
      </div>
      {children}
    </div>
  </div>
)

// Consolidates the ~5 hand-rolled KPI/stat-card grids that were
// duplicated (with slightly different markup) across Overview, Careers
// stats, Membership dashboard, and Gift analytics.
export const KpiCard = ({ icon, label, value, color = '#FF6B2B', sub }) => (
  <div style={{
    background: '#fff', border: '1px solid #F0EAE4', borderRadius: 16, padding: '16px 18px',
    boxShadow: '0 1px 2px rgba(26,8,0,.04), 0 1px 8px rgba(26,8,0,.05)', textAlign: 'left',
  }}>
    <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 800, color }}>{value ?? '—'}</div>
    <div style={{ fontSize: 12, fontWeight: 600, color: '#1A0800', marginTop: 2 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: '#8C7B6E', marginTop: 1 }}>{sub}</div>}
  </div>
)

// Purely presentational grouped sidebar nav — mirrors the main app
// Sidebar.js visual language (active = orange left-border + tint,
// uppercase grey section labels) so the admin panel feels like the same
// system. Permission/visibility logic stays in AdminDashboard; this just
// renders whatever `groups` it's given.
//
// groups: [{ key, label?, items: [{ key, icon, label, active, onClick }] }]
export function AdminSidebar({ groups, mobileOpen, onCloseMobile }) {
  const navItemStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: 9, padding: '9px 16px',
    fontSize: 13, fontWeight: 500, cursor: 'pointer', userSelect: 'none',
    color: active ? '#FF6B2B' : '#6B5347',
    background: active ? 'rgba(255,107,43,.07)' : 'transparent',
    borderRight: active ? '2.5px solid #FF6B2B' : '2.5px solid transparent',
    transition: 'background .15s, color .15s',
  })

  const content = (
    <nav style={{ padding: '10px 0' }}>
      {groups.map(g => (
        <div key={g.key}>
          {g.label && <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8C7B6E', padding: '14px 16px 6px' }}>{g.label}</div>}
          {g.items.map(item => (
            <div key={item.key} onClick={item.onClick} style={navItemStyle(item.active)}>
              <span style={{ fontSize: 15, width: 18, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
            </div>
          ))}
        </div>
      ))}
    </nav>
  )

  return (
    <>
      <aside className="admin-sidebar-desktop" style={{ width: 230, flexShrink: 0, background: '#fff', border: '1px solid #F0EAE4', borderRadius: 18, position: 'sticky', top: 16, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
        {content}
      </aside>
      {mobileOpen && (
        <div onClick={onCloseMobile} style={{ position: 'fixed', inset: 0, background: 'rgba(26,8,0,.4)', zIndex: 999 }}>
          <aside onClick={e => e.stopPropagation()} style={{ width: 'min(260px,82vw)', height: '100%', background: '#fff', boxShadow: '4px 0 24px rgba(26,8,0,.15)', overflowY: 'auto' }}>
            {content}
          </aside>
        </div>
      )}
    </>
  )
}
