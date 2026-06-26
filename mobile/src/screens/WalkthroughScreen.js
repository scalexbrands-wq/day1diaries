import React, { useRef, useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Logo from '../components/Logo'

const { width } = Dimensions.get('window')
export const WALKTHROUGH_SEEN_KEY = 'day1diaries_walkthrough_seen'

const SLIDES = [
  { icon: '📖', title: 'Share your first-day stories', body: 'First job, first heartbreak, first win — write it down and share it with people who get it.' },
  { icon: '🔥', title: 'Build habits that stick', body: 'Adopt a habit, log your progress daily, and watch your streak grow one day at a time.' },
  { icon: '🏆', title: 'Join challenges together', body: 'Compete with the community, climb the leaderboard, and earn rewards for showing up.' },
  { icon: '✨', title: 'Your story starts on Day 1', body: 'Every journey begins somewhere. Let\'s begin yours.' },
]

export default function WalkthroughScreen({ navigation }) {
  const [index, setIndex] = useState(0)
  const listRef = useRef(null)
  const isLast = index === SLIDES.length - 1

  const finish = async () => {
    await AsyncStorage.setItem(WALKTHROUGH_SEEN_KEY, '1')
    navigation.replace('Login')
  }

  const next = () => {
    if (isLast) { finish(); return }
    listRef.current?.scrollToIndex({ index: index + 1 })
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Pressable style={styles.skip} onPress={finish}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => (
          <View style={[styles.slide, { width }]}>
            {i === 0 && <Logo size="md" />}
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Pressable style={styles.nextBtn} onPress={next}>
          <Text style={styles.nextBtnText}>{isLast ? 'Get Started' : 'Next'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FDF6EE' },
  skip: { position: 'absolute', top: 16, right: 20, zIndex: 10, padding: 8 },
  skipText: { color: '#8C7B6E', fontSize: 13, fontWeight: '600' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  icon: { fontSize: 56, marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', fontFamily: 'serif', color: '#1A0800', textAlign: 'center', marginBottom: 12 },
  body: { fontSize: 14, color: '#5C5147', textAlign: 'center', lineHeight: 21 },
  footer: { paddingHorizontal: 28, paddingBottom: 28, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E8DFD5' },
  dotActive: { backgroundColor: '#FF6B2B', width: 18 },
  nextBtn: { backgroundColor: '#FF6B2B', borderRadius: 100, paddingVertical: 14, width: '100%', alignItems: 'center' },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
