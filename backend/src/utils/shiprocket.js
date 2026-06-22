// ============================================================
// Shiprocket client — courier integration for physical gifting.
// Mirrors utils/razorpay.js's style: isConfigured() guard, never
// throws on misconfiguration until an actual API call is attempted.
// Unlike Razorpay's static API key, Shiprocket auth is a bearer
// token obtained via email/password login (valid ~10 days), so we
// lazily log in and cache the token until shortly before it expires.
// ============================================================

const crypto = require('crypto')

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external'
const TOKEN_LIFETIME_MS = 9 * 24 * 60 * 60 * 1000 // refresh a day early

let cachedToken = null // { token, expiresAt }

function isConfigured() {
  return Boolean(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD)
}

function isWebhookConfigured() {
  return Boolean(process.env.SHIPROCKET_WEBHOOK_SECRET)
}

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.token) {
    throw Object.assign(new Error(data.message || 'Shiprocket login failed'), { status: res.status || 502 })
  }
  return data.token
}

async function getToken() {
  if (!isConfigured()) throw Object.assign(new Error('Shiprocket is not configured'), { status: 503 })
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token
  const token = await login()
  cachedToken = { token, expiresAt: Date.now() + TOKEN_LIFETIME_MS }
  return token
}

async function request(method, path, body) {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(data.message || `Shiprocket request failed (${res.status})`), { status: res.status || 502 })
  }
  return data
}

// payload follows Shiprocket's "Create Adhoc Order" shape — caller
// (services/shipmentService.js) builds it from the gift_orders row.
async function createOrder(payload) {
  return request('POST', '/orders/create/adhoc', payload)
}

async function trackByAwb(awbCode) {
  return request('GET', `/courier/track/awb/${awbCode}`)
}

async function cancelShipment(shipmentIds) {
  return request('POST', '/orders/cancel', { ids: Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds] })
}

// Shiprocket doesn't HMAC-sign webhook bodies like Razorpay — it echoes
// back a secret string you configure in its dashboard as a header value
// on every call, so verification is a constant-time string compare.
function verifyWebhookSecret(headerValue) {
  if (!isWebhookConfigured() || !headerValue) return false
  const expected = Buffer.from(process.env.SHIPROCKET_WEBHOOK_SECRET)
  const actual = Buffer.from(String(headerValue))
  if (expected.length !== actual.length) return false
  try {
    return crypto.timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

module.exports = { isConfigured, isWebhookConfigured, createOrder, trackByAwb, cancelShipment, verifyWebhookSecret }
