import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import useLandingData, { useCountUp, LEVEL_ICONS, getAvatarColor, getInitials } from '../hooks/useLandingData'
import Seo from '../components/Seo'
import VisitorCounter from '../components/VisitorCounter'

const JOB_TYPE = { 'Full-Time':'#2563EB', 'Part-Time':'#7C3AED', 'Contract':'#D97706', 'Internship':'#059669', 'Remote':'#FF6B2B' }

/* ── Custom cursor — a small dot + a trailing ring that lerps toward
   the pointer. Desktop-only (skipped on touch devices). ── */
function CursorFollower() {
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const pos = useRef({ x: 0, y: 0 })
  const ring = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    const move = e => { pos.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', move)
    let raf
    const tick = () => {
      ring.current.x += (pos.current.x - ring.current.x) * 0.18
      ring.current.y += (pos.current.y - ring.current.y) * 0.18
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${pos.current.x - 3}px,${pos.current.y - 3}px,0)`
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${ring.current.x - 16}px,${ring.current.y - 16}px,0)`
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(raf) }
  }, [])

  if (window.matchMedia('(pointer: coarse)').matches) return null
  return (
    <>
      <div ref={dotRef} style={{ position:'fixed', top:0, left:0, width:6, height:6, borderRadius:'50%', background:'#FF6B2B', zIndex:9999, pointerEvents:'none', willChange:'transform' }} />
      <div ref={ringRef} style={{ position:'fixed', top:0, left:0, width:32, height:32, borderRadius:'50%', border:'1.5px solid rgba(255,107,43,.5)', zIndex:9998, pointerEvents:'none', willChange:'transform', transition:'width .2s, height .2s' }} />
    </>
  )
}

/* ── Magnetic wrapper — child nudges toward the cursor within a radius ── */
function Magnetic({ children, strength = 0.35 }) {
  const ref = useRef(null)
  const onMove = e => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - (r.left + r.width / 2)) * strength
    const y = (e.clientY - (r.top + r.height / 2)) * strength
    el.style.transform = `translate(${x}px, ${y}px)`
  }
  const onLeave = () => { if (ref.current) ref.current.style.transform = 'translate(0,0)' }
  return <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ display:'inline-block', transition:'transform .25s ease-out' }}>{children}</div>
}

/* ── Tilt card — subtle 3D rotation following the cursor ── */
function TiltCard({ children, style, className, onClick }) {
  const ref = useRef(null)
  const onMove = e => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(700px) rotateX(${py * -8}deg) rotateY(${px * 8}deg) scale(1.02)`
  }
  const onLeave = () => { if (ref.current) ref.current.style.transform = 'perspective(700px) rotateX(0) rotateY(0) scale(1)' }
  return <div ref={ref} className={className} onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick} style={{ transition:'transform .35s ease-out', willChange:'transform', ...style }}>{children}</div>
}

/* ── Scroll progress bar pinned to the very top ── */
function ScrollProgress() {
  const ref = useRef(null)
  useEffect(() => {
    let raf
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const h = document.documentElement
        const pct = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100
        if (ref.current) ref.current.style.width = `${pct}%`
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])
  return <div style={{ position:'fixed', top:0, left:0, right:0, height:3, zIndex:600, background:'rgba(255,107,43,.12)' }}><div ref={ref} style={{ height:'100%', width:0, background:'linear-gradient(90deg,#FF6B2B,#8B5CF6)' }} /></div>
}

/* ── Hero with mouse-parallax background blobs ── */
function ParallaxHero({ children }) {
  const ref = useRef(null)
  const [shift, setShift] = useState({ x: 0, y: 0 })
  const onMove = e => {
    const r = ref.current.getBoundingClientRect()
    setShift({ x: ((e.clientX - r.left) / r.width - 0.5) * 30, y: ((e.clientY - r.top) / r.height - 0.5) * 30 })
  }
  return (
    <section ref={ref} onMouseMove={onMove} style={{ position:'relative', minHeight:'100vh', display:'flex', alignItems:'center', overflow:'hidden', padding:'120px 48px 60px' }}>
      <div style={{ position:'absolute', top:-100, right:-100, width:560, height:560, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,.18) 0%,transparent 65%)', transform:`translate(${shift.x}px,${shift.y}px)`, transition:'transform .15s linear', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-120, left:-60, width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,107,43,.18) 0%,transparent 65%)', transform:`translate(${-shift.x*0.6}px,${-shift.y*0.6}px)`, transition:'transform .15s linear', pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:'35%', left:'55%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(6,182,212,.14) 0%,transparent 65%)', transform:`translate(${shift.x*1.4}px,${shift.y*1.4}px)`, transition:'transform .15s linear', pointerEvents:'none' }} />
      {children}
    </section>
  )
}

export default function LandingKinetic() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, loading, seo } = useLandingData()
  const [adopted, setAdopted] = useState({})
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)
  const featureRefs = useRef([])

  useEffect(() => { if (user) navigate('/feed') }, [user, navigate])

  useEffect(() => {
    const revObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; revObs.unobserve(e.target) }
      })
    }, { threshold: .12 })
    document.querySelectorAll('.kn-reveal').forEach(el => {
      el.style.transition = 'opacity .7s ease, transform .7s ease'
      el.style.opacity = '0'
      el.style.transform = 'translateY(30px)'
      revObs.observe(el)
    })
    return () => revObs.disconnect()
  }, [data])

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActiveFeature(Number(e.target.dataset.idx)) })
    }, { threshold: .6 })
    featureRefs.current.forEach(el => el && obs.observe(el))
    return () => obs.disconnect()
  }, [data])

  const c1 = useCountUp(data?.stats?.total_users || 0, '+', !loading)
  const c2 = useCountUp(data?.stats?.total_stories || 0, '+', !loading)
  const c3 = useCountUp(data?.stats?.habit_adoptions || 0, '+', !loading)
  const c4 = useCountUp(98, '%', !loading)

  const hero = data?.hero || {}
  const bottomSection = data?.bottomSection || {}
  const categories = data?.categories || []
  const testimonials = data?.testimonials || []
  const habits = data?.habits || []
  const leaderboard = data?.leaderboard || []
  const openJobs = data?.open_jobs || []
  const headline = hero.headline || 'Your first day at work is a story only you lived.'
  const highlight = hero.headline_highlight || 'only you'
  const parts = headline.split(highlight)

  const FEATURES = [
    ['📝','Story Sharing','Share text and images. Tag by category. Like, comment, save, and share with the world.','#FF6B2B'],
    ['🤝','Social Network','Follow creators, see your personalised feed, discover trending stories every day.','#06B6D4'],
    ['🔥','Habit Tracking','Adopt habits from a curated library. Log daily, build streaks. Day 1 to Day 100.','#F59E0B'],
    ['🏆','Gamification','Earn points on every action. Climb 8 levels. Get recognised on the leaderboard.','#A78BFA'],
    ['💰','Points & Coins','Login daily, like, comment, share — every single action earns you points and coins.','#34D399'],
    ['🛡️','AI Safety','Smart AI moderation keeps content safe, real, and respectful — automatically, 24/7.','#F43F5E'],
  ]

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#0B0710', color:'white', overflowX:'hidden' }}>
      {seo && <Seo title={seo.title} description={seo.description} image={seo.image} path="/" />}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { cursor: none !important; }
        @media(pointer: coarse) { * { cursor: auto !important; } }
        @keyframes kn-ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .kn-link{font-size:13.5px;font-weight:500;color:rgba(255,255,255,.7);text-decoration:none;transition:color .2s}
        .kn-link:hover{color:#FF6B2B}
        .kn-carousel{display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px;scrollbar-width:none}
        .kn-carousel::-webkit-scrollbar{display:none}
        .kn-carousel>*{scroll-snap-align:start;flex-shrink:0}
        .kn-cat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:22px;text-align:center;cursor:pointer}
        .kn-pts{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:20px;text-align:center}
        .kn-habit{display:flex;align-items:center;gap:13px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px 16px}
        .kn-adopt{background:transparent;border:1.5px solid #FF6B2B;color:#FF6B2B;padding:5px 14px;border-radius:100px;font-size:11px;font-weight:600;cursor:pointer}
        .kn-adopt.done{background:rgba(22,163,74,.15);border-color:#16A34A;color:#16A34A}
        .kn-job{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:22px;width:240px;cursor:pointer}
        .kn-testi{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:24px;width:320px}
        .kn-lb-row{display:flex;align-items:center;gap:11px;padding:11px 16px;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer}
        @media(max-width:900px){
          .kn-2col{grid-template-columns:1fr!important}
          .kn-4col{grid-template-columns:1fr 1fr!important}
          .kn-3col{grid-template-columns:1fr!important}
          .kn-nav-desktop{display:none!important}
          .kn-hamburger{display:flex!important}
        }
        @media(max-width:480px){ .kn-4col{grid-template-columns:1fr!important} }
      `}</style>

      <CursorFollower />
      <ScrollProgress />

      {/* NAV */}
      <nav style={{ position:'fixed', top:3, left:0, right:0, zIndex:500, padding:'16px 48px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(11,7,16,.7)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <Link to="/" style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:900, color:'white', textDecoration:'none' }}>Day1 <span style={{ color:'#FF6B2B' }}>Diaries</span></Link>
          <VisitorCounter />
        </div>
        <div className="kn-nav-desktop" style={{ display:'flex', alignItems:'center', gap:28 }}>
          <a href="#features" className="kn-link">Features</a>
          <a href="#habits" className="kn-link">Habits</a>
          <a href="#jobs" className="kn-link">Opportunities</a>
          <Link to="/login" className="kn-link">Sign In</Link>
          <Magnetic>
            <Link to="/register" style={{ fontSize:13.5, fontWeight:700, color:'white', background:'linear-gradient(135deg,#FF6B2B,#8B5CF6)', padding:'10px 22px', borderRadius:100, textDecoration:'none', display:'inline-block' }}>Get Started ✨</Link>
          </Magnetic>
        </div>
        <button className="kn-hamburger" style={{ display:'none', background:'rgba(255,255,255,.08)', border:'none', borderRadius:8, padding:'6px 10px', fontSize:16, color:'white' }} onClick={() => setMenuOpen(v => !v)}>{menuOpen ? '✕' : '☰'}</button>
      </nav>
      {menuOpen && (
        <div style={{ position:'fixed', top:60, left:0, right:0, zIndex:480, background:'#15101F', padding:'16px 24px', display:'flex', flexDirection:'column', gap:14 }}>
          <a href="#features" className="kn-link" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#habits" className="kn-link" onClick={() => setMenuOpen(false)}>Habits</a>
          <a href="#jobs" className="kn-link" onClick={() => setMenuOpen(false)}>Opportunities</a>
          <Link to="/login" className="kn-link" onClick={() => setMenuOpen(false)}>Sign In</Link>
          <Link to="/register" className="kn-link" onClick={() => setMenuOpen(false)} style={{ color:'#FF6B2B' }}>Get Started →</Link>
        </div>
      )}

      {/* HERO */}
      <ParallaxHero>
        <div style={{ position:'relative', zIndex:2, maxWidth:880, margin:'0 auto', textAlign:'center' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:100, padding:'7px 18px', fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#A78BFA', marginBottom:28 }}>
            {hero.eyebrow || 'For Every Fresher, Everywhere'}
          </div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:'clamp(2.6rem,6vw,5rem)', lineHeight:1.05, marginBottom:26 }}>
            {parts[0]}<span style={{ background:'linear-gradient(120deg,#FF6B2B,#8B5CF6,#06B6D4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{highlight}</span>{parts[1]}
          </h1>
          <p style={{ fontSize:'1.1rem', color:'rgba(255,255,255,.55)', lineHeight:1.75, maxWidth:540, margin:'0 auto 40px', fontWeight:300 }}>
            {hero.subheadline || 'Now the world can read it. The community where freshers share raw stories, adopt life-changing habits, and grow together.'}
          </p>
          <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap', marginBottom:64 }}>
            <Magnetic strength={0.25}>
              <Link to="/register" style={{ display:'inline-block', fontSize:15.5, fontWeight:700, color:'white', background:'linear-gradient(135deg,#FF6B2B,#8B5CF6)', padding:'16px 36px', borderRadius:100, textDecoration:'none', boxShadow:'0 14px 40px rgba(139,92,246,.4)' }}>{hero.cta_primary_text || 'Share My Day 1 ✍️'}</Link>
            </Magnetic>
            <Magnetic strength={0.25}>
              <a href="#features" style={{ display:'inline-block', fontSize:15.5, fontWeight:700, color:'white', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.2)', padding:'16px 36px', borderRadius:100, textDecoration:'none' }}>{hero.cta_secondary_text || 'See How It Works →'}</a>
            </Magnetic>
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:48, flexWrap:'wrap' }}>
            {[[c1,'Total Users'],[c2,'Stories Shared'],[c3,'Habit Adoptions'],[c4,'Feel Less Alone']].map(([v,l]) => (
              <div key={l}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.9rem', fontWeight:900, color:'#FF6B2B' }}>{v}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </ParallaxHero>

      {/* TICKER */}
      <div style={{ background:'rgba(255,255,255,.03)', borderTop:'1px solid rgba(255,255,255,.06)', borderBottom:'1px solid rgba(255,255,255,.06)', padding:'14px 0', overflow:'hidden', whiteSpace:'nowrap' }}>
        <div style={{ display:'inline-block', animation:'kn-ticker 30s linear infinite' }}>
          {[...Array(2)].flatMap(() => ['🛡️ AI Moderation','🔥 100+ Daily Joiners','🏆 Gamified Growth','💬 Real Peer Support','✅ Zero Toxic Content','⚡ Instant Community']).map((t,i) => (
            <span key={i} style={{ fontSize:12.5, fontWeight:600, color:'rgba(255,255,255,.4)', marginRight:36 }}>{t}</span>
          ))}
        </div>
      </div>

      {/* STICKY-SCROLL FEATURE SHOWCASE */}
      <section id="features" style={{ padding:'100px 48px', maxWidth:1200, margin:'0 auto' }}>
        <div className="kn-reveal" style={{ textAlign:'center', marginBottom:64 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', color:'#A78BFA', marginBottom:14 }}>Platform Features</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(2rem,4vw,3rem)', fontWeight:900, maxWidth:560, margin:'0 auto' }}>Everything a fresher needs to thrive, scroll through it.</h2>
        </div>
        <div className="kn-2col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:60 }}>
          <div>
            {FEATURES.map((f, i) => (
              <div key={f[1]} ref={el => featureRefs.current[i] = el} data-idx={i} style={{ padding:'48px 0', borderBottom: i < FEATURES.length - 1 ? '1px solid rgba(255,255,255,.07)' : 'none', opacity: activeFeature === i ? 1 : .35, transition:'opacity .35s' }}>
                <div style={{ fontSize:32, marginBottom:14 }}>{f[0]}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.4rem', fontWeight:700, marginBottom:10 }}>{f[1]}</div>
                <div style={{ fontSize:14, color:'rgba(255,255,255,.45)', lineHeight:1.75, maxWidth:380 }}>{f[2]}</div>
              </div>
            ))}
          </div>
          <div style={{ position:'sticky', top:120, height:380, alignSelf:'start' }}>
            <div style={{ height:'100%', borderRadius:28, background:`radial-gradient(circle at 30% 30%, ${FEATURES[activeFeature][3]}33, transparent 70%), rgba(255,255,255,.04)`, border:'1px solid rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'center', transition:'background .4s' }}>
              <div style={{ fontSize:90, filter:`drop-shadow(0 0 40px ${FEATURES[activeFeature][3]}55)` }}>{FEATURES[activeFeature][0]}</div>
            </div>
          </div>
        </div>
      </section>

      {/* POINTS — tilt cards */}
      <section style={{ padding:'60px 48px', maxWidth:1200, margin:'0 auto' }}>
        <div className="kn-reveal" style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', color:'#A78BFA', marginBottom:14 }}>Earn While You Engage</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(2rem,4vw,3rem)', fontWeight:900 }}>Every action earns you points.</h2>
        </div>
        <div className="kn-4col" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
          {[['Daily Login','+10','🌅'],['Like a Story','+10','❤️'],['Comment','+20','💬'],['Share Story','+10','🔗'],['Post a Story','+20','✍️'],['Habit Log','+10','🔥'],['Story Unlock','-10','🔒'],['Level Up','🏆','👑']].map(([action,pts,icon]) => (
            <TiltCard key={action} className="kn-pts kn-reveal">
              <div style={{ fontSize:20, marginBottom:8 }}>{icon}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.5rem', fontWeight:900, color: String(pts).startsWith('-') ? '#F87171' : '#FF6B2B' }}>{pts}</div>
              <div style={{ fontSize:12, fontWeight:600, marginTop:4 }}>{action}</div>
            </TiltCard>
          ))}
        </div>
        <div style={{ textAlign:'center', marginTop:36 }}>
          <Magnetic><Link to="/register" style={{ fontSize:14, fontWeight:700, color:'white', background:'linear-gradient(135deg,#FF6B2B,#8B5CF6)', padding:'14px 30px', borderRadius:100, textDecoration:'none', display:'inline-block' }}>Start Earning Points →</Link></Magnetic>
        </div>
      </section>

      {/* CATEGORIES — tilt cards */}
      <section style={{ padding:'60px 48px', maxWidth:1100, margin:'0 auto' }}>
        <div className="kn-reveal" style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', color:'#A78BFA', marginBottom:14 }}>Story Categories</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(2rem,4vw,3rem)', fontWeight:900 }}>Every kind of first.</h2>
        </div>
        {!loading && (
          <div className="kn-4col" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {categories.map(c => (
              <TiltCard key={c.id} className="kn-cat kn-reveal" onClick={() => navigate(`/discover?cat=${encodeURIComponent(c.name)}`)}>
                <div style={{ fontSize:28, marginBottom:10 }}>{c.icon}</div>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>{c.name}</div>
                <div style={{ fontSize:11, color: c.is_cta ? '#FF6B2B' : 'rgba(255,255,255,.4)' }}>{c.is_cta ? 'Share yours →' : `${(c.story_count||0).toLocaleString()} stories`}</div>
              </TiltCard>
            ))}
          </div>
        )}
      </section>

      {/* HABITS */}
      <section id="habits" style={{ padding:'60px 48px', maxWidth:1100, margin:'0 auto' }}>
        <div className="kn-reveal" style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', color:'#A78BFA', marginBottom:14 }}>Habit Change Module</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(2rem,4vw,3rem)', fontWeight:900, maxWidth:560, margin:'0 auto' }}>The feature that makes Day1 Diaries different.</h2>
        </div>
        <div className="kn-2col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:40 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {!loading && habits.map(h => (
              <div key={h.id} className="kn-habit kn-reveal">
                <span style={{ fontSize:20, width:30, textAlign:'center' }}>{h.icon || '✨'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13.5, fontWeight:600 }}>{h.title}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>{(h.adopters_count||0).toLocaleString()} adopters · {h.completion_rate||0}%</div>
                </div>
                <button className={`kn-adopt${adopted[h.id] ? ' done' : ''}`} onClick={() => { if (adopted[h.id]) navigate('/register'); else setAdopted(a => ({ ...a, [h.id]: true })) }}>{adopted[h.id] ? '✓' : 'Adopt'}</button>
              </div>
            ))}
          </div>
          <TiltCard style={{ background:'linear-gradient(135deg,#1A0A2E,#2D0A1E)', borderRadius:22, padding:32, border:'1px solid rgba(255,255,255,.08)' }}>
            {habits[0] && <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.1rem', fontWeight:700, marginBottom:18 }}>{habits[0].icon} {habits[0].title} 🔥 28-day streak</div>}
            <div style={{ display:'flex', gap:10, marginBottom:18 }}>
              {[['28','Done'],['72','Left'],['280','Points']].map(([v,l]) => (
                <div key={l} style={{ flex:1, background:'rgba(255,255,255,.06)', borderRadius:12, padding:12, textAlign:'center' }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.4rem', fontWeight:900, color:'#FF6B2B' }}>{v}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.35)' }}>{l}</div>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/register')} style={{ width:'100%', padding:13, background:'linear-gradient(135deg,#FF6B2B,#8B5CF6)', color:'white', border:'none', borderRadius:100, fontWeight:700, cursor:'pointer' }}>Start Your Habit Journey →</button>
          </TiltCard>
        </div>
      </section>

      {/* JOBS — horizontal scroll-snap carousel */}
      <section id="jobs" style={{ padding:'60px 0' }}>
        <div className="kn-reveal" style={{ textAlign:'center', marginBottom:40, padding:'0 48px' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', color:'#A78BFA', marginBottom:14 }}>Trending Opportunities</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(2rem,4vw,3rem)', fontWeight:900 }}>Your Day 1 at a new job starts here.</h2>
          <p style={{ fontSize:12, color:'rgba(255,255,255,.35)', marginTop:10 }}>← scroll →</p>
        </div>
        {!loading && (
          <div className="kn-carousel" style={{ padding:'0 48px' }}>
            {(openJobs.length ? openJobs : [
              { title:'Frontend Engineer', department:'Engineering', location:'Remote', job_type:'Full-Time' },
              { title:'Product Designer', department:'Design', location:'Bangalore', job_type:'Full-Time' },
              { title:'Growth Marketer', department:'Marketing', location:'Mumbai', job_type:'Contract' },
            ]).map((job, i) => (
              <div key={job.id || i} className="kn-job" onClick={() => navigate('/careers')}>
                <span style={{ fontSize:10, fontWeight:700, color: JOB_TYPE[job.job_type] || '#FF6B2B' }}>{job.job_type || 'Full-Time'}</span>
                <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:'1.05rem', marginTop:10, marginBottom:6 }}>{job.title}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>{job.department} {job.location ? `· ${job.location}` : ''}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* TESTIMONIALS — carousel */}
      <section style={{ padding:'60px 0' }}>
        <div className="kn-reveal" style={{ textAlign:'center', marginBottom:40, padding:'0 48px' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', color:'#A78BFA', marginBottom:14 }}>Real Stories, Real Freshers</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(2rem,4vw,3rem)', fontWeight:900 }}>What they're saying.</h2>
        </div>
        {!loading && (
          <div className="kn-carousel" style={{ padding:'0 48px' }}>
            {testimonials.map(t => (
              <div key={t.id} className="kn-testi">
                <div style={{ color:'#FFD166', marginBottom:10 }}>{'★'.repeat(t.rating || 5)}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontStyle:'italic', fontSize:14, lineHeight:1.75, marginBottom:18 }}>"{t.quote}"</div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:38, height:38, borderRadius:'50%', background:t.avatar_gradient || 'linear-gradient(135deg,#FF6B2B,#FFD166)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700 }}>{t.author_initials}</div>
                  <div><div style={{ fontSize:13, fontWeight:700 }}>{t.author_name}</div><div style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>{t.author_role}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* COMMUNITY */}
      <section id="community" style={{ padding:'60px 48px', maxWidth:1100, margin:'0 auto' }}>
        <div className="kn-reveal" style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', color:'#A78BFA', marginBottom:14 }}>Community & Gamification</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(2rem,4vw,3rem)', fontWeight:900, maxWidth:560, margin:'0 auto' }}>Climb from Beginner to Legend.</h2>
        </div>
        <div className="kn-2col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:40 }}>
          <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.08)', borderRadius:20, overflow:'hidden' }}>
            {!loading && leaderboard.map((u, i) => (
              <div key={u.id} className="kn-lb-row" onClick={() => navigate(`/profile/${u.username}`)}>
                <div style={{ fontWeight:700, width:22, textAlign:'center' }}>{['🥇','🥈','🥉'][i] || i + 1}</div>
                <div style={{ width:32, height:32, borderRadius:'50%', background:getAvatarColor(u.full_name||u.username||''), display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, overflow:'hidden' }}>
                  {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" /> : getInitials(u.full_name||u.username||'?')}
                </div>
                <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:13, fontWeight:600 }}>{u.full_name || u.username}</div><div style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>{LEVEL_ICONS[u.level] || '🥉'} {u.level}</div></div>
                <div style={{ fontSize:13, fontWeight:700, color:'#FF6B2B' }}>{(u.score||0).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[['🥉','Beginner','0–1K'],['🥈','Explorer','1K–5K'],['🥇','Achiever','5K–20K'],['🏆','Hero','20K–50K'],['🔥','Super Hero','50K–100K'],['👑','Legend','100K+']].map(([icon,name,pts]) => (
              <div key={name} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', borderRadius:12 }}>
                <span style={{ fontSize:17, width:26, textAlign:'center' }}>{icon}</span>
                <span style={{ fontSize:13, fontWeight:600, flex:1 }}>{name}</span>
                <span style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>{pts}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'100px 48px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'10%', left:'10%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,.18) 0%,transparent 70%)' }} />
        <div style={{ position:'absolute', bottom:'10%', right:'10%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,107,43,.16) 0%,transparent 70%)' }} />
        <div style={{ position:'relative', zIndex:2 }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(2rem,5vw,3.6rem)', fontWeight:900, marginBottom:18, lineHeight:1.15 }}>
            {(data?.stats?.total_stories || 10000).toLocaleString()}+ freshers already shared<br/><span style={{ background:'linear-gradient(90deg,#FF6B2B,#FFD166,#8B5CF6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>their Day 1.</span> What's yours?
          </h2>
          <p style={{ color:'rgba(255,255,255,.5)', marginBottom:36 }}>Every expert was once a fresher.</p>
          <Magnetic strength={0.25}>
            <Link to="/register" style={{ display:'inline-block', fontSize:16, fontWeight:700, color:'white', background:'linear-gradient(135deg,#FF6B2B,#8B5CF6)', padding:'18px 42px', borderRadius:100, textDecoration:'none', boxShadow:'0 16px 48px rgba(139,92,246,.45)' }}>Share My Day 1 Story ✍️</Link>
          </Magnetic>
        </div>
      </section>

      {/* BOTTOM SECTION (admin-customizable) */}
      {bottomSection.is_active !== false && (bottomSection.heading || bottomSection.image_urls?.length > 0) && (
        <section style={{ maxWidth:1100, margin:'0 auto', padding:'0 48px 80px', display:'grid', gridTemplateColumns: bottomSection.image_urls?.length ? '1fr 1fr' : '1fr', gap:40, alignItems:'center' }}>
          <div>
            {bottomSection.subheadline && <div style={{ fontSize:11, fontWeight:700, color:'#A78BFA', letterSpacing:'.14em', textTransform:'uppercase', marginBottom:14 }}>{bottomSection.subheadline}</div>}
            {bottomSection.heading && <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.7rem,3vw,2.4rem)', fontWeight:900, marginBottom:16 }}>{bottomSection.heading}</h2>}
            {bottomSection.body_text && <p style={{ fontSize:14, color:'rgba(255,255,255,.5)', lineHeight:1.75, marginBottom:24 }}>{bottomSection.body_text}</p>}
            {bottomSection.cta_text && <Link to={bottomSection.cta_link || '/register'} style={{ fontSize:14, fontWeight:700, color:'white', background:'linear-gradient(135deg,#FF6B2B,#8B5CF6)', padding:'14px 30px', borderRadius:100, textDecoration:'none' }}>{bottomSection.cta_text}</Link>}
          </div>
          {bottomSection.image_urls?.[0] && <img src={bottomSection.image_urls[0]} alt="" style={{ width:'100%', borderRadius:20 }} loading="lazy" />}
        </section>
      )}

      {/* FOOTER */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,.07)', padding:'48px 48px 28px' }}>
        <div className="kn-3col" style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr', gap:32, marginBottom:36 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:900, marginBottom:10 }}>Day1 Diaries</div>
            <div style={{ fontSize:12.5, color:'rgba(255,255,255,.4)', lineHeight:1.7, maxWidth:240 }}>The community where freshers share raw first-day stories and grow together.</div>
          </div>
          {[
            ['Platform',[['Discover','/discover'],['Habits','/habits'],['Leaderboard','/leaderboard']]],
            ['Company',[['About','/about'],['Blog','/blog'],['Careers','/careers']]],
            ['Legal',[['Privacy','/privacy'],['Terms','/terms']]],
          ].map(([title, links]) => (
            <div key={title}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', marginBottom:12 }}>{title}</div>
              {links.map(([label, href]) => (
                <div key={label} style={{ marginBottom:8 }}><Link to={href} className="kn-link">{label}</Link></div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.3)', paddingTop:20, borderTop:'1px solid rgba(255,255,255,.06)' }}>© 2026 Day1 Diaries. Every expert was once a fresher.</div>
      </footer>
    </div>
  )
}
