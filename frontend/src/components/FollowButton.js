import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { toggleFollow, getFollow } from '../lib/api'
import { toast } from './Toast'

/*
  Usage:
    <FollowButton targetUserId="uuid-of-profile" targetUsername="john" size="sm|md" />

  Props:
    targetUserId  — UUID of the user to follow/unfollow
    targetUsername — display name for toast messages
    size          — 'sm' (compact pill) | 'md' (default)
    initialFollowing — optional boolean if you already know the follow state
    onFollowChange — optional callback(isFollowing) when state changes
*/
export default function FollowButton({ targetUserId, targetUsername, size = 'md', initialFollowing, onFollowChange }) {
  const { user, profile } = useAuth()
  const [following, setFollowing] = useState(initialFollowing ?? null)
  const [loading, setLoading] = useState(false)

  const isMe = profile?.id === targetUserId

  useEffect(() => {
    if (initialFollowing !== undefined) {
      setFollowing(initialFollowing)
      return
    }
    // Load follow state if not provided
    if (user?.id && targetUserId && targetUserId !== 'undefined') {
      getFollow(user.id, targetUserId).then(({ data }) => setFollowing(!!data))
    }
  }, [user?.id, targetUserId, initialFollowing])

  if (!user || isMe || !targetUserId || targetUserId === 'undefined') return null

  const handleClick = async (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (loading) return
    setLoading(true)
    const prev = following
    setFollowing(!prev) // optimistic
    const { data, error } = await toggleFollow(targetUserId)
    setLoading(false)
    if (error) {
      setFollowing(prev)
      toast.error(error.message || 'Failed to update follow')
      return
    }
    const isNowFollowing = data?.following ?? !prev
    setFollowing(isNowFollowing)
    onFollowChange?.(isNowFollowing)
    if (isNowFollowing) toast.success(`Following ${targetUsername || 'user'}!`)
  }

  const sm = size === 'sm'

  if (following === null) {
    return (
      <button disabled style={{
        padding: sm ? '4px 10px' : '7px 18px',
        borderRadius: 100, border: '1.5px solid #DDD3CA',
        background: 'transparent', color: '#8C7B6E',
        fontSize: sm ? 11 : 12.5, fontWeight: 600,
        fontFamily: 'inherit', cursor: 'default',
      }}>...</button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        padding: sm ? '4px 10px' : '7px 18px',
        borderRadius: 100,
        border: `1.5px solid ${following ? '#DDD3CA' : '#FF6B2B'}`,
        background: following ? 'transparent' : '#FF6B2B',
        color: following ? '#8C7B6E' : 'white',
        fontSize: sm ? 11 : 12.5,
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: loading ? 'default' : 'pointer',
        transition: 'all .2s',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {loading ? '...' : following ? 'Following ✓' : '+ Follow'}
    </button>
  )
}
