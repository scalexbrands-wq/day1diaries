const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, optionalAuth } = require('../middleware/auth')

const router = express.Router()

const STORY_SELECT = `
  s.*, s.visibility,
  json_build_object(
    'id', p.id, 'username', p.username, 'full_name', p.full_name,
    'avatar_url', p.avatar_url, 'level', p.level
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
    // No follows: trending public stories
    const { rows } = await pool.query(
      `SELECT ${STORY_SELECT} FROM stories s JOIN profiles p ON p.id = s.user_id
       WHERE s.status = 'published' AND s.visibility = 'public'
         AND p.is_private = false
       ORDER BY s.likes_count DESC, s.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    return res.json({ stories: rows, mode: 'trending' })
  }

  // Following-first feed: mix followed stories + trending fill
  const { rows } = await pool.query(
    `SELECT ${STORY_SELECT},
       CASE WHEN s.user_id = ANY($1) THEN 0 ELSE 1 END AS feed_priority
     FROM stories s JOIN profiles p ON p.id = s.user_id
     WHERE s.status = 'published'
       AND (
         (s.user_id = ANY($1) AND s.visibility IN ('public','followers_only'))
         OR
         (s.visibility = 'public' AND p.is_private = false)
       )
     ORDER BY feed_priority ASC, s.created_at DESC
     LIMIT $2 OFFSET $3`,
    [followingIds, limit, offset]
  )
  res.json({ stories: rows, mode: 'mixed' })
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

// ── GET /stories/:id ───────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*, json_build_object(
        'id', p.id, 'username', p.username, 'full_name', p.full_name,
        'avatar_url', p.avatar_url, 'bio', p.bio, 'level', p.level,
        'followers_count', p.followers_count
      ) AS profiles
     FROM stories s JOIN profiles p ON p.id = s.user_id WHERE s.id = $1`,
    [req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Story not found' })
  res.json({ story: rows[0] })
})

// ── POST /stories ───────────────────────────────────────────────
// body: { title, content, category, tags, cover_image_url, status }
router.post('/', requireAuth, async (req, res) => {
  const { title, content: body, category, tags, cover_image_url, status, visibility } = req.body
  if (!title || !body || !category) {
    return res.status(400).json({ error: 'title, content, and category are required' })
  }
  const vis = ['public','followers_only','private'].includes(visibility) ? visibility : 'public'

  const { rows } = await pool.query(
    `INSERT INTO stories (user_id, title, content, category, tags, cover_image_url, status, visibility)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [req.cognitoSub, title, body, category, tags || [], cover_image_url || null, status || 'published', vis]
  )
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
  const { rows } = await pool.query(
    'SELECT id FROM likes WHERE user_id = $1 AND story_id = $2',
    [req.cognitoSub, req.params.id]
  )
  if (rows.length) {
    await pool.query('DELETE FROM likes WHERE user_id = $1 AND story_id = $2', [req.cognitoSub, req.params.id])
    return res.json({ liked: false })
  }
  await pool.query('INSERT INTO likes (user_id, story_id) VALUES ($1, $2)', [req.cognitoSub, req.params.id])
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
router.post('/:id/comments', requireAuth, async (req, res) => {
  const { content } = req.body
  if (!content?.trim()) return res.status(400).json({ error: 'content required' })

  const { rows } = await pool.query(
    `INSERT INTO comments (story_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
    [req.params.id, req.cognitoSub, content]
  )
  const comment = rows[0]
  const { rows: profileRows } = await pool.query(
    'SELECT id, username, full_name, avatar_url FROM profiles WHERE id = $1', [req.cognitoSub]
  )
  res.status(201).json({ comment: { ...comment, profiles: profileRows[0] } })
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

module.exports = router
