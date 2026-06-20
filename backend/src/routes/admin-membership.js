const express = require('express')
const multer = require('multer')
const { pool } = require('../db/pool')
const { requireAuth, requireRole } = require('../middleware/auth')
const imageStorage = require('../utils/imageStorage')
const membershipService = require('../services/membershipService')
const razorpay = require('../utils/razorpay')
const { TEMPLATE_NAMES, sendMembershipEmail } = require('../services/membershipEmails')

const router = express.Router()
router.use(requireAuth, requireRole('admin'))

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

// ════════════════════════════════════════════════════════════
// PLANS
// ════════════════════════════════════════════════════════════

router.get('/plans', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM membership_plans ORDER BY priority_level DESC, created_at DESC')
  res.json({ plans: rows })
})

router.post('/plans', async (req, res) => {
  const { name, description, price, currency, duration_type, duration_days, benefits, badge_emoji, badge_color, priority_level } = req.body
  if (!name || !duration_type) return res.status(400).json({ error: 'name and duration_type are required' })
  const { rows } = await pool.query(
    `INSERT INTO membership_plans (name, description, price, currency, duration_type, duration_days, benefits, badge_emoji, badge_color, priority_level)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [name, description || null, price || 0, currency || 'INR', duration_type, duration_days || null,
     JSON.stringify(benefits || []), badge_emoji || '⭐', badge_color || '#FF6B2B', priority_level || 0]
  )
  res.status(201).json({ plan: rows[0] })
})

router.put('/plans/:id', async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM membership_plans WHERE id = $1', [req.params.id])
  const existing = existingRows[0]
  if (!existing) return res.status(404).json({ error: 'Plan not found' })

  const merged = { ...existing, ...req.body }
  const { rows } = await pool.query(
    `UPDATE membership_plans SET name=$1, description=$2, price=$3, currency=$4, duration_type=$5, duration_days=$6,
       benefits=$7, badge_emoji=$8, badge_color=$9, priority_level=$10, status=$11, updated_at=now() WHERE id=$12 RETURNING *`,
    [merged.name, merged.description, merged.price, merged.currency, merged.duration_type, merged.duration_days,
     JSON.stringify(merged.benefits || []), merged.badge_emoji, merged.badge_color, merged.priority_level, merged.status, req.params.id]
  )
  res.json({ plan: rows[0] })
})

router.post('/plans/:id/clone', async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM membership_plans WHERE id = $1', [req.params.id])
  const p = existingRows[0]
  if (!p) return res.status(404).json({ error: 'Plan not found' })
  const { rows } = await pool.query(
    `INSERT INTO membership_plans (name, description, price, currency, duration_type, duration_days, benefits, badge_emoji, badge_color, priority_level, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft') RETURNING *`,
    [`${p.name} (Copy)`, p.description, p.price, p.currency, p.duration_type, p.duration_days, JSON.stringify(p.benefits), p.badge_emoji, p.badge_color, p.priority_level]
  )
  res.status(201).json({ plan: rows[0] })
})

router.post('/plans/:id/:action(archive|activate|deactivate)', async (req, res) => {
  const statusMap = { archive: 'archived', activate: 'active', deactivate: 'draft' }
  const { rows } = await pool.query(`UPDATE membership_plans SET status=$1, updated_at=now() WHERE id=$2 RETURNING *`, [statusMap[req.params.action], req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Plan not found' })
  res.json({ plan: rows[0] })
})

// ════════════════════════════════════════════════════════════
// APPLICATION FORM BUILDER
// ════════════════════════════════════════════════════════════

router.get('/form-fields', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM membership_form_fields ORDER BY sort_order')
  res.json({ fields: rows })
})

router.post('/form-fields', async (req, res) => {
  const { field_key, label, field_type, is_required, options, sort_order } = req.body
  if (!field_key || !label || !field_type) return res.status(400).json({ error: 'field_key, label and field_type are required' })
  const { rows } = await pool.query(
    `INSERT INTO membership_form_fields (field_key, label, field_type, is_required, options, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [field_key, label, field_type, !!is_required, JSON.stringify(options || []), sort_order || 0]
  )
  res.status(201).json({ field: rows[0] })
})

router.put('/form-fields/:id', async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM membership_form_fields WHERE id = $1', [req.params.id])
  const existing = existingRows[0]
  if (!existing) return res.status(404).json({ error: 'Field not found' })
  const merged = { ...existing, ...req.body }
  const { rows } = await pool.query(
    `UPDATE membership_form_fields SET label=$1, field_type=$2, is_required=$3, options=$4, sort_order=$5, is_active=$6, updated_at=now() WHERE id=$7 RETURNING *`,
    [merged.label, merged.field_type, !!merged.is_required, JSON.stringify(merged.options || []), merged.sort_order, merged.is_active !== false, req.params.id]
  )
  res.json({ field: rows[0] })
})

router.delete('/form-fields/:id', async (req, res) => {
  await pool.query('DELETE FROM membership_form_fields WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

// ════════════════════════════════════════════════════════════
// APPLICATIONS
// ════════════════════════════════════════════════════════════

router.get('/applications', async (req, res) => {
  const { status } = req.query
  const { rows } = await pool.query(
    status
      ? `SELECT a.*, p.name AS plan_name, json_build_object('username',pr.username,'full_name',pr.full_name,'email',pr.email,'avatar_url',pr.avatar_url) AS profile
         FROM membership_applications a JOIN membership_plans p ON p.id=a.plan_id JOIN profiles pr ON pr.id::text=a.user_id
         WHERE a.status=$1 ORDER BY a.created_at DESC`
      : `SELECT a.*, p.name AS plan_name, json_build_object('username',pr.username,'full_name',pr.full_name,'email',pr.email,'avatar_url',pr.avatar_url) AS profile
         FROM membership_applications a JOIN membership_plans p ON p.id=a.plan_id JOIN profiles pr ON pr.id::text=a.user_id
         ORDER BY a.created_at DESC`,
    status ? [status] : []
  )
  res.json({ applications: rows })
})

router.get('/applications/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT a.*, p.name AS plan_name, json_build_object('username',pr.username,'full_name',pr.full_name,'email',pr.email,'avatar_url',pr.avatar_url) AS profile
     FROM membership_applications a JOIN membership_plans p ON p.id=a.plan_id JOIN profiles pr ON pr.id::text=a.user_id
     WHERE a.id = $1`,
    [req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Application not found' })
  const { rows: paymentRows } = await pool.query('SELECT * FROM membership_payments WHERE application_id = $1', [req.params.id])
  res.json({ application: rows[0], payments: paymentRows })
})

router.post('/applications/:id/approve', async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`
    const membership = await membershipService.approveApplication(req.params.id, req.profile.id, baseUrl)
    res.json({ membership })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

router.post('/applications/:id/reject', async (req, res) => {
  try {
    await membershipService.rejectApplication(req.params.id, req.profile.id, req.body.notes)
    res.json({ success: true })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

const APPLICATION_STATUSES = ['pending', 'under_review', 'approved', 'rejected', 'expired', 'cancelled', 'suspended', 'renewal_due']

// POST /admin/membership/applications/:id/set-status — manual status
// override for any status. 'approved'/'rejected' route through the same
// service functions as the dedicated buttons (so membership creation /
// rejection emails still fire correctly); every other status is a plain
// column update since there's no membership side-effect to keep in sync.
router.post('/applications/:id/set-status', async (req, res) => {
  const { status, notes } = req.body
  if (!APPLICATION_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${APPLICATION_STATUSES.join(', ')}` })
  }
  try {
    if (status === 'approved') {
      const baseUrl = `${req.protocol}://${req.get('host')}`
      await membershipService.approveApplication(req.params.id, req.profile.id, baseUrl)
    } else if (status === 'rejected') {
      await membershipService.rejectApplication(req.params.id, req.profile.id, notes)
    } else {
      const { rows } = await pool.query(
        `UPDATE membership_applications SET status=$1, admin_notes=COALESCE($2,admin_notes), reviewed_by=$3, reviewed_at=now(), updated_at=now() WHERE id=$4 RETURNING *`,
        [status, notes || null, req.profile.id, req.params.id]
      )
      if (!rows.length) return res.status(404).json({ error: 'Application not found' })
      const { rows: profRows } = await pool.query('SELECT email, full_name, username FROM profiles WHERE id::text = $1', [rows[0].user_id])
      const profile = profRows[0]
      if (profile?.email) {
        const templateName = status === 'expired' ? TEMPLATE_NAMES.EXPIRED : TEMPLATE_NAMES.STATUS_UPDATED
        await sendMembershipEmail(templateName, profile.email, profile.full_name || profile.username, {
          status, notes: notes || '', plan_name: rows[0].plan_name, end_date: rows[0].end_date,
        })
      }
    }
    const { rows: updated } = await pool.query('SELECT * FROM membership_applications WHERE id = $1', [req.params.id])
    res.json({ application: updated[0] })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
// PAYMENTS
// ════════════════════════════════════════════════════════════

router.get('/payments', async (req, res) => {
  const { status } = req.query
  const { rows } = await pool.query(
    status
      ? `SELECT pay.*, plan.name AS plan_name, json_build_object('username',pr.username,'full_name',pr.full_name) AS profile
         FROM membership_payments pay JOIN membership_plans plan ON plan.id=pay.plan_id JOIN profiles pr ON pr.id::text=pay.user_id
         WHERE pay.status=$1 ORDER BY pay.created_at DESC`
      : `SELECT pay.*, plan.name AS plan_name, json_build_object('username',pr.username,'full_name',pr.full_name) AS profile
         FROM membership_payments pay JOIN membership_plans plan ON plan.id=pay.plan_id JOIN profiles pr ON pr.id::text=pay.user_id
         ORDER BY pay.created_at DESC`,
    status ? [status] : []
  )
  res.json({ payments: rows })
})

router.post('/payments/:id/:action(verify|reject)', async (req, res) => {
  const status = req.params.action === 'verify' ? 'verified' : 'rejected'
  const { rows } = await pool.query(
    `UPDATE membership_payments SET status=$1, verified_by=$2, verified_at=now() WHERE id=$3 RETURNING *`,
    [status, req.profile.id, req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Payment not found' })

  const { rows: planRows } = await pool.query(
    `SELECT pay.*, plan.name AS plan_name FROM membership_payments pay JOIN membership_plans plan ON plan.id = pay.plan_id WHERE pay.id = $1`,
    [req.params.id]
  )
  const payment = planRows[0]
  const { rows: profileRows } = await pool.query('SELECT * FROM profiles WHERE id = $1', [payment.user_id])
  const profile = profileRows[0]
  if (profile?.email) {
    const templateName = status === 'verified' ? TEMPLATE_NAMES.PAYMENT_RECEIVED : TEMPLATE_NAMES.PAYMENT_FAILED
    await sendMembershipEmail(templateName, profile.email, profile.full_name || profile.username, {
      plan_name: payment.plan_name, amount: payment.amount, currency: payment.currency,
    })
  }

  res.json({ payment: rows[0] })
})

// POST /admin/membership/payments/:id/refund — body: { notes } (optional)
// For razorpay payments, actually issues the refund via Razorpay's API first;
// for manual/upi/bank_transfer it's bookkeeping only (no gateway to call).
router.post('/payments/:id/refund', async (req, res) => {
  const { rows: paymentRows } = await pool.query(
    `SELECT pay.*, plan.name AS plan_name FROM membership_payments pay JOIN membership_plans plan ON plan.id = pay.plan_id WHERE pay.id = $1`,
    [req.params.id]
  )
  const payment = paymentRows[0]
  if (!payment) return res.status(404).json({ error: 'Payment not found' })
  if (payment.status !== 'verified') return res.status(400).json({ error: 'Only verified payments can be refunded' })

  let refundId = null
  if (payment.method === 'razorpay') {
    try {
      const refund = await razorpay.createRefund({ paymentId: payment.transaction_ref, notes: { reason: req.body?.notes || 'Admin-initiated refund' } })
      refundId = refund.id
    } catch (err) {
      return res.status(err.status || 502).json({ error: err.message || 'Razorpay refund failed' })
    }
  }

  const { rows } = await pool.query(
    `UPDATE membership_payments SET status='refunded', refund_id=$1, refunded_by=$2, refunded_at=now() WHERE id=$3 RETURNING *`,
    [refundId, req.profile.id, req.params.id]
  )

  const { rows: profileRows } = await pool.query('SELECT * FROM profiles WHERE id = $1', [payment.user_id])
  const profile = profileRows[0]
  if (profile?.email) {
    await sendMembershipEmail(TEMPLATE_NAMES.PAYMENT_REFUNDED, profile.email, profile.full_name || profile.username, {
      plan_name: payment.plan_name, amount: payment.amount, currency: payment.currency,
    })
  }

  res.json({ payment: rows[0] })
})

// ════════════════════════════════════════════════════════════
// ACCESS CONTROL RULES
// ════════════════════════════════════════════════════════════

router.get('/access-rules', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM feature_access_rules ORDER BY label')
  res.json({ rules: rows })
})

router.put('/access-rules/:id', async (req, res) => {
  const { free_limit, member_limit, reset_frequency, is_active } = req.body
  const { rows } = await pool.query(
    `UPDATE feature_access_rules SET free_limit=COALESCE($1,free_limit), member_limit=COALESCE($2,member_limit),
       reset_frequency=COALESCE($3,reset_frequency), is_active=COALESCE($4,is_active), updated_at=now() WHERE id=$5 RETURNING *`,
    [free_limit, member_limit, reset_frequency, is_active, req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Rule not found' })
  res.json({ rule: rows[0] })
})

// ════════════════════════════════════════════════════════════
// SETTINGS (membership.* keys on the shared app_settings table)
// ════════════════════════════════════════════════════════════

const SETTINGS_KEYS = [
  'membership.module_enabled', 'membership.upi_qr_url', 'membership.bank_details', 'membership.payment_methods_enabled',
  'membership.grace_period_days', 'membership.renewal_reminder_days',
]

router.get('/settings', async (req, res) => {
  const { rows } = await pool.query('SELECT key, value FROM app_settings WHERE key = ANY($1)', [SETTINGS_KEYS])
  const settings = {}
  for (const row of rows) settings[row.key] = row.value
  res.json({ settings, razorpayEnabled: razorpay.isConfigured() })
})

router.patch('/settings', async (req, res) => {
  const entries = Object.entries(req.body || {}).filter(([k]) => SETTINGS_KEYS.includes(k))
  if (!entries.length) return res.status(400).json({ error: 'No valid membership settings provided' })
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

router.post('/settings/upi-qr', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file uploaded' })
  const baseUrl = `${req.protocol}://${req.get('host')}`
  const ext = (req.file.mimetype.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
  const url = await imageStorage.saveImage(`membership/upi-qr-${Date.now()}.${ext}`, req.file.buffer, req.file.mimetype, baseUrl)
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ('membership.upi_qr_url',$1,now())
     ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=now()`,
    [JSON.stringify(url)]
  )
  res.json({ upiQrUrl: url })
})

// ════════════════════════════════════════════════════════════
// DASHBOARD (live aggregate queries — no denormalized analytics table)
// ════════════════════════════════════════════════════════════

router.get('/stats', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT json_build_object(
      'total_members',     (SELECT count(*) FROM memberships WHERE status = 'active'),
      'pending_approvals',  (SELECT count(*) FROM membership_applications WHERE status IN ('pending','under_review')),
      'approved_members',   (SELECT count(*) FROM membership_applications WHERE status = 'approved'),
      'expired_members',    (SELECT count(*) FROM memberships WHERE status = 'expired'),
      'total_revenue',      (SELECT COALESCE(SUM(amount),0) FROM membership_payments WHERE status = 'verified'),
      'monthly_revenue',    (SELECT COALESCE(SUM(amount),0) FROM membership_payments WHERE status = 'verified' AND created_at >= date_trunc('month', now())),
      'total_applications', (SELECT count(*) FROM membership_applications),
      'rejected_applications', (SELECT count(*) FROM membership_applications WHERE status = 'rejected')
    ) AS stats
  `)
  const { rows: planRows } = await pool.query(`
    SELECT p.id, p.name, count(m.id)::int AS member_count, COALESCE(SUM(pay.amount),0) AS revenue
    FROM membership_plans p
    LEFT JOIN memberships m ON m.plan_id = p.id AND m.status = 'active'
    LEFT JOIN membership_payments pay ON pay.plan_id = p.id AND pay.status = 'verified'
    GROUP BY p.id, p.name ORDER BY revenue DESC
  `)
  res.json({ stats: rows[0].stats, planPerformance: planRows })
})

module.exports = router
