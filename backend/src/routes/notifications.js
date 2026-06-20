const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.profile.id]
  )
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND is_read = false`,
    [req.profile.id]
  )
  res.json({ notifications: rows, unreadCount: countRows[0].n })
})

router.post('/:id/read', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
    [req.params.id, req.profile.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Notification not found' })
  res.json({ notification: rows[0] })
})

router.post('/read-all', async (req, res) => {
  await pool.query(`UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`, [req.profile.id])
  res.json({ success: true })
})

module.exports = router
