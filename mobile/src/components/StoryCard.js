import React, { useState, memo } from 'react'
import { View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { toggleLike } from '../lib/api'

function timeAgo(iso) {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function initials(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase()
}

function StoryCard({ story, onPress }) {
  const author = story.profiles || {}
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(story.likes_count || 0)

  const handleLike = async () => {
    setLiked(l => !l) // optimistic
    setLikes(l => (liked ? l - 1 : l + 1))
    try {
      const result = await toggleLike(story.id)
      setLiked(result.liked)
    } catch {
      // revert on failure
      setLiked(l => !l)
      setLikes(l => (liked ? l + 1 : l - 1))
    }
  }

  return (
    <Pressable style={styles.card} onPress={() => onPress(story)}>
      <View style={styles.head}>
        <View style={styles.avatar}>
          {author.avatar_url
            ? <Image source={{ uri: author.avatar_url }} style={styles.avatarImg} />
            : <Text style={styles.avatarText}>{initials(author.full_name || author.username)}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.author} numberOfLines={1}>{author.full_name || author.username}</Text>
          <Text style={styles.time}>{timeAgo(story.created_at)}</Text>
        </View>
        <View style={styles.catPill}><Text style={styles.catText} numberOfLines={1}>{story.category}</Text></View>
      </View>

      <Text style={styles.title} numberOfLines={2}>{story.title}</Text>
      <Text style={styles.body} numberOfLines={3}>{story.content}</Text>

      {story.cover_image_url ? (
        <Image source={{ uri: story.cover_image_url }} style={styles.cover} resizeMode="cover" />
      ) : null}

      <View style={styles.footer}>
        <Pressable style={styles.action} onPress={handleLike} hitSlop={8}>
          <Text style={[styles.actionText, liked && styles.actionTextActive]}>{liked ? '❤️' : '🤍'} {likes}</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={() => onPress(story)} hitSlop={8}>
          <Text style={styles.actionText}>💬 {story.comments_count || 0}</Text>
        </Pressable>
      </View>
    </Pressable>
  )
}

// memo'd — feed/discover lists render many of these; skip re-rendering
// cards whose story/onPress props haven't actually changed.
export default memo(StoryCard)

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#F0EAE4',
    shadowColor: '#1A0800', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 2,
  },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FF6B2B', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 38, height: 38 },
  avatarText: { color: '#fff', fontWeight: '700' },
  author: { fontWeight: '700', fontSize: 13, color: '#1A0800' },
  time: { fontSize: 11, color: '#B0A89F', marginTop: 1 },
  catPill: { backgroundColor: '#FDF6EE', borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: '#F0E4D8', maxWidth: 130 },
  catText: { fontSize: 10, color: '#FF6B2B', fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700', color: '#1A0800', marginBottom: 5, lineHeight: 21 },
  body: { fontSize: 13, color: '#5C5147', lineHeight: 19, marginBottom: 10 },
  cover: { width: '100%', height: 170, borderRadius: 12, marginBottom: 10, backgroundColor: '#F5EDE4' },
  footer: { flexDirection: 'row', gap: 20, marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F5EDE4' },
  action: { paddingVertical: 4, flexDirection: 'row', alignItems: 'center' },
  actionText: { fontSize: 13, color: '#5C5147', fontWeight: '600' },
  actionTextActive: { color: '#FF6B2B', fontWeight: '700' },
})
