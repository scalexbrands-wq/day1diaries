const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth } = require('../middleware/auth')
const { ensureReferralCode, REFERRER_REWARD, REFERRED_REWARD } = require('../utils/referral')

const router = express.Router()

// GET /referral/me — referral code, share link, and stats for the signed-in user
router.get('/me', requireAuth, async (req, res) => {
  try {
    const code = await ensureReferralCode(req.cognitoSub)

    const { rows } = await pool.query(
      `SELECT count(*)::int AS referred_count, COALESCE(sum(referrer_coins), 0)::int AS coins_earned
       FROM referrals WHERE referrer_id = $1`,
      [req.cognitoSub]
    )

    res.json({
      referralCode: code,
      referrerReward: REFERRER_REWARD,
      referredReward: REFERRED_REWARD,
      referredCount: rows[0].referred_count,
      coinsEarned: rows[0].coins_earned,
    })
  } catch (err) {
    console.error('Referral /me error:', err)
    res.status(500).json({ error: 'Could not load referral info' })
  }
})

module.exports = router
