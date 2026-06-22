import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getCommunityUpdates, registerForEvent, getUserEventRegistration,
  getChallenges, getUserChallenges, joinChallenge,
  getChallengeParticipants, isContributorOrAdmin,
  adminUpsertCommunityUpdate, adminUpsertChallenge
} from '../lib/api'
import ProBadge from '../components/ProBadge'
import AdSlot from '../components/AdSlot'
import { getInitials, getAvatarColor } from '../components/Sidebar'
import { toast } from '../components/Toast'
import { format, isFuture, isPast, formatDistanceToNow, differenceInDays } from 'date-fns'

const TYPE_META = {
  community_news: { label:'📢 News',    color:'#2563EB', bg:'rgba(37,99,235,.1)',  dark:'#1E40AF', gradient:'linear-gradient(135deg,#2563EB,#1E40AF)' },
  success_story:  { label:'⭐ Story',   color:'#059669', bg:'rgba(5,150,105,.1)',  dark:'#065F46', gradient:'linear-gradient(135deg,#059669,#065F46)' },
  free_event:     { label:'🎉 Event',   color:'#FF6B2B', bg:'rgba(255,107,43,.1)', dark:'#C2410C', gradient:'linear-gradient(135deg,#FF6B2B,#C2410C)' },
  paid_event:     { label:'💰 Paid',    color:'#7C3AED', bg:'rgba(124,58,237,.1)', dark:'#6D28D9', gradient:'linear-gradient(135deg,#7C3AED,#6D28D9)' },
  webinar:        { label:'🎥 Webinar', color:'#F59E0B', bg:'rgba(245,158,11,.1)', dark:'#B45309', gradient:'linear-gradient(135deg,#F59E0B,#B45309)' },
  workshop:       { label:'🛠 Workshop',color:'#EC4899', bg:'rgba(236,72,153,.1)', dark:'#BE185D', gradient:'linear-gradient(135deg,#EC4899,#BE185D)' },
}

function Badge({ children, color, bg }) {
  return (
    <span style={{ fontSize:11, padding:'4px 12px', borderRadius:100, background:bg, color, fontWeight:700, boxShadow:`inset 0 0 0 1px ${color}22`, letterSpacing:.2 }}>{children}</span>
  )
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="empty-state" style={{ gridColumn:'1/-1', textAlign:'center', padding:'64px 16px' }}>
      <div style={{ width:64, height:64, margin:'0 auto 16px', borderRadius:'50%', background:'linear-gradient(135deg,#FFF3E9,#FFE8D4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30 }}>{icon}</div>
      <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.2rem', margin:'0 0 6px', color:'#1A0800' }}>{title}</h3>
      {subtitle && <p style={{ color:'#8C7B6E', fontSize:13, margin:0 }}>{subtitle}</p>}
    </div>
  )
}

/* ── Event card component ── */
function EventCard({ item, profile, onRegister, onCalendar, onOpen, registered, featured }) {
  const meta = TYPE_META[item.event_type] || TYPE_META.community_news
  const isEvent = ['free_event','paid_event','webinar','workshop'].includes(item.event_type)
  const seatsLeft = item.seats_available ? item.seats_available - (item.seats_booked||0) : null
  const isUpcoming = item.event_date && isFuture(new Date(item.event_date))
  const locked = item.is_paid && !profile?.is_pro

  const actions = (
    <div onClick={e => e.stopPropagation()} style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
      {registered
        ? <><span style={{ fontSize:12, fontWeight:700, color: featured?'white':'#059669' }}>✓ Registered!</span>
            <button onClick={() => onCalendar(item)} style={{ fontSize:11, padding:'6px 14px', borderRadius:100, border:`1px solid ${featured?'rgba(255,255,255,.4)':'#DDD3CA'}`, background:featured?'rgba(255,255,255,.12)':'white', color:featured?'white':'#1A0800', cursor:'pointer', fontFamily:'inherit' }}>📅 Calendar</button></>
        : locked
          ? <button onClick={() => {}} style={{ fontSize:11, padding:'7px 16px', borderRadius:100, border:`1.5px solid ${featured?'white':'#7C3AED'}`, background:'transparent', color:featured?'white':'#7C3AED', cursor:'pointer', fontFamily:'inherit' }}>Upgrade to Join</button>
          : <button onClick={() => onRegister(item)} style={{ fontSize:13, padding:'9px 20px', borderRadius:100, border:'none', background: featured ? 'white' : '#FF6B2B', color: featured ? '#1A0800' : 'white', cursor:'pointer', fontWeight:700, fontFamily:'inherit', transition:'all .2s', boxShadow: featured ? '0 6px 18px rgba(0,0,0,.25)' : '0 4px 12px rgba(255,107,43,.3)' }}
              onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
              onMouseLeave={e=>e.currentTarget.style.transform='none'}>
              Register Now →
            </button>
      }
    </div>
  )

  if (featured) {
    return (
      <div onClick={() => onOpen(item)} style={{ position:'relative', borderRadius:24, overflow:'hidden', cursor:'pointer', minHeight:320, display:'flex', alignItems:'flex-end', boxShadow:'0 20px 50px rgba(26,8,0,.18)', transition:'transform .25s, box-shadow .25s' }}
        onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 28px 60px rgba(26,8,0,.24)' }}
        onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 20px 50px rgba(26,8,0,.18)' }}>
        <div style={{ position:'absolute', inset:0, background: item.cover_image_url ? `url(${item.cover_image_url}) center/cover` : meta.gradient }}/>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(10,5,0,0) 30%,rgba(10,5,0,.78) 100%)' }}/>
        <div style={{ position:'relative', padding:'28px 32px', width:'100%', color:'white' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, padding:'4px 12px', borderRadius:100, background:'rgba(255,255,255,.18)', backdropFilter:'blur(6px)', fontWeight:700, letterSpacing:.3 }}>{meta.label}</span>
            {isEvent && (Number(item.price) > 0
              ? <span style={{ fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:100, background:'rgba(124,58,237,.35)' }}>💰 ₹{item.price}</span>
              : <span style={{ fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:100, background:'rgba(5,150,105,.35)' }}>🆓 Free</span>)}
            {isUpcoming && <span style={{ fontSize:11, fontWeight:700, color:'#A7F3D0' }}>🟢 Upcoming</span>}
            {locked && <span style={{ fontSize:11, padding:'4px 11px', borderRadius:100, background:'rgba(124,58,237,.35)', fontWeight:700 }}>👑 Pro Only</span>}
          </div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'2rem', fontWeight:800, lineHeight:1.15, marginBottom:10, maxWidth:640, textShadow:'0 2px 16px rgba(0,0,0,.3)' }}>{item.title}</div>
          {item.description && <div style={{ fontSize:14, color:'rgba(255,255,255,.88)', lineHeight:1.6, maxWidth:560, marginBottom:16, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.description}</div>}
          <div style={{ display:'flex', gap:16, fontSize:13, color:'rgba(255,255,255,.85)', flexWrap:'wrap', marginBottom:18 }}>
            {item.event_date && <span>📅 {format(new Date(item.event_date), 'd MMM, h:mm a')}</span>}
            {item.duration_mins && <span>⏱ {item.duration_mins}min</span>}
            {seatsLeft !== null && <span>💺 {seatsLeft} seats left</span>}
            {item.speaker_name && <span>🎤 {item.speaker_name}</span>}
          </div>
          {isEvent && actions}
        </div>
      </div>
    )
  }

  return (
    <div onClick={() => onOpen(item)} style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:24, overflow:'hidden', cursor:'pointer', transition:'transform .25s, box-shadow .25s, border-color .25s', boxShadow:'0 2px 8px rgba(26,8,0,.04)' }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor=meta.color; e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow=`0 16px 40px ${meta.bg}` }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor='#F0EAE4'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 2px 8px rgba(26,8,0,.04)' }}>
      {item.cover_image_url
        ? <div style={{ height:200, background:`url(${item.cover_image_url}) center/cover`, position:'relative' }}>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(0,0,0,0) 60%,rgba(0,0,0,.35) 100%)' }}/>
          </div>
        : <div style={{ height:6, background:meta.gradient }}/>
      }
      <div style={{ padding:'20px 22px 22px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12, flexWrap:'wrap' }}>
          <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
          {isEvent && (Number(item.price) > 0
            ? <Badge color="#7C3AED" bg="rgba(124,58,237,.1)">💰 ₹{item.price}</Badge>
            : <Badge color="#059669" bg="rgba(5,150,105,.1)">🆓 Free</Badge>)}
          {locked && <Badge color="#7C3AED" bg="rgba(124,58,237,.1)">👑 Pro Only</Badge>}
          {isUpcoming && <span style={{ fontSize:11, color:'#059669', fontWeight:700 }}>🟢 Upcoming</span>}
          {item.is_paid && profile?.is_pro && <span style={{ fontSize:11, color:'#059669', fontWeight:700 }}>✓ Free for Pro</span>}
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.1rem', fontWeight:700, color:'#1A0800', marginBottom:8, lineHeight:1.32 }}>{item.title}</div>
        {item.description && <div style={{ fontSize:13, color:'#4A2800', lineHeight:1.6, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom:12 }}>{item.description}</div>}
        <div style={{ display:'flex', gap:12, fontSize:12, color:'#8C7B6E', flexWrap:'wrap', marginBottom:14 }}>
          {item.event_date && <span>📅 {format(new Date(item.event_date), 'd MMM, h:mm a')}</span>}
          {item.duration_mins && <span>⏱ {item.duration_mins}min</span>}
          {seatsLeft !== null && <span style={{ color: seatsLeft < 10 ? '#DC2626' : '#8C7B6E' }}>💺 {seatsLeft} left</span>}
          {item.speaker_name && <span>🎤 {item.speaker_name}</span>}
        </div>
        {isEvent && actions}
      </div>
    </div>
  )
}

/* ── Challenge card component ── */
function ChallengeCard({ c, profile, joined, onJoin, onOpen }) {
  const locked = c.visibility === 'pro' && !profile?.is_pro
  const isJoined = joined[c.id]
  const daysLeft = c.end_date ? Math.max(differenceInDays(new Date(c.end_date), new Date()), 0) : null

  return (
    <div onClick={() => onOpen(c)} style={{ background:'white', border:`1.5px solid ${isJoined?'rgba(5,150,105,.4)':'#F0EAE4'}`, borderRadius:24, padding:22, cursor:'pointer', transition:'transform .25s, box-shadow .25s, border-color .25s', boxShadow:'0 2px 8px rgba(26,8,0,.04)' }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(255,107,43,.5)'; e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 16px 40px rgba(255,107,43,.12)' }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor=isJoined?'rgba(5,150,105,.4)':'#F0EAE4'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 2px 8px rgba(26,8,0,.04)' }}>
      <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
        <Badge color={c.status==='active'?'#059669':'#2563EB'} bg={c.status==='active'?'rgba(5,150,105,.1)':'rgba(37,99,235,.1)'}>{String(c.status).toUpperCase()}</Badge>
        {c.visibility==='pro' && <Badge color="#7C3AED" bg="rgba(124,58,237,.1)">👑 Pro Only</Badge>}
        {isJoined && <Badge color="#059669" bg="rgba(5,150,105,.1)">✓ You're In!</Badge>}
      </div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.15rem', fontWeight:700, marginBottom:10, lineHeight:1.3 }}>{c.title}</div>
      {c.description && <div style={{ fontSize:13, color:'#4A2800', lineHeight:1.55, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom:12 }}>{c.description}</div>}

      {/* Mini timer */}
      {c.start_date && c.end_date && (() => {
        const start = new Date(c.start_date), end = new Date(c.end_date), now = new Date()
        const total = Math.max(differenceInDays(end, start), 1)
        const done = Math.max(differenceInDays(now, start), 0)
        const pct = Math.min(Math.round((done/total)*100), 100)
        return (
          <div style={{ marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#8C7B6E', marginBottom:5, textTransform:'uppercase', letterSpacing:.4, fontWeight:600 }}>
              <span>{c.start_date}</span><span>{c.end_date}</span>
            </div>
            <div style={{ height:6, background:'#F5EDE4', borderRadius:100 }}>
              <div style={{ height:6, width:`${pct}%`, background:'linear-gradient(90deg,#FF6B2B,#FFD166)', borderRadius:100, transition:'width .4s' }}/>
            </div>
          </div>
        )
      })()}

      <div style={{ display:'flex', gap:12, fontSize:11.5, color:'#8C7B6E', marginBottom:14, flexWrap:'wrap' }}>
        <span>⏱ {c.duration_days}d</span>
        <span>🏆 {c.reward_points}pts</span>
        <span>⚡ {c.daily_points}pts/day</span>
        <span>👥 {c.participants_count||0}{c.participants_limit?`/${c.participants_limit}`:''} joined</span>
        {daysLeft !== null && c.status==='active' && <span style={{ color:'#FF6B2B', fontWeight:700 }}>⏰ {daysLeft}d left</span>}
      </div>

      <div onClick={e => e.stopPropagation()}>
        {isJoined
          ? <div style={{ fontSize:13, fontWeight:700, color:'#059669' }}>✓ Joined — check daily!</div>
          : locked
            ? <button style={{ fontSize:12, padding:'7px 16px', borderRadius:100, border:'1.5px solid #7C3AED', background:'transparent', color:'#7C3AED', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>Upgrade to Join →</button>
            : <button onClick={() => onJoin(c)} style={{ fontSize:13, padding:'9px 20px', borderRadius:100, border:'none', background:'#FF6B2B', color:'white', cursor:'pointer', fontWeight:700, fontFamily:'inherit', transition:'all .2s', boxShadow:'0 4px 12px rgba(255,107,43,.3)' }}
                onMouseEnter={e=>{ e.currentTarget.style.background='#FF4500'; e.currentTarget.style.transform='translateY(-1px)' }}
                onMouseLeave={e=>{ e.currentTarget.style.background='#FF6B2B'; e.currentTarget.style.transform='none' }}>
                Join Challenge
              </button>
        }
      </div>
    </div>
  )
}

export default function Community() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [updates, setUpdates] = useState([])
  const [challenges, setChallenges] = useState([])
  const [myJoined, setMyJoined] = useState({})
  const [myRegistered, setMyRegistered] = useState({})
  const [tab, setTab] = useState('feed')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [participants, setParticipants] = useState([])
  const [filter, setFilter] = useState('all')

  const canManage = isContributorOrAdmin(profile)

  const load = useCallback(async () => {
    const [{ data:u }, { data:c }, { data:j }] = await Promise.all([
      getCommunityUpdates(),
      getChallenges(),
      user ? getUserChallenges(user.id) : Promise.resolve({ data:[] }),
    ])
    setUpdates(u||[])
    setChallenges(c||[])
    const jMap = {}; (j||[]).forEach(x => { jMap[x.challenge_id] = true }); setMyJoined(jMap)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const openEvent = (item) => { setSelected(item); setParticipants([]) }
  const openChallenge = async (c) => {
    setSelected({ ...c, _type:'challenge' })
    const { data } = await getChallengeParticipants(c.id, 10)
    setParticipants(data||[])
  }

  const handleRegister = async (event) => {
    if (!user) { navigate('/login'); return }
    if (event.is_paid) { toast.error('This event is for registered members only'); return }
    const { error } = await registerForEvent(event.id, user.id)
    if (error && !error.message?.includes('unique')) { toast.error('Could not register'); return }
    setMyRegistered(r => ({ ...r, [event.id]: true }))
    toast.success(`Registered! 🎉`)
  }

  const handleJoin = async (c) => {
    if (!user) { navigate('/login'); return }
    if (c.visibility === 'restricted') { toast.error('This challenge is restricted'); return }
    const { error } = await joinChallenge(c.id, user.id)
    if (error && !error.message?.includes('unique')) { toast.error(error.message); return }
    setMyJoined(j => ({ ...j, [c.id]: true }))
    toast.success(`Joined! 🔥`)
  }

  const addToCalendar = (event) => {
    const start = new Date(event.event_date)
    const end = new Date(start.getTime() + (event.duration_mins||60)*60000)
    const fmt = d => d.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z'
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(event.description||'')}`, '_blank')
  }

  const activeChallenges = challenges.filter(c => c.status === 'active' || c.status === 'upcoming')
  const TYPE_FILTERS = ['all','community_news','success_story','free_event','paid_event','webinar','workshop']
  const filteredUpdates = filter === 'all' ? updates : updates.filter(u => u.event_type === filter)
  const [featuredItem, ...restUpdates] = filteredUpdates

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <div className="community-page" style={{ padding:'24px 16px', maxWidth:1180, margin:'0 auto' }}>
      <style>{`
        @media (max-width: 880px) {
          .community-page .community-grid { grid-template-columns: 1fr !important; }
          .community-page .community-hero-title { font-size: 1.7rem !important; }
        }
      `}</style>

      {/* ── HERO HEADER ── */}
      <div style={{ marginBottom:28 }}>
        <div className="community-hero-title" style={{ fontFamily:"'Playfair Display',serif", fontSize:'2.2rem', fontWeight:800, color:'#1A0800', marginBottom:6, letterSpacing:'-.5px' }}>Community</div>
        <div style={{ fontSize:14, color:'#8C7B6E', marginBottom:20 }}>News, challenges, and live events — together with people writing their Day1.</div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'inline-flex', gap:4, background:'#F5EDE4', borderRadius:100, padding:4 }}>
            {[['feed','🌍 Feed'],['challenges','🏆 Challenges'],['events','📅 Events']].map(([k,l]) => (
              <button key={k} onClick={()=>setTab(k)} style={{
                padding:'9px 20px', borderRadius:100, border:'none', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit',
                background: tab===k ? '#1A0800' : 'transparent', color: tab===k ? 'white' : '#6B5347',
                boxShadow: tab===k ? '0 6px 16px rgba(26,8,0,.25)' : 'none', transition:'all .2s',
              }}>{l}</button>
            ))}
          </div>
          {canManage && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin')}>+ Create Event / Challenge</button>
          )}
        </div>
      </div>

      <div className="community-grid" style={{ display:'grid', gridTemplateColumns:selected?'1fr 380px':'3fr 1fr', gap:24, alignItems:'start' }}>
        {/* ── MAIN CONTENT ── */}
        <div>
          {/* ── FEED ── */}
          {tab === 'feed' && (
            <>
              {/* Filter chips */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
                {TYPE_FILTERS.map(f => (
                  <button key={f} onClick={()=>setFilter(f)} style={{
                    padding:'6px 16px', borderRadius:100, border:'none', cursor:'pointer', fontSize:12.5, fontWeight:600, fontFamily:'inherit', transition:'all .2s', textTransform:'capitalize',
                    background: filter===f ? '#FF6B2B' : 'white', color: filter===f ? 'white' : '#6B5347',
                    boxShadow: filter===f ? '0 6px 16px rgba(255,107,43,.3)' : '0 1px 4px rgba(26,8,0,.05)',
                  }}>
                    {f === 'all' ? 'All' : (TYPE_META[f]?.label || f)}
                  </button>
                ))}
              </div>

              {featuredItem && (
                <div style={{ marginBottom:20 }}>
                  <EventCard item={featuredItem} profile={profile} registered={myRegistered[featuredItem.id]} onRegister={handleRegister} onCalendar={addToCalendar} onOpen={openEvent} featured/>
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:18 }}>
                {restUpdates.map(item => (
                  <EventCard key={item.id} item={item} profile={profile} registered={myRegistered[item.id]} onRegister={handleRegister} onCalendar={addToCalendar} onOpen={openEvent}/>
                ))}
                {filteredUpdates.length === 0 && <EmptyState icon="📭" title="Nothing here yet" subtitle="Check back soon!"/>}
              </div>
            </>
          )}

          {/* ── CHALLENGES ── */}
          {tab === 'challenges' && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:18 }}>
              {challenges.map(c => (
                <ChallengeCard key={c.id} c={c} profile={profile} joined={myJoined} onJoin={handleJoin} onOpen={openChallenge}/>
              ))}
              {challenges.length === 0 && <EmptyState icon="🏆" title="No challenges yet" subtitle="New challenges are coming soon!"/>}
            </div>
          )}

          {/* ── EVENTS ── */}
          {tab === 'events' && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:18 }}>
              {updates.filter(u => ['free_event','paid_event','webinar','workshop'].includes(u.event_type)).map(item => (
                <EventCard key={item.id} item={item} profile={profile} registered={myRegistered[item.id]} onRegister={handleRegister} onCalendar={addToCalendar} onOpen={openEvent}/>
              ))}
              {updates.filter(u => ['free_event','paid_event','webinar','workshop'].includes(u.event_type)).length === 0 && (
                <EmptyState icon="📅" title="No events yet" subtitle="Stay tuned for upcoming live sessions."/>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR or DETAIL ── */}
        {selected ? (
          <div style={{ position:'sticky', top:80, height:'fit-content' }}>
            {selected._type === 'challenge' ? (
              /* Challenge detail */
              <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:24, overflow:'hidden', boxShadow:'0 8px 28px rgba(26,8,0,.06)' }}>
                <div style={{ position:'relative', background:'linear-gradient(135deg,#1A0800,#4A2800)', padding:'24px 22px 20px', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:-40, right:-40, width:140, height:140, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,107,43,.35),transparent 70%)' }}/>
                  <div style={{ position:'relative', display:'flex', justifyContent:'space-between' }}>
                    <Badge color="white" bg="rgba(255,107,43,.3)">{selected.status}</Badge>
                    <button onClick={()=>setSelected(null)} style={{ background:'rgba(255,255,255,.15)', border:'none', cursor:'pointer', color:'white', borderRadius:'50%', width:28, height:28, fontSize:15, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                  </div>
                  <div style={{ position:'relative', fontFamily:"'Playfair Display',serif", fontSize:'1.25rem', fontWeight:700, color:'white', marginTop:12, lineHeight:1.3 }}>{selected.title}</div>
                </div>
                <div style={{ padding:20, maxHeight:560, overflowY:'auto' }}>
                  {selected.description && <p style={{ fontSize:13, color:'#4A2800', lineHeight:1.6, marginBottom:14 }}>{selected.description}</p>}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                    {[['🏆',selected.reward_points+'pts','Reward'],['👥',selected.participants_count||0,'Joined'],['⏱',selected.duration_days+'d','Duration']].map(([icon,v,l])=>(
                      <div key={l} style={{ textAlign:'center', background:'#F5EDE4', borderRadius:14, padding:'12px 4px' }}>
                        <div style={{ fontSize:15 }}>{icon}</div>
                        <div style={{ fontSize:14, fontWeight:800, color:'#FF6B2B' }}>{v}</div>
                        <div style={{ fontSize:10, color:'#8C7B6E', textTransform:'uppercase', letterSpacing:.3 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {!myJoined[selected.id] && (
                    <button onClick={() => handleJoin(selected)} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginBottom:16, fontSize:13, borderRadius:100, padding:'12px' }}>Join This Challenge →</button>
                  )}
                  <div style={{ height:1, background:'#F5EDE4', margin:'0 0 16px' }}/>
                  {/* Participants */}
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>🏅 Top 10 Participants</div>
                  {participants.length === 0 && <div style={{ fontSize:12, color:'#8C7B6E', textAlign:'center', padding:'20px 0' }}>No participants yet — be the first!</div>}
                  {participants.map((p,i) => (
                    <div key={p.user_id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 8px', borderRadius:12, transition:'background .15s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#FDF6EE'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <div style={{ width:22, fontSize:14, textAlign:'center', fontWeight:700 }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:getAvatarColor(p.full_name||''), color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0, boxShadow: i<3 ? '0 0 0 2px #FFD166' : 'none' }}>
                        {p.avatar_url?<img src={p.avatar_url} alt="" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} loading="lazy" />:getInitials(p.full_name||p.username||'?')}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12.5, fontWeight:600, display:'flex', alignItems:'center', gap:4 }}><span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.full_name||p.username}</span><ProBadge profile={p} size="xs"/></div>
                        <div style={{ fontSize:10.5, color:'#8C7B6E' }}>🔥 {p.streak||0}d · {p.points_earned||0}pts</div>
                      </div>
                      {p.completed && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:100, background:'rgba(5,150,105,.1)', color:'#059669', fontWeight:700 }}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Event detail */
              <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:24, overflow:'hidden', boxShadow:'0 8px 28px rgba(26,8,0,.06)' }}>
                {selected.cover_image_url
                  ? <div style={{ height:180, background:`url(${selected.cover_image_url}) center/cover` }}/>
                  : <div style={{ height:6, background:TYPE_META[selected.event_type]?.gradient||TYPE_META.community_news.gradient }}/>
                }
                <div style={{ padding:22, maxHeight:560, overflowY:'auto' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <Badge color={TYPE_META[selected.event_type]?.color} bg={TYPE_META[selected.event_type]?.bg}>{TYPE_META[selected.event_type]?.label}</Badge>
                    <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#8C7B6E', fontSize:22 }}>×</button>
                  </div>
                  <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.3rem', marginBottom:12, lineHeight:1.3 }}>{selected.title}</h3>
                  {selected.description && <p style={{ fontSize:13.5, color:'#4A2800', lineHeight:1.65, marginBottom:16 }}>{selected.description}</p>}
                  <div style={{ display:'flex', flexDirection:'column', gap:7, fontSize:13, color:'#4A2800', marginBottom:16 }}>
                    {selected.event_date && <div>📅 <strong>{format(new Date(selected.event_date),'EEEE, d MMMM yyyy')}</strong></div>}
                    {selected.event_date && <div>🕐 <strong>{format(new Date(selected.event_date),'h:mm a')}</strong></div>}
                    {selected.duration_mins && <div>⏱ <strong>{selected.duration_mins} minutes</strong></div>}
                    {selected.seats_available && <div>💺 <strong>{selected.seats_available-(selected.seats_booked||0)}/{selected.seats_available}</strong> seats</div>}
                  </div>
                  {selected.speaker_name && (
                    <div style={{ background:'#F5EDE4', borderRadius:16, padding:14, marginBottom:16 }}>
                      <div style={{ fontSize:11, color:'#8C7B6E', marginBottom:4, textTransform:'uppercase', letterSpacing:.4, fontWeight:600 }}>Speaker</div>
                      <div style={{ fontSize:14.5, fontWeight:700 }}>{selected.speaker_name}</div>
                      {selected.speaker_bio && <div style={{ fontSize:12.5, color:'#4A2800', marginTop:4 }}>{selected.speaker_bio}</div>}
                    </div>
                  )}
                  {selected.agenda && (
                    <div style={{ marginBottom:16 }}>
                      <div style={{ fontSize:12.5, fontWeight:700, marginBottom:9 }}>Agenda</div>
                      {selected.agenda.split('\n').filter(Boolean).map((line,i) => (
                        <div key={i} style={{ fontSize:12.5, color:'#4A2800', padding:'6px 0', borderBottom:'1px solid #F5EDE4' }}>{line}</div>
                      ))}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {myRegistered[selected.id]
                      ? <><span style={{ fontSize:13, fontWeight:700, color:'#059669' }}>✓ Registered!</span>
                          <button onClick={()=>addToCalendar(selected)} style={{ fontSize:11, padding:'7px 14px', borderRadius:100, border:'1px solid #DDD3CA', background:'white', cursor:'pointer', fontFamily:'inherit' }}>📅 Add to Calendar</button></>
                      : selected.is_paid && !profile?.is_pro
                        ? <button onClick={() => {setSelected(null);navigate('/plans')}} className="btn btn-primary btn-sm">Upgrade to Join →</button>
                        : <button onClick={() => { handleRegister(selected); setSelected(null) }} className="btn btn-primary btn-sm">Register Now →</button>
                    }
                    {selected.zoom_link && myRegistered[selected.id] && <a href={selected.zoom_link} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Join Meeting →</a>}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Default right sidebar */
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <AdSlot placement="community" variant="banner" />

            {/* Active challenges */}
            {activeChallenges.length > 0 && (
              <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:20, overflow:'hidden', boxShadow:'0 2px 8px rgba(26,8,0,.04)' }}>
                <div style={{ padding:'16px 18px', borderBottom:'1px solid #F0EAE4', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontWeight:700, fontSize:13.5 }}>🔥 Active Challenges</div>
                  <button onClick={()=>setTab('challenges')} style={{ fontSize:11.5, color:'#FF6B2B', background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>See all</button>
                </div>
                {activeChallenges.slice(0,4).map(c => (
                  <div key={c.id} onClick={()=>openChallenge(c)} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 18px', borderBottom:'1px solid #F5EDE4', cursor:'pointer', transition:'background .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#FDF6EE'}
                    onMouseLeave={e=>e.currentTarget.style.background='white'}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12.5, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title}</div>
                      <div style={{ fontSize:10.5, color:'#8C7B6E', marginTop:3 }}>👥 {c.participants_count||0} joined · {c.duration_days}d</div>
                    </div>
                    <span style={{ fontSize:10, padding:'3px 9px', borderRadius:100, background:c.visibility==='pro'?'rgba(124,58,237,.1)':'rgba(255,107,43,.1)', color:c.visibility==='pro'?'#7C3AED':'#FF6B2B', fontWeight:700, flexShrink:0 }}>{c.visibility}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming events */}
            <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:20, overflow:'hidden', boxShadow:'0 2px 8px rgba(26,8,0,.04)' }}>
              <div style={{ padding:'16px 18px', borderBottom:'1px solid #F0EAE4' }}>
                <div style={{ fontWeight:700, fontSize:13.5 }}>📅 Upcoming Events</div>
              </div>
              {updates.filter(u => u.event_date && isFuture(new Date(u.event_date))).slice(0,4).map(item => {
                const meta = TYPE_META[item.event_type] || TYPE_META.community_news
                return (
                  <div key={item.id} onClick={()=>openEvent(item)} style={{ padding:'12px 18px', borderBottom:'1px solid #F5EDE4', cursor:'pointer', transition:'background .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#FDF6EE'}
                    onMouseLeave={e=>e.currentTarget.style.background='white'}>
                    <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                      <div style={{ width:38, height:38, borderRadius:12, background:meta.gradient, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{meta.label.split(' ')[0]}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12.5, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</div>
                        <div style={{ fontSize:10.5, color:'#8C7B6E', marginTop:3 }}>
                          {item.event_date && formatDistanceToNow(new Date(item.event_date), { addSuffix:true })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {updates.filter(u => u.event_date && isFuture(new Date(u.event_date))).length === 0 && (
                <div style={{ padding:'20px', fontSize:12, color:'#8C7B6E', textAlign:'center' }}>No upcoming events</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
