import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

const SIZES = {
  sm: { badge: 40, badgeText: 16, word: 17, tagline: 11 },
  md: { badge: 56, badgeText: 22, word: 24, tagline: 12 },
  lg: { badge: 72, badgeText: 28, word: 30, tagline: 13 },
}

// Typographic wordmark — no logo image asset exists in the project, so this
// recreates the brand mark used on the web landing page (serif "Day1 Diaries")
// as a reusable monogram + wordmark for the mobile app's auth/onboarding flow.
export default function Logo({ size = 'md', withTagline = false, light = false }) {
  const s = SIZES[size]
  return (
    <View style={styles.wrap}>
      <View style={[styles.badge, { width: s.badge, height: s.badge, borderRadius: s.badge / 2 }]}>
        <Text style={[styles.badgeText, { fontSize: s.badgeText }]}>D1</Text>
      </View>
      <Text style={[styles.word, { fontSize: s.word, color: light ? '#fff' : '#1A0800' }]}>
        Day1 <Text style={styles.wordAccent}>Diaries</Text>
      </Text>
      {withTagline && (
        <Text style={[styles.tagline, { fontSize: s.tagline, color: light ? 'rgba(255,255,255,.85)' : '#8C7B6E' }]}>
          Every first day has a story
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  badge: {
    backgroundColor: '#FF6B2B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#FF6B2B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  badgeText: { color: '#fff', fontWeight: '700', fontFamily: 'serif' },
  word: { fontWeight: '700', fontFamily: 'serif', letterSpacing: 0.2 },
  wordAccent: { color: '#FF6B2B' },
  tagline: { marginTop: 4, fontStyle: 'italic' },
})
