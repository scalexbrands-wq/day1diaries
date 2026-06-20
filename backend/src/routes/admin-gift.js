const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, requireRole } = require('../middleware/auth')
const razorpay = require('../utils/razorpay')
const { renderGiftAssets } = require('../services/giftRenderService')
const { sendGiftEmail, TEMPLATE_NAMES } = require('../services/giftEmails')
const { createNotification } = require('../services/notifications')
const { findTier } = require('../utils/walletTiers')

const router = express.Router()
router.use(requireAuth, requireRole('admin'))

const STYLE_KEYS = ['luxury_gold', 'glassmorphism_orange', 'scrapbook_warm', 'executive_black_gold', 'magazine_cover']

function slugify(label) {
  return String(label || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'item'
}

// Wraps a delete so a foreign-key violation (the row is referenced by past
// gift_orders) comes back as a clear message instead of a raw 500 — admins
// should deactivate instead of delete once a catalog entry has real orders.
async function deleteOrExplain(res, table, id, label) {
  try {
    const { rowCount } = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id])
    if (!rowCount) return res.status(404).json({ error: `${label} not found` })
    res.json({ success: true })
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: `Can't delete — it's used by existing gift orders. Deactivate it instead.` })
    }
    throw err
  }
}

// ════════════════════════════════════════════════════════════
// CATEGORIES
// ════════════════════════════════════════════════════════════

router.get('/categories', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM gift_categories ORDER BY sort_order')
  res.json({ categories: rows })
})

router.post('/categories', async (req, res) => {
  const { label, emoji, sort_order } = req.body
  if (!label) return res.status(400).json({ error: 'label is required' })
  const { rows: maxRows } = await pool.query('SELECT COALESCE(MAX(sort_order),-1)+1 AS next FROM gift_categories')
  const { rows } = await pool.query(
    `INSERT INTO gift_categories (key, label, emoji, sort_order) VALUES ($1,$2,$3,$4) RETURNING *`,
    [`${slugify(label)}_${Date.now().toString(36)}`, label, emoji || '🎁', sort_order ?? maxRows[0].next]
  )
  res.status(201).json({ category: rows[0] })
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

router.delete('/categories/:id', (req, res) => deleteOrExplain(res, 'gift_categories', req.params.id, 'Category'))

// ════════════════════════════════════════════════════════════
// TYPES & PRICING
// ════════════════════════════════════════════════════════════

router.get('/types', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM gift_types ORDER BY sort_order')
  res.json({ types: rows })
})

router.post('/types', async (req, res) => {
  const { label, description, base_price, currency, sort_order } = req.body
  if (!label) return res.status(400).json({ error: 'label is required' })
  const { rows: maxRows } = await pool.query('SELECT COALESCE(MAX(sort_order),-1)+1 AS next FROM gift_types')
  const { rows } = await pool.query(
    `INSERT INTO gift_types (key, label, description, base_price, currency, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [`${slugify(label)}_${Date.now().toString(36)}`, label, description || null, base_price || 0, currency || 'INR', sort_order ?? maxRows[0].next]
  )
  res.status(201).json({ type: rows[0] })
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

router.delete('/types/:id', (req, res) => deleteOrExplain(res, 'gift_types', req.params.id, 'Gift type'))

// ════════════════════════════════════════════════════════════
// TEMPLATES
// ════════════════════════════════════════════════════════════

router.get('/templates', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM gift_templates ORDER BY created_at')
  res.json({ templates: rows, styleKeys: STYLE_KEYS })
})

router.post('/templates', async (req, res) => {
  const { label, style_key, preview_image_url } = req.body
  if (!label) return res.status(400).json({ error: 'label is required' })
  if (!STYLE_KEYS.includes(style_key)) return res.status(400).json({ error: `style_key must be one of: ${STYLE_KEYS.join(', ')}` })
  const { rows } = await pool.query(
    `INSERT INTO gift_templates (key, label, style_key, preview_image_url) VALUES ($1,$2,$3,$4) RETURNING *`,
    [`${slugify(label)}_${Date.now().toString(36)}`, label, style_key, preview_image_url || null]
  )
  res.status(201).json({ template: rows[0] })
})

router.put('/templates/:id', async (req, res) => {
  const { label, style_key, preview_image_url, is_active } = req.body
  if (style_key && !STYLE_KEYS.includes(style_key)) return res.status(400).json({ error: `style_key must be one of: ${STYLE_KEYS.join(', ')}` })
  const { rows } = await pool.query(
    `UPDATE gift_templates SET label=COALESCE($1,label), style_key=COALESCE($2,style_key),
       preview_image_url=COALESCE($3,preview_image_url), is_active=COALESCE($4,is_active), updated_at=now() WHERE id=$5 RETURNING *`,
    [label, style_key, preview_image_url, is_active, req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Template not found' })
  res.json({ template: rows[0] })
})

router.delete('/templates/:id', (req, res) => deleteOrExplain(res, 'gift_templates', req.params.id, 'Template'))

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

// POST /admin/gift/orders/:id/confirm-cod — admin confirms cash was
// collected for a Cash on Delivery order, unblocking certificate rendering.
router.post('/orders/:id/confirm-cod', async (req, res) => {
  const { rows: orderRows } = await pool.query('SELECT * FROM gift_orders WHERE id = $1', [req.params.id])
  const order = orderRows[0]
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (order.payment_method !== 'cod') return res.status(400).json({ error: 'This order was not placed as Cash on Delivery' })
  if (order.payment_status === 'paid') return res.status(400).json({ error: 'Already confirmed' })

  await pool.query(
    `UPDATE gift_payments SET status='verified' WHERE gift_order_id = $1 AND method = 'cod' AND status = 'pending'`,
    [order.id]
  )
  const { rows } = await pool.query(
    `UPDATE gift_orders SET payment_status='paid', status='processing', updated_at=now() WHERE id=$1 RETURNING *`,
    [order.id]
  )
  res.json({ order: rows[0] })
  renderGiftAssets(order.id).catch(err => console.error('Gift render failed', err))
})

const PAYMENT_STATUSES = ['pending', 'paid', 'free', 'refunded', 'failed']

// POST /admin/gift/orders/:id/set-payment-status — manual override for
// cases where the gateway's webhook missed an online payment update (admin
// checks Razorpay's dashboard directly and reconciles here), or to mark an
// order failed/refunded without going through the Razorpay refund API (e.g.
// the refund already happened outside the platform). Setting paid/free
// triggers certificate rendering exactly like the dedicated COD-confirm and
// payment-verify paths; refunded/failed notify the sender by email.
router.post('/orders/:id/set-payment-status', async (req, res) => {
  const { payment_status, notes } = req.body
  if (!PAYMENT_STATUSES.includes(payment_status)) {
    return res.status(400).json({ error: `payment_status must be one of: ${PAYMENT_STATUSES.join(', ')}` })
  }
  const { rows: orderRows } = await pool.query(
    `SELECT g.*, sender.full_name AS sender_name, sender.email AS sender_email
     FROM gift_orders g JOIN profiles sender ON sender.id::text = g.sender_user_id WHERE g.id = $1`,
    [req.params.id]
  )
  const order = orderRows[0]
  if (!order) return res.status(404).json({ error: 'Order not found' })

  if (payment_status === 'paid' || payment_status === 'free') {
    const { rows: verifiedRows } = await pool.query(
      `SELECT id FROM gift_payments WHERE gift_order_id = $1 AND status = 'verified' LIMIT 1`, [order.id]
    )
    if (verifiedRows.length) {
      await pool.query(`UPDATE gift_payments SET status='verified' WHERE id = $1`, [verifiedRows[0].id])
    } else {
      await pool.query(
        `INSERT INTO gift_payments (gift_order_id, amount, currency, method, status)
         VALUES ($1,$2,$3,'manual','verified')`,
        [order.id, payment_status === 'free' ? 0 : order.amount, order.currency]
      )
    }
    const { rows } = await pool.query(
      `UPDATE gift_orders SET payment_status=$1, status=CASE WHEN status IN ('pending_payment','failed') THEN 'processing' ELSE status END, updated_at=now() WHERE id=$2 RETURNING *`,
      [payment_status, order.id]
    )
    res.json({ order: rows[0] })
    if (order.status !== 'ready') renderGiftAssets(order.id).catch(err => console.error('Gift render failed', err))
    return
  }

  if (payment_status === 'refunded') {
    await pool.query(
      `UPDATE gift_payments SET status='refunded', refunded_by=$1, refunded_at=now() WHERE gift_order_id = $2 AND status = 'verified'`,
      [req.profile.id, order.id]
    )
  }
  const { rows } = await pool.query(
    `UPDATE gift_orders SET payment_status=$1, status=CASE WHEN $1 = 'failed' AND status != 'ready' THEN 'failed' ELSE status END, updated_at=now() WHERE id=$2 RETURNING *`,
    [payment_status, order.id]
  )
  res.json({ order: rows[0] })

  if (order.sender_email && (payment_status === 'refunded' || payment_status === 'failed')) {
    const templateName = payment_status === 'refunded' ? TEMPLATE_NAMES.PAYMENT_REFUNDED : TEMPLATE_NAMES.PAYMENT_FAILED
    sendGiftEmail(templateName, order.sender_email, order.sender_name, {
      gift_recipient_name: order.recipient_name, amount: order.amount, currency: order.currency, notes: notes || '',
    }).catch(err => console.error('Gift status email failed', err))
  }
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
// WALLET CLAIMS — user requests to redeem an unlocked coin tier
// ════════════════════════════════════════════════════════════

router.get('/claims', async (req, res) => {
  const { status } = req.query
  const { rows } = await pool.query(
    status
      ? `SELECT c.*, p.full_name, p.username, p.email, p.coins
         FROM wallet_claims c JOIN profiles p ON p.id = c.user_id
         WHERE c.status = $1 ORDER BY c.created_at DESC`
      : `SELECT c.*, p.full_name, p.username, p.email, p.coins
         FROM wallet_claims c JOIN profiles p ON p.id = c.user_id
         ORDER BY c.created_at DESC`,
    status ? [status] : []
  )
  res.json({ claims: rows })
})

router.post('/claims/:id/approve', async (req, res) => {
  const { rows: claimRows } = await pool.query(
    `SELECT c.*, p.full_name, p.username, p.email, p.coins
     FROM wallet_claims c JOIN profiles p ON p.id = c.user_id WHERE c.id = $1`,
    [req.params.id]
  )
  const claim = claimRows[0]
  if (!claim) return res.status(404).json({ error: 'Claim not found' })
  if (claim.status !== 'pending') return res.status(400).json({ error: 'Claim already reviewed' })
  if ((claim.coins || 0) < claim.tier_cost) {
    return res.status(400).json({ error: 'User no longer has enough coins for this tier' })
  }

  await pool.query('UPDATE profiles SET coins = coins - $1 WHERE id = $2', [claim.tier_cost, claim.user_id])
  const tier = findTier(claim.tier_cost)
  if (tier?.grantsUnlimitedSending) {
    await pool.query('UPDATE profiles SET gift_unlimited_sending = true WHERE id = $1', [claim.user_id])
  }
  const { rows } = await pool.query(
    `UPDATE wallet_claims SET status='fulfilled', admin_notes=$1, reviewed_by=$2, reviewed_at=now() WHERE id=$3 RETURNING *`,
    [req.body?.notes || null, req.profile.id, claim.id]
  )

  await createNotification(claim.user_id, {
    type: 'wallet_claim_approved',
    title: 'Your coin claim has been approved 🎉',
    body: `${claim.tier_label} is ready to use.`,
    link: '/wallet',
  })
  if (claim.email) {
    sendGiftEmail(TEMPLATE_NAMES.WALLET_CLAIM_APPROVED, claim.email, claim.full_name || claim.username, {
      tier_label: claim.tier_label, tier_cost: claim.tier_cost, notes: req.body?.notes || '',
    }).catch(err => console.error('Wallet claim email failed', err))
  }
  res.json({ claim: rows[0] })
})

router.post('/claims/:id/reject', async (req, res) => {
  const { rows: claimRows } = await pool.query(
    `SELECT c.*, p.full_name, p.username, p.email FROM wallet_claims c JOIN profiles p ON p.id = c.user_id WHERE c.id = $1`,
    [req.params.id]
  )
  const claim = claimRows[0]
  if (!claim) return res.status(404).json({ error: 'Claim not found' })
  if (claim.status !== 'pending') return res.status(400).json({ error: 'Claim already reviewed' })

  const { rows } = await pool.query(
    `UPDATE wallet_claims SET status='rejected', admin_notes=$1, reviewed_by=$2, reviewed_at=now() WHERE id=$3 RETURNING *`,
    [req.body?.notes || null, req.profile.id, claim.id]
  )
  await createNotification(claim.user_id, {
    type: 'wallet_claim_rejected',
    title: 'Update on your coin claim',
    body: `${claim.tier_label} couldn't be fulfilled. Your coins were not deducted.`,
    link: '/wallet',
  })
  if (claim.email) {
    sendGiftEmail(TEMPLATE_NAMES.WALLET_CLAIM_REJECTED, claim.email, claim.full_name || claim.username, {
      tier_label: claim.tier_label, tier_cost: claim.tier_cost, notes: req.body?.notes || '',
    }).catch(err => console.error('Wallet claim email failed', err))
  }
  res.json({ claim: rows[0] })
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

const SETTINGS_KEYS = ['gift.module_enabled', 'gift.allowed_audiences']

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
