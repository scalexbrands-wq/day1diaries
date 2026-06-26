import React, { useEffect, useState } from 'react'
import { View, Text, Image, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { getProfileLiveCounts } from '../lib/api'

function initials(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase()
}

export default function ProfileScreen() {
  const { profile, signOut } = useAuth()
  const [counts, setCounts] = useState(null)

  useEffect(() => {
    if (profile?.username) {
      getProfileLiveCounts(profile.username).then(({ data }) => setCounts(data))
    }
  }, [profile?.username])

  if (!profile) {
    return <View style={styles.center}><ActivityIndicator color="#FF6B2B" /></View>
  }

  const stats = counts || profile

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.banner}>
        {profile.banner_url ? <Image source={{ uri: profile.banner_url }} style={styles.bannerImg} /> : null}
      </View>

      <View style={styles.avatarWrap}>
        {profile.avatar_url
          ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarText}>{initials(profile.full_name || profile.username)}</Text></View>}
      </View>

      <Text style={styles.name}>{profile.full_name || profile.username}</Text>
      <Text style={styles.username}>@{profile.username}</Text>
      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.stories_count ?? 0}</Text>
          <Text style={styles.statLabel}>Stories</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.followers_count ?? 0}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.following_count ?? 0}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.score ?? 0}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
      </View>

      <Pressable style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FDF6EE', paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  banner: { height: 120, backgroundColor: '#FFE3D1' },
  bannerImg: { width: '100%', height: '100%' },
  avatarWrap: { alignItems: 'center', marginTop: -36 },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: '#FDF6EE' },
  avatarFallback: { backgroundColor: '#FF6B2B', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 28 },
  name: { fontSize: 18, fontWeight: '800', color: '#1A0800', textAlign: 'center', marginTop: 10 },
  username: { fontSize: 13, color: '#8C7B6E', textAlign: 'center', marginBottom: 8 },
  bio: { fontSize: 13, color: '#5C5147', textAlign: 'center', paddingHorizontal: 32, marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, marginTop: 8 },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#FF6B2B' },
  statLabel: { fontSize: 11, color: '#8C7B6E', marginTop: 2 },
  signOutButton: { marginTop: 24, marginHorizontal: 32, borderRadius: 100, borderWidth: 1.5, borderColor: '#D14343', paddingVertical: 12, alignItems: 'center' },
  signOutText: { color: '#D14343', fontWeight: '700', fontSize: 13 },
})
