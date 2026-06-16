import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SiteLayout from './SiteLayout'
import { getBlogPosts } from '../lib/api'
import { formatDistanceToNow } from 'date-fns'

export default function Blog() {
  const [posts, setPosts] = useState(null)

  useEffect(() => {
    getBlogPosts().then(({ data }) => setPosts(data || []))
  }, [])

  return (
    <SiteLayout eyebrow="Blog" title="Day1 Diaries Blog" subtitle="Stories, habit science, and updates from the team." wide>
      {posts === null && (
        <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}>
          <div style={{ width:28, height:28, border:'3px solid rgba(255,107,43,.2)', borderTopColor:'#FF6B2B', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {posts?.length === 0 && (
        <div className="site-card" style={{ textAlign:'center', color:'#8C7B6E' }}>No blog posts yet — check back soon!</div>
      )}

      <div className="site-blog-grid">
        {posts?.map(post => (
          <Link key={post.id} to={`/blog/${post.slug}`} className="site-card" style={{ textDecoration:'none', color:'inherit', display:'block', transition:'all .2s' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 10px 28px rgba(255,107,43,.12)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 2px 16px rgba(26,8,0,.05)'}}>
            {post.cover_image && (
              <img src={post.cover_image} alt={post.title} style={{ width:'100%', height:160, objectFit:'cover', borderRadius:12, marginBottom:14 }} />
            )}
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.1rem', fontWeight:700, lineHeight:1.3, marginBottom:8, color:'#1A0800' }}>{post.title}</div>
            {post.excerpt && <p style={{ fontSize:13, color:'#8C7B6E', lineHeight:1.6, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom:10 }}>{post.excerpt}</p>}
            <div style={{ fontSize:12, color:'#8C7B6E' }}>
              {post.author_name && <span>{post.author_name} · </span>}
              {post.published_at && <span>{formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}</span>}
            </div>
          </Link>
        ))}
      </div>
    </SiteLayout>
  )
}
