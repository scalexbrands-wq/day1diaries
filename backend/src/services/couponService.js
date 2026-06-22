// Coupon validation/application — shared by the gift-checkout coupon
// preview endpoint and the real /create flow, and by the "coupon"
// reward type on daily surprises, so the discount math lives in one
// place instead of being duplicated per caller.

const { pool } = require('../db/pool')

// amount: the pre-discount order amount (rupees). Throws with .status
// (same convention as utils/razorpay.js / utils/shiprocket.js) so
// route handlers can let express-async-errors propagate it as-is.
async function validateCoupon(code, amount) {
  if (!code) throw Object.assign(new Error('Coupon code is required'), { status: 400 })
  const { rows } = await pool.query('SELECT * FROM coupons WHERE code = $1', [String(code).trim().toUpperCase()])
  const coupon = rows[0]
  if (!coupon || !coupon.is_active) {
    throw Object.assign(new Error('Invalid or expired coupon code'), { status: 400 })
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    throw Object.assign(new Error('This coupon has expired'), { status: 400 })
  }
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
    throw Object.assign(new Error('This coupon has reached its usage limit'), { status: 400 })
  }
  const discountAmount = coupon.discount_type === 'percent'
    ? Number(amount) * (Number(coupon.discount_value) / 100)
    : Math.min(Number(amount), Number(coupon.discount_value))
  const finalAmount = Math.max(0, Number(amount) - discountAmount)
  return { coupon, discountAmount, finalAmount }
}

// Increments used_count — called only when a coupon is actually
// applied to a created order, not on preview/validate calls.
async function consumeCoupon(couponId) {
  await pool.query('UPDATE coupons SET used_count = used_count + 1, updated_at = now() WHERE id = $1', [couponId])
}

module.exports = { validateCoupon, consumeCoupon }
