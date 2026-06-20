import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getGiftModuleStatus } from '../lib/api'
import SurpriseWizard from './SurpriseWizard'

export default function SurpriseAFriendButton({ storyId, storyTitle, authorName, lockedAuthorUsername, size = 'sm', compact = false, fullWidth = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [enabled, setEnabled] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    getGiftModuleStatus().then(({ data }) => setEnabled(data?.enabled !== false && data?.allowedForMe !== false))
  }, [])

  if (!enabled) return null

  const handleClick = (e) => {
    e?.stopPropagation()
    if (!user) return navigate('/login')
    setOpen(true)
  }

  return (
    <>
      {compact ? (
        <button className="story-action" onClick={handleClick} title="Surprise A Friend">
          🎁
        </button>
      ) : (
        <button
          onClick={handleClick}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            width: fullWidth ? '100%' : undefined,
            padding: size === 'sm' ? '6px 12px' : '11px 20px',
            borderRadius: 100, background: 'transparent', border: '1.5px solid rgba(255,107,43,.3)',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: size === 'sm' ? 13.5 : 14, fontWeight: 700,
            color: '#FF6B2B', transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,43,.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          🎁 Surprise A Friend
        </button>
      )}
      {open && <SurpriseWizard initialStoryId={storyId} initialStoryTitle={storyTitle} initialAuthorName={authorName} lockedAuthorUsername={lockedAuthorUsername} onClose={() => setOpen(false)} />}
    </>
  )
}
