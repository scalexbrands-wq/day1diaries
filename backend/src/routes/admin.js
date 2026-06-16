const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, requireRole } = require('../middleware/auth')

const router = express.Router()

// ── GET /admin/stats ──────────────────────────────────────────
router.get('/stats', requireAuth, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT json_build_object(
      'total_users',       (SELECT count(*) FROM profiles),
      'active_users',      (SELECT count(*) FROM profiles WHERE updated_at > now() - interval '30 days'),
      'total_habits',      (SELECT count(*) FROM habits),
      'active_challenges', (SELECT count(*) FROM habit_challenges WHERE status = 'active'),
      'total_stories',     (SELECT count(*) FROM stories WHERE status = 'published'),
      'total_events',      (SELECT count(*) FROM community_updates WHERE is_published = true),
      'events_booked',     (SELECT count(*) FROM event_registrations)
    ) AS stats
  `)
  res.json({ stats: rows[0].stats })
})

// ── GET /admin/users ──────────────────────────────────────────
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  const page = parseInt(req.query.page) || 0
  const limit = parseInt(req.query.limit) || 100
  const { rows } = await pool.query(
    'SELECT * FROM profiles ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, page * limit]
  )
  res.json({ users: rows })
})

// ── PATCH /admin/users/:id/role ────────────────────────────────
// body: { role }  — 'user' | 'contributor' | 'admin'
router.patch('/users/:id/role', requireAuth, requireRole('admin'), async (req, res) => {
  const { role } = req.body
  if (!['user', 'contributor', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }
  const { rows } = await pool.query(
    'UPDATE profiles SET role = $1 WHERE id = $2 RETURNING *',
    [role, req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'User not found' })
  res.json({ profile: rows[0] })
})

// ── GET /admin/flagged-stories ─────────────────────────────────
router.get('/flagged-stories', requireAuth, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*, json_build_object('username', p.username) AS profiles
     FROM stories s JOIN profiles p ON p.id = s.user_id
     WHERE s.is_flagged = true AND s.status = 'published'`
  )
  res.json({ stories: rows })
})

// ── PATCH /admin/stories/:id/moderate ──────────────────────────
// body: { status }  — 'published' | 'removed'
router.patch('/stories/:id/moderate', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.body
  if (!['published', 'removed'].includes(status)) return res.status(400).json({ error: 'Invalid status' })

  await pool.query(
    'UPDATE stories SET status = $1, is_flagged = false WHERE id = $2',
    [status, req.params.id]
  )
  res.json({ success: true })
})

// ── GET /admin/settings ─────────────────────────────────────────
// Returns all app settings as a flat object, e.g. { email_verification_required: true }
router.get('/settings', requireAuth, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT key, value FROM app_settings')
  const settings = {}
  for (const row of rows) settings[row.key] = row.value
  res.json({ settings })
})

// ── PATCH /admin/settings ───────────────────────────────────────
// body: { key: value, ... } — upserts one or more settings
router.patch('/settings', requireAuth, requireRole('admin'), async (req, res) => {
  const entries = Object.entries(req.body || {})
  if (!entries.length) return res.status(400).json({ error: 'No settings provided' })

  for (const [key, value] of entries) {
    await pool.query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
      [key, JSON.stringify(value)]
    )
  }

  const { rows } = await pool.query('SELECT key, value FROM app_settings')
  const settings = {}
  for (const row of rows) settings[row.key] = row.value
  res.json({ settings })
})

module.exports = router
