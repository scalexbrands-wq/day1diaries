const express = require('express')
const crypto = require('crypto')
const QRCode = require('qrcode')
const { pool } = require('../db/pool')
const { requireAuth, optionalAuth } = require('../middleware/auth')
const { requireFeatureAccess, peekUsage } = require('../services/accessControl')
const razorpay = require('../utils/razorpay')
const { uploadBuffer } = require('../utils/s3')
const { getEmbeddedFontCss } = require('../utils/fontEmbed')
const { renderCertificate } = require('../utils/certificateRender')
const { renderGiftCertificateHtml } = require('../templates/giftCertificateTemplate')
const { extractHighlight, generateTribute, listTributeOptions } = require('../utils/giftInsights')
const { sendGiftEmail, TEMPLATE_NAMES } = require('../services/giftEmails')
const { createNotification } = require('../services/notifications')
const brevo = require('../utils/brevo')

const router = express.Router()
const WEBSITE_URL = process.env.SITE_URL || 'https://www.day1diaries.com'

function generateGiftCertNumber() {
  const code = crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 6)
  return `D1D-GIFT-${code}`
}
function generateTributeSlug() {
  return crypto.randomBytes(5).toString('hex')
}

// ════════════════════════════════════════════════════════════
// STATUS — public, lets the frontend hide the CTA if disabled
// ════════════════════════════════════════════════════════════

router.get('/status', async (req, res) => {
  const { rows } = await pool.query(`SELECT value FROM app_settings WHERE key = 'gift.module_enabled'`)
  res.json({ enabled: rows.length === 0 ? true : rows[0].value !== false })
})

// ════════════════════════════════════════════════════════════
// CATALOG — public, active rows only
// ════════════════════════════════════════════════════════════

router.get('/categories', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM gift_categories WHERE is_active = true ORDER BY sort_order')
  res.json({ categories: rows })
})

router.get('/types', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM gift_types WHERE is_active = true ORDER BY sort_order')
  res.json({ types: rows })
})

router.get('/templates', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM gift_templates WHERE is_active = true ORDER BY created_at')
  res.json({ templates: rows })
})

// GET /gift/tribute-options?categoryKey=&name=&storyTitle=&company= — preview
// the 5 rule-based tribute text options before the sender commits to one.
router.get('/tribute-options', optionalAuth, (req, res) => {
  const { categoryKey, name, storyTitle, company } = req.query
  res.json({ options: listTributeOptions(categoryKey, { name, storyTitle, company }) })
})

// ════════════════════════════════════════════════════════════
// STORY SEARCH — Step 1 of the wizard
// ════════════════════════════════════════════════════════════

router.get('/stories/search', optionalAuth, async (req, res) => {
  const { q = '', scope = 'public', authorUsername } = req.query
  const like = `%${q.trim()}%`

  // Profile-page entry point — list a specific author's own published
  // stories, regardless of follow relationship (still public-visibility only).
  if (authorUsername) {
    const { rows } = await pool.query(
      `SELECT s.id, s.title, s.cover_image_url, p.full_name AS author_name
       FROM stories s JOIN profiles p ON p.id = s.user_id
       WHERE p.username = $1 AND s.status = 'published' AND s.visibility = 'public' AND s.title ILIKE $2
       ORDER BY s.created_at DESC LIMIT 20`,
      [authorUsername, like]
    )
    return res.json({ stories: rows })
  }

  if (scope === 'mine') {
    if (!req.profile) return res.status(401).json({ error: 'Sign in to view your stories' })
    const { rows } = await pool.query(
      `SELECT s.id, s.title, s.cover_image_url, p.full_name AS author_name
       FROM stories s JOIN profiles p ON p.id = s.user_id
       WHERE s.user_id = $1 AND s.status = 'published' AND s.title ILIKE $2
       ORDER BY s.created_at DESC LIMIT 20`,
      [req.profile.id, like]
    )
    return res.json({ stories: rows })
  }

  if (scope === 'friends') {
    if (!req.profile) return res.status(401).json({ error: 'Sign in to view friends\' stories' })
    const { rows } = await pool.query(
      `SELECT s.id, s.title, s.cover_image_url, p.full_name AS author_name
       FROM stories s JOIN profiles p ON p.id = s.user_id
       WHERE s.status = 'published' AND s.visibility = 'public' AND s.title ILIKE $2
         AND s.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1)
       ORDER BY s.created_at DESC LIMIT 20`,
      [req.profile.id, like]
    )
    return res.json({ stories: rows })
  }

  const { rows } = await pool.query(
    `SELECT s.id, s.title, s.cover_image_url, p.full_name AS author_name
     FROM stories s JOIN profiles p ON p.id = s.user_id
     WHERE s.status = 'published' AND s.visibility = 'public' AND s.title ILIKE $1
     ORDER BY s.created_at DESC LIMIT 20`,
    [like]
  )
  res.json({ stories: rows })
})

// ════════════════════════════════════════════════════════════
// CREATE — Steps 2-5 submit here as one payload
// ════════════════════════════════════════════════════════════

router.post('/create', requireAuth, requireFeatureAccess('gift_sending'), async (req, res) => {
  const {
    storyId, categoryKey, giftTypeKey, templateKey,
    recipientName, recipientEmail, message,
    voiceMessageUrl, videoMessageUrl, imageMessageUrl,
    aiTributeKind,
  } = req.body

  if (!storyId || !categoryKey || !giftTypeKey || !templateKey || !recipientName) {
    return res.status(400).json({ error: 'storyId, categoryKey, giftTypeKey, templateKey, and recipientName are required' })
  }
  if (message && message.length > 1000) {
    return res.status(400).json({ error: 'Message must be 1000 characters or fewer' })
  }

  const { rows: storyRows } = await pool.query(
    `SELECT s.*, p.id AS author_id, p.full_name AS author_name FROM stories s
     JOIN profiles p ON p.id = s.user_id WHERE s.id = $1 AND s.status = 'published'`,
    [storyId]
  )
  const story = storyRows[0]
  if (!story) return res.status(404).json({ error: 'Story not found or not published' })

  const { rows: catRows } = await pool.query('SELECT * FROM gift_categories WHERE key = $1 AND is_active = true', [categoryKey])
  const category = catRows[0]
  if (!category) return res.status(404).json({ error: 'Gift category not found' })

  const { rows: typeRows } = await pool.query('SELECT * FROM gift_types WHERE key = $1 AND is_active = true', [giftTypeKey])
  const giftType = typeRows[0]
  if (!giftType) return res.status(404).json({ error: 'Gift type not found' })

  const { rows: tmplRows } = await pool.query('SELECT * FROM gift_templates WHERE key = $1 AND is_active = true', [templateKey])
  const template = tmplRows[0]
  if (!template) return res.status(404).json({ error: 'Design template not found' })

  // If the recipient is a registered platform user, find them by email for
  // in-app notification + dashboard linkage.
  let recipientUserId = null
  if (recipientEmail) {
    const { rows: recRows } = await pool.query('SELECT id FROM profiles WHERE email = $1', [recipientEmail])
    recipientUserId = recRows[0]?.id || null
  }

  const aiTributeText = aiTributeKind
    ? generateTribute(categoryKey, aiTributeKind, { name: story.author_name, storyTitle: story.title })
    : null

  const tributeSlug = generateTributeSlug()
  const amount = giftType.base_price
  const paymentStatus = Number(amount) <= 0 ? 'free' : 'pending'
  const status = Number(amount) <= 0 ? 'processing' : 'pending_payment'

  const { rows: inserted } = await pool.query(
    `INSERT INTO gift_orders (
       sender_user_id, recipient_name, recipient_email, recipient_user_id,
       story_id, category_id, gift_type_id, template_id,
       message, voice_message_url, video_message_url, image_message_url,
       ai_tribute_text, ai_tribute_kind, amount, currency, payment_status, status, tribute_slug
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING *`,
    [
      req.profile.id, recipientName, recipientEmail || null, recipientUserId,
      storyId, category.id, giftType.id, template.id,
      message || null, voiceMessageUrl || null, videoMessageUrl || null, imageMessageUrl || null,
      aiTributeText, aiTributeKind || null, amount, giftType.currency, paymentStatus, status, tributeSlug,
    ]
  )
  const order = inserted[0]

  if (paymentStatus === 'free') {
    await pool.query(
      `INSERT INTO gift_payments (gift_order_id, amount, currency, method, status) VALUES ($1,0,$2,'free','verified')`,
      [order.id, giftType.currency]
    )
    renderGiftAssets(order.id).catch(err => console.error('Gift render failed', err))
  }

  res.status(201).json({ order })
})

// ════════════════════════════════════════════════════════════
// PAYMENT
// ════════════════════════════════════════════════════════════

router.post('/payment/order', requireAuth, async (req, res) => {
  if (!razorpay.isConfigured()) return res.status(503).json({ error: 'Razorpay is not configured' })
  const { giftOrderId } = req.body
  const { rows } = await pool.query(
    'SELECT * FROM gift_orders WHERE id = $1 AND sender_user_id = $2', [giftOrderId, req.profile.id]
  )
  const order = rows[0]
  if (!order) return res.status(404).json({ error: 'Gift order not found' })
  if (order.payment_status === 'paid') return res.status(400).json({ error: 'This gift has already been paid for' })

  try {
    const rpOrder = await razorpay.createOrder({
      amountInRupees: order.amount,
      currency: order.currency,
      receipt: `gift-${order.id}-${Date.now()}`,
    })
    res.json({ orderId: rpOrder.id, amount: rpOrder.amount, currency: rpOrder.currency, keyId: process.env.RAZORPAY_KEY_ID })
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || 'Could not create Razorpay order' })
  }
})

router.post('/payment/verify', requireAuth, async (req, res) => {
  const { giftOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
  const verified = razorpay.verifyPaymentSignature({ orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature })
  if (!verified) return res.status(400).json({ error: 'Payment verification failed — invalid signature' })

  const { rows } = await pool.query(
    'SELECT * FROM gift_orders WHERE id = $1 AND sender_user_id = $2', [giftOrderId, req.profile.id]
  )
  const order = rows[0]
  if (!order) return res.status(404).json({ error: 'Gift order not found' })

  await pool.query(
    `INSERT INTO gift_payments (gift_order_id, amount, currency, method, status, razorpay_order_id, razorpay_payment_id)
     VALUES ($1,$2,$3,'razorpay','verified',$4,$5)`,
    [order.id, order.amount, order.currency, razorpay_order_id, razorpay_payment_id]
  )
  await pool.query(`UPDATE gift_orders SET payment_status='paid', status='processing', updated_at=now() WHERE id = $1`, [order.id])

  res.json({ success: true })
  renderGiftAssets(order.id).catch(err => console.error('Gift render failed', err))
})

router.post('/razorpay/webhook', async (req, res) => {
  const signature = req.headers['x-razorpay-signature']
  if (!razorpay.verifyWebhookSignature(req.rawBody, signature)) {
    return res.status(400).json({ error: 'Invalid webhook signature' })
  }
  const event = req.body?.event
  const payment = req.body?.payload?.payment?.entity
  if (!payment?.order_id) return res.json({ received: true })

  if (event === 'payment.captured') {
    const { rows } = await pool.query(
      `UPDATE gift_payments SET status='verified' WHERE razorpay_order_id = $1 AND status != 'verified' RETURNING gift_order_id`,
      [payment.order_id]
    )
    if (rows[0]) {
      const orderId = rows[0].gift_order_id
      const { rowCount } = await pool.query(
        `UPDATE gift_orders SET payment_status='paid', status='processing', updated_at=now() WHERE id = $1 AND status = 'pending_payment'`,
        [orderId]
      )
      if (rowCount > 0) renderGiftAssets(orderId).catch(err => console.error('Gift render failed', err))
    }
  } else if (event === 'payment.failed') {
    await pool.query(`UPDATE gift_payments SET status='rejected' WHERE razorpay_order_id = $1 AND status = 'pending'`, [payment.order_id])
  }
  res.json({ received: true })
})

// ════════════════════════════════════════════════════════════
// STATUS / DOWNLOAD
// ════════════════════════════════════════════════════════════

router.get('/my-gifts', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT g.*, gc.label AS category_label, gc.emoji AS category_emoji, gt.label AS gift_type_label, s.title AS story_title
     FROM gift_orders g
     JOIN gift_categories gc ON gc.id = g.category_id
     JOIN gift_types gt ON gt.id = g.gift_type_id
     JOIN stories s ON s.id = g.story_id
     WHERE g.sender_user_id = $1 ORDER BY g.created_at DESC`,
    [req.profile.id]
  )
  res.json({ gifts: rows })
})

router.get('/:id', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM gift_orders WHERE id = $1 AND sender_user_id = $2', [req.params.id, req.profile.id])
  if (!rows.length) return res.status(404).json({ error: 'Gift order not found' })
  res.json({ order: rows[0] })
})

router.get('/:id/download', async (req, res) => {
  const format = req.query.format === 'pdf' ? 'pdf' : 'png'
  const { rows } = await pool.query('SELECT * FROM gift_orders WHERE id = $1', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Gift order not found' })
  const url = format === 'pdf' ? rows[0].gift_pdf_url : rows[0].gift_image_url
  if (!url) return res.status(404).json({ error: `No ${format} available for this gift yet` })
  res.redirect(url)
})

// ════════════════════════════════════════════════════════════
// TRIBUTE — public JSON for the SPA tribute page
// ════════════════════════════════════════════════════════════

router.get('/tribute/:slug', optionalAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT g.*, gc.label AS category_label, gc.emoji AS category_emoji, gt.label AS gift_type_label,
            tm.label AS template_label, s.title AS story_title, s.content AS story_content,
            s.cover_image_url AS story_cover_image_url, p.full_name AS author_name, p.avatar_url AS author_avatar_url,
            p.username AS author_username, sender.full_name AS sender_name
     FROM gift_orders g
     JOIN gift_categories gc ON gc.id = g.category_id
     JOIN gift_types gt ON gt.id = g.gift_type_id
     JOIN gift_templates tm ON tm.id = g.template_id
     JOIN stories s ON s.id = g.story_id
     JOIN profiles p ON p.id = s.user_id
     JOIN profiles sender ON sender.id::text = g.sender_user_id
     WHERE g.tribute_slug = $1 AND g.status = 'ready'`,
    [req.params.slug]
  )
  if (!rows.length) return res.status(404).json({ error: 'Tribute not found' })
  res.json({ tribute: rows[0] })
})

// POST /gift/share/email — the one real server-side share action; sends the
// tribute link via Brevo to an arbitrary email the sender types in.
router.post('/share/email', requireAuth, async (req, res) => {
  const { tributeSlug, toEmail } = req.body
  if (!tributeSlug || !toEmail) return res.status(400).json({ error: 'tributeSlug and toEmail are required' })
  const { rows } = await pool.query('SELECT * FROM gift_orders WHERE tribute_slug = $1 AND status = $2', [tributeSlug, 'ready'])
  if (!rows.length) return res.status(404).json({ error: 'Tribute not found' })

  const result = await brevo.sendTransactional({
    to: toEmail,
    subject: 'Someone shared a Day1 Diaries tribute with you 🎁',
    htmlContent: `<p>Take a look at this tribute:</p><p><a href="${WEBSITE_URL}/tribute/${tributeSlug}">${WEBSITE_URL}/tribute/${tributeSlug}</a></p>`,
  })
  res.json(result)
})

// ════════════════════════════════════════════════════════════
// BACKGROUND RENDER — mirrors certificates.js's renderCertificateAssets
// ════════════════════════════════════════════════════════════

async function renderGiftAssets(orderId) {
  const { rows } = await pool.query(
    `SELECT g.*, gc.label AS category_label, gc.emoji AS category_emoji, tm.key AS template_key,
            s.title AS story_title, s.content AS story_content, s.cover_image_url,
            p.full_name AS author_name, p.avatar_url AS author_avatar_url,
            sender.full_name AS sender_name
     FROM gift_orders g
     JOIN gift_categories gc ON gc.id = g.category_id
     JOIN gift_templates tm ON tm.id = g.template_id
     JOIN stories s ON s.id = g.story_id
     JOIN profiles p ON p.id = s.user_id
     JOIN profiles sender ON sender.id::text = g.sender_user_id
     WHERE g.id = $1`,
    [orderId]
  )
  const order = rows[0]
  if (!order) return

  try {
    // Company/role/joining-date aren't stored on the story itself (they're
    // entered ad hoc when a story-author certificate is issued) — reuse the
    // most recent issued certificate's values for this story if one exists,
    // otherwise the certificate simply omits those fields gracefully.
    const { rows: certRows } = await pool.query(
      `SELECT company_name, job_title, joining_date FROM certificates WHERE story_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [order.story_id]
    )
    const certInfo = certRows[0] || {}

    const certificateNumber = generateGiftCertNumber()
    const tributeUrl = `${WEBSITE_URL}/tribute/${order.tribute_slug}`
    const qrCodeDataUri = await QRCode.toDataURL(tributeUrl, { width: 240, margin: 1 })
    const fontCss = await getEmbeddedFontCss()

    const data = {
      fullName: order.author_name,
      avatarUrl: order.author_avatar_url,
      storyTitle: order.story_title,
      storyExcerpt: extractHighlight(order.story_content),
      companyName: certInfo.company_name || '',
      jobTitle: certInfo.job_title || '',
      joiningDate: certInfo.joining_date || null,
      categoryLabel: `${order.category_label} Certificate`,
      categoryEmoji: order.category_emoji,
      friendMessage: order.message || '',
      senderName: order.sender_name,
      aiTributeText: order.ai_tribute_text,
      certificateNumber,
      issuedAt: new Date().toISOString(),
      qrCodeDataUri,
      websiteUrl: WEBSITE_URL,
    }

    const html = renderGiftCertificateHtml(data, fontCss, order.template_key)
    const { pngBuffer, pdfBuffer } = await renderCertificate(html)

    const [giftImageUrl, giftPdfUrl] = await Promise.all([
      uploadBuffer(`gifts/${certificateNumber}.png`, pngBuffer, 'image/png'),
      uploadBuffer(`gifts/${certificateNumber}.pdf`, pdfBuffer, 'application/pdf'),
    ])

    await pool.query(
      `UPDATE gift_orders SET gift_image_url=$1, gift_pdf_url=$2, qr_target_url=$3,
         certificate_number=$4, status='ready', updated_at=now() WHERE id=$5`,
      [giftImageUrl, giftPdfUrl, tributeUrl, certificateNumber, orderId]
    )

    if (order.recipient_email) {
      await sendGiftEmail(TEMPLATE_NAMES.GIFT_RECEIVED, order.recipient_email, order.recipient_name, {
        sender_name: order.sender_name, message: order.message || '', tribute_url: tributeUrl,
      })
    }
    if (order.recipient_user_id) {
      await createNotification(order.recipient_user_id, {
        type: 'gift_received',
        title: "You've received a surprise from a friend 🎁",
        body: `${order.sender_name} sent you a tribute.`,
        link: `/tribute/${order.tribute_slug}`,
      })
    }
  } catch (err) {
    console.error('Gift render failed', err)
    await pool.query(`UPDATE gift_orders SET status='failed', updated_at=now() WHERE id = $1`, [orderId]).catch(() => {})
  }
}

module.exports = router
