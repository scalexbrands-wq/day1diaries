import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getGroups, createGroup } from '../lib/api'
import { getInitials, getAvatarColor } from '../components/Sidebar'
import { toast } from '../components/Toast'
import GroupAudiencePicker from '../components/GroupAudiencePicker'

const TOPIC_CATEGORIES = [
  'First Day at Job', 'First Startup Experience', 'First Business Client',
  'First College Day', 'First Failure', 'First Success', 'Habit Transformation',
]

function CreateGroupModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', topic_category: '', allowed_audiences: ['everyone'], custom_usernames: '' })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Give your group a name'); return }
    if (form.allowed_audiences.length === 0) { toast.error('Pick at least one audience, or choose Everyone'); return }
    setSaving(true)
    const { data, error } = await createGroup({
      ...form,
      custom_usernames: form.custom_usernames.split(',').map(u => u.trim()).filter(Boolean),
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Group created! 🎉')
    onCreated(data)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,8,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }} onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 460, margin: 'auto', padding: 24 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', fontWeight: 900, color: '#1A0800', margin: '0 0 18px' }}>
          Start a Group
        </h3>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Group Name</label>
            <input className="form-control" placeholder="e.g. First-Time Founders" value={form.name} onChange={set('name')} />
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea className="form-control" placeholder="What's this group about?" value={form.description} onChange={set('description')} style={{ minHeight: 80 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Topic Category (optional)</label>
            <select className="form-control" value={form.topic_category} onChange={set('topic_category')}>
              <option value="">No specific topic</option>
              {TOPIC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <GroupAudiencePicker value={form} onChange={setForm} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner spinner-sm" /> : 'Create Group →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function GroupCard({ group, navigate }) {
  return (
    <div className="card" style={{ padding: 18, cursor: 'pointer', transition: 'all .15s' }} onClick={() => navigate(`/groups/${group.slug}`)}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF6B2B'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-100)'; e.currentTarget.style.transform = 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div className="avatar avatar-sm" style={{ background: getAvatarColor(group.name), color: 'white', flexShrink: 0 }}>
          {group.cover_image_url ? <img src={group.cover_image_url} alt=""  loading="lazy" /> : getInitials(group.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A0800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</div>
          {group.topic_category && <div style={{ fontSize: 11, color: '#FF6B2B' }}>{group.topic_category}</div>}
        </div>
        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: group.visibility === 'private' ? 'rgba(124,58,237,.1)' : 'rgba(5,150,105,.1)', color: group.visibility === 'private' ? '#7C3AED' : '#059669' }}>
          {group.visibility === 'private' ? '🔒 Restricted' : '🌍 Everyone'}
        </span>
      </div>
      {group.description && (
        <p style={{ fontSize: 12.5, color: '#4A2800', lineHeight: 1.5, margin: '0 0 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {group.description}
        </p>
      )}
      <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: '#8C7B6E' }}>
        <span>👥 {(group.member_count || 0).toLocaleString()} members</span>
        <span>📖 {(group.story_count || 0).toLocaleString()} stories</span>
      </div>
    </div>
  )
}

export default function Groups() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const load = () => {
    setLoading(true)
    getGroups({ search: search || undefined, topic_category: topicFilter || undefined }).then(({ data }) => {
      setGroups(data || [])
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [topicFilter]) // eslint-disable-line
  useEffect(() => {
    const t = setTimeout(load, 300) // debounce search typing
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line

  return (
    <div style={{ padding: '20px 16px', maxWidth: 960, margin: '0 auto' }}>
      <style>{`
        .grp-header { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:18px; flex-wrap:wrap; }
        .grp-filters { display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap; }
        .grp-search { flex:1; min-width:200px; }
        .grp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; }
        @media(max-width:560px){
          .grp-header { flex-direction:column; align-items:flex-start; }
          .grp-filters { flex-direction:column; }
          .grp-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="grp-header">
        <div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 900, color: '#1A0800', margin: 0 }}>Groups</h2>
          <p style={{ color: '#8C7B6E', fontSize: 13, margin: '4px 0 0' }}>Find your people, share Day 1s with a smaller circle.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Group</button>
      </div>

      <div className="grp-filters">
        <input className="form-control grp-search" placeholder="Search groups..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-control" style={{ width: 'auto', minWidth: 180 }} value={topicFilter} onChange={e => setTopicFilter(e.target.value)}>
          <option value="">All topics</option>
          {TOPIC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🌍</div>
          <h3>No groups found</h3>
          <p>Be the first to start one around a topic you care about.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Group</button>
        </div>
      ) : (
        <div className="grp-grid">
          {groups.map(g => <GroupCard key={g.id} group={g} navigate={navigate} />)}
        </div>
      )}

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={(group) => { setShowCreate(false); navigate(`/groups/${group.slug}`) }}
        />
      )}
    </div>
  )
}
