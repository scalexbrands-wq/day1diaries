import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SiteLayout from './SiteLayout'
const mobileStyle = `
  @media(max-width:500px){
    .careers-card-inner { flex-direction:column !important; }
    .careers-card-right { align-items:flex-start !important; flex-direction:row; flex-wrap:wrap; gap:8px; margin-top:8px; }
  }
`
import { getCareersJobs } from '../lib/api'

function formatSalary(min, max, currency) {
  if (!min && !max) return null
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'
  const fmt = (n) => n >= 100000 ? `${(n/100000).toFixed(1)}L` : n.toLocaleString()
  if (min && max) return `${sym}${fmt(min)} – ${sym}${fmt(max)} /yr`
  return `${sym}${fmt(min || max)} /yr`
}

export default function Careers() {
  const [jobs, setJobs] = useState(null)

  useEffect(() => {
    getCareersJobs().then(({ data }) => setJobs(data || []))
  }, [])

  return (
    <><style>{mobileStyle}</style><SiteLayout eyebrow="Careers" title="Join the Day1 Diaries Team" subtitle="We're building a community that helps people share their first-day stories and build life-changing habits. Here's where you can help." wide>
      {jobs === null && (
        <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}>
          <div style={{ width:28, height:28, border:'3px solid rgba(255,107,43,.2)', borderTopColor:'#FF6B2B', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {jobs?.length === 0 && (
        <div className="site-card" style={{ textAlign:'center', color:'#8C7B6E' }}>
          No open roles right now — but check back soon, or send us your resume via the <Link to="/contact" style={{ color:'#FF6B2B' }}>Contact</Link> page!
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {jobs?.map(job => (
          <Link key={job.id} to={`/careers/${job.id}`} className="site-card" className="site-card" style={{ textDecoration:'none', color:'inherit', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap', transition:'all .2s' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='#FF6B2B';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='none'}}>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.1rem', fontWeight:700, marginBottom:6, color:'#1A0800' }}>{job.title}</div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', fontSize:12.5, color:'#8C7B6E' }}>
                {job.department && <span>{job.department}</span>}
                {job.location && <span>· {job.location}</span>}
                {job.job_type && <span>· {job.job_type}</span>}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              {formatSalary(job.salary_min, job.salary_max, job.currency) && (
                <span style={{ fontSize:13, fontWeight:600, color:'#FF6B2B' }}>{formatSalary(job.salary_min, job.salary_max, job.currency)}</span>
              )}
              <span style={{ fontSize:13, fontWeight:600, color:'#FF6B2B' }}>View →</span>
            </div>
          </Link>
        ))}
      </div>
    </SiteLayout></>
  )
}
