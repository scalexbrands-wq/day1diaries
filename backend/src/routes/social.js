const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// ── GET /social/saved ────────────────────────────────────────
// Returns the current user's saved stories
router.get('/saved', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT sv.story_id, sv.created_at AS saved_at,
            json_build_object(
              'id', s.id, 'title', s.title, 'content', s.content, 'category', s.category,
              'cover_image_url', s.cover_image_url, 'likes_count', s.likes_count,
              'comments_count', s.comments_count, 'created_at', s.created_at,
              'profiles', json_build_object('id', p.id, 'username', p.username,
                'full_name', p.full_name, 'avatar_url', p.avatar_url, 'level', p.level)
            ) AS stories
     FROM saves sv
     JOIN stories s ON s.id = sv.story_id
     JOIN profiles p ON p.id = s.user_id
     WHERE sv.user_id = $1
     ORDER BY sv.created_at DESC`,
    [req.cognitoSub]
  )
  res.json({ saved: rows })
})

// ── FOLLOWS ───────────────────────────────────────────────────

// GET /social/follow-status/:targetUserId
router.get('/follow-status/:targetUserId', requireAuth, async (req, res) => {
  const targetId = req.params.targetUserId
  // Guard against 'undefined' being passed as a string
  if (!targetId || targetId === 'undefined' || targetId === 'null') {
    return res.json({ following: false })
  }
  try {
    const { rows } = await pool.query(
      'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
      [req.cognitoSub, targetId]
    )
    res.json({ following: rows.length > 0 })
  } catch (e) {
    // Invalid UUID format etc.
    res.json({ following: false })
  }
})

// GET /social/coins — get current user coin balance
router.get('/coins', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT coins FROM profiles WHERE id=$1', [req.cognitoSub])
  res.json({ coins: rows[0]?.coins || 0 })
})

// POST /social/toggle-follow/:targetUserId
router.post('/toggle-follow/:targetUserId', requireAuth, async (req, res) => {
  const targetId = req.params.targetUserId
  if (targetId === req.cognitoSub) return res.status(400).json({ error: 'Cannot follow yourself' })

  const { rows } = await pool.query(
    'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
    [req.cognitoSub, targetId]
  )
  if (rows.length) {
    await pool.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [req.cognitoSub, targetId])
    return res.json({ following: false })
  }
  await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [req.cognitoSub, targetId])
  res.json({ following: true })
})

// GET /social/following — list of user IDs the current user follows
router.get('/following', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT following_id FROM follows WHERE follower_id = $1', [req.cognitoSub])
  res.json({ following: rows.map(r => r.following_id) })
})

// GET /social/followers/:userId
router.get('/followers/:userId', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.username, p.full_name, p.avatar_url, p.level
     FROM follows f JOIN profiles p ON p.id = f.follower_id
     WHERE f.following_id = $1`,
    [req.params.userId]
  )
  res.json({ followers: rows })
})

// ── LEADERBOARD ───────────────────────────────────────────────

// GET /social/leaderboard?limit=20
router.get('/leaderboard', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20
  const { rows } = await pool.query(
    'SELECT id, username, full_name, avatar_url, level, score, stories_count FROM profiles ORDER BY score DESC LIMIT $1',
    [limit]
  )
  res.json({ leaderboard: rows })
})

module.exports = router
