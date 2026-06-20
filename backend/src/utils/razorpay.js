// ============================================================
// Razorpay client — online payment for the Membership module.
// Mirrors utils/brevo.js's style: isConfigured() guard, never
// throws on misconfiguration (callers check isConfigured() first).
// ============================================================

const crypto = require('crypto')

let client = null
function getClient() {
  if (!client) {
    const Razorpay = require('razorpay')
    client = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
  }
  return client
}

function isConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
}

function isWebhookConfigured() {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET)
}

// amountInRupees: e.g. 99 -> Razorpay order amount is in the smallest
// currency unit (paise for INR), so this multiplies by 100.
async function createOrder({ amountInRupees, currency = 'INR', receipt }) {
  if (!isConfigured()) throw Object.assign(new Error('Razorpay is not configured'), { status: 503 })
  return getClient().orders.create({
    amount: Math.round(amountInRupees * 100),
    currency,
    receipt,
  })
}

// amountInRupees omitted -> full refund of the original payment.
async function createRefund({ paymentId, amountInRupees, notes }) {
  if (!isConfigured()) throw Object.assign(new Error('Razorpay is not configured'), { status: 503 })
  const payload = { notes }
  if (amountInRupees != null) payload.amount = Math.round(amountInRupees * 100)
  return getClient().payments.refund(paymentId, payload)
}

function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!isConfigured() || !orderId || !paymentId || !signature) return false
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false // different lengths -> not equal, never throw
  }
}

function verifyWebhookSignature(rawBody, signature) {
  if (!isWebhookConfigured() || !rawBody || !signature) return false
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

module.exports = { isConfigured, isWebhookConfigured, createOrder, createRefund, verifyPaymentSignature, verifyWebhookSignature }
