import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getMyCompany, createCompany, updateCompany,
  getMyCompanyJobs, createCompanyJob, updateCompanyJob, deleteCompanyJob,
} from '../lib/api'

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1.5px solid rgba(26,8,0,.12)', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', marginBottom: 12 }
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#4A2800', display: 'block', marginBottom: 6 }
const btnStyle = { background: '#FF6B2B', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }

function CompanyForm({ company, onSaved }) {
  const [form, setForm] = useState({
    name: company?.name || '', description: company?.description || '',
    industry: company?.industry || '', location: company?.location || '', website: company?.website || '',
  })
  const [logo, setLogo] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name) return setError('Company name is required')
    setSaving(true)
    setError('')
    const fields = { ...form, ...(logo ? { logo } : {}) }
    const { data, error: err } = company ? await updateCompany(fields) : await createCompany(fields)
    setSaving(false)
    if (err) return setError(err.message || 'Something went wrong')
    onSaved(data)
  }

  return (
    <form onSubmit={handleSubmit} className="site-card" style={{ maxWidth: 520 }}>
      <h2 style={{ marginTop: 0 }}>{company ? 'Edit Company' : 'Create Your Company'}</h2>
      {error && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <label style={labelStyle}>Company name *</label>
      <input style={inputStyle} value={form.name} onChange={set('name')} placeholder="Acme Inc." />
      <label style={labelStyle}>Description</label>
      <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={form.description} onChange={set('description')} />
      <label style={labelStyle}>Industry</label>
      <input style={inputStyle} value={form.industry} onChange={set('industry')} placeholder="Software, Retail, …" />
      <label style={labelStyle}>Location</label>
      <input style={inputStyle} value={form.location} onChange={set('location')} placeholder="Bengaluru, India" />
      <label style={labelStyle}>Website</label>
      <input style={inputStyle} value={form.website} onChange={set('website')} placeholder="https://example.com" />
      <label style={labelStyle}>Logo</label>
      <input style={inputStyle} type="file" accept="image/*" onChange={e => setLogo(e.target.files?.[0] || null)} />
      <button type="submit" style={btnStyle} disabled={saving}>{saving ? 'Saving…' : company ? 'Save Changes' : 'Create Company'}</button>
    </form>
  )
}

function JobForm({ job, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: job?.title || '', department: job?.department || '', location: job?.location || '',
    job_type: job?.job_type || 'Full-time', salary_min: job?.salary_min || '', salary_max: job?.salary_max || '',
    currency: job?.currency || 'INR', description: job?.description || '', requirements: job?.requirements || '',
    is_active: job?.is_active !== false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.description) return setError('Title and description are required')
    setSaving(true)
    setError('')
    const payload = { ...form, salary_min: form.salary_min || null, salary_max: form.salary_max || null }
    const { data, error: err } = job ? await updateCompanyJob(job.id, payload) : await createCompanyJob(payload)
    setSaving(false)
    if (err) return setError(err.message || 'Something went wrong')
    onSaved(data)
  }

  return (
    <form onSubmit={handleSubmit} className="site-card" style={{ marginBottom: 16 }}>
      {error && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <label style={labelStyle}>Job title *</label>
      <input style={inputStyle} value={form.title} onChange={set('title')} placeholder="Frontend Engineer" />
      <div className="site-form-row">
        <div><label style={labelStyle}>Department</label><input style={inputStyle} value={form.department} onChange={set('department')} /></div>
        <div><label style={labelStyle}>Location</label><input style={inputStyle} value={form.location} onChange={set('location')} /></div>
      </div>
      <div className="site-form-row">
        <div><label style={labelStyle}>Job type</label>
          <select style={inputStyle} value={form.job_type} onChange={set('job_type')}>
            <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option>
          </select>
        </div>
        <div><label style={labelStyle}>Currency</label>
          <select style={inputStyle} value={form.currency} onChange={set('currency')}>
            <option>INR</option><option>USD</option><option>EUR</option>
          </select>
        </div>
      </div>
      <div className="site-form-row">
        <div><label style={labelStyle}>Salary min</label><input style={inputStyle} type="number" value={form.salary_min} onChange={set('salary_min')} /></div>
        <div><label style={labelStyle}>Salary max</label><input style={inputStyle} type="number" value={form.salary_max} onChange={set('salary_max')} /></div>
      </div>
      <label style={labelStyle}>Description *</label>
      <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={form.description} onChange={set('description')} />
      <label style={labelStyle}>Requirements</label>
      <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={form.requirements} onChange={set('requirements')} />
      <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={form.is_active} onChange={set('is_active')} /> Active (visible to applicants)
      </label>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button type="submit" style={btnStyle} disabled={saving}>{saving ? 'Saving…' : job ? 'Save Job' : 'Post Job'}</button>
        {onCancel && <button type="button" onClick={onCancel} style={{ ...btnStyle, background: 'transparent', color: '#8C7B6E', border: '1.5px solid rgba(26,8,0,.12)' }}>Cancel</button>}
      </div>
    </form>
  )
}

export default function EmployerDashboard() {
  const { refreshProfile } = useAuth()
  const [company, setCompany] = useState(undefined)
  const [jobs, setJobs] = useState(null)
  const [editingJob, setEditingJob] = useState(null)
  const [showNewJob, setShowNewJob] = useState(false)

  useEffect(() => {
    getMyCompany().then(({ data }) => setCompany(data || null))
  }, [])

  useEffect(() => {
    if (company) getMyCompanyJobs().then(({ data }) => setJobs(data || []))
  }, [company])

  const handleCompanySaved = (c) => { setCompany(c); refreshProfile?.() }
  const handleJobSaved = (j) => {
    setJobs(prev => {
      const exists = prev?.some(p => p.id === j.id)
      return exists ? prev.map(p => p.id === j.id ? j : p) : [j, ...(prev || [])]
    })
    setEditingJob(null)
    setShowNewJob(false)
  }
  const handleDeleteJob = async (id) => {
    if (!window.confirm('Delete this job posting?')) return
    await deleteCompanyJob(id)
    setJobs(prev => prev?.filter(p => p.id !== id))
  }

  if (company === undefined) {
    return <div style={{ padding: 24 }}>Loading…</div>
  }

  if (!company) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif" }}>Employer Dashboard</h1>
        <p style={{ color: '#8C7B6E', marginBottom: 20 }}>Create your company profile to start posting jobs.</p>
        <CompanyForm onSaved={handleCompanySaved} />
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontFamily: "'Playfair Display',serif" }}>{company.name}</h1>

      <details style={{ marginBottom: 24 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#4A2800', marginBottom: 12 }}>Edit company profile</summary>
        <div style={{ marginTop: 12 }}>
          <CompanyForm company={company} onSaved={handleCompanySaved} />
        </div>
      </details>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Job Postings {jobs && `(${jobs.length})`}</h2>
        {!showNewJob && <button style={btnStyle} onClick={() => setShowNewJob(true)}>+ Post a Job</button>}
      </div>

      {showNewJob && <JobForm onSaved={handleJobSaved} onCancel={() => setShowNewJob(false)} />}

      {jobs?.length === 0 && !showNewJob && (
        <div className="site-card" style={{ textAlign: 'center', color: '#8C7B6E' }}>No jobs posted yet.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {jobs?.map(job => editingJob === job.id ? (
          <JobForm key={job.id} job={job} onSaved={handleJobSaved} onCancel={() => setEditingJob(null)} />
        ) : (
          <div key={job.id} className="site-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#1A0800', marginBottom: 4 }}>{job.title}</div>
              <div style={{ fontSize: 12.5, color: '#8C7B6E' }}>
                {[job.department, job.location, job.job_type].filter(Boolean).join(' · ')}
                {' · '}<span style={{ color: job.is_active ? '#10B981' : '#9CA3AF', fontWeight: 600 }}>{job.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditingJob(job.id)} style={{ ...btnStyle, padding: '6px 14px', background: 'transparent', color: '#FF6B2B', border: '1.5px solid #FF6B2B' }}>Edit</button>
              <button onClick={() => handleDeleteJob(job.id)} style={{ ...btnStyle, padding: '6px 14px', background: 'transparent', color: '#DC2626', border: '1.5px solid #DC2626' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
