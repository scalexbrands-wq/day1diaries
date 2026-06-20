const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, requireRole } = require('../middleware/auth')
const razorpay = require('../utils/razorpay')

const router = express.Router()
router.use(requireAuth, requireRole('admin'))

// ════════════════════════════════════════════════════════════
// CATEGORIES
// ════════════════════════════════════════════════════════════

router.get('/categories', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM gift_categories ORDER BY sort_order')
  res.json({ categories: rows })
})

router.put('/categories/:id', async (req, res) => {
  const { label, emoji, sort_order, is_active } = req.body
  const { rows } = await pool.query(
    `UPDATE gift_categories SET label=COALESCE($1,label), emoji=COALESCE($2,emoji),
       sort_order=COALESCE($3,sort_order), is_active=COALESCE($4,is_active), updated_at=now() WHERE id=$5 RETURNING *`,
    [label, emoji, sort_order, is_active, req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Category not found' })
  res.json({ category: rows[0] })
})

// ════════════════════════════════════════════════════════════
// TYPES & PRICING
// ════════════════════════════════════════════════════════════

router.get('/types', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM gift_types ORDER BY sort_order')
  res.json({ types: rows })
})

router.put('/types/:id', async (req, res) => {
  const { label, description, base_price, currency, sort_order, is_active } = req.body
  const { rows } = await pool.query(
    `UPDATE gift_types SET label=COALESCE($1,label), description=COALESCE($2,description),
       base_price=COALESCE($3,base_price), currency=COALESCE($4,currency),
       sort_order=COALESCE($5,sort_order), is_active=COALESCE($6,is_active), updated_at=now() WHERE id=$7 RETURNING *`,
    [label, description, base_price, currency, sort_order, is_active, req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Gift type not found' })
  res.json({ type: rows[0] })
})

// ════════════════════════════════════════════════════════════
// TEMPLATES
// ════════════════════════════════════════════════════════════

router.get('/templates', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM gift_templates ORDER BY created_at')
  res.json({ templates: rows })
})

router.put('/templates/:id', async (req, res) => {
  const { label, preview_image_url, is_active } = req.body
  const { rows } = await pool.query(
    `UPDATE gift_templates SET label=COALESCE($1,label), preview_image_url=COALESCE($2,preview_image_url),
       is_active=COALESCE($3,is_active), updated_at=now() WHERE id=$4 RETURNING *`,
    [label, preview_image_url, is_active, req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Template not found' })
  res.json({ template: rows[0] })
})

// ════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════

router.get('/orders', async (req, res) => {
  const { status, q } = req.query
  const conditions = []
  const params = []
  if (status) { params.push(status); conditions.push(`g.status = $${params.length}`) }
  if (q) { params.push(`%${q}%`); conditions.push(`(g.recipient_name ILIKE $${params.length} OR g.recipient_email ILIKE $${params.length})`) }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const { rows } = await pool.query(
    `SELECT g.*, gc.label AS category_label, gt.label AS gift_type_label, tm.label AS template_label,
            s.title AS story_title, sender.full_name AS sender_name, sender.email AS sender_email
     FROM gift_orders g
     JOIN gift_categories gc ON gc.id = g.category_id
     JOIN gift_types gt ON gt.id = g.gift_type_id
     JOIN gift_templates tm ON tm.id = g.template_id
     JOIN stories s ON s.id = g.story_id
     JOIN profiles sender ON sender.id::text = g.sender_user_id
     ${where}
     ORDER BY g.created_at DESC LIMIT 200`,
    params
  )
  res.json({ orders: rows })
})

router.get('/orders/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT g.*, gc.label AS category_label, gt.label AS gift_type_label, tm.label AS template_label,
            s.title AS story_title, sender.full_name AS sender_name, sender.email AS sender_email
     FROM gift_orders g
     JOIN gift_categories gc ON gc.id = g.category_id
     JOIN gift_types gt ON gt.id = g.gift_type_id
     JOIN gift_templates tm ON tm.id = g.template_id
     JOIN stories s ON s.id = g.story_id
     JOIN profiles sender ON sender.id::text = g.sender_user_id
     WHERE g.id = $1`,
    [req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Order not found' })
  const { rows: payments } = await pool.query('SELECT * FROM gift_payments WHERE gift_order_id = $1 ORDER BY created_at DESC', [req.params.id])
  res.json({ order: rows[0], payments })
})

router.post('/orders/:id/refund', async (req, res) => {
  const { rows: payRows } = await pool.query(
    `SELECT * FROM gift_payments WHERE gift_order_id = $1 AND status = 'verified' ORDER BY created_at DESC LIMIT 1`,
    [req.params.id]
  )
  const payment = payRows[0]
  if (!payment) return res.status(400).json({ error: 'No verified payment found for this order' })

  let refundId = null
  if (payment.method === 'razorpay') {
    try {
      const refund = await razorpay.createRefund({ paymentId: payment.razorpay_payment_id, notes: { reason: req.body?.notes || 'Admin-initiated refund' } })
      refundId = refund.id
    } catch (err) {
      return res.status(err.status || 502).json({ error: err.message || 'Razorpay refund failed' })
    }
  }

  await pool.query(
    `UPDATE gift_payments SET status='refunded', refund_id=$1, refunded_by=$2, refunded_at=now() WHERE id=$3`,
    [refundId, req.profile.id, payment.id]
  )
  const { rows } = await pool.query(
    `UPDATE gift_orders SET payment_status='refunded', updated_at=now() WHERE id=$1 RETURNING *`,
    [req.params.id]
  )
  res.json({ order: rows[0] })
})

// ════════════════════════════════════════════════════════════
// PAYMENTS (flat list across all orders)
// ════════════════════════════════════════════════════════════

router.get('/payments', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT pay.*, g.recipient_name, g.tribute_slug, sender.full_name AS sender_name
     FROM gift_payments pay
     JOIN gift_orders g ON g.id = pay.gift_order_id
     JOIN profiles sender ON sender.id::text = g.sender_user_id
     ORDER BY pay.created_at DESC LIMIT 200`
  )
  res.json({ payments: rows })
})

// ════════════════════════════════════════════════════════════
// ANALYTICS
// ════════════════════════════════════════════════════════════

router.get('/analytics', async (req, res) => {
  const [totals, byCategory, byType, byTemplate, daily] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total_gifts, COALESCE(SUM(amount) FILTER (WHERE payment_status IN ('paid','free')), 0) AS total_revenue
                FROM gift_orders`),
    pool.query(`SELECT gc.label, COUNT(*)::int AS count FROM gift_orders g JOIN gift_categories gc ON gc.id = g.category_id GROUP BY gc.label ORDER BY count DESC`),
    pool.query(`SELECT gt.label, COUNT(*)::int AS count FROM gift_orders g JOIN gift_types gt ON gt.id = g.gift_type_id GROUP BY gt.label ORDER BY count DESC`),
    pool.query(`SELECT tm.label, COUNT(*)::int AS count FROM gift_orders g JOIN gift_templates tm ON tm.id = g.template_id GROUP BY tm.label ORDER BY count DESC`),
    pool.query(`SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS count
                FROM gift_orders WHERE created_at > now() - interval '30 days' GROUP BY day ORDER BY day`),
  ])
  res.json({
    totals: totals.rows[0],
    byCategory: byCategory.rows,
    byType: byType.rows,
    byTemplate: byTemplate.rows,
    daily: daily.rows,
  })
})

// ════════════════════════════════════════════════════════════
// SETTINGS (gift.* keys on the shared app_settings table)
// ════════════════════════════════════════════════════════════

const SETTINGS_KEYS = ['gift.module_enabled']

router.get('/settings', async (req, res) => {
  const { rows } = await pool.query('SELECT key, value FROM app_settings WHERE key = ANY($1)', [SETTINGS_KEYS])
  const settings = {}
  for (const row of rows) settings[row.key] = row.value
  res.json({ settings, razorpayEnabled: razorpay.isConfigured() })
})

router.patch('/settings', async (req, res) => {
  const entries = Object.entries(req.body || {}).filter(([k]) => SETTINGS_KEYS.includes(k))
  if (!entries.length) return res.status(400).json({ error: 'No valid gift settings provided' })
  for (const [key, value] of entries) {
    await pool.query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1,$2,now())
       ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=now()`,
      [key, JSON.stringify(value)]
    )
  }
  const { rows } = await pool.query('SELECT key, value FROM app_settings WHERE key = ANY($1)', [SETTINGS_KEYS])
  const settings = {}
  for (const row of rows) settings[row.key] = row.value
  res.json({ settings })
})

module.exports = router
