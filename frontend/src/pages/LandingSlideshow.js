import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import useLandingData, { useCountUp, LEVEL_ICONS, getAvatarColor, getInitials } from '../hooks/useLandingData'
import Seo from '../components/Seo'

/* A presentation-deck landing page — each section is a full-viewport
   "slide" snapped via CSS scroll-snap, with dot navigation, arrow-key
   control, and a slide counter. Same data/content as the other
   templates, packaged as a deck instead of a long scroll. */
export default function LandingSlideshow() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, loading, seo } = useLandingData()
  const [adopted, setAdopted] = useState({})
  const [active, setActive] = useState(0)
  const containerRef = useRef(null)
  const slideRefs = useRef([])

  useEffect(() => { if (user) navigate('/feed') }, [user, navigate])

  const hero = data?.hero || {}
  const categories = data?.categories || []
  const testimonials = data?.testimonials || []
  const habits = data?.habits || []
  const leaderboard = data?.leaderboard || []
  const openJobs = data?.open_jobs || []
  const headline = hero.headline || 'Your first day at work is a story only you lived.'
  const highlight = hero.headline_highlight || 'only you'
  const parts = headline.split(highlight)

  const c1 = useCountUp(data?.stats?.total_users || 0, '+', !loading)
  const c2 = useCountUp(data?.stats?.total_stories || 0, '+', !loading)
  const c3 = useCountUp(data?.stats?.habit_adoptions || 0, '+', !loading)

  const SLIDES = [
    'hero', 'why', 'how', 'features', 'points', 'categories', 'habits', 'jobs', 'testimonials', 'community', 'cta',
  ]

  const goTo = i => {
    const idx = Math.max(0, Math.min(SLIDES.length - 1, i))
    slideRefs.current[idx]?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goTo(active + 1) }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goTo(active - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active]) // eslint-disable-line

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActive(Number(e.target.dataset.idx)) })
    }, { threshold: 0.55 })
    slideRefs.current.forEach(el => el && obs.observe(el))
    return () => obs.disconnect()
  }, [data])

  const Eyebrow = ({ children, color = '#FF6B2B' }) => <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', color, marginBottom:14 }}>{children}</div>
  const slideStyle = (extra = {}) => ({ height:'100vh', minHeight:560, scrollSnapAlign:'start', display:'flex', flexDirection:'column', justifyContent:'center', padding:'80px 56px', position:'relative', overflow:'hidden', ...extra })
  const setRef = i => el => { slideRefs.current[i] = el }

  return (
    <div ref={containerRef} style={{ fontFamily:"'DM Sans',sans-serif", color:'#1A0800', height:'100vh', overflowY:'scroll', scrollSnapType:'y mandatory', scrollBehavior:'smooth' }}>
      {seo && <Seo title={seo.title} description={seo.description} image={seo.image} path="/" />}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        .ss-dots{position:fixed;right:24px;top:50%;transform:translateY(-50%);z-index:400;display:flex;flex-direction:column;gap:10px}
        .ss-dot{width:8px;height:8px;border-radius:50%;background:rgba(26,8,0,.18);cursor:pointer;transition:all .25s;border:none;padding:0}
        .ss-dot.active{background:#FF6B2B;height:22px;border-radius:5px}
        .ss-dot.on-dark{background:rgba(255,255,255,.3)}
        .ss-nav-arrows{position:fixed;bottom:28px;right:24px;z-index:400;display:flex;flex-direction:column;gap:8px}
        .ss-arrow-btn{width:38px;height:38px;border-radius:50%;background:white;border:1px solid rgba(26,8,0,.1);box-shadow:0 4px 14px rgba(26,8,0,.08);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;color:#1A0800;transition:all .2s}
        .ss-arrow-btn:hover{border-color:#FF6B2B;color:#FF6B2B}
        .ss-counter{position:fixed;bottom:28px;left:32px;z-index:400;font-size:12px;font-weight:600;color:#8C7B6E;letter-spacing:.05em}
        .ss-logo{position:fixed;top:24px;left:32px;z-index:400;font-family:'Playfair Display',serif;font-size:17px;font-weight:900;text-decoration:none;color:#1A0800}
        .ss-skip{position:fixed;top:26px;right:24px;z-index:400;font-size:12px;font-weight:600;color:#8C7B6E;text-decoration:none}
        .ss-cat{background:white;border:1px solid rgba(26,8,0,.07);border-radius:16px;padding:16px;text-align:center;cursor:pointer;transition:transform .2s}
        .ss-cat:hover{transform:translateY(-4px);border-color:#FF6B2B}
        .ss-job{background:white;border:1px solid rgba(26,8,0,.07);border-radius:16px;padding:18px;cursor:pointer}
        .ss-testi{background:white;border:1px solid rgba(26,8,0,.07);border-radius:16px;padding:20px}
        .ss-adopt{background:transparent;border:1.5px solid #FF6B2B;color:#FF6B2B;padding:4px 12px;border-radius:100px;font-size:10.5px;font-weight:600;cursor:pointer}
        .ss-adopt.done{background:rgba(22,163,74,.1);border-color:#16A34A;color:#16A34A}
        @media(max-width:760px){
          .ss-dots{display:none}
          .ss-grid{grid-template-columns:1fr 1fr!important}
          .ss-grid3{grid-template-columns:1fr!important}
          .ss-2col{grid-template-columns:1fr!important;gap:20px!important}
          section{padding:70px 24px!important}
        }
      `}</style>

      {/* PERSISTENT CHROME */}
      <Link to="/" className="ss-logo">Day1 <span style={{ color:'#FF6B2B' }}>Diaries</span></Link>
      <Link to="/login" className="ss-skip">Sign In →</Link>
      <div className="ss-dots">
        {SLIDES.map((s, i) => (
          <button key={s} className={`ss-dot ${active === i ? 'active' : ''} ${['why','features','jobs','cta'].includes(s) ? 'on-dark' : ''}`} onClick={() => goTo(i)} aria-label={`Go to slide ${i + 1}`} />
        ))}
      </div>
      <div className="ss-nav-arrows">
        <button className="ss-arrow-btn" onClick={() => goTo(active - 1)} aria-label="Previous slide">↑</button>
        <button className="ss-arrow-btn" onClick={() => goTo(active + 1)} aria-label="Next slide">↓</button>
      </div>
      <div className="ss-counter">{String(active + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}</div>

      {/* SLIDE 1 — HERO */}
      <section ref={setRef(0)} data-idx={0} style={slideStyle({ background:'#FDF6EE' })}>
        <div style={{ position:'absolute', top:-100, right:-100, width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 65%)' }} />
        <div style={{ position:'absolute', bottom:-100, left:-60, width:420, height:420, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,107,43,.16) 0%,transparent 65%)' }} />
        <div style={{ position:'relative', zIndex:2, maxWidth:760, margin:'0 auto', textAlign:'center' }}>
          <Eyebrow>{hero.eyebrow || 'For Every Fresher, Everywhere'}</Eyebrow>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontWeight:900, fontSize:'clamp(2.2rem,5.5vw,4.4rem)', lineHeight:1.08, marginBottom:22 }}>
            {parts[0]}<em style={{ color:'#FF6B2B', fontStyle:'italic' }}>{highlight}</em>{parts[1]}
          </h1>
          <p style={{ fontSize:'1.05rem', color:'#4A2800', lineHeight:1.7, maxWidth:480, margin:'0 auto 32px', fontWeight:300 }}>{hero.subheadline || 'Now the world can read it. Share raw stories, adopt life-changing habits, and grow together.'}</p>
          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', marginBottom:40 }}>
            <Link to="/register" style={{ fontSize:14.5, fontWeight:700, color:'white', background:'#FF6B2B', padding:'15px 32px', borderRadius:100, textDecoration:'none', boxShadow:'0 10px 30px rgba(255,107,43,.35)' }}>{hero.cta_primary_text || 'Share My Day 1 ✍️'}</Link>
            <button onClick={() => goTo(1)} style={{ fontSize:14.5, fontWeight:700, color:'#1A0800', background:'white', border:'1.5px solid rgba(26,8,0,.15)', padding:'15px 32px', borderRadius:100, cursor:'pointer' }}>{hero.cta_secondary_text || 'See How It Works ↓'}</button>
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:40, flexWrap:'wrap' }}>
            {[[c1,'Total Users'],[c2,'Stories Shared'],[c3,'Habit Adoptions']].map(([v,l]) => (
              <div key={l}><div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.7rem', fontWeight:900, color:'#FF6B2B' }}>{v}</div><div style={{ fontSize:11, color:'#8C7B6E' }}>{l}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* SLIDE 2 — AI-POWERED (same neon-on-navy treatment the Classic
          template already uses for this exact content, just packaged
          as one slide) */}
      <section ref={setRef(1)} data-idx={1} style={slideStyle({ background:'linear-gradient(135deg,#080B1A 0%,#100A2E 45%,#0A1628 100%)', color:'white', overflowY:'auto' })}>
        <div style={{ position:'absolute', top:-120, left:-100, width:420, height:420, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,.18) 0%,transparent 65%)' }} />
        <div style={{ position:'absolute', bottom:-100, right:-80, width:380, height:380, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,107,43,.15) 0%,transparent 65%)' }} />
        <div style={{ position:'relative', zIndex:2, textAlign:'center', marginBottom:32 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(139,92,246,.12)', border:'1px solid rgba(139,92,246,.32)', borderRadius:100, padding:'7px 18px', marginBottom:18 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#A78BFA' }} />
            <span style={{ fontSize:10.5, fontWeight:700, letterSpacing:'.14em', color:'#A78BFA', textTransform:'uppercase' }}>✨ AI-Powered Community Platform</span>
          </div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.8rem,3.6vw,2.8rem)', fontWeight:900, marginBottom:10, background:'linear-gradient(120deg,#FF6B2B,#8B5CF6,#06B6D4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Smarter. Safer. Unstoppable.</h2>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.45)', maxWidth:460, margin:'0 auto' }}>Our AI works around the clock — detecting harm, guiding goals, and helping freshers navigate their Day 1.</p>
        </div>
        <div style={{ position:'relative', zIndex:2 }}>
          <div className="ss-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, maxWidth:980, margin:'0 auto 24px' }}>
            {[
              ['🛡️','AI Content Guard','Auto-detects harmful content before it reaches anyone.','#F43F5E','rgba(244,63,94,.08)'],
              ['🎯','Avoid Day-1 Mistakes','Learn from thousands of real first-day stories.','#F59E0B','rgba(245,158,11,.08)'],
              ['🔥','Achieve Your Goals','AI nudges you back when you slip on a habit streak.','#A78BFA','rgba(139,92,246,.08)'],
              ['💰','Free Forever','Every feature, every habit, every story — zero cost.','#34D399','rgba(16,185,129,.08)'],
            ].map(([icon,title,text,color,bg]) => (
              <div key={title} style={{ background:bg, border:`1px solid ${color}30`, borderRadius:18, padding:18 }}>
                <div style={{ fontSize:24, marginBottom:10 }}>{icon}</div>
                <div style={{ fontSize:12.5, fontWeight:700, color, marginBottom:6 }}>{title}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', lineHeight:1.6 }}>{text}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
            {['🤖 AI Moderation','🔥 100+ Daily Joiners','✅ Zero Toxic Content','🎯 Smart Goal Tracking','🏆 Gamified Growth'].map(chip => (
              <span key={chip} style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:100, padding:'6px 14px', fontSize:11, fontWeight:500, color:'rgba(255,255,255,.65)' }}>{chip}</span>
            ))}
          </div>
        </div>
      </section>

      {/* SLIDE 3 — HOW IT WORKS */}
      <section ref={setRef(2)} data-idx={2} style={slideStyle({ background:'#F5EDE4' })}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <Eyebrow>How It Works</Eyebrow>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.8rem,3.6vw,2.8rem)', fontWeight:900 }}>Four steps. One unforgettable story.</h2>
        </div>
        <div className="ss-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:24, maxWidth:880, margin:'0 auto' }}>
          {[['1','Sign Up Free','🚀'],['2','Write Your Day 1','✍️'],['3','Share & Connect','🤝'],['4','Adopt & Grow','🏆']].map(([n,t,ic]) => (
            <div key={n} style={{ textAlign:'center' }}>
              <div style={{ width:54, height:54, borderRadius:'50%', background:'white', border:'2px solid rgba(255,107,43,.25)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Playfair Display',serif", fontSize:'1.2rem', fontWeight:900, color:'#FF6B2B', margin:'0 auto 14px' }}>{n}</div>
              <div style={{ fontSize:20, marginBottom:6 }}>{ic}</div>
              <div style={{ fontSize:13.5, fontWeight:700 }}>{t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SLIDE 4 — FEATURES (dark) */}
      <section ref={setRef(3)} data-idx={3} style={slideStyle({ background:'#0D0D1A', color:'white' })}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <Eyebrow color="#A78BFA">Platform Features</Eyebrow>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.8rem,3.6vw,2.8rem)', fontWeight:900 }}>Everything a fresher needs to thrive.</h2>
        </div>
        <div className="ss-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18, maxWidth:900, margin:'0 auto' }}>
          {[
            ['📝','Story Sharing','#FF6B2B'],['🤝','Social Network','#06B6D4'],['🔥','Habit Tracking','#F59E0B'],
            ['🏆','Gamification','#A78BFA'],['💰','Points & Coins','#34D399'],['🛡️','AI Safety','#F43F5E'],
          ].map(([icon,title,color]) => (
            <div key={title} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:20, textAlign:'center' }}>
              <div style={{ fontSize:24, marginBottom:10 }}>{icon}</div>
              <div style={{ fontSize:13, fontWeight:700, color }}>{title}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SLIDE 5 — POINTS */}
      <section ref={setRef(4)} data-idx={4} style={slideStyle({ background:'#FDF6EE', overflowY:'auto' })}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <Eyebrow>Earn While You Engage</Eyebrow>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.8rem,3.6vw,2.8rem)', fontWeight:900 }}>Every action earns you points.</h2>
        </div>
        <div className="ss-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, maxWidth:880, margin:'0 auto' }}>
          {[['Daily Login','+10','🌅'],['Like a Story','+10','❤️'],['Comment','+20','💬'],['Share Story','+10','🔗'],['Post a Story','+20','✍️'],['Habit Log','+10','🔥'],['Story Unlock','-10','🔒'],['Level Up','🏆','👑']].map(([action,pts,icon]) => (
            <div key={action} style={{ background:'white', border:'1px solid rgba(26,8,0,.07)', borderRadius:16, padding:18, textAlign:'center' }}>
              <div style={{ fontSize:18, marginBottom:6 }}>{icon}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.3rem', fontWeight:900, color: String(pts).startsWith('-') ? '#DC2626' : '#FF6B2B' }}>{pts}</div>
              <div style={{ fontSize:11, fontWeight:600, marginTop:2 }}>{action}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:'center', marginTop:28 }}>
          <Link to="/register" style={{ fontSize:13, fontWeight:700, color:'#FF6B2B', textDecoration:'none' }}>Start Earning Points →</Link>
        </div>
      </section>

      {/* SLIDE 6 — CATEGORIES */}
      <section ref={setRef(5)} data-idx={5} style={slideStyle({ background:'white', overflowY:'auto' })}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <Eyebrow>Story Categories</Eyebrow>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.8rem,3.6vw,2.8rem)', fontWeight:900 }}>Every kind of first.</h2>
        </div>
        {!loading && (
          <div className="ss-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, maxWidth:880, margin:'0 auto' }}>
            {categories.map(c => (
              <div key={c.id} className="ss-cat" onClick={() => navigate(`/discover?cat=${encodeURIComponent(c.name)}`)}>
                <div style={{ fontSize:24, marginBottom:8 }}>{c.icon}</div>
                <div style={{ fontSize:12.5, fontWeight:600 }}>{c.name}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SLIDE 7 — HABITS */}
      <section ref={setRef(6)} data-idx={6} style={slideStyle({ background:'#F5EDE4', overflowY:'auto' })}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <Eyebrow>Habit Change Module</Eyebrow>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.8rem,3.6vw,2.8rem)', fontWeight:900, maxWidth:520, margin:'0 auto' }}>The feature that makes us different.</h2>
        </div>
        <div className="ss-2col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32, maxWidth:880, margin:'0 auto', alignItems:'start' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {!loading && habits.map(h => (
              <div key={h.id} style={{ display:'flex', alignItems:'center', gap:12, background:'white', borderRadius:12, padding:'10px 14px' }}>
                <span style={{ fontSize:18, width:26, textAlign:'center' }}>{h.icon || '✨'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{h.title}</div>
                  <div style={{ fontSize:10.5, color:'#8C7B6E' }}>{(h.adopters_count||0).toLocaleString()} adopters</div>
                </div>
                <button className={`ss-adopt${adopted[h.id] ? ' done' : ''}`} onClick={() => { if (adopted[h.id]) navigate('/register'); else setAdopted(a => ({ ...a, [h.id]: true })) }}>{adopted[h.id] ? '✓' : 'Adopt'}</button>
              </div>
            ))}
          </div>
          <div style={{ background:'#1A0800', borderRadius:18, padding:24, color:'white' }}>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              {[['28','Done'],['72','Left'],['280','Pts']].map(([v,l]) => (
                <div key={l} style={{ flex:1, background:'rgba(255,255,255,.06)', borderRadius:10, padding:10, textAlign:'center' }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.2rem', fontWeight:900, color:'#FF6B2B' }}>{v}</div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,.4)' }}>{l}</div>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/register')} style={{ width:'100%', padding:11, background:'linear-gradient(135deg,#FF6B2B,#8B5CF6)', color:'white', border:'none', borderRadius:100, fontSize:12, fontWeight:700, cursor:'pointer' }}>Start Your Journey →</button>
          </div>
        </div>
      </section>

      {/* SLIDE 8 — JOBS (dark) */}
      <section ref={setRef(7)} data-idx={7} style={slideStyle({ background:'#1A0800', color:'white', overflowY:'auto' })}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <Eyebrow color="#FFD166">Trending Opportunities</Eyebrow>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.8rem,3.6vw,2.8rem)', fontWeight:900 }}>Your Day 1 at a new job starts here.</h2>
        </div>
        {!loading && (
          <div className="ss-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, maxWidth:920, margin:'0 auto' }}>
            {(openJobs.length ? openJobs : [
              { title:'Frontend Engineer', department:'Engineering' }, { title:'Product Designer', department:'Design' },
            ]).map((job, i) => (
              <div key={job.id || i} style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:16, padding:18, cursor:'pointer' }} onClick={() => navigate('/careers')}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:14, marginBottom:6 }}>{job.title}</div>
                <div style={{ fontSize:11.5, color:'rgba(255,255,255,.4)' }}>{job.company_name || job.department}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ textAlign:'center', marginTop:28, display:'flex', gap:16, justifyContent:'center' }}>
          <Link to="/companies" style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.7)', textDecoration:'none' }}>Browse Companies →</Link>
          <Link to="/careers" style={{ fontSize:13, fontWeight:700, color:'#FFD166', textDecoration:'none' }}>View All Jobs →</Link>
        </div>
      </section>

      {/* SLIDE 9 — TESTIMONIALS */}
      <section ref={setRef(8)} data-idx={8} style={slideStyle({ background:'#FDF6EE', overflowY:'auto' })}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <Eyebrow>Real Stories, Real Freshers</Eyebrow>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.8rem,3.6vw,2.8rem)', fontWeight:900 }}>What they're saying.</h2>
        </div>
        {!loading && (
          <div className="ss-grid3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20, maxWidth:920, margin:'0 auto' }}>
            {testimonials.map(t => (
              <div key={t.id} className="ss-testi">
                <div style={{ color:'#FFD166', marginBottom:8 }}>{'★'.repeat(t.rating || 5)}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontStyle:'italic', fontSize:13, lineHeight:1.65, marginBottom:14 }}>"{t.quote}"</div>
                <div style={{ fontSize:12, fontWeight:700 }}>{t.author_name} <span style={{ color:'#8C7B6E', fontWeight:400 }}>— {t.author_role}</span></div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SLIDE 10 — COMMUNITY */}
      <section ref={setRef(9)} data-idx={9} style={slideStyle({ background:'white', overflowY:'auto' })}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <Eyebrow>Community & Gamification</Eyebrow>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.8rem,3.6vw,2.8rem)', fontWeight:900 }}>Climb from Beginner to Legend.</h2>
        </div>
        <div className="ss-2col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32, maxWidth:880, margin:'0 auto', alignItems:'start' }}>
          <div style={{ background:'#F5EDE4', borderRadius:16, overflow:'hidden' }}>
            {!loading && leaderboard.map((u, i) => (
              <div key={u.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer' }} onClick={() => navigate(`/profile/${u.username}`)}>
                <div style={{ fontWeight:700, width:20, textAlign:'center' }}>{['🥇','🥈','🥉'][i] || i + 1}</div>
                <div style={{ width:28, height:28, borderRadius:'50%', background:getAvatarColor(u.full_name||u.username||''), display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white', overflow:'hidden' }}>
                  {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" /> : getInitials(u.full_name||u.username||'?')}
                </div>
                <div style={{ flex:1, minWidth:0, fontSize:12, fontWeight:600 }}>{u.full_name || u.username}</div>
                <div style={{ fontSize:12, fontWeight:700, color:'#FF6B2B' }}>{(u.score||0).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, justifyContent:'center' }}>
            {[['🥉','Beginner','0–1K pts'],['🥈','Explorer','1K–5K pts'],['🥇','Achiever','5K–20K pts'],['🏆','Hero','20K–50K pts'],['🔥','Super Hero','50K–100K pts'],['👑','Legend','100K+ pts']].map(([icon,name,pts]) => (
              <div key={name} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 12px', background:'#F5EDE4', borderRadius:10 }}>
                <span style={{ fontSize:16 }}>{icon}</span>
                <span style={{ fontSize:12.5, fontWeight:600, flex:1 }}>{name}</span>
                <span style={{ fontSize:10.5, color:'#8C7B6E' }}>{pts}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SLIDE 11 — CTA */}
      <section ref={setRef(10)} data-idx={10} style={slideStyle({ background:'linear-gradient(135deg,#1A0A2E 0%,#2D0A1E 35%,#1A0800 70%,#0A1628 100%)', color:'white', textAlign:'center' })}>
        <div style={{ position:'absolute', top:'15%', left:'15%', width:340, height:340, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,.22) 0%,transparent 70%)' }} />
        <div style={{ position:'absolute', bottom:'15%', right:'15%', width:340, height:340, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,107,43,.18) 0%,transparent 70%)' }} />
        <div style={{ position:'relative', zIndex:2 }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.9rem,4.5vw,3.2rem)', fontWeight:900, marginBottom:16, lineHeight:1.2 }}>
            {(data?.stats?.total_stories || 10000).toLocaleString()}+ freshers already shared<br/><span style={{ background:'linear-gradient(90deg,#FF6B2B,#FFD166,#8B5CF6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>their Day 1.</span> What's yours?
          </h2>
          <p style={{ color:'rgba(255,255,255,.5)', marginBottom:28 }}>Every expert was once a fresher.</p>
          <Link to="/register" style={{ display:'inline-block', fontSize:15, fontWeight:700, color:'white', background:'linear-gradient(135deg,#FF6B2B,#8B5CF6)', padding:'16px 38px', borderRadius:100, textDecoration:'none', boxShadow:'0 14px 40px rgba(139,92,246,.4)', marginBottom:36 }}>Share My Day 1 Story ✍️</Link>
          <div style={{ display:'flex', justifyContent:'center', gap:24, fontSize:11, color:'rgba(255,255,255,.4)', flexWrap:'wrap' }}>
            <Link to="/about" style={{ color:'rgba(255,255,255,.4)', textDecoration:'none' }}>About</Link>
            <Link to="/careers" style={{ color:'rgba(255,255,255,.4)', textDecoration:'none' }}>Careers</Link>
            <Link to="/companies" style={{ color:'rgba(255,255,255,.4)', textDecoration:'none' }}>Companies</Link>
            <Link to="/privacy" style={{ color:'rgba(255,255,255,.4)', textDecoration:'none' }}>Privacy</Link>
            <Link to="/terms" style={{ color:'rgba(255,255,255,.4)', textDecoration:'none' }}>Terms</Link>
            <span>© 2026 Day1 Diaries</span>
          </div>
        </div>
      </section>
    </div>
  )
}
