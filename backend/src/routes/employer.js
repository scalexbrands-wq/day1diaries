const express = require('express')
const multer = require('multer')
const { pool } = require('../db/pool')
const { requireAuth, requireRole } = require('../middleware/auth')
const imageStorage = require('../utils/imageStorage')

const router = express.Router()
router.use(requireAuth, requireRole('employer'))

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

async function getOwnCompany(req, res, next) {
  if (!req.profile.company_id) return res.status(404).json({ error: 'No company yet' })
  const { rows } = await pool.query('SELECT * FROM companies WHERE id = $1', [req.profile.company_id])
  if (!rows.length) return res.status(404).json({ error: 'Company not found' })
  req.company = rows[0]
  next()
}

// ── GET /employer/company — own company ──────────────────────────
router.get('/company', getOwnCompany, async (req, res) => {
  res.json({ company: req.company })
})

// ── POST /employer/company — create own company ──────────────────
router.post('/company', upload.single('logo'), async (req, res) => {
  if (req.profile.company_id) return res.status(400).json({ error: 'You already manage a company' })
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
  const company = rows[0]
  await pool.query('UPDATE profiles SET company_id = $1 WHERE id = $2', [company.id, req.profile.id])
  res.status(201).json({ company })
})

// ── PUT /employer/company — update own company ───────────────────
router.put('/company', getOwnCompany, upload.single('logo'), async (req, res) => {
  const { name, description, industry, location, website } = req.body
  let logo_url = req.company.logo_url
  if (req.file) {
    const ext = (req.file.mimetype.split('/')[1] || 'bin').replace('jpeg', 'jpg')
    const key = `companies/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const baseUrl = `${req.protocol}://${req.get('host')}`
    logo_url = await imageStorage.saveImage(key, req.file.buffer, req.file.mimetype, baseUrl, { maxWidth: 512, maxHeight: 512 })
  }

  const { rows } = await pool.query(
    `UPDATE companies SET name=$1, description=$2, industry=$3, location=$4, website=$5, logo_url=$6, updated_at=now()
     WHERE id = $7 RETURNING *`,
    [name || req.company.name, description ?? req.company.description, industry ?? req.company.industry,
     location ?? req.company.location, website ?? req.company.website, logo_url, req.company.id]
  )
  res.json({ company: rows[0] })
})

// ── GET /employer/jobs — own company's jobs ───────────────────────
router.get('/jobs', getOwnCompany, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM careers_jobs WHERE company_id = $1 ORDER BY created_at DESC',
    [req.company.id]
  )
  res.json({ jobs: rows })
})

// ── POST /employer/jobs — create a job under own company ─────────
router.post('/jobs', getOwnCompany, async (req, res) => {
  const { title, department, location, job_type, salary_min, salary_max, currency, description, requirements, is_active } = req.body
  if (!title || !description) return res.status(400).json({ error: 'title and description are required' })

  const { rows } = await pool.query(
    `INSERT INTO careers_jobs (title, department, location, job_type, salary_min, salary_max, currency, description, requirements, is_active, company_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [title, department || null, location || null, job_type || 'Full-time', salary_min || null, salary_max || null,
     currency || 'INR', description, requirements || null, is_active !== false, req.company.id]
  )
  res.status(201).json({ job: rows[0] })
})

async function getOwnJob(req, res, next) {
  const { rows } = await pool.query('SELECT * FROM careers_jobs WHERE id = $1 AND company_id = $2', [req.params.id, req.profile.company_id])
  if (!rows.length) return res.status(404).json({ error: 'Job not found' })
  req.job = rows[0]
  next()
}

// ── PUT /employer/jobs/:id — update own job ───────────────────────
router.put('/jobs/:id', getOwnCompany, getOwnJob, async (req, res) => {
  const { title, department, location, job_type, salary_min, salary_max, currency, description, requirements, is_active } = req.body
  const { rows } = await pool.query(
    `UPDATE careers_jobs SET title=$1, department=$2, location=$3, job_type=$4, salary_min=$5, salary_max=$6,
       currency=$7, description=$8, requirements=$9, is_active=$10, updated_at=now()
     WHERE id = $11 RETURNING *`,
    [title ?? req.job.title, department ?? req.job.department, location ?? req.job.location, job_type ?? req.job.job_type,
     salary_min ?? req.job.salary_min, salary_max ?? req.job.salary_max, currency ?? req.job.currency,
     description ?? req.job.description, requirements ?? req.job.requirements,
     is_active === undefined ? req.job.is_active : is_active, req.job.id]
  )
  res.json({ job: rows[0] })
})

// ── DELETE /employer/jobs/:id — delete own job ────────────────────
router.delete('/jobs/:id', getOwnCompany, getOwnJob, async (req, res) => {
  await pool.query('DELETE FROM careers_jobs WHERE id = $1', [req.job.id])
  res.json({ ok: true })
})

module.exports = router
