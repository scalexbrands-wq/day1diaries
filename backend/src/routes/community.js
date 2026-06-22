const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, requirePermission, optionalAuth } = require('../middleware/auth')
const { requireFeatureAccess } = require('../services/accessControl')

const router = express.Router()

// ── GET /community ────────────────────────────────────────────
// query: type (optional event_type filter)
router.get('/', async (req, res) => {
  const { type } = req.query
  let query = 'SELECT * FROM community_updates WHERE is_published = true'
  const params = []
  if (type) { query += ' AND event_type = $1'; params.push(type) }
  query += ' ORDER BY created_at DESC'

  const { rows } = await pool.query(query, params)
  res.json({ updates: rows })
})

// ── GET /community/:id ─────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM community_updates WHERE id = $1', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Not found' })
  res.json({ update: rows[0] })
})

// ── EVENT REGISTRATIONS ─────────────────────────────────────────

// GET /community/:id/registration-status
router.get('/:id/registration-status', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id FROM event_registrations WHERE event_id = $1 AND user_id = $2',
    [req.params.id, req.cognitoSub]
  )
  res.json({ registered: rows.length > 0 })
})

// POST /community/:id/register
router.post('/:id/register', requireAuth, requireFeatureAccess('event_registration'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO event_registrations (event_id, user_id) VALUES ($1, $2)
       ON CONFLICT (event_id, user_id) DO NOTHING RETURNING *`,
      [req.params.id, req.cognitoSub]
    )
    if (!rows.length) return res.status(409).json({ error: 'Already registered' })

    await pool.query('UPDATE community_updates SET seats_booked = seats_booked + 1 WHERE id = $1', [req.params.id])
    res.status(201).json({ registration: rows[0] })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ============================================================
// ADMIN / CONTRIBUTOR — EVENT MANAGEMENT
// ============================================================

// POST /community/admin — create
router.post('/admin', requireAuth, requirePermission('manage_community_events'), async (req, res) => {
  const {
    title, description, cover_image_url, event_type, event_date,
    duration_mins, seats_available, speaker_name, speaker_bio,
    speaker_avatar, agenda, zoom_link, is_published, price
  } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' })
  if (!event_type) return res.status(400).json({ error: 'event_type required' })

  const { rows } = await pool.query(
    `INSERT INTO community_updates
       (title, description, cover_image_url, event_type, event_date, duration_mins,
        seats_available, speaker_name, speaker_bio, speaker_avatar, agenda, zoom_link, is_published, price, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [title, description || null, cover_image_url || null, event_type, event_date || null,
     duration_mins || null, seats_available || null, speaker_name || null,
     speaker_bio || null, speaker_avatar || null, agenda || null, zoom_link || null,
     is_published !== false, price || 0, req.cognitoSub]
  )
  res.status(201).json({ update: rows[0] })
})

// PATCH /community/admin/:id
router.patch('/admin/:id', requireAuth, requirePermission('manage_community_events'), async (req, res) => {
  if (req.profile.role === 'contributor') {
    const { rows } = await pool.query('SELECT created_by FROM community_updates WHERE id = $1', [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    if (rows[0].created_by !== req.cognitoSub) return res.status(403).json({ error: 'Forbidden' })
  }

  const allowed = ['title','description','cover_image_url','event_type','event_date',
                   'duration_mins','seats_available','speaker_name','speaker_bio',
                   'speaker_avatar','agenda','zoom_link','is_published','price']
  const updates = {}
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key]
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' })

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ')
  const { rows } = await pool.query(`UPDATE community_updates SET ${setClauses} WHERE id = $1 RETURNING *`, [req.params.id, ...Object.values(updates)])
  res.json({ update: rows[0] })
})

// DELETE /community/admin/:id
router.delete('/admin/:id', requireAuth, requirePermission('manage_community_events'), async (req, res) => {
  if (req.profile.role === 'contributor') {
    const { rows } = await pool.query('SELECT created_by FROM community_updates WHERE id = $1', [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    if (rows[0].created_by !== req.cognitoSub) return res.status(403).json({ error: 'Forbidden' })
  }
  await pool.query('DELETE FROM community_updates WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

module.exports = router
