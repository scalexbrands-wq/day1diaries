import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getStories, getStoryCategories, getMyUnlockedStoryIds } from '../lib/api'
import StoryCard from '../components/StoryCard'
import AdSlot from '../components/AdSlot'

const AD_EVERY_N_STORIES = 5

const DEFAULT_CATS = ['All','First Day at Job','First Startup Experience','First Business Client','First College Day','First Failure','First Success','Habit Transformation']

const CAT_EMOJI = {
  'All': '✨',
  'First Day at Job': '💼',
  'First Startup Experience': '🚀',
  'First Business Client': '🤝',
  'First College Day': '🎓',
  'First Failure': '💥',
  'First Success': '🏆',
  'Habit Transformation': '🔥',
}
const emojiFor = (c) => CAT_EMOJI[c] || '🌟'

export default function Discover() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [params] = useSearchParams()
  const [stories, setStories] = useState([])
  const [cat, setCat] = useState(params.get('category') || 'All')
  const [search, setSearch] = useState(params.get('q') || '')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState('latest')
  const [cats, setCats] = useState(DEFAULT_CATS)
  // Track IDs the current user has already unlocked — loaded from DB + updated locally
  const [unlockedIds, setUnlockedIds] = useState(new Set())
  const sentinelRef = useRef(null)
  const LIMIT = 10

  useEffect(() => {
    getStoryCategories().then(({ data }) => {
      if (data?.length) {
        const names = data.map(c => c.name)
        const fromUrl = params.get('category')
        setCats(['All', ...(fromUrl && !names.includes(fromUrl) ? [fromUrl, ...names] : names)])
      }
    })
    // Restore unlocked story IDs from DB so refreshing doesn't re-lock paid stories
    if (user) {
      getMyUnlockedStoryIds().then(({ data }) => {
        if (data?.length) setUnlockedIds(new Set(data))
      })
    }
  }, [user])

  const loadStories = useCallback(async (reset = false) => {
    const p = reset ? 0 : page
    if (reset) setLoading(true)
    else setLoadingMore(true)
    const { data } = await getStories({ page: p, limit: LIMIT, category: cat === 'All' ? null : cat, search: search || null })
    const d = data || []
    setStories(prev => {
      const merged = reset ? d : [...prev, ...d]
      // Re-sort the whole accumulated list (not just the new page) so
      // "Trending" stays a real global order as more pages load in.
      return sort === 'popular' ? [...merged].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0)) : merged
    })
    setHasMore(d.length === LIMIT)
    setPage(p + 1)
    setLoading(false)
    setLoadingMore(false)
  }, [page, cat, search, sort])

  // Reset to page 0 whenever the filters change
  useEffect(() => { setPage(0); loadStories(true) }, [cat, search, sort])

  // Lazy-load the next page once the sentinel at the bottom of the list
  // scrolls into view — no "Load More" click needed.
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading || loadingMore) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadStories()
    }, { rootMargin: '300px' })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, loadStories])

  // Stable reference — passed to every (memo'd) StoryCard in the grid.
  const handleUnlock = useCallback((storyId) => {
    setUnlockedIds(prev => new Set([...prev, storyId]))
  }, [])

  const isStoryLocked = (story) => {
    if (!story.profiles?.is_private) return false
    if (user?.id === story.user_id) return false
    if (unlockedIds.has(story.id)) return false
    return true
  }

  return (
    <div style={{ padding: '16px', maxWidth: 1180, margin: '0 auto' }}>
      <style>{`
        @keyframes discGradShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .disc-grid { display: flex; flex-direction: column; gap: 12px; }
        .disc-layout { display:grid; grid-template-columns:1fr 280px; gap:24px; align-items:start; }
        .disc-layout > * { min-width:0; }
        .disc-sidebar-sticky { position:sticky; top:24px; }
        @media(max-width:860px) { .disc-layout { grid-template-columns:1fr; } .disc-sidebar { order:99; } .disc-sidebar-sticky { position:static; } }
        .disc-eyebrow { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#fff; background:linear-gradient(90deg,#FF6B2B,#FF3DAA); padding:5px 12px; border-radius:100px; margin-bottom:10px; }
        .disc-title { font-family:'Playfair Display',serif; font-size:clamp(1.5rem,3vw,2.1rem); font-weight:900; margin:0 0 4px;
          background:linear-gradient(120deg,#FF6B2B 0%,#FF3DAA 45%,#7C3AED 100%); background-size:200% 100%;
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:discGradShift 6s ease infinite; }
        .disc-subtitle { font-size:13px; color:#8C7B6E; margin:0 0 18px; }
        .disc-search-row { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; align-items:center; }
        .disc-search-wrap { position:relative; flex:1; min-width:220px; max-width:340px; }
        .disc-search-input { width:100%; padding:11px 16px 11px 38px; border-radius:100px; border:1.5px solid #ECE2D8; font-size:13.5px; font-family:'DM Sans',sans-serif; outline:none; background:#fff; transition:border-color .2s, box-shadow .2s; }
        .disc-search-input:focus { border-color:#FF6B2B; box-shadow:0 0 0 3px rgba(255,107,43,.12); }
        .disc-search-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); font-size:14px; opacity:.5; pointer-events:none; }
        .disc-sort-group { display:flex; gap:4px; background:#F0EAE4; border-radius:100px; padding:4px; }
        .disc-sort-btn { border:none; background:transparent; padding:7px 14px; border-radius:100px; font-size:12.5px; font-weight:700; font-family:inherit; cursor:pointer; color:#6B5347; transition:all .2s; white-space:nowrap; }
        .disc-sort-btn.active { background:linear-gradient(90deg,#FF6B2B,#FF3DAA); color:#fff; box-shadow:0 2px 8px rgba(255,61,170,.3); }
        .disc-cats { display:flex; gap:8px; flex-wrap:nowrap; overflow-x:auto; margin-bottom:22px; padding-bottom:4px; scrollbar-width:none; }
        .disc-cats::-webkit-scrollbar { display:none; }
        .disc-cat-chip { flex-shrink:0; display:inline-flex; align-items:center; gap:6px; border:1.5px solid #ECE2D8; background:#fff; color:#4A2800; padding:8px 16px; border-radius:100px; font-size:12.5px; font-weight:600; cursor:pointer; transition:all .2s; font-family:inherit; }
        .disc-cat-chip:hover { border-color:#FF6B2B; color:#FF6B2B; }
        .disc-cat-chip.active { background:linear-gradient(90deg,#FF6B2B,#FF3DAA,#7C3AED); border-color:transparent; color:#fff; box-shadow:0 3px 10px rgba(124,58,237,.3); }
        .disc-empty { text-align:center; padding:48px 20px; border-radius:20px; background:linear-gradient(135deg,rgba(255,107,43,.06),rgba(124,58,237,.06)); border:1.5px dashed #ECE2D8; }
        .disc-empty-emoji { font-size:42px; margin-bottom:10px; }
        .disc-empty h3 { font-family:'Playfair Display',serif; font-size:18px; margin:0 0 6px; }
        .disc-empty p { font-size:13px; color:#8C7B6E; margin:0 0 18px; }
        .disc-empty-btn { border:none; background:linear-gradient(90deg,#FF6B2B,#FF3DAA,#7C3AED); color:#fff; font-weight:700; font-size:13px; padding:11px 26px; border-radius:100px; cursor:pointer; font-family:inherit; box-shadow:0 4px 16px rgba(124,58,237,.3); }
        @media(max-width:600px) { .disc-search-row { flex-direction: column !important; align-items:stretch; } .disc-search-wrap { max-width:none; } }
      `}</style>

      <div className="disc-layout">
        <div>
          <span className="disc-eyebrow">🌍 explore the feed</span>
          <h2 className="disc-title">Discover Stories</h2>
          <p className="disc-subtitle">Real Day 1s, real people — find the one that hits different.</p>

          <div className="disc-search-row">
            <div className="disc-search-wrap">
              <span className="disc-search-icon">🔎</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search stories by title..."
                className="disc-search-input"
              />
            </div>
            <div className="disc-sort-group">
              <button className={`disc-sort-btn ${sort === 'latest' ? 'active' : ''}`} onClick={() => setSort('latest')}>🆕 Latest</button>
              <button className={`disc-sort-btn ${sort === 'popular' ? 'active' : ''}`} onClick={() => setSort('popular')}>🔥 Trending</button>
            </div>
          </div>

          <div className="disc-cats">
            {cats.map(c => (
              <button key={c} className={`disc-cat-chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
                <span>{emojiFor(c)}</span>{c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div className="story-list-grid">
              {stories.length === 0 ? (
                <div className="disc-empty grid-full-span">
                  <div className="disc-empty-emoji">🫥</div>
                  <h3>No stories here... yet</h3>
                  <p>Try a different vibe, or be the one who starts it.</p>
                  <button className="disc-empty-btn" onClick={() => navigate('/write')}>Share Yours →</button>
                </div>
              ) : (
                stories.map((s, i) => (
                  <React.Fragment key={s.id}>
                    <StoryCard
                      story={s}
                      isLocked={isStoryLocked(s)}
                      onUnlock={handleUnlock}
                    />
                    {(i + 1) % AD_EVERY_N_STORIES === 0 && <div key={`ad-${i}`} className="grid-full-span"><AdSlot placement="discover" variant="card" /></div>}
                  </React.Fragment>
                ))
              )}
              {/* Sentinel — scrolling this into view triggers the next page */}
              {hasMore && stories.length > 0 && <div ref={sentinelRef} className="grid-full-span" style={{ height: 1 }} />}
              {loadingMore && <div className="loading-center grid-full-span" style={{ padding: '12px 0' }}><div className="spinner" /></div>}
              {!hasMore && stories.length > 0 && (
                <p className="grid-full-span" style={{ textAlign: 'center', fontSize: 12, color: '#B0A89F', padding: '8px 0' }}>You've reached the end ✨</p>
              )}
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="disc-sidebar">
          <div className="disc-sidebar-sticky">
            <AdSlot placement="discover" variant="banner" />
          </div>
        </div>
      </div>
    </div>
  )
}
