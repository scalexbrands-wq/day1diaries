import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getStory, getComments, addComment, toggleLike, toggleSave, deleteStory, unlockStory, getMyCoins } from '../lib/api'
import { getInitials, getAvatarColor } from '../components/Sidebar'
import { toast } from '../components/Toast'
import { formatDistanceToNow } from 'date-fns'

export default function StoryDetail() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [story, setStory] = useState(null)
  const [comments, setComments] = useState([])
  const [comment, setComment] = useState('')
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [unlocking, setUnlocking] = useState(false)
  const [coins, setCoins] = useState(null)

  useEffect(() => {
    getStory(id).then(({ data }) => { setStory(data); setLoading(false) })
    getComments(id).then(({ data }) => setComments(data || []))
    getMyCoins().then(({ data }) => setCoins(data))
  }, [id])

  const handleUnlock = async () => {
    setUnlocking(true)
    const { data, error } = await unlockStory(id)
    setUnlocking(false)
    if (error) { toast.error(error.message || 'Not enough coins'); return }
    toast.success('Story unlocked! 🎉')
    // Reload story now unlocked
    getStory(id).then(({ data: s }) => setStory(s))
    getMyCoins().then(({ data: c }) => setCoins(c))
  }

  const handleLike = async () => {
    const { liked: l } = await toggleLike(user.id, id)
    setLiked(l)
    setStory(s => ({ ...s, likes_count: l ? s.likes_count+1 : s.likes_count-1 }))
  }

  const handleSave = async () => {
    const { saved: s } = await toggleSave(user.id, id)
    setSaved(s)
    toast.success(s ? 'Saved!' : 'Removed from saved')
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    const { data } = await addComment({ story_id:id, user_id:user.id, content:comment })
    if (data) { setComments(c => [...c, data]); setComment('') }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this story?')) return
    await deleteStory(id)
    toast.success('Story deleted')
    navigate('/feed')
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>
  if (!story) return <div className="empty-state"><h3>Story not found</h3><button className="btn btn-primary" onClick={() => navigate('/discover')}>Browse Stories</button></div>

  const author = story.profiles || {}
  const isOwner = user.id === story.user_id
  const isAdmin = profile?.role === 'admin'

  return (
    <div style={{ padding:'16px', maxWidth:720 }}>
      {/* Back */}
      <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom:20 }}>← Back</button>

      {/* Story */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-body" style={{ padding:'28px 32px' }}>
          {/* Category & tags */}
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
            <span className="badge badge-orange">{story.category}</span>
            {story.tags?.map(t => <span key={t} className="tag">#{t}</span>)}
          </div>

          {/* Title */}
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'clamp(1.6rem,3vw,2.2rem)', fontWeight:900, marginBottom:16, lineHeight:1.2 }}>{story.title}</h1>

          {/* Author */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24, paddingBottom:20, borderBottom:'1px solid var(--gray-100)' }}>
            <div className="avatar avatar-md" style={{ background:getAvatarColor(author.full_name||''), color:'white', cursor:'pointer' }} onClick={() => navigate(`/profile/${author.username}`)}>
              {author.avatar_url ? <img src={author.avatar_url} alt={author.full_name}/> : getInitials(author.full_name||author.username||'?')}
            </div>
            <div>
              <div style={{ fontWeight:600, cursor:'pointer' }} onClick={() => navigate(`/profile/${author.username}`)}>{author.full_name || author.username}</div>
              <div style={{ fontSize:'12px', color:'var(--gray-400)' }}>
                {story.created_at ? formatDistanceToNow(new Date(story.created_at), {addSuffix:true}) : ''} · {author.bio?.slice(0,60) || ''}
              </div>
            </div>
            {(isOwner || isAdmin) && (
              <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                {isOwner && <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/edit/${id}`)}>Edit</button>}
                <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
              </div>
            )}
          </div>

          {/* Content */}
          {story.image_url && <img src={story.image_url} alt="" style={{ width:'100%', borderRadius:10, marginBottom:20, maxHeight:400, objectFit:'cover' }} />}
          <div style={{ fontSize:'16px', lineHeight:1.85, color:'var(--ink-soft)', whiteSpace:'pre-wrap' }}>{story.content}</div>

          {/* Actions */}
          <div style={{ display:'flex', gap:16, marginTop:28, paddingTop:20, borderTop:'1px solid var(--gray-100)' }}>
            <button className={`story-action ${liked?'liked':''}`} onClick={handleLike} style={{ fontSize:'14px', gap:6 }}>
              <svg width="18" height="18" fill={liked?'currentColor':'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/></svg>
              {(story.likes_count||0).toLocaleString()} likes
            </button>
            <button className="story-action" style={{ fontSize:'14px', gap:6 }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z"/></svg>
              {comments.length} comments
            </button>
            <button className={`story-action ${saved?'liked':''}`} onClick={handleSave} style={{ fontSize:'14px', gap:6 }}>
              <svg width="18" height="18" fill={saved?'currentColor':'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"/></svg>
              {saved ? 'Saved' : 'Save'}
            </button>
            <button className="story-action" style={{ fontSize:'14px', gap:6 }} onClick={async () => { await navigator.clipboard?.writeText(window.location.href); toast.success('Link copied!') }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"/></svg>
              Share
            </button>
          </div>
        </div>
      </div>}

      {/* Comments */}
      <div id="comments" className="card">
        <div className="card-header"><h3 style={{ fontSize:'15px' }}>Comments ({comments.length})</h3></div>
        <div className="card-body">
          <form onSubmit={handleComment} style={{ display:'flex', gap:10, marginBottom:20 }}>
            <div className="avatar avatar-sm" style={{ background:getAvatarColor(profile?.full_name||''), color:'white', flexShrink:0 }}>
              {getInitials(profile?.full_name||profile?.username||'?')}
            </div>
            <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add your thoughts..." className="form-control" style={{ flex:1 }} />
            <button type="submit" className="btn btn-primary btn-sm">Post</button>
          </form>
          {comments.map(c => {
            const ca = c.profiles||{}
            return (
              <div key={c.id} style={{ display:'flex', gap:10, marginBottom:16 }}>
                <div className="avatar avatar-sm" style={{ background:getAvatarColor(ca.full_name||''), color:'white', flexShrink:0, cursor:'pointer' }} onClick={() => navigate(`/profile/${ca.username}`)}>
                  {ca.avatar_url ? <img src={ca.avatar_url} alt=""/> : getInitials(ca.full_name||ca.username||'?')}
                </div>
                <div>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:3 }}>
                    <span style={{ fontSize:'13px', fontWeight:600, cursor:'pointer' }} onClick={() => navigate(`/profile/${ca.username}`)}>{ca.full_name||ca.username}</span>
                    <span style={{ fontSize:'11px', color:'var(--gray-400)' }}>{formatDistanceToNow(new Date(c.created_at), {addSuffix:true})}</span>
                  </div>
                  <div style={{ fontSize:'13px', color:'var(--ink-soft)', lineHeight:1.6 }}>{c.content}</div>
                </div>
              </div>
            )
          })}
          {comments.length === 0 && <div style={{ textAlign:'center', color:'var(--gray-400)', fontSize:'13px', padding:'20px 0' }}>Be the first to comment!</div>}
        </div>
      </div>
    </div>
  )
}
