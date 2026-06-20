import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function LegalPage({ title, updated, children }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#FDF6EE', color:'#1A0800', minHeight:'100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');
        .legal-content h2 { font-family:'Playfair Display',serif; font-size:1.35rem; font-weight:900; color:#1A0800; margin:28px 0 10px; }
        .legal-content h3 { font-family:'Playfair Display',serif; font-size:1.1rem; font-weight:700; color:#1A0800; margin:20px 0 6px; }
        .legal-content p { font-size:14px; line-height:1.8; color:#4A2800; margin-bottom:14px; }
        .legal-content ul { margin:0 0 14px 20px; padding:0; }
        .legal-content li { font-size:14px; line-height:1.8; color:#4A2800; margin-bottom:6px; }
        .legal-content a { color:#FF6B2B; text-decoration:underline; }
        .legal-content strong { color:#1A0800; }
        .legal-nav-link { font-size:12.5px; font-weight:500; color:#4A2800; text-decoration:none; padding:6px 12px; border-radius:100px; transition:all .2s; white-space:nowrap; display:inline-block; }
        .legal-nav-link:hover,.legal-nav-link.active { background:rgba(255,107,43,.1); color:#FF6B2B; }
        .legal-hamburger { display:none; background:transparent; border:1.5px solid rgba(26,8,0,.15); border-radius:8px; padding:6px 10px; font-size:18px; cursor:pointer; line-height:1; }
        .legal-nav-desktop { display:flex; align-items:center; justify-content:space-between; }
        @media(max-width:640px){
          .legal-hamburger { display:block !important; }
          .legal-nav-desktop { display:none !important; }
          .legal-subnav { overflow-x:auto; white-space:nowrap; padding:10px 16px; scrollbar-width:none; }
          .legal-subnav::-webkit-scrollbar { display:none; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:'rgba(253,246,238,.95)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,107,43,.1)' }}>
        <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <Link to="/" style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:900, color:'#FF6B2B', textDecoration:'none' }}>
            Day<span style={{color:'#1A0800'}}>1</span> Diaries
          </Link>
          <div className="legal-nav-desktop" style={{gap:12}}>
            <button onClick={()=>navigate(-1)} style={{ background:'transparent', border:'1.5px solid rgba(26,8,0,.15)', borderRadius:100, padding:'7px 16px', fontSize:12.5, fontWeight:600, color:'#1A0800', cursor:'pointer', fontFamily:'inherit' }}>← Back</button>
          </div>
          <button className="legal-hamburger" onClick={()=>setMenuOpen(o=>!o)}>{menuOpen?'✕':'☰'}</button>
        </div>
        {menuOpen && (
          <div style={{ borderTop:'1px solid rgba(255,107,43,.08)', padding:'10px 20px 14px', background:'white' }}>
            {[['About','/about'],['Blog','/blog'],['Careers','/careers'],['Contact','/contact']].map(([l,to])=>(
              <Link key={to} to={to} onClick={()=>setMenuOpen(false)} style={{ display:'block', padding:'9px 0', fontSize:14, fontWeight:500, color:'#4A2800', textDecoration:'none', borderBottom:'1px solid #F0EAE4' }}>{l}</Link>
            ))}
            <button onClick={()=>{setMenuOpen(false);navigate(-1)}} style={{ marginTop:10, background:'transparent', border:'1.5px solid rgba(26,8,0,.15)', borderRadius:100, padding:'9px 20px', fontSize:13, fontWeight:600, color:'#1A0800', cursor:'pointer', fontFamily:'inherit', width:'100%' }}>← Back</button>
          </div>
        )}
      </nav>

      {/* ── POLICY SUB-NAV (scrollable on mobile) ── */}
      <div className="legal-subnav" style={{ display:'flex', gap:4, flexWrap:'nowrap', padding:'12px 20px', maxWidth:760, margin:'0 auto', overflowX:'auto' }}>
        {[
          ['Privacy Policy','/privacy'],
          ['Terms of Service','/terms'],
          ['Content Policy','/content-policy'],
          ['Posting Guidelines','/posting-guidelines'],
          ['Membership & Refund Policy','/refund-policy'],
        ].map(([label,to])=>(
          <Link key={to} to={to} className={`legal-nav-link${title===label?' active':''}`}>{label}</Link>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth:760, margin:'0 auto', padding:'20px 20px 80px' }}>
        <span style={{ fontSize:11, fontWeight:600, letterSpacing:'.12em', textTransform:'uppercase', color:'#FF6B2B', marginBottom:8, display:'block' }}>Legal</span>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(1.4rem,5vw,2.4rem)', fontWeight:900, lineHeight:1.15, marginBottom:6, marginTop:0 }}>{title}</h1>
        <p style={{ fontSize:12, color:'#8C7B6E', marginBottom:28 }}>Last updated: {updated}</p>
        <div className="legal-content">{children}</div>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ background:'#1A0800', padding:'28px 20px', textAlign:'center' }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:900, color:'#FF6B2B', marginBottom:8 }}>Day1 Diaries</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.35)' }}>© 2026 Day1 Diaries. All rights reserved.</div>
      </footer>
    </div>
  )
}
