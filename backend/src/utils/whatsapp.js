// ============================================================
// WhatsApp welcome message — sends the community invite to new
// users via Meta's WhatsApp Business Cloud API.
//
// Requires (see backend/.env):
//   WHATSAPP_PHONE_NUMBER_ID   — the "From" number's phone_number_id
//   WHATSAPP_ACCESS_TOKEN      — permanent access token for the Meta App
//   WHATSAPP_TEMPLATE_NAME     — name of the approved template to send
//   WHATSAPP_TEMPLATE_LANG     — template language code (default en_US)
//
// A template is required (not a free-form text message) because the
// recipient has never messaged the business number first — Cloud API
// only allows free-form replies within a 24h customer-service window.
//
// Expected approved template ("welcome_message", category Utility):
//   Header: Welcome to Day1 Diaries 🎉
//   Body:   Hi {{1}}! Thanks for joining Day1 Diaries. Tap below to
//           join our WhatsApp community — connect with 10,000+
//           freshers sharing stories, tips, and job leads.
//   Footer: Day1 Diaries Team
//   Button: URL type, text "Join Community", static URL set to the
//           community invite link (no dynamic suffix needed).
// ============================================================

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v20.0'

function isConfigured() {
  return Boolean(
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_TEMPLATE_NAME
  )
}

// Sends the approved welcome template to `toPhone` (E.164, e.g. +919876543210),
// personalized with `name` for the {{1}} body variable. Returns true on
// success, false on failure — never throws, so a WhatsApp outage can't
// break signup/login.
async function sendWelcomeMessage(toPhone, name) {
  if (!isConfigured()) {
    console.warn('[whatsapp] not configured — skipping welcome message')
    return false
  }
  if (!toPhone) return false

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`

  const body = {
    messaging_product: 'whatsapp',
    to: toPhone.replace(/[^\d+]/g, ''),
    type: 'template',
    template: {
      name: process.env.WHATSAPP_TEMPLATE_NAME,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en_US' },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: name || 'there' }] },
      ],
    },
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.error('[whatsapp] send failed:', res.status, await res.text())
      return false
    }
    return true
  } catch (err) {
    console.error('[whatsapp] send error (non-fatal):', err.message)
    return false
  }
}

module.exports = { sendWelcomeMessage, isConfigured }
