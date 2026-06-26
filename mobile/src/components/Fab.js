import React from 'react'
import { Pressable, Text, StyleSheet } from 'react-native'

export default function Fab({ onPress }) {
  return (
    <Pressable style={styles.fab} onPress={onPress} hitSlop={8}>
      <Text style={styles.fabIcon}>✎</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', right: 18, bottom: 22,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FF6B2B', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1A0800', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: { color: '#fff', fontSize: 22, fontWeight: '700' },
})
