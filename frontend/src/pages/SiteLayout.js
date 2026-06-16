import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

/* ── Shared layout for About, Blog, Careers, Contact pages ── */
export default function SiteLayout({ eyebrow, title, subtitle, children, wide }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#FDF6EE', color:'#1A0800', minHeight:'100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');
        .site-content h2 { font-family:'Playfair Display',serif; font-size:1.35rem; font-weight:900; color:#1A0800; margin:28px 0 10px; }
        .site-content p { font-size:14.5px; line-height:1.8; color:#4A2800; margin-bottom:14px; }
        .site-nav-link { font-size:13.5px; font-weight:500; color:#4A2800; text-decoration:none; transition:color .2s; }
        .site-nav-link:hover { color:#FF6B2B; }
        .site-input { width:100%; padding:11px 14px; border-radius:10px; border:1.5px solid rgba(26,8,0,.12); font-size:14px; font-family:inherit; background:white; color:#1A0800; box-sizing:border-box; }
        .site-input:focus { outline:none; border-color:#FF6B2B; }
        .site-label { display:block; font-size:12.5px; font-weight:600; color:#4A2800; margin-bottom:6px; }
        .site-btn { display:inline-flex; align-items:center; justify-content:center; padding:12px 28px; border-radius:100px; font-size:14px; font-weight:600; border:none; cursor:pointer; background:#FF6B2B; color:white; font-family:inherit; transition:all .2s; }
        .site-btn:hover { background:#FF4500; }
        .site-btn:disabled { opacity:.6; cursor:default; }
        .site-card { background:white; border-radius:16px; padding:24px; box-shadow:0 2px 16px rgba(26,8,0,.05); }
        .site-nav-desktop { display:flex; align-items:center; gap:20; }
        .site-hamburger { display:none; background:transparent; border:1.5px solid rgba(26,8,0,.15); border-radius:8px; padding:6px 10px; font-size:18px; cursor:pointer; line-height:1; }
        .site-form-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
        .site-kpi-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:20px; }
        .site-kpi-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; }
        .site-blog-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:18px; }

        @media(max-width:640px){
          .site-nav-desktop { display:none !important; }
          .site-hamburger { display:block !important; }
          .site-card { padding:16px !important; border-radius:12px !important; }
          .site-form-row { grid-template-columns:1fr !important; gap:0 !important; }
          .site-kpi-3 { grid-template-columns:1fr 1fr !important; }
          .site-kpi-4 { grid-template-columns:1fr 1fr !important; }
          .site-blog-grid { grid-template-columns:1fr !important; }
        }
        @media(max-width:360px){
          .site-kpi-3 { grid-template-columns:1fr !important; }
          .site-kpi-4 { grid-template-columns:1fr 1fr !important; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:'rgba(253,246,238,.95)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,107,43,.1)' }}>
        <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <Link to="/" style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:900, color:'#FF6B2B', textDecoration:'none' }}>
            Day<span style={{color:'#1A0800'}}>1</span> Diaries
          </Link>
          {/* Desktop */}
          <div className="site-nav-desktop">
            {[['About','/about'],['Blog','/blog'],['Careers','/careers'],['Contact','/contact']].map(([l,to])=>(
              <Link key={to} to={to} className="site-nav-link">{l}</Link>
            ))}
            <button onClick={()=>navigate(-1)} style={{ background:'transparent', border:'1.5px solid rgba(26,8,0,.15)', borderRadius:100, padding:'7px 16px', fontSize:12.5, fontWeight:600, color:'#1A0800', cursor:'pointer', fontFamily:'inherit' }}>← Back</button>
          </div>
          {/* Hamburger */}
          <button className="site-hamburger" onClick={()=>setMenuOpen(o=>!o)}>{menuOpen?'✕':'☰'}</button>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ borderTop:'1px solid rgba(255,107,43,.08)', padding:'12px 20px 16px', background:'white' }}>
            {[['About','/about'],['Blog','/blog'],['Careers','/careers'],['Contact','/contact']].map(([l,to])=>(
              <Link key={to} to={to} onClick={()=>setMenuOpen(false)} style={{ display:'block', padding:'10px 0', fontSize:14, fontWeight:500, color:'#4A2800', textDecoration:'none', borderBottom:'1px solid #F0EAE4' }}>{l}</Link>
            ))}
            <button onClick={()=>{setMenuOpen(false);navigate(-1)}} style={{ marginTop:12, background:'transparent', border:'1.5px solid rgba(26,8,0,.15)', borderRadius:100, padding:'9px 20px', fontSize:13, fontWeight:600, color:'#1A0800', cursor:'pointer', fontFamily:'inherit', width:'100%' }}>← Back</button>
          </div>
        )}
      </nav>

      {/* ── HEADER ── */}
      <div style={{ maxWidth: wide ? 1000 : 720, margin:'0 auto', padding:'28px 20px 0' }}>
        {eyebrow && <span style={{ fontSize:11, fontWeight:600, letterSpacing:'.12em', textTransform:'uppercase', color:'#FF6B2B', marginBottom:8, display:'block' }}>{eyebrow}</span>}
        {title && <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.4rem,5vw,2.6rem)', fontWeight:900, lineHeight:1.15, marginBottom:subtitle?8:0, marginTop:0 }}>{title}</h1>}
        {subtitle && <p style={{ fontSize:14, color:'#8C7B6E', lineHeight:1.7, marginBottom:0 }}>{subtitle}</p>}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: wide ? 1000 : 720, margin:'0 auto', padding:'20px 20px 80px' }}>
        {children}
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ background:'#1A0800', padding:'28px 20px', textAlign:'center' }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:900, color:'#FF6B2B', marginBottom:10 }}>Day1 Diaries</div>
        <div style={{ display:'flex', gap:12, justifyContent:'center', marginBottom:10, flexWrap:'wrap' }}>
          {[['About','/about'],['Blog','/blog'],['Careers','/careers'],['Contact','/contact'],['Privacy','/privacy'],['Terms','/terms']].map(([l,to])=>(
            <Link key={to} to={to} style={{ fontSize:12, color:'rgba(255,255,255,.5)', textDecoration:'none' }}>{l}</Link>
          ))}
        </div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,.25)' }}>© 2026 Day1 Diaries. All rights reserved.</div>
      </footer>
    </div>
  )
}

export function toEmbedUrl(url) {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return url
}
