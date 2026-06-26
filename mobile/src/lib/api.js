// ============================================================
// Day1 Diaries — Mobile API client
// Talks to the SAME Express API + Cognito user pool as the web app
// (frontend/src/lib/api.js) — this is just another client, no backend
// changes. Trimmed to the endpoints the 5 mobile screens need.
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../config'

const TOKEN_KEY = 'day1diaries_tokens'

export const getStoredTokens = async () => {
  try {
    const raw = await AsyncStorage.getItem(TOKEN_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
const storeTokens = (tokens) => AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
const clearTokens = () => AsyncStorage.removeItem(TOKEN_KEY)

async function apiFetch(path, options = {}) {
  const tokens = await getStoredTokens()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    return { data: null, error: { message: data.error || res.statusText, status: res.status, code: data.code } }
  }
  return { data, error: null }
}

// ============================================================
// AUTH
// ============================================================

export const signUp = async (email, password, username, fullName) => {
  const result = await apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, username, fullName }),
  })
  if (result.data?.tokens) await storeTokens(result.data.tokens)
  return result
}

export const confirmSignUp = async (email, code, password, username, fullName) => {
  const result = await apiFetch('/auth/confirm', {
    method: 'POST',
    body: JSON.stringify({ email, code, password, username, fullName }),
  })
  if (result.data?.tokens) await storeTokens(result.data.tokens)
  return result
}

export const resendConfirmationCode = (email) =>
  apiFetch('/auth/resend-code', { method: 'POST', body: JSON.stringify({ email }) })

export const signIn = async (email, password) => {
  const result = await apiFetch('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (result.data?.tokens) await storeTokens(result.data.tokens)
  return result
}

export const signOut = async () => {
  await apiFetch('/auth/signout', { method: 'POST' })
  await clearTokens()
}

const refreshSession = async (refreshToken) => {
  const result = await apiFetch('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
  if (result.data?.tokens) {
    const existing = await getStoredTokens()
    await storeTokens({ ...existing, ...result.data.tokens })
    return apiFetch('/auth/me')
  }
  return { data: null, error: result.error }
}

// Returns the current profile if a session exists (refreshing the access
// token first if it's expired), or null if the user is logged out.
export const getCurrentProfile = async () => {
  const tokens = await getStoredTokens()
  if (!tokens) return null

  const me = await apiFetch('/auth/me')
  if (me.error?.status === 401 && tokens.refreshToken) {
    const refreshed = await refreshSession(tokens.refreshToken)
    if (refreshed.data) return refreshed.data.profile
    await clearTokens()
    return null
  }
  if (me.error) return null
  return me.data.profile
}

export const getAuthConfig = async () => {
  const result = await apiFetch('/auth/config')
  return { data: result.data, error: result.error }
}

// ============================================================
// STORIES
// ============================================================

export const getStories = async ({ page = 0, limit = 10, category, search, sort } = {}) => {
  const params = new URLSearchParams({ page, limit })
  if (category) params.set('category', category)
  if (search) params.set('search', search)
  if (sort) params.set('sort', sort)
  const result = await apiFetch(`/stories?${params}`)
  return { data: result.data?.stories, error: result.error }
}

export const getFeedStories = async (page = 0, limit = 10) => {
  // Server derives "who you follow" from the auth token itself — no
  // client-side following-list bookkeeping needed.
  const params = new URLSearchParams({ page, limit })
  const result = await apiFetch(`/stories/feed?${params}`)
  return { data: result.data?.stories, error: result.error }
}

export const getStory = async (id) => {
  const result = await apiFetch(`/stories/${id}`)
  return { data: result.data?.story, error: result.error }
}

export const createStory = async (story) => {
  const result = await apiFetch('/stories', { method: 'POST', body: JSON.stringify(story) })
  return { data: result.data?.story, error: result.error }
}

export const getStoryCategories = async () => {
  const result = await apiFetch('/stories/categories')
  return { data: result.data?.categories || [], error: result.error }
}

export const toggleLike = async (storyId) => {
  const result = await apiFetch(`/stories/${storyId}/toggle-like`, { method: 'POST' })
  return result.data || { liked: false }
}

export const toggleSave = async (storyId) => {
  const result = await apiFetch(`/stories/${storyId}/toggle-save`, { method: 'POST' })
  return result.data || { saved: false }
}

export const getComments = async (storyId) => {
  const result = await apiFetch(`/stories/${storyId}/comments`)
  return { data: result.data?.comments, error: result.error }
}

export const addComment = async (storyId, content) => {
  const result = await apiFetch(`/stories/${storyId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
  return { data: result.data?.comment, error: result.error }
}

export const recordStoryView = (storyId) => apiFetch(`/stories/${storyId}/view`, { method: 'POST' })

// ============================================================
// PROFILES
// ============================================================

export const getProfileByUsername = async (username) => {
  const result = await apiFetch(`/profiles/${username}`)
  return { data: result.data?.profile, error: result.error }
}

export const getProfileLiveCounts = async (username) => {
  const result = await apiFetch(`/profiles/${username}/live-counts`)
  return { data: result.data?.counts, error: result.error }
}

export const updateProfile = (updates) =>
  apiFetch('/profiles/me', { method: 'PATCH', body: JSON.stringify(updates) })

// ============================================================
// SOCIAL
// ============================================================

export const getFollow = async (followingId) => {
  const result = await apiFetch(`/social/follow-status/${followingId}`)
  return { data: !!result.data?.following, error: result.error }
}

export const toggleFollow = async (targetUserId) => {
  const result = await apiFetch(`/social/toggle-follow/${targetUserId}`, { method: 'POST' })
  return { data: result.data, error: result.error }
}

// ============================================================
// HABITS
// ============================================================

export const getHabits = async () => {
  const result = await apiFetch('/habits')
  return { data: result.data?.habits, error: result.error }
}

export const getUserHabits = async () => {
  const result = await apiFetch('/habits/mine')
  return { data: result.data?.userHabits, error: result.error }
}

export const adoptHabit = async (habitId) => {
  const result = await apiFetch(`/habits/${habitId}/adopt`, { method: 'POST' })
  return { data: result.data?.userHabit, error: result.error }
}

export const logHabit = async ({ habit_id, note }) => {
  const result = await apiFetch(`/habits/${habit_id}/log`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  })
  return { data: result.data?.log, error: result.error }
}

export const getHabitLogs = async (habitId) => {
  const result = await apiFetch(`/habits/${habitId}/logs`)
  return { data: result.data?.logs, error: result.error }
}

export const getChallenges = async () => {
  const result = await apiFetch('/habits/challenges/all')
  return { data: result.data?.challenges, error: result.error }
}

export const getChallengeParticipants = async (challengeId, limit = 10) => {
  const result = await apiFetch(`/habits/challenges/${challengeId}/participants?limit=${limit}`)
  return { data: result.data?.participants, error: result.error }
}

export const joinChallenge = async (challengeId) => {
  const result = await apiFetch(`/habits/challenges/${challengeId}/join`, { method: 'POST' })
  return { data: result.data?.participation, error: result.error }
}

export const getUserChallenges = async () => {
  const result = await apiFetch('/habits/challenges/mine')
  return { data: result.data?.myChallenges, error: result.error }
}
