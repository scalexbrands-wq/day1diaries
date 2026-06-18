import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { signOut } from '../lib/api'

const NAV = [
  { to:'/feed',        icon:'⌂', label:'My Feed' },
  { to:'/discover',    icon:'◉', label:'Discover' },
  { to:'/community',   icon:'🌍', label:'Community' },
  { to:'/habits',      icon:'◈', label:'Habits' },
  { to:'/jobs',        icon:'💼', label:'Jobs' },
  { to:'/leaderboard', icon:'◎', label:'Leaderboard' },
  { to:'/saved',       icon:'◇', label:'Saved' },
]

export const COLORS = ['#FF6B2B','#7C3AED','#059669','#2563EB','#EC4899','#0EA5E9','#F59E0B']
export const getAvatarColor = (name='') => COLORS[name.charCodeAt(0) % COLORS.length]
export const getInitials    = (name='') => name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)

const LEVELS = {
  Beginner:'🥉', Explorer:'🥈', Achiever:'🥇',
  Hero:'🏆', 'Super Hero':'🔥', Legend:'👑',
  'Habit Master':'🔥', 'Community Champion':'🌟'
}

export default function Sidebar() {
  const { user, profile, reloadSession } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    await reloadSession()
    navigate('/')
  }

  const navStyle = (isActive) => ({
    display:'flex', alignItems:'center', gap:10, padding:'9px 18px',
    fontSize:'13px', fontWeight:500, textDecoration:'none', transition:'all .15s',
    color:      isActive ? '#FF6B2B' : '#6B5347',
    background: isActive ? 'rgba(255,107,43,.07)' : 'transparent',
    borderRight: isActive ? '2.5px solid #FF6B2B' : '2.5px solid transparent',
  })

  const content = (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Logo */}
      <div style={{ padding:'20px 18px 16px', borderBottom:'1px solid #F0EAE4' }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'17px', fontWeight:900, color:'#FF6B2B' }}>
          Day<span style={{ color:'#1A0800' }}>1</span> Diaries
        </div>
        <div style={{ fontSize:'11px', color:'#8C7B6E', marginTop:2 }}>Learn. Share. Grow.</div>
      </div>

      {/* Nav */}
      <nav style={{ padding:'12px 0', flex:1, overflowY:'auto' }}>
        <div style={{ fontSize:'10px', fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', color:'#8C7B6E', padding:'0 18px 8px' }}>Menu</div>
        {NAV.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} style={({ isActive }) => navStyle(isActive)}>
            <span style={{ fontSize:'16px', width:20, textAlign:'center' }}>{icon}</span>{label}
          </NavLink>
        ))}

        {profile?.role === 'admin' && (
          <>
            <div style={{ fontSize:'10px', fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', color:'#8C7B6E', padding:'12px 18px 8px' }}>Admin</div>
            <NavLink to="/admin" onClick={() => setMobileOpen(false)} style={({ isActive }) => navStyle(isActive)}>
              <span style={{ fontSize:'16px', width:20, textAlign:'center' }}>⊞</span>Dashboard
            </NavLink>
          </>
        )}

        <div style={{ fontSize:'10px', fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', color:'#8C7B6E', padding:'12px 18px 8px' }}>Account</div>
        <NavLink to={`/profile/${profile?.username || 'me'}`} onClick={() => setMobileOpen(false)} style={({ isActive }) => navStyle(isActive)}>
          <span style={{ fontSize:'16px', width:20, textAlign:'center' }}>◯</span>My Profile
        </NavLink>
      </nav>

      {/* User footer */}
      {profile && (
        <div style={{ padding:'12px 18px', borderTop:'1px solid #F0EAE4' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:getAvatarColor(profile.full_name||''), color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }}/>
                : getInitials(profile.full_name || profile.username || '?')}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'12px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {profile.full_name || profile.username}
              </div>
              <div style={{ fontSize:'10px', color:'#FF6B2B' }}>{LEVELS[profile.level] || '🥉'} {profile.level}</div>
            </div>
          </div>
          <button onClick={handleSignOut} className="btn btn-secondary btn-sm w-full" style={{ justifyContent:'center' }}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div style={{ position:'fixed', top:0, left:0, bottom:0, width:'var(--sidebar-width)', background:'white', borderRight:'1px solid #F0EAE4', zIndex:200, display:'flex', flexDirection:'column' }} className="sidebar-desktop">
        {content}
      </div>

      {/* Mobile hamburger */}
      <button onClick={() => setMobileOpen(v => !v)} style={{ display:'none', position:'fixed', top:12, left:12, zIndex:300, background:'white', border:'1px solid #DDD3CA', borderRadius:8, padding:'6px 8px', cursor:'pointer', fontSize:'18px' }} className="sidebar-mobile-btn">☰</button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:250 }}/>
          <div style={{ position:'fixed', top:0, left:0, bottom:0, width:'min(240px, 82vw)', background:'white', zIndex:260, display:'flex', flexDirection:'column' }}>
            {content}
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile-btn { display: block !important; }
        }
      `}</style>
    </>
  )
}
