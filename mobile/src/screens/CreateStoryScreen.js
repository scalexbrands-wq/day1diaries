import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform, Image,
} from 'react-native'
import { createStory, getStoryCategories } from '../lib/api'

const DEFAULT_CATS = [
  { name: 'First Day at Job', icon: '💼' }, { name: 'First Startup Experience', icon: '🚀' },
  { name: 'First Business Client', icon: '🤝' }, { name: 'First College Day', icon: '🎓' },
  { name: 'First Failure', icon: '💪' }, { name: 'First Success', icon: '🏆' },
  { name: 'Habit Transformation', icon: '🔄' },
]

const VISIBILITY_OPTIONS = [
  { value: 'public', icon: '🌍', label: 'Public' },
  { value: 'followers_only', icon: '👥', label: 'Followers' },
  { value: 'private', icon: '🔒', label: 'Private' },
]

const MIN_CONTENT_LENGTH = 100

export default function CreateStoryScreen({ navigation }) {
  const [cats, setCats] = useState(DEFAULT_CATS)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState(DEFAULT_CATS[0].name)
  const [tags, setTags] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getStoryCategories().then(({ data }) => { if (data?.length) setCats(data) })
  }, [])

  const publish = async (status = 'published') => {
    if (!title.trim()) return setError('Add a title to your story')
    if (content.trim().length < MIN_CONTENT_LENGTH) return setError(`Story should be at least ${MIN_CONTENT_LENGTH} characters`)
    setError('')
    setLoading(true)

    const tagList = tags.split(',').map(t => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean)
    const { data, error: err } = await createStory({
      title: title.trim(),
      content,
      category,
      tags: tagList,
      cover_image_url: coverImageUrl || null,
      visibility,
      status,
    })
    setLoading(false)
    if (err) return setError(err.message || 'Could not publish story')

    if (status === 'published' && data?.id) {
      navigation.replace('StoryDetail', { storyId: data.id })
    } else {
      navigation.goBack()
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="What's your story called?"
          placeholderTextColor="#B0A89F"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {cats.map(c => (
            <Pressable
              key={c.name}
              style={[styles.catPill, category === c.name && styles.catPillActive]}
              onPress={() => setCategory(c.name)}
            >
              <Text style={[styles.catText, category === c.name && styles.catTextActive]}>{c.icon} {c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Your story</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Tell us what happened on day one..."
          placeholderTextColor="#B0A89F"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{content.trim().length}/{MIN_CONTENT_LENGTH} min characters</Text>

        <Text style={styles.label}>Cover image URL (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="https://example.com/image.jpg"
          placeholderTextColor="#B0A89F"
          autoCapitalize="none"
          value={coverImageUrl}
          onChangeText={setCoverImageUrl}
        />
        {coverImageUrl ? <Image source={{ uri: coverImageUrl }} style={styles.preview} resizeMode="cover" /> : null}

        <Text style={styles.label}>Tags (comma separated, optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="firstjob, growth, mumbai"
          placeholderTextColor="#B0A89F"
          autoCapitalize="none"
          value={tags}
          onChangeText={setTags}
        />

        <Text style={styles.label}>Who can see this</Text>
        <View style={styles.visRow}>
          {VISIBILITY_OPTIONS.map(v => (
            <Pressable
              key={v.value}
              style={[styles.visPill, visibility === v.value && styles.visPillActive]}
              onPress={() => setVisibility(v.value)}
            >
              <Text style={[styles.visText, visibility === v.value && styles.visTextActive]}>{v.icon} {v.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.publishBtn} onPress={() => publish('published')} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishBtnText}>Publish Story</Text>}
        </Pressable>
        <Pressable style={styles.draftBtn} onPress={() => publish('draft')} disabled={loading}>
          <Text style={styles.draftBtnText}>Save as Draft</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FDF6EE' },
  body: { padding: 18, paddingBottom: 40 },
  error: { color: '#D14343', textAlign: 'center', marginBottom: 14, fontSize: 13, fontWeight: '600' },
  label: { fontSize: 11, fontWeight: '700', color: '#8C7B6E', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E8DFD5', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1A0800', marginBottom: 16 },
  textarea: { minHeight: 160, marginBottom: 4 },
  charCount: { fontSize: 11, color: '#B0A89F', textAlign: 'right', marginBottom: 16 },
  preview: { width: '100%', height: 150, borderRadius: 12, marginBottom: 16, marginTop: -8 },
  catPill: { backgroundColor: '#fff', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#E8DFD5', marginRight: 8 },
  catPillActive: { backgroundColor: '#FF6B2B', borderColor: '#FF6B2B' },
  catText: { fontSize: 12, color: '#5C5147', fontWeight: '600' },
  catTextActive: { color: '#fff' },
  visRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  visPill: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 100, borderWidth: 1.5, borderColor: '#E8DFD5' },
  visPillActive: { backgroundColor: '#FF6B2B', borderColor: '#FF6B2B' },
  visText: { fontSize: 12, fontWeight: '600', color: '#5C5147' },
  visTextActive: { color: '#fff' },
  publishBtn: { backgroundColor: '#FF6B2B', borderRadius: 100, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  publishBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  draftBtn: { borderRadius: 100, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#E8DFD5' },
  draftBtnText: { color: '#5C5147', fontWeight: '700', fontSize: 14 },
})
