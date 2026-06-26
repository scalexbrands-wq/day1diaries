import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getFeedStories, getTrendingStories, getLeaderboard, getHabits,
  getUserHabitProgress, getSuggestedUsers, getMyUnlockedStoryIds,
  getStoryCategories, getDepartments, getTopicFollows, toggleTopicFollow,
  getStoriesByCategories, getCareersByDepartments
} from '../lib/api'
import StoryCard from '../components/StoryCard'
import AdSlot from '../components/AdSlot'
import AdCarousel from '../components/AdCarousel'
import FollowButton from '../components/FollowButton'
import { getAvatarColor, getInitials } from '../components/Sidebar'

const AD_EVERY_N_STORIES = 5

const LEVELS = { Beginner:'🥉', Explorer:'🥈', Achiever:'🥇', Hero:'🏆', 'Super Hero':'🔥', Legend:'👑', 'Habit Master':'🔥', 'Community Champion':'🌟' }

/* ── Habit Progress Tile ── */
function HabitProgressTile({ userId, navigate }) {
  const [habits, setHabits] = useState([])
  useEffect(() => {
    getUserHabitProgress(userId).then(({ data }) => setHabits((data||[]).slice(0,3)))
  }, [userId])

  if (!habits.length) return (
    <div onClick={() => navigate('/habits')} style={{ background:'white', border:'1.5px dashed #DDD3CA', borderRadius:16, padding:16, cursor:'pointer', transition:'all .2s', marginBottom:14 }}
      onMouseEnter={e=>e.currentTarget.style.borderColor='#FF6B2B'}
      onMouseLeave={e=>e.currentTarget.style.borderColor='#DDD3CA'}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ fontSize:22 }}>🔥</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#1A0800' }}>Start a Habit Today</div>
          <div style={{ fontSize:11, color:'#8C7B6E' }}>Build better habits with the community</div>
        </div>
        <div style={{ fontSize:12, color:'#FF6B2B', fontWeight:600 }}>Explore →</div>
      </div>
    </div>
  )

  return (
    <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:16, padding:16, cursor:'pointer', marginBottom:14 }} onClick={() => navigate('/habits')}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#1A0800' }}>🔥 My Habit Progress</div>
        <span style={{ fontSize:11, color:'#FF6B2B' }}>View all →</span>
      </div>
      {habits.map(h => (
        <div key={h.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
          <div style={{ fontSize:16, width:28, textAlign:'center', flexShrink:0 }}>{h.habits?.icon||'✨'}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ fontSize:11, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{h.habits?.title}</span>
              <span style={{ fontSize:10, color:'#FF6B2B', fontWeight:700, flexShrink:0 }}>Day {h.current_day}</span>
            </div>
            <div style={{ height:4, background:'#F5EDE4', borderRadius:2 }}>
              <div style={{ height:4, width:`${Math.min((h.current_day/100)*100,100)}%`, background:'linear-gradient(90deg,#FF6B2B,#FFD166)', borderRadius:2 }}/>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── People to Follow Card (shown between posts) ── */
function PeopleToFollowCard({ users, onFollow }) {
  if (!users.length) return null
  return (
    <div style={{ background:'white', border:'1.5px solid rgba(255,107,43,.15)', borderRadius:16, padding:16, marginBottom:12 }}>
      <div style={{ fontSize:12, fontWeight:700, color:'#1A0800', marginBottom:12 }}>👥 People to Follow</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {users.map(u => (
          <div key={u.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div
              onClick={() => window.location.href=`/profile/${u.username}`}
              style={{ width:36, height:36, borderRadius:'50%', background:getAvatarColor(u.full_name||''), flexShrink:0, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'white', overflow:'hidden' }}>
              {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" /> : getInitials(u.full_name||u.username||'?')}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#1A0800', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.full_name||u.username}</div>
              <div style={{ fontSize:10, color:'#8C7B6E' }}>{u.stories_count||0} stories · {u.followers_count||0} followers</div>
            </div>
            <FollowButton targetUserId={u.id} targetUsername={u.full_name||u.username} size="sm" initialFollowing={false} onFollowChange={()=>onFollow(u.id)}/>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Topic card (category or company) with a dedicated Follow button ── */
function TopicCard({ label, icon, following, onToggle, onClick }) {
  return (
    <div
      className="topic-card"
      onClick={onClick}
      style={{
        display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
        borderRadius:12, minWidth:0, cursor: onClick ? 'pointer' : 'default',
        border: following ? '1.5px solid #FF6B2B' : '1px solid #F0EAE4',
        background: following ? 'rgba(255,107,43,.05)' : 'white',
      }}
    >
      <div style={{ fontSize:18, flexShrink:0 }}>{icon || '🏢'}</div>
      <div style={{ flex:1, minWidth:0, fontSize:12.5, fontWeight:600, color:'#1A0800', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={label}>
        {label}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        style={{
          flexShrink:0, padding:'5px 12px', borderRadius:100, fontSize:11, fontWeight:600, cursor:'pointer',
          border: following ? '1.5px solid #DDD3CA' : '1.5px solid #FF6B2B',
          background: following ? 'transparent' : '#FF6B2B',
          color: following ? '#8C7B6E' : 'white',
        }}
      >
        {following ? 'Following ✓' : '+ Follow'}
      </button>
    </div>
  )
}

const VISIBLE_CATEGORIES = 3

/* ── Categories — browse + follow ── */
function TopicsPanel({ categories, followedCategories, onToggleCategory, onCategoryClick }) {
  if (!categories.length) return null
  const shownCategories = categories.slice(0, VISIBLE_CATEGORIES)
  return (
    <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:16, padding:16, marginBottom:14 }}>
      <style>{`
        .topic-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
        @media(max-width:520px){ .topic-grid { grid-template-columns:1fr; } }
      `}</style>
      <div style={{ fontSize:12, fontWeight:700, color:'#1A0800', marginBottom:10 }}>📚 Categories</div>
      <div className="topic-grid">
        {shownCategories.map(c => (
          <TopicCard
            key={c.name}
            label={c.name}
            icon={c.icon}
            following={followedCategories.has(c.name)}
            onToggle={() => onToggleCategory(c.name)}
            onClick={() => onCategoryClick(c.name)}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Job card (for the Following tab — jobs from followed companies) ── */
function JobFollowCard({ job, navigate }) {
  return (
    <div onClick={() => navigate(`/careers/${job.id}`)} style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:16, padding:16, cursor:'pointer' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#1A0800' }}>{job.title}</div>
          <div style={{ fontSize:11, color:'#8C7B6E', marginTop:3 }}>🏢 {job.department} · 📍 {job.location}</div>
        </div>
        <span style={{ fontSize:10, fontWeight:700, color:'#FF6B2B', background:'rgba(255,107,43,.1)', borderRadius:100, padding:'4px 10px', whiteSpace:'nowrap' }}>{job.job_type}</span>
      </div>
    </div>
  )
}

export default function Feed() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [stories, setStories] = useState([])
  const [trending, setTrending] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [habits, setHabits] = useState([])
  const [suggestedUsers, setSuggestedUsers] = useState([])
  const [followedUsers, setFollowedUsers] = useState(new Set())
  const [unlockedIds, setUnlockedIds] = useState(new Set())
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const sentinelRef = useRef(null)
  const LIMIT = 8

  // Categories / Companies follow state
  const [activeTab, setActiveTab] = useState('forYou') // 'forYou' | 'following'
  const [categories, setCategories] = useState([])
  const [departments, setDepartments] = useState([])
  const [followedCategories, setFollowedCategories] = useState(new Set())
  const [followedDepartments, setFollowedDepartments] = useState(new Set())
  const [followingStories, setFollowingStories] = useState([])
  const [followingJobs, setFollowingJobs] = useState([])
  const [followingLoading, setFollowingLoading] = useState(false)

  const loadStories = useCallback(async (reset = false) => {
    const p = reset ? 0 : page
    if (reset) setLoading(true)
    else setLoadingMore(true)
    const result = await getFeedStories([], p, LIMIT)
    const newStories = result.data || []
    setStories(prev => reset ? newStories : [...prev, ...newStories])
    setHasMore(newStories.length === LIMIT)
    setPage(p + 1)
    setLoading(false)
    setLoadingMore(false)
  }, [page])

  useEffect(() => { setPage(0); loadStories(true) }, [user.id])

  // Lazy-load the next page once the sentinel scrolls into view — no
  // "Load More" click needed.
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading || loadingMore || activeTab !== 'forYou') return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadStories()
    }, { rootMargin: '300px' })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, activeTab, loadStories])

  useEffect(() => {
    getTrendingStories(5).then(({ data }) => setTrending(data || []))
    getLeaderboard(5).then(({ data }) => setLeaderboard(data || []))
    getHabits().then(({ data }) => setHabits((data||[]).slice(0,4)))
    getSuggestedUsers(5).then(({ data }) => setSuggestedUsers(data || []))
    getMyUnlockedStoryIds().then(({ data }) => { if (data?.length) setUnlockedIds(new Set(data)) })
    getStoryCategories().then(({ data }) => setCategories(data || []))
    getDepartments().then(({ data }) => setDepartments(data || []))
    getTopicFollows().then(({ data }) => {
      setFollowedCategories(new Set(data?.categories || []))
      setFollowedDepartments(new Set(data?.departments || []))
    })
  }, [])

  const loadFollowingTab = useCallback(async () => {
    setFollowingLoading(true)
    const [storiesRes, jobsRes] = await Promise.all([
      followedCategories.size ? getStoriesByCategories([...followedCategories]) : Promise.resolve({ data: [] }),
      followedDepartments.size ? getCareersByDepartments([...followedDepartments]) : Promise.resolve({ data: [] }),
    ])
    setFollowingStories(storiesRes.data || [])
    setFollowingJobs(jobsRes.data || [])
    setFollowingLoading(false)
  }, [followedCategories, followedDepartments])

  useEffect(() => { if (activeTab === 'following') loadFollowingTab() }, [activeTab, loadFollowingTab])

  const handleToggleCategory = async (name) => {
    const wasFollowing = followedCategories.has(name)
    setFollowedCategories(prev => {
      const next = new Set(prev)
      wasFollowing ? next.delete(name) : next.add(name)
      return next
    })
    await toggleTopicFollow('category', name)
  }

  const handleToggleDepartment = async (name) => {
    const wasFollowing = followedDepartments.has(name)
    setFollowedDepartments(prev => {
      const next = new Set(prev)
      wasFollowing ? next.delete(name) : next.add(name)
      return next
    })
    await toggleTopicFollow('department', name)
  }

  // FollowButton already calls the toggle API internally.
  // This handler only updates local state so the card disappears after following.
  const handleFollow = (userId) => {
    setFollowedUsers(prev => new Set([...prev, userId]))
    setSuggestedUsers(prev => prev.filter(u => u.id !== userId))
  }

  // useCallback so this stays referentially stable across renders — it's
  // passed to every StoryCard (now React.memo'd); a fresh function here
  // every render would defeat that memo and re-render the whole feed list
  // on any unrelated state change (toasts, pagination appends, etc.)
  const handleUnlock = useCallback((storyId) => setUnlockedIds(prev => new Set([...prev, storyId])), [])

  const isStoryLocked = (story) => {
    if (!story.profiles?.is_private) return false
    if (user?.id === story.user_id) return false
    if (story.viewer_follows_author) return false
    if (unlockedIds.has(story.id)) return false
    return true
  }

  // Inject People to Follow card after 3rd story, and a sponsored ad slot
  // every Nth story (consistent with Discover's ad cadence).
  const feedItems = []
  stories.forEach((s, i) => {
    feedItems.push({ type:'story', data:s, key:s.id })
    if (i === 2 && suggestedUsers.filter(u => !followedUsers.has(u.id)).length > 0) {
      feedItems.push({ type:'people', key:'people-to-follow' })
    }
    if ((i + 1) % AD_EVERY_N_STORIES === 0) {
      feedItems.push({ type:'ad', key:`ad-${i}` })
    }
  })

  return (
    <div style={{ padding:'20px 16px' }}>
      <style>{`
        .feed-layout { display:grid; grid-template-columns:minmax(0,1fr) 300px; gap:20px; max-width:1100px; margin:0 auto; }
        .feed-layout > * { min-width:0; }
        .feed-sidebar { display:flex; flex-direction:column; gap:14px; min-width:0; }
        .feed-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:14px; }
        @media(max-width:900px){
          .feed-layout { grid-template-columns:1fr !important; }
          .feed-sidebar { display:none !important; }
          .feed-stats { grid-template-columns:repeat(2,1fr) !important; }
        }
        @media(max-width:400px){
          .feed-stats { grid-template-columns:1fr 1fr !important; }
        }
        .feed-refer-mobile { display:none; }
        @media(max-width:900px){ .feed-refer-mobile { display:block; } }
      `}</style>

      <div className="feed-layout">
        {/* ── LEFT: Main Feed ── */}
        <div>
          {/* Stats */}
          <div className="feed-stats">
            {[
              [profile?.stories_count||0,'Stories'],
              [profile?.followers_count||0,'Followers'],
              [profile?.likes_received||0,'Likes'],
              [LEVELS[profile?.level]||'🥉', profile?.level||'Beginner'],
            ].map(([v,l]) => (
              <div key={l} style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:12, padding:'10px 12px' }}>
                <div style={{ fontSize:16, fontWeight:700, color:'#FF6B2B', fontFamily:"'Playfair Display',serif" }}>{typeof v==='number'?v.toLocaleString():v}</div>
                <div style={{ fontSize:10, color:'#8C7B6E', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Refer a Friend — sidebar version is desktop-only, so mirror it here for mobile */}
          <div className="feed-refer-mobile" onClick={() => navigate('/refer')} style={{ background:'linear-gradient(135deg,#FF6B2B,#FFB088)', borderRadius:16, padding:16, color:'white', cursor:'pointer', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>🎉 Refer a Friend</div>
            <div style={{ fontSize:11.5, opacity:.9, marginBottom:10 }}>You get 500 coins, they get 1000 coins — instantly.</div>
            <div style={{ display:'inline-flex', padding:'6px 14px', background:'rgba(255,255,255,.25)', borderRadius:100, fontSize:11.5, fontWeight:700 }}>
              Invite now →
            </div>
          </div>

          {/* Habit Progress */}
          <HabitProgressTile userId={user.id} navigate={navigate}/>

          {/* Categories — browse + follow */}
          <TopicsPanel
            categories={categories}
            followedCategories={followedCategories}
            onToggleCategory={handleToggleCategory}
            onCategoryClick={(name) => navigate(`/discover?category=${encodeURIComponent(name)}`)}
          />

          {/* Header + tabs */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ display:'flex', gap:6 }}>
              {[['forYou','For You'],['following','Following']].map(([key,label]) => (
                <button key={key} onClick={()=>setActiveTab(key)} style={{
                  fontFamily:"'Playfair Display',serif", fontSize:'1.05rem', fontWeight:900,
                  color: activeTab===key ? '#1A0800' : '#C9BBAF',
                  background:'none', border:'none', cursor:'pointer', padding:'2px 0',
                  borderBottom: activeTab===key ? '2.5px solid #FF6B2B' : '2.5px solid transparent',
                }}>{label}</button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={()=>navigate('/write')} style={{ padding:'7px 16px', fontSize:12, borderRadius:100 }}>+ Write</button>
          </div>

          {/* Feed items */}
          {activeTab === 'forYou' ? (
            <div className="story-list-grid">
              {feedItems.map(item => {
                if (item.type === 'story') return <StoryCard key={item.key} story={item.data} isLocked={isStoryLocked(item.data)} onUnlock={handleUnlock}/>
                if (item.type === 'ad') return <div key={item.key} className="grid-full-span"><AdSlot placement="feed" variant="card"/></div>
                return <div key={item.key} className="grid-full-span"><PeopleToFollowCard users={suggestedUsers.filter(u=>!followedUsers.has(u.id))} onFollow={handleFollow}/></div>
              })}
              {loading && <div className="loading-center grid-full-span"><div className="spinner"/></div>}
              {!loading && stories.length === 0 && (
                <div className="empty-state grid-full-span">
                  <div className="empty-state-icon">📭</div>
                  <h3>No stories yet</h3>
                  <p>Follow some creators to see their stories here, or share your own!</p>
                  <button className="btn btn-primary" onClick={() => navigate('/write')}>Share Your Story</button>
                </div>
              )}
              {/* Sentinel — scrolling this into view triggers the next page */}
              {!loading && hasMore && stories.length > 0 && <div ref={sentinelRef} className="grid-full-span" style={{ height:1 }}/>}
              {loadingMore && <div className="loading-center grid-full-span" style={{ padding:'12px 0' }}><div className="spinner"/></div>}
              {!loading && !hasMore && stories.length > 0 && (
                <p className="grid-full-span" style={{ textAlign:'center', fontSize:12, color:'#B0A89F', padding:'8px 0' }}>You've reached the end ✨</p>
              )}
            </div>
          ) : (
            <div className="story-list-grid">
              {followingLoading && <div className="loading-center grid-full-span"><div className="spinner"/></div>}
              {!followingLoading && !followedCategories.size && !followedDepartments.size && (
                <div className="empty-state grid-full-span">
                  <div className="empty-state-icon">⭐</div>
                  <h3>Nothing followed yet</h3>
                  <p>Follow categories and companies above to see their stories and jobs here.</p>
                </div>
              )}
              {!followingLoading && followingJobs.map(job => <div key={job.id} className="grid-full-span"><JobFollowCard job={job} navigate={navigate}/></div>)}
              {!followingLoading && followingStories.map((s, i) => (
                <React.Fragment key={s.id}>
                  <StoryCard story={s} isLocked={isStoryLocked(s)} onUnlock={handleUnlock}/>
                  {(i + 1) % AD_EVERY_N_STORIES === 0 && <div key={`ad-${i}`} className="grid-full-span"><AdSlot placement="feed" variant="card"/></div>}
                </React.Fragment>
              ))}
              {!followingLoading && (followedCategories.size || followedDepartments.size) && !followingJobs.length && !followingStories.length && (
                <div className="empty-state grid-full-span">
                  <div className="empty-state-icon">📭</div>
                  <h3>No matches yet</h3>
                  <p>No stories or jobs found for what you're following right now — check back soon.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="feed-sidebar">
          {/* Sponsored slideshow — sits above People to Follow */}
          <AdCarousel placement="feed" />

          {/* Refer a Friend */}
          <div onClick={() => navigate('/refer')} style={{ background:'linear-gradient(135deg,#FF6B2B,#FFB088)', borderRadius:16, padding:16, color:'white', cursor:'pointer' }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>🎉 Refer a Friend</div>
            <div style={{ fontSize:11.5, opacity:.9, marginBottom:10 }}>You get 500 coins, they get 1000 coins — instantly.</div>
            <div style={{ display:'inline-flex', padding:'6px 14px', background:'rgba(255,255,255,.25)', borderRadius:100, fontSize:11.5, fontWeight:700 }}>
              Invite now →
            </div>
          </div>

          {/* Suggested People */}
          {suggestedUsers.filter(u=>!followedUsers.has(u.id)).length > 0 && (
            <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:16, overflow:'hidden' }}>
              <div style={{ padding:'13px 16px', borderBottom:'1px solid #F0EAE4', fontWeight:600, fontSize:13 }}>👥 People to Follow</div>
              <div style={{ padding:'10px 16px' }}>
                {suggestedUsers.filter(u=>!followedUsers.has(u.id)).map(u => (
                  <div key={u.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid #F5EDE4' }}>
                    <div onClick={()=>navigate(`/profile/${u.username}`)} style={{ width:32, height:32, borderRadius:'50%', background:getAvatarColor(u.full_name||''), flexShrink:0, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white', overflow:'hidden' }}>
                      {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} loading="lazy" /> : getInitials(u.full_name||u.username||'?')}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.full_name||u.username}</div>
                      <div style={{ fontSize:10, color:'#8C7B6E' }}>{u.stories_count||0} stories</div>
                    </div>
                    <FollowButton targetUserId={u.id} targetUsername={u.full_name||u.username} size="sm" initialFollowing={false} onFollowChange={()=>handleFollow(u.id)}/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trending Habits */}
          <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'13px 16px', borderBottom:'1px solid #F0EAE4', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:600, fontSize:13 }}>🔥 Trending Habits</div>
              <button onClick={() => navigate('/habits')} style={{ fontSize:11, color:'#FF6B2B', background:'none', border:'none', cursor:'pointer' }}>See all</button>
            </div>
            <div style={{ padding:'10px 16px' }}>
              {habits.map((h,i) => (
                <div key={h.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:i<habits.length-1?'1px solid #F5EDE4':'' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#FF6B2B', width:16 }}>{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600 }}>{h.title}</div>
                    <div style={{ height:3, background:'#F5EDE4', borderRadius:2, marginTop:3 }}>
                      <div style={{ height:3, width:`${h.completion_rate||0}%`, background:'linear-gradient(90deg,#FF6B2B,#FFD166)', borderRadius:2 }}/>
                    </div>
                  </div>
                  <div style={{ fontSize:10, color:'#8C7B6E' }}>{(h.adopters_count||0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'13px 16px', borderBottom:'1px solid #F0EAE4', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:600, fontSize:13 }}>🏆 Leaderboard</div>
              <button onClick={() => navigate('/leaderboard')} style={{ fontSize:11, color:'#FF6B2B', background:'none', border:'none', cursor:'pointer' }}>Full board</button>
            </div>
            <div style={{ padding:'8px 16px' }}>
              {leaderboard.map((p,i) => (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:i<leaderboard.length-1?'1px solid #F5EDE4':'', cursor:'pointer' }}
                  onClick={() => navigate(`/profile/${p.username}`)}>
                  <div style={{ fontSize:13, width:20, textAlign:'center', fontWeight:700 }}>{['🥇','🥈','🥉','4','5'][i]}</div>
                  <div style={{ width:26, height:26, borderRadius:'50%', background:getAvatarColor(p.full_name||''), color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0, overflow:'hidden' }}>
                    {p.avatar_url ? <img src={p.avatar_url} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} loading="lazy" /> : getInitials(p.full_name||p.username||'?')}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.full_name||p.username}</div>
                    <div style={{ fontSize:10, color:'#8C7B6E' }}>{LEVELS[p.level]||'🥉'} {p.level}</div>
                  </div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#FF6B2B' }}>{(p.score||0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Stories */}
          <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'13px 16px', borderBottom:'1px solid #F0EAE4', fontWeight:600, fontSize:13 }}>⚡ Trending Stories</div>
            <div style={{ padding:'10px 16px' }}>
              {trending.map((s,i) => (
                <div key={s.id} onClick={() => navigate(`/story/${s.id}`)} style={{ padding:'7px 0', borderBottom:i<trending.length-1?'1px solid #F5EDE4':'', cursor:'pointer' }}>
                  <div style={{ fontSize:12, fontWeight:600, lineHeight:1.4, marginBottom:2 }}>{s.title.slice(0,55)}{s.title.length>55?'…':''}</div>
                  <div style={{ fontSize:10, color:'#8C7B6E' }}>❤️ {(s.likes_count||0).toLocaleString()} · {s.category}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
