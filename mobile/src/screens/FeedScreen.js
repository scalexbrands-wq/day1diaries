import React, { useState, useCallback, useEffect } from 'react'
import { View, Text, FlatList, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native'
import { getFeedStories } from '../lib/api'
import StoryCard from '../components/StoryCard'
import Fab from '../components/Fab'

const LIMIT = 10

export default function FeedScreen({ navigation }) {
  const [stories, setStories] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (reset = false) => {
    const p = reset ? 0 : page
    const { data } = await getFeedStories(p, LIMIT)
    const newStories = data || []
    setStories(prev => {
      const combined = reset ? newStories : [...prev, ...newStories]
      return Array.from(new Map(combined.map(s => [s.id, s])).values())
    })
    setHasMore(newStories.length === LIMIT)
    setPage(p + 1)
  }, [page])

  useEffect(() => {
    load(true).finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setRefreshing(true)
    await load(true)
    setRefreshing(false)
  }

  const handleEndReached = async () => {
    if (!hasMore || loadingMore || loading) return
    setLoadingMore(true)
    await load(false)
    setLoadingMore(false)
  }

  // Stable across renders so StoryCard's memo isn't defeated by a fresh
  // function identity on every Feed re-render.
  const openStory = useCallback((story) => navigation.navigate('StoryDetail', { storyId: story.id }), [navigation])

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#FF6B2B" /></View>
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={stories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StoryCard story={item} onPress={openStory} />}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF6B2B" />}
        onEndReachedThreshold={0.4}
        onEndReached={handleEndReached}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No stories yet</Text>
            <Text style={styles.emptyBody}>Follow some creators on the web app to see their stories here.</Text>
          </View>
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color="#FF6B2B" /> : null}
      />
      <Fab onPress={() => navigation.navigate('CreateStory')} />
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1A0800', marginBottom: 6 },
  emptyBody: { fontSize: 13, color: '#8C7B6E', textAlign: 'center' },
})
