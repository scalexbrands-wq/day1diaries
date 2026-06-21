import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { getLandingData, getSeoDefaults } from '../lib/api'
import Seo from '../components/Seo'
import VisitorCounter from '../components/VisitorCounter'
import LanguageSwitcher from '../components/LanguageSwitcher'

/* ── helpers ─────────────────────────────────────────────── */
const COLORS = ['#FF6B2B','#7C3AED','#059669','#2563EB','#EC4899','#0EA5E9','#F59E0B','#DC2626']
const getAvatarColor = n => COLORS[(n||'').charCodeAt(0) % COLORS.length]
const getInitials = n => (n||'?').split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2)
const LEVEL_ICONS = { Beginner:'🥉', Explorer:'🥈', Achiever:'🥇', Hero:'🏆', 'Super Hero':'🔥', Legend:'👑' }

const JOB_TYPE_COLORS = {
  'Full-Time': { bg:'rgba(37,99,235,.1)', color:'#2563EB' },
  'Part-Time': { bg:'rgba(124,58,237,.1)', color:'#7C3AED' },
  'Contract':  { bg:'rgba(245,158,11,.1)', color:'#D97706' },
  'Internship':{ bg:'rgba(5,150,105,.1)',  color:'#059669' },
  'Remote':    { bg:'rgba(255,107,43,.1)', color:'#FF6B2B' },
}
const JOB_DEPT_ICONS = {
  Engineering:'💻', Design:'🎨', Marketing:'📣', Product:'🚀',
  Sales:'💼', Operations:'⚙️', HR:'🤝', Finance:'📊', Legal:'⚖️', Data:'📈',
}

function HeroSlideshow({ images }) {
  const [active, setActive] = useState(0)
  useEffect(() => {
    if (images.length < 2) return
    const id = setInterval(() => setActive(i => (i + 1) % images.length), 4000)
    return () => clearInterval(id)
  }, [images.length])

  return (
    <div style={{ position:'relative', width:'100%', maxWidth:480, height:'min(70vw,520px)', maxHeight:520, borderRadius:24, boxShadow:'0 40px 100px rgba(26,8,0,.15)', overflow:'hidden' }}>
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity: i===active ? 1 : 0, transition:'opacity 1s ease' }}
         loading="lazy" />
      ))}
      {images.length > 1 && (
        <div style={{ position:'absolute', bottom:14, left:0, right:0, display:'flex', justifyContent:'center', gap:6 }}>
          {images.map((src, i) => (
            <span key={src} style={{ width:7, height:7, borderRadius:'50%', background: i===active ? '#FF6B2B' : 'rgba(255,255,255,.6)', boxShadow:'0 0 0 1px rgba(26,8,0,.15)', transition:'background .3s' }}/>
          ))}
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:'40px 0' }}>
      <div style={{ width:28, height:28, border:'3px solid rgba(255,107,43,.2)', borderTopColor:'#FF6B2B', borderRadius:'50%', animation:'lp-spin .7s linear infinite' }}/>
    </div>
  )
}

function useCountUp(target, suffix, run) {
  const [val, setVal] = useState('0'+suffix)
  const done = useRef(false)
  useEffect(() => {
    if (!run || done.current || !target) return
    done.current = true
    let cur = 0
    const step = target / 80
    const t = setInterval(() => {
      cur += step
      if (cur >= target) { cur = target; clearInterval(t) }
      setVal(Number.isInteger(target) ? Math.floor(cur).toLocaleString()+suffix : Math.floor(cur)+suffix)
    }, 16)
    return () => clearInterval(t)
  }, [run, target, suffix])
  return val
}

/* ── Main ──────────────────────────────────────────────────── */
export default function Landing() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [adopted, setAdopted] = useState({})
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showAllJobs, setShowAllJobs] = useState(false)
  const proofRef = useRef(null)
  const [countRun, setCountRun] = useState(false)
  const [seo, setSeo] = useState(null)

  const c1 = useCountUp(data?.stats?.total_users    || 0, '+', countRun)
  const c2 = useCountUp(data?.stats?.total_stories  || 0, '+', countRun)
  const c3 = useCountUp(data?.stats?.habit_adoptions|| 0, '+', countRun)
  const c4 = useCountUp(98, '%', countRun)

  useEffect(() => { if (user) navigate('/feed') }, [user, navigate])

  useEffect(() => {
    getLandingData().then(({ data: d, error }) => {
      if (!error && d) setData(d)
      setLoading(false)
    })
    getSeoDefaults().then(({ data: d }) => { if (d) setSeo(d) })
  }, [])

  useEffect(() => {
    const revObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1'
          e.target.style.transform = 'translateY(0) scale(1)'
          revObs.unobserve(e.target)
        }
      })
    }, { threshold: .08 })
    document.querySelectorAll('.lp-reveal').forEach(el => {
      el.style.transition = 'opacity .65s ease, transform .65s ease'
      el.style.opacity = '0'
      el.style.transform = 'translateY(28px) scale(.98)'
      revObs.observe(el)
    })
    const cntObs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setCountRun(true); cntObs.disconnect() }
    }, { threshold: .5 })
    if (proofRef.current) cntObs.observe(proofRef.current)
    return () => { revObs.disconnect(); cntObs.disconnect() }
  }, [data])

  const hero        = data?.hero || {}
  const bottomSection = data?.bottomSection || {}
  const tickerItems = (hero.ticker_items || 'First Day at Job — real stories|Habit Tracking — Day 1 to Day 100|Leaderboard — Beginner to Legend|Earn Points — Every Like, Comment & Share').split('|')
  const categories  = data?.categories    || []
  const testimonials= data?.testimonials  || []
  const habits      = data?.habits        || []
  const leaderboard = data?.leaderboard   || []
  const openJobs    = data?.open_jobs     || []
  const headline    = hero.headline || 'Your first day at work is a story only you lived.'
  const highlight   = hero.headline_highlight || 'only you'
  const parts       = headline.split(highlight)

  const visibleJobs = showAllJobs ? openJobs : openJobs.slice(0, 4)

  const S = {
    btn: (bg, color, extra={}) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px 28px', borderRadius:100, fontSize:14.5, fontWeight:600, textDecoration:'none', cursor:'pointer', border:'none', fontFamily:"'DM Sans',sans-serif", background:bg, color, transition:'all .25s', ...extra }),
    sec: (bg, extra={}) => ({ padding:'96px 56px', background:bg, ...extra }),
    eyebrow: (color='#FF6B2B') => ({ fontSize:11, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color, marginBottom:12, display:'block' }),
    h2: (color='#1A0800') => ({ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.9rem,3.2vw,2.8rem)', fontWeight:900, lineHeight:1.1, color, marginBottom:14 }),
  }

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#FDF6EE', color:'#1A0800', overflowX:'hidden' }}>
      {seo && <Seo title={seo.title} description={seo.description} image={seo.image} path="/"/>}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes lp-spin{to{transform:rotate(360deg)}}
        @keyframes blobF{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,-28px) scale(1.06)}}
        @keyframes cardBob{0%,100%{transform:rotate(2.5deg) translateY(0)}50%{transform:rotate(2.5deg) translateY(-13px)}}
        @keyframes badgeBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes heroIn{from{opacity:0;transform:translateY(38px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulseRing{0%{transform:scale(1);opacity:.7}70%{transform:scale(2.4);opacity:0}100%{transform:scale(1);opacity:0}}
        @keyframes floatUp{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes neonBlink{0%,100%{opacity:1}50%{opacity:.6}}
        @keyframes slideChip{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
        .lp-nav-link{font-size:13.5px;font-weight:500;color:#4A2800;text-decoration:none;transition:color .2s}
        .lp-nav-link:hover{color:#FF6B2B}
        .lp-cat-card{background:white;border-radius:20px;padding:22px 18px;text-align:center;cursor:pointer;transition:all .25s;border:1.5px solid transparent;box-shadow:0 2px 12px rgba(26,8,0,.04)}
        .lp-cat-card:hover{border-color:#FF6B2B;transform:translateY(-6px);box-shadow:0 16px 40px rgba(255,107,43,.16)}
        .lp-feat-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:22px;padding:30px;transition:all .3s;cursor:default;position:relative;overflow:hidden}
        .lp-feat-card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,107,43,.04),rgba(139,92,246,.04));opacity:0;transition:opacity .3s}
        .lp-feat-card:hover{border-color:rgba(139,92,246,.3);transform:translateY(-7px);background:rgba(255,255,255,.07)}
        .lp-feat-card:hover::before{opacity:1}
        .lp-habit-row{background:rgba(255,255,255,.7);border:1px solid rgba(255,107,43,.08);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:13px;cursor:pointer;transition:all .2s}
        .lp-habit-row:hover{background:white;border-color:rgba(255,107,43,.3);transform:translateX(7px);box-shadow:0 8px 24px rgba(255,107,43,.12)}
        .lp-testi{background:white;border-radius:24px;padding:30px;box-shadow:0 2px 16px rgba(26,8,0,.05);transition:all .3s;cursor:default;border:1px solid rgba(255,107,43,.06);position:relative;overflow:hidden}
        .lp-testi::after{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#FF6B2B,#8B5CF6,#06B6D4);opacity:0;transition:opacity .3s}
        .lp-testi:hover{transform:translateY(-7px);box-shadow:0 20px 52px rgba(26,8,0,.13);border-color:rgba(255,107,43,.15)}
        .lp-testi:hover::after{opacity:1}
        .lp-lb-row{display:flex;align-items:center;gap:11px;padding:11px 18px;border-bottom:1px solid rgba(26,8,0,.05);transition:background .15s;cursor:pointer}
        .lp-lb-row:hover{background:rgba(255,107,43,.04)}
        .lp-adopt-btn{background:transparent;border:1.5px solid #FF6B2B;color:#FF6B2B;padding:5px 14px;border-radius:100px;font-size:11px;font-weight:600;cursor:pointer;transition:all .2s;font-family:'DM Sans',sans-serif;flex-shrink:0}
        .lp-adopt-btn:hover{background:linear-gradient(135deg,#FF6B2B,#FF4500);border-color:transparent;color:white}
        .lp-adopt-btn.done{background:rgba(22,163,74,.08);border-color:rgba(22,163,74,.3);color:#16A34A}
        .lp-job-card{background:white;border-radius:20px;padding:24px;border:1.5px solid rgba(26,8,0,.07);transition:all .25s;cursor:pointer;display:flex;flex-direction:column;gap:12px}
        .lp-job-card:hover{border-color:#FF6B2B;transform:translateY(-5px);box-shadow:0 16px 40px rgba(255,107,43,.15)}
        .lp-pts-card{border-radius:20px;padding:22px;text-align:center;transition:all .25s;cursor:default;position:relative;overflow:hidden}
        .lp-pts-card:hover{transform:translateY(-5px);box-shadow:0 16px 36px rgba(0,0,0,.12)}
        .lp-pts-num{font-family:'Playfair Display',serif;font-size:2.2rem;font-weight:900;line-height:1}
        .gz-ai-card{border-radius:22px;padding:26px;transition:all .3s;cursor:default;position:relative;overflow:hidden}
        .gz-ai-card:hover{transform:translateY(-7px) scale(1.01)}
        .gz-chip{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:100px;padding:6px 14px;font-size:12px;font-weight:500;color:rgba(255,255,255,.65);display:inline-flex;align-items:center;gap:5px;transition:all .2s;white-space:nowrap}
        .gz-chip:hover{background:rgba(255,107,43,.15);border-color:rgba(255,107,43,.3);color:#FF6B2B}
        .gz-grad-text{background:linear-gradient(120deg,#FF6B2B 0%,#8B5CF6 45%,#06B6D4 100%);background-size:200% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:gradShift 5s ease infinite}
        .lp-ai-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;max-width:1040px;margin:0 auto}
        @media(max-width:900px){
          .lp-hero-sec{grid-template-columns:1fr!important;padding:100px 24px 60px!important;gap:36px!important;min-height:auto!important}
          .lp-bottom-sec{grid-template-columns:1fr!important}
          .lp-2col{grid-template-columns:1fr!important}
          .lp-3col{grid-template-columns:1fr!important}
          .lp-4col{grid-template-columns:1fr 1fr!important}
          .lp-how{grid-template-columns:1fr 1fr!important}
          .lp-footer-g{grid-template-columns:1fr 1fr!important}
          .lp-ai-grid{grid-template-columns:1fr 1fr!important}
          section{padding:60px 20px!important}
          .lp-nav{padding:14px 20px!important}
          .lp-nav-desktop{display:none!important}
          .lp-hamburger{display:flex!important}
          .lp-hero-stats{flex-wrap:wrap!important;gap:16px 0!important}
          .lp-hero-stat-item{padding-right:20px!important;margin-right:20px!important}
        }
        @media(max-width:480px){
          .lp-4col{grid-template-columns:1fr!important}
          .lp-how{grid-template-columns:1fr!important}
          .lp-footer-g{grid-template-columns:1fr!important}
          .lp-ai-grid{grid-template-columns:1fr!important}
          .lp-hero-btns{flex-direction:column!important;align-items:stretch!important}
          .lp-hero-btns a,.lp-hero-btns button{justify-content:center!important}
          .lp-hero-sec{padding:90px 18px 50px!important}
          .lp-hero-stats{gap:12px 0!important}
          .lp-hero-stat-item{border-right:none!important;padding-right:16px!important;margin-right:0!important;width:50%}
        }
        .lp-hamburger{display:none;background:transparent;border:1.5px solid rgba(26,8,0,.15);border-radius:8px;padding:6px 10px;font-size:18px;cursor:pointer;line-height:1;align-items:center;justify-content:center}
        .lp-mobile-menu{position:absolute;top:100%;left:0;right:0;background:white;border-bottom:1px solid rgba(255,107,43,.1);padding:16px 20px 20px;z-index:300;box-shadow:0 8px 24px rgba(0,0,0,.08)}
        .lp-mobile-menu a,.lp-mobile-menu button{display:block;width:100%;padding:11px 0;font-size:14px;font-weight:500;color:#4A2800;text-decoration:none;border:none;background:transparent;cursor:pointer;font-family:'DM Sans',sans-serif;text-align:left;border-bottom:1px solid #F0EAE4}
        .lp-pulse{position:absolute;inset:0;border-radius:50%;background:rgba(255,107,43,.3);animation:pulseRing 2.5s cubic-bezier(.455,.03,.515,.955) infinite}
        .lp-pulse-green{position:absolute;inset:0;border-radius:50%;background:rgba(16,185,129,.4);animation:pulseRing 2s cubic-bezier(.455,.03,.515,.955) infinite}
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="lp-nav" style={{ position:'fixed', top:0, left:0, right:0, zIndex:500, padding:'16px 56px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(253,246,238,.94)', backdropFilter:'blur(18px)', borderBottom:'1px solid rgba(255,107,43,.1)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <Link to="/" style={{ fontFamily:"'Playfair Display',serif", fontSize:21, fontWeight:900, color:'#FF6B2B', textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
            Day<span style={{color:'#1A0800'}}>1</span> Diaries
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.06em', background:'#FF6B2B', color:'white', borderRadius:4, padding:'2px 6px', verticalAlign:'middle' }}>BETA</span>
          </Link>
          <VisitorCounter/>
        </div>
        <div className="lp-nav-desktop" style={{ display:'flex', alignItems:'center', gap:28 }}>
          {[['#features',t('nav.features')],['#habits',t('nav.habits')],['#jobs',t('nav.opportunities')],['#community',t('nav.community')]].map(([h,l])=>(
            <a key={h} href={h} className="lp-nav-link">{l}</a>
          ))}
          <LanguageSwitcher />
          <Link to="/login" className="lp-nav-link">{t('nav.signIn')}</Link>
          <Link to="/register" style={S.btn('linear-gradient(135deg,#FF6B2B,#8B5CF6)','white',{ padding:'9px 22px', fontSize:13.5, boxShadow:'0 4px 20px rgba(139,92,246,.35)' })}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 6px 28px rgba(139,92,246,.5)';e.currentTarget.style.transform='translateY(-1px)'}}
            onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 4px 20px rgba(139,92,246,.35)';e.currentTarget.style.transform='none'}}>
            {t('nav.getStartedFree')} ✨
          </Link>
        </div>
        <button className="lp-hamburger" onClick={()=>setMobileMenuOpen(o=>!o)}>{mobileMenuOpen?'✕':'☰'}</button>
        {mobileMenuOpen && (
          <div className="lp-mobile-menu">
            <a href="#features" onClick={()=>setMobileMenuOpen(false)}>{t('nav.features')}</a>
            <a href="#habits" onClick={()=>setMobileMenuOpen(false)}>{t('nav.habits')}</a>
            <a href="#jobs" onClick={()=>setMobileMenuOpen(false)}>{t('nav.opportunities')}</a>
            <a href="#community" onClick={()=>setMobileMenuOpen(false)}>{t('nav.community')}</a>
            <Link to="/login" onClick={()=>setMobileMenuOpen(false)}>{t('nav.signIn')}</Link>
            <Link to="/register" onClick={()=>setMobileMenuOpen(false)} style={{ color:'#FF6B2B', fontWeight:600 }}>{t('nav.getStartedFree')} →</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero-sec" style={{ minHeight:'100vh', display:'grid', gridTemplateColumns:'1fr 1fr', alignItems:'center', gap:60, padding:'120px 56px 80px', position:'relative', overflow:'hidden' }}>
        {/* Background blobs */}
        <div style={{ position:'absolute', top:-80, right:-120, width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,107,43,.13) 0%,transparent 65%)', animation:'blobF 9s ease-in-out infinite', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-60, left:80, width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,209,102,.14) 0%,transparent 65%)', animation:'blobF 12s ease-in-out infinite reverse', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:'30%', right:'15%', width:380, height:380, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,.1) 0%,transparent 65%)', animation:'blobF 15s ease-in-out infinite 3s', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:'10%', right:'35%', width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(6,182,212,.08) 0%,transparent 65%)', animation:'blobF 10s ease-in-out infinite 1s reverse', pointerEvents:'none' }}/>
        {/* Subtle grid pattern */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,107,43,.05) 1px,transparent 1px)', backgroundSize:'32px 32px', pointerEvents:'none', opacity:.6 }}/>

        {/* Left */}
        <div style={{ position:'relative', zIndex:2, animation:'heroIn .9s cubic-bezier(.22,1,.36,1) both' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,107,43,.1)', border:'1px solid rgba(255,107,43,.3)', borderRadius:100, padding:'6px 18px', fontSize:11, fontWeight:700, color:'#FF6B2B', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:26 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#FF6B2B', display:'inline-block', position:'relative' }}>
              <span className="lp-pulse"/>
            </span>
            {hero.eyebrow || t('landing.heroEyebrow')}
          </div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:'clamp(2.4rem,4vw,3.9rem)', lineHeight:1.04, marginBottom:22, letterSpacing:'-.5px' }}>
            {parts[0]}<em style={{ color:'#FF6B2B', fontStyle:'italic', position:'relative' }}>
              {highlight}
              <svg style={{ position:'absolute', bottom:-6, left:0, width:'100%', height:8, overflow:'visible' }} viewBox="0 0 100 8" preserveAspectRatio="none">
                <path d="M0 6 Q50 0 100 6" stroke="#FFD166" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              </svg>
            </em>{parts[1]}
          </h1>
          <p style={{ fontSize:'1.05rem', color:'#4A2800', lineHeight:1.78, fontWeight:300, maxWidth:460, marginBottom:38 }}>
            {hero.subheadline || 'Now the world can read it. The community where freshers share raw stories, adopt life-changing habits, and grow together.'}
          </p>
          <div className="lp-hero-btns" style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:48 }}>
            <Link to="/register" style={S.btn('#FF6B2B','white',{ padding:'15px 34px', fontSize:15.5, boxShadow:'0 8px 28px rgba(255,107,43,.38)' })}
              onMouseEnter={e=>{e.currentTarget.style.background='#E55B1F';e.currentTarget.style.transform='translateY(-2px)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='#FF6B2B';e.currentTarget.style.transform='none'}}>
              {hero.cta_primary_text || t('landing.shareMyDay1')}
            </Link>
            <a href="#features" style={S.btn('transparent','#1A0800',{ padding:'15px 34px', fontSize:15.5, border:'1.5px solid rgba(26,8,0,.18)' })}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#FF6B2B';e.currentTarget.style.color='#FF6B2B'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(26,8,0,.18)';e.currentTarget.style.color='#1A0800'}}>
              {hero.cta_secondary_text || t('landing.seeHowItWorks')}
            </a>
          </div>
          {/* Stats bar */}
          <div ref={proofRef} className="lp-hero-stats" style={{ display:'flex', gap:0, flexWrap:'wrap', paddingTop:28, borderTop:'1px solid rgba(26,8,0,.08)' }}>
            {[[c1,t('landing.totalUsers'),'👥'],[c2,t('landing.storiesShared'),'📝'],[c3,t('landing.habitAdoptions'),'🔥'],[c4,t('landing.feelLessAlone'),'✨']].map(([v,l,ic],idx)=>(
              <div key={l} className="lp-hero-stat-item" style={{ paddingRight:28, marginRight:28, borderRight: idx < 3 ? '1px solid rgba(26,8,0,.08)' : 'none' }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.9rem', fontWeight:900, color:'#FF6B2B', display:'flex', alignItems:'center', gap:6 }}>{v} <span style={{fontSize:'1rem'}}>{ic}</span></div>
                <div style={{ fontSize:11, color:'#8C7B6E', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right – admin-uploaded hero image */}
        {(hero.hero_image_urls?.length > 0) && (
          <div className="lp-hero-r" style={{ position:'relative', zIndex:2, display:'flex', justifyContent:'center', animation:'heroIn .9s .2s cubic-bezier(.22,1,.36,1) both' }}>
            <HeroSlideshow images={hero.hero_image_urls}/>
          </div>
        )}
      </section>

      {/* ── TICKER ── */}
      <div style={{ background:'linear-gradient(90deg,#0F0720,#1A0800,#0F0720)', padding:'13px 0', overflow:'hidden', whiteSpace:'nowrap', borderTop:'1px solid rgba(139,92,246,.2)', borderBottom:'1px solid rgba(139,92,246,.2)' }}>
        <div style={{ display:'inline-block', animation:'ticker 34s linear infinite' }}>
          {[...tickerItems, ...tickerItems].map((item, i) => {
            const colors = ['#FFD166','#A78BFA','#67E8F9','#FCA5A5','#86EFAC','#FCA5A5']
            return (
              <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:10, fontSize:12.5, fontWeight:600, color:'rgba(255,255,255,.5)', marginRight:32 }}>
                <span style={{ color: colors[i % colors.length], fontSize:8 }}>◆</span>
                <span style={{ color: colors[i % colors.length] }}>{item.split('—')[0]?.trim()}</span>
                {item.includes('—') && <span style={{ color:'rgba(255,255,255,.35)', fontWeight:400 }}>— {item.split('—')[1]?.trim()}</span>}
              </span>
            )
          })}
        </div>
      </div>

      {/* ── AI POWERED SECTION ── */}
      <section style={{ background:'linear-gradient(135deg,#080B1A 0%,#100A2E 45%,#0A1628 100%)', padding:'90px 56px', position:'relative', overflow:'hidden' }}>
        {/* Neon background blobs */}
        <div style={{ position:'absolute', top:-140, left:-100, width:520, height:520, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,.18) 0%,transparent 65%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-100, right:-80, width:440, height:440, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,107,43,.15) 0%,transparent 65%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:'40%', right:'22%', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(6,182,212,.1) 0%,transparent 65%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,.022) 1px,transparent 1px)', backgroundSize:'38px 38px', pointerEvents:'none' }}/>

        {/* AI Badge */}
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <div className="lp-reveal" style={{ display:'inline-flex', alignItems:'center', gap:10, background:'rgba(139,92,246,.12)', border:'1px solid rgba(139,92,246,.32)', borderRadius:100, padding:'8px 22px', marginBottom:24 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#A78BFA', display:'inline-block', boxShadow:'0 0 10px #8B5CF6, 0 0 24px rgba(139,92,246,.5)', animation:'neonBlink 2s ease-in-out infinite' }}/>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'.15em', color:'#A78BFA', textTransform:'uppercase' }}>✨ AI-Powered Community Platform</span>
          </div>
          <h2 className="lp-reveal gz-grad-text" style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(2rem,3.5vw,3.2rem)', fontWeight:900, lineHeight:1.1, marginBottom:16 }}>
            Smarter. Safer. Unstoppable.
          </h2>
          <p className="lp-reveal" style={{ fontSize:'1.05rem', color:'rgba(255,255,255,.42)', maxWidth:500, margin:'0 auto', lineHeight:1.75, fontWeight:300 }}>
            Our AI works around the clock — detecting harm, guiding goals, and helping 100+ new freshers navigate their Day 1 every single day.
          </p>
        </div>

        {/* Live Join Counter Card */}
        <div className="lp-reveal" style={{ maxWidth:440, margin:'0 auto 56px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:26, padding:'32px 36px', textAlign:'center', backdropFilter:'blur(16px)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:16 }}>
            <span style={{ position:'relative', width:10, height:10, display:'inline-block' }}>
              <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:'#10B981', boxShadow:'0 0 8px #10B981' }}/>
              <span className="lp-pulse-green"/>
            </span>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'.14em', color:'#6EE7B7', textTransform:'uppercase' }}>Live · Happening Right Now</span>
          </div>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:4, marginBottom:10 }}>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(3.5rem,7vw,5.5rem)', fontWeight:900, lineHeight:1, background:'linear-gradient(135deg,#FF6B2B,#FFD166)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>100</span>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(2.5rem,5vw,4rem)', fontWeight:900, lineHeight:1, background:'linear-gradient(135deg,#FFD166,#8B5CF6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>+</span>
          </div>
          <div style={{ fontSize:16, color:'rgba(255,255,255,.7)', marginBottom:20, fontWeight:500 }}>
            freshers join <strong style={{ color:'white', fontWeight:700 }}>every single day</strong>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', flexWrap:'wrap', gap:4 }}>
            {[['A','#FF6B2B'],['P','#8B5CF6'],['R','#06B6D4'],['K','#F43F5E'],['S','#10B981'],['M','#F59E0B'],['D','#EC4899']].map(([l,c],i)=>(
              <div key={i} style={{ width:32, height:32, borderRadius:'50%', background:c, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white', border:'2.5px solid #080B1A', marginLeft: i > 0 ? -10 : 0, zIndex:10-i, position:'relative', flexShrink:0 }}>{l}</div>
            ))}
            <span style={{ fontSize:12, color:'rgba(255,255,255,.35)', marginLeft:12 }}>+ thousands growing daily</span>
          </div>
        </div>

        {/* AI Feature Cards */}
        <div className="lp-ai-grid" style={{ marginBottom:48 }}>
          {[
            { icon:'🛡️', label:'AI Content Guard', desc:'Smart moderation auto-detects harmful words and toxic posts before they reach anyone. Community stays safe, 24/7.', color:'#F43F5E', bg:'rgba(244,63,94,.07)', border:'rgba(244,63,94,.18)', glow:'rgba(244,63,94,.2)' },
            { icon:'⚡', label:'Avoid Day-1 Mistakes', desc:'Read real stories from 10,000+ freshers. Know what NOT to do before your first workday even starts. Save months of pain.', color:'#F59E0B', bg:'rgba(245,158,11,.07)', border:'rgba(245,158,11,.18)', glow:'rgba(245,158,11,.2)' },
            { icon:'🎯', label:'Achieve Your Goals', desc:'Set career goals, adopt daily habits, track every streak. AI nudges you back when you\'re about to slip. Stay unstoppable.', color:'#A78BFA', bg:'rgba(139,92,246,.07)', border:'rgba(139,92,246,.18)', glow:'rgba(139,92,246,.2)' },
            { icon:'💰', label:'Save Time & Money', desc:'Habit tips from top performers that save your first salary. Career hacks only real freshers know — 100% free, forever.', color:'#34D399', bg:'rgba(16,185,129,.07)', border:'rgba(16,185,129,.18)', glow:'rgba(16,185,129,.2)' },
          ].map((f,i)=>(
            <div key={f.label} className="gz-ai-card lp-reveal" style={{ background:f.bg, border:`1px solid ${f.border}`, transitionDelay:`${i*.09}s` }}
              onMouseEnter={e=>{ e.currentTarget.style.boxShadow=`0 24px 64px ${f.glow}`; e.currentTarget.style.borderColor=f.color }}
              onMouseLeave={e=>{ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=f.border }}>
              <div style={{ fontSize:34, marginBottom:16, filter:`drop-shadow(0 0 12px ${f.glow})` }}>{f.icon}</div>
              <div style={{ fontSize:14, fontWeight:700, color:f.color, marginBottom:10, letterSpacing:'.01em' }}>{f.label}</div>
              <div style={{ fontSize:12.5, color:'rgba(255,255,255,.4)', lineHeight:1.72 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Proof chips */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:10, justifyContent:'center', marginBottom:32 }}>
          {['🤖 AI Moderation','🔥 100+ Daily Joiners','✅ Zero Toxic Content','🎯 Smart Goal Tracking','💬 Real Peer Support','🏆 Gamified Growth','💰 Free Forever','⚡ Instant Community'].map((chip,i)=>(
            <span key={chip} className="gz-chip" style={{ animationDelay:`${i*.05}s` }}>{chip}</span>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign:'center' }}>
          <Link to="/register" style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'15px 36px', borderRadius:100, fontSize:15.5, fontWeight:700, textDecoration:'none', cursor:'pointer', border:'none', fontFamily:"'DM Sans',sans-serif", background:'linear-gradient(135deg,#FF6B2B 0%,#8B5CF6 60%,#06B6D4 100%)', color:'white', boxShadow:'0 10px 40px rgba(139,92,246,.4)', transition:'all .3s', backgroundSize:'200% 100%' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 16px 56px rgba(139,92,246,.55)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 10px 40px rgba(139,92,246,.4)'}}>
            🚀 Join the AI-Powered Community — It's Free
          </Link>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="features" style={S.sec('white')}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <span className="lp-reveal" style={S.eyebrow()}>{t('landing.howItWorks')}</span>
          <h2 className="lp-reveal" style={{ ...S.h2(), maxWidth:480, margin:'0 auto' }}>Four steps. One unforgettable story.</h2>
        </div>
        <div className="lp-how" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0, position:'relative', maxWidth:900, margin:'0 auto' }}>
          <div style={{ position:'absolute', top:28, left:'12.5%', right:'12.5%', height:2, background:'repeating-linear-gradient(90deg,#FF6B2B 0,#FF6B2B 8px,transparent 8px,transparent 18px)', opacity:.2 }}/>
          {[['1','Sign Up Free','Profile in 60 seconds. Google login. No CV required.','🚀'],
            ['2','Write Your Day 1','Guided prompts. Raw, honest, entirely yours.','✍️'],
            ['3','Share & Connect','Post, follow, get comments from people who get it.','🤝'],
            ['4','Adopt & Grow','Pick a habit, log daily, earn points, climb the leaderboard.','🏆']].map(([n,t,d,ic],i)=>(
            <div key={n} className="lp-reveal" style={{ textAlign:'center', padding:'0 18px', transitionDelay:`${i*.09}s` }}>
              <div style={{ width:58, height:58, borderRadius:'50%', margin:'0 auto 18px', background:'white', border:'2px solid rgba(255,107,43,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Playfair Display',serif", fontSize:'1.3rem', fontWeight:900, color:'#FF6B2B', position:'relative', zIndex:2, boxShadow:'0 6px 20px rgba(255,107,43,.12)', transition:'all .3s', cursor:'default' }}
                onMouseEnter={e=>{e.currentTarget.style.background='#FF6B2B';e.currentTarget.style.color='white';e.currentTarget.style.transform='scale(1.12) rotate(-5deg)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='white';e.currentTarget.style.color='#FF6B2B';e.currentTarget.style.transform='scale(1)'}}>
                {n}
              </div>
              <div style={{ fontSize:22, marginBottom:8 }}>{ic}</div>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>{t}</div>
              <div style={{ fontSize:13, color:'#8C7B6E', lineHeight:1.65 }}>{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES (dark) ── */}
      <section style={{ ...S.sec('#0D0D1A'), position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(139,92,246,.4),rgba(255,107,43,.4),transparent)' }}/>
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(6,182,212,.3),rgba(139,92,246,.3),transparent)' }}/>
        <div>
          <span className="lp-reveal" style={{ ...S.eyebrow('#A78BFA'), letterSpacing:'.18em' }}>{t('landing.platformFeatures')}</span>
          <h2 className="lp-reveal" style={{ ...S.h2('white'), fontSize:'clamp(1.9rem,3.2vw,2.8rem)' }}>Everything a fresher needs to<br/>
            <span style={{ background:'linear-gradient(90deg,#FF6B2B,#FFD166)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>thrive</span>, documented.
          </h2>
          <p className="lp-reveal" style={{ fontSize:'1rem', color:'rgba(255,255,255,.38)', lineHeight:1.78, fontWeight:300, maxWidth:520 }}>Built for the brave, the nervous, and the completely lost.</p>
        </div>
        <div className="lp-3col" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20, marginTop:52 }}>
          {[
            ['📝','Story Sharing','Share text and images. Tag by category. Like, comment, save, and share with the world.','#FF6B2B','rgba(255,107,43,.15)'],
            ['🤝','Social Network','Follow creators, see your personalised feed, discover trending stories every day.','#06B6D4','rgba(6,182,212,.15)'],
            ['🔥','Habit Tracking','Adopt habits from a curated library. Log daily, build streaks. Day 1 to Day 100.','#F59E0B','rgba(245,158,11,.15)'],
            ['🏆','Gamification','Earn points on every action. Climb 8 levels. Get recognised on the leaderboard.','#A78BFA','rgba(139,92,246,.15)'],
            ['💰','Points & Coins','Login daily, like, comment, share — every single action earns you points and coins.','#34D399','rgba(16,185,129,.15)'],
            ['🛡️','AI Safety','Smart AI moderation keeps content safe, real, and respectful — automatically, 24/7.','#F43F5E','rgba(244,63,94,.15)'],
          ].map(([icon,title,text,color,bg],i)=>(
            <div key={title} className="lp-feat-card lp-reveal" style={{ transitionDelay:`${(i%3)*.1}s` }}>
              <div style={{ width:52, height:52, borderRadius:15, background:bg, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:18, boxShadow:`0 0 20px ${color}25` }}>{icon}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.15rem', fontWeight:700, color:'white', marginBottom:8 }}>{title}</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.36)', lineHeight:1.72 }}>{text}</div>
              <div style={{ marginTop:16, height:2, width:40, borderRadius:2, background:`linear-gradient(90deg,${color},transparent)` }}/>
            </div>
          ))}
        </div>
      </section>

      {/* ── POINTS SYSTEM showcase ── */}
      <section style={S.sec('linear-gradient(135deg,#FFF1E4 0%,#FDF6EE 100%)')}>
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <span className="lp-reveal" style={S.eyebrow()}>Earn While You Engage</span>
          <h2 className="lp-reveal" style={{ ...S.h2(), maxWidth:520, margin:'0 auto 14px' }}>Every action earns you points.</h2>
          <p className="lp-reveal" style={{ fontSize:'1rem', color:'#4A2800', lineHeight:1.75, fontWeight:300, maxWidth:440, margin:'0 auto' }}>Points power your leaderboard rank. Coins unlock premium stories.</p>
        </div>
        <div className="lp-4col" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, maxWidth:900, margin:'0 auto' }}>
          {[
            { action:'Daily Login',   pts:'+10', icon:'🌅', bg:'linear-gradient(135deg,#FF6B2B,#FF4500)', desc:'Log in every day to claim your daily bonus' },
            { action:'Like a Story',  pts:'+10', icon:'❤️', bg:'linear-gradient(135deg,#EC4899,#D946EF)', desc:'You and the story author both earn points' },
            { action:'Comment',       pts:'+20', icon:'💬', bg:'linear-gradient(135deg,#2563EB,#0EA5E9)', desc:'Deep engagement earns double points for both' },
            { action:'Share Story',   pts:'+10', icon:'🔗', bg:'linear-gradient(135deg,#059669,#34D399)', desc:'Spread the word and earn instantly' },
            { action:'Post a Story',  pts:'+20', icon:'✍️', bg:'linear-gradient(135deg,#7C3AED,#6D28D9)', desc:'Publish your first story of the day' },
            { action:'Habit Log',     pts:'+10', icon:'🔥', bg:'linear-gradient(135deg,#F59E0B,#EF4444)', desc:'Stay consistent, earn daily' },
            { action:'Story Unlock',  pts:'-10', icon:'🔒', bg:'linear-gradient(135deg,#6B7280,#4B5563)', desc:'Spend 10 coins to read private stories' },
            { action:'Level Up',      pts:'🏆',  icon:'👑', bg:'linear-gradient(135deg,#FFD166,#FF6B2B)', desc:'Reach milestones from Beginner to Legend' },
          ].map((item, i) => (
            <div key={item.action} className="lp-pts-card lp-reveal" style={{ background:'white', border:'1.5px solid rgba(26,8,0,.06)', transitionDelay:`${(i%4)*.08}s` }}>
              <div style={{ width:48, height:48, borderRadius:14, background:item.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, margin:'0 auto 12px' }}>{item.icon}</div>
              <div className="lp-pts-num" style={{ color: item.pts.startsWith('-') ? '#DC2626' : '#FF6B2B', marginBottom:4 }}>{item.pts}</div>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:6, color:'#1A0800' }}>{item.action}</div>
              <div style={{ fontSize:11, color:'#8C7B6E', lineHeight:1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:'center', marginTop:40 }}>
          <Link to="/register" style={S.btn('#FF6B2B','white',{ boxShadow:'0 6px 24px rgba(255,107,43,.3)' })}>Start Earning Points →</Link>
        </div>
      </section>

      {/* ── STORY CATEGORIES ── */}
      <section style={S.sec('white')}>
        <div style={{ textAlign:'center', marginBottom:42 }}>
          <span className="lp-reveal" style={S.eyebrow()}>{t('landing.storyCategories')}</span>
          <h2 className="lp-reveal" style={S.h2()}>Every kind of first.</h2>
        </div>
        {loading ? <Spinner/> : (
          <div className="lp-4col" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, maxWidth:960, margin:'0 auto' }}>
            {categories.map((c, i) => (
              <div key={c.id} className="lp-cat-card lp-reveal" onClick={() => navigate(`/discover?cat=${encodeURIComponent(c.name)}`)}
                style={{ transitionDelay:`${(i%4)*.08}s`, borderColor: c.is_cta ? 'rgba(255,107,43,.3)' : 'transparent' }}>
                <div style={{ fontSize:28, marginBottom:10 }}>{c.icon}</div>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:4, color:'#1A0800' }}>{c.name}</div>
                <div style={{ fontSize:11, color: c.is_cta ? '#FF6B2B' : '#8C7B6E', fontWeight: c.is_cta ? 600 : 400 }}>
                  {c.is_cta ? 'Share yours today →' : `${(c.story_count||0).toLocaleString()} stories`}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ textAlign:'center', marginTop:36 }}>
          <Link to="/discover" style={S.btn('transparent','#FF6B2B',{ border:'1.5px solid #FF6B2B' })}>{t('landing.browseAllStories')}</Link>
        </div>
      </section>

      {/* ── HABITS ── */}
      <section id="habits" style={S.sec('#F5EDE4')}>
        <div>
          <span className="lp-reveal" style={S.eyebrow()}>{t('landing.habitModule')}</span>
          <h2 className="lp-reveal" style={{ ...S.h2(), marginBottom:12 }}>The feature that makes<br/>Day1 Diaries different.</h2>
          <p className="lp-reveal" style={{ fontSize:'1rem', color:'#4A2800', lineHeight:1.78, fontWeight:300, maxWidth:480 }}>Choose a habit, adopt it, log every single day. Watch thousands do it with you — and earn points for every log.</p>
        </div>
        <div className="lp-2col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:56, alignItems:'center', marginTop:48 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {loading ? <Spinner/> : habits.map((h,i) => (
              <div key={h.id} className="lp-habit-row lp-reveal" style={{ transitionDelay:`${i*.07}s` }}>
                <div style={{ fontSize:22, width:40, textAlign:'center', flexShrink:0 }}>{h.icon||'✨'}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.title}</div>
                  <div style={{ fontSize:11, color:'#8C7B6E', marginBottom:5 }}>{(h.adopters_count||0).toLocaleString()} adopters · {h.completion_rate||0}% completion</div>
                  <div style={{ height:3, background:'rgba(26,8,0,.07)', borderRadius:2 }}>
                    <div style={{ height:3, width:`${h.completion_rate||0}%`, background:'linear-gradient(90deg,#FF6B2B,#FFD166)', borderRadius:2, transition:'width .6s ease' }}/>
                  </div>
                </div>
                <button className={`lp-adopt-btn${adopted[h.id]?' done':''}`}
                  onClick={() => { if(adopted[h.id]) navigate('/register'); else setAdopted(a=>({...a,[h.id]:true})) }}>
                  {adopted[h.id] ? '✓ Adopted' : 'Adopt'}
                </button>
              </div>
            ))}
          </div>
          <div className="lp-reveal" style={{ background:'#1A0800', borderRadius:26, padding:32, position:'relative', overflow:'hidden' }}>
            {habits[0] && <>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.15rem', fontWeight:700, color:'white', marginBottom:5 }}>{habits[0].icon} {habits[0].title}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.38)', marginBottom:18 }}>{(habits[0].adopters_count||0).toLocaleString()} adopters · 🔥 28-day streak</div>
            </>}
            <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginBottom:16 }}>
              {Array.from({length:100},(_,i)=>i+1).map(d=>(
                <div key={d} style={{ width:10, height:10, borderRadius:2, background: d<28?'#FF6B2B':d===28?'#FFD166':'rgba(255,255,255,.07)', boxShadow:d===28?'0 0 8px #FFD166':'none' }}/>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              {[['28','Days Done'],['72','Days Left'],['280','Points Earned']].map(([v,l])=>(
                <div key={l} style={{ flex:1, background:'rgba(255,255,255,.06)', borderRadius:12, padding:12, textAlign:'center' }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.5rem', fontWeight:900, color:'#FF6B2B' }}>{v}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ background:'rgba(255,255,255,.05)', borderRadius:12, padding:'11px 14px', fontSize:12, color:'rgba(255,255,255,.4)', lineHeight:1.65, marginBottom:14 }}>
              <span style={{color:'#FFD166'}}>Day 28:</span> "Finished chapter 8 of Atomic Habits. Habit stacking changed how I plan my mornings. <span style={{color:'#FF6B2B'}}>+10 pts!</span>"
            </div>
            <button onClick={()=>navigate('/register')} style={{ width:'100%', padding:11, background:'linear-gradient(90deg,#FF6B2B,#FF4500)', color:'white', border:'none', borderRadius:100, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", boxShadow:'0 4px 16px rgba(255,107,43,.35)' }}>
              Start Your Habit Journey →
            </button>
          </div>
        </div>
      </section>

      {/* ── TRENDING JOBS ── */}
      <section id="jobs" style={S.sec('#1A0800')}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:16, marginBottom:48 }}>
          <div>
            <span className="lp-reveal" style={S.eyebrow('#FFD166')}>{t('landing.trendingOpportunities')}</span>
            <h2 className="lp-reveal" style={{ ...S.h2('white'), marginBottom:10 }}>Your Day 1 at a new job<br/>starts here.</h2>
            <p className="lp-reveal" style={{ fontSize:'1rem', color:'rgba(255,255,255,.4)', lineHeight:1.75, fontWeight:300, maxWidth:420 }}>Real openings from companies that believe every first day matters.</p>
          </div>
          <Link to="/careers" className="lp-reveal" style={S.btn('transparent','#FFD166',{ border:'1.5px solid rgba(255,209,102,.4)', padding:'10px 24px', fontSize:13.5 })}>
            View All Jobs →
          </Link>
        </div>

        {loading ? <Spinner/> : openJobs.length === 0 ? (
          /* Fallback placeholder cards when no jobs are seeded */
          <div className="lp-4col" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {[
              { title:'Frontend Engineer', department:'Engineering', location:'Remote', job_type:'Full-Time' },
              { title:'Product Designer', department:'Design', location:'Bangalore', job_type:'Full-Time' },
              { title:'Growth Marketer', department:'Marketing', location:'Mumbai', job_type:'Contract' },
              { title:'Community Manager', department:'Operations', location:'Remote', job_type:'Part-Time' },
            ].map((job, i) => <JobCard key={i} job={job} navigate={navigate} S={S} />)}
          </div>
        ) : (
          <>
            <div className="lp-4col" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
              {visibleJobs.map((job, i) => <JobCard key={job.id||i} job={job} navigate={navigate} S={S} />)}
            </div>
            {openJobs.length > 4 && (
              <div style={{ textAlign:'center', marginTop:32 }}>
                <button onClick={() => setShowAllJobs(v=>!v)}
                  style={S.btn('rgba(255,255,255,.08)','rgba(255,255,255,.75)',{ border:'1px solid rgba(255,255,255,.12)', fontSize:14 })}>
                  {showAllJobs ? '← Show Less' : `View ${openJobs.length - 4} More Jobs →`}
                </button>
              </div>
            )}
          </>
        )}

        <div style={{ textAlign:'center', marginTop:40, paddingTop:40, borderTop:'1px solid rgba(255,255,255,.06)' }}>
          <p style={{ color:'rgba(255,255,255,.4)', fontSize:13, marginBottom:16 }}>Building something? Post your openings and reach 10,000+ freshers.</p>
          <Link to="/contact" style={S.btn('#FF6B2B','white',{ boxShadow:'0 6px 20px rgba(255,107,43,.4)' })}>Post a Job →</Link>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={S.sec('#FDF6EE')}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <span className="lp-reveal" style={S.eyebrow()}>{t('landing.testimonialsTitle')}</span>
          <h2 className="lp-reveal" style={S.h2()}>What they're saying</h2>
        </div>
        {loading ? <Spinner/> : (
          <div className="lp-3col" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:22 }}>
            {testimonials.map((t,i)=>(
              <div key={t.id} className="lp-testi lp-reveal" style={{ transitionDelay:`${i*.1}s` }}>
                <div style={{ color:'#FFD166', fontSize:14, marginBottom:10, letterSpacing:2 }}>{'★'.repeat(t.rating||5)}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'3.5rem', color:'#FF6B2B', opacity:.12, lineHeight:.8, marginBottom:-4 }}>"</div>
                <div style={{ fontSize:14, lineHeight:1.78, color:'#4A2800', fontStyle:'italic', marginBottom:22, fontFamily:"'Playfair Display',serif" }}>{t.quote}</div>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:42, height:42, borderRadius:'50%', background:t.avatar_gradient||'linear-gradient(135deg,#FF6B2B,#FFD166)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'white', flexShrink:0 }}>{t.author_initials}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{t.author_name}</div>
                    <div style={{ fontSize:11, color:'#8C7B6E' }}>{t.author_role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── COMMUNITY / LEADERBOARD ── */}
      <section id="community" style={S.sec('white')}>
        <div>
          <span className="lp-reveal" style={S.eyebrow()}>{t('landing.communityTitle')}</span>
          <h2 className="lp-reveal" style={{ ...S.h2(), marginBottom:12 }}>Climb from Beginner to Legend.<br/>Get recognised.</h2>
          <p className="lp-reveal" style={{ fontSize:'1rem', color:'#4A2800', lineHeight:1.78, fontWeight:300, maxWidth:480 }}>Every story you share, every habit you log, every person you inspire — it all builds your score and coins.</p>
        </div>
        <div className="lp-2col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:56, marginTop:48, alignItems:'start' }}>
          <div className="lp-reveal">
            <div style={{ background:'#F5EDE4', borderRadius:22, overflow:'hidden', boxShadow:'0 4px 20px rgba(26,8,0,.06)' }}>
              <div style={{ background:'#1A0800', padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'white' }}>🏆 Community Leaderboard</div>
                <span style={{ fontSize:12, color:'rgba(255,255,255,.35)' }}>Top creators</span>
              </div>
              {loading ? <Spinner/> : leaderboard.map((u,i)=>(
                <div key={u.id} className="lp-lb-row" onClick={()=>navigate(`/profile/${u.username}`)}>
                  <div style={{ fontWeight:700, fontSize:15, width:24, textAlign:'center', flexShrink:0 }}>{['🥇','🥈','🥉','4','5'][i]||i+1}</div>
                  <div style={{ width:34, height:34, borderRadius:'50%', background:getAvatarColor(u.full_name||u.username||''), display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white', flexShrink:0 }}>
                    {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} loading="lazy" /> : getInitials(u.full_name||u.username||'?')}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.full_name||u.username}</div>
                    <div style={{ fontSize:11, color:'#8C7B6E' }}>{LEVEL_ICONS[u.level]||'🥉'} {u.level} · {u.stories_count||0} stories</div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#FF6B2B', flexShrink:0 }}>{(u.score||0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:16, color:'#1A0800' }}>Level Progression</div>
            {[['🥉','Beginner','0 – 1,000 pts',100],['🥈','Explorer','1K – 5K pts',82],['🥇','Achiever','5K – 20K pts',64],['🏆','Hero','20K – 50K pts',48],['🔥','Super Hero','50K – 100K pts',32],['👑','Legend','100K+ pts',18]].map(([icon,name,pts,pct],i)=>(
              <div key={name} className="lp-reveal" style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', background:'#F5EDE4', borderRadius:13, marginBottom:9, transition:'all .2s', transitionDelay:`${i*.06}s`, cursor:'default' }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,107,43,.07)';e.currentTarget.style.transform='translateX(5px)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='#F5EDE4';e.currentTarget.style.transform='none'}}>
                <div style={{ fontSize:22, width:32, textAlign:'center', flexShrink:0 }}>{icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{name}</div>
                    <div style={{ fontSize:11, color:'#8C7B6E' }}>{pts}</div>
                  </div>
                  <div style={{ height:3, background:'rgba(26,8,0,.08)', borderRadius:2 }}>
                    <div style={{ height:3, width:`${pct}%`, background:'linear-gradient(90deg,#FF6B2B,#FFD166)', borderRadius:2 }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ background:'linear-gradient(135deg,#1A0A2E 0%,#2D0A1E 35%,#1A0800 70%,#0A1628 100%)', padding:'100px 56px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'-30%', left:'-5%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,.25) 0%,transparent 70%)' }}/>
        <div style={{ position:'absolute', bottom:'-40%', right:'-5%', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,107,43,.2) 0%,transparent 70%)' }}/>
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(6,182,212,.1) 0%,transparent 65%)' }}/>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,.03) 1px,transparent 1px)', backgroundSize:'30px 30px' }}/>
        <div style={{ position:'relative', zIndex:2 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:100, padding:'6px 18px', marginBottom:24 }}>
            <span style={{ fontSize:14 }}>🚀</span>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', color:'rgba(255,255,255,.6)', textTransform:'uppercase' }}>Join the Movement</span>
          </div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(2rem,4vw,3.4rem)', fontWeight:900, color:'white', lineHeight:1.12, marginBottom:16 }}>
            {(data?.stats?.total_stories||10000).toLocaleString()}+ freshers already shared<br/>
            <span style={{ background:'linear-gradient(90deg,#FF6B2B,#FFD166,#8B5CF6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>their Day 1.</span> What's yours?
          </h2>
          <p style={{ color:'rgba(255,255,255,.55)', fontSize:'1.06rem', marginBottom:36 }}>Every expert was once a fresher. Your story matters more than you think.</p>
          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', marginBottom:52 }}>
            <Link to="/register" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'16px 38px', borderRadius:100, fontSize:16, fontWeight:700, textDecoration:'none', cursor:'pointer', border:'none', fontFamily:"'DM Sans',sans-serif", background:'linear-gradient(135deg,#FF6B2B,#8B5CF6)', color:'white', boxShadow:'0 10px 36px rgba(139,92,246,.45)', transition:'all .3s' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 16px 48px rgba(139,92,246,.6)'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 10px 36px rgba(139,92,246,.45)'}}>
              Share My Day 1 Story ✍️
            </Link>
            <Link to="/login" style={S.btn('rgba(255,255,255,.08)','white',{ padding:'16px 38px', fontSize:16, border:'1.5px solid rgba(255,255,255,.2)' })}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.14)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.08)'}}>
              {t('nav.signIn')}
            </Link>
          </div>
          <div style={{ display:'flex', gap:40, justifyContent:'center', paddingTop:40, borderTop:'1px solid rgba(255,255,255,.1)', flexWrap:'wrap' }}>
            {[
              [(data?.stats?.total_users||0).toLocaleString()+'+',t('landing.totalUsers'),'👥'],
              [(data?.stats?.total_stories||0).toLocaleString()+'+',t('landing.storiesShared'),'📝'],
              ['100+','Join Daily','🔥'],
              ['98%',t('landing.feelLessAlone'),'✨'],
            ].map(([v,l,ic])=>(
              <div key={l} style={{ textAlign:'center' }}>
                <div style={{ fontSize:'1.5rem', marginBottom:4 }}>{ic}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'2.4rem', fontWeight:900, background:'linear-gradient(135deg,#FFD166,#FF6B2B)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', lineHeight:1 }}>{v}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginTop:4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM SECTION (fully admin-customizable) ── */}
      {bottomSection.is_active !== false && (bottomSection.heading || bottomSection.image_urls?.length > 0) && (
        <section className="lp-bottom-sec" style={{ display:'grid', gridTemplateColumns: bottomSection.image_urls?.length ? '1fr 1fr' : '1fr', alignItems:'center', gap:48, padding:'90px 56px', background:'#FBF6EC' }}>
          <div>
            {bottomSection.subheadline && (
              <div style={{ fontSize:11, fontWeight:700, color:'#FF6B2B', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:14 }}>{bottomSection.subheadline}</div>
            )}
            {bottomSection.heading && (
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:'clamp(1.8rem,3.2vw,2.6rem)', lineHeight:1.15, marginBottom:18 }}>{bottomSection.heading}</h2>
            )}
            {bottomSection.body_text && (
              <p style={{ fontSize:'1rem', color:'#4A2800', lineHeight:1.75, fontWeight:300, marginBottom:30, maxWidth:480 }}>{bottomSection.body_text}</p>
            )}
            {bottomSection.cta_text && (
              <Link to={bottomSection.cta_link || '/register'} style={S.btn('#FF6B2B','white',{ padding:'15px 34px', fontSize:15.5, boxShadow:'0 8px 28px rgba(255,107,43,.38)' })}>
                {bottomSection.cta_text}
              </Link>
            )}
          </div>
          {bottomSection.image_urls?.length > 0 && (
            <div style={{ display:'flex', justifyContent:'center' }}>
              <HeroSlideshow images={bottomSection.image_urls}/>
            </div>
          )}
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ background:'#1A0800', padding:'60px 56px 36px' }}>
        <div className="lp-footer-g" style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr', gap:36, marginBottom:48 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:21, fontWeight:900, color:'#FF6B2B', marginBottom:12 }}>Day1 Diaries</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.35)', lineHeight:1.75, maxWidth:240 }}>The community where freshers share raw first-day stories, adopt life-changing habits, earn points, and grow together.</div>
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              {['🐦','💼','📸'].map((ic,i) => (
                <div key={i} style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,.07)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, cursor:'pointer', transition:'background .2s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,107,43,.25)'}
                  onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.07)'}>{ic}</div>
              ))}
            </div>
          </div>
          {[
            ['Platform',[['Discover Stories','/discover'],['Habit Library','/habits'],['Leaderboard','/leaderboard'],['Share a Story','/write']]],
            ['Company',[['About Us','/about'],['Blog','/blog'],['Careers','/careers'],['Contact','/contact']]],
            ['Legal',[['Privacy Policy','/privacy'],['Terms of Service','/terms'],['Community Guidelines','/content-policy'],['Membership & Refund Policy','/refund-policy']]],
          ].map(([title,links])=>(
            <div key={title}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', marginBottom:14 }}>{title}</div>
              <ul style={{ listStyle:'none' }}>
                {links.map(([label,href])=>(
                  <li key={label} style={{ marginBottom:9 }}>
                    <Link to={href} style={{ fontSize:13, color:'rgba(255,255,255,.45)', textDecoration:'none', transition:'color .2s' }}
                      onMouseEnter={e=>e.target.style.color='#FF6B2B'} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,.45)'}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:24, borderTop:'1px solid rgba(255,255,255,.06)', flexWrap:'wrap', gap:10 }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.25)' }}>© 2026 Day1 Diaries. All rights reserved. Made with ❤️ for every fresher.</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:13, color:'rgba(255,255,255,.3)', fontStyle:'italic' }}>Every Expert Was Once a Fresher. ✦</div>
        </div>
      </footer>
    </div>
  )
}

/* ── Job Card subcomponent ── */
function JobCard({ job, navigate, S }) {
  const typeStyle = JOB_TYPE_COLORS[job.job_type] || JOB_TYPE_COLORS['Full-Time']
  const deptIcon  = JOB_DEPT_ICONS[job.department] || '💼'
  const hasSalary = job.salary_min || job.salary_max

  return (
    <div className="lp-job-card lp-reveal" onClick={() => navigate('/careers')}>
      {/* Dept icon */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ width:46, height:46, borderRadius:13, background:'linear-gradient(135deg,#FF6B2B,#FFD166)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{deptIcon}</div>
        <span style={{ fontSize:10, fontWeight:700, padding:'4px 10px', borderRadius:100, background:typeStyle.bg, color:typeStyle.color }}>{job.job_type || 'Full-Time'}</span>
      </div>

      {/* Title & dept */}
      <div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1rem', fontWeight:700, color:'#1A0800', marginBottom:4, lineHeight:1.3, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{job.title}</div>
        <div style={{ fontSize:12, color:'#8C7B6E', fontWeight:500 }}>{job.department}</div>
      </div>

      {/* Meta: location + salary */}
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {job.location && (
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#4A2800' }}>
            <span>📍</span> <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{job.location}</span>
          </div>
        )}
        {hasSalary && (
          <div style={{ fontSize:12, color:'#FF6B2B', fontWeight:600 }}>
            {job.currency||'₹'}{job.salary_min ? (job.salary_min/100000).toFixed(0)+'L' : ''}{job.salary_max ? ` – ${(job.salary_max/100000).toFixed(0)}L` : ''}
          </div>
        )}
      </div>

      {/* Apply CTA */}
      <button style={{ ...S.btn('#FF6B2B','white',{ padding:'9px 0', fontSize:12.5, width:'100%', boxShadow:'0 4px 12px rgba(255,107,43,.28)' }), marginTop:'auto' }}
        onClick={e => { e.stopPropagation(); navigate('/careers') }}>
        Apply Now →
      </button>
    </div>
  )
}
