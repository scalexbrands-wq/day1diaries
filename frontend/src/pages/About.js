import React, { useEffect, useState } from 'react'
import SiteLayout, { toEmbedUrl } from './SiteLayout'
import { getAboutSections } from '../lib/api'

export default function About() {
  const [sections, setSections] = useState(null)

  useEffect(() => {
    getAboutSections().then(({ data }) => setSections(data || []))
  }, [])

  return (
    <SiteLayout eyebrow="About" title="About Day1 Diaries" subtitle="The story behind the community, our mission, and the team building it.">
      {sections === null && (
        <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}>
          <div style={{ width:28, height:28, border:'3px solid rgba(255,107,43,.2)', borderTopColor:'#FF6B2B', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {sections?.length === 0 && (
        <div className="site-card" style={{ textAlign:'center', color:'#8C7B6E' }}>More about us coming soon.</div>
      )}

      {sections?.map((s) => {
        const embed = toEmbedUrl(s.video_url)
        return (
          <div key={s.id} className="site-card" style={{ marginBottom:20 }}>
            {s.title && <h2 style={{ marginTop:0 }}>{s.title}</h2>}
            {s.image_url && (
              <img src={s.image_url} alt={s.title || ''} style={{ width:'100%', maxHeight:360, objectFit:'cover', borderRadius:12, marginBottom:16 }}  loading="lazy" />
            )}
            {s.content && <p style={{ whiteSpace:'pre-wrap' }}>{s.content}</p>}
            {embed && (
              <div style={{ position:'relative', paddingBottom:'56.25%', borderRadius:12, overflow:'hidden', marginTop:16 }}>
                <iframe
                  src={embed}
                  title={s.title || 'About video'}
                  style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        )
      })}
    </SiteLayout>
  )
}
