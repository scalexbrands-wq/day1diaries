const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, requirePermission } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)
const manageCoupons = requirePermission('manage_coupons')

router.get('/', manageCoupons, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC')
  res.json({ coupons: rows })
})

router.post('/', manageCoupons, async (req, res) => {
  const { code, discount_type, discount_value, max_uses, expires_at } = req.body
  if (!code?.trim()) return res.status(400).json({ error: 'code is required' })
  if (!['percent', 'fixed'].includes(discount_type)) return res.status(400).json({ error: "discount_type must be 'percent' or 'fixed'" })
  if (!discount_value || Number(discount_value) <= 0) return res.status(400).json({ error: 'discount_value must be greater than 0' })
  try {
    const { rows } = await pool.query(
      `INSERT INTO coupons (code, discount_type, discount_value, max_uses, expires_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [code.trim().toUpperCase(), discount_type, discount_value, max_uses || null, expires_at || null, req.profile.id]
    )
    res.status(201).json({ coupon: rows[0] })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A coupon with this code already exists' })
    throw err
  }
})

router.put('/:id', manageCoupons, async (req, res) => {
  const { discount_type, discount_value, max_uses, expires_at, is_active } = req.body
  if (discount_type && !['percent', 'fixed'].includes(discount_type)) {
    return res.status(400).json({ error: "discount_type must be 'percent' or 'fixed'" })
  }
  const { rows } = await pool.query(
    `UPDATE coupons SET discount_type=COALESCE($1,discount_type), discount_value=COALESCE($2,discount_value),
       max_uses=COALESCE($3,max_uses), expires_at=COALESCE($4,expires_at), is_active=COALESCE($5,is_active), updated_at=now() WHERE id=$6 RETURNING *`,
    [discount_type, discount_value, max_uses, expires_at, is_active, req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Coupon not found' })
  res.json({ coupon: rows[0] })
})

router.delete('/:id', manageCoupons, async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM coupons WHERE id = $1', [req.params.id])
  if (!rowCount) return res.status(404).json({ error: 'Coupon not found' })
  res.json({ success: true })
})

module.exports = router
