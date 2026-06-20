import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getStory, getComments, addComment, toggleLike, toggleSave, deleteStory, unlockStory, getMyCoins, recordStoryView, getStories } from '../lib/api'
import { getInitials, getAvatarColor } from '../components/Sidebar'
import { toast } from '../components/Toast'
import ShareButton, { storyShareText } from '../components/ShareButton'
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
  const [unlocked, setUnlocked] = useState(false)
  const [coins, setCoins] = useState(null)
  const [recentStories, setRecentStories] = useState([])

  useEffect(() => {
    getStory(id).then(({ data }) => {
      setStory(data)
      setLoading(false)
      // Track read — only for other users' stories
      if (user && data?.user_id && data.user_id !== user.id) {
        recordStoryView(id)
      }
    })
    getComments(id).then(({ data }) => setComments(data || []))
    if (user) getMyCoins().then(({ data }) => setCoins(data))
    getStories({ limit: 5 }).then(({ data }) => {
      const filtered = (data || []).filter(s => s.id !== id).slice(0, 4)
      setRecentStories(filtered)
    })
  }, [id, user])

  const handleUnlock = async () => {
    if (unlocking) return
    if (!user) return requireSignIn()
    setUnlocking(true)
    const { data, error } = await unlockStory(id)
    setUnlocking(false)
    if (error) { toast.error(error.message || 'Not enough points'); return }
    setUnlocked(true)
    if (data?.coinsSpent > 0) toast.success(`Story unlocked! Spent ${data.coinsSpent} points 🎉`)
    if (data?.coins !== undefined) setCoins(data.coins)
    getMyCoins().then(({ data: c }) => setCoins(c))
  }

  const requireSignIn = () => {
    toast.error('Sign in to continue')
    navigate('/login', { state: { from: `/story/${id}` } })
  }

  const handleLike = async () => {
    if (!user) return requireSignIn()
    const { liked: l } = await toggleLike(user.id, id)
    setLiked(l)
    setStory(s => ({ ...s, likes_count: l ? (s.likes_count || 0) + 1 : (s.likes_count || 0) - 1 }))
  }

  const handleSave = async () => {
    if (!user) return requireSignIn()
    const { saved: s } = await toggleSave(user.id, id)
    setSaved(s)
    toast.success(s ? 'Story saved!' : 'Removed from saved')
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!user) return requireSignIn()
    if (!comment.trim()) return
    const { data } = await addComment({ story_id: id, user_id: user.id, content: comment })
    if (data) { setComments(c => [...c, data]); setComment('') }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this story?')) return
    await deleteStory(id)
    toast.success('Story deleted')
    navigate('/feed')
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (!story) return (
    <div className="empty-state">
      <div className="empty-state-icon">📖</div>
      <h3>Story not found</h3>
      <button className="btn btn-primary" onClick={() => navigate('/discover')}>Browse Stories</button>
    </div>
  )

  const author = story.profiles || {}
  const isOwner = user?.id === story.user_id
  const isAdmin = profile?.role === 'admin'

  // Lock gate: private author + not owner + not unlocked this session
  const isPrivateAuthor = author.is_private === true
  const isLocked = isPrivateAuthor && !isOwner && !unlocked

  const timeAgo = story.created_at
    ? formatDistanceToNow(new Date(story.created_at), { addSuffix: true })
    : ''

  return (
    <div style={{ padding: '16px', maxWidth: 1080, margin: '0 auto', fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @keyframes sd-in { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        .sd-card { background:white; border:1px solid #F0EAE4; border-radius:20px; margin-bottom:20px; animation:sd-in .4s ease both; }
        .sd-card-body { padding:28px 32px; }
        @media(max-width:540px) { .sd-card-body { padding:20px 18px !important; } }
        .sd-title { font-family:'Playfair Display',serif; font-size:clamp(1.5rem,4vw,2rem); font-weight:900; line-height:1.2; color:#1A0800; margin:0 0 16px; word-break:break-word; overflow-wrap:anywhere; }
        .sd-content { font-size:16px; line-height:1.9; color:#4A2800; white-space:pre-wrap; word-break:break-word; overflow-wrap:anywhere; }
        .sd-comment-text { font-size:13.5px; color:#4A2800; line-height:1.65; word-break:break-word; overflow-wrap:anywhere; }
        .sd-comment-name { font-size:13px; font-weight:700; cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:160px; }
        .sd-author-name { font-weight:700; font-size:15px; cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .sd-author-sub { font-size:12px; color:#8C7B6E; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .sd-layout { display:grid; grid-template-columns:1fr 280px; gap:24px; align-items:start; }
        .sd-sidebar-sticky { position:sticky; top:24px; }
        @media(max-width:860px) { .sd-layout { grid-template-columns:1fr; } .sd-sidebar { order:99; } .sd-sidebar-sticky { position:static; } }
        .sd-recent-item { display:flex; flex-direction:column; gap:4px; padding:12px 0; border-bottom:1px solid #F5EFE9; cursor:pointer; transition:background .15s; }
        .sd-recent-item:last-child { border-bottom:none; padding-bottom:0; }
        .sd-recent-item:hover .sd-recent-title { color:#FF6B2B; }
        .sd-recent-title { font-size:13.5px; font-weight:700; color:#1A0800; line-height:1.35; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; transition:color .15s; }
        .sd-recent-meta { font-size:11.5px; color:#8C7B6E; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      `}</style>

      {/* Back button */}
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => navigate(-1)}
        style={{ marginBottom: 20 }}
      >
        ← Back
      </button>

      <div className="sd-layout">

      {/* ── Main column ── */}
      <div>

      {/* ── Story card ── */}
      <div className="sd-card" style={{ animationDelay: '0s' }}>
        <div className="sd-card-body">
          {/* Category + tags */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {story.category && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
                background: 'rgba(255,107,43,.1)', color: '#FF6B2B',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180,
              }}>
                {story.category}
              </span>
            )}
            {story.tags?.map(t => (
              <span key={t} className="tag" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
                #{t}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="sd-title">{story.title}</h1>

          {/* Author row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 24, paddingBottom: 20,
            borderBottom: '1px solid #F0EAE4',
            flexWrap: 'wrap',
          }}>
            <div
              className="avatar avatar-md"
              style={{ background: getAvatarColor(author.full_name || ''), color: 'white', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => navigate(`/profile/${author.username}`)}
            >
              {author.avatar_url
                ? <img src={author.avatar_url} alt={author.full_name} />
                : getInitials(author.full_name || author.username || '?')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sd-author-name" onClick={() => navigate(`/profile/${author.username}`)}>
                {author.full_name || author.username}
              </div>
              <div className="sd-author-sub">{timeAgo}{author.is_private ? ' · 🔒 Private' : ''}</div>
            </div>
            {(isOwner || isAdmin) && (
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                {isOwner && (
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/edit/${id}`)}>Edit</button>
                )}
                <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
              </div>
            )}
          </div>

          {/* ── Locked gate ── */}
          {isLocked ? (
            <div style={{
              textAlign: 'center', padding: '40px 24px',
              background: 'linear-gradient(135deg, rgba(255,107,43,.04), rgba(255,209,102,.08))',
              borderRadius: 16, border: '1.5px dashed rgba(255,107,43,.25)',
            }}>
              <div style={{ fontSize: 52, marginBottom: 12, lineHeight: 1 }}>🔐</div>
              <h3 style={{ fontFamily: "'Playfair Display',serif", margin: '0 0 8px', fontSize: '1.2rem' }}>
                Private Story
              </h3>
              <p style={{ color: '#8C7B6E', fontSize: 13.5, margin: '0 0 6px' }}>
                This story is from a private account
              </p>
              {coins !== null && (
                <p style={{ color: '#B45309', fontWeight: 700, fontSize: 13, margin: '0 0 20px' }}>
                  🪙 You have {coins} points · Costs 10 points to unlock
                </p>
              )}
              <button
                onClick={handleUnlock}
                disabled={unlocking}
                style={{
                  padding: '11px 28px',
                  background: 'linear-gradient(135deg,#FF6B2B,#FF8C42)',
                  color: 'white', border: 'none', borderRadius: 12,
                  fontSize: 14, fontWeight: 700, cursor: unlocking ? 'default' : 'pointer',
                  boxShadow: '0 4px 14px rgba(255,107,43,.35)',
                  opacity: unlocking ? .7 : 1,
                }}
              >
                {unlocking ? '⏳ Unlocking…' : '🔓 Unlock Story for 10 points'}
              </button>
            </div>
          ) : (
            <>
              {/* Cover image */}
              {story.cover_image_url && (
                <img
                  src={story.cover_image_url}
                  alt=""
                  style={{ width: '100%', borderRadius: 12, marginBottom: 22, maxHeight: 420, objectFit: 'cover' }}
                />
              )}

              {/* Story content */}
              <div className="sd-content">{story.content}</div>

              {/* Action bar */}
              <div style={{
                display: 'flex', gap: 8, marginTop: 28, paddingTop: 20,
                borderTop: '1px solid #F0EAE4', flexWrap: 'wrap',
              }}>
                <button
                  className={`story-action ${liked ? 'liked' : ''}`}
                  onClick={handleLike}
                  style={{ fontSize: 13.5, gap: 6, padding: '6px 12px', borderRadius: 100, background: liked ? 'rgba(255,107,43,.08)' : 'transparent', border: '1px solid rgba(26,8,0,.08)' }}
                >
                  <svg width="16" height="16" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                  </svg>
                  {(story.likes_count || 0).toLocaleString()} Likes
                </button>
                <button
                  className="story-action"
                  style={{ fontSize: 13.5, gap: 6, padding: '6px 12px', borderRadius: 100, background: 'transparent', border: '1px solid rgba(26,8,0,.08)' }}
                  onClick={() => document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                  </svg>
                  {comments.length} Comments
                </button>
                <button
                  className={`story-action ${saved ? 'liked' : ''}`}
                  onClick={handleSave}
                  style={{ fontSize: 13.5, gap: 6, padding: '6px 12px', borderRadius: 100, background: saved ? 'rgba(255,107,43,.08)' : 'transparent', border: '1px solid rgba(26,8,0,.08)' }}
                >
                  <svg width="16" height="16" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                  </svg>
                  {saved ? 'Saved' : 'Save'}
                </button>
                <div style={{ marginLeft: 'auto' }}>
                  <ShareButton
                    text={storyShareText(story.title, id)}
                    url={`https://d1kxji3yv78nbx.cloudfront.net/story/${id}`}
                    label="Share"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Comments ── */}
      {!isLocked && (
        <div id="comments" className="sd-card" style={{ animationDelay: '.1s' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #F0EAE4' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              Comments <span style={{ color: '#8C7B6E', fontWeight: 500 }}>({comments.length})</span>
            </h3>
          </div>
          <div style={{ padding: '20px 24px' }}>
            {/* Add comment */}
            {!user ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', background: 'rgba(255,107,43,.06)', borderRadius: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5, color: '#4A2800' }}>Sign in to join the conversation</span>
                <button className="btn btn-primary btn-sm" onClick={requireSignIn}>Sign In</button>
              </div>
            ) : (
            <form onSubmit={handleComment} style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              <div
                className="avatar avatar-sm"
                style={{ background: getAvatarColor(profile?.full_name || ''), color: 'white', flexShrink: 0 }}
              >
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" />
                  : getInitials(profile?.full_name || profile?.username || '?')}
              </div>
              <input
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add your thoughts…"
                className="form-control"
                style={{ flex: 1, minWidth: 0 }}
              />
              <button type="submit" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>Post</button>
            </form>
            )}

            {/* Comment list */}
            {comments.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8C7B6E', fontSize: 13.5, padding: '20px 0' }}>
                Be the first to comment! 💬
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {comments.map(c => {
                  const ca = c.profiles || {}
                  return (
                    <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div
                        className="avatar avatar-sm"
                        style={{ background: getAvatarColor(ca.full_name || ''), color: 'white', flexShrink: 0, cursor: 'pointer' }}
                        onClick={() => navigate(`/profile/${ca.username}`)}
                      >
                        {ca.avatar_url
                          ? <img src={ca.avatar_url} alt="" />
                          : getInitials(ca.full_name || ca.username || '?')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                          <span
                            className="sd-comment-name"
                            onClick={() => navigate(`/profile/${ca.username}`)}
                          >
                            {ca.full_name || ca.username}
                          </span>
                          <span style={{ fontSize: 11, color: '#B0A8A0', whiteSpace: 'nowrap' }}>
                            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="sd-comment-text">{c.content}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      </div>{/* end main column */}

      {/* ── Right sidebar ── */}
      {recentStories.length > 0 && (
        <div className="sd-sidebar">
          <div className="sd-card sd-sidebar-sticky" style={{ animationDelay: '.15s' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0EAE4' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1A0800' }}>
                Recent Stories
              </h3>
            </div>
            <div style={{ padding: '4px 20px 16px' }}>
              {recentStories.map(s => {
                const a = s.profiles || {}
                return (
                  <div
                    key={s.id}
                    className="sd-recent-item"
                    onClick={() => navigate(`/story/${s.id}`)}
                  >
                    {s.category && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                        background: 'rgba(255,107,43,.08)', color: '#FF6B2B',
                        alignSelf: 'flex-start',
                      }}>
                        {s.category}
                      </span>
                    )}
                    <div className="sd-recent-title">{s.title}</div>
                    <div className="sd-recent-meta">
                      {a.full_name || a.username || 'Unknown'}
                      {s.created_at && ` · ${formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}`}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      </div>{/* end sd-layout */}
    </div>
  )
}
