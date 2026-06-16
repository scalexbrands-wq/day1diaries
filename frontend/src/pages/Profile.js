import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getProfileByUsername, adminSetRole, getStories, toggleFollowFixed, getFollow, updateProfile, getProfileLiveCounts, getMyCoins } from '../lib/api'
import { getInitials, getAvatarColor } from '../components/Sidebar'
import StoryCard from '../components/StoryCard'
import ProBadge from '../components/ProBadge'
import { toast } from '../components/Toast'

const LEVELS = { Beginner:'🥉', Explorer:'🥈', Achiever:'🥇', Hero:'🏆', 'Super Hero':'🔥', Legend:'👑', 'Habit Master':'🔥', 'Community Champion':'🌟' }

export default function Profile() {
  const { username } = useParams()
  const { user, profile: myProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [stories, setStories] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [coins, setCoins] = useState(null)

  const isMe = myProfile?.username === username

  const loadProfile = async () => {
    const { data } = await getProfileByUsername(username)
    if (!data) { setLoading(false); return }

    // Always get live counts from DB
    const { data: counts } = await getProfileLiveCounts(data.id)
    setProfile({ ...data, ...(counts||{}) })

    const [{ data: s }] = await Promise.all([
      getStories({ userId: data.id, limit: 20 }),
    ])
    setStories(s || [])

    if (!isMe && user?.id && data.id) {
      const { data: f } = await getFollow(user.id, data.id)
      setIsFollowing(!!f)
    }
    setLoading(false)
  }

  useEffect(() => { loadProfile() }, [username, user?.id])
  useEffect(() => { if (isMe) getMyCoins().then(({data}) => setCoins(data)) }, [isMe])

  const handleFollow = async () => {
    if (!user?.id || !profile?.id) return
    const { following } = await toggleFollowFixed(user.id, profile.id)
    setIsFollowing(following)
    // Reload live counts after follow action
    const { data: counts } = await getProfileLiveCounts(profile.id)
    setProfile(p => ({ ...p, ...(counts||{}) }))
    toast.success(following ? `Following ${profile.full_name||profile.username}!` : 'Unfollowed')
  }

  const handleSaveEdit = async () => {
    await updateProfile({ ...editForm })
    setProfile(p => ({ ...p, ...editForm }))
    refreshProfile()
    setEditing(false)
    toast.success('Profile updated!')
  }

  if (loading) return <div className="loading-center"><div className="spinner"/></div>
  if (!profile) return <div className="empty-state"><h3>User not found</h3><button className="btn btn-primary" onClick={() => navigate('/discover')}>Browse Stories</button></div>

  const isAdmin = myProfile?.role === 'admin'
  const isContributor = myProfile?.role === 'contributor'

  return (
    <div style={{ padding:'16px 16px', maxWidth:840 }}>
      {/* Profile hero */}
      <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:20, padding:28, marginBottom:18 }}>
        <div style={{ display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' }}>
          <div className="avatar avatar-xl" style={{ background:getAvatarColor(profile.full_name||''), color:'white' }}>
            {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.full_name}/> : getInitials(profile.full_name||profile.username||'?')}
          </div>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
              <h2 style={{ fontSize:'1.4rem', margin:0 }}>{profile.full_name||profile.username}</h2>
              <span style={{ fontSize:11, padding:'2px 9px', borderRadius:100, background:'rgba(255,107,43,.1)', color:'#FF6B2B', fontWeight:600 }}>{LEVELS[profile.level]||'🥉'} {profile.level}</span>
              
              {profile.role === 'admin' && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:100, background:'rgba(124,58,237,.1)', color:'#7C3AED', fontWeight:700 }}>ADMIN</span>}
              {profile.role === 'contributor' && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:100, background:'rgba(5,150,105,.1)', color:'#059669', fontWeight:700 }}>CONTRIBUTOR</span>}
            </div>
            <div style={{ fontSize:13, color:'#8C7B6E', marginBottom:8 }}>@{profile.username}{profile.location ? ` · ${profile.location}` : ''}</div>
            {profile.bio && <p style={{ fontSize:14, lineHeight:1.65, marginBottom:14, color:'#4A2800' }}>{profile.bio}</p>}

            {/* Live stats */}
            <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
              {[
                [profile.stories_count||0, 'Stories'],
                [profile.followers_count||0, 'Followers'],
                [profile.following_count||0, 'Following'],
                [(profile.likes_received||0).toLocaleString(), 'Likes'],
                [(profile.score||0).toLocaleString(), 'Points'],
              ].map(([v,l]) => (
                <div key={l} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.3rem', fontWeight:700, color:'#FF6B2B' }}>{v}</div>
                  <div style={{ fontSize:11, color:'#8C7B6E', marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {isMe
              ? <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(true); setEditForm({ is_private:profile.is_private||false, full_name:profile.full_name||'', bio:profile.bio||'', location:profile.location||'' }) }}>Edit Profile</button>
              : <button className={`btn btn-sm ${isFollowing?'btn-secondary':'btn-primary'}`} onClick={handleFollow}>{isFollowing ? '✓ Following' : '+ Follow'}</button>
            }
            {isAdmin && !isMe && (
              <button className="btn btn-secondary btn-sm" onClick={async () => {
                const newRole = profile.role === 'contributor' ? 'user' : 'contributor'
                const { error } = await adminSetRole(profile.id, newRole)
                if (!error) { setProfile(p => ({...p, role: newRole})); toast.success(`Role set to ${newRole}`) }
              }}>
                {profile.role === 'contributor' ? 'Remove Contributor' : 'Make Contributor'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header"><h3>Edit Profile</h3><button className="close-btn" onClick={() => setEditing(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Full Name</label><input type="text" className="form-control" value={editForm.full_name} onChange={e=>setEditForm(f=>({...f,full_name:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Bio</label><textarea className="form-control" value={editForm.bio} onChange={e=>setEditForm(f=>({...f,bio:e.target.value}))} style={{height:80}}/></div>
              <div className="form-group"><label className="form-label">Location</label><input type="text" className="form-control" placeholder="City, Country" value={editForm.location} onChange={e=>setEditForm(f=>({...f,location:e.target.value}))}/></div>
              <label style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', cursor:'pointer' }}>
                <input type="checkbox" checked={!!editForm.is_private} onChange={e=>setEditForm(f=>({...f,is_private:e.target.checked}))} style={{ width:16, height:16 }}/>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>🔒 Private Account</div>
                  <div style={{ fontSize:11, color:'#8C7B6E' }}>Only followers can see your stories</div>
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

      {/* Stories */}
      <h3 style={{ marginBottom:14 }}>{isMe ? 'My Stories' : `Stories by ${profile.full_name||profile.username}`}</h3>
      {stories.length === 0
        ? <div className="empty-state"><div className="empty-state-icon">✍️</div><h3>No stories yet</h3><p>{isMe?'Share your first story!':'This user has not posted yet.'}</p>{isMe&&<button className="btn btn-primary" onClick={()=>navigate('/write')}>Share Story</button>}</div>
        : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>{stories.map(s => <StoryCard key={s.id} story={s}/>)}</div>
      }
    </div>
  )
}
