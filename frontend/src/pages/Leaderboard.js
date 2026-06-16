import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLeaderboard } from '../lib/api'
import { getInitials, getAvatarColor } from '../components/Sidebar'

const LEVELS = { Beginner:'🥉', Explorer:'🥈', Achiever:'🥇', Hero:'🏆', 'Super Hero':'🔥', Legend:'👑' }
const BADGES = [
  { name:'Contributor', icon:'✍️', req:'5 stories' },
  { name:'Hero', icon:'🦸', req:'25 stories' },
  { name:'Super Hero', icon:'⚡', req:'100 stories' },
  { name:'Legend', icon:'👑', req:'500 stories' },
  { name:'Habit Master', icon:'🔥', req:'100 habit logs' },
  { name:'Inspiration Creator', icon:'💡', req:'10,000 likes' },
]

export default function Leaderboard() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLeaderboard(25).then(({ data }) => { setUsers(data || []); setLoading(false) })
  }, [])

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <div style={{ padding:'16px', maxWidth:900 }}>
      <div className="stats-grid" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:24 }}>
        <div className="stat-card"><div className="stat-val">6</div><div className="stat-label">Levels to Climb</div></div>
        <div className="stat-card"><div className="stat-val">6</div><div className="stat-label">Badges to Earn</div></div>
        <div className="stat-card"><div className="stat-val">{users.length}</div><div className="stat-label">Top Creators</div></div>
        <div className="stat-card"><div className="stat-val">{users[0]?.score?.toLocaleString() || '—'}</div><div className="stat-label">#1 Score</div></div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:20 }}>
        <div>
          <h3 style={{ marginBottom:16 }}>Top Creators</h3>
          <div className="card">
            <div className="card-body" style={{ padding:'8px 16px' }}>
              {users.map((u,i) => (
                <div key={u.id} className="lb-row" onClick={() => navigate(`/profile/${u.username}`)} style={{ cursor:'pointer' }}>
                  <div className="lb-rank" style={{ fontSize: i<3?'18px':'14px' }}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                  </div>
                  <div className="avatar avatar-sm" style={{ background:getAvatarColor(u.full_name||u.username), color:'white' }}>
                    {u.avatar_url ? <img src={u.avatar_url} alt={u.full_name}/> : getInitials(u.full_name||u.username||'?')}
                  </div>
                  <div className="lb-info">
                    <div className="lb-name">{u.full_name || u.username}</div>
                    <div className="lb-sub">{LEVELS[u.level]||'🥉'} {u.level} · {u.stories_count||0} stories · {(u.likes_received||0).toLocaleString()} likes</div>
                  </div>
                  <div className="lb-score">{(u.score||0).toLocaleString()}</div>
                  <span className="badge badge-orange" style={{ fontSize:'10px' }}>{u.plan}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ marginBottom:16 }}>Levels</h3>
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-body" style={{ padding:'12px 16px' }}>
              {[['🥉','Beginner','0-1K pts'],['🥈','Explorer','1K-5K pts'],['🥇','Achiever','5K-20K pts'],['🏆','Hero','20K-50K pts'],['🔥','Super Hero','50K-100K pts'],['👑','Legend','100K+ pts']].map(([icon,name,pts])=>(
                <div key={name} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid var(--gray-100)' }}>
                  <span style={{ fontSize:'18px' }}>{icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'13px', fontWeight:600 }}>{name}</div>
                    <div style={{ fontSize:'11px', color:'var(--gray-400)' }}>{pts}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <h3 style={{ marginBottom:16 }}>Badges</h3>
          <div className="card">
            <div className="card-body" style={{ padding:'12px 16px' }}>
              {BADGES.map(b => (
                <div key={b.name} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid var(--gray-100)' }}>
                  <span style={{ fontSize:'20px' }}>{b.icon}</span>
                  <div>
                    <div style={{ fontSize:'12px', fontWeight:600 }}>{b.name}</div>
                    <div style={{ fontSize:'11px', color:'var(--gray-400)' }}>{b.req}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
