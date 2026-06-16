import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env vars. Create .env with REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Auth helpers ──────────────────────────────────────────────
export const signUp = (email, password, metadata) =>
  supabase.auth.signUp({ email, password, options: { data: metadata } })

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signInGoogle = () =>
  supabase.auth.signInWithOAuth({ provider: 'google' })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

// ── Profile helpers ───────────────────────────────────────────
export const getProfile = (userId) =>
  supabase.from('profiles').select('*').eq('id', userId).single()

export const updateProfile = (userId, updates) =>
  supabase.from('profiles').update(updates).eq('id', userId)

// ── Stories helpers ───────────────────────────────────────────
export const getStories = ({ page = 0, limit = 10, category, userId, search } = {}) => {
  let q = supabase
    .from('stories')
    .select(`*, profiles(id,username,full_name,avatar_url,level)`, { count: 'exact' })
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(page * limit, page * limit + limit - 1)
  if (category) q = q.eq('category', category)
  if (userId) q = q.eq('user_id', userId)
  if (search) q = q.ilike('title', `%${search}%`)
  return q
}

export const getFeedStories = (followingIds, page = 0, limit = 10) => {
  if (!followingIds?.length) return getStories({ page, limit })
  return supabase
    .from('stories')
    .select(`*, profiles(id,username,full_name,avatar_url,level)`, { count: 'exact' })
    .eq('status', 'published')
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .range(page * limit, page * limit + limit - 1)
}

export const getTrendingStories = (limit = 20) =>
  supabase
    .from('stories')
    .select(`*, profiles(id,username,full_name,avatar_url,level)`)
    .eq('status', 'published')
    .order('likes_count', { ascending: false })
    .limit(limit)

export const getStory = (id) =>
  supabase
    .from('stories')
    .select(`*, profiles(id,username,full_name,avatar_url,bio,level,followers_count)`)
    .eq('id', id)
    .single()

export const createStory = (story) =>
  supabase.from('stories').insert(story).select().single()

export const updateStory = (id, updates) =>
  supabase.from('stories').update(updates).eq('id', id).select().single()

export const deleteStory = (id) =>
  supabase.from('stories').delete().eq('id', id)

// ── Likes ─────────────────────────────────────────────────────
export const getLike = (userId, storyId) =>
  supabase.from('likes').select('id').eq('user_id', userId).eq('story_id', storyId).maybeSingle()

export const likeStory = async (userId, storyId) => {
  const { data: existing } = await getLike(userId, storyId)
  if (existing) {
    await supabase.from('likes').delete().eq('user_id', userId).eq('story_id', storyId)
    await supabase.from('stories').update({ likes_count: supabase.rpc('decrement', { x: 1 }) }).eq('id', storyId)
    return { liked: false }
  }
  await supabase.from('likes').insert({ user_id: userId, story_id: storyId })
  await supabase.rpc('increment_likes', { story_id: storyId })
  return { liked: true }
}

// ── Comments ──────────────────────────────────────────────────
export const getComments = (storyId) =>
  supabase
    .from('comments')
    .select(`*, profiles(id,username,full_name,avatar_url)`)
    .eq('story_id', storyId)
    .order('created_at', { ascending: true })

export const addComment = (comment) =>
  supabase.from('comments').insert(comment).select(`*, profiles(id,username,full_name,avatar_url)`).single()

// ── Saves ─────────────────────────────────────────────────────
export const getSave = (userId, storyId) =>
  supabase.from('saves').select('id').eq('user_id', userId).eq('story_id', storyId).maybeSingle()

export const toggleSave = async (userId, storyId) => {
  const { data: existing } = await getSave(userId, storyId)
  if (existing) {
    await supabase.from('saves').delete().eq('user_id', userId).eq('story_id', storyId)
    return { saved: false }
  }
  await supabase.from('saves').insert({ user_id: userId, story_id: storyId })
  return { saved: true }
}

export const getSavedStories = (userId) =>
  supabase
    .from('saves')
    .select(`story_id, stories(*, profiles(id,username,full_name,avatar_url,level))`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

// ── Follow ────────────────────────────────────────────────────
export const getFollow = (followerId, followingId) =>
  supabase.from('follows').select('id').eq('follower_id', followerId).eq('following_id', followingId).maybeSingle()

export const toggleFollow = async (followerId, followingId) => {
  const { data: existing } = await getFollow(followerId, followingId)
  if (existing) {
    await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId)
    await supabase.from('profiles').update({ following_count: supabase.raw('following_count - 1') }).eq('id', followerId)
    await supabase.from('profiles').update({ followers_count: supabase.raw('followers_count - 1') }).eq('id', followingId)
    return { following: false }
  }
  await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId })
  return { following: true }
}

export const getFollowing = (userId) =>
  supabase.from('follows').select('following_id').eq('follower_id', userId)

export const getFollowers = (userId) =>
  supabase.from('follows').select('follower_id, profiles!follows_follower_id_fkey(id,username,full_name,avatar_url,level)').eq('following_id', userId)

// ── Habits ────────────────────────────────────────────────────
export const getHabits = () =>
  supabase.from('habits').select('*').order('adopters_count', { ascending: false })

export const getUserHabits = (userId) =>
  supabase.from('user_habits').select(`*, habits(*)`).eq('user_id', userId)

export const adoptHabit = (userId, habitId) =>
  supabase.from('user_habits').insert({ user_id: userId, habit_id: habitId, current_day: 1, streak: 1, last_updated: new Date().toISOString().split('T')[0] }).select().single()

export const logHabit = (log) =>
  supabase.from('habit_logs').insert(log).select().single()

export const getHabitLogs = (userId, habitId) =>
  supabase.from('habit_logs').select('*').eq('user_id', userId).eq('habit_id', habitId).order('logged_at', { ascending: true })

// ── Leaderboard ───────────────────────────────────────────────
export const getLeaderboard = (limit = 20) =>
  supabase.from('profiles').select('*').order('score', { ascending: false }).limit(limit)

// ── Admin ─────────────────────────────────────────────────────
export const adminGetUsers = (page = 0, limit = 20) =>
  supabase.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(page * limit, page * limit + limit - 1)

export const adminGetStats = async () => {
  const [users, stories, habits] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('stories').select('id', { count: 'exact', head: true }),
    supabase.from('user_habits').select('id', { count: 'exact', head: true })
  ])
  return { users: users.count, stories: stories.count, habits: habits.count }
}

export const adminFlaggedStories = () =>
  supabase.from('stories').select(`*, profiles(username)`).eq('is_flagged', true).eq('status', 'published')

export const adminModerateStory = (id, status) =>
  supabase.from('stories').update({ status }).eq('id', id)

// ── Landing Page (public, no auth needed) ────────────────────

export const getLandingStats = async () => {
  const [users, stories, habitsAdopted] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('stories').select('id', { count: 'exact', head: true }).eq('status','published'),
    supabase.from('user_habits').select('id', { count: 'exact', head: true }),
  ])
  return {
    users: users.count || 0,
    stories: stories.count || 0,
    habitAdoptions: habitsAdopted.count || 0,
  }
}

export const getLandingCategories = () =>
  supabase
    .from('landing_categories')
    .select('*')
    .order('sort_order', { ascending: true })

export const getLandingTestimonials = () =>
  supabase
    .from('landing_testimonials')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

export const getLandingHabits = () =>
  supabase
    .from('habits')
    .select('*')
    .order('adopters_count', { ascending: false })
    .limit(6)

export const getLandingLeaderboard = () =>
  supabase
    .from('profiles')
    .select('id,username,full_name,avatar_url,level,score,stories_count')
    .order('score', { ascending: false })
    .limit(5)

export const getLandingFeaturedStories = () =>
  supabase
    .from('stories')
    .select('*, profiles(id,username,full_name,avatar_url)')
    .eq('status','published')
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(3)

export const getLandingHeroContent = () =>
  supabase
    .from('landing_hero')
    .select('*')
    .eq('is_active', true)
    .single()

// ── Admin: Landing content management ────────────────────────

export const adminGetLandingHero = () =>
  supabase.from('landing_hero').select('*').single()

export const adminUpsertLandingHero = (data) =>
  supabase.from('landing_hero').upsert({ id: 1, ...data }).select().single()

export const adminGetCategories = () =>
  supabase.from('landing_categories').select('*').order('sort_order')

export const adminUpsertCategory = (cat) =>
  cat.id
    ? supabase.from('landing_categories').update(cat).eq('id', cat.id).select().single()
    : supabase.from('landing_categories').insert(cat).select().single()

export const adminDeleteCategory = (id) =>
  supabase.from('landing_categories').delete().eq('id', id)

export const adminGetTestimonials = () =>
  supabase.from('landing_testimonials').select('*').order('sort_order')

export const adminUpsertTestimonial = (t) =>
  t.id
    ? supabase.from('landing_testimonials').update(t).eq('id', t.id).select().single()
    : supabase.from('landing_testimonials').insert(t).select().single()

export const adminDeleteTestimonial = (id) =>
  supabase.from('landing_testimonials').delete().eq('id', id)

export const adminToggleFeatureStory = (id, featured) =>
  supabase.from('stories').update({ is_featured: featured }).eq('id', id).select().single()

export const adminGetFeaturedStories = () =>
  supabase.from('stories').select('id,title,category,is_featured,profiles(username,full_name)').eq('status','published').order('created_at', { ascending: false }).limit(50)

// ── Habit Challenges ──────────────────────────────────────────
export const getChallenges = () =>
  supabase.from('habit_challenges')
    .select('*, habits(title,icon)')
    .order('start_date', { ascending: true })

export const adminUpsertChallenge = (ch) =>
  ch.id
    ? supabase.from('habit_challenges').update(ch).eq('id',ch.id).select().single()
    : supabase.from('habit_challenges').insert(ch).select().single()

export const adminDeleteChallenge = (id) =>
  supabase.from('habit_challenges').delete().eq('id',id)

export const joinChallenge = (challengeId, userId) =>
  supabase.from('challenge_participations')
    .insert({ challenge_id:challengeId, user_id:userId })
    .select().single()

export const getUserChallenges = (userId) =>
  supabase.from('challenge_participations')
    .select('*, habit_challenges(*)')
    .eq('user_id', userId)

// ── Community / Events ────────────────────────────────────────
export const getCommunityUpdates = (type) => {
  let q = supabase.from('community_updates')
    .select('*').eq('is_published',true).order('created_at',{ ascending:false })
  if (type) q = q.eq('event_type', type)
  return q
}

export const getCommunityUpdate = (id) =>
  supabase.from('community_updates').select('*').eq('id',id).single()

export const adminUpsertCommunityUpdate = (cu) =>
  cu.id
    ? supabase.from('community_updates').update(cu).eq('id',cu.id).select().single()
    : supabase.from('community_updates').insert(cu).select().single()

export const adminDeleteCommunityUpdate = (id) =>
  supabase.from('community_updates').delete().eq('id',id)

export const registerForEvent = (eventId, userId) =>
  supabase.from('event_registrations')
    .insert({ event_id:eventId, user_id:userId }).select().single()

export const getUserEventRegistration = (eventId, userId) =>
  supabase.from('event_registrations')
    .select('id').eq('event_id',eventId).eq('user_id',userId).maybeSingle()

// ── Admin Habits (enhanced) ────────────────────────────────────
export const adminGetHabits = () =>
  supabase.from('habits').select('*').order('adopters_count',{ ascending:false })

export const adminUpsertHabit = (h) =>
  h.id
    ? supabase.from('habits').update(h).eq('id',h.id).select().single()
    : supabase.from('habits').insert(h).select().single()

export const adminDeleteHabit = (id) =>
  supabase.from('habits').delete().eq('id',id)

// ── Admin stats ───────────────────────────────────────────────
export const getAdminStats = () =>
  supabase.rpc('get_admin_stats')

// ── Pro badge helper ──────────────────────────────────────────
export const activateProBadge = (userId, badgeLabel = '👑 PRO') =>
  supabase.from('profiles').update({ is_pro:true, pro_badge_label:badgeLabel, plan:'pro' }).eq('id',userId)

// ── Fixed toggleFollow with proper RPC increment ────────────
export const toggleFollowFixed = async (followerId, followingId) => {
  const { data: existing } = await getFollow(followerId, followingId)
  if (existing) {
    await supabase.from('follows').delete()
      .eq('follower_id', followerId).eq('following_id', followingId)
    return { following: false }
  }
  await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId })
  return { following: true }
  // Counts updated by DB trigger trg_sync_follow_counts
}

// ── Like with trigger-based sync ────────────────────────────
export const toggleLike = async (userId, storyId) => {
  const { data: existing } = await getLike(userId, storyId)
  if (existing) {
    await supabase.from('likes').delete().eq('user_id', userId).eq('story_id', storyId)
    return { liked: false }
  }
  await supabase.from('likes').insert({ user_id: userId, story_id: storyId })
  return { liked: true }
  // Counts updated by DB trigger trg_sync_like_count
}

// ── Profile with live counts ─────────────────────────────────
export const getProfileByUsername = (username) =>
  supabase.from('profiles').select('*').eq('username', username).single()

export const getProfileLiveCounts = (userId) =>
  supabase.from('profiles')
    .select('stories_count,followers_count,following_count,likes_received,score,level,is_pro,plan')
    .eq('id', userId).single()

// ── Habit challenge details with participants ────────────────
export const getChallengeDetail = (id) =>
  supabase.from('habit_challenges')
    .select('*, habits(title,icon,description)')
    .eq('id', id).single()

export const getChallengeParticipants = (challengeId, limit = 10) =>
  supabase.from('challenge_leaderboard')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('rank', { ascending: true })
    .limit(limit)

export const getUserHabitProgress = (userId) =>
  supabase.from('user_habits')
    .select('*, habits(id,title,icon,description,category)')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })

// ── Contributor helpers ───────────────────────────────────────
export const isContributorOrAdmin = (profile) =>
  profile?.role === 'admin' || profile?.role === 'contributor'

export const adminSetRole = (userId, role) =>
  supabase.from('profiles').update({ role }).eq('id', userId).select().single()
