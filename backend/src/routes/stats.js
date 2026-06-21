const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, requirePermission } = require('../middleware/auth')

const router = express.Router()

// GET /stats/visit — current global page-visit count, no increment
router.get('/visit', async (req, res) => {
  const { rows } = await pool.query('SELECT count FROM site_visit_counter WHERE id = 1')
  res.json({ count: Number(rows[0]?.count || 0) })
})

// POST /stats/visit — increments the global page-visit count by 1 and
// returns the new total. Called once per page load from the frontend.
router.post('/visit', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE site_visit_counter SET count = count + 1, updated_at = now() WHERE id = 1 RETURNING count`
  )
  res.json({ count: Number(rows[0].count) })
})

// PATCH /stats/visit — admin override of the counter value
router.patch('/visit', requireAuth, requirePermission('manage_settings'), async (req, res) => {
  const count = parseInt(req.body.count, 10)
  if (!Number.isFinite(count) || count < 0) return res.status(400).json({ error: 'count must be a non-negative integer' })
  const { rows } = await pool.query(
    `UPDATE site_visit_counter SET count = $1, updated_at = now() WHERE id = 1 RETURNING count`,
    [count]
  )
  res.json({ count: Number(rows[0].count) })
})

module.exports = router
