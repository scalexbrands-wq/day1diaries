// ============================================================
// Membership lifecycle emails — looks up the admin-editable
// `email_templates` row by name (category='membership') and sends it
// via the existing Brevo client. These are one-off transactional
// triggers, not bulk campaigns, so they bypass the Email Center's
// audience/workflow/send-log machinery and just render+send directly.
// ============================================================

const { pool } = require('../db/pool')
const brevo = require('../utils/brevo')
const { render } = require('../utils/emailRender')

// Template names admins can edit in the Email Center (category: membership).
const TEMPLATE_NAMES = {
  APPLICATION_SUBMITTED: 'Membership: Application Submitted',
  PAYMENT_RECEIVED: 'Membership: Payment Received',
  PAYMENT_FAILED: 'Membership: Payment Failed',
  PAYMENT_REFUNDED: 'Membership: Payment Refunded',
  APPROVED: 'Membership: Approved',
  REJECTED: 'Membership: Rejected',
  ACTIVATED: 'Membership: Activated',
  CARD_READY: 'Membership: Card Ready',
  EXPIRING: 'Membership: Expiring Soon',
  RENEWED: 'Membership: Renewed',
  EXPIRED: 'Membership: Expired',
  WELCOME_PREMIUM: 'Membership: Welcome Premium Member',
  STATUS_UPDATED: 'Membership: Status Updated',
}

async function sendMembershipEmail(templateName, toEmail, toName, variables = {}) {
  if (!toEmail) return { success: false, error: 'No recipient email' }
  const { rows } = await pool.query(
    `SELECT * FROM email_templates WHERE name = $1 AND status != 'archived' LIMIT 1`,
    [templateName]
  )
  const template = rows[0]
  if (!template) {
    console.warn(`[membershipEmails] template not found: ${templateName} — skipping send`)
    return { success: false, error: 'Template not configured' }
  }
  const vars = { name: toName, email: toEmail, ...variables }
  return brevo.sendTransactional({
    to: toEmail,
    toName,
    subject: render(template.subject, vars),
    htmlContent: render(template.html_body, vars),
  })
}

module.exports = { TEMPLATE_NAMES, sendMembershipEmail }
