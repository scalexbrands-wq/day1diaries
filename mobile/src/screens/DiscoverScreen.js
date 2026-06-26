import React, { useState, useCallback, useEffect } from 'react'
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Pressable, TextInput } from 'react-native'
import { getStories, getStoryCategories } from '../lib/api'
import StoryCard from '../components/StoryCard'
import Fab from '../components/Fab'

const LIMIT = 10

export default function DiscoverScreen({ navigation }) {
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [search, setSearch] = useState('')
  const [stories, setStories] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    getStoryCategories().then(({ data }) => setCategories(data || []))
  }, [])

  const load = useCallback(async (reset, categoryOverride, searchOverride) => {
    const p = reset ? 0 : page
    const { data } = await getStories({
      page: p,
      limit: LIMIT,
      category: categoryOverride !== undefined ? categoryOverride : activeCategory,
      search: searchOverride !== undefined ? searchOverride : search,
    })
    const newStories = data || []
    setStories(prev => {
      const combined = reset ? newStories : [...prev, ...newStories]
      return Array.from(new Map(combined.map(s => [s.id, s])).values())
    })
    setHasMore(newStories.length === LIMIT)
    setPage(p + 1)
  }, [page, activeCategory, search])

  useEffect(() => {
    setLoading(true)
    load(true).finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectCategory = async (name) => {
    const next = activeCategory === name ? null : name
    setActiveCategory(next)
    setLoading(true)
    await load(true, next, search)
    setLoading(false)
  }

  const runSearch = async (text) => {
    setSearch(text)
    setLoading(true)
    await load(true, activeCategory, text)
    setLoading(false)
  }

  const handleEndReached = async () => {
    if (!hasMore || loadingMore || loading) return
    setLoadingMore(true)
    await load(false)
    setLoadingMore(false)
  }

  const openStory = useCallback((story) => navigation.navigate('StoryDetail', { storyId: story.id }), [navigation])

  const hasFilters = !!(search || activeCategory)
  const clearFilters = () => { setSearch(''); setActiveCategory(null); setLoading(true); load(true, null, '').finally(() => setLoading(false)) }

  return (
    <View style={styles.screen}>
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.search}
            placeholder="Search stories..."
            placeholderTextColor="#B0A89F"
            value={search}
            onChangeText={runSearch}
          />
          {search ? (
            <Pressable onPress={() => runSearch('')} hitSlop={8}>
              <Text style={styles.clearIcon}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ name: 'All', icon: '✨' }, ...categories]}
        keyExtractor={(c) => c.name}
        contentContainerStyle={styles.catRow}
        renderItem={({ item }) => {
          const isActive = item.name === 'All' ? !activeCategory : activeCategory === item.name
          return (
            <Pressable
              style={[styles.catPill, isActive && styles.catPillActive]}
              onPress={() => selectCategory(item.name === 'All' ? null : item.name)}
            >
              <Text style={[styles.catText, isActive && styles.catTextActive]}>{item.icon} {item.name}</Text>
            </Pressable>
          )
        }}
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#FF6B2B" size="large" /></View>
      ) : (
        <FlatList
          data={stories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <StoryCard story={item} onPress={openStory} />}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 96 }}
          onEndReachedThreshold={0.4}
          onEndReached={handleEndReached}
          ListHeaderComponent={
            stories.length > 0
              ? <Text style={styles.resultCount}>{stories.length} {stories.length === 1 ? 'story' : 'stories'}{hasFilters ? ' found' : ''}</Text>
              : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🔎</Text>
              <Text style={styles.emptyTitle}>No stories found</Text>
              <Text style={styles.emptyBody}>
                {hasFilters ? 'Try a different search or category.' : 'Check back soon for new stories.'}
              </Text>
              {hasFilters ? (
                <Pressable onPress={clearFilters} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>Clear filters</Text>
                </Pressable>
              ) : null}
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color="#FF6B2B" /> : null}
        />
      )}
      <Fab onPress={() => navigation.navigate('CreateStory')} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FDF6EE' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1A0800', marginBottom: 4 },
  emptyBody: { fontSize: 12, color: '#8C7B6E', textAlign: 'center' },
  clearBtn: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 1.5, borderColor: '#FF6B2B' },
  clearBtnText: { fontSize: 12, fontWeight: '700', color: '#FF6B2B' },
  resultCount: { fontSize: 11, color: '#8C7B6E', fontWeight: '600', marginLeft: 14, marginBottom: 8 },
  searchWrap: { paddingHorizontal: 14, paddingTop: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E8DFD5', paddingHorizontal: 12 },
  searchIcon: { fontSize: 13, marginRight: 8, opacity: 0.6 },
  search: { flex: 1, paddingVertical: 11, fontSize: 14, color: '#1A0800' },
  clearIcon: { fontSize: 13, color: '#B0A89F', paddingHorizontal: 6, paddingVertical: 4 },
  catRow: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 },
  catPill: {
    backgroundColor: '#fff', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: '#E8DFD5', marginRight: 8,
    shadowColor: '#1A0800', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  catPillActive: { backgroundColor: '#FF6B2B', borderColor: '#FF6B2B', shadowOpacity: 0.15 },
  catText: { fontSize: 12.5, color: '#5C5147', fontWeight: '600' },
  catTextActive: { color: '#fff' },
})
