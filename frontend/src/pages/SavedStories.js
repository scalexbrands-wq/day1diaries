import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getSavedStories } from '../lib/api'
import StoryCard from '../components/StoryCard'

export default function SavedStories() {
  const { user } = useAuth()
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSavedStories(user.id).then(({ data }) => {
      setStories((data||[]).map(s => s.stories).filter(Boolean))
      setLoading(false)
    })
  }, [user.id])

  if (loading) return <div className="loading-center"><div className="spinner"/></div>

  return (
    <div style={{ padding:'16px', maxWidth:960 }}>
      <h2 style={{ marginBottom:20 }}>Saved Stories</h2>
      {stories.length === 0
        ? <div className="empty-state"><div className="empty-state-icon">🔖</div><h3>No saved stories yet</h3><p>Tap the bookmark icon on any story to save it for later.</p></div>
        : <div className="story-list-grid">{stories.map(s => <StoryCard key={s.id} story={s}/>)}</div>
      }
    </div>
  )
}
