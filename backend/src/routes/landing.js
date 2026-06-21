const express = require('express')
const multer = require('multer')
const { pool } = require('../db/pool')
const { requireAuth, requirePermission } = require('../middleware/auth')
const imageStorage = require('../utils/imageStorage')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(Object.assign(new Error('Only image files are allowed'), { status: 400 }))
    cb(null, true)
  },
})

// ── GET /landing/data — single call for the whole landing page ──
router.get('/data', async (req, res) => {
  const [hero, bottomSection, categories, testimonials, habits, leaderboard, featured, stats, levels] = await Promise.all([
    pool.query('SELECT * FROM landing_hero WHERE id = 1'),
    pool.query('SELECT * FROM landing_bottom_section WHERE id = 1'),
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
    bottomSection: bottomSection.rows[0],
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

const LANDING_TEMPLATES = ['classic', 'editorial', 'bento', 'kinetic', 'slideshow']

// GET /landing/template — which design template is live right now.
// Public (no auth) since it's read on every visit to "/" before login.
router.get('/template', async (req, res) => {
  const { rows } = await pool.query(`SELECT value FROM app_settings WHERE key = 'landing.active_template'`)
  const template = rows[0]?.value
  res.json({ template: LANDING_TEMPLATES.includes(template) ? template : 'classic' })
})

// ============================================================
// ADMIN — Landing content management
// ============================================================

// PATCH /landing/admin/template — switch which design is shown on "/"
router.patch('/admin/template', requireAuth, requirePermission('manage_landing_content'), async (req, res) => {
  const { template } = req.body
  if (!LANDING_TEMPLATES.includes(template)) {
    return res.status(400).json({ error: `template must be one of: ${LANDING_TEMPLATES.join(', ')}` })
  }
  await pool.query(
    `INSERT INTO app_settings (key, value) VALUES ('landing.active_template', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
    [JSON.stringify(template)]
  )
  res.json({ template })
})

// GET /landing/admin/hero — fetch raw hero row for the admin edit form
router.get('/admin/hero', requireAuth, requirePermission('manage_landing_content'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM landing_hero WHERE id = 1')
  res.json({ data: rows[0] || null })
})

// PATCH /landing/admin/hero
router.patch('/admin/hero', requireAuth, requirePermission('manage_landing_content'), async (req, res) => {
  const allowed = [
    'eyebrow','headline','headline_highlight','subheadline',
    'cta_primary_text','cta_secondary_text','diary_date','diary_title',
    'diary_content','diary_author_name','diary_author_role',
    'diary_likes','diary_comments','badge_1_text','badge_2_text',
    'ticker_items','is_active','hero_image_url','hero_image_urls'
  ]
  const updates = {}
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key]
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' })
  if (updates.hero_image_urls !== undefined) updates.hero_image_urls = JSON.stringify(updates.hero_image_urls)

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 1}`).join(', ')
  const { rows } = await pool.query(
    `UPDATE landing_hero SET ${setClauses}, updated_at = now() WHERE id = 1 RETURNING *`,
    Object.values(updates)
  )
  res.json({ hero: rows[0] })
})

const MAX_HERO_IMAGES = 3

// POST /landing/admin/hero/images — add one slideshow image (multipart, field "image"); max 3
router.post('/admin/hero/images', requireAuth, requirePermission('manage_landing_content'), upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file uploaded' })

  const { rows: existingRows } = await pool.query('SELECT hero_image_urls FROM landing_hero WHERE id = 1')
  const current = existingRows[0]?.hero_image_urls || []
  if (current.length >= MAX_HERO_IMAGES) {
    return res.status(400).json({ error: `Maximum ${MAX_HERO_IMAGES} images — remove one before adding another` })
  }

  const ext = (req.file.mimetype.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
  const key = `landing/hero-${Date.now()}.${ext}`
  const baseUrl = `${req.protocol}://${req.get('host')}`
  const url = await imageStorage.saveImage(key, req.file.buffer, req.file.mimetype, baseUrl)

  const updated = [...current, url]
  const { rows } = await pool.query(
    `UPDATE landing_hero SET hero_image_urls = $1, updated_at = now() WHERE id = 1 RETURNING *`,
    [JSON.stringify(updated)]
  )
  res.json({ hero: rows[0] })
})

// DELETE /landing/admin/hero/images/:index — remove one slideshow image by its array index
router.delete('/admin/hero/images/:index', requireAuth, requirePermission('manage_landing_content'), async (req, res) => {
  const index = parseInt(req.params.index, 10)
  const { rows: existingRows } = await pool.query('SELECT hero_image_urls FROM landing_hero WHERE id = 1')
  const current = existingRows[0]?.hero_image_urls || []
  if (!Number.isInteger(index) || index < 0 || index >= current.length) {
    return res.status(400).json({ error: 'Invalid image index' })
  }

  const updated = current.filter((_, i) => i !== index)
  const { rows } = await pool.query(
    `UPDATE landing_hero SET hero_image_urls = $1, updated_at = now() WHERE id = 1 RETURNING *`,
    [JSON.stringify(updated)]
  )
  res.json({ hero: rows[0] })
})

// ════════════════════════════════════════════════════════════
// BOTTOM SECTION — fully admin-customizable section before the footer
// (same shape as Hero: text fields + up to 3 slideshow images)
// ════════════════════════════════════════════════════════════

router.get('/admin/bottom-section', requireAuth, requirePermission('manage_landing_content'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM landing_bottom_section WHERE id = 1')
  res.json({ data: rows[0] || null })
})

router.patch('/admin/bottom-section', requireAuth, requirePermission('manage_landing_content'), async (req, res) => {
  const allowed = ['heading', 'subheadline', 'body_text', 'cta_text', 'cta_link', 'is_active', 'image_urls']
  const updates = {}
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key]
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' })
  if (updates.image_urls !== undefined) updates.image_urls = JSON.stringify(updates.image_urls)

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 1}`).join(', ')
  const { rows } = await pool.query(
    `UPDATE landing_bottom_section SET ${setClauses}, updated_at = now() WHERE id = 1 RETURNING *`,
    Object.values(updates)
  )
  res.json({ data: rows[0] })
})

const MAX_BOTTOM_SECTION_IMAGES = 3

router.post('/admin/bottom-section/images', requireAuth, requirePermission('manage_landing_content'), upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file uploaded' })

  const { rows: existingRows } = await pool.query('SELECT image_urls FROM landing_bottom_section WHERE id = 1')
  const current = existingRows[0]?.image_urls || []
  if (current.length >= MAX_BOTTOM_SECTION_IMAGES) {
    return res.status(400).json({ error: `Maximum ${MAX_BOTTOM_SECTION_IMAGES} images — remove one before adding another` })
  }

  const ext = (req.file.mimetype.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
  const key = `landing/bottom-${Date.now()}.${ext}`
  const baseUrl = `${req.protocol}://${req.get('host')}`
  const url = await imageStorage.saveImage(key, req.file.buffer, req.file.mimetype, baseUrl)

  const updated = [...current, url]
  const { rows } = await pool.query(
    `UPDATE landing_bottom_section SET image_urls = $1, updated_at = now() WHERE id = 1 RETURNING *`,
    [JSON.stringify(updated)]
  )
  res.json({ data: rows[0] })
})

router.delete('/admin/bottom-section/images/:index', requireAuth, requirePermission('manage_landing_content'), async (req, res) => {
  const index = parseInt(req.params.index, 10)
  const { rows: existingRows } = await pool.query('SELECT image_urls FROM landing_bottom_section WHERE id = 1')
  const current = existingRows[0]?.image_urls || []
  if (!Number.isInteger(index) || index < 0 || index >= current.length) {
    return res.status(400).json({ error: 'Invalid image index' })
  }

  const updated = current.filter((_, i) => i !== index)
  const { rows } = await pool.query(
    `UPDATE landing_bottom_section SET image_urls = $1, updated_at = now() WHERE id = 1 RETURNING *`,
    [JSON.stringify(updated)]
  )
  res.json({ data: rows[0] })
})

// GET /landing/admin/categories
router.get('/admin/categories', requireAuth, requirePermission('manage_landing_content'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM landing_categories ORDER BY sort_order')
  res.json({ categories: rows })
})

// POST /landing/admin/categories — create or update (if id provided)
router.post('/admin/categories', requireAuth, requirePermission('manage_landing_content'), async (req, res) => {
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
router.delete('/admin/categories/:id', requireAuth, requirePermission('manage_landing_content'), async (req, res) => {
  await pool.query('DELETE FROM landing_categories WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

// GET /landing/admin/testimonials
router.get('/admin/testimonials', requireAuth, requirePermission('manage_landing_content'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM landing_testimonials ORDER BY sort_order')
  res.json({ testimonials: rows })
})

// POST /landing/admin/testimonials — create or update
router.post('/admin/testimonials', requireAuth, requirePermission('manage_landing_content'), async (req, res) => {
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
router.delete('/admin/testimonials/:id', requireAuth, requirePermission('manage_landing_content'), async (req, res) => {
  await pool.query('DELETE FROM landing_testimonials WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

// PATCH /landing/admin/stories/:id/feature — toggle is_featured
router.patch('/admin/stories/:id/feature', requireAuth, requirePermission('manage_landing_content'), async (req, res) => {
  const { featured } = req.body
  const { rows } = await pool.query(
    'UPDATE stories SET is_featured = $1 WHERE id = $2 RETURNING *',
    [!!featured, req.params.id]
  )
  res.json({ story: rows[0] })
})

// GET /landing/admin/featured-stories — for the picker UI
router.get('/admin/featured-stories', requireAuth, requirePermission('manage_landing_content'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.id, s.title, s.category, s.is_featured,
            json_build_object('username', p.username, 'full_name', p.full_name) AS profiles
     FROM stories s JOIN profiles p ON p.id = s.user_id
     WHERE s.status = 'published' ORDER BY s.created_at DESC LIMIT 50`
  )
  res.json({ stories: rows })
})

module.exports = router
