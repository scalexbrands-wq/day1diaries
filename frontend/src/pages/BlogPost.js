import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import SiteLayout from './SiteLayout'
import { getBlogPost } from '../lib/api'
import { format } from 'date-fns'

export default function BlogPost() {
  const { slug } = useParams()
  const [post, setPost] = useState(undefined) // undefined = loading, null = not found

  useEffect(() => {
    getBlogPost(slug).then(({ data, error }) => setPost(error ? null : data))
  }, [slug])

  if (post === undefined) {
    return (
      <SiteLayout>
        <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}>
          <div style={{ width:28, height:28, border:'3px solid rgba(255,107,43,.2)', borderTopColor:'#FF6B2B', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </SiteLayout>
    )
  }

  if (post === null) {
    return (
      <SiteLayout eyebrow="Blog" title="Post not found">
        <div className="site-card" style={{ textAlign:'center' }}>
          <p>This blog post doesn't exist or hasn't been published yet.</p>
          <Link to="/blog" className="site-btn" style={{ textDecoration:'none', display:'inline-flex' }}>← Back to Blog</Link>
        </div>
      </SiteLayout>
    )
  }

  return (
    <SiteLayout
      eyebrow="Blog"
      title={post.title}
      subtitle={[post.author_name, post.published_at && format(new Date(post.published_at), 'MMMM d, yyyy')].filter(Boolean).join(' · ')}
    >
      {post.cover_image && (
        <img src={post.cover_image} alt={post.title} style={{ width:'100%', maxHeight:400, objectFit:'cover', borderRadius:16, marginBottom:24 }} />
      )}
      <div className="site-content" style={{ whiteSpace:'pre-wrap' }}>
        <p>{post.content}</p>
      </div>
      <Link to="/blog" className="site-btn" style={{ textDecoration:'none', display:'inline-flex', marginTop:20, background:'transparent', border:'1.5px solid rgba(26,8,0,.15)', color:'#1A0800' }}>← Back to Blog</Link>
    </SiteLayout>
  )
}
