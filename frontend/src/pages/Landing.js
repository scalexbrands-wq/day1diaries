import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLandingData } from '../lib/api'

/* ── helpers ─────────────────────────────────────────────── */
const COLORS = ['#FF6B2B','#7C3AED','#059669','#2563EB','#EC4899','#0EA5E9','#F59E0B','#DC2626']
const getAvatarColor = n => COLORS[(n||'').charCodeAt(0) % COLORS.length]
const getInitials = n => (n||'?').split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2)

const LEVEL_ICONS = { Beginner:'🥉', Explorer:'🥈', Achiever:'🥇', Hero:'🏆', 'Super Hero':'🔥', Legend:'👑' }

function Spinner() {
  return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:'40px 0' }}>
    <div style={{ width:28, height:28, border:'3px solid rgba(255,107,43,.2)', borderTopColor:'#FF6B2B', borderRadius:'50%', animation:'lp-spin .7s linear infinite' }}/>
  </div>
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

/* ── Main component ──────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()

  /* data */
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [adopted, setAdopted] = useState({})

  /* counters */
  const proofRef = useRef(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [countRun, setCountRun] = useState(false)
  const c1 = useCountUp(data?.stats?.total_users   || 0, '+', countRun)
  const c2 = useCountUp(data?.stats?.total_stories || 0, '+', countRun)
  const c3 = useCountUp(data?.stats?.habit_adoptions || 0, '+', countRun)
  const c4 = useCountUp(98, '%', countRun)

  /* redirect if logged in */
  useEffect(() => { if (user) navigate('/feed') }, [user, navigate])

  /* fetch all landing data via RPC */
/* fetch all landing data via API */
  useEffect(() => {
    getLandingData().then(({ data: d, error }) => {
      if (!error && d) setData(d)
      setLoading(false)
    })
  }, [])

  /* scroll reveal + counter trigger */
  useEffect(() => {
    const revObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1'
          e.target.style.transform = 'translateY(0)'
          revObs.unobserve(e.target)
        }
      })
    }, { threshold: .1 })
    document.querySelectorAll('.lp-reveal').forEach(el => {
      el.style.transition = 'opacity .65s ease, transform .65s ease'
      el.style.opacity = '0'
      el.style.transform = 'translateY(26px)'
      revObs.observe(el)
    })
    const cntObs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setCountRun(true); cntObs.disconnect() }
    }, { threshold: .5 })
    if (proofRef.current) cntObs.observe(proofRef.current)
    return () => { revObs.disconnect(); cntObs.disconnect() }
  }, [data])   // re-run when data arrives so newly rendered elements get observed

  /* ── hero data ── */
  const hero = data?.hero || {}
  const tickerItems = (hero.ticker_items || 'First Day at Job — real stories|Habit Tracking — Day 1 to Day 100|Leaderboard — Beginner to Legend|Coaching Marketplace — book your mentor').split('|')

  /* ── derived data ── */
  const categories   = data?.categories   || []
  const testimonials = data?.testimonials || []
  const habits       = data?.habits       || []
  const leaderboard  = data?.leaderboard  || []
  const featured     = data?.featured_stories || []
  const openJobs     = data?.open_jobs || []

  /* split headline for highlight */
  const headline = hero.headline || 'Your first day at work is a story only you lived.'
  const highlight = hero.headline_highlight || 'only you'
  const parts = headline.split(highlight)

  /* shared inline styles */
  const S = {
    btn: (bg, color, extra={}) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px 28px', borderRadius:100, fontSize:14.5, fontWeight:600, textDecoration:'none', cursor:'pointer', border:'none', fontFamily:"'DM Sans',sans-serif", background:bg, color, transition:'all .25s', ...extra }),
    sec: (bg) => ({ padding:'96px 56px', background:bg }),
    eyebrow: (color='#FF6B2B') => ({ fontSize:11, fontWeight:600, letterSpacing:'.12em', textTransform:'uppercase', color, marginBottom:12, display:'block' }),
    h2: (color='#1A0800') => ({ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.9rem,3.2vw,2.8rem)', fontWeight:900, lineHeight:1.1, color, marginBottom:14 }),
  }

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#FDF6EE', color:'#1A0800', overflowX:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes lp-spin{to{transform:rotate(360deg)}}
        @keyframes blobF{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,-28px) scale(1.06)}}
        @keyframes cardBob{0%,100%{transform:rotate(2.5deg) translateY(0)}50%{transform:rotate(2.5deg) translateY(-13px)}}
        @keyframes badgeBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes heroIn{from{opacity:0;transform:translateY(38px)}to{opacity:1;transform:translateY(0)}}
        .lp-nav-link{font-size:13.5px;font-weight:500;color:#4A2800;text-decoration:none;transition:color .2s}
        .lp-nav-link:hover{color:#FF6B2B}
        .lp-cat-card{background:white;border-radius:16px;padding:22px 18px;text-align:center;cursor:pointer;transition:all .25s;border:1.5px solid transparent}
        .lp-cat-card:hover{border-color:#FF6B2B;transform:translateY(-4px);box-shadow:0 12px 32px rgba(255,107,43,.12)}
        .lp-feat-card{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:28px;transition:all .3s;cursor:default}
        .lp-feat-card:hover{border-color:rgba(255,107,43,.3);transform:translateY(-5px)}
        .lp-habit-row{background:#FDF6EE;border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:13px;cursor:pointer;transition:all .2s}
        .lp-habit-row:hover{background:rgba(255,107,43,.06);transform:translateX(5px)}
        .lp-testi{background:white;border-radius:20px;padding:28px;box-shadow:0 2px 16px rgba(26,8,0,.05);transition:all .3s;cursor:default}
        .lp-testi:hover{transform:translateY(-5px);box-shadow:0 12px 40px rgba(26,8,0,.1)}
        .lp-lb-row{display:flex;align-items:center;gap:11px;padding:11px 18px;border-bottom:1px solid rgba(26,8,0,.05);transition:background .15s;cursor:pointer}
        .lp-lb-row:hover{background:rgba(255,107,43,.04)}
        .lp-story-card{background:white;border:1px solid rgba(26,8,0,.08);border-radius:16px;padding:20px;transition:all .2s;cursor:pointer}
        .lp-story-card:hover{border-color:#FF6B2B;transform:translateY(-3px);box-shadow:0 10px 28px rgba(255,107,43,.1)}
        .lp-plan-card{background:white;border-radius:22px;padding:28px;transition:all .25s}
        .lp-plan-card:hover{transform:translateY(-4px);box-shadow:0 16px 48px rgba(26,8,0,.1)}
        .lp-adopt-btn{background:transparent;border:1.5px solid #FF6B2B;color:#FF6B2B;padding:5px 14px;border-radius:100px;font-size:11px;font-weight:600;cursor:pointer;transition:all .2s;font-family:'DM Sans',sans-serif;flex-shrink:0}
        .lp-adopt-btn:hover{background:#FF6B2B;color:white}
        .lp-adopt-btn.done{background:rgba(22,163,74,.08);border-color:rgba(22,163,74,.3);color:#16A34A}
        @media(max-width:900px){
          .lp-hero-r{display:none!important}
          .lp-2col{grid-template-columns:1fr!important}
          .lp-3col{grid-template-columns:1fr!important}
          .lp-4col{grid-template-columns:1fr 1fr!important}
          .lp-how{grid-template-columns:1fr 1fr!important}
          .lp-footer-g{grid-template-columns:1fr 1fr!important}
          section{padding:60px 20px!important}
          .lp-nav{padding:14px 20px!important}
          .lp-nav-desktop{display:none!important}
          .lp-hamburger{display:flex!important}
        }
        @media(max-width:480px){
          .lp-4col{grid-template-columns:1fr!important}
          .lp-how{grid-template-columns:1fr!important}
          .lp-footer-g{grid-template-columns:1fr!important}
          .lp-hero-btns{flex-direction:column!important;align-items:stretch!important}
          .lp-hero-btns a{justify-content:center!important}
        }
        .lp-hamburger{display:none;background:transparent;border:1.5px solid rgba(26,8,0,.15);border-radius:8px;padding:6px 10px;font-size:18px;cursor:pointer;line-height:1;align-items:center;justify-content:center}
        .lp-mobile-menu{position:absolute;top:100%;left:0;right:0;background:white;border-bottom:1px solid rgba(255,107,43,.1);padding:16px 20px 20px;z-index:300;box-shadow:0 8px 24px rgba(0,0,0,.08)}
        .lp-mobile-menu a,.lp-mobile-menu button{display:block;width:100%;padding:11px 0;font-size:14px;font-weight:500;color:#4A2800;text-decoration:none;border:none;background:transparent;cursor:pointer;font-family:'DM Sans',sans-serif;text-align:left;border-bottom:1px solid #F0EAE4}
        .lp-mobile-menu a:last-child{border-bottom:none}
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="lp-nav" style={{ position:'fixed', top:0, left:0, right:0, zIndex:500, padding:'16px 56px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(253,246,238,.92)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,107,43,.1)', fontFamily:"'DM Sans',sans-serif" }}>
        <Link to="/" style={{ fontFamily:"'Playfair Display',serif", fontSize:21, fontWeight:900, color:'#FF6B2B', textDecoration:'none' }}>
          Day<span style={{color:'#1A0800'}}>1</span> Diaries
        </Link>
        <div className="lp-nav-desktop" style={{ display:'flex', alignItems:'center', gap:24 }}>
          {[['#features','Features'],['#habits','Habits'],['#community','Community']].map(([h,l])=>(
            <a key={h} href={h} className="lp-nav-link">{l}</a>
          ))}
          <Link to="/login" className="lp-nav-link">Sign In</Link>
          <Link to="/register" style={S.btn('#FF6B2B','white',{ padding:'9px 22px', fontSize:13.5, boxShadow:'0 4px 14px rgba(255,107,43,.35)' })}
            onMouseEnter={e=>{e.currentTarget.style.background='#FF4500';e.currentTarget.style.transform='translateY(-1px)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='#FF6B2B';e.currentTarget.style.transform='none'}}>
            Get Started Free
          </Link>
        </div>
        {/* Hamburger */}
        <button className="lp-hamburger" onClick={()=>setMobileMenuOpen(o=>!o)}>{mobileMenuOpen?'✕':'☰'}</button>
        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="lp-mobile-menu">
            <a href="#features" onClick={()=>setMobileMenuOpen(false)}>Features</a>
            <a href="#habits" onClick={()=>setMobileMenuOpen(false)}>Habits</a>
            <a href="#community" onClick={()=>setMobileMenuOpen(false)}>Community</a>
            <Link to="/login" onClick={()=>setMobileMenuOpen(false)}>Sign In</Link>
            <Link to="/register" onClick={()=>setMobileMenuOpen(false)} style={{ color:'#FF6B2B !important', fontWeight:'600 !important' }}>Get Started Free →</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight:'100vh', display:'grid', gridTemplateColumns:'1fr 1fr', alignItems:'center', gap:60, padding:'120px 56px 80px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-80, right:-120, width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,107,43,.12) 0%,transparent 65%)', animation:'blobF 9s ease-in-out infinite', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-60, left:80, width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,209,102,.15) 0%,transparent 65%)', animation:'blobF 12s ease-in-out infinite reverse', pointerEvents:'none' }}/>

        {/* Left */}
        <div style={{ position:'relative', zIndex:2, animation:'heroIn .9s cubic-bezier(.22,1,.36,1) both' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,107,43,.1)', border:'1px solid rgba(255,107,43,.3)', borderRadius:100, padding:'5px 16px', fontSize:11, fontWeight:600, color:'#FF6B2B', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:24 }}>
            ✦ {hero.eyebrow || 'For Every Fresher, Everywhere'}
          </div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:'clamp(2.4rem,4vw,3.8rem)', lineHeight:1.05, marginBottom:20, letterSpacing:'-.5px' }}>
            {parts[0]}<em style={{color:'#FF6B2B', fontStyle:'italic'}}>{highlight}</em>{parts[1]}
          </h1>
          <p style={{ fontSize:'1.05rem', color:'#4A2800', lineHeight:1.75, fontWeight:300, maxWidth:460, marginBottom:36 }}>
            {hero.subheadline || 'Now the world can read it. The community where freshers share raw stories, adopt life-changing habits, and grow together.'}
          </p>
          <div className="lp-hero-btns" style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:46 }}>
            <Link to="/register" style={S.btn('#FF6B2B','white',{ padding:'14px 32px', fontSize:15, boxShadow:'0 6px 24px rgba(255,107,43,.35)' })}
              onMouseEnter={e=>{e.currentTarget.style.background='#FF4500';e.currentTarget.style.transform='translateY(-2px)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='#FF6B2B';e.currentTarget.style.transform='none'}}>
              {hero.cta_primary_text || 'Share My Day 1 ✍️'}
            </Link>
            <a href="#features" style={S.btn('transparent','#1A0800',{ padding:'14px 32px', fontSize:15, border:'1.5px solid rgba(26,8,0,.15)' })}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#FF6B2B';e.currentTarget.style.color='#FF6B2B'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(26,8,0,.15)';e.currentTarget.style.color='#1A0800'}}>
              {hero.cta_secondary_text || 'See How It Works →'}
            </a>
          </div>
          {/* Proof stats */}
          <div ref={proofRef} style={{ display:'flex', gap:28, flexWrap:'wrap', paddingTop:28, borderTop:'1px solid rgba(26,8,0,.08)' }}>
            {[[c1,'Total Users'],[c2,'Stories Shared'],[c3,'Habit Adoptions'],[c4,'Feel Less Alone']].map(([v,l])=>(
              <div key={l}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.9rem', fontWeight:900, color:'#FF6B2B' }}>{v}</div>
                <div style={{ fontSize:11, color:'#8C7B6E', marginTop:1 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right – diary card */}
        <div className="lp-hero-r" style={{ position:'relative', zIndex:2, display:'flex', justifyContent:'center', animation:'heroIn .9s .2s cubic-bezier(.22,1,.36,1) both' }}>
          <div style={{ position:'relative', display:'inline-block' }}>
            <div style={{ background:'white', borderRadius:24, padding:28, width:360, boxShadow:'0 32px 80px rgba(26,8,0,.12)', position:'relative', animation:'cardBob 7s ease-in-out infinite', transform:'rotate(2.5deg)' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:5, borderRadius:'24px 24px 0 0', background:'linear-gradient(90deg,#FF6B2B,#FFD166)' }}/>
              <div style={{ fontSize:11, color:'#8C7B6E', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>📅 {hero.diary_date || 'Day 1'}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.2rem', fontWeight:700, lineHeight:1.3, marginBottom:10 }}>{hero.diary_title || '"My Day 1 story..."'}</div>
              <div style={{ fontSize:13, color:'#4A2800', lineHeight:1.65, marginBottom:16 }}>{hero.diary_content || 'Something unforgettable happened...'}</div>
              <div style={{ height:1, background:'rgba(26,8,0,.06)', margin:'12px 0' }}/>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B2B,#FFD166)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'white', flexShrink:0 }}>
                  {getInitials(hero.diary_author_name)}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{hero.diary_author_name || 'Priya Rao'}</div>
                  <div style={{ fontSize:11, color:'#8C7B6E' }}>{hero.diary_author_role || 'Software Engineer'}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:14, paddingTop:14, borderTop:'1px solid rgba(26,8,0,.06)' }}>
                {[`❤️ ${hero.diary_likes||'3.1K'}`, `💬 ${hero.diary_comments||'284'}`, '🔗 Share'].map(r=>(
                  <span key={r} style={{ background:'rgba(255,107,43,.08)', borderRadius:100, padding:'4px 12px', fontSize:12, color:'#FF6B2B', fontWeight:500 }}>{r}</span>
                ))}
              </div>
            </div>
            {hero.badge_1_text && <div style={{ position:'absolute', top:-12, right:-16, background:'white', borderRadius:100, padding:'9px 16px', fontSize:12, fontWeight:600, boxShadow:'0 8px 24px rgba(26,8,0,.1)', animation:'badgeBob 5s ease-in-out infinite', whiteSpace:'nowrap' }}>{hero.badge_1_text}</div>}
            {hero.badge_2_text && <div style={{ position:'absolute', bottom:50, left:-24, background:'white', borderRadius:100, padding:'9px 16px', fontSize:12, fontWeight:600, boxShadow:'0 8px 24px rgba(26,8,0,.1)', animation:'badgeBob 7s ease-in-out infinite .5s', whiteSpace:'nowrap' }}>{hero.badge_2_text}</div>}
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div style={{ background:'#1A0800', padding:'13px 0', overflow:'hidden', whiteSpace:'nowrap' }}>
        <div style={{ display:'inline-block', animation:'ticker 32s linear infinite' }}>
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:10, fontSize:13, fontWeight:500, color:'rgba(255,255,255,.65)', marginRight:32 }}>
              ✦ <span style={{ color:'#FFD166' }}>{item.split('—')[0]?.trim()}</span>{item.includes('—') ? ' — '+item.split('—')[1]?.trim() : ''}
              {i < tickerItems.length * 2 - 1 && <span style={{ color:'#FF6B2B', marginLeft:32 }}>◆</span>}
            </span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section id="features" style={S.sec('white')}>
        <div style={{ textAlign:'center' }}>
          <span className="lp-reveal" style={S.eyebrow()}>How It Works</span>
          <h2 className="lp-reveal" style={{ ...S.h2(), marginBottom:52, maxWidth:500, margin:'0 auto 52px' }}>Four steps. One unforgettable story.</h2>
        </div>
        <div className="lp-how" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0, position:'relative', maxWidth:900, margin:'0 auto' }}>
          <div style={{ position:'absolute', top:28, left:'12.5%', right:'12.5%', height:2, background:'repeating-linear-gradient(90deg,#FF6B2B 0,#FF6B2B 8px,transparent 8px,transparent 18px)', opacity:.2 }}/>
          {[['1','Sign Up Free','Profile in 60 seconds. Google login. No CV required.'],
            ['2','Write Your Day 1','Guided prompts. Raw, honest, entirely yours.'],
            ['3','Share & Connect','Post, follow creators, get comments from people who get it.'],
            ['4','Adopt & Grow','Pick a habit, log daily, earn badges, climb the leaderboard.']].map(([n,t,d],i)=>(
            <div key={n} className="lp-reveal" style={{ textAlign:'center', padding:'0 18px', transitionDelay:`${i*.09}s` }}>
              <div style={{ width:56, height:56, borderRadius:'50%', margin:'0 auto 18px', background:'white', border:'1.5px solid rgba(255,107,43,.25)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Playfair Display',serif", fontSize:'1.3rem', fontWeight:900, color:'#FF6B2B', position:'relative', zIndex:2, boxShadow:'0 4px 16px rgba(255,107,43,.1)', transition:'all .3s', cursor:'default' }}
                onMouseEnter={e=>{e.currentTarget.style.background='#FF6B2B';e.currentTarget.style.color='white';e.currentTarget.style.transform='scale(1.1)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='white';e.currentTarget.style.color='#FF6B2B';e.currentTarget.style.transform='scale(1)'}}>
                {n}
              </div>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>{t}</div>
              <div style={{ fontSize:13, color:'#8C7B6E', lineHeight:1.6 }}>{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={S.sec('#1A0800')}>
        <div>
          <span className="lp-reveal" style={S.eyebrow('#FFD166')}>Platform Features</span>
          <h2 className="lp-reveal" style={{ ...S.h2('white') }}>Everything a fresher needs to<br/>thrive, documented.</h2>
          <p className="lp-reveal" style={{ fontSize:'1rem', color:'rgba(255,255,255,.45)', lineHeight:1.75, fontWeight:300, maxWidth:520, marginBottom:0 }}>Built for the brave, the nervous, and the completely lost.</p>
        </div>
        <div className="lp-3col" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18, marginTop:52 }}>
          {[['📝','Story Sharing','Share text, images, and videos. Tag by category. Like, comment, save, and share.'],
            ['🤝','Social Network','Follow creators, see your personalised feed, discover trending stories in your industry.'],
            ['🔥','Habit Tracking','Adopt habits from a curated library. Log daily, build streaks. Day 1 to Day 100.'],
            ['🏆','Gamification','Earn badges. Climb 6 levels. Get recognised on the community leaderboard.'],
            ['📊','Analytics','Premium analytics on story performance, habit completion, and engagement trends.'],
            ['🎓','Coaching','Book 1:1 sessions with habit coaches, career mentors, and startup advisors.']].map(([icon,title,text],i)=>(
            <div key={title} className="lp-feat-card lp-reveal" style={{ transitionDelay:`${(i%3)*.1}s` }}>
              <div style={{ width:48, height:48, borderRadius:13, background:'linear-gradient(135deg,#FF6B2B,#FFD166)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:21, marginBottom:18 }}>{icon}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.15rem', fontWeight:700, color:'white', marginBottom:8 }}>{title}</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.4)', lineHeight:1.7 }}>{text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── STORY CATEGORIES (dynamic) ── */}
      <section style={S.sec('#FFF1E4')}>
        <div style={{ textAlign:'center' }}>
          <span className="lp-reveal" style={S.eyebrow()}>Story Categories</span>
          <h2 className="lp-reveal" style={{ ...S.h2(), marginBottom:40 }}>Every kind of first.</h2>
        </div>
        {loading ? <Spinner/> : (
          <div className="lp-4col" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            {categories.map((c, i) => (
              <div key={c.id} className="lp-cat-card lp-reveal" onClick={() => navigate(`/discover?cat=${encodeURIComponent(c.name)}`)}
                style={{ transitionDelay:`${(i%4)*.08}s`, background: c.is_cta ? 'rgba(255,107,43,.05)' : 'white', borderColor: c.is_cta ? 'rgba(255,107,43,.3)' : 'transparent' }}>
                <div style={{ fontSize:26, marginBottom:9 }}>{c.icon}</div>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>{c.name}</div>
                <div style={{ fontSize:11, color: c.is_cta ? '#FF6B2B' : '#8C7B6E', fontWeight: c.is_cta ? 600 : 400 }}>
                  {c.is_cta ? 'Share yours today →' : `${(c.story_count||0).toLocaleString()} stories`}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── FEATURED STORIES (dynamic, admin-selected) ── */}
      {false && (featured.length > 0 || loading) && (
        <section style={S.sec('white')}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:36 }}>
            <div>
              <span className="lp-reveal" style={S.eyebrow()}>Featured Stories</span>
              <h2 className="lp-reveal" style={{ ...S.h2(), marginBottom:0 }}>Stories worth reading today.</h2>
            </div>
            <Link to="/discover" className="lp-reveal" style={S.btn('#FF6B2B','white',{ padding:'10px 22px', fontSize:13 })}>Browse All Stories →</Link>
          </div>
          {loading ? <Spinner/> : (
            <div className="lp-3col" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
              {featured.map((s, i) => (
                <div key={s.id} className="lp-story-card lp-reveal" onClick={() => navigate(`/story/${s.id}`)} style={{ transitionDelay:`${i*.1}s` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background: getAvatarColor(s.profiles?.full_name||''), display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white', flexShrink:0 }}>
                      {s.profiles?.avatar_url ? <img src={s.profiles.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }}/> : getInitials(s.profiles?.full_name||s.profiles?.username||'?')}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:600 }}>{s.profiles?.full_name || s.profiles?.username}</div>
                    </div>
                    <span style={{ fontSize:10, padding:'2px 9px', borderRadius:100, background:'rgba(255,107,43,.1)', color:'#FF6B2B', fontWeight:600 }}>{s.category}</span>
                  </div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.05rem', fontWeight:700, lineHeight:1.3, marginBottom:8, color:'#1A0800' }}>{s.title}</div>
                  <p style={{ fontSize:12, color:'#4A2800', lineHeight:1.6, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom:12 }}>{s.content}</p>
                  <div style={{ display:'flex', gap:12, fontSize:11, color:'#8C7B6E' }}>
                    <span>❤️ {(s.likes_count||0).toLocaleString()}</span>
                    <span>💬 {(s.comments_count||0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── HABITS (dynamic) ── */}
      <section id="habits" style={S.sec('#F5EDE4')}>
        <div>
          <span className="lp-reveal" style={S.eyebrow()}>Habit Change Module</span>
          <h2 className="lp-reveal" style={{ ...S.h2(), marginBottom:12 }}>The feature that makes<br/>Day1 Diaries different.</h2>
          <p className="lp-reveal" style={{ fontSize:'1rem', color:'#4A2800', lineHeight:1.75, fontWeight:300, maxWidth:480 }}>Choose a habit, adopt it, log every single day. Watch thousands do it with you.</p>
        </div>
        <div className="lp-2col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:56, alignItems:'center', marginTop:48 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {loading ? <Spinner/> : habits.map((h,i) => (
              <div key={h.id} className="lp-habit-row lp-reveal" style={{ transitionDelay:`${i*.07}s` }}>
                <div style={{ fontSize:22, width:40, textAlign:'center', flexShrink:0 }}>{h.icon||'✨'}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:2 }}>{h.title}</div>
                  <div style={{ fontSize:11, color:'#8C7B6E' }}>{(h.adopters_count||0).toLocaleString()} adopters · {h.completion_rate||0}% completion</div>
                  <div style={{ height:3, background:'rgba(26,8,0,.07)', borderRadius:2, marginTop:5 }}>
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
          {/* Streak showcase — uses first habit */}
          <div className="lp-reveal" style={{ background:'#1A0800', borderRadius:24, padding:30, position:'relative', overflow:'hidden' }}>
            {habits[0] && <>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.15rem', fontWeight:700, color:'white', marginBottom:5 }}>{habits[0].icon} {habits[0].title}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:18 }}>{(habits[0].adopters_count||0).toLocaleString()} adopters · 🔥 28-day streak</div>
            </>}
            <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginBottom:14 }}>
              {Array.from({length:100},(_,i)=>i+1).map(d=>(
                <div key={d} style={{ width:10, height:10, borderRadius:2, background: d<28?'#FF6B2B':d===28?'#FFD166':'rgba(255,255,255,.08)', boxShadow:d===28?'0 0 6px #FFD166':'none' }}/>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              {[['28','Days Done'],['72','Days Left'],['280','Pages Read']].map(([v,l])=>(
                <div key={l} style={{ flex:1, background:'rgba(255,255,255,.05)', borderRadius:10, padding:12, textAlign:'center' }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.5rem', fontWeight:900, color:'#FF6B2B' }}>{v}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ background:'rgba(255,255,255,.05)', borderRadius:10, padding:'10px 13px', fontSize:12, color:'rgba(255,255,255,.45)', lineHeight:1.6, marginBottom:12 }}>
              <span style={{color:'#FFD166'}}>Day 28:</span> "Finished chapter 8 of Atomic Habits. Habit stacking changed how I plan my mornings completely."
            </div>
            <button onClick={()=>navigate('/register')} style={{ width:'100%', padding:10, background:'#FF6B2B', color:'white', border:'none', borderRadius:100, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              Start Your Habit Journey →
            </button>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS (dynamic) ── */}
      <section style={S.sec('#FDF6EE')}>
        <div style={{ textAlign:'center' }}>
          <span className="lp-reveal" style={S.eyebrow()}>Real Stories, Real Freshers</span>
          <h2 className="lp-reveal" style={{ ...S.h2(), marginBottom:48 }}>What they're saying</h2>
        </div>
        {loading ? <Spinner/> : (
          <div className="lp-3col" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
            {testimonials.map((t,i)=>(
              <div key={t.id} className="lp-testi lp-reveal" style={{ transitionDelay:`${i*.1}s` }}>
                <div style={{ color:'#FFD166', fontSize:13, marginBottom:10 }}>{'★'.repeat(t.rating||5)}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'3.5rem', color:'#FF6B2B', opacity:.15, lineHeight:.8, display:'block', marginBottom:-6 }}>"</div>
                <div style={{ fontSize:14, lineHeight:1.75, color:'#4A2800', fontStyle:'italic', marginBottom:20, fontFamily:"'Playfair Display',serif" }}>{t.quote}</div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:t.avatar_gradient||'linear-gradient(135deg,#FF6B2B,#FFD166)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'white', flexShrink:0 }}>{t.author_initials}</div>
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

      {/* ── COMMUNITY / LEADERBOARD (dynamic) ── */}
      <section id="community" style={S.sec('white')}>
        <div>
          <span className="lp-reveal" style={S.eyebrow()}>Community & Gamification</span>
          <h2 className="lp-reveal" style={{ ...S.h2(), marginBottom:12 }}>Climb from Beginner to Legend.<br/>Get recognised.</h2>
          <p className="lp-reveal" style={{ fontSize:'1rem', color:'#4A2800', lineHeight:1.75, fontWeight:300, maxWidth:480 }}>Every story you share, every habit you log, every person you inspire — it builds your score and your level.</p>
        </div>
        <div className="lp-2col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:56, marginTop:48, alignItems:'start' }}>
          <div className="lp-reveal">
            <div style={{ background:'#F5EDE4', borderRadius:20, overflow:'hidden' }}>
              <div style={{ background:'#1A0800', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'white' }}>🏆 Community Leaderboard</div>
                <span style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>Top creators</span>
              </div>
              {loading ? <Spinner/> : leaderboard.map((u,i)=>(
                <div key={u.id} className="lp-lb-row" onClick={()=>navigate(`/profile/${u.username}`)}>
                  <div style={{ fontWeight:700, fontSize:15, width:22, textAlign:'center', flexShrink:0 }}>{['🥇','🥈','🥉','4','5'][i]||i+1}</div>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:getAvatarColor(u.full_name||u.username||''), display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white', flexShrink:0 }}>
                    {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }}/> : getInitials(u.full_name||u.username||'?')}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{u.full_name||u.username}</div>
                    <div style={{ fontSize:11, color:'#8C7B6E' }}>{LEVEL_ICONS[u.level]||'🥉'} {u.level} · {u.stories_count||0} stories</div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#FF6B2B' }}>{(u.score||0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Level System</div>
            {[['🥉','Beginner','0 – 1,000 pts',100],['🥈','Explorer','1K – 5K pts',82],['🥇','Achiever','5K – 20K pts',64],['🏆','Hero','20K – 50K pts',48],['🔥','Super Hero','50K – 100K pts',32],['👑','Legend','100K+ pts',18]].map(([icon,name,pts,pct],i)=>(
              <div key={name} className="lp-reveal" style={{ display:'flex', alignItems:'center', gap:11, padding:'13px 16px', background:'#F5EDE4', borderRadius:11, marginBottom:9, transition:'all .2s', transitionDelay:`${i*.06}s`, cursor:'default' }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,107,43,.06)';e.currentTarget.style.transform='translateX(4px)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='#F5EDE4';e.currentTarget.style.transform='none'}}>
                <div style={{ fontSize:20, width:30, textAlign:'center' }}>{icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{name}</div>
                  <div style={{ fontSize:11, color:'#8C7B6E' }}>{pts}</div>
                  <div style={{ height:3, background:'rgba(26,8,0,.08)', borderRadius:2, marginTop:4 }}>
                    <div style={{ height:3, width:`${pct}%`, background:'linear-gradient(90deg,#FF6B2B,#FFD166)', borderRadius:2 }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      

      {/* ── CTA BANNER ── */}
      <section style={{ background:'linear-gradient(135deg,#FF6B2B 0%,#FF4500 60%,#CC3300 100%)', padding:'96px 56px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'-50%', left:'-10%', width:500, height:500, borderRadius:'50%', background:'rgba(255,255,255,.07)' }}/>
        <div style={{ position:'absolute', bottom:'-60%', right:'-5%', width:600, height:600, borderRadius:'50%', background:'rgba(255,255,255,.05)' }}/>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(2rem,4vw,3.2rem)', fontWeight:900, color:'white', lineHeight:1.15, marginBottom:14, position:'relative', zIndex:2 }}>
          {(data?.stats?.total_stories||10000).toLocaleString()} freshers already shared their Day 1.<br/>What's yours?
        </h2>
        <p style={{ color:'rgba(255,255,255,.8)', fontSize:'1.05rem', marginBottom:34, position:'relative', zIndex:2 }}>Every expert was once a fresher. Your story matters more than you think.</p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', position:'relative', zIndex:2 }}>
          <Link to="/register" style={S.btn('white','#FF6B2B',{ padding:'16px 36px', fontSize:16, fontWeight:700, boxShadow:'0 8px 28px rgba(0,0,0,.14)' })}>Share My Day 1 Story →</Link>
          <Link to="/login" style={S.btn('rgba(255,255,255,.15)','white',{ padding:'16px 36px', fontSize:16, border:'1.5px solid rgba(255,255,255,.4)' })}>Sign In</Link>
        </div>
        <div style={{ display:'flex', gap:40, justifyContent:'center', marginTop:48, paddingTop:40, borderTop:'1px solid rgba(255,255,255,.2)', flexWrap:'wrap', position:'relative', zIndex:2 }}>
          {[
            [(data?.stats?.total_users||0).toLocaleString()+'+', 'Total Users'],
            [(data?.stats?.total_stories||0).toLocaleString()+'+', 'Stories Shared'],
            [(data?.stats?.habit_adoptions||0).toLocaleString()+'+', 'Habit Adoptions'],
            ['98%', 'Feel Less Alone'],
          ].map(([v,l])=>(
            <div key={l} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'2.2rem', fontWeight:900, color:'#FFD166' }}>{v}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background:'#1A0800', padding:'56px 56px 36px' }}>
        <div className="lp-footer-g" style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr', gap:36, marginBottom:44 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:21, fontWeight:900, color:'#FF6B2B', marginBottom:10 }}>Day1 Diaries</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.38)', lineHeight:1.7, maxWidth:240 }}>The community where freshers share raw first-day stories, adopt life-changing habits, and grow together.</div>
          </div>
          {[['Platform',[['Discover Stories','/discover'],['Habit Library','/habits'],['Leaderboard','/leaderboard'],['Share a Story','/write']]],
            ['Company',[['About Us','#'],['Blog','#'],['Careers','#'],['Contact','#']]],
            ['Legal',[['Privacy Policy','#'],['Terms of Service','#'],['Community Guidelines','#']]]].map(([title,links])=>(
            <div key={title}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.35)', marginBottom:13 }}>{title}</div>
              <ul style={{ listStyle:'none' }}>
                {links.map(([label,href])=>(
                  <li key={label} style={{ marginBottom:8 }}>
                    <Link to={href} style={{ fontSize:13, color:'rgba(255,255,255,.5)', textDecoration:'none', transition:'color .2s' }}
                      onMouseEnter={e=>e.target.style.color='#FF6B2B'} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,.5)'}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:24, borderTop:'1px solid rgba(255,255,255,.07)', flexWrap:'wrap', gap:10 }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.28)' }}>© 2026 Day1 Diaries. All rights reserved. Made with ❤️ for every fresher.</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:13, color:'rgba(255,255,255,.35)', fontStyle:'italic' }}>Every Expert Was Once a Fresher. ✦</div>
        </div>
      </footer>
    </div>
  )
}
