import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getHabits, getUserHabits, adoptHabit, logHabit, getHabitLogs,
  getChallengeDetail, getChallengeParticipants, getChallenges,
  joinChallenge, getUserChallenges, isContributorOrAdmin, adminUpsertHabit
} from '../lib/api'
import ProBadge from '../components/ProBadge'
import { getInitials, getAvatarColor } from '../components/Sidebar'
import { toast } from '../components/Toast'
import { differenceInDays, formatDistanceToNow, isPast, isFuture, format } from 'date-fns'

const COLORS = ['rgba(255,107,43,.12)','rgba(124,58,237,.12)','rgba(5,150,105,.12)','rgba(37,99,235,.12)','rgba(220,38,38,.12)','rgba(245,158,11,.12)','rgba(236,72,153,.12)','rgba(14,165,233,.12)']

/* ── Habit Timer Bar ── */
function HabitTimer({ habit }) {
  if (!habit.start_date && !habit.end_date) return null
  const now = new Date()
  const start = habit.start_date ? new Date(habit.start_date) : null
  const end   = habit.end_date   ? new Date(habit.end_date)   : null

  let status, label, pct = 0
  if (start && isFuture(start)) {
    status = 'upcoming'; label = `Starts in ${formatDistanceToNow(start)}`; pct = 0
  } else if (end && isPast(end)) {
    status = 'ended'; label = 'Challenge ended'; pct = 100
  } else if (start && end) {
    const total = differenceInDays(end, start) || 1
    const done  = differenceInDays(now, start)
    pct = Math.min(Math.round((done / total) * 100), 100)
    const left = differenceInDays(end, now)
    label = left <= 0 ? 'Last day!' : `${left} days left · ends ${format(end,'d MMM')}`
    status = 'active'
  } else if (end) {
    label = `Ends ${format(end,'d MMM yyyy')}`;  status = 'active'; pct = 50
  } else {
    label = `Started ${format(start,'d MMM yyyy')}`; status = 'active'; pct = 30
  }

  const colors = { upcoming:'#2563EB', active:'#FF6B2B', ended:'#8C7B6E' }
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:colors[status], fontWeight:600, marginBottom:3 }}>
        <span style={{ textTransform:'uppercase', letterSpacing:'.04em' }}>{status}</span>
        <span>{label}</span>
      </div>
      <div style={{ height:4, background:'rgba(26,8,0,.07)', borderRadius:2 }}>
        <div style={{ height:4, width:`${pct}%`, background:`linear-gradient(90deg,${colors[status]},${status==='active'?'#FFD166':colors[status]})`, borderRadius:2, transition:'width .6s ease' }}/>
      </div>
    </div>
  )
}

/* ── Participants list ── */
function ParticipantsList({ challengeId }) {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getChallengeParticipants(challengeId, 10).then(({ data }) => {
      setPeople(data || [])
      setLoading(false)
    })
  }, [challengeId])

  if (loading) return <div style={{ padding:12, textAlign:'center', color:'#8C7B6E', fontSize:12 }}>Loading participants…</div>
  if (!people.length) return <div style={{ padding:12, textAlign:'center', color:'#8C7B6E', fontSize:12 }}>No participants yet. Be the first!</div>

  return (
    <div>
      <div style={{ fontSize:12, fontWeight:700, marginBottom:10, color:'#1A0800' }}>🏅 Top Participants</div>
      {people.map((p, i) => (
        <div key={p.user_id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #F5EDE4' }}>
          <div style={{ width:22, textAlign:'center', fontSize:14, fontWeight:700, flexShrink:0 }}>
            {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}
          </div>
          <div style={{ width:30, height:30, borderRadius:'50%', background:getAvatarColor(p.full_name||''), color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
            {p.avatar_url ? <img src={p.avatar_url} alt="" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} loading="lazy" /> : getInitials(p.full_name||p.username||'?')}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.full_name||p.username}</span>
              <ProBadge profile={p} size="xs"/>
            </div>
            <div style={{ fontSize:10, color:'#8C7B6E' }}>🔥 {p.streak||0}d streak · {p.points_earned||0}pts</div>
          </div>
          {p.completed && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:100, background:'rgba(5,150,105,.1)', color:'#059669', fontWeight:600 }}>✓ Done</span>}
        </div>
      ))}
    </div>
  )
}

export default function Habits() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [habits, setHabits] = useState([])
  const [challenges, setChallenges] = useState([])
  const [userHabits, setUserHabits] = useState({})
  const [joined, setJoined] = useState({})
  const [selected, setSelected] = useState(null)       // selected habit
  const [selChallenge, setSelChallenge] = useState(null) // selected challenge detail
  const [logs, setLogs] = useState([])
  const [note, setNote] = useState('')
  const [tab, setTab] = useState('habits')
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')

  const canManage = isContributorOrAdmin(profile)

  const load = useCallback(async () => {
    const [{ data:h }, { data:uh }, { data:c }, { data:uc }] = await Promise.all([
      getHabits(),
      getUserHabits(user.id),
      getChallenges(),
      getUserChallenges(user.id),
    ])
    setHabits(h||[])
    setChallenges(c||[])
    const map = {}
    ;(uh||[]).forEach(u => { map[u.habit_id] = u })
    setUserHabits(map)
    // Pre-populate joined challenges from backend
    const joinedMap = {}
    ;(uc||[]).forEach(cp => { joinedMap[cp.challenge_id] = true })
    setJoined(joinedMap)
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  const handleAdopt = async (habit) => {
    if (!user) { navigate('/login'); return }
    const { data, error } = await adoptHabit(user.id, habit.id)
    if (error) { toast.error(error.message); return }
    setUserHabits(prev => ({ ...prev, [habit.id]: data }))
    toast.success(`You adopted "${habit.title}"! Day 1 starts now 🎉`)
  }

  const handleSelectHabit = async (habit) => {
    setSelected(habit)
    if (userHabits[habit.id]) {
      const { data } = await getHabitLogs(user.id, habit.id)
      setLogs(data || [])
    } else {
      setLogs([])
    }
  }

  const handleLog = async () => {
    if (!note.trim()) return
    const uh = userHabits[selected.id]
    if (!uh) return
    const { error } = await logHabit({ user_id:user.id, habit_id:selected.id, day_number:uh.current_day, note })
    if (error) { toast.error(error.message); return }
    toast.success(`Day ${uh.current_day} logged! Keep going 🔥`)
    setNote('')
    const { data } = await getHabitLogs(user.id, selected.id)
    setLogs(data || [])
  }

  const handleJoinChallenge = async (challenge) => {
    if (!user) { navigate('/login'); return }
    if (challenge.visibility === 'pro' && !profile?.is_pro) {
      toast.error('This challenge is for Pro members only.'); navigate('/plans'); return
    }
    const { error } = await joinChallenge(challenge.id, user.id)
    if (error) { toast.error(error.message); return }
    setJoined(j => ({ ...j, [challenge.id]: true }))
    toast.success(`Joined "${challenge.title}"! 🔥`)
  }

  const openChallengeDetail = async (c) => {
    setSelChallenge(c)
  }

  const filtered = habits.filter(h =>
    h.title.toLowerCase().includes(searchQ.toLowerCase()) ||
    (h.category||'').toLowerCase().includes(searchQ.toLowerCase())
  )

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <div style={{ padding:'16px' }}>
      <style>{`
        @media (max-width: 860px) { .habits-split { grid-template-columns: 1fr !important; } }
      `}</style>
      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'2px solid #F0EAE4', marginBottom:20 }}>
        {[['habits','📚 Habit Library'],['challenges','🏆 Challenges']].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)} style={{ padding:'8px 20px', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', color:tab===k?'#FF6B2B':'#8C7B6E', borderBottom:tab===k?'2px solid #FF6B2B':'2px solid transparent', marginBottom:'-2px' }}>{l}</button>
        ))}
      </div>

      {/* ── HABIT LIBRARY ── */}
      {tab === 'habits' && (
        <div className="habits-split" style={{ display:'grid', gridTemplateColumns:selected?'1fr 360px':'1fr', gap:24 }}>
          <div>
            <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
              <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search habits…" style={{ flex:1, minWidth:180, padding:'9px 14px', border:'1.5px solid #DDD3CA', borderRadius:100, fontSize:13, fontFamily:'inherit', outline:'none' }}/>
              {canManage && <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin')}>+ Add Habit</button>}
            </div>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:18 }}>
              {[[habits.length,'Habits Available'],[Object.keys(userHabits).length,'Adopted'],[Object.values(userHabits).reduce((a,h)=>a+(h.streak||0),0),'Total Streak Days']].map(([v,l])=>(
                <div key={l} style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:12, padding:'12px 16px' }}>
                  <div style={{ fontSize:20, fontWeight:700, color:'#FF6B2B', fontFamily:"'Playfair Display',serif" }}>{v}</div>
                  <div style={{ fontSize:11, color:'#8C7B6E', marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
              {filtered.map((h,i) => {
                const adopted = userHabits[h.id]
                return (
                  <div key={h.id} onClick={() => handleSelectHabit(h)} style={{ background:'white', border:`1.5px solid ${selected?.id===h.id?'#FF6B2B':'#F0EAE4'}`, borderRadius:16, padding:16, cursor:'pointer', transition:'all .2s' }}
                    onMouseEnter={e => { if(selected?.id!==h.id) e.currentTarget.style.borderColor='rgba(255,107,43,.4)' }}
                    onMouseLeave={e => { if(selected?.id!==h.id) e.currentTarget.style.borderColor='#F0EAE4' }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:COLORS[i%COLORS.length], display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:10 }}>{h.icon||'✨'}</div>
                    <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>{h.title}</div>
                    <div style={{ fontSize:11, color:'#8C7B6E', marginBottom:8 }}>{(h.adopters_count||0).toLocaleString()} adopters · {h.completion_rate||0}% completion</div>

                    {/* Timer bar */}
                    <HabitTimer habit={h}/>

                    <div style={{ height:4, background:'#F5EDE4', borderRadius:2, marginBottom:10 }}>
                      <div style={{ height:4, width:`${h.completion_rate||0}%`, background:'linear-gradient(90deg,#FF6B2B,#FFD166)', borderRadius:2 }}/>
                    </div>
                    {adopted
                      ? <button style={{ width:'100%', padding:'7px', borderRadius:100, border:'1.5px solid rgba(5,150,105,.3)', background:'rgba(5,150,105,.08)', color:'#059669', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>✓ Day {adopted.current_day} · 🔥 {adopted.streak||0}d</button>
                      : <button onClick={e => { e.stopPropagation(); if(!user){navigate('/login');return}; handleAdopt(h) }} style={{ width:'100%', padding:'7px', borderRadius:100, border:'1.5px solid #FF6B2B', background:'transparent', color:'#FF6B2B', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .2s' }}
                          onMouseEnter={e=>{ e.currentTarget.style.background='#FF6B2B'; e.currentTarget.style.color='white' }}
                          onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#FF6B2B' }}>
                          Adopt This Habit
                        </button>
                    }
                  </div>
                )
              })}
              {filtered.length === 0 && <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'40px 0', color:'#8C7B6E', fontSize:13 }}>No habits found</div>}
            </div>
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ position:'sticky', top:80, height:'fit-content' }}>
              <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:18, overflow:'hidden' }}>
                <div style={{ background:'linear-gradient(135deg,#FF6B2B,#FFD166)', padding:'20px 20px 16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div style={{ fontSize:28 }}>{selected.icon||'✨'}</div>
                    <button onClick={() => setSelected(null)} style={{ background:'rgba(255,255,255,.3)', border:'none', cursor:'pointer', color:'white', borderRadius:'50%', width:28, height:28, fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                  </div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.15rem', fontWeight:700, color:'white', marginTop:8 }}>{selected.title}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.85)', marginTop:3 }}>{(selected.adopters_count||0).toLocaleString()} adopters worldwide</div>
                </div>

                <div style={{ padding:20, maxHeight:520, overflowY:'auto' }}>
                  {selected.description && <p style={{ fontSize:13, color:'#4A2800', lineHeight:1.65, marginBottom:14 }}>{selected.description}</p>}

                  {/* Timer */}
                  <HabitTimer habit={selected}/>

                  {userHabits[selected.id] ? (
                    <>
                      {/* Streak progress */}
                      <div style={{ background:'#F5EDE4', borderRadius:12, padding:14, marginBottom:14 }}>
                        <div style={{ fontSize:22, fontWeight:700, color:'#FF6B2B', marginBottom:2 }}>Day {userHabits[selected.id]?.current_day}</div>
                        <div style={{ fontSize:11, color:'#8C7B6E' }}>🔥 {userHabits[selected.id]?.streak||0} day streak · {100 - userHabits[selected.id]?.current_day} days to goal</div>
                        <div style={{ marginTop:8, height:6, background:'rgba(26,8,0,.08)', borderRadius:3 }}>
                          <div style={{ height:6, width:`${Math.min(userHabits[selected.id]?.current_day||0,100)}%`, background:'linear-gradient(90deg,#FF6B2B,#FFD166)', borderRadius:3 }}/>
                        </div>
                      </div>
                      {/* Streak dots */}
                      <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginBottom:14 }}>
                        {Array.from({length:100},(_,i)=>i+1).map(d=>(
                          <div key={d} style={{ width:9, height:9, borderRadius:2, background: d<=(userHabits[selected.id]?.current_day||0)?'#FF6B2B':'rgba(26,8,0,.07)', title:`Day ${d}` }}/>
                        ))}
                      </div>
                      {/* Log today — only if not already logged today */}
                      {(() => {
                        const today = new Date().toDateString()
                        const alreadyLogged = logs.some(l => new Date(l.logged_at).toDateString() === today)
                        return alreadyLogged ? (
                          <div style={{ textAlign:'center', padding:'12px', background:'rgba(5,150,105,.07)', borderRadius:10, border:'1.5px solid rgba(5,150,105,.2)', marginBottom:8 }}>
                            <div style={{ fontSize:18, marginBottom:4 }}>✅</div>
                            <div style={{ fontSize:12, fontWeight:700, color:'#059669' }}>Already logged today!</div>
                            <div style={{ fontSize:11, color:'#6B7280', marginTop:2 }}>Come back tomorrow to log Day {(userHabits[selected.id]?.current_day||0)+1}</div>
                          </div>
                        ) : (
                          <>
                            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder={`Day ${userHabits[selected.id]?.current_day} update — what did you do?`} style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #DDD3CA', borderRadius:10, fontSize:12, fontFamily:'inherit', resize:'vertical', minHeight:72, outline:'none', marginBottom:8 }}/>
                            <button onClick={handleLog} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', fontSize:12 }}>Log Today ✓</button>
                          </>
                        )
                      })()}

                      {/* Recent logs */}
                      {logs.length > 0 && (
                        <div style={{ marginTop:14 }}>
                          <div style={{ fontSize:12, fontWeight:600, marginBottom:8 }}>Recent Logs</div>
                          {logs.slice(-5).reverse().map(l => (
                            <div key={l.id} style={{ padding:'8px 0', borderBottom:'1px solid #F5EDE4', fontSize:12 }}>
                              <div style={{ fontWeight:600, color:'#FF6B2B', marginBottom:2 }}>Day {l.day_number}</div>
                              <div style={{ color:'#4A2800', lineHeight:1.5 }}>{l.note}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign:'center', padding:'16px 0 8px' }}>
                      <p style={{ fontSize:13, color:'#8C7B6E', marginBottom:14 }}>Join {(selected.adopters_count||0).toLocaleString()} people building this habit!</p>
                      <button onClick={() => { if(!user){navigate('/login');return}; handleAdopt(selected) }} className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}>Adopt This Habit →</button>
                    </div>
                  )}

                  {/* Divider */}
                  <div style={{ height:1, background:'#F5EDE4', margin:'16px 0' }}/>

                  {/* Participants from challenges linked to this habit */}
                  {challenges.filter(c => c.habit_id === selected.id).map(c => (
                    <div key={c.id}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#1A0800', marginBottom:6 }}>🏆 {c.title}</div>
                      <ParticipantsList challengeId={c.id}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CHALLENGES ── */}
      {tab === 'challenges' && (
        <div className="habits-split" style={{ display:'grid', gridTemplateColumns:selChallenge?'1fr 380px':'1fr', gap:24 }}>
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
              {challenges.map(c => {
                const isJoined = joined[c.id]
                const locked = false
                const now = new Date()
                const start = c.start_date ? new Date(c.start_date) : null
                const end = c.end_date ? new Date(c.end_date) : null
                const daysLeft = end ? Math.max(differenceInDays(end, now), 0) : null

                return (
                  <div key={c.id} onClick={() => setSelChallenge(c)} style={{ background:'white', border:`1.5px solid ${selChallenge?.id===c.id?'#FF6B2B':'#F0EAE4'}`, borderRadius:16, padding:18, cursor:'pointer', transition:'all .2s', opacity:locked?.8:1 }}
                    onMouseEnter={e=>{ if(selChallenge?.id!==c.id) e.currentTarget.style.borderColor='rgba(255,107,43,.4)' }}
                    onMouseLeave={e=>{ if(selChallenge?.id!==c.id) e.currentTarget.style.borderColor='#F0EAE4' }}>
                    <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
                      <span style={{ fontSize:10, padding:'2px 8px', borderRadius:100, background:c.status==='active'?'rgba(5,150,105,.1)':c.status==='upcoming'?'rgba(37,99,235,.1)':'#F5EDE4', color:c.status==='active'?'#059669':c.status==='upcoming'?'#2563EB':'#8C7B6E', fontWeight:600, textTransform:'uppercase' }}>{c.status}</span>
                      {c.visibility==='pro' && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:100, background:'rgba(124,58,237,.1)', color:'#7C3AED', fontWeight:600 }}>👑 Pro Only</span>}
                    </div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.05rem', fontWeight:700, marginBottom:8 }}>{c.title}</div>

                    {/* Timer bar for challenge */}
                    {(start || end) && <HabitTimer habit={{ start_date: c.start_date, end_date: c.end_date }}/>}

                    <div style={{ display:'flex', gap:12, fontSize:11, color:'#8C7B6E', marginBottom:12, flexWrap:'wrap' }}>
                      <span>⏱ {c.duration_days}d</span>
                      <span>🏆 {c.reward_points}pts</span>
                      <span>👥 {c.participants_count||0} joined</span>
                      {daysLeft !== null && c.status === 'active' && <span style={{ color:'#FF6B2B', fontWeight:600 }}>⚡ {daysLeft}d left</span>}
                    </div>

                    {isJoined
                      ? <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:100, background:'rgba(5,150,105,.1)', border:'1.5px solid rgba(5,150,105,.25)', width:'fit-content' }}>
                          <span style={{ fontSize:13 }}>✅</span>
                          <span style={{ fontSize:11, fontWeight:700, color:'#059669' }}>Already Joined</span>
                        </div>
                      : locked
                        ? <button onClick={e=>{e.stopPropagation();navigate('/plans')}} style={{ fontSize:11, padding:'6px 14px', borderRadius:100, border:'1.5px solid #7C3AED', background:'transparent', color:'#7C3AED', cursor:'pointer', fontFamily:'inherit' }}>Upgrade to Join →</button>
                        : <button onClick={e=>{e.stopPropagation();handleJoinChallenge(c)}} style={{ fontSize:11, padding:'6px 14px', borderRadius:100, border:'1.5px solid #FF6B2B', background:'transparent', color:'#FF6B2B', cursor:'pointer', fontFamily:'inherit', transition:'all .2s' }}
                            onMouseEnter={e=>{e.currentTarget.style.background='#FF6B2B';e.currentTarget.style.color='white'}}
                            onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='#FF6B2B'}}>
                            Join Challenge
                          </button>
                    }
                  </div>
                )
              })}
              {challenges.length === 0 && <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px 0', color:'#8C7B6E' }}><div style={{ fontSize:32, marginBottom:8 }}>🏆</div><div style={{ fontWeight:600 }}>No challenges yet</div></div>}
            </div>
          </div>

          {/* Challenge detail panel */}
          {selChallenge && (
            <div style={{ position:'sticky', top:80, height:'fit-content' }}>
              <div style={{ background:'white', border:'1px solid #F0EAE4', borderRadius:18, overflow:'hidden' }}>
                <div style={{ background:'linear-gradient(135deg,#1A0800,#4A2800)', padding:'20px 20px 16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <span style={{ fontSize:10, padding:'2px 8px', borderRadius:100, background:selChallenge.status==='active'?'rgba(5,150,105,.3)':'rgba(37,99,235,.3)', color:'white', fontWeight:600, textTransform:'uppercase' }}>{selChallenge.status}</span>
                    </div>
                    <button onClick={() => setSelChallenge(null)} style={{ background:'rgba(255,255,255,.15)', border:'none', cursor:'pointer', color:'white', borderRadius:'50%', width:28, height:28, fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                  </div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.2rem', fontWeight:700, color:'white', marginTop:10 }}>{selChallenge.title}</div>
                </div>

                <div style={{ padding:20, maxHeight:560, overflowY:'auto' }}>
                  {selChallenge.description && <p style={{ fontSize:13, color:'#4A2800', lineHeight:1.65, marginBottom:14 }}>{selChallenge.description}</p>}

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
                    {[
                      ['⏱',selChallenge.duration_days+'d','Duration'],
                      ['🏆',selChallenge.reward_points+'pts','Reward'],
                      ['👥',selChallenge.participants_count||0,'Joined'],
                    ].map(([icon,v,l]) => (
                      <div key={l} style={{ textAlign:'center', background:'#F5EDE4', borderRadius:10, padding:'10px 6px' }}>
                        <div style={{ fontSize:16 }}>{icon}</div>
                        <div style={{ fontSize:14, fontWeight:700, color:'#FF6B2B' }}>{v}</div>
                        <div style={{ fontSize:10, color:'#8C7B6E' }}>{l}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize:12, color:'#8C7B6E', marginBottom:14 }}>
                    <div>⚡ Daily: {selChallenge.daily_points}pts · Weekly: {selChallenge.weekly_points}pts</div>
                    {selChallenge.start_date && <div>📅 {selChallenge.start_date} → {selChallenge.end_date}</div>}
                    {selChallenge.participants_limit && <div>👥 Max {selChallenge.participants_limit} participants</div>}
                  </div>

                  {joined[selChallenge.id]
                    ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', borderRadius:12, background:'rgba(5,150,105,.08)', border:'1.5px solid rgba(5,150,105,.2)', marginBottom:16 }}>
                        <span style={{ fontSize:18 }}>✅</span>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:'#059669' }}>Already Joined!</div>
                          <div style={{ fontSize:11, color:'#6B7280' }}>You're participating in this challenge</div>
                        </div>
                      </div>
                    : selChallenge.visibility === 'pro' && !profile?.is_pro
                      ? <button onClick={() => navigate('/plans')} className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', marginBottom:16 }}>Upgrade to Join →</button>
                      : <button onClick={() => handleJoinChallenge(selChallenge)} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginBottom:16 }}>Join This Challenge →</button>
                  }

                  <div style={{ height:1, background:'#F5EDE4', margin:'4px 0 16px' }}/>

                  {/* Top 10 participants */}
                  <ParticipantsList challengeId={selChallenge.id}/>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
