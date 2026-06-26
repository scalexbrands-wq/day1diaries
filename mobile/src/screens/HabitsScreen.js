import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet, Pressable,
  TextInput, Modal, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  getHabits, getUserHabits, adoptHabit, logHabit, getHabitLogs,
  getChallenges, getChallengeParticipants, joinChallenge, getUserChallenges,
} from '../lib/api'

const CARD_COLORS = ['#FFE8DA', '#EDE3FB', '#DCF6EA', '#DCEBFB', '#FBE0E0', '#FCEFD4', '#FBE2EE', '#DBF1FA']
const TIMER_COLORS = { upcoming: '#2563EB', active: '#FF6B2B', ended: '#8C7B6E' }

function daysBetween(a, b) {
  return Math.round((b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0)) / 86400000)
}

function getTimer(item) {
  if (!item.start_date && !item.end_date) return null
  const now = new Date()
  const start = item.start_date ? new Date(item.start_date) : null
  const end = item.end_date ? new Date(item.end_date) : null

  if (start && start > now) {
    return { status: 'upcoming', label: `Starts in ${daysBetween(new Date(), new Date(start))}d`, pct: 0 }
  }
  if (end && end < now) {
    return { status: 'ended', label: 'Ended', pct: 100 }
  }
  if (start && end) {
    const total = daysBetween(new Date(start), new Date(end)) || 1
    const done = daysBetween(new Date(start), new Date())
    const pct = Math.min(Math.max(Math.round((done / total) * 100), 0), 100)
    const left = daysBetween(new Date(), new Date(end))
    return { status: 'active', label: left <= 0 ? 'Last day!' : `${left}d left`, pct }
  }
  if (end) return { status: 'active', label: `Ends ${end.toLocaleDateString()}`, pct: 50 }
  return { status: 'active', label: `Started ${start.toLocaleDateString()}`, pct: 30 }
}

function TimerBar({ item }) {
  const timer = getTimer(item)
  if (!timer) return null
  const color = TIMER_COLORS[timer.status]
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={styles.timerRow}>
        <Text style={[styles.timerStatus, { color }]}>{timer.status}</Text>
        <Text style={[styles.timerLabel, { color }]}>{timer.label}</Text>
      </View>
      <View style={styles.timerTrack}>
        <View style={[styles.timerFill, { width: `${timer.pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

function ProgressBar({ pct, color = '#FF6B2B' }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct || 0}%`, backgroundColor: color }]} />
    </View>
  )
}

function ParticipantsList({ challengeId }) {
  const [people, setPeople] = useState(null)

  useEffect(() => {
    getChallengeParticipants(challengeId, 10).then(({ data }) => setPeople(data || []))
  }, [challengeId])

  if (people === null) return <ActivityIndicator color="#FF6B2B" style={{ marginVertical: 12 }} />
  if (!people.length) return <Text style={styles.muted}>No participants yet. Be the first!</Text>

  return (
    <View>
      <Text style={styles.sectionTitle}>🏅 Top Participants</Text>
      {people.map((p, i) => (
        <View key={p.user_id} style={styles.participantRow}>
          <Text style={styles.participantRank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.participantName} numberOfLines={1}>{p.full_name || p.username}</Text>
            <Text style={styles.participantMeta}>🔥 {p.streak || 0}d streak · {p.points_earned || 0}pts</Text>
          </View>
          {p.completed && <Text style={styles.doneBadge}>✓ Done</Text>}
        </View>
      ))}
    </View>
  )
}

export default function HabitsScreen() {
  const [tab, setTab] = useState('habits')
  const [habits, setHabits] = useState([])
  const [userHabits, setUserHabits] = useState({})
  const [challenges, setChallenges] = useState([])
  const [joined, setJoined] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [selChallenge, setSelChallenge] = useState(null)
  const [logs, setLogs] = useState([])
  const [note, setNote] = useState('')
  const [adoptedSuccess, setAdoptedSuccess] = useState(null)

  const load = useCallback(async () => {
    const [{ data: h }, { data: uh }, { data: c }, { data: uc }] = await Promise.all([
      getHabits(), getUserHabits(), getChallenges(), getUserChallenges(),
    ])
    setHabits(h || [])
    setChallenges(c || [])
    const map = {}
    ;(uh || []).forEach(u => { map[u.habit_id] = u })
    setUserHabits(map)
    const joinedMap = {}
    ;(uc || []).forEach(cp => { joinedMap[cp.challenge_id] = true })
    setJoined(joinedMap)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openHabit = async (habit) => {
    setSelected(habit)
    setNote('')
    if (userHabits[habit.id]) {
      const { data } = await getHabitLogs(habit.id)
      setLogs(data || [])
    } else {
      setLogs([])
    }
  }

  const handleAdopt = async (habit) => {
    const { data, error } = await adoptHabit(habit.id)
    if (error) return
    setUserHabits(prev => ({ ...prev, [habit.id]: data }))
    setSelected(null)
    setAdoptedSuccess(habit)
  }

  const handleLog = async () => {
    if (!note.trim() || !selected) return
    const uh = userHabits[selected.id]
    if (!uh) return
    const { error } = await logHabit({ habit_id: selected.id, note })
    if (error) return
    setNote('')
    const { data } = await getHabitLogs(selected.id)
    setLogs(data || [])
    setUserHabits(prev => ({
      ...prev,
      [selected.id]: { ...prev[selected.id], current_day: (prev[selected.id]?.current_day || 0) + 1 },
    }))
  }

  const handleJoin = async (challenge) => {
    const { error } = await joinChallenge(challenge.id)
    if (error) return
    setJoined(j => ({ ...j, [challenge.id]: true }))
  }

  const filtered = habits.filter(h =>
    h.title.toLowerCase().includes(search.toLowerCase()) ||
    (h.category || '').toLowerCase().includes(search.toLowerCase())
  )

  const adoptedCount = Object.keys(userHabits).length
  const totalStreak = Object.values(userHabits).reduce((a, h) => a + (h.streak || 0), 0)

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#FF6B2B" size="large" /></View>
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDF6EE' }}>
      <View style={styles.tabSwitch}>
        {[['habits', '📚 Habits'], ['challenges', '🏆 Challenges']].map(([k, l]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[styles.tabBtn, tab === k && styles.tabBtnActive]}>
            <Text style={[styles.tabBtnText, tab === k && styles.tabBtnTextActive]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'habits' ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 24 }}
          ListHeaderComponent={
            <>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search habits..."
                placeholderTextColor="#B0A89F"
                style={styles.search}
              />
              <View style={styles.statsRow}>
                {[[habits.length, 'Available'], [adoptedCount, 'Adopted'], [totalStreak, 'Streak Days']].map(([v, l]) => (
                  <View key={l} style={styles.statCard}>
                    <Text style={styles.statValue}>{v}</Text>
                    <Text style={styles.statLabel}>{l}</Text>
                  </View>
                ))}
              </View>
            </>
          }
          renderItem={({ item, index }) => {
            const adopted = userHabits[item.id]
            return (
              <Pressable style={styles.habitCard} onPress={() => openHabit(item)}>
                <View style={[styles.habitIcon, { backgroundColor: CARD_COLORS[index % CARD_COLORS.length] }]}>
                  <Text style={{ fontSize: 22 }}>{item.icon || '✨'}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.habitTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.habitMeta}>
                    {(item.adopters_count || 0).toLocaleString()} adopters · {item.completion_rate || 0}% completion
                  </Text>
                  <TimerBar item={item} />
                  <ProgressBar pct={item.completion_rate} />
                  {adopted ? (
                    <View style={styles.adoptedPill}>
                      <Text style={styles.adoptedPillText}>✓ Day {adopted.current_day} · 🔥 {adopted.streak || 0}d</Text>
                    </View>
                  ) : (
                    <Pressable style={styles.adoptBtn} onPress={(e) => { e.stopPropagation(); handleAdopt(item) }}>
                      <Text style={styles.adoptBtnText}>Adopt This Habit</Text>
                    </Pressable>
                  )}
                </View>
              </Pressable>
            )
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📚</Text>
              <Text style={styles.emptyTitle}>No habits found</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={challenges}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 24 }}
          renderItem={({ item }) => {
            const isJoined = joined[item.id]
            return (
              <Pressable style={styles.challengeCard} onPress={() => setSelChallenge(item)}>
                <View style={styles.challengeBadgeRow}>
                  <Text style={[styles.statusBadge, statusBadgeStyle(item.status)]}>{item.status}</Text>
                  {item.visibility === 'pro' && <Text style={styles.proBadge}>👑 Pro Only</Text>}
                </View>
                <Text style={styles.challengeTitle}>{item.title}</Text>
                <TimerBar item={item} />
                <View style={styles.challengeMetaRow}>
                  <Text style={styles.challengeMeta}>⏱ {item.duration_days}d</Text>
                  <Text style={styles.challengeMeta}>🏆 {item.reward_points}pts</Text>
                  <Text style={styles.challengeMeta}>👥 {item.participants_count || 0} joined</Text>
                </View>
                {isJoined ? (
                  <View style={styles.adoptedPill}><Text style={styles.adoptedPillText}>✅ Already Joined</Text></View>
                ) : (
                  <Pressable style={styles.adoptBtn} onPress={(e) => { e.stopPropagation(); handleJoin(item) }}>
                    <Text style={styles.adoptBtnText}>Join Challenge</Text>
                  </Pressable>
                )}
              </Pressable>
            )
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🏆</Text>
              <Text style={styles.emptyTitle}>No challenges yet</Text>
            </View>
          }
        />
      )}

      {/* ── Habit detail modal ── */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={{ fontSize: 26 }}>{selected?.icon || '✨'}</Text>
              <Pressable onPress={() => setSelected(null)} style={styles.closeBtn}><Text style={styles.closeBtnText}>×</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.modalTitle}>{selected?.title}</Text>
              <Text style={styles.muted}>{(selected?.adopters_count || 0).toLocaleString()} adopters worldwide</Text>
              {selected?.description ? <Text style={styles.description}>{selected.description}</Text> : null}
              {selected ? <TimerBar item={selected} /> : null}

              {selected && userHabits[selected.id] ? (
                <>
                  <View style={styles.streakBox}>
                    <Text style={styles.streakDay}>Day {userHabits[selected.id]?.current_day}</Text>
                    <Text style={styles.muted}>🔥 {userHabits[selected.id]?.streak || 0} day streak</Text>
                    <ProgressBar pct={Math.min(userHabits[selected.id]?.current_day || 0, 100)} />
                  </View>
                  {logs.some(l => new Date(l.logged_at).toDateString() === new Date().toDateString()) ? (
                    <View style={styles.loggedBox}>
                      <Text style={{ fontSize: 18, marginBottom: 4 }}>✅</Text>
                      <Text style={styles.loggedTitle}>Already logged today!</Text>
                      <Text style={styles.muted}>Come back tomorrow to keep your streak going.</Text>
                    </View>
                  ) : (
                    <>
                      <TextInput
                        value={note}
                        onChangeText={setNote}
                        placeholder={`Day ${userHabits[selected.id]?.current_day} update — what did you do?`}
                        placeholderTextColor="#B0A89F"
                        multiline
                        style={styles.noteInput}
                      />
                      <Pressable style={styles.primaryBtn} onPress={handleLog}>
                        <Text style={styles.primaryBtnText}>Log Today ✓</Text>
                      </Pressable>
                    </>
                  )}
                  {logs.length > 0 && (
                    <View style={{ marginTop: 14 }}>
                      <Text style={styles.sectionTitle}>Recent Logs</Text>
                      {logs.slice(-5).reverse().map(l => (
                        <View key={l.id} style={styles.logRow}>
                          <Text style={styles.logDay}>Day {l.day_number}</Text>
                          <Text style={styles.logNote}>{l.note}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <Pressable style={styles.primaryBtn} onPress={() => selected && handleAdopt(selected)}>
                  <Text style={styles.primaryBtnText}>Adopt This Habit →</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Challenge detail modal ── */}
      <Modal visible={!!selChallenge} animationType="slide" transparent onRequestClose={() => setSelChallenge(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={[styles.modalHeader, { backgroundColor: '#1A0800' }]}>
              <Text style={[styles.statusBadge, statusBadgeStyle(selChallenge?.status), { backgroundColor: 'rgba(255,255,255,.2)', color: '#fff' }]}>{selChallenge?.status}</Text>
              <Pressable onPress={() => setSelChallenge(null)} style={styles.closeBtn}><Text style={styles.closeBtnText}>×</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.modalTitle}>{selChallenge?.title}</Text>
              {selChallenge?.description ? <Text style={styles.description}>{selChallenge.description}</Text> : null}
              <View style={styles.statsRow}>
                {selChallenge ? [
                  ['⏱', `${selChallenge.duration_days}d`, 'Duration'],
                  ['🏆', `${selChallenge.reward_points}pts`, 'Reward'],
                  ['👥', selChallenge.participants_count || 0, 'Joined'],
                ].map(([icon, v, l]) => (
                  <View key={l} style={styles.statCard}>
                    <Text style={{ fontSize: 16 }}>{icon}</Text>
                    <Text style={styles.statValue}>{v}</Text>
                    <Text style={styles.statLabel}>{l}</Text>
                  </View>
                )) : null}
              </View>
              {selChallenge && (joined[selChallenge.id] ? (
                <View style={styles.loggedBox}>
                  <Text style={{ fontSize: 18, marginBottom: 4 }}>✅</Text>
                  <Text style={styles.loggedTitle}>Already Joined!</Text>
                </View>
              ) : (
                <Pressable style={styles.primaryBtn} onPress={() => handleJoin(selChallenge)}>
                  <Text style={styles.primaryBtnText}>Join This Challenge →</Text>
                </Pressable>
              ))}
              <View style={{ height: 1, backgroundColor: '#F0EAE4', marginVertical: 16 }} />
              {selChallenge ? <ParticipantsList challengeId={selChallenge.id} /> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Habit adopted success ── */}
      <Modal visible={!!adoptedSuccess} animationType="fade" transparent onRequestClose={() => setAdoptedSuccess(null)}>
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successBadge}><Text style={styles.successCheck}>✓</Text></View>
            <Text style={styles.successTitle}>Habit Adopted!</Text>
            <Text style={styles.successBody}>
              "{adoptedSuccess?.title}" — Day 1 starts now. Come back daily to keep your streak alive 🔥
            </Text>
            <Pressable style={styles.primaryBtn} onPress={() => setAdoptedSuccess(null)}>
              <Text style={styles.primaryBtnText}>Let's go →</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

function statusBadgeStyle(status) {
  if (status === 'active') return { backgroundColor: 'rgba(5,150,105,.1)', color: '#059669' }
  if (status === 'upcoming') return { backgroundColor: 'rgba(37,99,235,.1)', color: '#2563EB' }
  return { backgroundColor: '#F5EDE4', color: '#8C7B6E' }
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  muted: { fontSize: 12, color: '#8C7B6E' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1A0800' },

  tabSwitch: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#F0EAE4', paddingHorizontal: 14 },
  tabBtn: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -2 },
  tabBtnActive: { borderBottomColor: '#FF6B2B' },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#8C7B6E' },
  tabBtnTextActive: { color: '#FF6B2B' },

  search: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E8DFD5', paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, marginBottom: 12, color: '#1A0800' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F0EAE4', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#FF6B2B' },
  statLabel: { fontSize: 10, color: '#8C7B6E', marginTop: 2, textAlign: 'center' },

  habitCard: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F0EAE4', borderRadius: 16, padding: 14, marginBottom: 12 },
  habitIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  habitTitle: { fontSize: 14, fontWeight: '700', color: '#1A0800' },
  habitMeta: { fontSize: 11, color: '#8C7B6E', marginTop: 2, marginBottom: 8 },

  timerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  timerStatus: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  timerLabel: { fontSize: 10, fontWeight: '600' },
  timerTrack: { height: 4, backgroundColor: 'rgba(26,8,0,.07)', borderRadius: 2 },
  timerFill: { height: 4, borderRadius: 2 },

  progressTrack: { height: 4, backgroundColor: '#F5EDE4', borderRadius: 2, marginBottom: 10, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },

  adoptedPill: { paddingVertical: 7, borderRadius: 100, borderWidth: 1.5, borderColor: 'rgba(5,150,105,.3)', backgroundColor: 'rgba(5,150,105,.08)', alignItems: 'center' },
  adoptedPillText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  adoptBtn: { paddingVertical: 7, borderRadius: 100, borderWidth: 1.5, borderColor: '#FF6B2B', alignItems: 'center' },
  adoptBtnText: { fontSize: 11, fontWeight: '700', color: '#FF6B2B' },

  challengeCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#F0EAE4', borderRadius: 16, padding: 16, marginBottom: 12 },
  challengeBadgeRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  statusBadge: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, overflow: 'hidden' },
  proBadge: { fontSize: 10, fontWeight: '700', color: '#7C3AED', backgroundColor: 'rgba(124,58,237,.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, overflow: 'hidden' },
  challengeTitle: { fontSize: 16, fontWeight: '700', color: '#1A0800', marginBottom: 8 },
  challengeMetaRow: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  challengeMeta: { fontSize: 11, color: '#8C7B6E' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FDF6EE', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FF6B2B', padding: 18, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.3)', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: '#fff', fontSize: 16, lineHeight: 16 },
  modalBody: { padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A0800', marginBottom: 4 },
  description: { fontSize: 13, color: '#4A2800', lineHeight: 19, marginVertical: 12 },

  streakBox: { backgroundColor: '#F5EDE4', borderRadius: 12, padding: 14, marginBottom: 14 },
  streakDay: { fontSize: 22, fontWeight: '700', color: '#FF6B2B', marginBottom: 2 },
  loggedBox: { alignItems: 'center', padding: 14, backgroundColor: 'rgba(5,150,105,.07)', borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(5,150,105,.2)', marginBottom: 8 },
  loggedTitle: { fontSize: 12, fontWeight: '700', color: '#059669' },
  noteInput: { borderWidth: 1.5, borderColor: '#DDD3CA', borderRadius: 10, padding: 12, fontSize: 13, color: '#1A0800', minHeight: 72, marginBottom: 8, textAlignVertical: 'top' },
  primaryBtn: { backgroundColor: '#FF6B2B', borderRadius: 100, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#1A0800', marginBottom: 8 },
  logRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5EDE4' },
  logDay: { fontWeight: '700', color: '#FF6B2B', fontSize: 12, marginBottom: 2 },
  logNote: { color: '#4A2800', fontSize: 12, lineHeight: 17 },

  participantRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5EDE4' },
  participantRank: { width: 22, textAlign: 'center', fontSize: 14, fontWeight: '700' },
  participantName: { fontSize: 12, fontWeight: '600', color: '#1A0800' },
  participantMeta: { fontSize: 10, color: '#8C7B6E' },
  doneBadge: { fontSize: 10, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100, backgroundColor: 'rgba(5,150,105,.1)', color: '#059669', fontWeight: '600' },

  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.45)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  successCard: { backgroundColor: '#fff', borderRadius: 22, padding: 26, alignItems: 'center', width: '100%' },
  successBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(5,150,105,.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successCheck: { fontSize: 30, color: '#059669', fontWeight: '700' },
  successTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'serif', color: '#1A0800', marginBottom: 8 },
  successBody: { fontSize: 13, color: '#5C5147', textAlign: 'center', lineHeight: 19, marginBottom: 20 },
})
