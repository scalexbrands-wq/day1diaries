import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTribute } from '../lib/api'
import ShareButton from '../components/ShareButton'
import Seo from '../components/Seo'

export default function Tribute() {
  const { slug } = useParams()
  const [tribute, setTribute] = useState(undefined) // undefined = loading, null = not found

  useEffect(() => {
    getTribute(slug).then(({ data, error }) => setTribute(error ? null : data))
  }, [slug])

  if (tribute === undefined) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: 28, height: 28, border: '3px solid rgba(255,107,43,.2)', borderTopColor: '#FF6B2B', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (tribute === null) {
    return (
      <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center', padding: '0 16px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎁</div>
        <h2 style={{ fontFamily: "'Playfair Display',serif" }}>Tribute not found</h2>
        <p style={{ color: '#8C7B6E', marginBottom: 20 }}>This surprise may still be on its way, or the link may be incorrect.</p>
        <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>Go to Day1 Diaries</Link>
      </div>
    )
  }

  const tributeUrl = `${window.location.origin}/tribute/${slug}`

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Seo
        title={`A Surprise For ${tribute.recipient_name} — Day1 Diaries`}
        description={tribute.message || `${tribute.author_name}'s story, turned into a tribute.`}
        image={tribute.gift_image_url}
        path={`/tribute/${slug}`}
      />

      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#FF6B2B', letterSpacing: '.05em' }}>{tribute.category_emoji} A SURPRISE FOR {tribute.recipient_name?.toUpperCase()}</div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, margin: '8px 0 0' }}>{tribute.category_label} — {tribute.gift_type_label}</h1>
      </div>

      {tribute.gift_image_url ? (
        <img src={tribute.gift_image_url} alt="Tribute certificate" style={{ width: '100%', borderRadius: 16, boxShadow: '0 12px 36px rgba(26,8,0,.15)' }} />
      ) : (
        <div className="loading-center" style={{ padding: 40, textAlign: 'center', color: '#8C7B6E' }}>The tribute design is being prepared…</div>
      )}

      <div style={{ background: '#FBF6EC', borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#8C7B6E', marginBottom: 6 }}>FROM {tribute.sender_name?.toUpperCase()}</div>
        <div style={{ fontSize: 15, fontStyle: 'italic', color: '#3A2410' }}>“{tribute.message}”</div>
      </div>

      {tribute.ai_tribute_text && (
        <div style={{ background: '#0B1E3D', color: 'white', borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#D4AF37', marginBottom: 6 }}>✨ TRIBUTE</div>
          <div style={{ fontSize: 14.5 }}>{tribute.ai_tribute_text}</div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <Link to={`/story/${tribute.story_id}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>Read the Full Story →</Link>
        <ShareButton text={`I received a Day1 Diaries surprise!`} url={tributeUrl} label="Share" />
      </div>
    </div>
  )
}
