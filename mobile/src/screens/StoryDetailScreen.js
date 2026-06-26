import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, Image, ScrollView, Pressable, TextInput, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { getStory, getComments, addComment, toggleLike, toggleSave, recordStoryView } from '../lib/api'

function initials(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase()
}

export default function StoryDetailScreen({ route, navigation }) {
  const { storyId } = route.params
  const [story, setStory] = useState(null)
  const [comments, setComments] = useState([])
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [likes, setLikes] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [{ data: storyData }, { data: commentsData }] = await Promise.all([
      getStory(storyId),
      getComments(storyId),
    ])
    setStory(storyData)
    setLikes(storyData?.likes_count || 0)
    setComments(commentsData || [])
    recordStoryView(storyId).catch(() => {})
  }, [storyId])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  useEffect(() => {
    if (story) navigation.setOptions({ title: story.title })
  }, [story, navigation])

  const handleLike = async () => {
    setLiked(l => !l)
    setLikes(l => (liked ? l - 1 : l + 1))
    const result = await toggleLike(storyId)
    setLiked(result.liked)
  }

  const handleSave = async () => {
    setSaved(s => !s)
    const result = await toggleSave(storyId)
    setSaved(result.saved)
  }

  const handlePostComment = async () => {
    if (!commentText.trim()) return
    setPosting(true)
    const { data, error } = await addComment(storyId, commentText.trim())
    setPosting(false)
    if (error) return Alert.alert('Could not post comment', error.message)
    setComments(prev => [...prev, data])
    setCommentText('')
  }

  if (loading || !story) {
    return <View style={styles.center}><ActivityIndicator color="#FF6B2B" /></View>
  }

  const author = story.profiles || {}

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View style={styles.head}>
          <View style={styles.avatar}>
            {author.avatar_url
              ? <Image source={{ uri: author.avatar_url }} style={styles.avatarImg} />
              : <Text style={styles.avatarText}>{initials(author.full_name || author.username)}</Text>}
          </View>
          <View>
            <Text style={styles.author}>{author.full_name || author.username}</Text>
            <Text style={styles.cat}>{story.category}</Text>
          </View>
        </View>

        <Text style={styles.title}>{story.title}</Text>

        {story.cover_image_url ? (
          <Image source={{ uri: story.cover_image_url }} style={styles.cover} resizeMode="cover" />
        ) : null}

        <Text style={styles.body}>{story.content}</Text>

        <View style={styles.actions}>
          <Pressable style={styles.action} onPress={handleLike}>
            <Text style={[styles.actionText, liked && styles.actionTextActive]}>{liked ? '❤️' : '🤍'} {likes}</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={handleSave}>
            <Text style={[styles.actionText, saved && styles.actionTextActive]}>{saved ? '🔖' : '📑'} Save</Text>
          </Pressable>
        </View>

        <Text style={styles.commentsHeading}>Comments ({comments.length})</Text>
        {comments.map(c => (
          <View key={c.id} style={styles.comment}>
            <Text style={styles.commentAuthor}>{c.profiles?.full_name || c.profiles?.username}</Text>
            <Text style={styles.commentBody}>{c.content}</Text>
          </View>
        ))}
        {!comments.length && <Text style={styles.noComments}>No comments yet — be the first!</Text>}
      </ScrollView>

      <View style={styles.commentBar}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          value={commentText}
          onChangeText={setCommentText}
        />
        <Pressable style={styles.postButton} onPress={handlePostComment} disabled={posting}>
          {posting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.postButtonText}>Post</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FF6B2B', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 40, height: 40 },
  avatarText: { color: '#fff', fontWeight: '700' },
  author: { fontWeight: '700', fontSize: 14, color: '#1A0800' },
  cat: { fontSize: 12, color: '#FF6B2B' },
  title: { fontSize: 22, fontWeight: '800', color: '#1A0800', marginBottom: 12 },
  cover: { width: '100%', height: 200, borderRadius: 12, marginBottom: 14 },
  body: { fontSize: 15, lineHeight: 23, color: '#3A2E22', marginBottom: 18 },
  actions: { flexDirection: 'row', gap: 24, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F0EAE4', marginBottom: 16 },
  action: { paddingVertical: 4 },
  actionText: { fontSize: 14, color: '#5C5147' },
  actionTextActive: { color: '#FF6B2B', fontWeight: '700' },
  commentsHeading: { fontSize: 14, fontWeight: '700', color: '#1A0800', marginBottom: 10 },
  comment: { marginBottom: 12, backgroundColor: '#FDF6EE', borderRadius: 10, padding: 10 },
  commentAuthor: { fontSize: 12, fontWeight: '700', color: '#1A0800', marginBottom: 2 },
  commentBody: { fontSize: 13, color: '#5C5147' },
  noComments: { fontSize: 13, color: '#B0A89F' },
  commentBar: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#F0EAE4', backgroundColor: '#fff' },
  commentInput: { flex: 1, backgroundColor: '#FDF6EE', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13 },
  postButton: { backgroundColor: '#FF6B2B', borderRadius: 100, paddingHorizontal: 18, justifyContent: 'center' },
  postButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
})
