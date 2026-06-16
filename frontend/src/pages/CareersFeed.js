import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCareersJobs } from '../lib/api'

function formatSalary(min, max, currency) {
  if (!min && !max) return null
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'
  const fmt = (n) => n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n.toLocaleString()
  if (min && max) return `${sym}${fmt(min)} – ${sym}${fmt(max)} /yr`
  return `${sym}${fmt(min || max)} /yr`
}

const TYPE_COLORS = {
  'Full-time':  { bg:'rgba(37,99,235,.1)',  color:'#2563EB' },
  'Part-time':  { bg:'rgba(5,150,105,.1)',   color:'#059669' },
  'Contract':   { bg:'rgba(124,58,237,.1)', color:'#7C3AED' },
  'Internship': { bg:'rgba(245,158,11,.1)', color:'#D97706' },
  'Remote':     { bg:'rgba(255,107,43,.1)', color:'#FF6B2B' },
}

export default function CareersFeed() {
  const [jobs, setJobs] = useState(null)
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('All')
  const navigate = useNavigate()

  useEffect(() => {
    getCareersJobs().then(({ data }) => setJobs(data || []))
  }, [])

  const departments = ['All', ...new Set((jobs || []).map(j => j.department).filter(Boolean))]
  const filtered = (jobs || []).filter(j => {
    const q = search.toLowerCase()
    const matchesSearch = !q || j.title.toLowerCase().includes(q) || (j.department||'').toLowerCase().includes(q) || (j.location||'').toLowerCase().includes(q)
    const matchesDept = dept === 'All' || j.department === dept
    return matchesSearch && matchesDept
  })

  return (
    <div style={{ padding:'20px 16px', maxWidth:800, margin:'0 auto' }}>
      <style>{`
        .cf-kpi { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:20px; }
        .cf-search-row { display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
        .cf-job-inner { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; }
        .cf-job-right { display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0; }
        @media(max-width:500px){
          .cf-kpi { grid-template-columns:1fr 1fr !important; }
          .cf-search-row { flex-direction:column; }
          .cf-search-row select { width:100% !important; }
          .cf-job-inner { flex-direction:column; }
          .cf-job-right { align-items:flex-start; flex-direction:row; flex-wrap:wrap; margin-top:8px; }
        }
        @media(max-width:340px){
          .cf-kpi { grid-template-columns:1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', color:'#FF6B2B', marginBottom:6 }}>Careers</div>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.4rem,5vw,1.8rem)', fontWeight:900, color:'#1A0800', margin:'0 0 6px' }}>Open Roles</h1>
        <p style={{ fontSize:13, color:'#8C7B6E', margin:0 }}>Join the Day1 Diaries team.</p>
      </div>

      {/* KPI row */}
      {jobs && (
        <div className="cf-kpi">
          {[
            ['📋', 'Open Roles', jobs.length],
            ['📨', 'Total Applied', jobs.reduce((s,j)=>s+Number(j.applications_count||0),0)],
            ['🏢', 'Departments', new Set(jobs.map(j=>j.department).filter(Boolean)).size],
          ].map(([icon,label,val])=>(
            <div key={label} style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:12, padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{icon}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.2rem', fontWeight:900, color:'#FF6B2B' }}>{val}</div>
              <div style={{ fontSize:11, color:'#8C7B6E' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter */}
      <div className="cf-search-row">
        <input
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="Search roles..."
          style={{ flex:1, minWidth:140, padding:'9px 14px', border:'1.5px solid #DDD3CA', borderRadius:100, fontSize:13, fontFamily:'inherit', outline:'none' }}
          onFocus={e=>e.target.style.borderColor='#FF6B2B'}
          onBlur={e=>e.target.style.borderColor='#DDD3CA'}
        />
        <select
          value={dept}
          onChange={e=>setDept(e.target.value)}
          style={{ padding:'9px 14px', border:'1.5px solid #DDD3CA', borderRadius:100, fontSize:13, fontFamily:'inherit', outline:'none', background:'white', color:'#1A0800' }}
        >
          {departments.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Loading */}
      {jobs === null && (
        <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}>
          <div style={{ width:28, height:28, border:'3px solid rgba(255,107,43,.2)', borderTopColor:'#FF6B2B', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Job cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map(j => {
          const salary = formatSalary(j.salary_min, j.salary_max, j.currency)
          const typeStyle = TYPE_COLORS[j.job_type] || { bg:'#F0EAE4', color:'#8C7B6E' }
          const appCount = Number(j.applications_count || 0)
          return (
            <div
              key={j.id}
              onClick={()=>navigate(`/careers/${j.id}`)}
              style={{ background:'white', border:'1.5px solid #F0EAE4', borderRadius:14, padding:'16px', cursor:'pointer', transition:'all .2s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#FF6B2B';e.currentTarget.style.boxShadow='0 6px 20px rgba(255,107,43,.1)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='#F0EAE4';e.currentTarget.style.boxShadow='none'}}
            >
              <div className="cf-job-inner">
                <div style={{ flex:1, minWidth:160 }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1rem', fontWeight:700, color:'#1A0800', marginBottom:6 }}>{j.title}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:8 }}>
                    {j.department && <span style={{ fontSize:12, color:'#4A2800' }}>🏢 {j.department}</span>}
                    {j.location && <span style={{ fontSize:12, color:'#4A2800' }}>📍 {j.location}</span>}
                    {j.job_type && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:100, background:typeStyle.bg, color:typeStyle.color, fontWeight:600 }}>{j.job_type}</span>}
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, padding:'3px 8px', borderRadius:100, background:'rgba(5,150,105,.1)', color:'#059669', fontWeight:600 }}>🟢 Open</span>
                    <span style={{ fontSize:11, padding:'3px 8px', borderRadius:100, background:appCount>0?'rgba(255,107,43,.1)':'#F0EAE4', color:appCount>0?'#FF6B2B':'#8C7B6E', fontWeight:600 }}>📨 {appCount} applied</span>
                  </div>
                </div>
                <div className="cf-job-right">
                  {salary && <span style={{ fontSize:12, fontWeight:700, color:'#FF6B2B' }}>{salary}</span>}
                  <span style={{ fontSize:12, fontWeight:600, color:'#FF6B2B' }}>Apply →</span>
                </div>
              </div>
            </div>
          )
        })}
        {jobs !== null && filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'#8C7B6E', fontSize:13 }}>
            {jobs.length===0 ? 'No open roles right now — check back soon!' : 'No roles match your search.'}
          </div>
        )}
      </div>
    </div>
  )
}
