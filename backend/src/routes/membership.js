const express = require('express')
const multer = require('multer')
const { pool } = require('../db/pool')
const { requireAuth } = require('../middleware/auth')
const imageStorage = require('../utils/imageStorage')
const accessControl = require('../services/accessControl')
const { TEMPLATE_NAMES, sendMembershipEmail } = require('../services/membershipEmails')
const razorpay = require('../utils/razorpay')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB — covers profile photos, screenshots, and resume-style file uploads
})

// ════════════════════════════════════════════════════════════
// PUBLIC — plans, form fields, payment settings
// ════════════════════════════════════════════════════════════

// GET /membership/status — the module master toggle, checked by the
// sidebar nav and the Membership page before showing anything.
router.get('/status', async (req, res) => {
  res.json({ enabled: await accessControl.isModuleEnabled() })
})

router.get('/plans', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM membership_plans WHERE status = 'active' ORDER BY priority_level DESC, price ASC`)
  res.json({ plans: rows })
})

router.get('/form-fields', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM membership_form_fields WHERE is_active = true ORDER BY sort_order`)
  res.json({ fields: rows })
})

router.get('/payment-settings', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT key, value FROM app_settings WHERE key IN ('membership.upi_qr_url','membership.bank_details','membership.payment_methods_enabled')`
  )
  const settings = {}
  for (const row of rows) settings[row.key] = row.value
  res.json({
    upiQrUrl: settings['membership.upi_qr_url'] || null,
    bankDetails: settings['membership.bank_details'] || null,
    paymentMethodsEnabled: settings['membership.payment_methods_enabled'] || ['manual', 'upi', 'bank_transfer'],
    razorpayEnabled: razorpay.isConfigured(),
    razorpayKeyId: razorpay.isConfigured() ? process.env.RAZORPAY_KEY_ID : null,
  })
})

// POST /membership/razorpay/order — creates a Razorpay order for the
// chosen plan; the frontend opens Razorpay Checkout with the result.
router.post('/razorpay/order', requireAuth, async (req, res) => {
  if (!razorpay.isConfigured()) return res.status(503).json({ error: 'Razorpay is not configured' })
  const { planId } = req.body
  if (!planId) return res.status(400).json({ error: 'planId is required' })

  const { rows: planRows } = await pool.query(`SELECT * FROM membership_plans WHERE id = $1 AND status = 'active'`, [planId])
  const plan = planRows[0]
  if (!plan) return res.status(404).json({ error: 'Plan not found or inactive' })

  try {
    const order = await razorpay.createOrder({
      amountInRupees: plan.price,
      currency: plan.currency,
      receipt: `membership-${req.profile.id}-${Date.now()}`,
    })
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID })
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || 'Could not create Razorpay order' })
  }
})

// ════════════════════════════════════════════════════════════
// APPLY
// ════════════════════════════════════════════════════════════

// POST /membership/apply — multipart: planId, paymentMethod, one field per
// membership_form_fields.field_key (text value, or a file with that same
// fieldname for file/image field types), plus an optional `payment_proof` file.
router.post('/apply', requireAuth, upload.any(), async (req, res) => {
  const { planId, paymentMethod, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
  if (!planId) return res.status(400).json({ error: 'planId is required' })
  if (!['manual', 'upi', 'bank_transfer', 'razorpay'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'A valid paymentMethod is required' })
  }
  if (paymentMethod === 'razorpay') {
    const verified = razorpay.verifyPaymentSignature({ orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature })
    if (!verified) return res.status(400).json({ error: 'Payment verification failed — invalid signature' })
  }

  const { rows: planRows } = await pool.query(`SELECT * FROM membership_plans WHERE id = $1 AND status = 'active'`, [planId])
  const plan = planRows[0]
  if (!plan) return res.status(404).json({ error: 'Plan not found or inactive' })

  const { rows: fieldRows } = await pool.query(`SELECT * FROM membership_form_fields WHERE is_active = true`)
  const filesByFieldName = {}
  for (const f of req.files || []) filesByFieldName[f.fieldname] = f

  const baseUrl = `${req.protocol}://${req.get('host')}`
  const formResponses = {}
  for (const field of fieldRows) {
    const isFileType = field.field_type === 'file' || field.field_type === 'image'
    if (isFileType) {
      const file = filesByFieldName[field.field_key]
      if (field.is_required && !file) return res.status(400).json({ error: `${field.label} is required` })
      if (file) {
        const ext = (file.mimetype.split('/')[1] || 'bin').replace('jpeg', 'jpg')
        const url = await imageStorage.saveImage(`membership/applications/${req.profile.id}-${field.field_key}-${Date.now()}.${ext}`, file.buffer, file.mimetype, baseUrl)
        formResponses[field.field_key] = url
      }
    } else {
      const value = req.body[field.field_key]
      if (field.is_required && !value) return res.status(400).json({ error: `${field.label} is required` })
      if (value !== undefined) formResponses[field.field_key] = value
    }
  }

  // Razorpay's verified signature is proof enough — no screenshot needed.
  let paymentProofUrl = null
  if (paymentMethod !== 'manual' && paymentMethod !== 'razorpay') {
    const proofFile = filesByFieldName['payment_proof']
    if (!proofFile) return res.status(400).json({ error: 'Payment proof screenshot is required for this payment method' })
    const ext = (proofFile.mimetype.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
    paymentProofUrl = await imageStorage.saveImage(`membership/payments/${req.profile.id}-${Date.now()}.${ext}`, proofFile.buffer, proofFile.mimetype, baseUrl)
  }

  const { rows: appRows } = await pool.query(
    `INSERT INTO membership_applications (user_id, plan_id, form_responses, status, payment_method, payment_proof_url)
     VALUES ($1,$2,$3,'pending',$4,$5) RETURNING *`,
    [req.profile.id, planId, JSON.stringify(formResponses), paymentMethod, paymentProofUrl]
  )
  const application = appRows[0]

  if (paymentMethod === 'razorpay') {
    // Already cryptographically verified above — log it as verified immediately.
    await pool.query(
      `INSERT INTO membership_payments (application_id, user_id, plan_id, amount, currency, method, status, transaction_ref, razorpay_order_id, verified_at)
       VALUES ($1,$2,$3,$4,$5,'razorpay','verified',$6,$7,now())`,
      [application.id, req.profile.id, planId, plan.price, plan.currency, razorpay_payment_id, razorpay_order_id]
    )
  } else if (paymentMethod !== 'manual') {
    await pool.query(
      `INSERT INTO membership_payments (application_id, user_id, plan_id, amount, currency, method, status, proof_url)
       VALUES ($1,$2,$3,$4,$5,$6,'pending',$7)`,
      [application.id, req.profile.id, planId, plan.price, plan.currency, paymentMethod, paymentProofUrl]
    )
  }

  await sendMembershipEmail(TEMPLATE_NAMES.APPLICATION_SUBMITTED, req.profile.email, req.profile.full_name || req.profile.username, {
    plan_name: plan.name,
  })

  res.status(201).json({ application })
})

// ════════════════════════════════════════════════════════════
// USER DASHBOARD
// ════════════════════════════════════════════════════════════

router.get('/my-application', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT a.*, p.name AS plan_name, p.price, p.currency, p.badge_emoji, p.badge_color
     FROM membership_applications a JOIN membership_plans p ON p.id = a.plan_id
     WHERE a.user_id = $1 ORDER BY a.created_at DESC LIMIT 1`,
    [req.profile.id]
  )
  res.json({ application: rows[0] || null })
})

router.get('/my-membership', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT m.*, p.name AS plan_name, p.badge_emoji, p.badge_color, p.benefits
     FROM memberships m JOIN membership_plans p ON p.id = m.plan_id
     WHERE m.user_id = $1 ORDER BY m.created_at DESC LIMIT 1`,
    [req.profile.id]
  )
  const membership = rows[0] || null
  let card = null
  if (membership) {
    const { rows: cardRows } = await pool.query('SELECT * FROM membership_cards WHERE membership_id = $1 ORDER BY created_at DESC LIMIT 1', [membership.id])
    card = cardRows[0] || null
  }
  res.json({ membership, card })
})

router.get('/my-payments', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT pay.*, plan.name AS plan_name FROM membership_payments pay
     JOIN membership_plans plan ON plan.id = pay.plan_id
     WHERE pay.user_id = $1 ORDER BY pay.created_at DESC`,
    [req.profile.id]
  )
  res.json({ payments: rows })
})

router.get('/usage', requireAuth, async (req, res) => {
  const { rows: rules } = await pool.query('SELECT feature_key, label FROM feature_access_rules ORDER BY label')
  const usage = []
  for (const rule of rules) {
    const result = await accessControl.peekUsage(req.profile.id, rule.feature_key)
    usage.push({ feature_key: rule.feature_key, label: rule.label, ...result })
  }
  res.json({ usage })
})

// ════════════════════════════════════════════════════════════
// RAZORPAY WEBHOOK — safety net in case the browser closes right
// after payment, before /apply completes. Not the primary path.
// ════════════════════════════════════════════════════════════

router.post('/razorpay/webhook', async (req, res) => {
  const signature = req.headers['x-razorpay-signature']
  if (!razorpay.verifyWebhookSignature(req.rawBody, signature)) {
    return res.status(400).json({ error: 'Invalid webhook signature' })
  }

  const event = req.body?.event
  const payment = req.body?.payload?.payment?.entity
  if (!payment?.order_id) return res.json({ received: true })

  if (event === 'payment.captured') {
    const { rowCount } = await pool.query(
      `UPDATE membership_payments SET status='verified', transaction_ref=$1, verified_at=now()
       WHERE razorpay_order_id = $2 AND status = 'pending'`,
      [payment.id, payment.order_id]
    )
    // No matching row — most likely /apply already verified it directly (the
    // normal path), or the browser closed before /apply ran at all, in which
    // case there's no application to attach this to. Logged for visibility;
    // not auto-recovered since we'd be guessing at plan/user without one.
    if (rowCount === 0) console.warn(`[razorpay webhook] payment.captured for order ${payment.order_id} had no matching pending row`)
  } else if (event === 'payment.failed') {
    await pool.query(
      `UPDATE membership_payments SET status='rejected' WHERE razorpay_order_id = $1 AND status = 'pending'`,
      [payment.order_id]
    )
  }

  res.json({ received: true })
})

module.exports = router
