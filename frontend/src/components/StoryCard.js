import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { toggleLike, toggleSave, shareStory, unlockStory, getStoryTranslation } from '../lib/api'
import { getInitials, getAvatarColor } from './Sidebar'
import { toast } from './Toast'
import { formatDistanceToNow } from 'date-fns'
import SurpriseAFriendButton from './SurpriseAFriendButton'

// memo'd — Feed/Discover render dozens of these per page, and most stay
// unchanged across re-renders triggered by unrelated state (toasts,
// sidebar widgets, pagination appends); skipping their re-render when
// `story`/callback props are referentially stable is the difference
// between a scroll-triggered append touching 1 card or all of them.
function StoryCard({ story, onLikeUpdate, isLocked: isLockedProp, onUnlock }) {
  const { user } = useAuth()
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [likes, setLikes] = useState(story.likes_count || 0)
  const [shares, setShares] = useState(story.shares_count || 0)
  const [unlocking, setUnlocking] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [translated, setTranslated] = useState(null)

  // Live AWS Translate of the story body, swapped in whenever the user
  // switches language — original text is never edited, just displayed.
  useEffect(() => {
    if (i18n.language === 'en') { setTranslated(null); return }
    let active = true
    getStoryTranslation(story.id, i18n.language).then(({ data }) => {
      if (active && data) setTranslated(data)
    })
    return () => { active = false }
  }, [i18n.language, story.id])

  const displayTitle = translated?.title || story.title
  const displayContent = translated?.content || story.content

  const author = story.profiles || {}
  const timeAgo = story.created_at
    ? formatDistanceToNow(new Date(story.created_at), { addSuffix: true })
    : ''

  // A story from a private-account user is locked for non-owners who haven't unlocked it
  const isPrivateAuthor = author.is_private === true
  const isOwner = user?.id === story.user_id
  const isLocked = !unlocked && !isOwner && (isLockedProp !== undefined ? isLockedProp : isPrivateAuthor)

  const handleLike = async (e) => {
    e.stopPropagation()
    if (!user) return toast.error('Sign in to like stories')
    const result = await toggleLike(user.id, story.id)
    setLiked(result.liked)
    setLikes(l => result.liked ? l + 1 : l - 1)
    onLikeUpdate?.()
  }

  const handleSave = async (e) => {
    e.stopPropagation()
    if (!user) return toast.error('Sign in to save stories')
    const result = await toggleSave(user.id, story.id)
    setSaved(result.saved)
    toast.success(result.saved ? 'Story saved!' : 'Removed from saved')
  }

  const handleShare = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(window.location.origin + '/story/' + story.id)
      toast.success('Link copied!')
    } catch {
      toast.info('Share: /story/' + story.id)
    }
    // Award share points if signed in
    if (user) {
      try {
        const { data } = await shareStory(story.id)
        if (data?.shares_count !== undefined) setShares(data.shares_count)
        toast.success('+10 points for sharing!')
      } catch (_) {}
    }
  }

  const handleUnlock = async (e) => {
    e?.stopPropagation()
    if (!user) return toast.error('Sign in to unlock stories')
    if (unlocking) return
    setUnlocking(true)
    try {
      const { data, error } = await unlockStory(story.id)
      if (error) {
        toast.error(error.message || 'Not enough points to unlock')
        return
      }
      setUnlocked(true)
      if (data?.coinsSpent > 0) {
        toast.success(`Story unlocked! Spent ${data.coinsSpent} points`)
      }
      if (onUnlock) onUnlock(story.id)
      navigate(`/story/${story.id}`)
    } finally {
      setUnlocking(false)
    }
  }

  const handleCardClick = () => {
    if (isLocked) return // handled by the overlay button
    navigate(`/story/${story.id}`)
  }

  return (
    <div className={`story-card ${story.audio_url ? 'story-card-voice' : 'story-card-text-full'}`} onClick={handleCardClick}>
      {/* ── Creative lock overlay ── */}
      {isLocked && (
        <div className="story-lock-overlay" onClick={e => e.stopPropagation()}>
          <div className="story-lock-panel">
            <div className="story-lock-ring">
              <span className="story-lock-icon-emoji">🔐</span>
            </div>
            <span className="story-lock-badge">🔒 Private Account</span>
            <p className="story-lock-heading">This story is locked</p>
            <p className="story-lock-desc">
              Unlock to read {author.full_name || author.username}'s full story
            </p>
            <div className="story-lock-cost">
              <span className="story-lock-coin">🪙</span>
              <span>10 points to unlock</span>
            </div>
            <button
              className="story-lock-btn"
              onClick={handleUnlock}
              disabled={unlocking}
            >
              {unlocking ? '⏳ Unlocking…' : '🔓 Unlock Story'}
            </button>
          </div>
        </div>
      )}

      {/* Header — always fully visible even when locked */}
      <div className="story-card-head">
        <div
          className="avatar avatar-sm"
          style={{ background: getAvatarColor(author.full_name || author.username || ''), color: 'white', cursor: 'pointer', flexShrink: 0 }}
          onClick={(e) => { e.stopPropagation(); navigate(`/profile/${author.username}`) }}
        >
          {author.avatar_url
            ? <img src={author.avatar_url} alt={author.full_name}  loading="lazy" />
            : getInitials(author.full_name || author.username || '?')}
        </div>
        <div className="story-card-meta">
          <div
            className="story-card-author"
            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${author.username}`) }}
            style={{ cursor: 'pointer' }}
          >
            <span className="story-card-author-name" title={author.full_name || author.username}>
              {author.full_name || author.username}
            </span>
            {isPrivateAuthor && <span className="story-private-badge" title="Private account">🔒</span>}
          </div>
          <div className="story-card-time">{timeAgo}</div>
        </div>
        <div className="story-card-cat" title={story.category}>{story.category}</div>
      </div>

      {story.company && (
        <div
          className="story-company-badge"
          title={story.company.name}
          onClick={(e) => { e.stopPropagation(); navigate(`/companies/${story.company.slug}`) }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8, cursor: 'pointer', fontSize: 12, color: '#FF6B2B', fontWeight: 600 }}
        >
          {story.company.logo_url
            ? <img src={story.company.logo_url} alt="" style={{ width: 16, height: 16, borderRadius: 4, objectFit: 'cover' }} />
            : <span>🏢</span>}
          {story.company.name}
        </div>
      )}

      {/* Title — visible when locked to tease the reader */}
      <div className="story-card-title" title={displayTitle}>{displayTitle}</div>

      {/* Voice story — audio player + pending-transcription placeholder */}
      {story.audio_url && !isLocked && (
        <div onClick={e => e.stopPropagation()} style={{ marginBottom: 10 }}>
          <audio controls src={story.audio_url} style={{ width: '100%', height: 36 }} />
          {story.transcript_status === 'pending' && (
            <div style={{ fontSize: 11, color: '#8C7B6E', marginTop: 6 }}>🎙️ Transcribing...</div>
          )}
        </div>
      )}

      {/* Body — blurred when locked */}
      <div className={`story-card-text${isLocked ? ' story-locked-blur' : ''}`}>
        {story.audio_url && story.transcript_status === 'pending' ? '' : displayContent}
      </div>

      {story.cover_image_url && (
        <div className={isLocked ? 'story-locked-blur' : ''} style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', maxHeight: 200 }}>
          <img src={story.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}  loading="lazy" />
        </div>
      )}

      {/* Footer — hidden below lock overlay when locked */}
      {!isLocked && (
        <div className="story-card-footer">
          <button className={`story-action ${liked ? 'liked' : ''}`} onClick={handleLike} title="Like">
            <svg fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/>
            </svg>
            {likes.toLocaleString()}
          </button>
          <button className="story-action" onClick={(e) => { e.stopPropagation(); navigate(`/story/${story.id}#comments`) }} title="Comment">
            <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z"/>
            </svg>
            {(story.comments_count || 0).toLocaleString()}
          </button>
          <button className="story-action" onClick={handleShare} title="Share (+10 pts)">
            <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"/>
            </svg>
            {shares > 0 ? shares.toLocaleString() : 'Share'}
          </button>
          <button className={`story-action story-action-save ${saved ? 'liked' : ''}`} onClick={handleSave} title="Save">
            <svg fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"/>
            </svg>
          </button>
          <SurpriseAFriendButton storyId={story.id} storyTitle={story.title} authorName={author.full_name} compact />
          {story.tags?.length > 0 && (
            <div className="story-tags">
              {story.tags.slice(0, 2).map(t => <span key={t} className="tag">#{t}</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default React.memo(StoryCard)
