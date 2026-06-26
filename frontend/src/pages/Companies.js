import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SiteLayout from './SiteLayout'
import { getCompanies } from '../lib/api'

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
      <div style={{ width: 28, height: 28, border: '3px solid rgba(255,107,43,.2)', borderTopColor: '#FF6B2B', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function Companies() {
  const [companies, setCompanies] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      getCompanies(search).then(({ data }) => setCompanies(data || []))
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  return (
    <SiteLayout eyebrow="Companies" title="Employers on Day1 Diaries" subtitle="Browse companies hiring our community — and the stories from people who've worked there." wide>
      <input
        className="site-input"
        placeholder="Search companies…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ maxWidth: 360, marginBottom: 24 }}
      />

      {companies === null && <Spinner />}
      {companies?.length === 0 && (
        <div className="site-card" style={{ textAlign: 'center', color: '#8C7B6E' }}>
          No companies found.
        </div>
      )}

      <div className="site-blog-grid">
        {companies?.map(c => (
          <Link key={c.id} to={`/companies/${c.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="site-card" style={{ display: 'flex', gap: 14, alignItems: 'center', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF6B2B'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.transform = '' }}
            >
              {c.logo_url
                ? <img src={c.logo_url} alt={c.name} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 48, height: 48, borderRadius: 10, background: '#FF6B2B18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#FF6B2B', flexShrink: 0 }}>{c.name[0]}</div>}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: '1.02rem', color: '#1A0800', marginBottom: 3 }}>{c.name}</div>
                <div style={{ fontSize: 12.5, color: '#8C7B6E' }}>{[c.industry, c.location].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </SiteLayout>
  )
}
