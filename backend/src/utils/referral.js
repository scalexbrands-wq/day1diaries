const crypto = require('crypto')
const { pool } = require('../db/pool')

const REFERRER_REWARD = 500
const REFERRED_REWARD = 1000

// Generates a short, human-shareable referral code unique to this user
// (base username + a few random chars), retrying on the rare collision.
async function ensureReferralCode(userId) {
  const { rows } = await pool.query('SELECT referral_code, username FROM profiles WHERE id = $1', [userId])
  if (!rows.length) return null
  if (rows[0].referral_code) return rows[0].referral_code

  const base = (rows[0].username || 'USER').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'USER'
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase()
    const code = `${base}${suffix}`
    try {
      await pool.query('UPDATE profiles SET referral_code = $1 WHERE id = $2', [code, userId])
      return code
    } catch (err) {
      if (err.code !== '23505') throw err // unique_violation — retry with a new suffix
    }
  }
  throw new Error('Could not generate a unique referral code')
}

// Credits both sides of a referral when a new user signs up with a code.
// No-ops (without throwing) if the code is invalid, self-referral, or the
// new user has already been referred — signup should never fail because of this.
async function applyReferralSignupBonus(newUserId, referralCodeInput) {
  if (!referralCodeInput) return
  const code = String(referralCodeInput).trim().toUpperCase()
  if (!code) return

  try {
    const { rows } = await pool.query('SELECT id FROM profiles WHERE referral_code = $1', [code])
    const referrer = rows[0]
    if (!referrer || referrer.id === newUserId) return

    const { rowCount } = await pool.query(
      `INSERT INTO referrals (referrer_id, referred_id, referrer_coins, referred_coins)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (referred_id) DO NOTHING`,
      [referrer.id, newUserId, REFERRER_REWARD, REFERRED_REWARD]
    )
    if (!rowCount) return // already referred

    await pool.query('UPDATE profiles SET referred_by = $1 WHERE id = $2', [referrer.id, newUserId])
    await pool.query('UPDATE profiles SET coins = coins + $1 WHERE id = $2', [REFERRER_REWARD, referrer.id])
    await pool.query('UPDATE profiles SET coins = coins + $1 WHERE id = $2', [REFERRED_REWARD, newUserId])
  } catch (err) {
    console.error('Referral bonus error (non-fatal):', err.message)
  }
}

module.exports = { ensureReferralCode, applyReferralSignupBonus, REFERRER_REWARD, REFERRED_REWARD }
