// ============================================================
// Brevo transactional email client — used by the Email Center
// (templates/audiences/workflows) to deliver rendered emails.
//
// Requires (see backend/.env):
//   BREVO_API_KEY      — Brevo API v3 key
//   BREVO_SENDER_EMAIL  — verified sender address in Brevo
//   BREVO_SENDER_NAME   — display name for the sender
//
// Mirrors utils/whatsapp.js: never throws, logs and returns false
// on failure so an email outage can't break the rest of the app.
// ============================================================

const API_URL = 'https://api.brevo.com/v3/smtp/email'

function isConfigured() {
  return Boolean(
    process.env.BREVO_API_KEY &&
    process.env.BREVO_SENDER_EMAIL
  )
}

// Sends one rendered email. Returns { success, messageId, error }.
async function sendTransactional({ to, toName, subject, htmlContent, replyTo }) {
  if (!isConfigured()) {
    console.warn('[brevo] not configured — skipping send')
    return { success: false, error: 'Brevo not configured' }
  }
  if (!to) return { success: false, error: 'Missing recipient' }

  const body = {
    sender: { email: process.env.BREVO_SENDER_EMAIL, name: process.env.BREVO_SENDER_NAME || 'Day1 Diaries' },
    to: [{ email: to, name: toName || undefined }],
    subject,
    htmlContent,
  }
  if (replyTo) body.replyTo = { email: replyTo }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('[brevo] send failed:', res.status, data)
      // Honor rate-limit backoff once, then give up — caller already
      // chunks sends with a delay between batches.
      if (res.status === 429) await new Promise(r => setTimeout(r, 1000))
      return { success: false, error: data.message || res.statusText }
    }
    return { success: true, messageId: data.messageId }
  } catch (err) {
    console.error('[brevo] send error (non-fatal):', err.message)
    return { success: false, error: err.message }
  }
}

// Sends a batch of { to, toName, subject, htmlContent } messages with
// limited concurrency so we don't hammer Brevo's rate limit.
async function sendBatch(messages, concurrency = 10) {
  const results = []
  for (let i = 0; i < messages.length; i += concurrency) {
    const chunk = messages.slice(i, i + concurrency)
    const chunkResults = await Promise.allSettled(chunk.map(sendTransactional))
    results.push(...chunkResults.map(r => (r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message })))
  }
  return results
}

module.exports = { isConfigured, sendTransactional, sendBatch }
