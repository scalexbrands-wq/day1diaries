import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import useLandingData, { useCountUp, LEVEL_ICONS, getAvatarColor, getInitials } from '../hooks/useLandingData'
import Seo from '../components/Seo'
import VisitorCounter from '../components/VisitorCounter'

const JOB_TYPE = { 'Full-Time':{bg:'rgba(37,99,235,.15)',c:'#2563EB'}, 'Part-Time':{bg:'rgba(124,58,237,.15)',c:'#7C3AED'}, 'Contract':{bg:'rgba(245,158,11,.15)',c:'#D97706'}, 'Internship':{bg:'rgba(5,150,105,.15)',c:'#059669'}, 'Remote':{bg:'rgba(236,72,153,.15)',c:'#EC4899'} }

/* A bold, bento-grid / glassmorphism landing page — saturated gradients,
   mixed-size grid cells, playful rounded shapes. Same data/features as
   the classic template, maximalist visual register instead. */
export default function LandingBento() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, loading, seo } = useLandingData()
  const [adopted, setAdopted] = useState({})
  const [menuOpen, setMenuOpen] = useState(false)
  const [showAllJobs, setShowAllJobs] = useState(false)

  React.useEffect(() => { if (user) navigate('/feed') }, [user, navigate])

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
  const visibleJobs = showAllJobs ? openJobs : openJobs.slice(0, 4)

  const card = (grad, extra={}) => ({ borderRadius:28, padding:28, background:grad, position:'relative', overflow:'hidden', ...extra })
  const glass = { background:'rgba(255,255,255,.65)', backdropFilter:'blur(14px)', border:'1px solid rgba(255,255,255,.5)' }

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'linear-gradient(160deg,#FFF1E6 0%,#FDF6EE 40%,#F3EBFF 100%)', color:'#1A0800', overflowX:'hidden' }}>
      {seo && <Seo title={seo.title} description={seo.description} image={seo.image} path="/" />}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes bn-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        .bn-bento{display:grid;gap:16px}
        .bn-card{transition:transform .25s, box-shadow .25s; cursor:default}
        .bn-card:hover{transform:translateY(-6px); box-shadow:0 24px 50px rgba(26,8,0,.12)}
        .bn-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.6);border-radius:100px;padding:6px 14px;font-size:11px;font-weight:700}
        .bn-link{font-size:13.5px;font-weight:600;color:#1A0800;text-decoration:none}
        .bn-adopt{background:white;border:none;color:#FF6B2B;padding:6px 14px;border-radius:100px;font-size:11px;font-weight:700;cursor:pointer}
        .bn-adopt.done{background:#16A34A;color:white}
        @media(max-width:900px){
          .bn-hero{grid-template-columns:1fr!important}
          .bn-4{grid-template-columns:1fr 1fr!important}
          .bn-3{grid-template-columns:1fr!important}
          .bn-2{grid-template-columns:1fr!important}
          .bn-nav-desktop{display:none!important}
          .bn-hamburger{display:flex!important}
        }
        @media(max-width:480px){ .bn-4{grid-template-columns:1fr!important} }
      `}</style>

      {/* NAV */}
      <nav style={{ position:'sticky', top:0, zIndex:200, padding:'16px 32px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,.7)', backdropFilter:'blur(16px)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <Link to="/" style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:900, background:'linear-gradient(135deg,#FF6B2B,#8B5CF6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', textDecoration:'none' }}>Day1 Diaries</Link>
          <VisitorCounter />
        </div>
        <div className="bn-nav-desktop" style={{ display:'flex', alignItems:'center', gap:26 }}>
          <a href="#features" className="bn-link">Features</a>
          <a href="#habits" className="bn-link">Habits</a>
          <a href="#jobs" className="bn-link">Jobs</a>
          <Link to="/login" className="bn-link">Sign In</Link>
          <Link to="/register" style={{ fontSize:13.5, fontWeight:700, color:'white', background:'linear-gradient(135deg,#FF6B2B,#8B5CF6)', padding:'10px 22px', borderRadius:100, textDecoration:'none', boxShadow:'0 6px 20px rgba(139,92,246,.35)' }}>Get Started ✨</Link>
        </div>
        <button className="bn-hamburger" style={{ display:'none', background:'white', border:'none', borderRadius:10, padding:'6px 10px', fontSize:16 }} onClick={() => setMenuOpen(v => !v)}>{menuOpen ? '✕' : '☰'}</button>
      </nav>
      {menuOpen && (
        <div style={{ padding:'16px 24px', background:'white', display:'flex', flexDirection:'column', gap:14 }}>
          <a href="#features" className="bn-link" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#habits" className="bn-link" onClick={() => setMenuOpen(false)}>Habits</a>
          <a href="#jobs" className="bn-link" onClick={() => setMenuOpen(false)}>Jobs</a>
          <Link to="/login" className="bn-link" onClick={() => setMenuOpen(false)}>Sign In</Link>
          <Link to="/register" className="bn-link" onClick={() => setMenuOpen(false)} style={{ color:'#FF6B2B' }}>Get Started →</Link>
        </div>
      )}

      {/* HERO — bento split */}
      <section className="bn-hero" style={{ display:'grid', gridTemplateColumns:'1.1fr .9fr', gap:24, padding:'48px 32px', alignItems:'stretch' }}>
        <div className="bn-card" style={card('rgba(255,255,255,.5)', { ...glass, display:'flex', flexDirection:'column', justifyContent:'center', padding:'52px 44px' })}>
          <span className="bn-pill" style={{ marginBottom:22, alignSelf:'flex-start' }}>✨ {hero.eyebrow || 'For Every Fresher, Everywhere'}</span>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(2.2rem,4.5vw,3.6rem)', fontWeight:900, lineHeight:1.08, marginBottom:20 }}>
            {parts[0]}<span style={{ background:'linear-gradient(120deg,#FF6B2B,#8B5CF6,#06B6D4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{highlight}</span>{parts[1]}
          </h1>
          <p style={{ fontSize:'1.02rem', color:'#4A2800', lineHeight:1.7, marginBottom:30, maxWidth:440 }}>{hero.subheadline || 'Now the world can read it. Share raw stories, adopt life-changing habits, and grow together.'}</p>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <Link to="/register" style={{ fontSize:14.5, fontWeight:700, color:'white', background:'linear-gradient(135deg,#FF6B2B,#8B5CF6)', padding:'15px 30px', borderRadius:100, textDecoration:'none', boxShadow:'0 10px 30px rgba(139,92,246,.4)' }}>{hero.cta_primary_text || 'Share My Day 1 ✍️'}</Link>
            <a href="#features" style={{ fontSize:14.5, fontWeight:700, color:'#1A0800', background:'white', padding:'15px 30px', borderRadius:100, textDecoration:'none' }}>{hero.cta_secondary_text || 'See How →'}</a>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateRows:'1fr 1fr', gap:24 }}>
          <div className="bn-card" style={card('linear-gradient(135deg,#FF6B2B,#FFB199)', { color:'white', display:'flex', flexDirection:'column', justifyContent:'center', animation:'bn-float 5s ease-in-out infinite' })}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'2.4rem', fontWeight:900 }}>{c1}</div>
            <div style={{ fontSize:12, opacity:.85 }}>Total Users 👥</div>
          </div>
          <div className="bn-card" style={card('linear-gradient(135deg,#8B5CF6,#C4B5FD)', { color:'white', display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 })}>
            <div><div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.6rem', fontWeight:900 }}>{c2}</div><div style={{ fontSize:11, opacity:.85 }}>Stories 📝</div></div>
            <div><div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.6rem', fontWeight:900 }}>{c3}</div><div style={{ fontSize:11, opacity:.85 }}>Habits 🔥</div></div>
          </div>
        </div>
      </section>

      {/* VALUE PROP — bento grid of feature tiles (replaces AI neon section) */}
      <section style={{ padding:'20px 32px 60px' }}>
        <div className="bn-bento bn-4" style={{ gridTemplateColumns:'repeat(4,1fr)' }}>
          {[
            { icon:'🛡️', t:'AI Content Guard', d:'Auto-detects harmful content, 24/7.', g:'linear-gradient(135deg,#F43F5E,#FDA4AF)' },
            { icon:'🎯', t:'Avoid Day-1 Mistakes', d:'Learn from 10,000+ real stories.', g:'linear-gradient(135deg,#F59E0B,#FCD34D)' },
            { icon:'🔥', t:'Achieve Your Goals', d:'Daily nudges keep your streak alive.', g:'linear-gradient(135deg,#06B6D4,#67E8F9)' },
            { icon:'💰', t:'Free Forever', d:'Every feature, zero cost, always.', g:'linear-gradient(135deg,#10B981,#6EE7B7)' },
          ].map(f => (
            <div key={f.t} className="bn-card" style={card(f.g, { color:'white' })}>
              <div style={{ fontSize:30, marginBottom:14 }}>{f.icon}</div>
              <div style={{ fontWeight:800, fontSize:14.5, marginBottom:6 }}>{f.t}</div>
              <div style={{ fontSize:12, opacity:.85, lineHeight:1.6 }}>{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="features" style={{ padding:'60px 32px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <span className="bn-pill" style={{ marginBottom:16 }}>How It Works</span>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.9rem,3.5vw,2.8rem)', fontWeight:900, marginTop:14 }}>Four steps. One unforgettable story.</h2>
        </div>
        <div className="bn-bento bn-4" style={{ gridTemplateColumns:'repeat(4,1fr)', maxWidth:1000, margin:'0 auto' }}>
          {[['1','Sign Up Free','🚀','linear-gradient(135deg,#FF6B2B,#FFD166)'],['2','Write Your Day 1','✍️','linear-gradient(135deg,#8B5CF6,#C4B5FD)'],['3','Share & Connect','🤝','linear-gradient(135deg,#06B6D4,#67E8F9)'],['4','Adopt & Grow','🏆','linear-gradient(135deg,#EC4899,#FBCFE8)']].map(([n,t,ic,g]) => (
            <div key={n} className="bn-card" style={card(g, { color:'white', textAlign:'center' })}>
              <div style={{ fontSize:28, marginBottom:10 }}>{ic}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.3rem', fontWeight:900, marginBottom:4 }}>{n}</div>
              <div style={{ fontSize:13, fontWeight:700 }}>{t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES — bento mixed sizes */}
      <section style={{ padding:'60px 32px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <span className="bn-pill">Platform Features</span>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.9rem,3.5vw,2.8rem)', fontWeight:900, marginTop:14 }}>Everything a fresher needs.</h2>
        </div>
        <div className="bn-bento bn-3" style={{ gridTemplateColumns:'repeat(3,1fr)', maxWidth:1080, margin:'0 auto' }}>
          {[
            ['📝','Story Sharing','rgba(255,107,43,.12)'],['🤝','Social Network','rgba(6,182,212,.12)'],['🔥','Habit Tracking','rgba(245,158,11,.12)'],
            ['🏆','Gamification','rgba(139,92,246,.12)'],['💰','Points & Coins','rgba(16,185,129,.12)'],['🛡️','AI Safety','rgba(244,63,94,.12)'],
          ].map(([icon,title,bg]) => (
            <div key={title} className="bn-card" style={card(bg, { border:'1.5px solid rgba(26,8,0,.06)' })}>
              <div style={{ fontSize:26, marginBottom:12 }}>{icon}</div>
              <div style={{ fontWeight:800, fontSize:14.5 }}>{title}</div>
            </div>
          ))}
        </div>
      </section>

      {/* POINTS */}
      <section style={{ padding:'60px 32px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <span className="bn-pill">Earn While You Engage</span>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.9rem,3.5vw,2.8rem)', fontWeight:900, marginTop:14 }}>Every action earns points.</h2>
        </div>
        <div className="bn-bento bn-4" style={{ gridTemplateColumns:'repeat(4,1fr)', maxWidth:1000, margin:'0 auto 32px' }}>
          {[['Daily Login','+10','🌅'],['Like a Story','+10','❤️'],['Comment','+20','💬'],['Share Story','+10','🔗'],['Post a Story','+20','✍️'],['Habit Log','+10','🔥'],['Story Unlock','-10','🔒'],['Level Up','🏆','👑']].map(([action,pts,icon]) => (
            <div key={action} className="bn-card" style={{ ...glass, borderRadius:20, padding:18, textAlign:'center' }}>
              <div style={{ fontSize:18, marginBottom:6 }}>{icon}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.3rem', fontWeight:900, color: String(pts).startsWith('-') ? '#DC2626' : '#FF6B2B' }}>{pts}</div>
              <div style={{ fontSize:11, fontWeight:600 }}>{action}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:'center' }}>
          <Link to="/register" style={{ fontSize:14, fontWeight:700, color:'white', background:'linear-gradient(135deg,#FF6B2B,#8B5CF6)', padding:'14px 30px', borderRadius:100, textDecoration:'none' }}>Start Earning →</Link>
        </div>
      </section>

      {/* CATEGORIES */}
      <section style={{ padding:'60px 32px' }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <span className="bn-pill">Story Categories</span>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.9rem,3.5vw,2.8rem)', fontWeight:900, marginTop:14 }}>Every kind of first.</h2>
        </div>
        {!loading && (
          <div className="bn-bento bn-4" style={{ gridTemplateColumns:'repeat(4,1fr)', maxWidth:960, margin:'0 auto' }}>
            {categories.map(c => (
              <div key={c.id} className="bn-card" style={{ ...glass, borderRadius:20, padding:'20px 16px', textAlign:'center', cursor:'pointer' }} onClick={() => navigate(`/discover?cat=${encodeURIComponent(c.name)}`)}>
                <div style={{ fontSize:26, marginBottom:8 }}>{c.icon}</div>
                <div style={{ fontSize:13, fontWeight:700 }}>{c.name}</div>
                <div style={{ fontSize:11, color: c.is_cta ? '#FF6B2B' : '#8C7B6E', marginTop:4 }}>{c.is_cta ? 'Share yours →' : `${(c.story_count||0).toLocaleString()} stories`}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ textAlign:'center', marginTop:32 }}>
          <Link to="/discover" className="bn-link" style={{ color:'#FF6B2B' }}>Browse All Stories →</Link>
        </div>
      </section>

      {/* HABITS */}
      <section id="habits" style={{ padding:'60px 32px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <span className="bn-pill">Habit Change Module</span>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.9rem,3.5vw,2.8rem)', fontWeight:900, marginTop:14 }}>The feature that makes us different.</h2>
        </div>
        <div className="bn-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, maxWidth:1000, margin:'0 auto' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {!loading && habits.map(h => (
              <div key={h.id} className="bn-card" style={{ ...glass, borderRadius:18, padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:20, width:30, textAlign:'center' }}>{h.icon || '✨'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13.5, fontWeight:700 }}>{h.title}</div>
                  <div style={{ fontSize:11, color:'#8C7B6E' }}>{(h.adopters_count||0).toLocaleString()} adopters · {h.completion_rate||0}%</div>
                </div>
                <button className={`bn-adopt${adopted[h.id] ? ' done' : ''}`} onClick={() => { if (adopted[h.id]) navigate('/register'); else setAdopted(a => ({ ...a, [h.id]: true })) }}>{adopted[h.id] ? '✓' : 'Adopt'}</button>
              </div>
            ))}
          </div>
          <div className="bn-card" style={card('linear-gradient(135deg,#1A0800,#3D1A0A)', { color:'white' })}>
            {habits[0] && <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.1rem', fontWeight:700, marginBottom:16 }}>{habits[0].icon} {habits[0].title} 🔥28</div>}
            <div style={{ display:'flex', gap:10, marginBottom:18 }}>
              {[['28','Done'],['72','Left'],['280','Pts']].map(([v,l]) => (
                <div key={l} style={{ flex:1, background:'rgba(255,255,255,.08)', borderRadius:14, padding:12, textAlign:'center' }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.4rem', fontWeight:900, color:'#FF6B2B' }}>{v}</div>
                  <div style={{ fontSize:10, opacity:.5 }}>{l}</div>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/register')} style={{ width:'100%', padding:13, background:'linear-gradient(135deg,#FF6B2B,#8B5CF6)', color:'white', border:'none', borderRadius:100, fontWeight:700, cursor:'pointer' }}>Start Your Journey →</button>
          </div>
        </div>
      </section>

      {/* JOBS */}
      <section id="jobs" style={{ padding:'60px 32px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <span className="bn-pill">Trending Opportunities</span>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.9rem,3.5vw,2.8rem)', fontWeight:900, marginTop:14 }}>Your Day 1 at a new job starts here.</h2>
          <Link to="/companies" style={{ display:'inline-block', marginTop:14, fontSize:13, fontWeight:700, color:'#FF6B2B', textDecoration:'none' }}>Browse Companies →</Link>
        </div>
        {!loading && (
          <div className="bn-bento bn-4" style={{ gridTemplateColumns:'repeat(4,1fr)', maxWidth:1080, margin:'0 auto' }}>
            {(visibleJobs.length ? visibleJobs : [
              { title:'Frontend Engineer', department:'Engineering', location:'Remote', job_type:'Full-Time' },
              { title:'Product Designer', department:'Design', location:'Bangalore', job_type:'Full-Time' },
            ]).map((job, i) => {
              const ts = JOB_TYPE[job.job_type] || JOB_TYPE['Full-Time']
              return (
                <div key={job.id || i} className="bn-card" style={{ ...glass, borderRadius:20, padding:20, cursor:'pointer' }} onClick={() => navigate('/careers')}>
                  <span style={{ fontSize:10, fontWeight:700, padding:'4px 10px', borderRadius:100, background:ts.bg, color:ts.c }}>{job.job_type || 'Full-Time'}</span>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, marginTop:12, marginBottom:4 }}>{job.title}</div>
                  <div style={{ fontSize:12, color:'#8C7B6E' }}>{job.company_name || job.department} {job.location ? `· ${job.location}` : ''}</div>
                </div>
              )
            })}
          </div>
        )}
        {openJobs.length > 4 && (
          <div style={{ textAlign:'center', marginTop:28 }}>
            <button onClick={() => setShowAllJobs(v => !v)} style={{ background:'white', border:'none', padding:'10px 24px', borderRadius:100, fontSize:13, cursor:'pointer' }}>{showAllJobs ? '← Show Less' : `View ${openJobs.length - 4} More →`}</button>
          </div>
        )}
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding:'60px 32px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <span className="bn-pill">Real Stories</span>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.9rem,3.5vw,2.8rem)', fontWeight:900, marginTop:14 }}>What they're saying.</h2>
        </div>
        {!loading && (
          <div className="bn-bento bn-3" style={{ gridTemplateColumns:'repeat(3,1fr)', maxWidth:1080, margin:'0 auto' }}>
            {testimonials.map(t => (
              <div key={t.id} className="bn-card" style={{ ...glass, borderRadius:22, padding:24 }}>
                <div style={{ color:'#FFD166', marginBottom:10 }}>{'★'.repeat(t.rating || 5)}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontStyle:'italic', fontSize:13.5, lineHeight:1.7, marginBottom:16 }}>"{t.quote}"</div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:t.avatar_gradient || 'linear-gradient(135deg,#FF6B2B,#FFD166)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'white' }}>{t.author_initials}</div>
                  <div><div style={{ fontSize:12.5, fontWeight:700 }}>{t.author_name}</div><div style={{ fontSize:10.5, color:'#8C7B6E' }}>{t.author_role}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* COMMUNITY */}
      <section id="community" style={{ padding:'60px 32px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <span className="bn-pill">Community & Gamification</span>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.9rem,3.5vw,2.8rem)', fontWeight:900, marginTop:14 }}>Climb from Beginner to Legend.</h2>
        </div>
        <div className="bn-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, maxWidth:1000, margin:'0 auto' }}>
          <div className="bn-card" style={{ ...glass, borderRadius:22, padding:8 }}>
            {!loading && leaderboard.map((u, i) => (
              <div key={u.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer' }} onClick={() => navigate(`/profile/${u.username}`)}>
                <div style={{ fontWeight:700, width:22, textAlign:'center' }}>{['🥇','🥈','🥉'][i] || i + 1}</div>
                <div style={{ width:32, height:32, borderRadius:'50%', background:getAvatarColor(u.full_name||u.username||''), display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white', overflow:'hidden' }}>
                  {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" /> : getInitials(u.full_name||u.username||'?')}
                </div>
                <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:13, fontWeight:700 }}>{u.full_name || u.username}</div><div style={{ fontSize:10.5, color:'#8C7B6E' }}>{LEVEL_ICONS[u.level] || '🥉'} {u.level}</div></div>
                <div style={{ fontSize:13, fontWeight:700, color:'#FF6B2B' }}>{(u.score||0).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[['🥉','Beginner','linear-gradient(135deg,#9CA3AF,#D1D5DB)'],['🥈','Explorer','linear-gradient(135deg,#94A3B8,#CBD5E1)'],['🥇','Achiever','linear-gradient(135deg,#FBBF24,#FDE68A)'],['🏆','Hero','linear-gradient(135deg,#FF6B2B,#FFB199)'],['🔥','Super Hero','linear-gradient(135deg,#F43F5E,#FDA4AF)'],['👑','Legend','linear-gradient(135deg,#8B5CF6,#C4B5FD)']].map(([icon,name,g]) => (
              <div key={name} className="bn-card" style={{ background:g, borderRadius:14, padding:'10px 16px', display:'flex', alignItems:'center', gap:10, color:'white' }}>
                <span style={{ fontSize:16 }}>{icon}</span><span style={{ fontSize:12.5, fontWeight:700 }}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'32px', paddingBottom:60 }}>
        <div style={{ borderRadius:32, background:'linear-gradient(135deg,#FF6B2B 0%,#8B5CF6 55%,#06B6D4 100%)', padding:'70px 40px', textAlign:'center', color:'white' }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.9rem,4vw,3rem)', fontWeight:900, marginBottom:14, lineHeight:1.2 }}>{(data?.stats?.total_stories || 10000).toLocaleString()}+ freshers already shared their Day 1.<br/>What's yours?</h2>
          <p style={{ opacity:.85, marginBottom:28 }}>Every expert was once a fresher.</p>
          <Link to="/register" style={{ display:'inline-block', fontSize:15, fontWeight:700, color:'#1A0800', background:'white', padding:'16px 36px', borderRadius:100, textDecoration:'none' }}>Share My Day 1 Story ✍️</Link>
          <div style={{ display:'flex', justifyContent:'center', gap:32, marginTop:40, flexWrap:'wrap' }}>
            {[[c1,'Users'],[c2,'Stories'],[c4,'Less Alone']].map(([v,l]) => (
              <div key={l}><div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.6rem', fontWeight:900 }}>{v}</div><div style={{ fontSize:11, opacity:.8 }}>{l}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM SECTION (admin-customizable) */}
      {bottomSection.is_active !== false && (bottomSection.heading || bottomSection.image_urls?.length > 0) && (
        <section style={{ padding:'0 32px 60px', display:'grid', gridTemplateColumns: bottomSection.image_urls?.length ? '1fr 1fr' : '1fr', gap:24, alignItems:'center', maxWidth:1080, margin:'0 auto' }}>
          <div className="bn-card" style={{ ...glass, borderRadius:26, padding:36 }}>
            {bottomSection.subheadline && <span className="bn-pill" style={{ marginBottom:14 }}>{bottomSection.subheadline}</span>}
            {bottomSection.heading && <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.6rem,3vw,2.2rem)', fontWeight:900, margin:'14px 0' }}>{bottomSection.heading}</h2>}
            {bottomSection.body_text && <p style={{ fontSize:13.5, color:'#4A2800', lineHeight:1.7, marginBottom:20 }}>{bottomSection.body_text}</p>}
            {bottomSection.cta_text && <Link to={bottomSection.cta_link || '/register'} style={{ fontSize:14, fontWeight:700, color:'white', background:'linear-gradient(135deg,#FF6B2B,#8B5CF6)', padding:'13px 28px', borderRadius:100, textDecoration:'none' }}>{bottomSection.cta_text}</Link>}
          </div>
          {bottomSection.image_urls?.[0] && <img src={bottomSection.image_urls[0]} alt="" style={{ width:'100%', borderRadius:24 }} loading="lazy" />}
        </section>
      )}

      {/* FOOTER */}
      <footer style={{ background:'#1A0800', color:'white', padding:'48px 32px 28px', borderRadius:'32px 32px 0 0' }}>
        <div className="bn-bento bn-3" style={{ gridTemplateColumns:'1.5fr 1fr 1fr 1fr', marginBottom:32 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:900, background:'linear-gradient(135deg,#FF6B2B,#8B5CF6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:10 }}>Day1 Diaries</div>
            <div style={{ fontSize:12.5, color:'rgba(255,255,255,.4)', lineHeight:1.7, maxWidth:240 }}>Share raw first-day stories, adopt habits, grow together.</div>
          </div>
          {[
            ['Platform',[['Discover','/discover'],['Habits','/habits'],['Leaderboard','/leaderboard']]],
            ['Company',[['About','/about'],['Blog','/blog'],['Careers','/careers'],['Companies','/companies']]],
            ['Legal',[['Privacy','/privacy'],['Terms','/terms']]],
          ].map(([title, links]) => (
            <div key={title}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', marginBottom:12 }}>{title}</div>
              {links.map(([label, href]) => (
                <div key={label} style={{ marginBottom:8 }}><Link to={href} style={{ fontSize:12.5, color:'rgba(255,255,255,.5)', textDecoration:'none' }}>{label}</Link></div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.3)', paddingTop:20, borderTop:'1px solid rgba(255,255,255,.08)' }}>© 2026 Day1 Diaries. Every expert was once a fresher. ✨</div>
      </footer>
    </div>
  )
}
