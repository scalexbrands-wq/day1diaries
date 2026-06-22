// Gift lifecycle emails — mirrors services/membershipEmails.js exactly:
// looks up the admin-editable email_templates row (category: 'gift') and
// sends it via the existing Brevo client.

const { pool } = require('../db/pool')
const brevo = require('../utils/brevo')
const { render } = require('../utils/emailRender')

const TEMPLATE_NAMES = {
  GIFT_RECEIVED: 'Gift: Tribute Received',
  PAYMENT_REFUNDED: 'Gift: Payment Refunded',
  PAYMENT_FAILED: 'Gift: Payment Failed',
  WALLET_CLAIM_APPROVED: 'Gift: Wallet Claim Approved',
  WALLET_CLAIM_REJECTED: 'Gift: Wallet Claim Rejected',
  GIFT_SHIPPED: 'Gift: Shipped',
  GIFT_DELIVERED: 'Gift: Delivered',
  GIFT_DELIVERY_FAILED: 'Gift: Delivery Failed',
}

async function sendGiftEmail(templateName, toEmail, toName, variables = {}) {
  if (!toEmail) return { success: false, error: 'No recipient email' }
  const { rows } = await pool.query(
    `SELECT * FROM email_templates WHERE name = $1 AND status != 'archived' LIMIT 1`,
    [templateName]
  )
  const template = rows[0]
  if (!template) {
    console.warn(`[giftEmails] template not found: ${templateName} — skipping send`)
    return { success: false, error: 'Template not configured' }
  }
  const vars = { recipient_name: toName, email: toEmail, ...variables }
  return brevo.sendTransactional({
    to: toEmail,
    toName,
    subject: render(template.subject, vars),
    htmlContent: render(template.html_body, vars),
  })
}

module.exports = { TEMPLATE_NAMES, sendGiftEmail }
