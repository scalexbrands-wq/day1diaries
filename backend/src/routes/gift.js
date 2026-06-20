const express = require('express')
const crypto = require('crypto')
const { pool } = require('../db/pool')
const { requireAuth, optionalAuth } = require('../middleware/auth')
const { requireFeatureAccess, peekUsage, hasActiveMembership } = require('../services/accessControl')
const razorpay = require('../utils/razorpay')
const { listTributeOptions, generateTribute } = require('../utils/giftInsights')
const { renderGiftAssets, renderGiftPreview } = require('../services/giftRenderService')
const { WALLET_TIERS, findTier } = require('../utils/walletTiers')
const brevo = require('../utils/brevo')

const router = express.Router()
const WEBSITE_URL = process.env.SITE_URL || 'https://www.day1diaries.com'

function generateTributeSlug() {
  return crypto.randomBytes(5).toString('hex')
}

// ════════════════════════════════════════════════════════════
// STATUS — public, lets the frontend hide the CTA if disabled or if
// the signed-in user isn't part of the admin-configured audience
// ════════════════════════════════════════════════════════════

// 'everyone' (or an empty/missing list) means unrestricted. Otherwise the
// list is a set of: 'member' (active membership), 'contributor', 'admin'.
async function isAudienceAllowed(profile) {
  const { rows } = await pool.query(`SELECT value FROM app_settings WHERE key = 'gift.allowed_audiences'`)
  const audiences = rows[0]?.value
  if (!Array.isArray(audiences) || audiences.length === 0 || audiences.includes('everyone')) return true
  if (!profile) return false
  if (audiences.includes(profile.role)) return true
  if (audiences.includes('member') && await hasActiveMembership(profile.id)) return true
  return false
}

router.get('/status', optionalAuth, async (req, res) => {
  const { rows } = await pool.query(`SELECT value FROM app_settings WHERE key = 'gift.module_enabled'`)
  const enabled = rows.length === 0 ? true : rows[0].value !== false
  const allowedForMe = enabled ? await isAudienceAllowed(req.profile) : false
  res.json({ enabled, allowedForMe })
})

// ── GET /gift/wallet — coin balance + the unlock ladder ──────────
router.get('/wallet', requireAuth, async (req, res) => {
  const coins = req.profile.coins || 0
  const tiers = WALLET_TIERS.map(t => ({ ...t, unlocked: coins >= t.cost }))
  res.json({ coins, tiers, unlimitedSending: !!req.profile.gift_unlimited_sending })
})

// POST /gift/wallet/claim — request to redeem an unlocked tier. Coins
// aren't deducted here; an admin reviews the request and approves/rejects
// it from the Gifting > Claims admin tab (so a rejected claim never costs
// the user anything).
router.post('/wallet/claim', requireAuth, async (req, res) => {
  const tier = findTier(Number(req.body.tierCost))
  if (!tier) return res.status(400).json({ error: 'Invalid coin tier' })
  if ((req.profile.coins || 0) < tier.cost) {
    return res.status(400).json({ error: `You need ${tier.cost.toLocaleString()} coins for this — you have ${(req.profile.coins || 0).toLocaleString()}.` })
  }
  const { rows: pendingRows } = await pool.query(
    `SELECT id FROM wallet_claims WHERE user_id = $1 AND tier_cost = $2 AND status = 'pending'`,
    [req.profile.id, tier.cost]
  )
  if (pendingRows.length) return res.status(400).json({ error: 'You already have a pending claim for this tier.' })

  const { rows } = await pool.query(
    `INSERT INTO wallet_claims (user_id, tier_cost, tier_kind, tier_label, gift_type_key)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [req.profile.id, tier.cost, tier.kind, tier.label, tier.giftTypeKey || null]
  )
  res.status(201).json({ claim: rows[0] })
})

// GET /gift/wallet/claims — the current user's own claim history.
router.get('/wallet/claims', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM wallet_claims WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.profile.id]
  )
  res.json({ claims: rows })
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
// PREVIEW — accurate render before payment, no DB write
// ════════════════════════════════════════════════════════════

router.post('/preview', requireAuth, async (req, res) => {
  const { storyId, categoryKey, templateKey, message, aiTributeKind, aiTributeText } = req.body
  if (!storyId || !categoryKey || !templateKey) {
    return res.status(400).json({ error: 'storyId, categoryKey, and templateKey are required' })
  }
  const { rows: tmplRows } = await pool.query('SELECT style_key FROM gift_templates WHERE key = $1', [templateKey])
  const template = tmplRows[0]
  if (!template) return res.status(404).json({ error: 'Design template not found' })

  let tributeText = aiTributeText || null
  if (!tributeText && aiTributeKind) {
    const { rows: storyRows } = await pool.query(
      `SELECT s.title, p.full_name AS author_name FROM stories s JOIN profiles p ON p.id = s.user_id WHERE s.id = $1`,
      [storyId]
    )
    if (storyRows[0]) tributeText = generateTribute(categoryKey, aiTributeKind, { name: storyRows[0].author_name, storyTitle: storyRows[0].title })
  }

  try {
    const pngBuffer = await renderGiftPreview({
      storyId, categoryKey, templateStyleKey: template.style_key,
      message, aiTributeText: tributeText, senderName: req.profile.full_name || req.profile.username,
    })
    res.json({ previewImage: `data:image/png;base64,${pngBuffer.toString('base64')}` })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not render preview' })
  }
})

// ════════════════════════════════════════════════════════════
// CREATE — Steps 2-5 submit here as one payload
// ════════════════════════════════════════════════════════════

// Audience check runs before requireFeatureAccess so an ineligible user
// doesn't burn their free-tier send attempt on a request that was always
// going to be rejected.
async function requireGiftAudience(req, res, next) {
  if (!(await isAudienceAllowed(req.profile))) {
    return res.status(403).json({ error: 'Surprise A Friend is currently limited to a specific audience.' })
  }
  next()
}

// The top wallet tier permanently waives the free-tier send limit for that
// user — skip the consume-on-attempt feature-access check entirely for them.
function requireGiftSendingAccess(req, res, next) {
  if (req.profile?.gift_unlimited_sending) return next()
  return requireFeatureAccess('gift_sending')(req, res, next)
}

router.post('/create', requireAuth, requireGiftAudience, requireGiftSendingAccess, async (req, res) => {
  const {
    storyId, categoryKey, giftTypeKey, templateKey,
    recipientName, recipientEmail, message,
    voiceMessageUrl, videoMessageUrl, imageMessageUrl,
    aiTributeKind, paymentMethod,
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
  let amount = giftType.base_price
  const wantsCoinRedemption = paymentMethod === 'coins'
  const wantsCod = paymentMethod === 'cod'

  let tier = null
  let coinsToSpend = 0
  if (wantsCoinRedemption) {
    tier = findTier(Number(req.body.coinTierCost))
    if (!tier) return res.status(400).json({ error: 'Invalid coin tier' })
    if ((req.profile.coins || 0) < tier.cost) {
      return res.status(400).json({ error: `You need ${tier.cost.toLocaleString()} coins for this — you have ${(req.profile.coins || 0).toLocaleString()}.` })
    }
    if (tier.kind === 'free_gift' && tier.giftTypeKey !== giftTypeKey) {
      return res.status(400).json({ error: `This tier only applies to ${tier.giftTypeKey.replace(/_/g, ' ')}.` })
    }
    coinsToSpend = tier.cost
    amount = tier.kind === 'free_gift' ? 0 : Math.max(0, Number(amount) - tier.amount)
  }

  let paymentStatus, status
  if (Number(amount) <= 0) { paymentStatus = wantsCoinRedemption ? 'paid' : 'free'; status = 'processing' }
  else { paymentStatus = 'pending'; status = 'pending_payment' }

  const { rows: inserted } = await pool.query(
    `INSERT INTO gift_orders (
       sender_user_id, recipient_name, recipient_email, recipient_user_id,
       story_id, category_id, gift_type_id, template_id,
       message, voice_message_url, video_message_url, image_message_url,
       ai_tribute_text, ai_tribute_kind, amount, currency, payment_status, status, tribute_slug, payment_method
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     RETURNING *`,
    [
      req.profile.id, recipientName, recipientEmail || null, recipientUserId,
      storyId, category.id, giftType.id, template.id,
      message || null, voiceMessageUrl || null, videoMessageUrl || null, imageMessageUrl || null,
      aiTributeText, aiTributeKind || null, amount, giftType.currency, paymentStatus, status, tributeSlug,
      wantsCoinRedemption ? 'coins' : wantsCod ? 'cod' : Number(giftType.base_price) <= 0 ? 'free' : 'razorpay',
    ]
  )
  const order = inserted[0]

  if (wantsCoinRedemption) {
    await pool.query('UPDATE profiles SET coins = coins - $1 WHERE id = $2', [coinsToSpend, req.profile.id])
    if (tier.grantsUnlimitedSending) {
      await pool.query('UPDATE profiles SET gift_unlimited_sending = true WHERE id = $1', [req.profile.id])
    }
    await pool.query(
      `INSERT INTO gift_payments (gift_order_id, amount, currency, method, status, coins_spent) VALUES ($1,0,$2,'coins','verified',$3)`,
      [order.id, giftType.currency, coinsToSpend]
    )
    if (Number(amount) <= 0) renderGiftAssets(order.id).catch(err => console.error('Gift render failed', err))
    // else: amount still owed after the discount — sender continues to
    // Razorpay for the remainder via the normal /gift/payment/order flow.
  } else if (paymentStatus === 'free') {
    await pool.query(
      `INSERT INTO gift_payments (gift_order_id, amount, currency, method, status) VALUES ($1,0,$2,'free','verified')`,
      [order.id, giftType.currency]
    )
    renderGiftAssets(order.id).catch(err => console.error('Gift render failed', err))
  } else if (wantsCod) {
    await pool.query(
      `INSERT INTO gift_payments (gift_order_id, amount, currency, method, status) VALUES ($1,$2,$3,'cod','pending')`,
      [order.id, amount, giftType.currency]
    )
    // Rendering/delivery waits for an admin to confirm cash has been
    // collected — see POST /admin/gift/orders/:id/confirm-cod.
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

// ── GET /gift/received — gifts sent TO me, by registered recipients ──
router.get('/received', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT g.*, gc.label AS category_label, gc.emoji AS category_emoji, gt.label AS gift_type_label,
            s.title AS story_title, sender.full_name AS sender_name
     FROM gift_orders g
     JOIN gift_categories gc ON gc.id = g.category_id
     JOIN gift_types gt ON gt.id = g.gift_type_id
     JOIN stories s ON s.id = g.story_id
     JOIN profiles sender ON sender.id::text = g.sender_user_id
     WHERE g.recipient_user_id = $1 ORDER BY g.created_at DESC`,
    [req.profile.id]
  )
  res.json({ gifts: rows })
})

// ── GET /gift/my-payments — payment history across gifts I've sent ──
router.get('/my-payments', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT pay.*, g.recipient_name, g.tribute_slug, gt.label AS gift_type_label
     FROM gift_payments pay
     JOIN gift_orders g ON g.id = pay.gift_order_id
     JOIN gift_types gt ON gt.id = g.gift_type_id
     WHERE g.sender_user_id = $1 ORDER BY pay.created_at DESC`,
    [req.profile.id]
  )
  res.json({ payments: rows })
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

module.exports = router
