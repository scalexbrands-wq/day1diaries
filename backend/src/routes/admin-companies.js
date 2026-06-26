const express = require('express')
const multer = require('multer')
const { pool } = require('../db/pool')
const { requireAuth, requirePermission } = require('../middleware/auth')
const imageStorage = require('../utils/imageStorage')

const router = express.Router()
router.use(requireAuth, requirePermission('manage_companies'))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) return cb(Object.assign(new Error('Only image files are allowed'), { status: 400 }))
    cb(null, true)
  },
})

// Generates a URL-safe slug from a name, ensuring uniqueness against companies
async function generateSlug(name) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'company'

  let slug = base
  let suffix = 1
  while (true) {
    const { rows } = await pool.query('SELECT id FROM companies WHERE slug = $1', [slug])
    if (!rows.length) return slug
    slug = `${base}-${suffix++}`
  }
}

// ── GET /admin/companies — all companies with job counts ─────────
router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT c.*, COALESCE(j.cnt, 0) AS job_count
    FROM companies c
    LEFT JOIN (SELECT company_id, count(*) cnt FROM careers_jobs GROUP BY company_id) j ON j.company_id = c.id
    ORDER BY c.created_at DESC
  `)
  res.json({ companies: rows })
})

// ── POST /admin/companies — create a company directly ────────────
router.post('/', upload.single('logo'), async (req, res) => {
  const { name, description, industry, location, website } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })

  let logo_url = null
  if (req.file) {
    const ext = (req.file.mimetype.split('/')[1] || 'bin').replace('jpeg', 'jpg')
    const key = `companies/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const baseUrl = `${req.protocol}://${req.get('host')}`
    logo_url = await imageStorage.saveImage(key, req.file.buffer, req.file.mimetype, baseUrl, { maxWidth: 512, maxHeight: 512 })
  }

  const slug = await generateSlug(name)
  const { rows } = await pool.query(
    `INSERT INTO companies (name, slug, description, industry, location, website, logo_url, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [name, slug, description || null, industry || null, location || null, website || null, logo_url, req.profile.id]
  )
  res.status(201).json({ company: rows[0] })
})

// ── PUT /admin/companies/:id — update a company ───────────────────
router.put('/:id', upload.single('logo'), async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM companies WHERE id = $1', [req.params.id])
  const existing = existingRows[0]
  if (!existing) return res.status(404).json({ error: 'Company not found' })

  const { name, description, industry, location, website } = req.body
  let logo_url = existing.logo_url
  if (req.file) {
    const ext = (req.file.mimetype.split('/')[1] || 'bin').replace('jpeg', 'jpg')
    const key = `companies/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const baseUrl = `${req.protocol}://${req.get('host')}`
    logo_url = await imageStorage.saveImage(key, req.file.buffer, req.file.mimetype, baseUrl, { maxWidth: 512, maxHeight: 512 })
  }

  const { rows } = await pool.query(
    `UPDATE companies SET name=$1, description=$2, industry=$3, location=$4, website=$5, logo_url=$6, updated_at=now()
     WHERE id = $7 RETURNING *`,
    [name || existing.name, description ?? existing.description, industry ?? existing.industry,
     location ?? existing.location, website ?? existing.website, logo_url, existing.id]
  )
  res.json({ company: rows[0] })
})

// ── PATCH /admin/companies/:id/status — activate/deactivate ──────
router.patch('/:id/status', async (req, res) => {
  const { is_active } = req.body
  const { rows } = await pool.query(
    'UPDATE companies SET is_active = $1, updated_at = now() WHERE id = $2 RETURNING *',
    [!!is_active, req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Company not found' })
  res.json({ company: rows[0] })
})

// ── DELETE /admin/companies/:id ───────────────────────────────────
router.delete('/:id', async (req, res) => {
  await pool.query('UPDATE profiles SET company_id = NULL WHERE company_id = $1', [req.params.id])
  await pool.query('DELETE FROM companies WHERE id = $1', [req.params.id])
  res.json({ ok: true })
})

module.exports = router
