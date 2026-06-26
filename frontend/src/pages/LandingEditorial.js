import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import useLandingData, { useCountUp, LEVEL_ICONS, getAvatarColor, getInitials } from '../hooks/useLandingData'
import Seo from '../components/Seo'
import VisitorCounter from '../components/VisitorCounter'

const JOB_TYPE = { 'Full-Time':'#2563EB', 'Part-Time':'#7C3AED', 'Contract':'#D97706', 'Internship':'#059669', 'Remote':'#FF6B2B' }

/* A magazine-style "editorial" landing page — single-column reading flow,
   generous whitespace, restrained color, large serif type. Same data/
   features as the classic template, very different visual register. */
export default function LandingEditorial() {
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

  const Eyebrow = ({ children }) => <div style={{ fontSize:11, fontWeight:600, letterSpacing:'.18em', textTransform:'uppercase', color:'#FF6B2B', marginBottom:14 }}>{children}</div>
  const Rule = () => <div style={{ height:1, background:'#E8DFD3', maxWidth:1080, margin:'0 auto' }} />

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#FFFDFB', color:'#171410' }}>
      {seo && <Seo title={seo.title} description={seo.description} image={seo.image} path="/" />}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .ed-link { color:#171410; text-decoration:none; font-size:13.5px; border-bottom:1px solid transparent; transition:border-color .2s; }
        .ed-link:hover { border-color:#FF6B2B; }
        .ed-cat { display:flex; align-items:center; justify-content:space-between; padding:18px 0; border-bottom:1px solid #E8DFD3; cursor:pointer; transition:padding-left .2s; }
        .ed-cat:hover { padding-left:8px; color:#FF6B2B; }
        .ed-habit { display:flex; align-items:center; gap:14px; padding:16px 0; border-bottom:1px solid #E8DFD3; }
        .ed-testi { padding:28px 0; border-bottom:1px solid #E8DFD3; }
        .ed-job { border:1px solid #E8DFD3; padding:22px; cursor:pointer; transition:border-color .2s, transform .2s; }
        .ed-job:hover { border-color:#FF6B2B; transform:translateY(-3px); }
        .ed-lb-row { display:flex; align-items:center; gap:12px; padding:13px 0; border-bottom:1px solid #E8DFD3; cursor:pointer; }
        .ed-adopt { background:transparent; border:1px solid #171410; color:#171410; padding:5px 14px; font-size:11px; font-weight:600; cursor:pointer; transition:all .2s; }
        .ed-adopt:hover { background:#171410; color:white; }
        .ed-adopt.done { border-color:#16A34A; color:#16A34A; }
        @media(max-width:860px){ .ed-2col{ grid-template-columns:1fr!important; } .ed-3col{ grid-template-columns:1fr!important; } .ed-4col{ grid-template-columns:1fr 1fr!important; } .ed-nav-desktop{display:none!important;} .ed-hamburger{display:block!important;} }
        @media(max-width:480px){ .ed-4col{ grid-template-columns:1fr!important; } }
      `}</style>

      {/* NAV */}
      <nav style={{ position:'sticky', top:0, zIndex:200, background:'rgba(255,253,251,.96)', backdropFilter:'blur(10px)', borderBottom:'1px solid #E8DFD3', padding:'18px 40px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <Link to="/" style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:900, color:'#171410', textDecoration:'none' }}>Day1 Diaries</Link>
          <VisitorCounter />
        </div>
        <div className="ed-nav-desktop" style={{ display:'flex', alignItems:'center', gap:30 }}>
          <a href="#features" className="ed-link">Features</a>
          <a href="#habits" className="ed-link">Habits</a>
          <a href="#jobs" className="ed-link">Opportunities</a>
          <Link to="/login" className="ed-link">Sign In</Link>
          <Link to="/register" style={{ fontSize:13, fontWeight:600, color:'white', background:'#171410', padding:'10px 22px', textDecoration:'none' }}>Get Started</Link>
        </div>
        <button className="ed-hamburger" style={{ display:'none', background:'none', border:'1px solid #E8DFD3', padding:'6px 10px', fontSize:16 }} onClick={() => setMenuOpen(v => !v)}>{menuOpen ? '✕' : '☰'}</button>
      </nav>
      {menuOpen && (
        <div style={{ padding:'16px 40px', borderBottom:'1px solid #E8DFD3', display:'flex', flexDirection:'column', gap:14 }}>
          <a href="#features" className="ed-link" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#habits" className="ed-link" onClick={() => setMenuOpen(false)}>Habits</a>
          <a href="#jobs" className="ed-link" onClick={() => setMenuOpen(false)}>Opportunities</a>
          <Link to="/login" className="ed-link" onClick={() => setMenuOpen(false)}>Sign In</Link>
          <Link to="/register" className="ed-link" onClick={() => setMenuOpen(false)} style={{ color:'#FF6B2B', fontWeight:600 }}>Get Started →</Link>
        </div>
      )}

      {/* HERO — magazine masthead style */}
      <section style={{ maxWidth:860, margin:'0 auto', padding:'90px 24px 70px', textAlign:'center' }}>
        <Eyebrow>{hero.eyebrow || 'For Every Fresher, Everywhere'}</Eyebrow>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(2.4rem,5vw,4.4rem)', fontWeight:900, lineHeight:1.08, marginBottom:28 }}>
          {parts[0]}<em style={{ color:'#FF6B2B', fontStyle:'italic' }}>{highlight}</em>{parts[1]}
        </h1>
        <p style={{ fontSize:'1.15rem', color:'#5A4D3F', lineHeight:1.7, maxWidth:560, margin:'0 auto 36px', fontWeight:300 }}>
          {hero.subheadline || 'Now the world can read it. The community where freshers share raw stories, adopt life-changing habits, and grow together.'}
        </p>
        <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', marginBottom:56 }}>
          <Link to="/register" style={{ fontSize:14.5, fontWeight:600, color:'white', background:'#FF6B2B', padding:'15px 32px', textDecoration:'none' }}>{hero.cta_primary_text || 'Share My Day 1 ✍️'}</Link>
          <a href="#features" style={{ fontSize:14.5, fontWeight:600, color:'#171410', border:'1px solid #171410', padding:'15px 32px', textDecoration:'none' }}>{hero.cta_secondary_text || 'See How It Works →'}</a>
        </div>
        {hero.hero_image_urls?.[0] && (
          <img src={hero.hero_image_urls[0]} alt="" style={{ width:'100%', maxWidth:640, borderRadius:4, marginBottom:48 }} loading="lazy" />
        )}
        <div style={{ display:'flex', justifyContent:'center', gap:48, flexWrap:'wrap', paddingTop:36, borderTop:'1px solid #E8DFD3' }}>
          {[[c1,'Total Users'],[c2,'Stories Shared'],[c3,'Habit Adoptions']].map(([v,l]) => (
            <div key={l}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'2rem', fontWeight:900 }}>{v}</div>
              <div style={{ fontSize:11, color:'#8C7B6E', letterSpacing:'.08em', textTransform:'uppercase', marginTop:4 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      <Rule />

      {/* WHY US — editorial pull-quote style instead of neon AI section */}
      <section style={{ maxWidth:1080, margin:'0 auto', padding:'80px 40px' }}>
        <Eyebrow>Why Day1 Diaries</Eyebrow>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.8rem,3vw,2.6rem)', fontWeight:700, maxWidth:640, marginBottom:48, lineHeight:1.25 }}>
          Smart moderation, real peer support, and a system that nudges you toward the habits that actually stick.
        </h2>
        <div className="ed-3col" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:40 }}>
          {[
            ['🛡️','AI Content Guard','Smart moderation detects harmful content before it reaches anyone — your community stays safe, automatically.'],
            ['🎯','Avoid Day-1 Mistakes','Read real stories from thousands of freshers. Know what not to do before your first day even starts.'],
            ['🔥','Habits That Stick','Adopt a habit, log daily, watch your streak grow alongside thousands doing the same thing with you.'],
          ].map(([icon,title,text]) => (
            <div key={title}>
              <div style={{ fontSize:28, marginBottom:14 }}>{icon}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.15rem', fontWeight:700, marginBottom:10 }}>{title}</div>
              <div style={{ fontSize:13.5, color:'#5A4D3F', lineHeight:1.75 }}>{text}</div>
            </div>
          ))}
        </div>
      </section>

      <Rule />

      {/* HOW IT WORKS */}
      <section id="features" style={{ maxWidth:1080, margin:'0 auto', padding:'80px 40px' }}>
        <Eyebrow>How It Works</Eyebrow>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.8rem,3vw,2.6rem)', fontWeight:700, marginBottom:48 }}>Four steps. One unforgettable story.</h2>
        <div className="ed-4col" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:32 }}>
          {[['01','Sign Up Free','Profile in 60 seconds. No CV required.'],
            ['02','Write Your Day 1','Guided prompts. Raw, honest, entirely yours.'],
            ['03','Share & Connect','Post, follow, get comments from people who get it.'],
            ['04','Adopt & Grow','Pick a habit, log daily, climb the leaderboard.']].map(([n,t,d]) => (
            <div key={n}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.6rem', fontWeight:900, color:'#FF6B2B', marginBottom:10 }}>{n}</div>
              <div style={{ fontSize:14.5, fontWeight:700, marginBottom:8 }}>{t}</div>
              <div style={{ fontSize:13, color:'#8C7B6E', lineHeight:1.7 }}>{d}</div>
            </div>
          ))}
        </div>
      </section>

      <Rule />

      {/* FEATURES list (editorial list, not cards) */}
      <section style={{ maxWidth:1080, margin:'0 auto', padding:'80px 40px' }}>
        <Eyebrow>Platform Features</Eyebrow>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.8rem,3vw,2.6rem)', fontWeight:700, marginBottom:48 }}>Everything a fresher needs to thrive.</h2>
        <div className="ed-2col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
          {[
            ['📝','Story Sharing','Share text and images. Tag by category. Like, comment, save, and share.'],
            ['🤝','Social Network','Follow creators, see your feed, discover trending stories every day.'],
            ['🔥','Habit Tracking','Adopt habits from a curated library. Log daily, build streaks.'],
            ['🏆','Gamification','Earn points on every action. Climb 8 levels. Get recognised.'],
            ['💰','Points & Coins','Login daily, like, comment, share — every action earns points.'],
            ['🛡️','AI Safety','Smart AI moderation keeps content safe and respectful, 24/7.'],
          ].map(([icon,title,text]) => (
            <div key={title} style={{ display:'flex', gap:16, padding:'20px 24px', borderBottom:'1px solid #E8DFD3', borderRight:'1px solid #E8DFD3' }}>
              <div style={{ fontSize:22, flexShrink:0 }}>{icon}</div>
              <div>
                <div style={{ fontSize:14.5, fontWeight:700, marginBottom:4 }}>{title}</div>
                <div style={{ fontSize:13, color:'#8C7B6E', lineHeight:1.65 }}>{text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Rule />

      {/* POINTS */}
      <section style={{ maxWidth:1080, margin:'0 auto', padding:'80px 40px' }}>
        <Eyebrow>Earn While You Engage</Eyebrow>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.8rem,3vw,2.6rem)', fontWeight:700, marginBottom:48 }}>Every action earns you points.</h2>
        <div className="ed-4col" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0 }}>
          {[
            ['Daily Login','+10','🌅'],['Like a Story','+10','❤️'],['Comment','+20','💬'],['Share Story','+10','🔗'],
            ['Post a Story','+20','✍️'],['Habit Log','+10','🔥'],['Story Unlock','-10','🔒'],['Level Up','🏆','👑'],
          ].map(([action,pts,icon]) => (
            <div key={action} style={{ padding:'22px 18px', borderBottom:'1px solid #E8DFD3', borderRight:'1px solid #E8DFD3', textAlign:'center' }}>
              <div style={{ fontSize:20, marginBottom:8 }}>{icon}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.5rem', fontWeight:900, color: pts.startsWith?.('-') ? '#DC2626' : '#FF6B2B' }}>{pts}</div>
              <div style={{ fontSize:12, fontWeight:600, marginTop:4 }}>{action}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:'center', marginTop:40 }}>
          <Link to="/register" style={{ fontSize:14, fontWeight:600, color:'#FF6B2B', borderBottom:'1px solid #FF6B2B', textDecoration:'none' }}>Start Earning Points →</Link>
        </div>
      </section>

      <Rule />

      {/* CATEGORIES — editorial list */}
      <section style={{ maxWidth:760, margin:'0 auto', padding:'80px 24px' }}>
        <Eyebrow>Story Categories</Eyebrow>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.8rem,3vw,2.6rem)', fontWeight:700, marginBottom:32 }}>Every kind of first.</h2>
        {!loading && categories.map(c => (
          <div key={c.id} className="ed-cat" onClick={() => navigate(`/discover?cat=${encodeURIComponent(c.name)}`)}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <span style={{ fontSize:20 }}>{c.icon}</span>
              <span style={{ fontSize:15, fontWeight:600 }}>{c.name}</span>
            </div>
            <span style={{ fontSize:12.5, color: c.is_cta ? '#FF6B2B' : '#8C7B6E' }}>{c.is_cta ? 'Share yours today →' : `${(c.story_count||0).toLocaleString()} stories`}</span>
          </div>
        ))}
        <div style={{ textAlign:'center', marginTop:32 }}>
          <Link to="/discover" style={{ fontSize:14, fontWeight:600, color:'#171410', borderBottom:'1px solid #171410', textDecoration:'none' }}>Browse All Stories →</Link>
        </div>
      </section>

      <Rule />

      {/* HABITS */}
      <section id="habits" style={{ maxWidth:1080, margin:'0 auto', padding:'80px 40px' }}>
        <Eyebrow>Habit Change Module</Eyebrow>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.8rem,3vw,2.6rem)', fontWeight:700, marginBottom:48, maxWidth:600 }}>The feature that makes Day1 Diaries different.</h2>
        <div className="ed-2col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:48 }}>
          <div>
            {!loading && habits.map(h => (
              <div key={h.id} className="ed-habit">
                <span style={{ fontSize:20, width:30, textAlign:'center', flexShrink:0 }}>{h.icon || '✨'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600 }}>{h.title}</div>
                  <div style={{ fontSize:11.5, color:'#8C7B6E', marginTop:2 }}>{(h.adopters_count||0).toLocaleString()} adopters · {h.completion_rate||0}% completion</div>
                </div>
                <button className={`ed-adopt${adopted[h.id] ? ' done' : ''}`} onClick={() => { if (adopted[h.id]) navigate('/register'); else setAdopted(a => ({ ...a, [h.id]: true })) }}>
                  {adopted[h.id] ? '✓ Adopted' : 'Adopt'}
                </button>
              </div>
            ))}
          </div>
          <div style={{ background:'#171410', color:'white', padding:32 }}>
            {habits[0] && <>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.1rem', fontWeight:700, marginBottom:4 }}>{habits[0].icon} {habits[0].title}</div>
              <div style={{ fontSize:11.5, color:'rgba(255,255,255,.4)', marginBottom:20 }}>🔥 28-day streak</div>
            </>}
            <div style={{ display:'flex', gap:24, marginBottom:20 }}>
              {[['28','Days Done'],['72','Days Left'],['280','Points']].map(([v,l]) => (
                <div key={l}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.4rem', fontWeight:900, color:'#FF6B2B' }}>{v}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.35)' }}>{l}</div>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/register')} style={{ width:'100%', padding:13, background:'#FF6B2B', color:'white', border:'none', fontSize:13, fontWeight:700, cursor:'pointer' }}>Start Your Habit Journey →</button>
          </div>
        </div>
      </section>

      <Rule />

      {/* JOBS */}
      <section id="jobs" style={{ maxWidth:1080, margin:'0 auto', padding:'80px 40px' }}>
        <Eyebrow>Trending Opportunities</Eyebrow>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:16, marginBottom:48 }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.8rem,3vw,2.6rem)', fontWeight:700, margin:0 }}>Your Day 1 at a new job starts here.</h2>
          <Link to="/companies" style={{ fontSize:13, fontWeight:700, color:'#FF6B2B', textDecoration:'none' }}>Browse Companies →</Link>
        </div>
        {!loading && (
          <div className="ed-4col" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:18 }}>
            {(visibleJobs.length ? visibleJobs : [
              { title:'Frontend Engineer', department:'Engineering', location:'Remote', job_type:'Full-Time' },
              { title:'Product Designer', department:'Design', location:'Bangalore', job_type:'Full-Time' },
            ]).map((job, i) => (
              <div key={job.id || i} className="ed-job" onClick={() => navigate('/careers')}>
                <span style={{ fontSize:10, fontWeight:700, color: JOB_TYPE[job.job_type] || '#FF6B2B' }}>{job.job_type || 'Full-Time'}</span>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1rem', fontWeight:700, marginTop:10, marginBottom:4 }}>{job.title}</div>
                <div style={{ fontSize:12, color:'#8C7B6E' }}>{job.company_name || job.department} {job.location ? `· ${job.location}` : ''}</div>
              </div>
            ))}
          </div>
        )}
        {openJobs.length > 4 && (
          <div style={{ textAlign:'center', marginTop:28 }}>
            <button onClick={() => setShowAllJobs(v => !v)} style={{ background:'none', border:'1px solid #171410', padding:'10px 24px', fontSize:13, cursor:'pointer' }}>{showAllJobs ? '← Show Less' : `View ${openJobs.length - 4} More →`}</button>
          </div>
        )}
      </section>

      <Rule />

      {/* TESTIMONIALS */}
      <section style={{ maxWidth:760, margin:'0 auto', padding:'80px 24px' }}>
        <Eyebrow>Real Stories, Real Freshers</Eyebrow>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.8rem,3vw,2.6rem)', fontWeight:700, marginBottom:32 }}>What they're saying.</h2>
        {!loading && testimonials.map(t => (
          <div key={t.id} className="ed-testi">
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.2rem', fontStyle:'italic', lineHeight:1.7, marginBottom:14 }}>"{t.quote}"</div>
            <div style={{ fontSize:13, fontWeight:700 }}>{t.author_name} <span style={{ color:'#8C7B6E', fontWeight:400 }}>— {t.author_role}</span></div>
          </div>
        ))}
      </section>

      <Rule />

      {/* COMMUNITY */}
      <section id="community" style={{ maxWidth:1080, margin:'0 auto', padding:'80px 40px' }}>
        <Eyebrow>Community & Gamification</Eyebrow>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.8rem,3vw,2.6rem)', fontWeight:700, marginBottom:48, maxWidth:600 }}>Climb from Beginner to Legend.</h2>
        <div className="ed-2col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:48 }}>
          <div>
            {!loading && leaderboard.map((u, i) => (
              <div key={u.id} className="ed-lb-row" onClick={() => navigate(`/profile/${u.username}`)}>
                <div style={{ fontWeight:700, width:24, textAlign:'center', flexShrink:0 }}>{['🥇','🥈','🥉'][i] || i + 1}</div>
                <div style={{ width:32, height:32, borderRadius:'50%', background:getAvatarColor(u.full_name||u.username||''), display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white', flexShrink:0, overflow:'hidden' }}>
                  {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" /> : getInitials(u.full_name||u.username||'?')}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{u.full_name || u.username}</div>
                  <div style={{ fontSize:11, color:'#8C7B6E' }}>{LEVEL_ICONS[u.level] || '🥉'} {u.level}</div>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:'#FF6B2B' }}>{(u.score||0).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div>
            {[['🥉','Beginner','0–1K'],['🥈','Explorer','1K–5K'],['🥇','Achiever','5K–20K'],['🏆','Hero','20K–50K'],['🔥','Super Hero','50K–100K'],['👑','Legend','100K+']].map(([icon,name,pts]) => (
              <div key={name} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid #E8DFD3' }}>
                <span style={{ fontSize:18, width:26, textAlign:'center' }}>{icon}</span>
                <span style={{ fontSize:13.5, fontWeight:600, flex:1 }}>{name}</span>
                <span style={{ fontSize:11.5, color:'#8C7B6E' }}>{pts}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background:'#171410', color:'white', padding:'90px 40px', textAlign:'center' }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.9rem,4vw,3rem)', fontWeight:900, marginBottom:16, lineHeight:1.2 }}>
          {(data?.stats?.total_stories || 10000).toLocaleString()}+ freshers already shared <em style={{ color:'#FF6B2B' }}>their Day 1.</em><br/>What's yours?
        </h2>
        <p style={{ color:'rgba(255,255,255,.5)', marginBottom:32 }}>Every expert was once a fresher.</p>
        <Link to="/register" style={{ display:'inline-block', fontSize:15, fontWeight:700, color:'#171410', background:'white', padding:'16px 36px', textDecoration:'none' }}>Share My Day 1 Story ✍️</Link>
      </section>

      {/* BOTTOM SECTION (admin-customizable) */}
      {bottomSection.is_active !== false && (bottomSection.heading || bottomSection.image_urls?.length > 0) && (
        <section style={{ maxWidth:1080, margin:'0 auto', padding:'80px 40px', display:'grid', gridTemplateColumns: bottomSection.image_urls?.length ? '1fr 1fr' : '1fr', gap:40, alignItems:'center' }}>
          <div>
            {bottomSection.subheadline && <Eyebrow>{bottomSection.subheadline}</Eyebrow>}
            {bottomSection.heading && <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.7rem,3vw,2.3rem)', fontWeight:700, marginBottom:16 }}>{bottomSection.heading}</h2>}
            {bottomSection.body_text && <p style={{ fontSize:14, color:'#5A4D3F', lineHeight:1.75, marginBottom:24 }}>{bottomSection.body_text}</p>}
            {bottomSection.cta_text && <Link to={bottomSection.cta_link || '/register'} style={{ fontSize:14, fontWeight:600, color:'white', background:'#FF6B2B', padding:'14px 30px', textDecoration:'none' }}>{bottomSection.cta_text}</Link>}
          </div>
          {bottomSection.image_urls?.[0] && <img src={bottomSection.image_urls[0]} alt="" style={{ width:'100%', borderRadius:4 }} loading="lazy" />}
        </section>
      )}

      {/* FOOTER */}
      <footer style={{ borderTop:'1px solid #E8DFD3', padding:'48px 40px' }}>
        <div className="ed-3col" style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr', gap:32, marginBottom:36 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:900, marginBottom:10 }}>Day1 Diaries</div>
            <div style={{ fontSize:12.5, color:'#8C7B6E', lineHeight:1.7, maxWidth:240 }}>The community where freshers share raw first-day stories and grow together.</div>
          </div>
          {[
            ['Platform',[['Discover','/discover'],['Habits','/habits'],['Leaderboard','/leaderboard'],['Write','/write']]],
            ['Company',[['About','/about'],['Blog','/blog'],['Careers','/careers'],['Companies','/companies'],['Contact','/contact']]],
            ['Legal',[['Privacy','/privacy'],['Terms','/terms'],['Guidelines','/content-policy']]],
          ].map(([title, links]) => (
            <div key={title}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#8C7B6E', marginBottom:12 }}>{title}</div>
              {links.map(([label, href]) => (
                <div key={label} style={{ marginBottom:8 }}><Link to={href} className="ed-link" style={{ color:'#5A4D3F' }}>{label}</Link></div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ fontSize:12, color:'#8C7B6E', paddingTop:20, borderTop:'1px solid #E8DFD3' }}>© 2026 Day1 Diaries. Every expert was once a fresher.</div>
      </footer>
    </div>
  )
}
