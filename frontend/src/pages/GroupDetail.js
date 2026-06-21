import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getGroup, getGroupStories, joinGroup, leaveGroup, inviteToGroup, updateGroup } from '../lib/api'
import { getInitials, getAvatarColor } from '../components/Sidebar'
import { toast } from '../components/Toast'
import StoryCard from '../components/StoryCard'
import GroupAudiencePicker from '../components/GroupAudiencePicker'

function EditAudienceModal({ group, onClose, onSaved }) {
  const [form, setForm] = useState({
    allowed_audiences: Array.isArray(group.allowed_audiences) ? group.allowed_audiences : ['everyone'],
    custom_usernames: '',
  })
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (form.allowed_audiences.length === 0) { toast.error('Pick at least one audience, or choose Everyone'); return }
    setSaving(true)
    const { data, error } = await updateGroup(group.id, {
      allowed_audiences: form.allowed_audiences,
      custom_usernames: form.custom_usernames.split(',').map(u => u.trim()).filter(Boolean),
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Group visibility updated')
    onSaved(data)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,8,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }} onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 460, margin: 'auto', padding: 24 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', fontWeight: 900, color: '#1A0800', margin: '0 0 14px' }}>Group Visibility</h3>
        <form onSubmit={submit}>
          <GroupAudiencePicker value={form} onChange={setForm} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function InviteModal({ groupId, onClose }) {
  const [username, setUsername] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!username.trim()) return
    setSending(true)
    const { error } = await inviteToGroup(groupId, username.trim())
    setSending(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Invite sent to @${username.trim()}`)
    setUsername('')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,8,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 380, margin: 'auto', padding: 22 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.05rem', fontWeight: 900, color: '#1A0800', margin: '0 0 14px' }}>Invite to Group</h3>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-control" placeholder="e.g. priya" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? 'Sending…' : 'Send Invite'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function GroupDetail() {
  const { slug } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [group, setGroup] = useState(null)
  const [myRole, setMyRole] = useState(null)
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [storiesLoading, setStoriesLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [joining, setJoining] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [showEditAudience, setShowEditAudience] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getGroup(slug).then(({ data, error }) => {
      if (error || !data) { setNotFound(true); setLoading(false); return }
      setGroup(data.group)
      setMyRole(data.myRole)
      setLoading(false)
    })
  }, [slug])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!group) return
    setStoriesLoading(true)
    getGroupStories(group.id).then(({ data }) => {
      setStories(data || [])
      setStoriesLoading(false)
    })
  }, [group])

  const handleJoin = async () => {
    if (!user) { navigate('/login'); return }
    setJoining(true)
    const { data, error } = await joinGroup(group.id)
    setJoining(false)
    if (error) { toast.error(error.message); return }
    if (data?.alreadyMember) { toast.info('You\'re already in this group'); }
    else toast.success('Joined! 🎉')
    setMyRole('member')
    setGroup(g => ({ ...g, member_count: (g.member_count || 0) + (data?.alreadyMember ? 0 : 1) }))
  }

  const handleLeave = async () => {
    if (!window.confirm(`Leave ${group.name}?`)) return
    const { error } = await leaveGroup(group.id)
    if (error) { toast.error(error.message); return }
    toast.success('You left the group')
    setMyRole(null)
    setGroup(g => ({ ...g, member_count: Math.max((g.member_count || 1) - 1, 0) }))
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  if (notFound) {
    return (
      <div style={{ padding: '40px 16px', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>Group not found</h3>
          <p>It may be private, or the link might be wrong.</p>
          <button className="btn btn-primary" onClick={() => navigate('/groups')}>← Back to Groups</button>
        </div>
      </div>
    )
  }

  const isMember = !!myRole
  const canInvite = ['owner', 'moderator'].includes(myRole)

  return (
    <div style={{ padding: '20px 16px', maxWidth: 960, margin: '0 auto' }}>
      <style>{`
        .grpd-header { display:flex; gap:16px; align-items:flex-start; margin-bottom:20px; flex-wrap:wrap; }
        .grpd-actions { display:flex; gap:8px; flex-wrap:wrap; }
        @media(max-width:480px){
          .grpd-header { flex-direction:column; }
          .grpd-actions { width:100%; }
          .grpd-actions .btn { flex:1; }
        }
      `}</style>

      <div className="grpd-header">
        <div className="avatar" style={{ width: 64, height: 64, fontSize: 22, background: getAvatarColor(group.name), color: 'white', flexShrink: 0 }}>
          {group.cover_image_url ? <img src={group.cover_image_url} alt=""  loading="lazy" /> : getInitials(group.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.35rem', fontWeight: 900, color: '#1A0800', margin: 0 }}>{group.name}</h2>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 100, background: group.visibility === 'private' ? 'rgba(124,58,237,.1)' : 'rgba(5,150,105,.1)', color: group.visibility === 'private' ? '#7C3AED' : '#059669' }}>
              {group.visibility === 'private' ? '🔒 Private' : '🌍 Public'}
            </span>
          </div>
          {group.topic_category && <div style={{ fontSize: 12, color: '#FF6B2B', marginTop: 2 }}>{group.topic_category}</div>}
          {group.description && <p style={{ fontSize: 13, color: '#4A2800', lineHeight: 1.6, margin: '8px 0' }}>{group.description}</p>}
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#8C7B6E', marginTop: 6 }}>
            <span>👥 {(group.member_count || 0).toLocaleString()} members</span>
            <span>📖 {(group.story_count || 0).toLocaleString()} stories</span>
          </div>
        </div>
        <div className="grpd-actions">
          {myRole === 'owner' && <button className="btn btn-secondary btn-sm" onClick={() => setShowEditAudience(true)}>⚙ Visibility</button>}
          {canInvite && <button className="btn btn-secondary btn-sm" onClick={() => setShowInvite(true)}>+ Invite</button>}
          {isMember ? (
            myRole !== 'owner' && <button className="btn btn-secondary btn-sm" onClick={handleLeave}>Leave Group</button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={handleJoin} disabled={joining}>
              {joining ? 'Joining…' : 'Join Group'}
            </button>
          )}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 18 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A0800', marginBottom: 14 }}>Stories in this group</h3>
        {storiesLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : stories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No stories yet</h3>
            <p>{isMember ? 'Be the first to share a Day 1 with this group.' : 'Join to see and share stories here.'}</p>
            {isMember && <button className="btn btn-primary" onClick={() => navigate(`/write?group=${group.id}`)}>Share a Story</button>}
          </div>
        ) : (
          <div className="story-list-grid">
            {stories.map(s => <StoryCard key={s.id} story={s} />)}
          </div>
        )}
      </div>

      {showInvite && <InviteModal groupId={group.id} onClose={() => setShowInvite(false)} />}
      {showEditAudience && (
        <EditAudienceModal
          group={group}
          onClose={() => setShowEditAudience(false)}
          onSaved={(updated) => { setGroup(g => ({ ...g, ...updated })); setShowEditAudience(false) }}
        />
      )}
    </div>
  )
}
