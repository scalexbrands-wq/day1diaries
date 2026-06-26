import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import SiteLayout from './SiteLayout'
import { getCompany } from '../lib/api'

function formatSalary(min, max, currency) {
  if (!min && !max) return null
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'
  const fmt = (n) => n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n.toLocaleString()
  if (min && max) return `${sym}${fmt(min)} – ${sym}${fmt(max)} /yr`
  return `${sym}${fmt(min || max)} /yr`
}

export default function CompanyDetail() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    getCompany(slug).then(({ data, error }) => {
      if (error || !data?.company) setNotFound(true)
      else setData(data)
    })
  }, [slug])

  if (notFound) {
    return (
      <SiteLayout eyebrow="Companies" title="Company not found">
        <div className="site-card" style={{ textAlign: 'center', color: '#8C7B6E' }}>
          This company doesn't exist or is no longer active. <Link to="/companies" style={{ color: '#FF6B2B' }}>Browse companies →</Link>
        </div>
      </SiteLayout>
    )
  }

  if (!data) {
    return (
      <SiteLayout eyebrow="Companies" title="Loading…">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <div style={{ width: 28, height: 28, border: '3px solid rgba(255,107,43,.2)', borderTopColor: '#FF6B2B', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </SiteLayout>
    )
  }

  const { company, jobs } = data

  return (
    <SiteLayout eyebrow="Company" title={company.name} subtitle={[company.industry, company.location].filter(Boolean).join(' · ')} wide>
      <div className="site-card" style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: 24 }}>
        {company.logo_url
          ? <img src={company.logo_url} alt={company.name} style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 64, height: 64, borderRadius: 12, background: '#FF6B2B18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#FF6B2B', flexShrink: 0 }}>{company.name[0]}</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          {company.description && <p style={{ marginTop: 0 }}>{company.description}</p>}
          {company.website && (
            <a href={company.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#FF6B2B', fontWeight: 600, textDecoration: 'none' }}>
              {company.website} →
            </a>
          )}
        </div>
      </div>

      <h2>Open Roles{jobs?.length ? ` (${jobs.length})` : ''}</h2>
      {jobs?.length === 0 && (
        <div className="site-card" style={{ textAlign: 'center', color: '#8C7B6E' }}>
          No open roles right now.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {jobs?.map(job => (
          <Link key={job.id} to={`/careers/${job.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="site-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.02rem', fontWeight: 700, marginBottom: 6, color: '#1A0800' }}>{job.title}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: '#8C7B6E' }}>
                  {job.department && <span>{job.department}</span>}
                  {job.location && <span>· {job.location}</span>}
                  {job.job_type && <span>· {job.job_type}</span>}
                </div>
              </div>
              {formatSalary(job.salary_min, job.salary_max, job.currency) && (
                <span style={{ fontSize: 13, fontWeight: 600, color: '#FF6B2B' }}>
                  {formatSalary(job.salary_min, job.salary_max, job.currency)}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </SiteLayout>
  )
}
