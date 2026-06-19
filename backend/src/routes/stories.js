const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, optionalAuth } = require('../middleware/auth')
const { scanBadWords } = require('../utils/badWords')
const { requireFeatureAccess } = require('../services/accessControl')

const router = express.Router()

const STORY_SELECT = `
  s.*, s.visibility,
  json_build_object(
    'id', p.id, 'username', p.username, 'full_name', p.full_name,
    'avatar_url', p.avatar_url, 'level', p.level, 'is_private', p.is_private
  ) AS profiles
`

// ── GET /stories ─────────────────────────────────────────────
// query: page, limit, category, userId, search
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 0
  const limit = parseInt(req.query.limit) || 10
  const { category, userId, search } = req.query

  const conditions = [`s.status = 'published'`, `s.visibility = 'public'`]
  const params = []
  let i = 1

  if (category) { conditions.push(`s.category = $${i++}`); params.push(category) }
  if (userId)   { conditions.push(`s.user_id = $${i++}`); params.push(userId) }
  if (search)   { conditions.push(`s.title ILIKE $${i++}`); params.push(`%${search}%`) }

  params.push(limit, page * limit)

  const { rows } = await pool.query(
    `SELECT ${STORY_SELECT} FROM stories s
     JOIN profiles p ON p.id = s.user_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.created_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    params
  )
  res.json({ stories: rows })
})

// ── GET /stories/feed ────────────────────────────────────────
// Following-first: stories from followed users first (visibility: public or followers_only),
// then trending public stories to fill the rest.
router.get('/feed', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 0
  const limit = parseInt(req.query.limit) || 10
  const offset = page * limit

  // Get who this user follows
  const { rows: followRows } = await pool.query(
    'SELECT following_id FROM follows WHERE follower_id = $1',
    [req.cognitoSub]
  )
  const followingIds = followRows.map(r => r.following_id)

  if (!followingIds.length) {
    // No follows: show all public stories; private-account ones will be locked in the UI
    const { rows } = await pool.query(
      `SELECT ${STORY_SELECT}, false AS viewer_follows_author
       FROM stories s JOIN profiles p ON p.id = s.user_id
       WHERE s.status = 'published' AND s.visibility = 'public'
       ORDER BY s.likes_count DESC, s.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    return res.json({ stories: rows, mode: 'trending' })
  }

  // Following-first feed: followed stories + all public stories (private ones locked in UI)
  const { rows } = await pool.query(
    `SELECT ${STORY_SELECT},
       CASE WHEN s.user_id = ANY($1) THEN 0 ELSE 1 END AS feed_priority,
       CASE WHEN s.user_id = ANY($1) THEN true ELSE false END AS viewer_follows_author
     FROM stories s JOIN profiles p ON p.id = s.user_id
     WHERE s.status = 'published'
       AND (
         (s.user_id = ANY($1) AND s.visibility IN ('public','followers_only'))
         OR s.visibility = 'public'
       )
     ORDER BY feed_priority ASC, s.created_at DESC
     LIMIT $2 OFFSET $3`,
    [followingIds, limit, offset]
  )
  res.json({ stories: rows, mode: 'mixed' })
})

// ── GET /stories/by-categories?categories=a,b,c — stories matching any of the given categories ──
router.get('/by-categories', async (req, res) => {
  const categories = (req.query.categories || '').split(',').map(c => c.trim()).filter(Boolean)
  const page = parseInt(req.query.page) || 0
  const limit = parseInt(req.query.limit) || 10
  if (!categories.length) return res.json({ stories: [] })

  const { rows } = await pool.query(
    `SELECT ${STORY_SELECT} FROM stories s
     JOIN profiles p ON p.id = s.user_id
     WHERE s.status = 'published' AND s.visibility = 'public' AND s.category = ANY($1)
     ORDER BY s.created_at DESC
     LIMIT $2 OFFSET $3`,
    [categories, limit, page * limit]
  )
  res.json({ stories: rows })
})

// ── GET /stories/categories — returns active categories from DB ──
router.get('/categories', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, icon, sort_order FROM story_categories WHERE is_active = true ORDER BY sort_order, name'
  )
  // Fallback to hardcoded list if table is empty
  if (!rows.length) {
    return res.json({ categories: [
      {name:'First Day at Job',icon:'💼'},{name:'First Startup Experience',icon:'🚀'},
      {name:'First Business Client',icon:'🤝'},{name:'First College Day',icon:'🎓'},
      {name:'First Failure',icon:'💪'},{name:'First Success',icon:'🏆'},
      {name:'Habit Transformation',icon:'🔄'}
    ]})
  }
  res.json({ categories: rows })
})

// ── GET /stories/trending ─────────────────────────────────────
router.get('/trending', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20
  const { rows } = await pool.query(
    `SELECT ${STORY_SELECT} FROM stories s JOIN profiles p ON p.id = s.user_id
     WHERE s.status = 'published' ORDER BY s.likes_count DESC LIMIT $1`,
    [limit]
  )
  res.json({ stories: rows })
})

// ── GET /stories/suggested-users ─────────────────────────────
// Returns users not yet followed by the current user, sorted by followers
router.get('/suggested-users', requireAuth, async (req, res) => {
  const limit = parseInt(req.query.limit) || 5
  const { rows } = await pool.query(
    `SELECT p.id, p.username, p.full_name, p.avatar_url, p.stories_count, p.followers_count, p.level
     FROM profiles p
     WHERE p.id != $1
       AND p.is_private = false
       AND p.id NOT IN (SELECT following_id FROM follows WHERE follower_id = $1)
     ORDER BY p.followers_count DESC, p.stories_count DESC
     LIMIT $2`,
    [req.cognitoSub, limit]
  )
  res.json({ users: rows })
})

// GET /stories/my-unlocks — IDs of stories this user has already unlocked
// IMPORTANT: must be before /:id to avoid param capture
router.get('/my-unlocks', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT story_id FROM story_unlocks WHERE user_id = $1',
    [req.cognitoSub]
  )
  res.json({ unlockedIds: rows.map(r => r.story_id) })
})

// ── GET /stories/:id ───────────────────────────────────────────
// optionalAuth so logged-in free users can be metered on story_viewing —
// anonymous visitors are untracked/unrestricted (see services/accessControl.js).
router.get('/:id', optionalAuth, requireFeatureAccess('story_viewing'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*, json_build_object(
        'id', p.id, 'username', p.username, 'full_name', p.full_name,
        'avatar_url', p.avatar_url, 'bio', p.bio, 'level', p.level,
        'followers_count', p.followers_count, 'is_private', p.is_private
      ) AS profiles
     FROM stories s JOIN profiles p ON p.id = s.user_id WHERE s.id = $1`,
    [req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Story not found' })
  res.json({ story: rows[0] })
})

// ── POST /stories ───────────────────────────────────────────────
// body: { title, content, category, tags, cover_image_url, status }
router.post('/', requireAuth, requireFeatureAccess('story_creation'), async (req, res) => {
  const { title, content: body, category, tags, cover_image_url, status, visibility } = req.body
  if (!title || !body || !category) {
    return res.status(400).json({ error: 'title, content, and category are required' })
  }
  const vis = ['public','followers_only','private'].includes(visibility) ? visibility : 'public'
  const finalStatus = status || 'published'

  // Scan for bad words in title + content
  const badFound = scanBadWords(`${title} ${body}`)
  const isFlagged = badFound.length > 0
  const flagReason = isFlagged ? `Detected: ${badFound.join(', ')}` : null

  const { rows } = await pool.query(
    `INSERT INTO stories (user_id, title, content, category, tags, cover_image_url, status, visibility, is_flagged, flag_reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [req.cognitoSub, title, body, category, tags || [], cover_image_url || null, finalStatus, vis, isFlagged, flagReason]
  )

  // Daily story update bonus: +20 score + coins if this is the first published story today
  if (finalStatus === 'published') {
    try {
      const { rows: todayStories } = await pool.query(
        `SELECT id FROM stories
         WHERE user_id = $1 AND status = 'published'
           AND DATE(created_at) = CURRENT_DATE AND id != $2
         LIMIT 1`,
        [req.cognitoSub, rows[0].id]
      )
      if (!todayStories.length) {
        await pool.query(
          'UPDATE profiles SET score = score + 20, coins = coins + 20 WHERE id = $1',
          [req.cognitoSub]
        )
      }
    } catch (bonusErr) {
      console.error('Daily story bonus error (non-fatal):', bonusErr.message)
    }
  }

  res.status(201).json({ story: rows[0] })
})

// ── PATCH /stories/:id ─────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  const { rows: existing } = await pool.query('SELECT user_id FROM stories WHERE id = $1', [req.params.id])
  if (!existing.length) return res.status(404).json({ error: 'Not found' })
  if (existing[0].user_id !== req.cognitoSub && req.profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const allowed = ['title', 'content', 'category', 'tags', 'cover_image_url', 'status', 'visibility']
  const updates = {}
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key]
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' })

  // Re-scan for bad words if title or content changed
  if (updates.title !== undefined || updates.content !== undefined) {
    const { rows: cur } = await pool.query('SELECT title, content FROM stories WHERE id = $1', [req.params.id])
    const checkTitle = updates.title ?? cur[0]?.title ?? ''
    const checkContent = updates.content ?? cur[0]?.content ?? ''
    const badFound = scanBadWords(`${checkTitle} ${checkContent}`)
    updates.is_flagged = badFound.length > 0
    updates.flag_reason = badFound.length > 0 ? `Detected: ${badFound.join(', ')}` : null
  }

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ')
  const { rows } = await pool.query(
    `UPDATE stories SET ${setClauses} WHERE id = $1 RETURNING *`,
    [req.params.id, ...Object.values(updates)]
  )
  res.json({ story: rows[0] })
})

// ── DELETE /stories/:id ────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  const { rows: existing } = await pool.query('SELECT user_id FROM stories WHERE id = $1', [req.params.id])
  if (!existing.length) return res.status(404).json({ error: 'Not found' })
  if (existing[0].user_id !== req.cognitoSub && req.profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  await pool.query('DELETE FROM stories WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

// ── LIKES ───────────────────────────────────────────────────────

// GET /stories/:id/like-status
router.get('/:id/like-status', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id FROM likes WHERE user_id = $1 AND story_id = $2',
    [req.cognitoSub, req.params.id]
  )
  res.json({ liked: rows.length > 0 })
})

// POST /stories/:id/toggle-like
router.post('/:id/toggle-like', requireAuth, async (req, res) => {
  const storyId = req.params.id
  const { rows } = await pool.query(
    'SELECT id FROM likes WHERE user_id = $1 AND story_id = $2',
    [req.cognitoSub, storyId]
  )
  if (rows.length) {
    await pool.query('DELETE FROM likes WHERE user_id = $1 AND story_id = $2', [req.cognitoSub, storyId])
    return res.json({ liked: false })
  }
  await pool.query('INSERT INTO likes (user_id, story_id) VALUES ($1, $2)', [req.cognitoSub, storyId])

  // Award +10 score + coins to liker and story owner
  try {
    const { rows: storyRows } = await pool.query('SELECT user_id FROM stories WHERE id = $1', [storyId])
    if (storyRows.length) {
      const ownerId = storyRows[0].user_id
      await pool.query(
        'UPDATE profiles SET score = score + 10, coins = coins + 10 WHERE id = $1',
        [req.cognitoSub]
      )
      if (ownerId !== req.cognitoSub) {
        await pool.query(
          'UPDATE profiles SET score = score + 10, coins = coins + 10 WHERE id = $1',
          [ownerId]
        )
      }
    }
  } catch (pointsErr) {
    console.error('Like points error (non-fatal):', pointsErr.message)
  }

  res.json({ liked: true })
})

// ── COMMENTS ────────────────────────────────────────────────────

// GET /stories/:id/comments
router.get('/:id/comments', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.*, json_build_object('id', p.id, 'username', p.username, 'full_name', p.full_name, 'avatar_url', p.avatar_url) AS profiles
     FROM comments c JOIN profiles p ON p.id = c.user_id
     WHERE c.story_id = $1 ORDER BY c.created_at ASC`,
    [req.params.id]
  )
  res.json({ comments: rows })
})

// POST /stories/:id/comments  body: { content }
router.post('/:id/comments', requireAuth, requireFeatureAccess('community_post'), async (req, res) => {
  const { content } = req.body
  if (!content?.trim()) return res.status(400).json({ error: 'content required' })

  const { rows } = await pool.query(
    `INSERT INTO comments (story_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
    [req.params.id, req.cognitoSub, content]
  )
  const comment = rows[0]

  const [profileRows, storyRows] = await Promise.all([
    pool.query('SELECT id, username, full_name, avatar_url FROM profiles WHERE id = $1', [req.cognitoSub]),
    pool.query('SELECT user_id FROM stories WHERE id = $1', [req.params.id]),
  ])

  // Award +10 to commenter, +10 to story owner
  try {
    await pool.query(
      'UPDATE profiles SET score = score + 10, coins = coins + 10 WHERE id = $1',
      [req.cognitoSub]
    )
    const ownerId = storyRows.rows[0]?.user_id
    if (ownerId && ownerId !== req.cognitoSub) {
      await pool.query(
        'UPDATE profiles SET score = score + 10, coins = coins + 10 WHERE id = $1',
        [ownerId]
      )
    }
  } catch (pointsErr) {
    console.error('Comment points error (non-fatal):', pointsErr.message)
  }

  res.status(201).json({ comment: { ...comment, profiles: profileRows.rows[0] } })
})

// ── SHARES ───────────────────────────────────────────────────────

// POST /stories/:id/share — records share, awards +10 to sharer
router.post('/:id/share', requireAuth, async (req, res) => {
  const storyId = req.params.id

  await pool.query(
    'UPDATE stories SET shares_count = COALESCE(shares_count, 0) + 1 WHERE id = $1',
    [storyId]
  )

  try {
    await pool.query(
      'UPDATE profiles SET score = score + 10, coins = coins + 10 WHERE id = $1',
      [req.cognitoSub]
    )
  } catch (pointsErr) {
    console.error('Share points error (non-fatal):', pointsErr.message)
  }

  const { rows } = await pool.query('SELECT shares_count FROM stories WHERE id = $1', [storyId])
  res.json({ shares_count: rows[0]?.shares_count || 0 })
})

// ── SAVES ───────────────────────────────────────────────────────

// GET /stories/:id/save-status
router.get('/:id/save-status', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id FROM saves WHERE user_id = $1 AND story_id = $2',
    [req.cognitoSub, req.params.id]
  )
  res.json({ saved: rows.length > 0 })
})

// POST /stories/:id/toggle-save
router.post('/:id/toggle-save', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id FROM saves WHERE user_id = $1 AND story_id = $2',
    [req.cognitoSub, req.params.id]
  )
  if (rows.length) {
    await pool.query('DELETE FROM saves WHERE user_id = $1 AND story_id = $2', [req.cognitoSub, req.params.id])
    return res.json({ saved: false })
  }
  await pool.query('INSERT INTO saves (user_id, story_id) VALUES ($1, $2)', [req.cognitoSub, req.params.id])
  res.json({ saved: true })
})

// ── UNLOCK ──────────────────────────────────────────────────────

// POST /stories/:id/unlock — spend 10 coins to unlock a private-user story
router.post('/:id/unlock', requireAuth, async (req, res) => {
  const storyId = req.params.id
  const userId = req.cognitoSub
  const UNLOCK_COST = 10

  // Check if already unlocked
  const { rows: existingUnlock } = await pool.query(
    'SELECT id FROM story_unlocks WHERE user_id = $1 AND story_id = $2',
    [userId, storyId]
  )
  if (existingUnlock.length) {
    return res.json({ unlocked: true, alreadyUnlocked: true, coinsSpent: 0 })
  }

  // Story owner and followers never pay
  const { rows: storyRows } = await pool.query(
    'SELECT user_id FROM stories WHERE id = $1',
    [storyId]
  )
  if (!storyRows.length) return res.status(404).json({ error: 'Story not found' })

  if (storyRows[0].user_id === userId) {
    return res.json({ unlocked: true, alreadyUnlocked: true, coinsSpent: 0 })
  }

  const { rows: followRows } = await pool.query(
    'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
    [userId, storyRows[0].user_id]
  )
  if (followRows.length) {
    return res.json({ unlocked: true, alreadyUnlocked: true, coinsSpent: 0 })
  }

  // Check coins
  const { rows: profileRows } = await pool.query(
    'SELECT coins FROM profiles WHERE id = $1',
    [userId]
  )
  const coins = profileRows[0]?.coins || 0
  if (coins < UNLOCK_COST) {
    return res.status(402).json({
      error: `Not enough points. You need ${UNLOCK_COST} points but have ${coins}.`,
      coins,
    })
  }

  // Deduct coins and record unlock
  await pool.query('UPDATE profiles SET coins = coins - $1 WHERE id = $2', [UNLOCK_COST, userId])
  await pool.query(
    'INSERT INTO story_unlocks (user_id, story_id, coins_spent) VALUES ($1, $2, $3)',
    [userId, storyId, UNLOCK_COST]
  )

  res.json({ unlocked: true, alreadyUnlocked: false, coinsSpent: UNLOCK_COST })
})

// ── POST /stories/:id/view — track story read (deduped per user) ──
router.post('/:id/view', optionalAuth, async (req, res) => {
  const storyId = req.params.id
  const userId = req.cognitoSub
  if (!userId) return res.json({ recorded: false })

  const { rows: storyRows } = await pool.query('SELECT user_id FROM stories WHERE id=$1', [storyId])
  const ownerId = storyRows[0]?.user_id
  if (!ownerId || ownerId === userId) return res.json({ recorded: false })

  const { rowCount } = await pool.query(
    'INSERT INTO story_views (user_id, story_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [userId, storyId]
  )
  if (rowCount > 0) {
    await Promise.all([
      pool.query(
        'UPDATE profiles SET stories_read = COALESCE(stories_read,0) + 1, score = score + 10, coins = coins + 10 WHERE id = $1',
        [userId]
      ),
      pool.query(
        'UPDATE profiles SET score = score + 10, coins = coins + 10 WHERE id = $1',
        [ownerId]
      ),
    ])
  }
  res.json({ recorded: rowCount > 0 })
})

// ── GET /profiles/:username/stories-read — count stories read by a user ──
router.get('/reader/:userId/count', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT COALESCE(stories_read,0) AS stories_read FROM profiles WHERE id=$1',
    [req.params.userId]
  )
  res.json({ stories_read: rows[0]?.stories_read || 0 })
})

module.exports = router
