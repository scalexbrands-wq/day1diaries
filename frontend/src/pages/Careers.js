import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import SiteLayout from './SiteLayout'
import { getCareersJobs, getMyApplications, updateMyApplication } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

const PIPELINE = [
  { key: 'applied',        label: 'Applied' },
  { key: 'screening',      label: 'Screening' },
  { key: 'interview_1',    label: 'Interview 1' },
  { key: 'interview_2',    label: 'Interview 2' },
  { key: 'offer_received', label: 'Offer' },
  { key: 'custom',         label: 'Custom' },
]

const PIPELINE_COLORS = {
  applied:        '#6B7280',
  screening:      '#F59E0B',
  interview_1:    '#3B82F6',
  interview_2:    '#8B5CF6',
  offer_received: '#10B981',
  custom:         '#FF6B2B',
}

function formatSalary(min, max, currency) {
  if (!min && !max) return null
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'
  const fmt = (n) => n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n.toLocaleString()
  if (min && max) return `${sym}${fmt(min)} – ${sym}${fmt(max)} /yr`
  return `${sym}${fmt(min || max)} /yr`
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
      <div style={{ width: 28, height: 28, border: '3px solid rgba(255,107,43,.2)', borderTopColor: '#FF6B2B', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({ value, label, icon, color }) {
  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid rgba(26,8,0,.08)',
      borderRadius: 16,
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flex: '1 1 160px',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12.5, color: '#8C7B6E', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  )
}

// ── Pipeline Steps ────────────────────────────────────────────
function PipelineBar({ current, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', rowGap: 6, marginBottom: 12 }}>
      {PIPELINE.map((step, i) => {
        const idx = PIPELINE.findIndex(s => s.key === current)
        const isPast = i < idx
        const isActive = step.key === current
        const color = isActive ? PIPELINE_COLORS[step.key] : isPast ? '#10B981' : '#D1D5DB'
        return (
          <React.Fragment key={step.key}>
            <button
              onClick={() => !disabled && onChange(step.key)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: `1.5px solid ${color}`,
                background: isActive ? color : isPast ? '#F0FDF4' : '#F9FAFB',
                color: isActive ? '#fff' : isPast ? '#059669' : '#6B7280',
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                cursor: disabled ? 'default' : 'pointer',
                transition: 'all .15s',
              }}
            >
              {isPast && !isActive ? '✓ ' : ''}{step.label}
            </button>
            {i < PIPELINE.length - 1 && (
              <div style={{ width: 14, height: 2, background: isPast ? '#10B981' : '#E5E7EB', flexShrink: 0 }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ── Application Card ──────────────────────────────────────────
function AppCard({ app, onUpdate }) {
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState(app.user_notes || '')
  const [customStatus, setCustomStatus] = useState(app.custom_status || '')
  const [localStatus, setLocalStatus] = useState(app.user_status || 'applied')
  const [expanded, setExpanded] = useState(false)
  const [saved, setSaved] = useState(false)

  const salary = formatSalary(app.salary_min, app.salary_max, app.currency)
  const color = PIPELINE_COLORS[localStatus] || '#6B7280'

  const handleStatusChange = async (newStatus) => {
    setLocalStatus(newStatus)
    setSaving(true)
    const { data } = await updateMyApplication(app.id, { user_status: newStatus })
    setSaving(false)
    if (data) onUpdate(data)
  }

  const handleSaveNotes = async () => {
    setSaving(true)
    const { data } = await updateMyApplication(app.id, {
      user_notes: notes,
      ...(localStatus === 'custom' ? { custom_status: customStatus } : {}),
    })
    setSaving(false)
    if (data) { onUpdate(data); setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  return (
    <div style={{
      background: '#fff',
      border: `1.5px solid ${expanded ? color : 'rgba(26,8,0,.08)'}`,
      borderRadius: 16,
      overflow: 'hidden',
      transition: 'border-color .2s',
    }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 16 }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 10, background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>
          {localStatus === 'offer_received' ? '🎉' : localStatus === 'custom' ? '📌' : localStatus === 'applied' ? '📄' : '💼'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1A0800', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.job_title}</div>
          <div style={{ fontSize: 12.5, color: '#8C7B6E', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {app.department && <span>{app.department}</span>}
            {app.location && <span>· {app.location}</span>}
            {salary && <span style={{ color: '#FF6B2B', fontWeight: 600 }}>· {salary}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{
            padding: '3px 10px', borderRadius: 20,
            background: `${color}18`, color,
            fontSize: 11.5, fontWeight: 700,
          }}>
            {localStatus === 'custom' ? (app.custom_status || 'Custom') : PIPELINE.find(s => s.key === localStatus)?.label}
          </span>
          <span style={{ color: '#8C7B6E', fontSize: 13 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(26,8,0,.06)' }}>
          <div style={{ fontSize: 11.5, color: '#B0A8A0', marginBottom: 14, paddingTop: 12 }}>
            Applied {new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#4A2800', marginBottom: 8 }}>Pipeline Stage</div>
            <PipelineBar current={localStatus} onChange={handleStatusChange} disabled={saving} />
          </div>

          {localStatus === 'custom' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#4A2800', display: 'block', marginBottom: 6 }}>Custom Stage Name</label>
              <input
                value={customStatus}
                onChange={e => setCustomStatus(e.target.value)}
                placeholder="e.g. Background Check, Offer Negotiation…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '8px 12px', borderRadius: 8,
                  border: '1.5px solid rgba(26,8,0,.12)',
                  fontSize: 13, fontFamily: 'inherit', outline: 'none',
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#4A2800', display: 'block', marginBottom: 6 }}>Notes / Comments</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes about this application — interview feedback, action items, contacts…"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '8px 12px', borderRadius: 8,
                border: '1.5px solid rgba(26,8,0,.12)',
                fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              style={{
                background: '#FF6B2B', color: '#fff', border: 'none',
                borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600,
                cursor: saving ? 'default' : 'pointer', opacity: saving ? .7 : 1,
              }}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Notes'}
            </button>
            <Link
              to={`/careers/${app.job_id}`}
              style={{ fontSize: 12.5, color: '#FF6B2B', textDecoration: 'none', fontWeight: 500 }}
            >
              View Job →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function Careers() {
  const { user } = useAuth()
  const [tab, setTab] = useState('browse')
  const [jobs, setJobs] = useState(null)
  const [apps, setApps] = useState(null)

  useEffect(() => {
    getCareersJobs().then(({ data }) => setJobs(data || []))
  }, [])

  useEffect(() => {
    if (tab === 'my-apps' && user) {
      getMyApplications().then(({ data }) => setApps(data || []))
    }
  }, [tab, user])

  const handleUpdate = useCallback((updated) => {
    setApps(prev => prev?.map(a => a.id === updated.id ? { ...a, ...updated } : a) || prev)
  }, [])

  // KPIs
  const kpiTotal = apps?.length ?? 0
  const kpiOffers = apps?.filter(a => a.user_status === 'offer_received').length ?? 0
  const kpiInterview = apps?.filter(a => ['interview_1', 'interview_2'].includes(a.user_status)).length ?? 0

  return (
    <SiteLayout eyebrow="Careers" title="Join the Day1 Diaries Team" subtitle="We're building a community that helps people share their first-day stories and build life-changing habits." wide>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .career-tab { padding:9px 20px; border-radius:20px; border:1.5px solid transparent; font-size:13.5px; font-weight:600; cursor:pointer; transition:all .15s; background:transparent; }
        .career-tab.active { background:#FF6B2B; color:#fff; }
        .career-tab:not(.active) { color:#8C7B6E; border-color:rgba(26,8,0,.1); }
        .career-tab:not(.active):hover { border-color:#FF6B2B; color:#FF6B2B; }
      `}</style>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <button className={`career-tab${tab === 'browse' ? ' active' : ''}`} onClick={() => setTab('browse')}>
          Browse Jobs {jobs && `(${jobs.length})`}
        </button>
        {user && (
          <button className={`career-tab${tab === 'my-apps' ? ' active' : ''}`} onClick={() => setTab('my-apps')}>
            My Applications {apps !== null && `(${apps.length})`}
          </button>
        )}
      </div>

      {/* ─── Browse Jobs ─── */}
      {tab === 'browse' && (
        <>
          {jobs === null && <Spinner />}
          {jobs?.length === 0 && (
            <div className="site-card" style={{ textAlign: 'center', color: '#8C7B6E' }}>
              No open roles right now — check back soon, or send your resume via the <Link to="/contact" style={{ color: '#FF6B2B' }}>Contact</Link> page!
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {jobs?.map(job => (
              <Link
                key={job.id}
                to={`/careers/${job.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  className="site-card"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', transition: 'all .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF6B2B'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.transform = '' }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.05rem', fontWeight: 700, marginBottom: 6, color: '#1A0800' }}>{job.title}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: '#8C7B6E' }}>
                      {job.department && <span>{job.department}</span>}
                      {job.location && <span>· {job.location}</span>}
                      {job.job_type && <span>· {job.job_type}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    {formatSalary(job.salary_min, job.salary_max, job.currency) && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#FF6B2B' }}>
                        {formatSalary(job.salary_min, job.salary_max, job.currency)}
                      </span>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#FF6B2B' }}>View →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ─── My Applications ─── */}
      {tab === 'my-apps' && user && (
        <>
          {apps === null && <Spinner />}

          {/* KPIs */}
          {apps !== null && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
              <KpiCard value={kpiTotal}     label="Total Applied"       icon="📋" color="#3B82F6" />
              <KpiCard value={kpiInterview} label="Taking Interview"     icon="💬" color="#8B5CF6" />
              <KpiCard value={kpiOffers}    label="Offers Received"      icon="🎉" color="#10B981" />
            </div>
          )}

          {apps?.length === 0 && (
            <div className="site-card" style={{ textAlign: 'center', color: '#8C7B6E' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
              <p>You haven't applied to any jobs yet.</p>
              <button className="career-tab active" onClick={() => setTab('browse')} style={{ marginTop: 8 }}>Browse Open Roles →</button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {apps?.map(app => (
              <AppCard key={app.id} app={app} onUpdate={handleUpdate} />
            ))}
          </div>
        </>
      )}
    </SiteLayout>
  )
}
