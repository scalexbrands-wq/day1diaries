const express = require('express')
const { pool } = require('../db/pool')

const router = express.Router()

// ── GET /companies — public, active companies ───────────────────
router.get('/', async (req, res) => {
  const { search } = req.query
  const params = []
  let where = 'is_active = true'
  if (search) {
    params.push(`%${search}%`)
    where += ` AND name ILIKE $${params.length}`
  }
  const { rows } = await pool.query(
    `SELECT id, name, slug, description, industry, location, website, logo_url, created_at
     FROM companies WHERE ${where} ORDER BY created_at DESC`,
    params
  )
  res.json({ companies: rows })
})

// ── GET /companies/:slug — public, company + its open jobs ──────
router.get('/:slug', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM companies WHERE slug = $1 AND is_active = true', [req.params.slug])
  const company = rows[0]
  if (!company) return res.status(404).json({ error: 'Company not found' })

  const { rows: jobs } = await pool.query(
    `SELECT id, title, department, location, job_type, salary_min, salary_max, currency, created_at
     FROM careers_jobs WHERE company_id = $1 AND is_active = true ORDER BY created_at DESC`,
    [company.id]
  )
  res.json({ company, jobs })
})

module.exports = router
