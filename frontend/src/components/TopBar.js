import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import VisitorCounter from './VisitorCounter'
import SurprisePopup from './SurprisePopup'

const TITLES = { '/community': 'Community',
  '/feed': 'My Feed', '/discover': 'Discover', '/habits': 'Habits',
  '/leaderboard': 'Leaderboard', '/saved': 'Saved Stories',
   '/admin': 'Admin Dashboard',
  '/write': 'Share Your Story',
}

export default function TopBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [search, setSearch] = useState('')
  const [showSurprise, setShowSurprise] = useState(false)

  const title = TITLES[pathname] || (pathname.startsWith('/profile') ? 'Profile' : pathname.startsWith('/story') ? 'Story' : 'Day1 Diaries')

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) navigate(`/discover?q=${encodeURIComponent(search.trim())}`)
  }

  return (
    <div className="topbar" style={{
      position:'fixed', top:0, left:'var(--sidebar-width)', right:0, height:60,
      background:'rgba(255,255,255,.95)', backdropFilter:'blur(10px)',
      borderBottom:'1px solid var(--gray-100)', zIndex:100,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 24px', gap:16
    }}>
      <div className="topbar-title" style={{ fontFamily:'Playfair Display,serif', fontSize:'17px', fontWeight:700, whiteSpace:'nowrap' }}>{title}</div>

      <form onSubmit={handleSearch} className="topbar-search" style={{ flex:1, maxWidth:360, display:'flex', gap:0, minWidth:0 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search stories..."
          style={{
            flex:1, minWidth:0, padding:'7px 14px', border:'1.5px solid var(--gray-200)',
            borderRadius:'100px 0 0 100px', fontSize:'13px', outline:'none',
            borderRight:'none', fontFamily:'DM Sans,sans-serif'
          }}
        />
        <button type="submit" style={{
          padding:'7px 14px', background:'var(--orange)', color:'white',
          border:'1.5px solid var(--orange)', borderRadius:'0 100px 100px 0',
          cursor:'pointer', fontSize:'13px', flexShrink:0
        }}>⌕</button>
      </form>

      <NotificationBell />
      <VisitorCounter/>
      <button className="btn btn-secondary btn-sm" onClick={() => setShowSurprise(true)}>
        🎁 Surprise
      </button>
      <button className="btn btn-primary btn-sm topbar-write-btn" onClick={() => navigate('/write')}>
        + Share Story
      </button>
      <SurprisePopup isOpen={showSurprise} onClose={() => setShowSurprise(false)} />

      <style>{`
        @media (max-width: 768px) {
          .topbar { left: 0 !important; padding: 0 16px 0 56px !important; }
        }
        @media (max-width: 480px) {
          .topbar-search { display: none !important; }
          .topbar-write-btn { white-space: nowrap; }
        }
      `}</style>
    </div>
  )
}
