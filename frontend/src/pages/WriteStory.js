import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createStory, updateStory, getStory, getStoryCategories, getMyGroups, getAudioUploadUrl, getCompanies } from '../lib/api'
import { toast } from '../components/Toast'

const DEFAULT_CATS = [
  {name:'First Day at Job',icon:'💼'},{name:'First Startup Experience',icon:'🚀'},
  {name:'First Business Client',icon:'🤝'},{name:'First College Day',icon:'🎓'},
  {name:'First Failure',icon:'💪'},{name:'First Success',icon:'🏆'},
  {name:'Habit Transformation',icon:'🔄'},
]

const VISIBILITY_OPTIONS = [
  { value:'public',         icon:'🌍', label:'Public',          desc:'Anyone can see this story' },
  { value:'followers_only', icon:'👥', label:'Followers only',  desc:'Only your followers can see this' },
  { value:'private',        icon:'🔒', label:'Private',         desc:'Only you can see this' },
]

const MAX_RECORDING_SECONDS = 180

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function WriteStory() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [cats, setCats] = useState(DEFAULT_CATS)
  const [groups, setGroups] = useState([])
  const [companies, setCompanies] = useState([])
  const [mode, setMode] = useState('write') // 'write' | 'record'
  const [form, setForm] = useState({
    title:'', content:'', category:'First Day at Job',
    tags:'', cover_image_url:'', visibility:'public',
    group_id: searchParams.get('group') || '',
    company_id: '',
  })
  const [loading, setLoading] = useState(false)
  const [loadingStory, setLoadingStory] = useState(!!id)

  // ── Voice recording state ──
  const [recState, setRecState] = useState('idle') // idle | recording | recorded
  const [recSeconds, setRecSeconds] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    getStoryCategories().then(({ data }) => { if (data?.length) setCats(data) })
    getMyGroups().then(({ data }) => setGroups(data || []))
    getCompanies().then(({ data }) => setCompanies(data || []))
  }, [])

  useEffect(() => {
    if (id) {
      getStory(id).then(({ data }) => {
        if (data) setForm({
          title: data.title,
          content: data.content,
          category: data.category,
          tags: (data.tags||[]).join(', '),
          cover_image_url: data.cover_image_url || '',
          visibility: data.visibility || 'public',
          group_id: data.group_id || '',
          company_id: data.company_id || '',
        })
        setLoadingStory(false)
      })
    }
  }, [id])

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioPreviewUrl(URL.createObjectURL(blob))
        setRecState('recorded')
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecState('recording')
      setRecSeconds(0)
      timerRef.current = setInterval(() => {
        setRecSeconds(s => {
          if (s + 1 >= MAX_RECORDING_SECONDS) {
            stopRecording()
            return MAX_RECORDING_SECONDS
          }
          return s + 1
        })
      }, 1000)
    } catch (err) {
      toast.error('Could not access your microphone. Check browser permissions.')
    }
  }

  const stopRecording = () => {
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
  }

  const reRecord = () => {
    setAudioBlob(null)
    setAudioPreviewUrl(null)
    setRecSeconds(0)
    setRecState('idle')
  }

  const handleSubmit = async (status = 'published') => {
    if (!form.title.trim()) { toast.error('Add a title to your story'); return }

    let audioFields = {}
    if (mode === 'record') {
      if (!audioBlob) { toast.error('Record your story first, or switch to Write mode'); return }
      setLoading(true)
      const { data: uploadData, error: uploadUrlErr } = await getAudioUploadUrl(audioBlob.type)
      if (uploadUrlErr) { setLoading(false); toast.error(uploadUrlErr.message); return }
      try {
        const putRes = await fetch(uploadData.uploadUrl, { method: 'PUT', body: audioBlob, headers: { 'Content-Type': audioBlob.type } })
        if (!putRes.ok) throw new Error('Upload failed')
      } catch (err) {
        setLoading(false); toast.error('Could not upload your recording. Try again.'); return
      }
      audioFields = { audio_url: uploadData.audioUrl, audio_duration_seconds: recSeconds }
    } else {
      if (form.content.trim().length < 100) { toast.error('Story should be at least 100 characters'); return }
      setLoading(true)
    }

    const tags = form.tags.split(',').map(t => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean)
    const payload = {
      title: form.title,
      content: form.content,
      category: form.category,
      tags,
      cover_image_url: form.cover_image_url || null,
      visibility: form.visibility,
      group_id: form.group_id || null,
      company_id: form.company_id || null,
      status,
      user_id: user.id,
      ...audioFields,
    }
    const { data, error } = id ? await updateStory(id, payload) : await createStory(payload)
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success(status === 'draft' ? 'Draft saved!' : 'Story published! 🎉')
    navigate(status === 'draft' ? '/feed' : `/story/${data.id}`)
  }

  if (loadingStory) return <div className="loading-center"><div className="spinner"/></div>
  const wordCount = form.content.trim().split(/\s+/).filter(Boolean).length

  return (
    <div style={{ padding:'20px 16px', maxWidth:720, margin:'0 auto' }}>
      <style>{`
        .ws-row2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px; }
        .ws-vis { display:flex; gap:8px; flex-wrap:wrap; }
        .ws-mode-toggle { display:flex; gap:8px; margin-bottom:18px; }
        .ws-mode-btn { flex:1; padding:10px 14px; border-radius:10px; border:1.5px solid #DDD3CA; background:white; cursor:pointer; font-size:13px; font-weight:600; font-family:'DM Sans',sans-serif; transition:all .15s; }
        .ws-mode-btn.active { border-color:#FF6B2B; background:rgba(255,107,43,.06); color:#FF6B2B; }
        @media(max-width:560px){
          .ws-row2 { grid-template-columns:1fr !important; }
          .ws-vis { flex-direction:column !important; }
        }
      `}</style>

      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.3rem', fontWeight:900, color:'#1A0800', marginBottom:20, marginTop:0 }}>
        {id ? 'Edit Story' : 'Share Your Story'}
      </h2>

      {!id && (
        <div className="ws-mode-toggle">
          <button className={`ws-mode-btn ${mode === 'write' ? 'active' : ''}`} onClick={() => setMode('write')}>✍️ Write</button>
          <button className={`ws-mode-btn ${mode === 'record' ? 'active' : ''}`} onClick={() => setMode('record')}>🎙️ Record</button>
        </div>
      )}

      {/* Category + Tags */}
      <div className="ws-row2">
        <div className="form-group" style={{ marginBottom:0 }}>
          <label className="form-label">Category</label>
          <select className="form-control" value={form.category} onChange={set('category')}>
            {cats.map(c => <option key={c.name} value={c.name}>{c.icon||''} {c.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom:0 }}>
          <label className="form-label">Tags (comma-separated)</label>
          <input type="text" className="form-control" placeholder="FirstJob, Day1, Tech" value={form.tags} onChange={set('tags')} />
        </div>
      </div>

      {/* Group */}
      {groups.length > 0 && (
        <div className="form-group">
          <label className="form-label">Post to a Group (optional)</label>
          <select className="form-control" value={form.group_id} onChange={set('group_id')}>
            <option value="">No group — just my feed</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      )}

      {/* Company */}
      {companies.length > 0 && (
        <div className="form-group">
          <label className="form-label">Link a company (optional)</label>
          <select className="form-control" value={form.company_id} onChange={set('company_id')}>
            <option value="">No company</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {/* Visibility */}
      <div className="form-group">
        <label className="form-label">Who can see this?</label>
        <div className="ws-vis">
          {VISIBILITY_OPTIONS.map(opt => (
            <label key={opt.value} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', border:`1.5px solid ${form.visibility===opt.value?'#FF6B2B':'#DDD3CA'}`, borderRadius:10, cursor:'pointer', background:form.visibility===opt.value?'rgba(255,107,43,.06)':'white', flex:1, minWidth:130, transition:'all .15s' }}>
              <input type="radio" name="visibility" value={opt.value} checked={form.visibility===opt.value} onChange={set('visibility')} style={{ display:'none' }}/>
              <span style={{ fontSize:16 }}>{opt.icon}</span>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:form.visibility===opt.value?'#FF6B2B':'#1A0800' }}>{opt.label}</div>
                <div style={{ fontSize:10, color:'#8C7B6E' }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Cover Image */}
      <div className="form-group">
        <label className="form-label">Cover Image URL (optional)</label>
        <input type="text" className="form-control" placeholder="https://example.com/image.jpg" value={form.cover_image_url} onChange={set('cover_image_url')} />
        {form.cover_image_url && (
          <img src={form.cover_image_url} alt="Preview" style={{ width:'100%', maxHeight:180, objectFit:'cover', borderRadius:10, marginTop:8 }} onError={e=>e.target.style.display='none'} loading="lazy" />
        )}
      </div>

      {/* Title */}
      <div className="form-group">
        <label className="form-label">Story Title</label>
        <input type="text" className="form-control" placeholder="Give your story a powerful headline..." value={form.title} onChange={set('title')} style={{ fontSize:'15px', padding:'11px 14px' }} />
        <div style={{ fontSize:'11px', color:'var(--gray-400)', marginTop:4 }}>{form.title.length}/200 characters</div>
      </div>

      {/* Content — Write mode */}
      {mode === 'write' && (
        <div className="form-group">
          <label className="form-label">Your Story</label>
          <textarea
            className="form-control"
            placeholder="Start writing... Be honest. Be raw. Be you.&#10;&#10;Tell us:&#10;• What happened on that day?&#10;• How did you feel?&#10;• What did you learn?&#10;• What advice would you give someone in your shoes?"
            value={form.content}
            onChange={set('content')}
            style={{ minHeight:280, lineHeight:1.8, fontSize:'14px' }}
          />
          <div style={{ fontSize:'11px', color:'var(--gray-400)', marginTop:4, display:'flex', justifyContent:'space-between' }}>
            <span>{wordCount} words</span>
            <span style={{ color: wordCount > 100 ? 'var(--success)' : 'var(--gray-400)' }}>
              {wordCount < 100 ? `${100-wordCount} more words to go` : '✓ Good length'}
            </span>
          </div>
        </div>
      )}

      {/* Recording — Record mode */}
      {mode === 'record' && (
        <div className="form-group">
          <label className="form-label">Record Your Story</label>
          <div style={{ background:'var(--gray-50)', border:'1.5px solid var(--gray-100)', borderRadius:14, padding:24, textAlign:'center' }}>
            {recState === 'idle' && (
              <>
                <button onClick={startRecording} style={{ width:64, height:64, borderRadius:'50%', background:'#FF6B2B', border:'none', color:'white', fontSize:24, cursor:'pointer', boxShadow:'0 4px 14px rgba(255,107,43,.35)' }}>
                  🎙️
                </button>
                <div style={{ fontSize:12, color:'#8C7B6E', marginTop:10 }}>Tap to start recording (up to 3 minutes)</div>
              </>
            )}
            {recState === 'recording' && (
              <>
                <button onClick={stopRecording} style={{ width:64, height:64, borderRadius:'50%', background:'#DC2626', border:'none', color:'white', fontSize:22, cursor:'pointer', animation:'pulse 1.4s infinite', boxShadow:'0 4px 14px rgba(220,38,38,.35)' }}>
                  ⏹
                </button>
                <div style={{ fontSize:18, fontWeight:700, color:'#1A0800', marginTop:10, fontFamily:"'DM Sans',sans-serif" }}>{formatTime(recSeconds)}</div>
                <div style={{ fontSize:12, color:'#8C7B6E' }}>Recording... tap to stop</div>
                <style>{`@keyframes pulse { 0%,100%{ opacity:1 } 50%{ opacity:.6 } }`}</style>
              </>
            )}
            {recState === 'recorded' && (
              <>
                <audio controls src={audioPreviewUrl} style={{ width:'100%', marginBottom:12 }} />
                <div style={{ fontSize:12, color:'#8C7B6E', marginBottom:12 }}>{formatTime(recSeconds)} recorded</div>
                <button className="btn btn-secondary btn-sm" onClick={reRecord}>🔁 Re-record</button>
              </>
            )}
          </div>
          <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:8 }}>
            We'll transcribe your recording automatically once it's published — you can edit the transcript afterwards.
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap', marginTop:8 }}>
        <button className="btn btn-secondary" onClick={() => handleSubmit('draft')} disabled={loading}>Save as Draft</button>
        <button className="btn btn-primary" onClick={() => handleSubmit('published')} disabled={loading}>
          {loading ? <span className="spinner spinner-sm"/> : (id ? 'Update Story' : 'Publish Story →')}
        </button>
      </div>

      {/* Writing tips */}
      <div style={{ marginTop:28, background:'var(--gray-50)', borderRadius:12, padding:18, border:'1px solid var(--gray-100)' }}>
        <div style={{ fontSize:'12px', fontWeight:600, marginBottom:10 }}>💡 Writing Tips</div>
        {[
          'Start with the moment — not the background. Drop us right into Day 1.',
          'Be specific. "I sat in the wrong seat in a board meeting" beats "I was nervous."',
          'Include the emotion. Readers connect with feelings, not facts.',
          'End with a lesson. What would you tell someone about to have their Day 1?',
        ].map(t => (
          <div key={t} style={{ fontSize:'11px', color:'var(--gray-400)', marginBottom:5, paddingLeft:10, borderLeft:'2px solid var(--orange)' }}>{t}</div>
        ))}
      </div>
    </div>
  )
}
