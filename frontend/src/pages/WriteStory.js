import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createStory, updateStory, getStory, getStoryCategories } from '../lib/api'
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

export default function WriteStory() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const [cats, setCats] = useState(DEFAULT_CATS)
  const [form, setForm] = useState({
    title:'', content:'', category:'First Day at Job',
    tags:'', cover_image_url:'', visibility:'public'
  })
  const [loading, setLoading] = useState(false)
  const [loadingStory, setLoadingStory] = useState(!!id)

  useEffect(() => {
    getStoryCategories().then(({ data }) => { if (data?.length) setCats(data) })
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
        })
        setLoadingStory(false)
      })
    }
  }, [id])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (status = 'published') => {
    if (!form.title.trim()) { toast.error('Add a title to your story'); return }
    if (form.content.trim().length < 100) { toast.error('Story should be at least 100 characters'); return }
    setLoading(true)
    const tags = form.tags.split(',').map(t => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean)
    const payload = {
      title: form.title,
      content: form.content,
      category: form.category,
      tags,
      cover_image_url: form.cover_image_url || null,
      visibility: form.visibility,
      status,
      user_id: user.id,
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
        @media(max-width:560px){
          .ws-row2 { grid-template-columns:1fr !important; }
          .ws-vis { flex-direction:column !important; }
        }
      `}</style>

      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.3rem', fontWeight:900, color:'#1A0800', marginBottom:20, marginTop:0 }}>
        {id ? 'Edit Story' : 'Share Your Story'}
      </h2>

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
          <img src={form.cover_image_url} alt="Preview" style={{ width:'100%', maxHeight:180, objectFit:'cover', borderRadius:10, marginTop:8 }} onError={e=>e.target.style.display='none'}/>
        )}
      </div>

      {/* Title */}
      <div className="form-group">
        <label className="form-label">Story Title</label>
        <input type="text" className="form-control" placeholder="Give your story a powerful headline..." value={form.title} onChange={set('title')} style={{ fontSize:'15px', padding:'11px 14px' }} />
        <div style={{ fontSize:'11px', color:'var(--gray-400)', marginTop:4 }}>{form.title.length}/200 characters</div>
      </div>

      {/* Content */}
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
