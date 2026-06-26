import React, { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import useLandingData from '../hooks/useLandingData'
import Seo from '../components/Seo'
import LanguageSwitcher from '../components/LanguageSwitcher'

/* A link-in-bio style landing page (à la Linktree) — avatar, bio, and a
   single vertical stack of full-width link buttons. Pulls the same
   hero/stats content as the other templates, just packaged minimally. */

const LINKS = [
  { to: '/register', label: 'Share My Day 1 Story', icon: '✍️', primary: true },
  { to: '/login',    label: 'Sign In',               icon: '🔑' },
  { to: '/companies',label: 'Browse Companies',      icon: '🏢' },
  { to: '/careers',  label: 'Trending Jobs',         icon: '💼' },
  { to: '/blog',     label: 'Read the Blog',         icon: '📖' },
  { to: '/about',    label: 'About Day1 Diaries',    icon: '💛' },
]

export default function LandingLinktree() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, seo } = useLandingData()

  useEffect(() => { if (user) navigate('/feed') }, [user, navigate])

  const hero = data?.hero || {}
  const stats = data?.stats || {}
  const bio = hero.subheadline || 'The community where freshers share raw first-day stories, adopt habits, and grow together.'

  return (
    <div style={{ minHeight:'100vh', background:'#FDF6EE', fontFamily:"'DM Sans',sans-serif", color:'#1A0800', display:'flex', justifyContent:'center', padding:'48px 20px 60px' }}>
      {seo && <Seo title={seo.title} description={seo.description} image={seo.image} path="/" />}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,900&family=DM+Sans:wght@400;500;600;700&display=swap');
        .lt-link{display:flex;align-items:center;gap:12px;width:100%;padding:15px 20px;border-radius:16px;background:white;border:1.5px solid rgba(26,8,0,.08);box-shadow:0 2px 10px rgba(26,8,0,.04);text-decoration:none;color:#1A0800;font-size:14.5px;font-weight:600;transition:all .2s;cursor:pointer}
        .lt-link:hover{transform:translateY(-3px);border-color:#FF6B2B;box-shadow:0 12px 28px rgba(255,107,43,.16)}
        .lt-link.primary{background:#FF6B2B;color:white;border-color:transparent;box-shadow:0 8px 24px rgba(255,107,43,.35)}
        .lt-link.primary:hover{background:#E55B1F;box-shadow:0 14px 34px rgba(255,107,43,.45)}
        .lt-social{width:38px;height:38px;border-radius:50%;background:rgba(26,8,0,.06);display:flex;align-items:center;justify-content:center;font-size:16px;text-decoration:none}
      `}</style>

      <div style={{ width:'100%', maxWidth:420, display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ alignSelf:'flex-end', marginBottom:18 }}><LanguageSwitcher/></div>

        <div style={{ width:88, height:88, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B2B,#8B5CF6)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Playfair Display',serif", fontSize:30, fontWeight:900, color:'white', boxShadow:'0 10px 32px rgba(255,107,43,.3)', marginBottom:18 }}>
          D1
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:900, margin:0 }}>Day1 Diaries</h1>
          <span style={{ fontSize:9.5, fontWeight:700, letterSpacing:'.06em', background:'#FF6B2B', color:'white', borderRadius:4, padding:'2px 6px' }}>BETA</span>
        </div>
        <div style={{ fontSize:13, color:'#8C7B6E', marginBottom:14 }}>@day1diaries</div>

        <p style={{ fontSize:13.5, color:'#4A2800', lineHeight:1.65, textAlign:'center', maxWidth:340, marginBottom:20 }}>
          {bio}
        </p>

        {(stats.total_users || stats.total_stories) && (
          <div style={{ display:'flex', gap:22, marginBottom:30, fontSize:12.5, color:'#8C7B6E' }}>
            {stats.total_users   ? <span><strong style={{ color:'#1A0800' }}>{stats.total_users.toLocaleString()}+</strong> members</span> : null}
            {stats.total_stories ? <span><strong style={{ color:'#1A0800' }}>{stats.total_stories.toLocaleString()}+</strong> stories</span> : null}
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:12, width:'100%' }}>
          {LINKS.map(l => (
            <Link key={l.to} to={l.to} className={`lt-link${l.primary ? ' primary' : ''}`}>
              <span style={{ fontSize:18 }}>{l.icon}</span>
              <span>{l.label}</span>
            </Link>
          ))}
        </div>

        <div style={{ display:'flex', gap:10, marginTop:36 }}>
          {['🐦','💼','📸'].map((ic,i) => <span key={i} className="lt-social">{ic}</span>)}
        </div>

        <div style={{ fontSize:11.5, color:'#B5A89C', marginTop:24 }}>© 2026 Day1 Diaries</div>
      </div>
    </div>
  )
}
