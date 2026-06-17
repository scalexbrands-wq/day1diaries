const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, requireRole } = require('../middleware/auth')

const router = express.Router()

// ── GET /landing/data — single call for the whole landing page ──
router.get('/data', async (req, res) => {
  const [hero, categories, testimonials, habits, leaderboard, featured, stats, levels] = await Promise.all([
    pool.query('SELECT * FROM landing_hero WHERE id = 1'),
    pool.query('SELECT * FROM landing_category_counts WHERE is_active = true ORDER BY sort_order'),
    pool.query('SELECT * FROM landing_testimonials WHERE is_active = true ORDER BY sort_order'),
    pool.query('SELECT * FROM habits WHERE is_active = true ORDER BY adopters_count DESC LIMIT 6'),
    pool.query('SELECT id, username, full_name, avatar_url, level, score, stories_count FROM profiles ORDER BY score DESC LIMIT 5'),
    pool.query(`SELECT s.*, json_build_object('id', p.id, 'username', p.username, 'full_name', p.full_name, 'avatar_url', p.avatar_url) AS profiles
                 FROM stories s JOIN profiles p ON p.id = s.user_id
                 WHERE s.status = 'published' AND s.is_featured = true
                 ORDER BY s.created_at DESC LIMIT 3`),
    pool.query(`SELECT
        (SELECT count(*) FROM profiles) AS total_users,
        (SELECT count(*) FROM stories WHERE status = 'published') AS total_stories,
        (SELECT count(*) FROM user_habits) AS habit_adoptions`),
    pool.query('SELECT name, icon, min_score, max_score, color FROM gamification_levels ORDER BY sort_order'),
  ])

  // Get open jobs for landing page
  const { rows: openJobs } = await pool.query(
    `SELECT id, title, department, location, job_type, salary_min, salary_max, currency
     FROM careers_jobs WHERE is_active = true ORDER BY sort_order, created_at DESC LIMIT 6`
  ).catch(() => ({ rows: [] }))

  res.json({
    hero: hero.rows[0],
    categories: categories.rows,
    testimonials: testimonials.rows,
    habits: habits.rows,
    leaderboard: leaderboard.rows,
    featuredStories: featured.rows,
    stats: stats.rows[0],
    levels: levels.rows,
    open_jobs: openJobs,
  })
})

// ============================================================
// ADMIN — Landing content management
// ============================================================

// GET /landing/admin/hero — fetch raw hero row for the admin edit form
router.get('/admin/hero', requireAuth, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM landing_hero WHERE id = 1')
  res.json({ data: rows[0] || null })
})

// PATCH /landing/admin/hero
router.patch('/admin/hero', requireAuth, requireRole('admin'), async (req, res) => {
  const allowed = [
    'eyebrow','headline','headline_highlight','subheadline',
    'cta_primary_text','cta_secondary_text','diary_date','diary_title',
    'diary_content','diary_author_name','diary_author_role',
    'diary_likes','diary_comments','badge_1_text','badge_2_text',
    'ticker_items','is_active'
  ]
  const updates = {}
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key]
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' })

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 1}`).join(', ')
  const { rows } = await pool.query(
    `UPDATE landing_hero SET ${setClauses}, updated_at = now() WHERE id = 1 RETURNING *`,
    Object.values(updates)
  )
  res.json({ hero: rows[0] })
})

// GET /landing/admin/categories
router.get('/admin/categories', requireAuth, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM landing_categories ORDER BY sort_order')
  res.json({ categories: rows })
})

// POST /landing/admin/categories — create or update (if id provided)
router.post('/admin/categories', requireAuth, requireRole('admin'), async (req, res) => {
  const { id, icon, name, story_count_override, is_active, is_cta, sort_order } = req.body
  if (id) {
    const { rows } = await pool.query(
      `UPDATE landing_categories SET icon=$2, name=$3, story_count_override=$4, is_active=$5, is_cta=$6, sort_order=$7
       WHERE id=$1 RETURNING *`,
      [id, icon, name, story_count_override || null, is_active !== false, !!is_cta, sort_order || 0]
    )
    return res.json({ category: rows[0] })
  }
  const { rows } = await pool.query(
    `INSERT INTO landing_categories (icon, name, story_count_override, is_active, is_cta, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [icon || '📝', name, story_count_override || null, is_active !== false, !!is_cta, sort_order || 0]
  )
  res.status(201).json({ category: rows[0] })
})

// DELETE /landing/admin/categories/:id
router.delete('/admin/categories/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM landing_categories WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

// GET /landing/admin/testimonials
router.get('/admin/testimonials', requireAuth, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM landing_testimonials ORDER BY sort_order')
  res.json({ testimonials: rows })
})

// POST /landing/admin/testimonials — create or update
router.post('/admin/testimonials', requireAuth, requireRole('admin'), async (req, res) => {
  const { id, quote, author_name, author_role, author_initials, avatar_gradient, rating, is_active, sort_order } = req.body
  if (id) {
    const { rows } = await pool.query(
      `UPDATE landing_testimonials SET quote=$2, author_name=$3, author_role=$4, author_initials=$5,
        avatar_gradient=$6, rating=$7, is_active=$8, sort_order=$9 WHERE id=$1 RETURNING *`,
      [id, quote, author_name, author_role, author_initials || 'XX', avatar_gradient || 'linear-gradient(135deg,#FF6B2B,#FFD166)', rating || 5, is_active !== false, sort_order || 0]
    )
    return res.json({ testimonial: rows[0] })
  }
  const { rows } = await pool.query(
    `INSERT INTO landing_testimonials (quote, author_name, author_role, author_initials, avatar_gradient, rating, is_active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [quote, author_name, author_role, author_initials || 'XX', avatar_gradient || 'linear-gradient(135deg,#FF6B2B,#FFD166)', rating || 5, is_active !== false, sort_order || 0]
  )
  res.status(201).json({ testimonial: rows[0] })
})

// DELETE /landing/admin/testimonials/:id
router.delete('/admin/testimonials/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM landing_testimonials WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

// PATCH /landing/admin/stories/:id/feature — toggle is_featured
router.patch('/admin/stories/:id/feature', requireAuth, requireRole('admin'), async (req, res) => {
  const { featured } = req.body
  const { rows } = await pool.query(
    'UPDATE stories SET is_featured = $1 WHERE id = $2 RETURNING *',
    [!!featured, req.params.id]
  )
  res.json({ story: rows[0] })
})

// GET /landing/admin/featured-stories — for the picker UI
router.get('/admin/featured-stories', requireAuth, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.id, s.title, s.category, s.is_featured,
            json_build_object('username', p.username, 'full_name', p.full_name) AS profiles
     FROM stories s JOIN profiles p ON p.id = s.user_id
     WHERE s.status = 'published' ORDER BY s.created_at DESC LIMIT 50`
  )
  res.json({ stories: rows })
})

module.exports = router
