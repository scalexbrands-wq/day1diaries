// ============================================================
// Day1 Diaries — AWS API Client
// Replaces src/lib/api.js
// Talks to: Express API (RDS data) + AWS Cognito (auth)
// ============================================================

const API_BASE = process.env.REACT_APP_API_BASE_URL   // e.g. https://api.day1diaries.app
const COGNITO_CLIENT_ID = process.env.REACT_APP_COGNITO_CLIENT_ID
const AWS_REGION = process.env.REACT_APP_AWS_REGION

if (!API_BASE) console.error('Missing REACT_APP_API_BASE_URL')
if (!COGNITO_CLIENT_ID) console.error('Missing REACT_APP_COGNITO_CLIENT_ID')

// ── Token storage ──────────────────────────────────────────────
const TOKEN_KEY = 'day1diaries_tokens'

export const getStoredTokens = () => {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY)) } catch { return null }
}
const storeTokens = (tokens) => localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
const clearTokens = () => localStorage.removeItem(TOKEN_KEY)

// ── Core fetch wrapper — attaches Bearer token ──────────────────
async function apiFetch(path, options = {}) {
  const tokens = getStoredTokens()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    return { data: null, error: { message: data.error || res.statusText, status: res.status } }
  }
  return { data, error: null }
}

// ============================================================
// AUTH
// ============================================================

export const signUp = async (email, password, metadata = {}) => {
  const result = await apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, username: metadata.username, fullName: metadata.full_name, phone: metadata.phone }),
  })
  if (result.data?.tokens) storeTokens(result.data.tokens)
  return result
}

export const confirmSignUp = async (email, code, password, username, fullName, phone) => {
  const result = await apiFetch('/auth/confirm', {
    method: 'POST',
    body: JSON.stringify({ email, code, password, username, fullName, phone }),
  })
  if (result.data?.tokens) storeTokens(result.data.tokens)
  return result
}

export const resendConfirmationCode = (email) =>
  apiFetch('/auth/resend-code', { method: 'POST', body: JSON.stringify({ email }) })

export const signIn = async (email, password) => {
  const result = await apiFetch('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (result.data?.tokens) storeTokens(result.data.tokens)
  return result
}

export const signOut = async () => {
  await apiFetch('/auth/signout', { method: 'POST' })
  clearTokens()
  return { error: null }
}

export const getSession = async () => {
  const tokens = getStoredTokens()
  if (!tokens) return { data: { session: null }, error: null }

  // Verify token is still valid by hitting /auth/me; refresh if expired
  const me = await apiFetch('/auth/me')
  if (me.error?.status === 401 && tokens.refreshToken) {
    const refreshed = await refreshSession(tokens.refreshToken)
    if (refreshed.data) {
      return { data: { session: { user: refreshed.data.profile } }, error: null }
    }
    clearTokens()
    return { data: { session: null }, error: null }
  }
  if (me.error) return { data: { session: null }, error: null }
  return { data: { session: { user: me.data.profile } }, error: null }
}

const refreshSession = async (refreshToken) => {
  const result = await apiFetch('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
  if (result.data?.tokens) {
    const existing = getStoredTokens()
    storeTokens({ ...existing, ...result.data.tokens })
    return apiFetch('/auth/me')
  }
  return { data: null, error: result.error }
}

// Google OAuth via Cognito Hosted UI (redirect-based)
export const signInGoogle = () => {
  const domain = process.env.REACT_APP_COGNITO_DOMAIN
  const redirectUri = encodeURIComponent(window.location.origin)
  window.location.href = `https://${domain}.auth.${AWS_REGION}.amazoncognito.com/oauth2/authorize?identity_provider=Google&redirect_uri=${redirectUri}&response_type=CODE&client_id=${COGNITO_CLIENT_ID}&scope=email+openid+profile`
}

// ============================================================
// PROFILES
// ============================================================

export const getProfile = async (userId) => {
  const result = await apiFetch(`/profiles/by-id/${userId}`)
  return { data: result.data?.profile, error: result.error }
}

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

export const uploadProfileAvatar = async (file) => {
  const tokens = getStoredTokens()
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(`${API_BASE}/profiles/me/avatar`, {
    method: 'POST',
    headers: tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: { message: data.error || res.statusText, status: res.status } }
  return { data: data.avatarUrl, error: null }
}

export const uploadProfileBanner = async (file) => {
  const tokens = getStoredTokens()
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(`${API_BASE}/profiles/me/banner`, {
    method: 'POST',
    headers: tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: { message: data.error || res.statusText, status: res.status } }
  return { data: data.bannerUrl, error: null }
}

export const isContributorOrAdmin = (profile) =>
  profile?.role === 'admin' || profile?.role === 'contributor'

// RBAC — caller's role + resolved permission keys (admin = every
// permission; everyone else = their role's grants).
export const getMyRoleCheck = async () => {
  const result = await apiFetch('/profiles/me/role-check')
  return { data: result.data, error: result.error }
}

export const adminGetRbacMatrix = async () => {
  const result = await apiFetch('/admin/rbac')
  return { data: result.data, error: result.error }
}
export const adminSetRolePermissions = async (role, permissions) => {
  const result = await apiFetch(`/admin/rbac/${role}`, { method: 'PUT', body: JSON.stringify({ permissions }) })
  return { data: result.data, error: result.error }
}

// ============================================================
// STORIES
// ============================================================

export const getStories = async ({ page = 0, limit = 10, category, userId, search } = {}) => {
  const params = new URLSearchParams({ page, limit })
  if (category) params.set('category', category)
  if (userId) params.set('userId', userId)
  if (search) params.set('search', search)
  const result = await apiFetch(`/stories?${params}`)
  return { data: result.data?.stories, error: result.error }
}

export const getFeedStories = async (followingIds, page = 0, limit = 10) => {
  const params = new URLSearchParams({ page, limit, followingIds: (followingIds || []).join(',') })
  const result = await apiFetch(`/stories/feed?${params}`)
  return { data: result.data?.stories, error: result.error }
}

export const getTrendingStories = async (limit = 20) => {
  const result = await apiFetch(`/stories/trending?limit=${limit}`)
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

export const updateStory = async (id, updates) => {
  const result = await apiFetch(`/stories/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
  return { data: result.data?.story, error: result.error }
}

export const deleteStory = (id) => apiFetch(`/stories/${id}`, { method: 'DELETE' })

// ── Likes ──────────────────────────────────────────────────────
export const getLike = async (userId, storyId) => {
  const result = await apiFetch(`/stories/${storyId}/like-status`)
  return { data: result.data?.liked ? { id: true } : null, error: result.error }
}

export const toggleLike = async (userId, storyId) => {
  const result = await apiFetch(`/stories/${storyId}/toggle-like`, { method: 'POST' })
  return result.data || { liked: false }
}

// ── Comments ──────────────────────────────────────────────────
export const getComments = async (storyId) => {
  const result = await apiFetch(`/stories/${storyId}/comments`)
  return { data: result.data?.comments, error: result.error }
}

export const addComment = async (comment) => {
  const result = await apiFetch(`/stories/${comment.story_id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content: comment.content }),
  })
  return { data: result.data?.comment, error: result.error }
}

// ── Saves ─────────────────────────────────────────────────────
export const getSave = async (userId, storyId) => {
  const result = await apiFetch(`/stories/${storyId}/save-status`)
  return { data: result.data?.saved ? { id: true } : null, error: result.error }
}

export const toggleSave = async (userId, storyId) => {
  const result = await apiFetch(`/stories/${storyId}/toggle-save`, { method: 'POST' })
  return result.data || { saved: false }
}

export const getSavedStories = async (userId) => {
  const result = await apiFetch('/social/saved')
  return { data: result.data?.saved, error: result.error }
}

// ============================================================
// SOCIAL — Follows / Leaderboard
// ============================================================

export const getFollow = async (followerId, followingId) => {
  const result = await apiFetch(`/social/follow-status/${followingId}`)
  return { data: result.data?.following ? { id: true } : null, error: result.error }
}

export const toggleFollowFixed = async (followerId, followingId) => {
  const result = await apiFetch(`/social/toggle-follow/${followingId}`, { method: 'POST' })
  return result.data || { following: false }
}

// Single-arg convenience: toggleFollow(targetUserId)
export const toggleFollow = async (targetUserId) => {
  const result = await apiFetch(`/social/toggle-follow/${targetUserId}`, { method: 'POST' })
  return { data: result.data, error: result.error }
}

export const getFollowing = async (userId) => {
  const result = await apiFetch('/social/following')
  return { data: (result.data?.following || []).map(id => ({ following_id: id })), error: result.error }
}

// ── Topic follows (categories & companies/departments) ──────────
export const getTopicFollows = async () => {
  const result = await apiFetch('/social/topic-follows')
  return { data: result.data || { categories: [], departments: [] }, error: result.error }
}

export const toggleTopicFollow = async (type, value) => {
  const result = await apiFetch('/social/toggle-topic-follow', { method: 'POST', body: JSON.stringify({ type, value }) })
  return { data: result.data || { following: false }, error: result.error }
}

export const getDepartments = async () => {
  const result = await apiFetch('/social/departments')
  return { data: result.data?.departments || [], error: result.error }
}

export const getStoriesByCategories = async (categories, page = 0, limit = 10) => {
  const params = new URLSearchParams({ categories: (categories || []).join(','), page, limit })
  const result = await apiFetch(`/stories/by-categories?${params}`)
  return { data: result.data?.stories || [], error: result.error }
}

export const getCareersByDepartments = async (departments) => {
  const params = new URLSearchParams({ departments: (departments || []).join(',') })
  const result = await apiFetch(`/pages/careers?${params}`)
  return { data: result.data?.jobs || [], error: result.error }
}

export const getFollowers = async (userId) => {
  const result = await apiFetch(`/social/followers/${userId}`)
  return { data: result.data?.followers, error: result.error }
}

export const getLeaderboard = async (limit = 20) => {
  const result = await apiFetch(`/social/leaderboard?limit=${limit}`)
  return { data: result.data?.leaderboard, error: result.error }
}

// ============================================================
// HABITS
// ============================================================

export const getHabits = async () => {
  const result = await apiFetch('/habits')
  return { data: result.data?.habits, error: result.error }
}

export const getUserHabits = async (userId) => {
  const result = await apiFetch('/habits/mine')
  return { data: result.data?.userHabits, error: result.error }
}

export const getUserHabitProgress = getUserHabits

export const adoptHabit = async (userId, habitId) => {
  const result = await apiFetch(`/habits/${habitId}/adopt`, { method: 'POST' })
  return { data: result.data?.userHabit, error: result.error }
}

export const logHabit = async (log) => {
  const result = await apiFetch(`/habits/${log.habit_id}/log`, {
    method: 'POST',
    body: JSON.stringify({ note: log.note }),
  })
  return { data: result.data?.log, error: result.error }
}

export const getHabitLogs = async (userId, habitId) => {
  const result = await apiFetch(`/habits/${habitId}/logs`)
  return { data: result.data?.logs, error: result.error }
}

// ── Habit Challenges ─────────────────────────────────────────
export const getChallenges = async () => {
  const result = await apiFetch('/habits/challenges/all')
  return { data: result.data?.challenges, error: result.error }
}

export const getChallengeDetail = async (id) => {
  const result = await apiFetch(`/habits/challenges/${id}`)
  return { data: result.data?.challenge, error: result.error }
}

export const getChallengeParticipants = async (challengeId, limit = 10) => {
  const result = await apiFetch(`/habits/challenges/${challengeId}/participants?limit=${limit}`)
  return { data: result.data?.participants, error: result.error }
}

export const joinChallenge = async (challengeId, userId) => {
  const result = await apiFetch(`/habits/challenges/${challengeId}/join`, { method: 'POST' })
  return { data: result.data?.participation, error: result.error }
}

export const getUserChallenges = async (userId) => {
  const result = await apiFetch('/habits/challenges/mine')
  return { data: result.data?.myChallenges, error: result.error }
}

// ============================================================
// COMMUNITY / EVENTS
// ============================================================

export const getCommunityUpdates = async (type) => {
  const params = type ? `?type=${type}` : ''
  const result = await apiFetch(`/community${params}`)
  return { data: result.data?.updates, error: result.error }
}

export const getCommunityUpdate = async (id) => {
  const result = await apiFetch(`/community/${id}`)
  return { data: result.data?.update, error: result.error }
}

export const registerForEvent = async (eventId, userId) => {
  const result = await apiFetch(`/community/${eventId}/register`, { method: 'POST' })
  return { data: result.data?.registration, error: result.error }
}

export const getUserEventRegistration = async (eventId, userId) => {
  const result = await apiFetch(`/community/${eventId}/registration-status`)
  return { data: result.data?.registered ? { id: true } : null, error: result.error }
}

// ============================================================
// ADMIN — Habits, Challenges, Events, Users, Stats
// ============================================================

export const adminGetHabits = async () => {
  const result = await apiFetch('/habits/admin/all')
  return { data: result.data?.habits, error: result.error }
}

export const adminUpsertHabit = async (h) => {
  const result = h.id
    ? await apiFetch(`/habits/admin/${h.id}`, { method: 'PATCH', body: JSON.stringify(h) })
    : await apiFetch('/habits/admin', { method: 'POST', body: JSON.stringify(h) })
  return { data: result.data?.habit, error: result.error }
}

export const adminDeleteHabit = (id) => apiFetch(`/habits/admin/${id}`, { method: 'DELETE' })

export const adminUpsertChallenge = async (ch) => {
  const result = ch.id
    ? await apiFetch(`/habits/admin/challenges/${ch.id}`, { method: 'PATCH', body: JSON.stringify(ch) })
    : await apiFetch('/habits/admin/challenges', { method: 'POST', body: JSON.stringify(ch) })
  return { data: result.data?.challenge, error: result.error }
}

export const adminDeleteChallenge = (id) => apiFetch(`/habits/admin/challenges/${id}`, { method: 'DELETE' })

export const adminUpsertCommunityUpdate = async (cu) => {
  const result = cu.id
    ? await apiFetch(`/community/admin/${cu.id}`, { method: 'PATCH', body: JSON.stringify(cu) })
    : await apiFetch('/community/admin', { method: 'POST', body: JSON.stringify(cu) })
  return { data: result.data?.update, error: result.error }
}

export const adminDeleteCommunityUpdate = (id) => apiFetch(`/community/admin/${id}`, { method: 'DELETE' })

export const adminGetUsers = async () => {
  const result = await apiFetch('/admin/users')
  return { data: result.data?.users, error: result.error }
}

export const adminSetRole = async (userId, role) => {
  const result = await apiFetch(`/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) })
  return { data: result.data?.profile, error: result.error }
}

export const getAdminStats = async () => {
  const result = await apiFetch('/admin/stats')
  return { data: result.data?.stats, error: result.error }
}

export const adminFlaggedStories = async () => {
  const result = await apiFetch('/admin/flagged-stories')
  return { data: result.data?.stories, error: result.error }
}

export const adminModerateStory = (id, status) =>
  apiFetch(`/admin/stories/${id}/moderate`, { method: 'PATCH', body: JSON.stringify({ status }) })

export const adminBlockUser = (userId, isBlocked) =>
  apiFetch(`/admin/users/${userId}/block`, { method: 'PATCH', body: JSON.stringify({ is_blocked: isBlocked }) })

export const adminUpdateUser = (userId, fields) =>
  apiFetch(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(fields) })

export const adminDeleteUser = (userId) =>
  apiFetch(`/admin/users/${userId}`, { method: 'DELETE' })

export const adminGetUserStories = async (userId) => {
  const result = await apiFetch(`/admin/users/${userId}/stories`)
  return { data: result.data?.stories, error: result.error }
}

// ============================================================
// LANDING PAGE
// ============================================================

export const getLandingData = async () => {
  const result = await apiFetch('/landing/data')
  return { data: result.data, error: result.error }
}

// ============================================================
// SEO
// ============================================================

export const getSeoDefaults = async () => {
  return apiFetch('/seo/defaults')
}
export const adminGetSeoSettings = async () => {
  const result = await apiFetch('/admin/seo/settings')
  return { data: result.data?.settings, error: result.error }
}
export const adminUpdateSeoSettings = async (settings) => {
  const result = await apiFetch('/admin/seo/settings', { method: 'PATCH', body: JSON.stringify(settings) })
  return { data: result.data?.settings, error: result.error }
}
export const adminUploadSeoOgImage = async (file) => {
  const tokens = getStoredTokens()
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(`${API_BASE}/admin/seo/settings/og-image`, {
    method: 'POST',
    headers: tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: { message: data.error || res.statusText, status: res.status } }
  return { data: data.ogImageUrl, error: null }
}

// Individual getters (kept for compatibility with existing Landing.js)
export const getLandingStats = async () => {
  const { data } = await getLandingData()
  return data?.stats || { users: 0, stories: 0, habit_adoptions: 0 }
}
export const getLandingCategories = async () => {
  const { data } = await getLandingData()
  return { data: data?.categories || [], error: null }
}
export const getLandingTestimonials = async () => {
  const { data } = await getLandingData()
  return { data: data?.testimonials || [], error: null }
}
export const getLandingHabits = async () => {
  const { data } = await getLandingData()
  return { data: data?.habits || [], error: null }
}
export const getLandingLeaderboard = async () => {
  const { data } = await getLandingData()
  return { data: data?.leaderboard || [], error: null }
}
export const getLandingFeaturedStories = async () => {
  const { data } = await getLandingData()
  return { data: data?.featuredStories || [], error: null }
}
export const getLandingHeroContent = async () => {
  const { data } = await getLandingData()
  return { data: data?.hero, error: null }
}
export const getLandingLevels = async () => {
  const { data } = await getLandingData()
  return { data: data?.levels || [], error: null }
}

// ── Admin: Landing content management ──────────────────────────
export const adminGetLandingHero = async () => {
  const result = await apiFetch('/landing/admin/hero')
  return { data: result.data?.data, error: result.error }
}
export const adminUpsertLandingHero = (data) =>
  apiFetch('/landing/admin/hero', { method: 'PATCH', body: JSON.stringify(data) })

// File upload — bypasses apiFetch since it forces a JSON Content-Type;
// the browser must set its own multipart boundary for FormData.
export const adminAddHeroImage = async (file) => {
  const tokens = getStoredTokens()
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(`${API_BASE}/landing/admin/hero/images`, {
    method: 'POST',
    headers: tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: { message: data.error || res.statusText, status: res.status } }
  return { data: data.hero, error: null }
}

export const adminRemoveHeroImage = async (index) => {
  const result = await apiFetch(`/landing/admin/hero/images/${index}`, { method: 'DELETE' })
  return { data: result.data?.hero, error: result.error }
}

// ── Admin: Landing bottom section ────────────────────────────
export const adminGetLandingBottomSection = async () => {
  const result = await apiFetch('/landing/admin/bottom-section')
  return { data: result.data?.data, error: result.error }
}
export const adminUpsertLandingBottomSection = (data) =>
  apiFetch('/landing/admin/bottom-section', { method: 'PATCH', body: JSON.stringify(data) })

export const adminAddBottomSectionImage = async (file) => {
  const tokens = getStoredTokens()
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(`${API_BASE}/landing/admin/bottom-section/images`, {
    method: 'POST',
    headers: tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: { message: data.error || res.statusText, status: res.status } }
  return { data: data.data, error: null }
}

export const adminRemoveBottomSectionImage = async (index) => {
  const result = await apiFetch(`/landing/admin/bottom-section/images/${index}`, { method: 'DELETE' })
  return { data: result.data?.data, error: result.error }
}

export const adminGetCategories = async () => {
  const result = await apiFetch('/landing/admin/categories')
  return { data: result.data?.categories, error: result.error }
}
export const adminUpsertCategory = async (cat) => {
  const result = await apiFetch('/landing/admin/categories', { method: 'POST', body: JSON.stringify(cat) })
  return { data: result.data?.category, error: result.error }
}
export const adminDeleteCategory = (id) => apiFetch(`/landing/admin/categories/${id}`, { method: 'DELETE' })

export const adminGetTestimonials = async () => {
  const result = await apiFetch('/landing/admin/testimonials')
  return { data: result.data?.testimonials, error: result.error }
}
export const adminUpsertTestimonial = async (t) => {
  const result = await apiFetch('/landing/admin/testimonials', { method: 'POST', body: JSON.stringify(t) })
  return { data: result.data?.testimonial, error: result.error }
}
export const adminDeleteTestimonial = (id) => apiFetch(`/landing/admin/testimonials/${id}`, { method: 'DELETE' })

export const adminToggleFeatureStory = (id, featured) =>
  apiFetch(`/landing/admin/stories/${id}/feature`, { method: 'PATCH', body: JSON.stringify({ featured }) })

export const adminGetFeaturedStories = async () => {
  const result = await apiFetch('/landing/admin/featured-stories')
  return { data: result.data?.stories, error: result.error }
}

// ── Public config (no auth) ─────────────────────────────────────
export const getAuthConfig = async () => {
  const result = await apiFetch('/auth/config')
  return { data: result.data, error: result.error }
}

// ── Admin: App settings ──────────────────────────────────────────
// ============================================================
// SITE VISIT COUNTER
// ============================================================

// ============================================================
// MARKETING — ad campaigns (image/video) shown on Discover + Story Detail
// ============================================================

export const getActiveAds = async (placement) => {
  const result = await apiFetch(`/ads/active?placement=${placement}`)
  return { data: result.data?.ads, error: result.error }
}
export const logAdImpression = (adId, placement, storyId) =>
  apiFetch(`/ads/${adId}/impression`, { method: 'POST', body: JSON.stringify({ placement, storyId }) })
export const logAdClick = async (adId, placement, storyId) => {
  const result = await apiFetch(`/ads/${adId}/click`, { method: 'POST', body: JSON.stringify({ placement, storyId }) })
  return { data: result.data?.click_url, error: result.error }
}

export const adminListAdCampaigns = async () => {
  const result = await apiFetch('/admin/ads')
  return { data: result.data?.campaigns, error: result.error }
}
export const adminGetAdAnalytics = async (id) => {
  const result = await apiFetch(`/admin/ads/${id}/analytics`)
  return { data: result.data?.byPlacement, error: result.error }
}
// `fields` is a plain object; `file` (optional) is the image/video File —
// uses FormData directly since apiFetch forces a JSON Content-Type.
async function submitAdCampaign(path, method, fields, file) {
  const tokens = getStoredTokens()
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue
    form.append(k, Array.isArray(v) ? JSON.stringify(v) : v)
  }
  if (file) form.append('creative', file)
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: { message: data.error || res.statusText, status: res.status } }
  return { data: data.campaign, error: null }
}
export const adminCreateAdCampaign = (fields, file) => submitAdCampaign('/admin/ads', 'POST', fields, file)
export const adminUpdateAdCampaign = (id, fields, file) => submitAdCampaign(`/admin/ads/${id}`, 'PUT', fields, file)
export const adminSetAdCampaignStatus = async (id, status) => {
  const result = await apiFetch(`/admin/ads/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
  return { data: result.data?.campaign, error: result.error }
}
export const adminDeleteAdCampaign = (id) => apiFetch(`/admin/ads/${id}`, { method: 'DELETE' })

export const adminGetMarketingSettings = async () => {
  const result = await apiFetch('/admin/ads/settings')
  return { data: result.data?.settings, error: result.error }
}
export const adminUpdateMarketingSettings = async (settings) => {
  const result = await apiFetch('/admin/ads/settings', { method: 'PATCH', body: JSON.stringify(settings) })
  return { data: result.data?.settings, error: result.error }
}

export const getVisitCount = async () => {
  const result = await apiFetch('/stats/visit')
  return { data: result.data?.count, error: result.error }
}
export const incrementVisitCount = async () => {
  const result = await apiFetch('/stats/visit', { method: 'POST' })
  return { data: result.data?.count, error: result.error }
}
export const adminSetVisitCount = async (count) => {
  const result = await apiFetch('/stats/visit', { method: 'PATCH', body: JSON.stringify({ count }) })
  return { data: result.data?.count, error: result.error }
}

export const adminGetSettings = async () => {
  const result = await apiFetch('/admin/settings')
  return { data: result.data?.settings, error: result.error }
}
export const adminUpdateSettings = async (settings) => {
  const result = await apiFetch('/admin/settings', { method: 'PATCH', body: JSON.stringify(settings) })
  return { data: result.data?.settings, error: result.error }
}

// ============================================================
// SITE PAGES — About, Blog, Careers, Contact
// ============================================================

// ── About ──────────────────────────────────────────────────────
export const getAboutSections = async () => {
  const result = await apiFetch('/pages/about')
  return { data: result.data?.sections || [], error: result.error }
}
export const adminGetAboutSections = async () => {
  const result = await apiFetch('/admin/pages/about')
  return { data: result.data?.sections || [], error: result.error }
}
export const adminUpsertAboutSection = async (section) => {
  const result = await apiFetch('/admin/pages/about', { method: 'POST', body: JSON.stringify(section) })
  return { data: result.data?.section, error: result.error }
}
export const adminDeleteAboutSection = async (id) => {
  const result = await apiFetch(`/admin/pages/about/${id}`, { method: 'DELETE' })
  return { data: result.data, error: result.error }
}

// ── Blog ───────────────────────────────────────────────────────
export const getBlogPosts = async () => {
  const result = await apiFetch('/pages/blog')
  return { data: result.data?.posts || [], error: result.error }
}
export const getBlogPost = async (slug) => {
  const result = await apiFetch(`/pages/blog/${slug}`)
  return { data: result.data?.post, error: result.error }
}
export const adminGetBlogPosts = async () => {
  const result = await apiFetch('/admin/pages/blog')
  return { data: result.data?.posts || [], error: result.error }
}
export const adminUpsertBlogPost = async (post) => {
  const result = await apiFetch('/admin/pages/blog', { method: 'POST', body: JSON.stringify(post) })
  return { data: result.data?.post, error: result.error }
}
export const adminDeleteBlogPost = async (id) => {
  const result = await apiFetch(`/admin/pages/blog/${id}`, { method: 'DELETE' })
  return { data: result.data, error: result.error }
}

// ── Careers ────────────────────────────────────────────────────
export const getCareersJobs = async () => {
  const result = await apiFetch('/pages/careers')
  return { data: result.data?.jobs || [], error: result.error }
}
export const getCareersJob = async (id) => {
  const result = await apiFetch(`/pages/careers/${id}`)
  return { data: result.data?.job, error: result.error }
}
export const applyToJob = async (id, application) => {
  const result = await apiFetch(`/pages/careers/${id}/apply`, { method: 'POST', body: JSON.stringify(application) })
  return { data: result.data, error: result.error }
}
export const adminGetCareersJobs = async () => {
  const result = await apiFetch('/admin/pages/careers')
  return { data: result.data?.jobs || [], error: result.error }
}
export const adminUpsertCareersJob = async (job) => {
  const result = await apiFetch('/admin/pages/careers', { method: 'POST', body: JSON.stringify(job) })
  return { data: result.data?.job, error: result.error }
}
export const adminDeleteCareersJob = async (id) => {
  const result = await apiFetch(`/admin/pages/careers/${id}`, { method: 'DELETE' })
  return { data: result.data, error: result.error }
}
export const adminGetAllApplications = async () => {
  const result = await apiFetch('/admin/pages/applications')
  return { data: result.data?.applications || [], error: result.error }
}
export const adminGetJobApplications = async (jobId) => {
  const result = await apiFetch(`/admin/pages/careers/${jobId}/applications`)
  return { data: result.data?.applications || [], error: result.error }
}
export const adminUpdateApplicationStatus = async (id, status) => {
  const result = await apiFetch(`/admin/pages/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
  return { data: result.data?.application, error: result.error }
}

// ── Contact ────────────────────────────────────────────────────
export const sendContactMessage = async (msg) => {
  const result = await apiFetch('/pages/contact', { method: 'POST', body: JSON.stringify(msg) })
  return { data: result.data, error: result.error }
}
export const adminGetContactMessages = async () => {
  const result = await apiFetch('/admin/pages/contact')
  return { data: result.data?.messages || [], error: result.error }
}
export const adminUpdateContactStatus = async (id, status) => {
  const result = await apiFetch(`/admin/pages/contact/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
  return { data: result.data?.message, error: result.error }
}

// ── Careers KPI stats (admin) ──────────────────────────────────
export const adminGetCareersStats = async () => {
  const result = await apiFetch('/admin/pages/careers/stats')
  return { data: result.data?.stats, error: result.error }
}

// ── Story categories ──────────────────────────────────────────
export const getStoryCategories = async () => {
  const result = await apiFetch('/stories/categories')
  return { data: result.data?.categories || [], error: result.error }
}
export const getSuggestedUsers = async (limit=5) => {
  const result = await apiFetch(`/stories/suggested-users?limit=${limit}`)
  return { data: result.data?.users || [], error: result.error }
}
// ── Coins system ──────────────────────────────────────────────
export const getMyCoins = async () => {
  const result = await apiFetch('/social/coins')
  return { data: result.data?.coins ?? 0, error: result.error }
}
export const unlockStory = async (storyId) => {
  const result = await apiFetch(`/stories/${storyId}/unlock`, { method: 'POST' })
  return { data: result.data, error: result.error }
}
export const getMyUnlockedStoryIds = async () => {
  const result = await apiFetch('/stories/my-unlocks')
  return { data: result.data?.unlockedIds || [], error: result.error }
}
export const recordStoryView = async (storyId) => {
  return apiFetch(`/stories/${storyId}/view`, { method: 'POST' })
}
export const shareStory = async (storyId) => {
  const result = await apiFetch(`/stories/${storyId}/share`, { method: 'POST' })
  return { data: result.data, error: result.error }
}

// ── User job applications ─────────────────────────────────────
export const getMyApplications = async () => {
  const result = await apiFetch('/pages/my-job-applications')
  return { data: result.data?.applications || [], error: result.error }
}
export const updateMyApplication = async (id, updates) => {
  const result = await apiFetch(`/pages/careers/applications/${id}/my-update`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
  return { data: result.data?.application, error: result.error }
}

// ============================================================
// CERTIFICATES — Story Contributor Certificate
// ============================================================

export const generateCertificate = async (payload) => {
  const result = await apiFetch('/certificates/generate', { method: 'POST', body: JSON.stringify(payload) })
  return { data: result.data?.certificate, error: result.error }
}

export const getCertificate = async (id) => {
  const result = await apiFetch(`/certificates/${id}`)
  return { data: result.data?.certificate, error: result.error }
}

export const certificateDownloadUrl = (id, format = 'png') =>
  `${API_BASE}/certificates/${id}/download?format=${format}`

export const shareCertificate = async (certificateId, platform) => {
  const result = await apiFetch('/certificates/share', {
    method: 'POST',
    body: JSON.stringify({ certificateId, platform }),
  })
  return { data: result.data, error: result.error }
}

// ── Announcements ─────────────────────────────────────────────
export const getActiveAnnouncements = async () => {
  const result = await apiFetch('/announcements/active')
  return { data: result.data?.announcements || [], error: result.error }
}
export const dismissAnnouncement = async (id) => {
  return apiFetch(`/announcements/${id}/dismiss`, { method: 'POST' })
}
export const adminGetAnnouncements = async () => {
  const result = await apiFetch('/announcements')
  return { data: result.data?.announcements || [], error: result.error }
}
export const adminUpsertAnnouncement = async (a) => {
  const method = a.id ? 'PUT' : 'POST'
  const path = a.id ? `/announcements/${a.id}` : '/announcements'
  const result = await apiFetch(path, { method, body: JSON.stringify(a) })
  return { data: result.data?.announcement, error: result.error }
}
export const adminDeleteAnnouncement = async (id) => {
  return apiFetch(`/announcements/${id}`, { method: 'DELETE' })
}

// ============================================================
// EMAIL CENTER (Templates / Audiences / Workflows / Sends)
// ============================================================

// ── Templates ────────────────────────────────────────────────
export const adminListEmailTemplates = async (status) => {
  const result = await apiFetch(`/admin/email/templates${status ? `?status=${status}` : ''}`)
  return { data: result.data?.templates, error: result.error }
}
export const adminGetEmailTemplate = async (id) => {
  const result = await apiFetch(`/admin/email/templates/${id}`)
  return { data: result.data?.template, error: result.error }
}
export const adminCreateEmailTemplate = async (t) => {
  const result = await apiFetch('/admin/email/templates', { method: 'POST', body: JSON.stringify(t) })
  return { data: result.data?.template, error: result.error }
}
export const adminUpdateEmailTemplate = async (id, t) => {
  const result = await apiFetch(`/admin/email/templates/${id}`, { method: 'PUT', body: JSON.stringify(t) })
  return { data: result.data?.template, error: result.error }
}
export const adminCloneEmailTemplate = async (id) => {
  const result = await apiFetch(`/admin/email/templates/${id}/clone`, { method: 'POST' })
  return { data: result.data?.template, error: result.error }
}
export const adminArchiveEmailTemplate = async (id) => {
  const result = await apiFetch(`/admin/email/templates/${id}/archive`, { method: 'POST' })
  return { data: result.data?.template, error: result.error }
}
export const adminRestoreEmailTemplate = async (id) => {
  const result = await apiFetch(`/admin/email/templates/${id}/restore`, { method: 'POST' })
  return { data: result.data?.template, error: result.error }
}
export const adminGetEmailTemplateVersions = async (id) => {
  const result = await apiFetch(`/admin/email/templates/${id}/versions`)
  return { data: result.data?.versions, error: result.error }
}
export const adminRestoreEmailTemplateVersion = async (id, version) => {
  const result = await apiFetch(`/admin/email/templates/${id}/versions/${version}/restore`, { method: 'POST' })
  return { data: result.data?.template, error: result.error }
}
export const adminPreviewEmailTemplate = async (id, sampleVariables) => {
  const result = await apiFetch(`/admin/email/templates/${id}/preview`, { method: 'POST', body: JSON.stringify({ sampleVariables }) })
  return { data: result.data, error: result.error }
}
export const adminTestSendEmailTemplate = async (id, { toEmail, toName, sampleVariables }) => {
  return apiFetch(`/admin/email/templates/${id}/test-send`, { method: 'POST', body: JSON.stringify({ toEmail, toName, sampleVariables }) })
}

// ── Audiences ────────────────────────────────────────────────
export const adminGetEmailAudienceSources = async () => {
  const result = await apiFetch('/admin/email/audiences/sources')
  return { data: result.data?.sources, error: result.error }
}
export const adminListEmailAudiences = async () => {
  const result = await apiFetch('/admin/email/audiences')
  return { data: result.data?.audiences, error: result.error }
}
export const adminCreateEmailAudience = async (a) => {
  const result = await apiFetch('/admin/email/audiences', { method: 'POST', body: JSON.stringify(a) })
  return { data: result.data?.audience, error: result.error }
}
export const adminUpdateEmailAudience = async (id, a) => {
  const result = await apiFetch(`/admin/email/audiences/${id}`, { method: 'PUT', body: JSON.stringify(a) })
  return { data: result.data?.audience, error: result.error }
}
export const adminDeleteEmailAudience = async (id) => {
  return apiFetch(`/admin/email/audiences/${id}`, { method: 'DELETE' })
}
export const adminPreviewEmailAudienceDraft = async (source, filters) => {
  return apiFetch('/admin/email/audiences/preview', { method: 'POST', body: JSON.stringify({ source, filters }) })
}
export const adminPreviewEmailAudience = async (id) => {
  return apiFetch(`/admin/email/audiences/${id}/preview`, { method: 'POST' })
}

// ── Workflows ────────────────────────────────────────────────
export const adminListEmailWorkflows = async () => {
  const result = await apiFetch('/admin/email/workflows')
  return { data: result.data?.workflows, error: result.error }
}
export const adminCreateEmailWorkflow = async (w) => {
  const result = await apiFetch('/admin/email/workflows', { method: 'POST', body: JSON.stringify(w) })
  return { data: result.data?.workflow, error: result.error }
}
export const adminUpdateEmailWorkflow = async (id, w) => {
  const result = await apiFetch(`/admin/email/workflows/${id}`, { method: 'PUT', body: JSON.stringify(w) })
  return { data: result.data?.workflow, error: result.error }
}
export const adminDeleteEmailWorkflow = async (id) => {
  return apiFetch(`/admin/email/workflows/${id}`, { method: 'DELETE' })
}
export const adminActivateEmailWorkflow = async (id) => {
  const result = await apiFetch(`/admin/email/workflows/${id}/activate`, { method: 'POST' })
  return { data: result.data?.workflow, error: result.error }
}
export const adminPauseEmailWorkflow = async (id) => {
  const result = await apiFetch(`/admin/email/workflows/${id}/pause`, { method: 'POST' })
  return { data: result.data?.workflow, error: result.error }
}
export const adminRunEmailWorkflowNow = async (id) => {
  return apiFetch(`/admin/email/workflows/${id}/run-now`, { method: 'POST' })
}

// ── Sends (logs) ─────────────────────────────────────────────
export const adminListEmailSends = async (workflowId) => {
  const result = await apiFetch(`/admin/email/sends${workflowId ? `?workflow_id=${workflowId}` : ''}`)
  return { data: result.data?.sends, error: result.error }
}
export const adminGetEmailSendRecipients = async (sendId) => {
  const result = await apiFetch(`/admin/email/sends/${sendId}/recipients`)
  return { data: result.data?.recipients, error: result.error }
}

// ============================================================
// MEMBERSHIP MODULE
// ============================================================

// ── Public / user-facing ─────────────────────────────────────
export const getMembershipStatus = async () => {
  const result = await apiFetch('/membership/status')
  return { data: result.data?.enabled, error: result.error }
}
export const getMembershipPlans = async () => {
  const result = await apiFetch('/membership/plans')
  return { data: result.data?.plans, error: result.error }
}
export const getMembershipFormFields = async () => {
  const result = await apiFetch('/membership/form-fields')
  return { data: result.data?.fields, error: result.error }
}
export const getMembershipPaymentSettings = async () => {
  return apiFetch('/membership/payment-settings')
}
export const createRazorpayOrder = async (planId) => {
  return apiFetch('/membership/razorpay/order', { method: 'POST', body: JSON.stringify({ planId }) })
}
export const getMyMembershipApplication = async () => {
  const result = await apiFetch('/membership/my-application')
  return { data: result.data?.application, error: result.error }
}
export const getMyMembership = async () => {
  return apiFetch('/membership/my-membership')
}
export const getMyMembershipPayments = async () => {
  const result = await apiFetch('/membership/my-payments')
  return { data: result.data?.payments, error: result.error }
}
export const getMyFeatureUsage = async () => {
  const result = await apiFetch('/membership/usage')
  return { data: result.data?.usage, error: result.error }
}

// Submits a membership application. `fields` = { field_key: textValue }.
// `files` = { field_key: File } for image/file form fields.
// `paymentProofFile` = File, required unless paymentMethod is 'manual' or 'razorpay'.
// `razorpay` = { orderId, paymentId, signature }, required when paymentMethod === 'razorpay'.
export const submitMembershipApplication = async ({ planId, paymentMethod, fields, files, paymentProofFile, razorpay }) => {
  const tokens = getStoredTokens()
  const form = new FormData()
  form.append('planId', planId)
  form.append('paymentMethod', paymentMethod)
  Object.entries(fields || {}).forEach(([k, v]) => form.append(k, v ?? ''))
  Object.entries(files || {}).forEach(([k, file]) => { if (file) form.append(k, file) })
  if (paymentProofFile) form.append('payment_proof', paymentProofFile)
  if (razorpay) {
    form.append('razorpay_order_id', razorpay.orderId)
    form.append('razorpay_payment_id', razorpay.paymentId)
    form.append('razorpay_signature', razorpay.signature)
  }

  const res = await fetch(`${API_BASE}/membership/apply`, {
    method: 'POST',
    headers: tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: { message: data.error || res.statusText, status: res.status } }
  return { data: data.application, error: null }
}

// ── Admin: Plans ──────────────────────────────────────────────
export const adminListMembershipPlans = async () => {
  const result = await apiFetch('/admin/membership/plans')
  return { data: result.data?.plans, error: result.error }
}
export const adminCreateMembershipPlan = async (plan) => {
  const result = await apiFetch('/admin/membership/plans', { method: 'POST', body: JSON.stringify(plan) })
  return { data: result.data?.plan, error: result.error }
}
export const adminUpdateMembershipPlan = async (id, plan) => {
  const result = await apiFetch(`/admin/membership/plans/${id}`, { method: 'PUT', body: JSON.stringify(plan) })
  return { data: result.data?.plan, error: result.error }
}
export const adminCloneMembershipPlan = async (id) => {
  const result = await apiFetch(`/admin/membership/plans/${id}/clone`, { method: 'POST' })
  return { data: result.data?.plan, error: result.error }
}
export const adminSetMembershipPlanStatus = async (id, action) => {
  const result = await apiFetch(`/admin/membership/plans/${id}/${action}`, { method: 'POST' })
  return { data: result.data?.plan, error: result.error }
}

// ── Admin: Form Builder ──────────────────────────────────────
export const adminListMembershipFormFields = async () => {
  const result = await apiFetch('/admin/membership/form-fields')
  return { data: result.data?.fields, error: result.error }
}
export const adminCreateMembershipFormField = async (field) => {
  const result = await apiFetch('/admin/membership/form-fields', { method: 'POST', body: JSON.stringify(field) })
  return { data: result.data?.field, error: result.error }
}
export const adminUpdateMembershipFormField = async (id, field) => {
  const result = await apiFetch(`/admin/membership/form-fields/${id}`, { method: 'PUT', body: JSON.stringify(field) })
  return { data: result.data?.field, error: result.error }
}
export const adminDeleteMembershipFormField = async (id) => {
  return apiFetch(`/admin/membership/form-fields/${id}`, { method: 'DELETE' })
}

// ── Admin: Applications ───────────────────────────────────────
export const adminListMembershipApplications = async (status) => {
  const result = await apiFetch(`/admin/membership/applications${status ? `?status=${status}` : ''}`)
  return { data: result.data?.applications, error: result.error }
}
export const adminGetMembershipApplication = async (id) => {
  return apiFetch(`/admin/membership/applications/${id}`)
}
export const adminApproveMembershipApplication = async (id) => {
  return apiFetch(`/admin/membership/applications/${id}/approve`, { method: 'POST' })
}
export const adminRejectMembershipApplication = async (id, notes) => {
  return apiFetch(`/admin/membership/applications/${id}/reject`, { method: 'POST', body: JSON.stringify({ notes }) })
}
export const adminSetMembershipApplicationStatus = async (id, status, notes) => {
  return apiFetch(`/admin/membership/applications/${id}/set-status`, { method: 'POST', body: JSON.stringify({ status, notes }) })
}

// ── Admin: Payments ───────────────────────────────────────────
export const adminListMembershipPayments = async (status) => {
  const result = await apiFetch(`/admin/membership/payments${status ? `?status=${status}` : ''}`)
  return { data: result.data?.payments, error: result.error }
}
export const adminVerifyMembershipPayment = async (id) => {
  return apiFetch(`/admin/membership/payments/${id}/verify`, { method: 'POST' })
}
export const adminRejectMembershipPayment = async (id) => {
  return apiFetch(`/admin/membership/payments/${id}/reject`, { method: 'POST' })
}
export const adminRefundMembershipPayment = async (id, notes) => {
  return apiFetch(`/admin/membership/payments/${id}/refund`, { method: 'POST', body: JSON.stringify({ notes }) })
}

// ── Admin: Access Control ─────────────────────────────────────
export const adminListAccessRules = async () => {
  const result = await apiFetch('/admin/membership/access-rules')
  return { data: result.data?.rules, error: result.error }
}
export const adminUpdateAccessRule = async (id, rule) => {
  const result = await apiFetch(`/admin/membership/access-rules/${id}`, { method: 'PUT', body: JSON.stringify(rule) })
  return { data: result.data?.rule, error: result.error }
}

// ── Admin: Settings ───────────────────────────────────────────
export const adminGetMembershipSettings = async () => {
  const result = await apiFetch('/admin/membership/settings')
  return { data: result.data ? { ...result.data.settings, razorpayEnabled: result.data.razorpayEnabled } : null, error: result.error }
}
export const adminUpdateMembershipSettings = async (settings) => {
  const result = await apiFetch('/admin/membership/settings', { method: 'PATCH', body: JSON.stringify(settings) })
  return { data: result.data?.settings, error: result.error }
}
export const adminUploadMembershipUpiQr = async (file) => {
  const tokens = getStoredTokens()
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(`${API_BASE}/admin/membership/settings/upi-qr`, {
    method: 'POST',
    headers: tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: { message: data.error || res.statusText, status: res.status } }
  return { data: data.upiQrUrl, error: null }
}

// ── Admin: Dashboard ───────────────────────────────────────────
export const adminGetMembershipStats = async () => {
  return apiFetch('/admin/membership/stats')
}

// ============================================================
// GIFT — "Surprise A Friend" module
// ============================================================

export const getGiftModuleStatus = async () => {
  const result = await apiFetch('/gift/status')
  return { data: result.data, error: result.error }
}
export const getGiftWallet = async () => apiFetch('/gift/wallet')
export const getGiftCategories = async () => {
  const result = await apiFetch('/gift/categories')
  return { data: result.data?.categories, error: result.error }
}
export const getGiftTypes = async () => {
  const result = await apiFetch('/gift/types')
  return { data: result.data?.types, error: result.error }
}
export const getGiftTemplates = async () => {
  const result = await apiFetch('/gift/templates')
  return { data: result.data?.templates, error: result.error }
}
export const getGiftTributeOptions = async ({ categoryKey, name, storyTitle, company }) => {
  const params = new URLSearchParams({ categoryKey, name: name || '', storyTitle: storyTitle || '', company: company || '' })
  const result = await apiFetch(`/gift/tribute-options?${params}`)
  return { data: result.data?.options, error: result.error }
}
export const searchGiftStories = async (q, scope = 'public', authorUsername) => {
  const params = new URLSearchParams({ q: q || '', scope, ...(authorUsername ? { authorUsername } : {}) })
  const result = await apiFetch(`/gift/stories/search?${params}`)
  return { data: result.data?.stories, error: result.error }
}
export const previewGiftCertificate = async (payload) => {
  const result = await apiFetch('/gift/preview', { method: 'POST', body: JSON.stringify(payload) })
  return { data: result.data?.previewImage, error: result.error }
}
export const uploadGiftImage = async (file) => {
  const tokens = getStoredTokens()
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(`${API_BASE}/gift/upload-image`, {
    method: 'POST',
    headers: tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: { message: data.error || 'Upload failed' } }
  return { data: data.imageUrl, error: null }
}
export const createGiftOrder = async (payload) => {
  const result = await apiFetch('/gift/create', { method: 'POST', body: JSON.stringify(payload) })
  return { data: result.data?.order, error: result.error }
}
export const createGiftRazorpayOrder = async (giftOrderId) => {
  return apiFetch('/gift/payment/order', { method: 'POST', body: JSON.stringify({ giftOrderId }) })
}
export const verifyGiftPayment = async (payload) => {
  return apiFetch('/gift/payment/verify', { method: 'POST', body: JSON.stringify(payload) })
}
export const getGiftOrder = async (id) => {
  const result = await apiFetch(`/gift/${id}`)
  return { data: result.data?.order, error: result.error }
}
export const getMyGifts = async () => {
  const result = await apiFetch('/gift/my-gifts')
  return { data: result.data?.gifts, error: result.error }
}
export const getReceivedGifts = async () => {
  const result = await apiFetch('/gift/received')
  return { data: result.data?.gifts, error: result.error }
}
export const getMyGiftPayments = async () => {
  const result = await apiFetch('/gift/my-payments')
  return { data: result.data?.payments, error: result.error }
}
export const getGiftDownloadUrl = (id, format = 'png') => `${API_BASE}/gift/${id}/download?format=${format}`
export const getTribute = async (slug) => {
  const result = await apiFetch(`/gift/tribute/${slug}`)
  return { data: result.data?.tribute, error: result.error }
}
export const shareTributeByEmail = async (tributeSlug, toEmail) => {
  return apiFetch('/gift/share/email', { method: 'POST', body: JSON.stringify({ tributeSlug, toEmail }) })
}

// ── Notifications ──────────────────────────────────────────────
export const getNotifications = async () => {
  return apiFetch('/notifications')
}
export const markNotificationRead = async (id) => {
  return apiFetch(`/notifications/${id}/read`, { method: 'POST' })
}
export const markAllNotificationsRead = async () => {
  return apiFetch('/notifications/read-all', { method: 'POST' })
}

// ── Admin: Gifting ──────────────────────────────────────────────
export const adminGetGiftCategories = async () => {
  const result = await apiFetch('/admin/gift/categories')
  return { data: result.data?.categories, error: result.error }
}
export const adminCreateGiftCategory = async (payload) => {
  const result = await apiFetch('/admin/gift/categories', { method: 'POST', body: JSON.stringify(payload) })
  return { data: result.data?.category, error: result.error }
}
export const adminUpdateGiftCategory = async (id, payload) => {
  const result = await apiFetch(`/admin/gift/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
  return { data: result.data?.category, error: result.error }
}
export const adminDeleteGiftCategory = async (id) => apiFetch(`/admin/gift/categories/${id}`, { method: 'DELETE' })

export const adminGetGiftTypes = async () => {
  const result = await apiFetch('/admin/gift/types')
  return { data: result.data?.types, error: result.error }
}
export const adminCreateGiftType = async (payload) => {
  const result = await apiFetch('/admin/gift/types', { method: 'POST', body: JSON.stringify(payload) })
  return { data: result.data?.type, error: result.error }
}
export const adminUpdateGiftType = async (id, payload) => {
  const result = await apiFetch(`/admin/gift/types/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
  return { data: result.data?.type, error: result.error }
}
export const adminDeleteGiftType = async (id) => apiFetch(`/admin/gift/types/${id}`, { method: 'DELETE' })

export const adminGetGiftTemplates = async () => {
  const result = await apiFetch('/admin/gift/templates')
  return { data: result.data, error: result.error }
}
export const adminCreateGiftTemplate = async (payload) => {
  const result = await apiFetch('/admin/gift/templates', { method: 'POST', body: JSON.stringify(payload) })
  return { data: result.data?.template, error: result.error }
}
export const adminUpdateGiftTemplate = async (id, payload) => {
  const result = await apiFetch(`/admin/gift/templates/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
  return { data: result.data?.template, error: result.error }
}
export const adminDeleteGiftTemplate = async (id) => apiFetch(`/admin/gift/templates/${id}`, { method: 'DELETE' })
export const adminGetGiftOrders = async (params = {}) => {
  const qs = new URLSearchParams(params)
  const result = await apiFetch(`/admin/gift/orders?${qs}`)
  return { data: result.data?.orders, error: result.error }
}
export const adminGetGiftOrder = async (id) => {
  return apiFetch(`/admin/gift/orders/${id}`)
}
export const adminRefundGiftOrder = async (id, notes) => {
  const result = await apiFetch(`/admin/gift/orders/${id}/refund`, { method: 'POST', body: JSON.stringify({ notes }) })
  return { data: result.data?.order, error: result.error }
}
export const adminConfirmGiftCod = async (id) => {
  const result = await apiFetch(`/admin/gift/orders/${id}/confirm-cod`, { method: 'POST' })
  return { data: result.data?.order, error: result.error }
}
export const adminSetGiftPaymentStatus = async (id, payment_status, notes) => {
  const result = await apiFetch(`/admin/gift/orders/${id}/set-payment-status`, { method: 'POST', body: JSON.stringify({ payment_status, notes }) })
  return { data: result.data?.order, error: result.error }
}
export const adminGetGiftPayments = async () => {
  const result = await apiFetch('/admin/gift/payments')
  return { data: result.data?.payments, error: result.error }
}
export const adminGetGiftAnalytics = async () => {
  return apiFetch('/admin/gift/analytics')
}
export const adminGetGiftSettings = async () => {
  return apiFetch('/admin/gift/settings')
}
export const adminUpdateGiftSettings = async (settings) => {
  const result = await apiFetch('/admin/gift/settings', { method: 'PATCH', body: JSON.stringify(settings) })
  return { data: result.data?.settings, error: result.error }
}

// Wallet coin claims
export const claimWalletTier = async (tierCost) => {
  const result = await apiFetch('/gift/wallet/claim', { method: 'POST', body: JSON.stringify({ tierCost }) })
  return { data: result.data?.claim, error: result.error }
}
export const getMyWalletClaims = async () => {
  const result = await apiFetch('/gift/wallet/claims')
  return { data: result.data?.claims, error: result.error }
}
export const redeemWalletClaim = async (claimId, payload) => {
  const result = await apiFetch(`/gift/wallet/claims/${claimId}/redeem`, { method: 'POST', body: JSON.stringify(payload) })
  return { data: result.data?.order, error: result.error }
}
export const adminGetWalletClaims = async (params = {}) => {
  const qs = new URLSearchParams(params)
  const result = await apiFetch(`/admin/gift/claims?${qs}`)
  return { data: result.data?.claims, error: result.error }
}
export const adminApproveWalletClaim = async (id, notes) => {
  const result = await apiFetch(`/admin/gift/claims/${id}/approve`, { method: 'POST', body: JSON.stringify({ notes }) })
  return { data: result.data?.claim, error: result.error }
}
export const adminRejectWalletClaim = async (id, notes) => {
  const result = await apiFetch(`/admin/gift/claims/${id}/reject`, { method: 'POST', body: JSON.stringify({ notes }) })
  return { data: result.data?.claim, error: result.error }
}
