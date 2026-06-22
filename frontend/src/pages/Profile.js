import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getProfileByUsername, adminSetRole, getStories,
  toggleFollowFixed, getFollow, updateProfile,
  getProfileLiveCounts, getMyCoins, uploadProfileAvatar, uploadProfileBanner,
} from '../lib/api'
import { getInitials, getAvatarColor } from '../components/Sidebar'
import { toast } from '../components/Toast'
import { formatDistanceToNow } from 'date-fns'
import ShareButton, { profileShareText, profileShareUrl } from '../components/ShareButton'
import ProfileQRCard from '../components/ProfileQRCard'
import ProfileFirstStoryShareCard from '../components/ProfileFirstStoryShareCard'
import Seo from '../components/Seo'
import SurpriseAFriendButton from '../components/SurpriseAFriendButton'

const LEVELS = {
  Beginner:'🥉', Explorer:'🥈', Achiever:'🥇',
  Hero:'🏆', 'Super Hero':'🔥', Legend:'👑',
  'Habit Master':'🔥', 'Community Champion':'🌟',
}

/* ── Mini story card for profile grid ──────────────────────── */
function ProfileStoryCard({ story, onClick, authorName }) {
  const hasImage = !!story.cover_image_url
  const accentColor = getAvatarColor(story.category || story.title || '')
  const timeAgo = story.created_at
    ? formatDistanceToNow(new Date(story.created_at), { addSuffix: true })
    : ''

  return (
    <div
      onClick={() => onClick(story.id)}
      style={{
        background: 'white',
        borderRadius: 16,
        border: '1.5px solid rgba(26,8,0,.07)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all .2s',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#FF6B2B'
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = '0 10px 28px rgba(255,107,43,.12)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(26,8,0,.07)'
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = ''
      }}
    >
      {/* Cover strip or image */}
      {hasImage ? (
        <div style={{ height: 120, overflow: 'hidden', flexShrink: 0 }}>
          <img
            src={story.cover_image_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
           loading="lazy" />
        </div>
      ) : (
        <div style={{
          height: 6, flexShrink: 0,
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)`,
        }} />
      )}

      {/* Card body */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {/* Category */}
        {story.category && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#FF6B2B',
            background: 'rgba(255,107,43,.08)', borderRadius: 100,
            padding: '2px 8px', alignSelf: 'flex-start',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}>
            {story.category}
          </span>
        )}

        {/* Title */}
        <div style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: 14, fontWeight: 700, color: '#1A0800',
          lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', wordBreak: 'break-word',
        }}>
          {story.title}
        </div>

        {/* Excerpt */}
        <div style={{
          fontSize: 12.5, color: '#8C7B6E', lineHeight: 1.55,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', wordBreak: 'break-word', flex: 1,
        }}>
          {story.content}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          paddingTop: 8, borderTop: '1px solid rgba(26,8,0,.05)',
          flexWrap: 'wrap', rowGap: 4,
        }}>
          <span style={{ fontSize: 11, color: '#B0A8A0', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {timeAgo}
          </span>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#B0A8A0', display: 'flex', alignItems: 'center', gap: 3 }}>
              ❤️ {(story.likes_count || 0).toLocaleString()}
            </span>
            <span style={{ fontSize: 11, color: '#B0A8A0', display: 'flex', alignItems: 'center', gap: 3 }}>
              💬 {(story.comments_count || 0).toLocaleString()}
            </span>
            <span onClick={e => e.stopPropagation()}>
              <SurpriseAFriendButton storyId={story.id} storyTitle={story.title} authorName={authorName} compact />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Stat chip ─────────────────────────────────────────────── */
function Stat({ value, label }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 16px', background: 'rgba(255,107,43,.05)', borderRadius: 12, minWidth: 72, flex: '1 1 72px' }}>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.25rem', fontWeight: 800, color: '#FF6B2B', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: '#8C7B6E', marginTop: 3, whiteSpace: 'nowrap' }}>{label}</div>
    </div>
  )
}

/* ── Main ──────────────────────────────────────────────────── */
export default function Profile() {
  const { username } = useParams()
  const { user, profile: myProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [stories, setStories] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [coins, setCoins] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  const isMe = myProfile?.username === username
  const isAdmin = myProfile?.role === 'admin'

  const loadProfile = async () => {
    setLoading(true)
    const { data } = await getProfileByUsername(username)
    if (!data) { setLoading(false); return }
    const { data: counts } = await getProfileLiveCounts(data.username)
    setProfile({ ...data, ...(counts || {}) })
    const { data: s } = await getStories({ userId: data.id, limit: 30 })
    setStories(s || [])
    if (!isMe && user?.id && data.id) {
      const { data: f } = await getFollow(user.id, data.id)
      setIsFollowing(!!f)
    }
    setLoading(false)
  }

  useEffect(() => { loadProfile() }, [username, user?.id])
  useEffect(() => { if (isMe) getMyCoins().then(({ data }) => setCoins(data)) }, [isMe])

  const handleFollow = async () => {
    if (!user?.id || !profile?.id || followLoading) return
    setFollowLoading(true)
    const { following } = await toggleFollowFixed(user.id, profile.id)
    setIsFollowing(following)
    const { data: counts } = await getProfileLiveCounts(profile.id)
    setProfile(p => ({ ...p, ...(counts || {}) }))
    toast.success(following ? `Following ${profile.full_name || profile.username}!` : 'Unfollowed')
    setFollowLoading(false)
  }

  const handleSaveEdit = async () => {
    const { error } = await updateProfile({ ...editForm })
    if (error) return toast.error(error.message)
    setProfile(p => ({ ...p, ...editForm }))
    refreshProfile()
    setEditing(false)
    toast.success('Profile updated!')
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingAvatar(true)
    const { data, error } = await uploadProfileAvatar(file)
    setUploadingAvatar(false)
    if (error) return toast.error(error.message)
    setEditForm(f => ({ ...f, avatar_url: data }))
    toast.success('Profile picture uploaded')
  }

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingBanner(true)
    const { data, error } = await uploadProfileBanner(file)
    setUploadingBanner(false)
    if (error) return toast.error(error.message)
    setEditForm(f => ({ ...f, banner_url: data }))
    toast.success('Banner uploaded')
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (!profile) return (
    <div className="empty-state">
      <div className="empty-state-icon">👤</div>
      <h3>User not found</h3>
      <button className="btn btn-primary" onClick={() => navigate('/discover')}>Browse Stories</button>
    </div>
  )

  const avatarBg = getAvatarColor(profile.full_name || profile.username || '')

  return (
    <div style={{ maxWidth: 860, padding: '0 0 32px' }}>
      <Seo
        title={`${profile.full_name || profile.username} on Day1 Diaries`}
        description={profile.bio || `Check out ${profile.full_name || profile.username}'s journey on Day1 Diaries.`}
        image={profile.avatar_url}
        path={`/profile/${profile.username}`}
      />
      <style>{`
        @keyframes prof-in { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        .prof-story-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
        @media(max-width:540px) { .prof-story-grid { grid-template-columns:1fr !important; } }
        .prof-stats-row { display:flex; gap:10px; flex-wrap:wrap; }
      `}</style>

      {/* ── Banner + avatar ── */}
      <div style={{ position: 'relative', marginBottom: 64, animation: 'prof-in .5s ease both' }}>
        {/* Banner — uploaded image if set, otherwise the gradient fallback */}
        <div style={{
          height: 160, borderRadius: '0 0 24px 24px',
          background: profile.banner_url
            ? `url(${profile.banner_url}) center/cover`
            : `linear-gradient(135deg, ${avatarBg}cc, ${avatarBg}44, rgba(255,209,102,.3))`,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative circles — only over the gradient fallback */}
          {!profile.banner_url && (
            <>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 180, height: 180, borderRadius: '50%', background: `${avatarBg}25` }} />
              <div style={{ position: 'absolute', bottom: -40, left: 60, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,209,102,.18)' }} />
            </>
          )}
        </div>

        {/* Avatar + follow row */}
        <div style={{ position: 'absolute', bottom: -52, left: 24, right: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          {/* Avatar */}
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            border: '4px solid white',
            background: avatarBg, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, flexShrink: 0,
            boxShadow: '0 4px 16px rgba(26,8,0,.15)',
            overflow: 'hidden',
          }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}  loading="lazy" />
              : getInitials(profile.full_name || profile.username || '?')
            }
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, paddingBottom: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {isMe ? (
              <>
                {coins !== null && (
                  <div style={{ padding: '6px 14px', background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 100, fontSize: 12.5, fontWeight: 700, color: '#92400E' }}>
                    🪙 {coins} points
                  </div>
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setEditing(true)
                    setEditForm({
                      is_private: profile.is_private || false, full_name: profile.full_name || '', bio: profile.bio || '', location: profile.location || '',
                      avatar_url: profile.avatar_url || '', banner_url: profile.banner_url || '',
                    })
                  }}
                >
                  ✏️ Edit Profile
                </button>
                <ShareButton
                  text={profileShareText(profile.full_name || profile.username, profile.username, profile.bio)}
                  url={profileShareUrl(profile.username)}
                  label="Share"
                  size="sm"
                />
                <ProfileQRCard profile={profile} />
                <ProfileFirstStoryShareCard profile={profile} />
              </>
            ) : (
              <>
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`btn btn-sm ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                  style={{ minWidth: 100 }}
                >
                  {followLoading ? '…' : isFollowing ? '✓ Following' : '+ Follow'}
                </button>
                <ShareButton
                  text={profileShareText(profile.full_name || profile.username, profile.username, profile.bio)}
                  url={profileShareUrl(profile.username)}
                  label="Share"
                  size="sm"
                />
                <ProfileQRCard profile={profile} />
                <ProfileFirstStoryShareCard profile={profile} />
                {isAdmin && (
                  <button className="btn btn-secondary btn-sm" onClick={async () => {
                    const newRole = profile.role === 'contributor' ? 'user' : 'contributor'
                    const { error } = await adminSetRole(profile.id, newRole)
                    if (!error) { setProfile(p => ({ ...p, role: newRole })); toast.success(`Role set to ${newRole}`) }
                  }}>
                    {profile.role === 'contributor' ? 'Remove Contributor' : 'Make Contributor'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Profile info ── */}
      <div style={{ padding: '0 24px', marginBottom: 20, animation: 'prof-in .5s .1s ease both' }}>
        {/* Name + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <h2 style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 'clamp(1.2rem,3vw,1.6rem)', fontWeight: 900, color: '#1A0800',
            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
          }}>
            {profile.full_name || profile.username}
          </h2>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, background: 'rgba(255,107,43,.1)', color: '#FF6B2B', fontWeight: 700, flexShrink: 0 }}>
            {LEVELS[profile.level] || '🥉'} {profile.level}
          </span>
          {profile.role === 'admin' && (
            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 100, background: 'rgba(124,58,237,.1)', color: '#7C3AED', fontWeight: 700, flexShrink: 0 }}>ADMIN</span>
          )}
          {profile.role === 'contributor' && (
            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 100, background: 'rgba(5,150,105,.1)', color: '#059669', fontWeight: 700, flexShrink: 0 }}>CONTRIBUTOR</span>
          )}
          {profile.is_private && (
            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 100, background: 'rgba(107,114,128,.08)', color: '#6B7280', fontWeight: 700, flexShrink: 0 }}>🔒 Private</span>
          )}
        </div>

        {/* Username + location */}
        <div style={{ fontSize: 13, color: '#8C7B6E', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          @{profile.username}
          {profile.location && <span> · 📍 {profile.location}</span>}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p style={{
            fontSize: 14, lineHeight: 1.65, color: '#4A2800',
            marginBottom: 16, marginTop: 0,
            wordBreak: 'break-word', overflowWrap: 'anywhere',
          }}>
            {profile.bio}
          </p>
        )}

        {/* Stats */}
        <div className="prof-stats-row">
          <Stat value={profile.stories_count || 0}                         label="Stories" />
          <Stat value={(profile.followers_count || 0).toLocaleString()}    label="Followers" />
          <Stat value={(profile.following_count || 0).toLocaleString()}    label="Following" />
          <Stat value={(profile.likes_received || 0).toLocaleString()}     label="Likes" />
          {isMe && <Stat value={(profile.stories_read || 0).toLocaleString()}       label="Stories Read" />}
          {isMe && <Stat value={(profile.score || 0).toLocaleString()}              label="Points" />}
        </div>

        {!isMe && (
          <div style={{ marginTop: 14 }}>
            <SurpriseAFriendButton lockedAuthorUsername={profile.username} authorName={profile.full_name || profile.username} size="md" fullWidth />
          </div>
        )}
      </div>

      {/* ── Stories grid ── */}
      <div style={{ padding: '0 24px', animation: 'prof-in .5s .18s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10 }}>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', fontWeight: 800, color: '#1A0800', margin: 0 }}>
            {isMe ? 'My Stories' : `Stories by ${profile.full_name || profile.username}`}
            {stories.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#8C7B6E', marginLeft: 8 }}>({stories.length})</span>
            )}
          </h3>
          {isMe && (
            <button
              onClick={() => navigate('/write')}
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0 }}
            >
              + New Story
            </button>
          )}
        </div>

        {stories.length === 0 ? (
          <div style={{
            background: 'white', border: '1.5px dashed rgba(255,107,43,.2)',
            borderRadius: 20, padding: '40px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✍️</div>
            <h3 style={{ fontFamily: "'Playfair Display',serif", margin: '0 0 8px', fontSize: '1.1rem' }}>
              {isMe ? 'Share your first story' : 'No stories yet'}
            </h3>
            <p style={{ color: '#8C7B6E', fontSize: 13.5, margin: '0 0 16px' }}>
              {isMe ? "Your journey starts with Day 1." : `${profile.full_name || profile.username} hasn't posted yet.`}
            </p>
            {isMe && (
              <button className="btn btn-primary" onClick={() => navigate('/write')}>
                Write My Day 1 Story
              </button>
            )}
          </div>
        ) : (
          <div className="prof-story-grid">
            {stories.map(s => (
              <ProfileStoryCard
                key={s.id}
                story={s}
                authorName={profile.full_name || profile.username}
                onClick={(id) => navigate(`/story/${id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Edit modal ── */}
      {editing && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Profile</h3>
              <button className="close-btn" onClick={() => setEditing(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Banner Image</label>
                <div style={{
                  height: 100, borderRadius: 12, marginBottom: 8, overflow: 'hidden', position: 'relative',
                  background: editForm.banner_url ? `url(${editForm.banner_url}) center/cover` : 'linear-gradient(135deg,#FF6B2B33,#FFD16633)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {!editForm.banner_url && <span style={{ fontSize: 12, color: '#8C7B6E' }}>No banner uploaded</span>}
                </div>
                <label style={{ padding: '8px 16px', borderRadius: 100, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: '#F0EAE4', color: '#1A0800', display: 'inline-block' }}>
                  {uploadingBanner ? 'Uploading…' : '📷 Upload Banner'}
                  <input type="file" accept="image/*" onChange={handleBannerUpload} disabled={uploadingBanner} style={{ display: 'none' }} />
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Profile Picture</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                    background: avatarBg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800,
                  }}>
                    {editForm.avatar_url
                      ? <img src={editForm.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}  loading="lazy" />
                      : getInitials(editForm.full_name || profile.username || '?')}
                  </div>
                  <label style={{ padding: '8px 16px', borderRadius: 100, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: '#F0EAE4', color: '#1A0800', display: 'inline-block' }}>
                    {uploadingAvatar ? 'Uploading…' : '📷 Upload Photo'}
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text" className="form-control"
                  value={editForm.full_name}
                  onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea
                  className="form-control"
                  value={editForm.bio}
                  onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                  style={{ height: 80, resize: 'vertical' }}
                  placeholder="Tell the world about yourself…"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text" className="form-control"
                  placeholder="City, Country"
                  value={editForm.location}
                  onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!editForm.is_private}
                  onChange={e => setEditForm(f => ({ ...f, is_private: e.target.checked }))}
                  style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>🔒 Private Account</div>
                  <div style={{ fontSize: 11.5, color: '#8C7B6E', marginTop: 2 }}>
                    Non-followers need to spend 10 coins to read your stories
                  </div>
                </div>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
