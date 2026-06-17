const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, optionalAuth } = require('../middleware/auth')

const router = express.Router()

// ── GET /profiles/by-id/:userId ──────────────────────────────
router.get('/by-id/:userId', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM profiles WHERE id = $1', [req.params.userId])
  if (!rows.length) return res.status(404).json({ error: 'Profile not found' })
  res.json({ profile: rows[0] })
})

// ── GET /profiles/:username ─────────────────────────────────
router.get('/:username', optionalAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM profiles WHERE username = $1', [req.params.username])
  if (!rows.length) return res.status(404).json({ error: 'Profile not found' })
  const profile = rows[0]

  // For private accounts, check if requester follows them
  if (profile.is_private && req.cognitoSub !== profile.id) {
    const isFollowing = req.cognitoSub
      ? (await pool.query('SELECT id FROM follows WHERE follower_id=$1 AND following_id=$2', [req.cognitoSub, profile.id])).rows.length > 0
      : false
    return res.json({ profile: { ...profile, is_locked: !isFollowing }, is_locked: !isFollowing })
  }
  res.json({ profile })
})

// ── GET /profiles/:username/live-counts ─────────────────────
router.get('/:username/live-counts', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT stories_count, followers_count, following_count, likes_received, score, level
     FROM profiles WHERE username = $1`,
    [req.params.username]
  )
  if (!rows.length) return res.status(404).json({ error: 'Not found' })
  res.json({ counts: rows[0] })
})

// ── PATCH /profiles/me ───────────────────────────────────────
// body: { full_name, bio, location, avatar_url }
router.patch('/me', requireAuth, async (req, res) => {
  const allowed = ['full_name', 'bio', 'location', 'avatar_url', 'is_private']
  const updates = {}
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key]
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields to update' })

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ')
  const values = [req.cognitoSub, ...Object.values(updates)]

  const { rows } = await pool.query(
    `UPDATE profiles SET ${setClauses} WHERE id = $1 RETURNING *`,
    values
  )
  res.json({ profile: rows[0] })
})

// ── GET /profiles/me/role-check ──────────────────────────────
router.get('/me/role-check', requireAuth, (req, res) => {
  res.json({ role: req.profile?.role || 'user', isContributorOrAdmin: ['admin','contributor'].includes(req.profile?.role) })
})

// ── Admin: GET /profiles/admin/categories ──────────────────
router.get('/admin/categories', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM story_categories ORDER BY sort_order, name')
  res.json({ categories: rows })
})

// ── Admin: POST /profiles/admin/categories — upsert ─────────
router.post('/admin/categories', requireAuth, async (req, res) => {
  const { id, name, icon, sort_order, is_active } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
  if (id) {
    const { rows } = await pool.query(
      'UPDATE story_categories SET name=$1, icon=$2, sort_order=$3, is_active=$4 WHERE id=$5 RETURNING *',
      [name, icon||'📖', sort_order||0, is_active!==false, id]
    )
    return res.json({ category: rows[0] })
  }
  const { rows } = await pool.query(
    'INSERT INTO story_categories (name, icon, sort_order, is_active) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, icon||'📖', sort_order||0, is_active!==false]
  )
  res.json({ category: rows[0] })
})

// ── Admin: DELETE /profiles/admin/categories/:id ─────────────
router.delete('/admin/categories/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM story_categories WHERE id=$1', [req.params.id])
  res.json({ success: true })
})

module.exports = router
