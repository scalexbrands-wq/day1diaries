const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, requirePermission } = require('../middleware/auth')

const router = express.Router()

// GET /announcements/active — unread active announcements for logged-in user
router.get('/active', requireAuth, async (req, res) => {
  const userId = req.cognitoSub
  const { rows } = await pool.query(
    `SELECT a.*
     FROM announcements a
     WHERE a.is_active = true
       AND NOT EXISTS (
         SELECT 1 FROM announcement_reads ar
         WHERE ar.announcement_id = a.id AND ar.user_id = $1
       )
     ORDER BY a.created_at DESC`,
    [userId]
  )
  res.json({ announcements: rows })
})

// POST /announcements/:id/dismiss
router.post('/:id/dismiss', requireAuth, async (req, res) => {
  await pool.query(
    `INSERT INTO announcement_reads (user_id, announcement_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [req.cognitoSub, req.params.id]
  )
  res.json({ dismissed: true })
})

// ── Admin CRUD ────────────────────────────────────────────────

// GET /announcements (admin)
router.get('/', requireAuth, requirePermission('manage_announcements'), async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM announcements ORDER BY created_at DESC'
  )
  res.json({ announcements: rows })
})

// POST /announcements (admin)
router.post('/', requireAuth, requirePermission('manage_announcements'), async (req, res) => {
  const { title, message, emoji, bg_color } = req.body
  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'title and message required' })
  }
  const { rows } = await pool.query(
    `INSERT INTO announcements (title, message, emoji, bg_color, created_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [title.trim(), message.trim(), emoji || '📢', bg_color || '#FF6B2B', req.cognitoSub]
  )
  res.status(201).json({ announcement: rows[0] })
})

// PUT /announcements/:id (admin)
router.put('/:id', requireAuth, requirePermission('manage_announcements'), async (req, res) => {
  const { title, message, emoji, bg_color, is_active } = req.body
  const { rows } = await pool.query(
    `UPDATE announcements
     SET title=$1, message=$2, emoji=$3, bg_color=$4, is_active=$5, updated_at=now()
     WHERE id=$6 RETURNING *`,
    [title, message, emoji || '📢', bg_color || '#FF6B2B', is_active ?? true, req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Not found' })
  res.json({ announcement: rows[0] })
})

// DELETE /announcements/:id (admin)
router.delete('/:id', requireAuth, requirePermission('manage_announcements'), async (req, res) => {
  await pool.query('DELETE FROM announcements WHERE id=$1', [req.params.id])
  res.json({ deleted: true })
})

module.exports = router
