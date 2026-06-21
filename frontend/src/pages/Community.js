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
  community_news: { label:'📢 News',    color:'#2563EB', bg:'rgba(37,99,235,.1)',  dark:'#1E40AF' },
  success_story:  { label:'⭐ Story',   color:'#059669', bg:'rgba(5,150,105,.1)',  dark:'#065F46' },
  free_event:     { label:'🎉 Event',   color:'#FF6B2B', bg:'rgba(255,107,43,.1)', dark:'#C2410C' },
  paid_event:     { label:'💰 Paid',    color:'#7C3AED', bg:'rgba(124,58,237,.1)', dark:'#6D28D9' },
  webinar:        { label:'🎥 Webinar', color:'#F59E0B', bg:'rgba(245,158,11,.1)', dark:'#B45309' },
  workshop:       { label:'🛠 Workshop',color:'#EC4899', bg:'rgba(236,72,153,.1)', dark:'#BE185D' },
}

/* ── Event card component ── */
function EventCard({ item, profile, onRegister, onCalendar, onOpen, registered }) {
  const meta = TYPE_META[item.event_type] || TYPE_META.community_news
  const isEvent = ['free_event','paid_event','webinar','workshop'].includes(item.event_type)
  const seatsLeft = item.seats_available ? item.seats_available - (item.seats_booked||0) : null
  const isUpcoming = item.event_date && isFuture(new Date(item.event_date))
  const locked = item.is_paid && !profile?.is_pro

  return (
    <div onClick={() => onOpen(item)} style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:18, overflow:'hidden', cursor:'pointer', transition:'all .2s', boxShadow:'0 1px 4px rgba(26,8,0,.05)' }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor=meta.color; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 8px 24px ${meta.bg}` }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor='#F0EAE4'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 1px 4px rgba(26,8,0,.05)' }}>
      {/* Color header */}
      <div style={{ height:6, background:`linear-gradient(90deg,${meta.color},${meta.dark})` }}/>
      {item.cover_image_url && <div style={{ height:160, background:`url(${item.cover_image_url}) center/cover` }}/>}
      <div style={{ padding:'16px 18px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, padding:'2px 10px', borderRadius:100, background:meta.bg, color:meta.color, fontWeight:700 }}>{meta.label}</span>
          {locked && <span style={{ fontSize:11, padding:'2px 9px', borderRadius:100, background:'rgba(124,58,237,.1)', color:'#7C3AED', fontWeight:600 }}>👑 Pro Only</span>}
          {isUpcoming && <span style={{ fontSize:11, color:'#059669', fontWeight:600 }}>🟢 Upcoming</span>}
          {item.is_paid && profile?.is_pro && <span style={{ fontSize:11, color:'#059669', fontWeight:600 }}>✓ Free for Pro</span>}
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1rem', fontWeight:700, color:'#1A0800', marginBottom:6, lineHeight:1.3 }}>{item.title}</div>
        {item.description && <div style={{ fontSize:12, color:'#4A2800', lineHeight:1.6, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom:10 }}>{item.description}</div>}
        <div style={{ display:'flex', gap:12, fontSize:12, color:'#8C7B6E', flexWrap:'wrap', marginBottom:12 }}>
          {item.event_date && <span>📅 {format(new Date(item.event_date), 'd MMM, h:mm a')}</span>}
          {item.duration_mins && <span>⏱ {item.duration_mins}min</span>}
          {seatsLeft !== null && <span style={{ color: seatsLeft < 10 ? '#DC2626' : '#8C7B6E' }}>💺 {seatsLeft} left</span>}
          {item.speaker_name && <span>🎤 {item.speaker_name}</span>}
        </div>
        {isEvent && (
          <div onClick={e => e.stopPropagation()} style={{ display:'flex', gap:8 }}>
            {registered
              ? <><span style={{ fontSize:12, fontWeight:600, color:'#059669' }}>✓ Registered!</span>
                  <button onClick={() => onCalendar(item)} style={{ fontSize:11, padding:'5px 12px', borderRadius:100, border:'1px solid #DDD3CA', background:'white', cursor:'pointer', fontFamily:'inherit' }}>📅 Calendar</button></>
              : locked
                ? <button onClick={() => {}} style={{ fontSize:11, padding:'6px 14px', borderRadius:100, border:'1.5px solid #7C3AED', background:'transparent', color:'#7C3AED', cursor:'pointer', fontFamily:'inherit' }}>Upgrade to Join</button>
                : <button onClick={() => onRegister(item)} style={{ fontSize:12, padding:'7px 16px', borderRadius:100, border:'none', background:'#FF6B2B', color:'white', cursor:'pointer', fontWeight:600, fontFamily:'inherit', transition:'all .2s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#FF4500'}
                    onMouseLeave={e=>e.currentTarget.style.background='#FF6B2B'}>
                    Register Now
                  </button>
            }
          </div>
        )}
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
    <div onClick={() => onOpen(c)} style={{ background:'white', border:`1.5px solid ${isJoined?'rgba(5,150,105,.4)':'#F0EAE4'}`, borderRadius:18, padding:18, cursor:'pointer', transition:'all .2s' }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(255,107,43,.5)'; e.currentTarget.style.transform='translateY(-2px)' }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor=isJoined?'rgba(5,150,105,.4)':'#F0EAE4'; e.currentTarget.style.transform='none' }}>
      <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:10, padding:'2px 9px', borderRadius:100, background:c.status==='active'?'rgba(5,150,105,.1)':'rgba(37,99,235,.1)', color:c.status==='active'?'#059669':'#2563EB', fontWeight:700, textTransform:'uppercase' }}>{c.status}</span>
        {c.visibility==='pro' && <span style={{ fontSize:10, padding:'2px 9px', borderRadius:100, background:'rgba(124,58,237,.1)', color:'#7C3AED', fontWeight:600 }}>👑 Pro Only</span>}
        {isJoined && <span style={{ fontSize:10, padding:'2px 9px', borderRadius:100, background:'rgba(5,150,105,.1)', color:'#059669', fontWeight:700 }}>✓ You're In!</span>}
      </div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.05rem', fontWeight:700, marginBottom:8 }}>{c.title}</div>
      {c.description && <div style={{ fontSize:12, color:'#4A2800', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom:10 }}>{c.description}</div>}

      {/* Mini timer */}
      {c.start_date && c.end_date && (() => {
        const start = new Date(c.start_date), end = new Date(c.end_date), now = new Date()
        const total = Math.max(differenceInDays(end, start), 1)
        const done = Math.max(differenceInDays(now, start), 0)
        const pct = Math.min(Math.round((done/total)*100), 100)
        return (
          <div style={{ marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#8C7B6E', marginBottom:3 }}>
              <span>{c.start_date}</span><span>{c.end_date}</span>
            </div>
            <div style={{ height:4, background:'#F5EDE4', borderRadius:2 }}>
              <div style={{ height:4, width:`${pct}%`, background:'linear-gradient(90deg,#FF6B2B,#FFD166)', borderRadius:2 }}/>
            </div>
          </div>
        )
      })()}

      <div style={{ display:'flex', gap:12, fontSize:11, color:'#8C7B6E', marginBottom:12, flexWrap:'wrap' }}>
        <span>⏱ {c.duration_days}d</span>
        <span>🏆 {c.reward_points}pts</span>
        <span>⚡ {c.daily_points}pts/day</span>
        <span>👥 {c.participants_count||0}{c.participants_limit?`/${c.participants_limit}`:''} joined</span>
        {daysLeft !== null && c.status==='active' && <span style={{ color:'#FF6B2B', fontWeight:600 }}>⏰ {daysLeft}d left</span>}
      </div>

      <div onClick={e => e.stopPropagation()}>
        {isJoined
          ? <div style={{ fontSize:12, fontWeight:600, color:'#059669' }}>✓ Joined — check daily!</div>
          : locked
            ? <button style={{ fontSize:11, padding:'6px 14px', borderRadius:100, border:'1.5px solid #7C3AED', background:'transparent', color:'#7C3AED', cursor:'pointer', fontFamily:'inherit' }}>Upgrade to Join →</button>
            : <button onClick={() => onJoin(c)} style={{ fontSize:12, padding:'7px 18px', borderRadius:100, border:'none', background:'#FF6B2B', color:'white', cursor:'pointer', fontWeight:600, fontFamily:'inherit', transition:'all .2s' }}
                onMouseEnter={e=>e.currentTarget.style.background='#FF4500'}
                onMouseLeave={e=>e.currentTarget.style.background='#FF6B2B'}>
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

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <div style={{ padding:'16px', maxWidth:1100 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ display:'flex', gap:0, borderBottom:'2px solid #F0EAE4' }}>
            {[['feed','🌍 Feed'],['challenges','🏆 Challenges'],['events','📅 Events']].map(([k,l]) => (
              <button key={k} onClick={()=>setTab(k)} style={{ padding:'8px 18px', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', color:tab===k?'#FF6B2B':'#8C7B6E', borderBottom:tab===k?'2px solid #FF6B2B':'2px solid transparent', marginBottom:'-2px' }}>{l}</button>
            ))}
          </div>
        </div>
        {canManage && (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin')}>+ Create Event / Challenge</button>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:selected?'1fr 380px':'3fr 1fr', gap:20 }}>
        {/* ── MAIN CONTENT ── */}
        <div>
          {/* ── FEED ── */}
          {tab === 'feed' && (
            <>
              {/* Filter chips */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
                {TYPE_FILTERS.map(f => (
                  <button key={f} onClick={()=>setFilter(f)} style={{ padding:'4px 12px', borderRadius:100, border:`1px solid ${filter===f?'#FF6B2B':'#DDD3CA'}`, background:filter===f?'rgba(255,107,43,.1)':'white', color:filter===f?'#FF6B2B':'#6B5347', fontSize:12, fontWeight:500, cursor:'pointer', transition:'all .15s', fontFamily:'inherit', textTransform:'capitalize' }}>
                    {f === 'all' ? 'All' : (TYPE_META[f]?.label || f)}
                  </button>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
                {filteredUpdates.map(item => (
                  <EventCard key={item.id} item={item} profile={profile} registered={myRegistered[item.id]} onRegister={handleRegister} onCalendar={addToCalendar} onOpen={openEvent}/>
                ))}
                {filteredUpdates.length === 0 && <div className="empty-state" style={{ gridColumn:'1/-1' }}><div className="empty-state-icon">📭</div><h3>Nothing here yet</h3><p>Check back soon!</p></div>}
              </div>
            </>
          )}

          {/* ── CHALLENGES ── */}
          {tab === 'challenges' && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
              {challenges.map(c => (
                <ChallengeCard key={c.id} c={c} profile={profile} joined={myJoined} onJoin={handleJoin} onOpen={openChallenge}/>
              ))}
              {challenges.length === 0 && <div className="empty-state" style={{ gridColumn:'1/-1' }}><div className="empty-state-icon">🏆</div><h3>No challenges yet</h3><p>New challenges are coming soon!</p></div>}
            </div>
          )}

          {/* ── EVENTS ── */}
          {tab === 'events' && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
              {updates.filter(u => ['free_event','paid_event','webinar','workshop'].includes(u.event_type)).map(item => (
                <EventCard key={item.id} item={item} profile={profile} registered={myRegistered[item.id]} onRegister={handleRegister} onCalendar={addToCalendar} onOpen={openEvent}/>
              ))}
              {updates.filter(u => ['free_event','paid_event','webinar','workshop'].includes(u.event_type)).length === 0 && (
                <div className="empty-state" style={{ gridColumn:'1/-1' }}><div className="empty-state-icon">📅</div><h3>No events yet</h3></div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR or DETAIL ── */}
        {selected ? (
          <div style={{ position:'sticky', top:80, height:'fit-content' }}>
            {selected._type === 'challenge' ? (
              /* Challenge detail */
              <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:18, overflow:'hidden' }}>
                <div style={{ background:'linear-gradient(135deg,#1A0800,#4A2800)', padding:'20px 20px 16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:100, background:'rgba(255,107,43,.3)', color:'white', fontWeight:700 }}>{selected.status}</span>
                    <button onClick={()=>setSelected(null)} style={{ background:'rgba(255,255,255,.15)', border:'none', cursor:'pointer', color:'white', borderRadius:'50%', width:26, height:26, fontSize:15, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                  </div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.1rem', fontWeight:700, color:'white', marginTop:10 }}>{selected.title}</div>
                </div>
                <div style={{ padding:18, maxHeight:560, overflowY:'auto' }}>
                  {selected.description && <p style={{ fontSize:12, color:'#4A2800', lineHeight:1.6, marginBottom:12 }}>{selected.description}</p>}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
                    {[['🏆',selected.reward_points+'pts','Reward'],['👥',selected.participants_count||0,'Joined'],['⏱',selected.duration_days+'d','Duration']].map(([icon,v,l])=>(
                      <div key={l} style={{ textAlign:'center', background:'#F5EDE4', borderRadius:9, padding:'9px 4px' }}>
                        <div style={{ fontSize:14 }}>{icon}</div>
                        <div style={{ fontSize:13, fontWeight:700, color:'#FF6B2B' }}>{v}</div>
                        <div style={{ fontSize:10, color:'#8C7B6E' }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {!myJoined[selected.id] && (
                    <button onClick={() => handleJoin(selected)} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginBottom:14, fontSize:13 }}>Join This Challenge →</button>
                  )}
                  <div style={{ height:1, background:'#F5EDE4', margin:'0 0 14px' }}/>
                  {/* Participants */}
                  <div style={{ fontSize:12, fontWeight:700, marginBottom:10 }}>🏅 Top 10 Participants</div>
                  {participants.length === 0 && <div style={{ fontSize:12, color:'#8C7B6E', textAlign:'center', padding:'16px 0' }}>No participants yet — be the first!</div>}
                  {participants.map((p,i) => (
                    <div key={p.user_id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px solid #F5EDE4' }}>
                      <div style={{ width:20, fontSize:13, textAlign:'center', fontWeight:700 }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:getAvatarColor(p.full_name||''), color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>
                        {p.avatar_url?<img src={p.avatar_url} alt="" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} loading="lazy" />:getInitials(p.full_name||p.username||'?')}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:4 }}><span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.full_name||p.username}</span><ProBadge profile={p} size="xs"/></div>
                        <div style={{ fontSize:10, color:'#8C7B6E' }}>🔥 {p.streak||0}d · {p.points_earned||0}pts</div>
                      </div>
                      {p.completed && <span style={{ fontSize:9, padding:'2px 6px', borderRadius:100, background:'rgba(5,150,105,.1)', color:'#059669', fontWeight:700 }}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Event detail */
              <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:18, overflow:'hidden' }}>
                <div style={{ height:5, background:`linear-gradient(90deg,${TYPE_META[selected.event_type]?.color||'#FF6B2B'},${TYPE_META[selected.event_type]?.dark||'#FF4500'})` }}/>
                {selected.cover_image_url && <div style={{ height:160, background:`url(${selected.cover_image_url}) center/cover` }}/>}
                <div style={{ padding:20, maxHeight:560, overflowY:'auto' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <span style={{ fontSize:11, padding:'2px 9px', borderRadius:100, background:TYPE_META[selected.event_type]?.bg, color:TYPE_META[selected.event_type]?.color, fontWeight:600 }}>{TYPE_META[selected.event_type]?.label}</span>
                    <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#8C7B6E', fontSize:20 }}>×</button>
                  </div>
                  <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.15rem', marginBottom:10 }}>{selected.title}</h3>
                  {selected.description && <p style={{ fontSize:13, color:'#4A2800', lineHeight:1.65, marginBottom:14 }}>{selected.description}</p>}
                  <div style={{ display:'flex', flexDirection:'column', gap:6, fontSize:13, color:'#4A2800', marginBottom:14 }}>
                    {selected.event_date && <div>📅 <strong>{format(new Date(selected.event_date),'EEEE, d MMMM yyyy')}</strong></div>}
                    {selected.event_date && <div>🕐 <strong>{format(new Date(selected.event_date),'h:mm a')}</strong></div>}
                    {selected.duration_mins && <div>⏱ <strong>{selected.duration_mins} minutes</strong></div>}
                    {selected.seats_available && <div>💺 <strong>{selected.seats_available-(selected.seats_booked||0)}/{selected.seats_available}</strong> seats</div>}
                  </div>
                  {selected.speaker_name && (
                    <div style={{ background:'#F5EDE4', borderRadius:12, padding:12, marginBottom:14 }}>
                      <div style={{ fontSize:11, color:'#8C7B6E', marginBottom:3 }}>SPEAKER</div>
                      <div style={{ fontSize:14, fontWeight:700 }}>{selected.speaker_name}</div>
                      {selected.speaker_bio && <div style={{ fontSize:12, color:'#4A2800', marginTop:4 }}>{selected.speaker_bio}</div>}
                    </div>
                  )}
                  {selected.agenda && (
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:12, fontWeight:700, marginBottom:8 }}>Agenda</div>
                      {selected.agenda.split('\n').filter(Boolean).map((line,i) => (
                        <div key={i} style={{ fontSize:12, color:'#4A2800', padding:'5px 0', borderBottom:'1px solid #F5EDE4' }}>{line}</div>
                      ))}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {myRegistered[selected.id]
                      ? <><span style={{ fontSize:12, fontWeight:600, color:'#059669' }}>✓ Registered!</span>
                          <button onClick={()=>addToCalendar(selected)} style={{ fontSize:11, padding:'6px 12px', borderRadius:100, border:'1px solid #DDD3CA', background:'white', cursor:'pointer', fontFamily:'inherit' }}>📅 Add to Calendar</button></>
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
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <AdSlot placement="community" variant="banner" />

            {/* Active challenges */}
            {activeChallenges.length > 0 && (
              <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:16, overflow:'hidden' }}>
                <div style={{ padding:'14px 16px', borderBottom:'1px solid #F0EAE4', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>🔥 Active Challenges</div>
                  <button onClick={()=>setTab('challenges')} style={{ fontSize:11, color:'#FF6B2B', background:'none', border:'none', cursor:'pointer' }}>See all</button>
                </div>
                {activeChallenges.slice(0,4).map(c => (
                  <div key={c.id} onClick={()=>openChallenge(c)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderBottom:'1px solid #F5EDE4', cursor:'pointer', transition:'background .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#FDF6EE'}
                    onMouseLeave={e=>e.currentTarget.style.background='white'}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title}</div>
                      <div style={{ fontSize:10, color:'#8C7B6E', marginTop:2 }}>👥 {c.participants_count||0} joined · {c.duration_days}d</div>
                    </div>
                    <span style={{ fontSize:10, padding:'2px 7px', borderRadius:100, background:c.visibility==='pro'?'rgba(124,58,237,.1)':'rgba(255,107,43,.1)', color:c.visibility==='pro'?'#7C3AED':'#FF6B2B', fontWeight:600, flexShrink:0 }}>{c.visibility}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming events */}
            <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:16, overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', borderBottom:'1px solid #F0EAE4' }}>
                <div style={{ fontWeight:600, fontSize:13 }}>📅 Upcoming Events</div>
              </div>
              {updates.filter(u => u.event_date && isFuture(new Date(u.event_date))).slice(0,4).map(item => {
                const meta = TYPE_META[item.event_type] || TYPE_META.community_news
                return (
                  <div key={item.id} onClick={()=>openEvent(item)} style={{ padding:'10px 16px', borderBottom:'1px solid #F5EDE4', cursor:'pointer', transition:'background .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#FDF6EE'}
                    onMouseLeave={e=>e.currentTarget.style.background='white'}>
                    <div style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
                      <div style={{ width:36, height:36, borderRadius:9, background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{meta.label.split(' ')[0]}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</div>
                        <div style={{ fontSize:10, color:'#8C7B6E', marginTop:2 }}>
                          {item.event_date && formatDistanceToNow(new Date(item.event_date), { addSuffix:true })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {updates.filter(u => u.event_date && isFuture(new Date(u.event_date))).length === 0 && (
                <div style={{ padding:'16px', fontSize:12, color:'#8C7B6E', textAlign:'center' }}>No upcoming events</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
