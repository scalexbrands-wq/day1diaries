import React, { useEffect, useState, useCallback } from 'react'
import { getCareersJobs, getMyApplications, applyToJob, updateMyApplication } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { toast } from '../components/Toast'
import AdSlot from '../components/AdSlot'

/* ── helpers ──────────────────────────────────────────────── */
const PIPELINE = [
  { key: 'applied',        label: 'Applied',     short: 'Applied',  icon: '📄' },
  { key: 'screening',      label: 'Screening',   short: 'Screen',   icon: '📋' },
  { key: 'interview_1',    label: 'Interview 1', short: 'Int.1',    icon: '💬' },
  { key: 'interview_2',    label: 'Interview 2', short: 'Int.2',    icon: '🎙️' },
  { key: 'offer_received', label: 'Offer',       short: 'Offer',    icon: '🎉' },
  { key: 'custom',         label: 'Custom',      short: 'Custom',   icon: '✏️' },
]
const STAGE_COLOR = {
  applied:        '#6B7280',
  screening:      '#F59E0B',
  interview_1:    '#3B82F6',
  interview_2:    '#8B5CF6',
  offer_received: '#10B981',
  custom:         '#FF6B2B',
}
const IN_PROGRESS = ['applied','screening','interview_1','interview_2']
const DEPT_ICON = {
  Engineering:'💻', Design:'🎨', Marketing:'📣', Product:'🚀',
  Sales:'💼', Operations:'⚙️', HR:'🤝', Finance:'📊', Legal:'⚖️', Data:'📈',
}
const TYPE_COLOR = {
  'Full-time':  { bg:'rgba(37,99,235,.1)',  color:'#2563EB' },
  'Part-time':  { bg:'rgba(124,58,237,.1)', color:'#7C3AED' },
  'Contract':   { bg:'rgba(245,158,11,.1)', color:'#D97706' },
  'Internship': { bg:'rgba(5,150,105,.1)',  color:'#059669' },
  'Remote':     { bg:'rgba(255,107,43,.1)', color:'#FF6B2B' },
}

function fmt(min, max, cur) {
  if (!min && !max) return null
  const sym = cur === 'USD' ? '$' : cur === 'EUR' ? '€' : '₹'
  const f = n => n >= 100000 ? `${(n/100000).toFixed(1)}L` : n.toLocaleString()
  return min && max ? `${sym}${f(min)} – ${sym}${f(max)}/yr` : `${sym}${f(min||max)}/yr`
}

function Spinner() {
  return (
    <div style={{ display:'flex',justifyContent:'center',padding:'32px 0' }}>
      <div style={{ width:26,height:26,border:'3px solid rgba(255,107,43,.2)',borderTopColor:'#FF6B2B',borderRadius:'50%',animation:'jobs-spin .7s linear infinite' }}/>
    </div>
  )
}

/* ── KPI Card ─────────────────────────────────────────────── */
function Kpi({ icon, value, label, color }) {
  return (
    <div style={{ flex:'1 1 140px', background:'white', borderRadius:16, padding:'18px 22px', border:'1.5px solid rgba(26,8,0,.07)', display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ width:44,height:44,borderRadius:12,background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:26,fontWeight:800,color,lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:11.5,color:'#8C7B6E',marginTop:3 }}>{label}</div>
      </div>
    </div>
  )
}

/* ── Apply Modal ──────────────────────────────────────────── */
function ApplyModal({ job, userProfile, onClose, onSuccess }) {
  const [form, setForm] = useState({
    full_name: userProfile?.full_name || userProfile?.username || '',
    email:     userProfile?.email || '',
    phone:     '',
    resume_url:'',
    cover_note:'',
  })
  const [loading, setLoading] = useState(false)

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  const inpStyle = { width:'100%', boxSizing:'border-box', padding:'9px 12px', border:'1.5px solid #DDD3CA', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', marginBottom:12 }

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    const { error } = await applyToJob(job.id, form)
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Application submitted! ✅ Track it in My Applications.')
    onSuccess(job)
    onClose()
  }

  const sal = fmt(job.salary_min, job.salary_max, job.currency)
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(26,8,0,.55)',zIndex:900,display:'flex',alignItems:'center',justifyContent:'center',padding:20,overflowY:'auto' }} onClick={onClose}>
      <div style={{ background:'white',borderRadius:22,padding:28,width:'100%',maxWidth:500,margin:'auto',maxHeight:'90vh',overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4 }}>
          <div>
            <div style={{ fontWeight:800,fontSize:'1.1rem',color:'#1A0800' }}>{job.title}</div>
            <div style={{ fontSize:12,color:'#8C7B6E',marginTop:2 }}>
              {[job.department, job.location, job.job_type].filter(Boolean).join(' · ')}
              {sal && <span style={{ color:'#FF6B2B',fontWeight:600 }}> · {sal}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#8C7B6E',lineHeight:1,flexShrink:0 }}>×</button>
        </div>
        <div style={{ height:1,background:'#F0EAE4',margin:'16px 0' }}/>
        <form onSubmit={submit}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:0 }}>
            <div>
              <label style={{ fontSize:11.5,fontWeight:600,color:'#4A2800',display:'block',marginBottom:4 }}>Full Name *</label>
              <input style={inpStyle} required value={form.full_name} onChange={set('full_name')} placeholder="Your name"
                onFocus={e=>e.target.style.borderColor='#FF6B2B'} onBlur={e=>e.target.style.borderColor='#DDD3CA'}/>
            </div>
            <div>
              <label style={{ fontSize:11.5,fontWeight:600,color:'#4A2800',display:'block',marginBottom:4 }}>Email *</label>
              <input style={inpStyle} type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com"
                onFocus={e=>e.target.style.borderColor='#FF6B2B'} onBlur={e=>e.target.style.borderColor='#DDD3CA'}/>
            </div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:0 }}>
            <div>
              <label style={{ fontSize:11.5,fontWeight:600,color:'#4A2800',display:'block',marginBottom:4 }}>Phone</label>
              <input style={inpStyle} value={form.phone} onChange={set('phone')} placeholder="Optional"
                onFocus={e=>e.target.style.borderColor='#FF6B2B'} onBlur={e=>e.target.style.borderColor='#DDD3CA'}/>
            </div>
            <div>
              <label style={{ fontSize:11.5,fontWeight:600,color:'#4A2800',display:'block',marginBottom:4 }}>Resume Link</label>
              <input style={inpStyle} value={form.resume_url} onChange={set('resume_url')} placeholder="Drive / LinkedIn"
                onFocus={e=>e.target.style.borderColor='#FF6B2B'} onBlur={e=>e.target.style.borderColor='#DDD3CA'}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize:11.5,fontWeight:600,color:'#4A2800',display:'block',marginBottom:4 }}>Cover Note</label>
            <textarea style={{ ...inpStyle, resize:'vertical', minHeight:80 }} value={form.cover_note} onChange={set('cover_note')} placeholder="Why are you a great fit?"
              onFocus={e=>e.target.style.borderColor='#FF6B2B'} onBlur={e=>e.target.style.borderColor='#DDD3CA'}/>
          </div>
          <button type="submit" disabled={loading} style={{ width:'100%',padding:'12px',background:'#FF6B2B',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:loading?'default':'pointer',opacity:loading?.7:1 }}>
            {loading ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Application Detail Modal ─────────────────────────────── */
function AppDetailModal({ app, onClose, onUpdate }) {
  const [status, setStatus]           = useState(app.user_status || 'applied')
  const [notes, setNotes]             = useState(app.user_notes || '')
  const [customLabel, setCustomLabel] = useState(app.custom_status || '')
  const [stageSaving, setStageSaving] = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)
  const activeIdx = PIPELINE.findIndex(p => p.key === status)
  const color = STAGE_COLOR[status] || '#6B7280'
  const displayLabel = status === 'custom' ? (customLabel || 'Custom') : PIPELINE.find(s => s.key === status)?.label || status

  const sal = fmt(app.salary_min, app.salary_max, app.currency)
  const appliedDate = app.created_at ? new Date(app.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }) : ''

  const changeStage = async (key) => {
    if (key === status || stageSaving) return
    setStatus(key)
    setStageSaving(true)
    const { data } = await updateMyApplication(app.id, { user_status: key })
    setStageSaving(false)
    if (data) onUpdate(data)
    else setStatus(status)
  }

  const saveNotes = async () => {
    setNotesSaving(true)
    const payload = { user_notes: notes }
    if (status === 'custom') payload.custom_status = customLabel
    const { data } = await updateMyApplication(app.id, payload)
    setNotesSaving(false)
    if (data) { onUpdate(data); toast.success('Notes saved!') }
  }

  const shareStatus = async () => {
    const text = `🚀 Job Update\n\nRole: ${app.job_title}${app.department ? ` · ${app.department}` : ''}${app.location ? ` · ${app.location}` : ''}\nStatus: ${displayLabel}\nApplied: ${appliedDate}${notes ? `\n\nNotes: ${notes}` : ''}`
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Status copied to clipboard! 📋')
    } catch {
      toast.error('Could not copy — please copy manually')
    }
  }

  const inp = { width:'100%',boxSizing:'border-box',padding:'9px 12px',border:'1.5px solid #DDD3CA',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none' }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(26,8,0,.6)',zIndex:950,display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }} onClick={onClose}>
      <div style={{ background:'white',borderRadius:22,width:'100%',maxWidth:580,margin:'auto',maxHeight:'92vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(26,8,0,.2)' }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'24px 28px 20px', borderBottom:'1px solid #F0EAE4' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12 }}>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:10.5,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#FF6B2B',marginBottom:6 }}>Application Details</div>
              <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:'1.25rem',fontWeight:900,color:'#1A0800',margin:'0 0 6px',wordBreak:'break-word',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                {app.job_title}
              </h2>
              <div style={{ fontSize:12.5,color:'#8C7B6E',display:'flex',gap:8,flexWrap:'wrap' }}>
                {app.department && <span>🏢 {app.department}</span>}
                {app.location   && <span>📍 {app.location}</span>}
                {sal            && <span style={{ color:'#FF6B2B',fontWeight:600 }}>{sal}</span>}
              </div>
              <div style={{ fontSize:11.5,color:'#B0A8A0',marginTop:6 }}>Applied on {appliedDate}</div>
            </div>
            <button onClick={onClose} style={{ background:'none',border:'none',fontSize:24,cursor:'pointer',color:'#8C7B6E',flexShrink:0 }}>×</button>
          </div>

          {/* Progress bar */}
          <div style={{ display:'flex',gap:4,marginTop:18,alignItems:'center' }}>
            {PIPELINE.map((s,i) => {
              const isDone   = i < activeIdx
              const isActive = s.key === status
              return (
                <div key={s.key} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                  <div style={{ width:'100%',height:4,borderRadius:2,background: isDone ? '#10B981' : isActive ? color : '#E5E7EB',transition:'background .3s' }}/>
                  <span style={{ fontSize:9.5,fontWeight:600,color: isActive ? color : isDone ? '#059669' : '#9CA3AF',whiteSpace:'nowrap' }}>
                    {isDone ? '✓' : s.short}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'24px 28px', display:'flex', flexDirection:'column', gap:22 }}>

          {/* Current status */}
          <div style={{ display:'flex',alignItems:'center',gap:10,padding:'12px 16px',background:`${color}10`,borderRadius:12,border:`1.5px solid ${color}25` }}>
            <span style={{ fontSize:20 }}>{PIPELINE.find(s=>s.key===status)?.icon || '📄'}</span>
            <div>
              <div style={{ fontSize:11,fontWeight:600,color:'#8C7B6E',marginBottom:2 }}>Current Status</div>
              <div style={{ fontSize:15,fontWeight:800,color }}>{displayLabel}</div>
            </div>
            {stageSaving && <span style={{ fontSize:11,color:'#8C7B6E',marginLeft:'auto' }}>saving…</span>}
          </div>

          {/* Stage selector */}
          <div>
            <div style={{ fontSize:11.5,fontWeight:700,color:'#4A2800',marginBottom:10 }}>Update Stage</div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
              {PIPELINE.map((s,i) => {
                const isDone   = i < activeIdx
                const isActive = s.key === status
                return (
                  <button key={s.key} disabled={stageSaving} onClick={() => changeStage(s.key)}
                    style={{
                      padding:'8px 10px',borderRadius:10,fontSize:11.5,fontWeight:700,cursor:'pointer',
                      border:'1.5px solid',textAlign:'center',display:'flex',alignItems:'center',gap:5,justifyContent:'center',
                      borderColor: isActive ? STAGE_COLOR[s.key] : isDone ? '#10B981' : '#E5E7EB',
                      background: isActive ? STAGE_COLOR[s.key] : isDone ? '#F0FDF4' : '#F9FAFB',
                      color: isActive ? 'white' : isDone ? '#059669' : '#9CA3AF',
                      transition:'all .15s',
                    }}>
                    <span style={{ fontSize:13 }}>{s.icon}</span>
                    {isActive ? s.short : isDone ? '✓ '+s.short : s.short}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom label */}
          {status === 'custom' && (
            <div>
              <label style={{ fontSize:11.5,fontWeight:700,color:'#4A2800',display:'block',marginBottom:8 }}>Custom Stage Name</label>
              <input value={customLabel} onChange={e=>setCustomLabel(e.target.value)}
                placeholder="e.g. Background Check, Offer Negotiation…"
                style={inp} onFocus={e=>e.target.style.borderColor='#FF6B2B'} onBlur={e=>e.target.style.borderColor='#DDD3CA'}/>
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={{ fontSize:11.5,fontWeight:700,color:'#4A2800',display:'block',marginBottom:8 }}>Notes & Comments</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4}
              placeholder="Interview feedback, next steps, recruiter contacts, follow-up dates…"
              style={{ ...inp, resize:'vertical', minHeight:90 }}
              onFocus={e=>e.target.style.borderColor='#FF6B2B'} onBlur={e=>e.target.style.borderColor='#DDD3CA'}/>
          </div>

          {/* Actions */}
          <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
            <button onClick={saveNotes} disabled={notesSaving}
              style={{ flex:1,padding:'11px 20px',background:'#FF6B2B',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',opacity:notesSaving?.7:1 }}>
              {notesSaving ? 'Saving…' : '💾 Save Notes'}
            </button>
            <button onClick={shareStatus}
              style={{ flex:1,padding:'11px 20px',background:'white',color:'#1A0800',border:'1.5px solid rgba(26,8,0,.12)',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#FF6B2B';e.currentTarget.style.color='#FF6B2B'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(26,8,0,.12)';e.currentTarget.style.color='#1A0800'}}>
              📤 Share Status
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

/* ── Job Card (Trending) ──────────────────────────────────── */
function JobCard({ job, alreadyApplied, onApply }) {
  const dept = job.department?.split(' ')[0]
  const icon = DEPT_ICON[dept] || '💼'
  const typeStyle = TYPE_COLOR[job.job_type] || TYPE_COLOR['Full-time']
  const sal = fmt(job.salary_min, job.salary_max, job.currency)

  return (
    <div style={{ background:'white', border:`1.5px solid ${alreadyApplied ? 'rgba(5,150,105,.25)' : 'rgba(26,8,0,.07)'}`, borderRadius:18, padding:'20px 22px', display:'flex', flexDirection:'column', gap:10, transition:'all .2s', cursor:'default' }}
      onMouseEnter={e=>{ if(!alreadyApplied){ e.currentTarget.style.borderColor='#FF6B2B'; e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 10px 28px rgba(255,107,43,.12)' }}}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor=alreadyApplied?'rgba(5,150,105,.25)':'rgba(26,8,0,.07)'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'flex-start',gap:12 }}>
        <div style={{ width:42,height:42,borderRadius:12,background:'rgba(255,107,43,.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>{icon}</div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontWeight:700,fontSize:'0.95rem',color:'#1A0800',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{job.title}</div>
          <div style={{ fontSize:11.5,color:'#8C7B6E',marginTop:2 }}>
            {[job.department, job.location].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
      {/* Tags */}
      <div style={{ display:'flex',gap:6,flexWrap:'wrap',alignItems:'center' }}>
        {job.job_type && (
          <span style={{ fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:20,...typeStyle }}>{job.job_type}</span>
        )}
        {sal && <span style={{ fontSize:11.5,fontWeight:600,color:'#FF6B2B' }}>{sal}</span>}
        {job.applications_count > 0 && (
          <span style={{ fontSize:11,color:'#8C7B6E',marginLeft:'auto' }}>👤 {job.applications_count} applied</span>
        )}
      </div>
      {/* Action */}
      {alreadyApplied ? (
        <div style={{ padding:'8px 14px',borderRadius:10,background:'rgba(5,150,105,.07)',color:'#059669',fontSize:12,fontWeight:600,textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
          <span>✓</span> <span>Applied</span>
        </div>
      ) : (
        <button onClick={() => onApply(job)} style={{ padding:'9px 14px',borderRadius:10,background:'#FF6B2B',color:'white',border:'none',fontSize:12.5,fontWeight:700,cursor:'pointer',transition:'all .15s' }}
          onMouseEnter={e=>e.currentTarget.style.background='#E55B1F'}
          onMouseLeave={e=>e.currentTarget.style.background='#FF6B2B'}>
          Apply Now
        </button>
      )}
    </div>
  )
}

/* ── In-Progress Card ─────────────────────────────────────── */
function InProgressCard({ app, onUpdate, onViewDetail }) {
  const [status, setStatus] = useState(app.user_status)
  const [saving, setSaving] = useState(false)
  const color = STAGE_COLOR[status] || '#6B7280'
  const label = status === 'custom' ? (app.custom_status || 'Custom') : PIPELINE.find(s => s.key === status)?.label || status
  const activeIdx = PIPELINE.findIndex(p => p.key === status)

  const changeStatus = async (key) => {
    if (key === status || saving) return
    const prev = status
    setStatus(key)
    setSaving(true)
    const { data } = await updateMyApplication(app.id, { user_status: key })
    setSaving(false)
    if (data) onUpdate(data)
    else setStatus(prev)
  }

  return (
    <div style={{ minWidth:230, maxWidth:270, background:'white', borderRadius:16, border:`1.5px solid ${color}35`, padding:'16px 18px', flexShrink:0, boxShadow:`0 4px 16px ${color}12` }}>
      {/* Job info */}
      <div style={{ fontSize:12.5,fontWeight:700,color:'#1A0800',marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{app.job_title}</div>
      <div style={{ fontSize:11,color:'#8C7B6E',marginBottom:10 }}>{[app.department,app.location].filter(Boolean).join(' · ')}</div>

      {/* Current status badge */}
      <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:10 }}>
        <div style={{ width:7,height:7,borderRadius:'50%',background:color,flexShrink:0,boxShadow:`0 0 0 3px ${color}25` }}/>
        <span style={{ fontSize:11.5,fontWeight:700,color }}>{label}</span>
        {saving && <span style={{ fontSize:10,color:'#8C7B6E',marginLeft:4 }}>saving…</span>}
      </div>

      {/* Progress bar */}
      <div style={{ display:'flex',gap:3,alignItems:'center',marginBottom:12 }}>
        {PIPELINE.map((s,i) => {
          const isDone = i < activeIdx
          const isActive = s.key === status
          return (
            <div key={s.key} title={s.label} style={{ flex:1,height:3,borderRadius:2,background: isDone ? '#10B981' : isActive ? color : '#E5E7EB',transition:'background .3s' }}/>
          )
        })}
      </div>

      {/* Stage pills */}
      <div style={{ fontSize:10,fontWeight:600,color:'#8C7B6E',marginBottom:6,textTransform:'uppercase',letterSpacing:'.06em' }}>Update Stage</div>
      <div style={{ display:'flex',flexWrap:'wrap',gap:4 }}>
        {PIPELINE.map((s,i) => {
          const isDone   = i < activeIdx
          const isActive = s.key === status
          return (
            <button key={s.key} onClick={() => changeStatus(s.key)} disabled={saving} title={s.label}
              style={{
                padding:'3px 8px', borderRadius:20, fontSize:10.5, fontWeight:600,
                border:'1.5px solid',
                borderColor: isActive ? STAGE_COLOR[s.key] : isDone ? '#10B981' : '#E5E7EB',
                background: isActive ? STAGE_COLOR[s.key] : isDone ? '#F0FDF4' : '#F9FAFB',
                color: isActive ? 'white' : isDone ? '#059669' : '#9CA3AF',
                cursor: saving ? 'default' : 'pointer', transition:'all .15s',
              }}>
              {isDone && !isActive ? '✓ ' : ''}{s.short}
            </button>
          )
        })}
      </div>

      <button onClick={() => onViewDetail(app)}
        style={{ width:'100%',marginTop:10,padding:'6px 10px',borderRadius:8,background:'rgba(255,107,43,.06)',color:'#FF6B2B',border:'1.5px solid rgba(255,107,43,.2)',fontSize:11.5,fontWeight:600,cursor:'pointer' }}>
        View Details →
      </button>
    </div>
  )
}

/* ── Application Row ──────────────────────────────────────── */
function AppRow({ app, onUpdate, onViewDetail }) {
  const [status, setStatus] = useState(app.user_status || 'applied')
  const color = STAGE_COLOR[status] || '#6B7280'
  const customLabel = app.custom_status || ''
  const label = status === 'custom' ? (customLabel || 'Custom') : PIPELINE.find(s => s.key === status)?.label

  return (
    <div style={{ background:'white',border:'1.5px solid rgba(26,8,0,.07)',borderRadius:14,overflow:'hidden',marginBottom:10 }}>
      <div style={{ padding:'14px 18px',display:'flex',alignItems:'center',gap:12,cursor:'default' }}>
        <div style={{ width:36,height:36,borderRadius:10,background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>
          {PIPELINE.find(s=>s.key===status)?.icon || '📄'}
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontWeight:600,fontSize:'0.9rem',color:'#1A0800',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{app.job_title}</div>
          <div style={{ fontSize:11,color:'#8C7B6E',marginTop:1 }}>
            {[app.department,app.location].filter(Boolean).join(' · ')} · Applied {new Date(app.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
          </div>
        </div>
        <span style={{ padding:'3px 10px',borderRadius:20,background:`${color}18`,color,fontSize:11,fontWeight:700,flexShrink:0 }}>{label}</span>
        <button onClick={() => onViewDetail(app)}
          style={{ padding:'5px 12px',borderRadius:8,background:'rgba(255,107,43,.06)',color:'#FF6B2B',border:'1.5px solid rgba(255,107,43,.15)',fontSize:11.5,fontWeight:600,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap' }}>
          Details →
        </button>
      </div>
    </div>
  )
}

/* ── Main Page ────────────────────────────────────────────── */
export default function Jobs() {
  const { profile } = useAuth()
  const [jobs, setJobs]         = useState(null)
  const [apps, setApps]         = useState(null)
  const [applyJob, setApplyJob] = useState(null)
  const [detailApp, setDetailApp] = useState(null)
  const [section, setSection]   = useState('all')

  useEffect(() => {
    getCareersJobs().then(({ data }) => setJobs(data || []))
    getMyApplications().then(({ data }) => setApps(data || []))
  }, [])

  const handleUpdate = useCallback(updated => {
    setApps(prev => prev?.map(a => a.id === updated.id ? { ...a, ...updated } : a))
    // If detail modal is open for this app, update its data too
    setDetailApp(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
  }, [])

  const appliedJobIds = new Set((apps || []).map(a => a.job_id))

  const handleApplySuccess = (job) => {
    setApps(prev => [{
      id: Date.now().toString(),
      job_id: job.id,
      job_title: job.title,
      department: job.department,
      location: job.location,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      currency: job.currency,
      user_status: 'applied',
      user_notes: '',
      custom_status: '',
      created_at: new Date().toISOString(),
    }, ...(prev || [])])
    setTimeout(() => getMyApplications().then(({ data }) => setApps(data || [])), 1200)
  }

  /* KPIs */
  const kpiTotal     = apps?.length ?? 0
  const kpiInterview = apps?.filter(a => ['interview_1','interview_2'].includes(a.user_status)).length ?? 0
  const kpiOffers    = apps?.filter(a => a.user_status === 'offer_received').length ?? 0

  /* Derived lists */
  const trendingJobs    = (jobs || []).slice().sort((a,b) => (b.applications_count||0) - (a.applications_count||0)).slice(0,8)
  const inProgressApps  = (apps || []).filter(a => IN_PROGRESS.includes(a.user_status))
  const filteredApps    = section === 'inprogress' ? inProgressApps
    : section === 'offers' ? (apps||[]).filter(a => a.user_status === 'offer_received')
    : (apps || [])

  return (
    <div style={{ padding:'24px 28px', maxWidth:1060, fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`
        @keyframes jobs-spin { to { transform:rotate(360deg) } }
        .jobs-sec-btn { padding:7px 16px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid rgba(26,8,0,.1);background:transparent;color:#8C7B6E;transition:all .15s;font-family:inherit }
        .jobs-sec-btn.active { background:#FF6B2B;color:white;border-color:#FF6B2B }
        .jobs-sec-btn:not(.active):hover { border-color:#FF6B2B;color:#FF6B2B }
        @media(max-width:600px){ .jobs-kpi-row{ flex-direction:column!important } .jobs-trending-grid{ grid-template-columns:1fr!important } }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.7rem', fontWeight:900, color:'#1A0800', margin:0, marginBottom:4 }}>Job Feed</h1>
        <p style={{ color:'#8C7B6E', fontSize:13.5, margin:0 }}>Browse open roles · Track your applications · Update your pipeline.</p>
      </div>

      {/* ── KPIs ── */}
      <div className="jobs-kpi-row" style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:32 }}>
        <Kpi icon="📋" value={apps===null ? '…' : kpiTotal}     label="Total Applied"    color="#3B82F6" />
        <Kpi icon="💬" value={apps===null ? '…' : kpiInterview} label="Taking Interview" color="#8B5CF6" />
        <Kpi icon="🎉" value={apps===null ? '…' : kpiOffers}    label="Offers Received"  color="#10B981" />
        <Kpi icon="🏢" value={jobs===null ? '…' : jobs.length}  label="Open Roles"       color="#FF6B2B" />
      </div>

      {/* ── Trending Jobs ── */}
      <section style={{ marginBottom:36 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:10.5,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#FF6B2B',marginBottom:4 }}>Hiring Now</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.35rem', fontWeight:800, color:'#1A0800', margin:0 }}>Trending Jobs</h2>
          </div>
        </div>

        {jobs === null && <Spinner />}

        {jobs?.length === 0 && (
          <div style={{ background:'white', border:'1.5px dashed rgba(255,107,43,.2)', borderRadius:16, padding:'28px', textAlign:'center', color:'#8C7B6E', fontSize:13.5 }}>
            No open roles at the moment — check back soon!
          </div>
        )}

        {jobs && jobs.length > 0 && (
          <div className="jobs-trending-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
            {trendingJobs.map(j => (
              <JobCard key={j.id} job={j} alreadyApplied={appliedJobIds.has(j.id)} onApply={setApplyJob} />
            ))}
          </div>
        )}
      </section>

      <AdSlot placement="jobs" variant="banner" />

      {/* ── In Progress ── */}
      {inProgressApps.length > 0 && (
        <section style={{ marginBottom:36 }}>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10.5,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#8B5CF6',marginBottom:4 }}>Active</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.35rem', fontWeight:800, color:'#1A0800', margin:0 }}>In Progress</h2>
          </div>
          <div style={{ display:'flex', gap:14, overflowX:'auto', paddingBottom:8, scrollbarWidth:'none' }}>
            {inProgressApps.map(a => (
              <InProgressCard key={a.id} app={a} onUpdate={handleUpdate} onViewDetail={setDetailApp} />
            ))}
          </div>
        </section>
      )}

      {/* ── My Applications ── */}
      <section>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontSize:10.5,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#3B82F6',marginBottom:4 }}>Tracker</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.35rem', fontWeight:800, color:'#1A0800', margin:0 }}>My Applications</h2>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button className={`jobs-sec-btn${section==='all'?' active':''}`} onClick={()=>setSection('all')}>All ({kpiTotal})</button>
            <button className={`jobs-sec-btn${section==='inprogress'?' active':''}`} onClick={()=>setSection('inprogress')}>In Progress ({inProgressApps.length})</button>
            <button className={`jobs-sec-btn${section==='offers'?' active':''}`} onClick={()=>setSection('offers')}>Offers ({kpiOffers})</button>
          </div>
        </div>

        {apps === null && <Spinner />}

        {apps?.length === 0 && (
          <div style={{ background:'white', border:'1.5px dashed rgba(26,8,0,.1)', borderRadius:16, padding:'28px', textAlign:'center', color:'#8C7B6E', fontSize:13.5 }}>
            You haven't applied to any jobs yet. Browse Trending Jobs above to get started!
          </div>
        )}

        {filteredApps.length === 0 && apps?.length > 0 && (
          <div style={{ background:'white', border:'1.5px dashed rgba(26,8,0,.1)', borderRadius:14, padding:'20px', textAlign:'center', color:'#8C7B6E', fontSize:13 }}>
            No applications in this category yet.
          </div>
        )}

        {filteredApps.map(a => (
          <AppRow key={a.id} app={a} onUpdate={handleUpdate} onViewDetail={setDetailApp} />
        ))}
      </section>

      {/* ── Apply Modal ── */}
      {applyJob && (
        <ApplyModal
          job={applyJob}
          userProfile={profile}
          onClose={() => setApplyJob(null)}
          onSuccess={handleApplySuccess}
        />
      )}

      {/* ── Application Detail Modal ── */}
      {detailApp && (
        <AppDetailModal
          app={detailApp}
          onClose={() => setDetailApp(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  )
}
