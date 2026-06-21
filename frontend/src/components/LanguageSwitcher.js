import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'

export default function LanguageSwitcher({ dark = false }) {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0]

  const select = code => {
    i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        title={t('common.language')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          background: dark ? 'rgba(255,255,255,.08)' : 'rgba(26,8,0,.05)',
          color: dark ? 'white' : '#1A0800',
          border: dark ? '1px solid rgba(255,255,255,.15)' : '1px solid rgba(26,8,0,.1)',
          borderRadius: 100, padding: '6px 12px',
        }}
      >
        🌐 {current.label}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 700 }} />
          <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 701, background: 'white', borderRadius: 12, boxShadow: '0 10px 30px rgba(26,8,0,.15)', border: '1px solid #F0EAE4', minWidth: 140, overflow: 'hidden' }}>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => select(l.code)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 13,
                  fontWeight: l.code === current.code ? 700 : 500,
                  color: l.code === current.code ? '#FF6B2B' : '#1A0800',
                  background: l.code === current.code ? 'rgba(255,107,43,.06)' : 'white',
                  border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
