const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, requirePermission, optionalAuth } = require('../middleware/auth')

const router = express.Router()

// Window a session must have heartbeated within to count as "online now".
const PRESENCE_WINDOW_SECONDS = 90

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

// ── POST /stats/presence — heartbeat for the live "vibing rn" pill ──
// Called every ~25s from any open tab. Upserts this session's last-seen
// time and returns the current "online now" count (distinct sessions
// seen in the last PRESENCE_WINDOW_SECONDS). Opportunistically clears
// long-dead rows so the table doesn't grow unbounded — no separate
// scheduled job needed.
router.post('/presence', optionalAuth, async (req, res) => {
  const sessionId = String(req.body?.session_id || '').slice(0, 100)
  if (!sessionId) return res.status(400).json({ error: 'session_id is required' })

  await pool.query(
    `INSERT INTO live_presence (session_id, user_id, last_seen_at)
     VALUES ($1, $2, now())
     ON CONFLICT (session_id) DO UPDATE SET last_seen_at = now(), user_id = $2`,
    [sessionId, req.profile?.id || null]
  )
  await pool.query(`DELETE FROM live_presence WHERE last_seen_at < now() - interval '1 hour'`)

  const { rows } = await pool.query(
    `SELECT count(*) FROM live_presence WHERE last_seen_at > now() - interval '${PRESENCE_WINDOW_SECONDS} seconds'`
  )
  res.json({ count: Number(rows[0].count) })
})

module.exports = router
