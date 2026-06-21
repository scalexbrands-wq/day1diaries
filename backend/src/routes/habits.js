const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, requirePermission } = require('../middleware/auth')
const { requireFeatureAccess } = require('../services/accessControl')

const router = express.Router()

// ── GET /habits ────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM habits WHERE is_active = true ORDER BY adopters_count DESC'
  )
  res.json({ habits: rows })
})

// ── GET /habits/mine — user's adopted habits + progress ────────
router.get('/mine', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT uh.*, json_build_object(
        'id', h.id, 'title', h.title, 'icon', h.icon,
        'description', h.description, 'category', h.category
      ) AS habits
     FROM user_habits uh JOIN habits h ON h.id = uh.habit_id
     WHERE uh.user_id = $1 ORDER BY uh.started_at DESC`,
    [req.cognitoSub]
  )
  res.json({ userHabits: rows })
})

// ── POST /habits/:id/adopt ──────────────────────────────────────
router.post('/:id/adopt', requireAuth, requireFeatureAccess('habit_adoption'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO user_habits (user_id, habit_id, current_day, streak, last_updated)
       VALUES ($1, $2, 1, 1, CURRENT_DATE)
       ON CONFLICT (user_id, habit_id) DO NOTHING
       RETURNING *`,
      [req.cognitoSub, req.params.id]
    )
    if (!rows.length) return res.status(409).json({ error: 'Already adopted' })

    await pool.query('UPDATE habits SET adopters_count = adopters_count + 1 WHERE id = $1', [req.params.id])
    res.status(201).json({ userHabit: rows[0] })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── POST /habits/:id/log ─────────────────────────────────────────
// body: { note }
router.post('/:id/log', requireAuth, async (req, res) => {
  const { note } = req.body
  const { rows: uh } = await pool.query(
    'SELECT * FROM user_habits WHERE user_id = $1 AND habit_id = $2',
    [req.cognitoSub, req.params.id]
  )
  if (!uh.length) return res.status(404).json({ error: 'Habit not adopted' })

  const userHabit = uh[0]
  const { rows } = await pool.query(
    `INSERT INTO habit_logs (user_id, habit_id, day_number, note) VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.cognitoSub, req.params.id, userHabit.current_day, note || '']
  )

  // Advance progress
  const today = new Date().toISOString().split('T')[0]
  const lastUpdated = userHabit.last_updated ? new Date(userHabit.last_updated).toISOString().split('T')[0] : null
  const isConsecutive = lastUpdated !== today

  await pool.query(
    `UPDATE user_habits SET
       current_day = current_day + 1,
       streak = CASE WHEN $3 THEN streak + 1 ELSE streak END,
       last_updated = CURRENT_DATE
     WHERE user_id = $1 AND habit_id = $2`,
    [req.cognitoSub, req.params.id, isConsecutive]
  )

  // Award points + track engagement
  await pool.query(
    `UPDATE profiles SET score = score + 10, engagement_points = engagement_points + 10 WHERE id = $1`,
    [req.cognitoSub]
  )

  res.status(201).json({ log: rows[0] })
})

// ── GET /habits/:id/logs ──────────────────────────────────────────
router.get('/:id/logs', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM habit_logs WHERE user_id = $1 AND habit_id = $2 ORDER BY logged_at ASC',
    [req.cognitoSub, req.params.id]
  )
  res.json({ logs: rows })
})

// ============================================================
// HABIT CHALLENGES
// ============================================================

// GET /habits/challenges/all
router.get('/challenges/all', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT hc.*, json_build_object('title', h.title, 'icon', h.icon) AS habits
     FROM habit_challenges hc LEFT JOIN habits h ON h.id = hc.habit_id
     ORDER BY hc.start_date ASC NULLS LAST`
  )
  res.json({ challenges: rows })
})

// GET /habits/challenges/:id
router.get('/challenges/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT hc.*, json_build_object('title', h.title, 'icon', h.icon, 'description', h.description) AS habits
     FROM habit_challenges hc LEFT JOIN habits h ON h.id = hc.habit_id
     WHERE hc.id = $1`,
    [req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Not found' })
  res.json({ challenge: rows[0] })
})

// GET /habits/challenges/:id/participants?limit=10
router.get('/challenges/:id/participants', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10
  const { rows } = await pool.query(
    `SELECT * FROM challenge_leaderboard WHERE challenge_id = $1 ORDER BY rank ASC LIMIT $2`,
    [req.params.id, limit]
  )
  res.json({ participants: rows })
})

// POST /habits/challenges/:id/join
router.post('/challenges/:id/join', requireAuth, requireFeatureAccess('challenge_join'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO challenge_participations (challenge_id, user_id) VALUES ($1, $2)
       ON CONFLICT (challenge_id, user_id) DO NOTHING RETURNING *`,
      [req.params.id, req.cognitoSub]
    )
    if (!rows.length) return res.status(409).json({ error: 'Already joined' })

    await pool.query('UPDATE habit_challenges SET participants_count = participants_count + 1 WHERE id = $1', [req.params.id])
    res.status(201).json({ participation: rows[0] })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// GET /habits/challenges/mine — challenges current user joined
router.get('/challenges/mine', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT cp.*, json_build_object(
        'id', hc.id, 'title', hc.title, 'description', hc.description,
        'duration_days', hc.duration_days, 'start_date', hc.start_date,
        'end_date', hc.end_date, 'reward_points', hc.reward_points,
        'status', hc.status, 'visibility', hc.visibility
      ) AS habit_challenges
     FROM challenge_participations cp
     JOIN habit_challenges hc ON hc.id = cp.challenge_id
     WHERE cp.user_id = $1`,
    [req.cognitoSub]
  )
  res.json({ myChallenges: rows })
})

// ============================================================
// ADMIN / CONTRIBUTOR — HABIT MANAGEMENT
// ============================================================

// GET /habits/admin/all
router.get('/admin/all', requireAuth, requirePermission('manage_habits'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM habits ORDER BY adopters_count DESC')
  res.json({ habits: rows })
})

// POST /habits/admin — create
router.post('/admin', requireAuth, requirePermission('manage_habits'), async (req, res) => {
  const { title, description, icon, category, adopters_count, completion_rate, likes_count, is_active } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' })

  const { rows } = await pool.query(
    `INSERT INTO habits (title, description, icon, category, adopters_count, completion_rate, likes_count, is_active, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [title, description || null, icon || '✨', category || null,
     adopters_count || 0, completion_rate || 0, likes_count || 0,
     is_active !== false, req.cognitoSub]
  )
  res.status(201).json({ habit: rows[0] })
})

// PATCH /habits/admin/:id — update
router.patch('/admin/:id', requireAuth, requirePermission('manage_habits'), async (req, res) => {
  // Contributors can only edit habits they created; admins can edit any
  if (req.profile.role === 'contributor') {
    const { rows } = await pool.query('SELECT created_by FROM habits WHERE id = $1', [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    if (rows[0].created_by !== req.cognitoSub) return res.status(403).json({ error: 'Forbidden' })
  }

  const allowed = ['title','description','icon','category','adopters_count','completion_rate','likes_count','comments_count','is_active','cover_image_url']
  const updates = {}
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key]
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' })

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ')
  const { rows } = await pool.query(`UPDATE habits SET ${setClauses} WHERE id = $1 RETURNING *`, [req.params.id, ...Object.values(updates)])
  res.json({ habit: rows[0] })
})

// DELETE /habits/admin/:id
router.delete('/admin/:id', requireAuth, requirePermission('manage_habits'), async (req, res) => {
  if (req.profile.role === 'contributor') {
    const { rows } = await pool.query('SELECT created_by FROM habits WHERE id = $1', [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    if (rows[0].created_by !== req.cognitoSub) return res.status(403).json({ error: 'Forbidden' })
  }
  await pool.query('DELETE FROM habits WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

// ── CHALLENGES ADMIN ───────────────────────────────────────────

// POST /habits/admin/challenges — create
router.post('/admin/challenges', requireAuth, requirePermission('manage_challenges'), async (req, res) => {
  const { title, description, habit_id, duration_days, start_date, end_date,
          reward_points, daily_points, weekly_points, participants_limit, visibility, status } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' })

  const { rows } = await pool.query(
    `INSERT INTO habit_challenges
       (title, description, habit_id, duration_days, start_date, end_date,
        reward_points, daily_points, weekly_points, participants_limit, visibility, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [title, description || null, habit_id || null, duration_days || 30,
     start_date || null, end_date || null, reward_points || 1000,
     daily_points || 10, weekly_points || 100, participants_limit || null,
     visibility || 'free', status || 'upcoming', req.cognitoSub]
  )
  res.status(201).json({ challenge: rows[0] })
})

// PATCH /habits/admin/challenges/:id
router.patch('/admin/challenges/:id', requireAuth, requirePermission('manage_challenges'), async (req, res) => {
  if (req.profile.role === 'contributor') {
    const { rows } = await pool.query('SELECT created_by FROM habit_challenges WHERE id = $1', [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    if (rows[0].created_by !== req.cognitoSub) return res.status(403).json({ error: 'Forbidden' })
  }

  const allowed = ['title','description','habit_id','duration_days','start_date','end_date',
                   'reward_points','daily_points','weekly_points','participants_limit',
                   'visibility','status','cover_image_url']
  const updates = {}
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key]
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' })

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ')
  const { rows } = await pool.query(`UPDATE habit_challenges SET ${setClauses} WHERE id = $1 RETURNING *`, [req.params.id, ...Object.values(updates)])
  res.json({ challenge: rows[0] })
})

// DELETE /habits/admin/challenges/:id
router.delete('/admin/challenges/:id', requireAuth, requirePermission('manage_challenges'), async (req, res) => {
  if (req.profile.role === 'contributor') {
    const { rows } = await pool.query('SELECT created_by FROM habit_challenges WHERE id = $1', [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    if (rows[0].created_by !== req.cognitoSub) return res.status(403).json({ error: 'Forbidden' })
  }
  await pool.query('DELETE FROM habit_challenges WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

module.exports = router
