import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getStories, getStoryCategories } from '../lib/api'
import StoryCard from '../components/StoryCard'

const DEFAULT_CATS = ['All','First Day at Job','First Startup Experience','First Business Client','First College Day','First Failure','First Success','Habit Transformation']

export default function Discover() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [stories, setStories] = useState([])
  const [cat, setCat] = useState('All')
  const [search, setSearch] = useState(params.get('q') || '')
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('latest')
  const [cats, setCats] = useState(DEFAULT_CATS)

  useEffect(() => {
    getStoryCategories().then(({ data }) => {
      if (data?.length) setCats(['All', ...data.map(c => c.name)])
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    getStories({ page:0, limit:30, category: cat==='All'?null:cat, search: search||null }).then(({ data }) => {
      let d = data || []
      if (sort === 'popular') d = [...d].sort((a,b) => (b.likes_count||0)-(a.likes_count||0))
      setStories(d)
      setLoading(false)
    })
  }, [cat, search, sort])

  return (
    <div style={{ padding:'16px', maxWidth:900 }}>
      <style>{`.disc-grid{display:flex;flex-direction:column;gap:12px} @media(max-width:600px){.disc-search{flex-direction:column!important}}`}</style>
      <div className="disc-search" style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stories by title..." className="form-control" style={{ maxWidth:280 }} />
        <select value={sort} onChange={e => setSort(e.target.value)} className="form-control" style={{ width:'auto' }}>
          <option value="latest">Latest</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
        {cats.map(c => <button key={c} className={`tag ${cat===c?'active':''}`} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      {loading ? <div className="loading-center"><div className="spinner"/></div> : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {stories.length === 0
            ? <div className="empty-state"><div className="empty-state-icon">🔍</div><h3>No stories found</h3><p>Try a different search or category</p><button className="btn btn-primary" onClick={() => navigate('/write')}>Share Yours →</button></div>
            : stories.map(s => <StoryCard key={s.id} story={s} />)}
        </div>
      )}
    </div>
  )
}
