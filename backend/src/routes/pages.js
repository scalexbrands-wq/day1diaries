const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth')

const router = express.Router()
const adminRouter = express.Router()

// Generates a URL-safe slug from a title, ensuring uniqueness against blog_posts
async function generateSlug(title, excludeId = null) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'post'

  let slug = base
  let suffix = 1
  while (true) {
    const { rows } = await pool.query(
      excludeId
        ? 'SELECT id FROM blog_posts WHERE slug = $1 AND id != $2'
        : 'SELECT id FROM blog_posts WHERE slug = $1',
      excludeId ? [slug, excludeId] : [slug]
    )
    if (!rows.length) return slug
    slug = `${base}-${suffix++}`
  }
}

// ============================================================
// ABOUT PAGE
// ============================================================

// ── GET /pages/about — public, active sections only ──────────
router.get('/about', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, title, content, image_url, video_url, sort_order FROM about_sections WHERE is_active = true ORDER BY sort_order, created_at'
  )
  res.json({ sections: rows })
})

// ── GET /admin/pages/about — admin, all sections ──────────────
adminRouter.get('/about', requireAuth, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM about_sections ORDER BY sort_order, created_at')
  res.json({ sections: rows })
})

// ── POST /admin/pages/about — create or update a section ──────
// body: { id?, title, content, image_url, video_url, sort_order, is_active }
adminRouter.post('/about', requireAuth, requireRole('admin'), async (req, res) => {
  const { id, title, content, image_url, video_url, sort_order, is_active } = req.body

  if (id) {
    const { rows } = await pool.query(
      `UPDATE about_sections SET title=$1, content=$2, image_url=$3, video_url=$4,
         sort_order=$5, is_active=$6 WHERE id=$7 RETURNING *`,
      [title, content, image_url || null, video_url || null, sort_order || 0, is_active !== false, id]
    )
    return res.json({ section: rows[0] })
  }

  const { rows } = await pool.query(
    `INSERT INTO about_sections (title, content, image_url, video_url, sort_order, is_active)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [title, content, image_url || null, video_url || null, sort_order || 0, is_active !== false]
  )
  res.json({ section: rows[0] })
})

// ── DELETE /admin/pages/about/:id ──────────────────────────────
adminRouter.delete('/about/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM about_sections WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

// ============================================================
// BLOG
// ============================================================

// ── GET /pages/blog — public, published posts ─────────────────
router.get('/blog', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, title, slug, excerpt, cover_image, author_name, published_at
     FROM blog_posts WHERE is_published = true ORDER BY published_at DESC`
  )
  res.json({ posts: rows })
})

// ── GET /pages/blog/:slug — public, single post ────────────────
router.get('/blog/:slug', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM blog_posts WHERE slug = $1 AND is_published = true',
    [req.params.slug]
  )
  if (!rows.length) return res.status(404).json({ error: 'Post not found' })
  res.json({ post: rows[0] })
})

// ── GET /admin/pages/blog — admin, all posts (incl. drafts) ────
adminRouter.get('/blog', requireAuth, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM blog_posts ORDER BY created_at DESC')
  res.json({ posts: rows })
})

// ── POST /admin/pages/blog — create or update a post ───────────
// body: { id?, title, excerpt, content, cover_image, author_name, is_published }
adminRouter.post('/blog', requireAuth, requireRole('admin'), async (req, res) => {
  const { id, title, excerpt, content, cover_image, author_name, is_published } = req.body
  if (!title || !content) return res.status(400).json({ error: 'title and content are required' })

  if (id) {
    const existing = await pool.query('SELECT slug, is_published, published_at FROM blog_posts WHERE id = $1', [id])
    if (!existing.rows.length) return res.status(404).json({ error: 'Post not found' })

    const wasPublished = existing.rows[0].is_published
    const publishedAt = !wasPublished && is_published ? new Date() : existing.rows[0].published_at

    const { rows } = await pool.query(
      `UPDATE blog_posts SET title=$1, excerpt=$2, content=$3, cover_image=$4,
         author_name=$5, is_published=$6, published_at=$7 WHERE id=$8 RETURNING *`,
      [title, excerpt || null, content, cover_image || null, author_name || null, !!is_published, publishedAt, id]
    )
    return res.json({ post: rows[0] })
  }

  const slug = await generateSlug(title)
  const { rows } = await pool.query(
    `INSERT INTO blog_posts (title, slug, excerpt, content, cover_image, author_name, is_published, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [title, slug, excerpt || null, content, cover_image || null, author_name || null, !!is_published, is_published ? new Date() : null]
  )
  res.json({ post: rows[0] })
})

// ── DELETE /admin/pages/blog/:id ────────────────────────────────
adminRouter.delete('/blog/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM blog_posts WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

// ============================================================
// CAREERS / JOBS
// ============================================================

// ── GET /pages/careers — public, active jobs ────────────────────
router.get('/careers', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT j.id, j.title, j.department, j.location, j.job_type, j.salary_min, j.salary_max, j.currency,
            j.description, j.requirements, j.created_at,
            (SELECT count(*) FROM job_applications a WHERE a.job_id = j.id) AS applications_count
     FROM careers_jobs j WHERE j.is_active = true ORDER BY j.sort_order, j.created_at DESC`
  )
  res.json({ jobs: rows })
})

// ── GET /pages/my-job-applications — user's own job applications ──
// Intentionally NOT under /careers/:id to avoid UUID routing conflict
router.get('/my-job-applications', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT a.id, a.job_id, a.full_name, a.email, a.cover_note, a.resume_url, a.created_at,
            a.user_status, a.user_notes, a.custom_status,
            j.title AS job_title, j.department, j.location, j.job_type,
            j.salary_min, j.salary_max, j.currency, j.is_active
     FROM job_applications a
     JOIN careers_jobs j ON j.id = a.job_id
     WHERE a.user_id = $1
     ORDER BY a.created_at DESC`,
    [req.cognitoSub]
  )
  res.json({ applications: rows })
})

// Keep old path as alias so any cached requests still work
router.get('/careers/my-applications', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT a.id, a.job_id, a.full_name, a.email, a.cover_note, a.resume_url, a.created_at,
            a.user_status, a.user_notes, a.custom_status,
            j.title AS job_title, j.department, j.location, j.job_type,
            j.salary_min, j.salary_max, j.currency, j.is_active
     FROM job_applications a JOIN careers_jobs j ON j.id = a.job_id
     WHERE a.user_id = $1 ORDER BY a.created_at DESC`,
    [req.cognitoSub]
  )
  res.json({ applications: rows })
})

// ── GET /pages/careers/:id — public, single job ──────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
router.get('/careers/:id', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Job not found' })
  const { rows } = await pool.query(
    'SELECT * FROM careers_jobs WHERE id = $1 AND is_active = true',
    [req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Job not found' })
  res.json({ job: rows[0] })
})

// ── POST /pages/careers/:id/apply — submit application (auth optional)
// body: { full_name, email, phone, resume_url, cover_note }
router.post('/careers/:id/apply', optionalAuth, async (req, res) => {
  const { full_name, email, phone, resume_url, cover_note } = req.body
  if (!full_name || !email) return res.status(400).json({ error: 'full_name and email are required' })

  const job = await pool.query('SELECT id FROM careers_jobs WHERE id = $1', [req.params.id])
  if (!job.rows.length) return res.status(404).json({ error: 'Job not found' })

  const { rows } = await pool.query(
    `INSERT INTO job_applications (job_id, full_name, email, phone, resume_url, cover_note, user_id, user_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'applied') RETURNING id, created_at, user_id`,
    [req.params.id, full_name, email, phone || null, resume_url || null, cover_note || null, req.cognitoSub || null]
  )
  res.json({ application: rows[0], message: 'Application submitted successfully.' })
})

// ── PATCH /pages/careers/applications/:id/my-update — user updates own pipeline ──
// body: { user_status, user_notes, custom_status }
router.patch('/careers/applications/:id/my-update', requireAuth, async (req, res) => {
  const VALID = ['applied','screening','interview_1','interview_2','offer_received','custom']
  const { user_status, user_notes, custom_status } = req.body
  if (user_status && !VALID.includes(user_status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }

  const { rows: existing } = await pool.query(
    'SELECT id FROM job_applications WHERE id = $1 AND user_id = $2',
    [req.params.id, req.cognitoSub]
  )
  if (!existing.length) return res.status(404).json({ error: 'Application not found' })

  const updates = []
  const vals = []
  let i = 1
  if (user_status !== undefined)   { updates.push(`user_status = $${i++}`);   vals.push(user_status) }
  if (user_notes !== undefined)    { updates.push(`user_notes = $${i++}`);    vals.push(user_notes) }
  if (custom_status !== undefined) { updates.push(`custom_status = $${i++}`); vals.push(custom_status) }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' })

  vals.push(req.params.id)
  const { rows } = await pool.query(
    `UPDATE job_applications SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    vals
  )
  res.json({ application: rows[0] })
})

// ── GET /admin/pages/careers — admin, all jobs ────────────────────
adminRouter.get('/careers', requireAuth, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT j.*, (SELECT count(*) FROM job_applications a WHERE a.job_id = j.id) AS applications_count
     FROM careers_jobs j ORDER BY j.sort_order, j.created_at DESC`
  )
  res.json({ jobs: rows })
})

// ── GET /admin/pages/careers/stats — admin, KPI summary ──────────
adminRouter.get('/careers/stats', requireAuth, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT json_build_object(
      'open_jobs',         (SELECT count(*) FROM careers_jobs WHERE is_active = true),
      'total_jobs',        (SELECT count(*) FROM careers_jobs),
      'total_applications',(SELECT count(*) FROM job_applications),
      'new_applications',  (SELECT count(*) FROM job_applications WHERE status = 'new')
    ) AS stats
  `)
  res.json({ stats: rows[0].stats })
})

// ── POST /admin/pages/careers — create or update a job ─────────────
adminRouter.post('/careers', requireAuth, requireRole('admin'), async (req, res) => {
  const { id, title, department, location, job_type, salary_min, salary_max, currency, description, requirements, is_active, sort_order } = req.body
  if (!title || !description) return res.status(400).json({ error: 'title and description are required' })

  if (id) {
    const { rows } = await pool.query(
      `UPDATE careers_jobs SET title=$1, department=$2, location=$3, job_type=$4,
         salary_min=$5, salary_max=$6, currency=$7, description=$8, requirements=$9,
         is_active=$10, sort_order=$11 WHERE id=$12 RETURNING *`,
      [title, department || null, location || null, job_type || 'Full-time',
       salary_min || null, salary_max || null, currency || 'INR', description, requirements || null,
       is_active !== false, sort_order || 0, id]
    )
    return res.json({ job: rows[0] })
  }

  const { rows } = await pool.query(
    `INSERT INTO careers_jobs (title, department, location, job_type, salary_min, salary_max, currency, description, requirements, is_active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [title, department || null, location || null, job_type || 'Full-time',
     salary_min || null, salary_max || null, currency || 'INR', description, requirements || null,
     is_active !== false, sort_order || 0]
  )
  res.json({ job: rows[0] })
})

// ── DELETE /admin/pages/careers/:id ──────────────────────────────────
adminRouter.delete('/careers/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM careers_jobs WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

// ── GET /admin/pages/careers/:id/applications — admin, applicants for a job ──
adminRouter.get('/careers/:id/applications', requireAuth, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM job_applications WHERE job_id = $1 ORDER BY created_at DESC',
    [req.params.id]
  )
  res.json({ applications: rows })
})

// ── GET /admin/pages/applications — admin, ALL applications across jobs ──
adminRouter.get('/applications', requireAuth, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT a.*, j.title AS job_title
     FROM job_applications a LEFT JOIN careers_jobs j ON j.id = a.job_id
     ORDER BY a.created_at DESC`
  )
  res.json({ applications: rows })
})

// ── PATCH /admin/pages/applications/:id — admin, update status ──
adminRouter.patch('/applications/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.body
  if (!['new', 'reviewed', 'shortlisted', 'rejected', 'hired'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }
  const { rows } = await pool.query(
    'UPDATE job_applications SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  )
  res.json({ application: rows[0] })
})

// ============================================================
// CONTACT
// ============================================================

// ── POST /pages/contact — public, submit contact message ────────
// body: { name, email, subject, message }
router.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body
  if (!name || !email || !message) return res.status(400).json({ error: 'name, email, and message are required' })

  const { rows } = await pool.query(
    `INSERT INTO contact_messages (name, email, subject, message) VALUES ($1,$2,$3,$4) RETURNING id, created_at`,
    [name, email, subject || null, message]
  )
  res.json({ message_id: rows[0].id, message: 'Message sent successfully. We\'ll get back to you soon!' })
})

// ── GET /admin/pages/contact — admin, all messages ──────────────
adminRouter.get('/contact', requireAuth, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM contact_messages ORDER BY created_at DESC')
  res.json({ messages: rows })
})

// ── PATCH /admin/pages/contact/:id — admin, update status ────────
adminRouter.patch('/contact/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.body
  if (!['new', 'read', 'replied'].includes(status)) return res.status(400).json({ error: 'Invalid status' })
  const { rows } = await pool.query(
    'UPDATE contact_messages SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  )
  res.json({ message: rows[0] })
})

module.exports = { publicRouter: router, adminRouter }
