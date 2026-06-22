// Daily Surprise — a single admin-managed promo popup, claimable once
// per user while it's the active one. Mirrors routes/announcements.js:
// user-facing GET-active/claim routes plus admin CRUD in one file.

const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, requirePermission } = require('../middleware/auth')
const { createNotification } = require('../services/notifications')

const router = express.Router()
router.use(requireAuth)
const manageSurprises = requirePermission('manage_surprises')

// GET /surprise/active — the current surprise (if any) + whether the
// signed-in user has already claimed it. The coupon code itself is
// only included once claimed, so it can't be read off this endpoint
// without claiming first.
router.get('/active', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*, c.code AS coupon_code, c.discount_type AS coupon_discount_type, c.discount_value AS coupon_discount_value,
            EXISTS(SELECT 1 FROM surprise_claims sc WHERE sc.surprise_id = s.id AND sc.user_id = $1) AS claimed
     FROM daily_surprises s
     LEFT JOIN coupons c ON c.id = s.reward_coupon_id
     WHERE s.is_active = true
     ORDER BY s.created_at DESC LIMIT 1`,
    [req.cognitoSub]
  )
  const surprise = rows[0] || null
  if (surprise && surprise.reward_type === 'coupon' && !surprise.claimed) {
    delete surprise.coupon_code
    delete surprise.coupon_discount_type
    delete surprise.coupon_discount_value
  }
  res.json({ surprise })
})

// POST /surprise/:id/claim
router.post('/:id/claim', async (req, res) => {
  const { rows: surpriseRows } = await pool.query(
    `SELECT s.*, c.code AS coupon_code FROM daily_surprises s LEFT JOIN coupons c ON c.id = s.reward_coupon_id
     WHERE s.id = $1 AND s.is_active = true`,
    [req.params.id]
  )
  const surprise = surpriseRows[0]
  if (!surprise) return res.status(404).json({ error: 'This surprise is no longer active' })

  const { rowCount } = await pool.query(
    `INSERT INTO surprise_claims (user_id, surprise_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [req.cognitoSub, surprise.id]
  )
  if (!rowCount) return res.status(409).json({ error: "You've already claimed this surprise" })

  if (surprise.reward_type === 'coins') {
    await pool.query('UPDATE profiles SET coins = coins + $1 WHERE id = $2', [surprise.reward_coins || 0, req.cognitoSub])
    await createNotification(req.cognitoSub, {
      type: 'surprise_claimed',
      title: 'Surprise claimed! 🎉',
      body: `${surprise.reward_coins || 0} coins added to your wallet.`,
      link: '/wallet',
    })
    return res.json({ rewardType: 'coins', coins: surprise.reward_coins || 0 })
  }

  res.json({ rewardType: 'coupon', couponCode: surprise.coupon_code || null })
})

// ── Admin CRUD ────────────────────────────────────────────────

router.get('/admin/all', manageSurprises, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*, c.code AS coupon_code FROM daily_surprises s LEFT JOIN coupons c ON c.id = s.reward_coupon_id
     ORDER BY s.created_at DESC`
  )
  res.json({ surprises: rows })
})

router.post('/admin', manageSurprises, async (req, res) => {
  const { title, description, image_url, link_url, reward_type, reward_coins, reward_coupon_id } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' })
  if (!['coins', 'coupon'].includes(reward_type)) return res.status(400).json({ error: "reward_type must be 'coins' or 'coupon'" })
  if (reward_type === 'coins' && !(Number(reward_coins) > 0)) return res.status(400).json({ error: 'reward_coins must be greater than 0' })
  if (reward_type === 'coupon' && !reward_coupon_id) return res.status(400).json({ error: 'reward_coupon_id is required for coupon rewards' })

  // Only one surprise is active at a time.
  await pool.query('UPDATE daily_surprises SET is_active = false WHERE is_active = true')
  const { rows } = await pool.query(
    `INSERT INTO daily_surprises (title, description, image_url, link_url, reward_type, reward_coins, reward_coupon_id, is_active, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8) RETURNING *`,
    [title.trim(), description || null, image_url || null, link_url || null, reward_type, reward_type === 'coins' ? reward_coins : null, reward_type === 'coupon' ? reward_coupon_id : null, req.profile.id]
  )
  res.status(201).json({ surprise: rows[0] })
})

router.put('/admin/:id', manageSurprises, async (req, res) => {
  const { title, description, image_url, link_url, is_active } = req.body
  if (is_active) {
    await pool.query('UPDATE daily_surprises SET is_active = false WHERE is_active = true AND id != $1', [req.params.id])
  }
  const { rows } = await pool.query(
    `UPDATE daily_surprises SET title=COALESCE($1,title), description=COALESCE($2,description),
       image_url=COALESCE($3,image_url), link_url=COALESCE($4,link_url), is_active=COALESCE($5,is_active), updated_at=now()
     WHERE id=$6 RETURNING *`,
    [title, description, image_url, link_url, is_active, req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Surprise not found' })
  res.json({ surprise: rows[0] })
})

router.delete('/admin/:id', manageSurprises, async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM daily_surprises WHERE id = $1', [req.params.id])
  if (!rowCount) return res.status(404).json({ error: 'Surprise not found' })
  res.json({ success: true })
})

module.exports = router
