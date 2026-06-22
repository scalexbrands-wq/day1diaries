// Background gift-certificate rendering — mirrors
// certificates.js's renderCertificateAssets pattern. Extracted into its
// own service (rather than living inline in routes/gift.js) so both the
// sender-facing payment-verify flow and the admin COD-confirmation flow
// can trigger it.

const QRCode = require('qrcode')
const { pool } = require('../db/pool')
const { uploadBuffer } = require('../utils/s3')
const { getEmbeddedFontCss } = require('../utils/fontEmbed')
const { renderCertificate } = require('../utils/certificateRender')
const { renderGiftCertificateHtml } = require('../templates/giftCertificateTemplate')
const { extractHighlight } = require('../utils/giftInsights')
const { sendGiftEmail, TEMPLATE_NAMES } = require('./giftEmails')
const { createNotification } = require('./notifications')

const crypto = require('crypto')
const WEBSITE_URL = process.env.SITE_URL || 'https://www.day1diaries.com'

function generateGiftCertNumber() {
  const code = crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 6)
  return `D1D-GIFT-${code}`
}

async function renderGiftAssets(orderId) {
  const { rows } = await pool.query(
    `SELECT g.*, gc.label AS category_label, gc.emoji AS category_emoji, tm.style_key AS template_key, tm.custom_html AS template_custom_html,
            s.title AS story_title, s.content AS story_content, s.cover_image_url,
            p.full_name AS author_name, p.avatar_url AS author_avatar_url,
            sender.full_name AS sender_name, sender.avatar_url AS sender_avatar_url
     FROM gift_orders g
     JOIN gift_categories gc ON gc.id = g.category_id
     JOIN gift_templates tm ON tm.id = g.template_id
     JOIN stories s ON s.id = g.story_id
     JOIN profiles p ON p.id = s.user_id
     JOIN profiles sender ON sender.id::text = g.sender_user_id
     WHERE g.id = $1`,
    [orderId]
  )
  const order = rows[0]
  if (!order) return

  try {
    // Company/role/joining-date aren't stored on the story itself (they're
    // entered ad hoc when a story-author certificate is issued) — reuse the
    // most recent issued certificate's values for this story if one exists,
    // otherwise the certificate simply omits those fields gracefully.
    const { rows: certRows } = await pool.query(
      `SELECT company_name, job_title, joining_date FROM certificates WHERE story_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [order.story_id]
    )
    const certInfo = certRows[0] || {}

    const certificateNumber = generateGiftCertNumber()
    const tributeUrl = `${WEBSITE_URL}/tribute/${order.tribute_slug}`
    const qrCodeDataUri = await QRCode.toDataURL(tributeUrl, { width: 240, margin: 1 })
    const fontCss = await getEmbeddedFontCss()

    const data = {
      fullName: order.author_name,
      avatarUrl: order.author_avatar_url,
      heroImageUrl: order.image_message_url || order.cover_image_url || order.author_avatar_url,
      storyTitle: order.story_title,
      storyExcerpt: extractHighlight(order.story_content),
      companyName: certInfo.company_name || '',
      jobTitle: certInfo.job_title || '',
      joiningDate: certInfo.joining_date || null,
      categoryLabel: `${order.category_label} Certificate`,
      categoryEmoji: order.category_emoji,
      friendMessage: order.message || '',
      senderName: order.sender_name,
      senderAvatarUrl: order.sender_avatar_url,
      aiTributeText: order.ai_tribute_text,
      certificateNumber,
      issuedAt: new Date().toISOString(),
      qrCodeDataUri,
      websiteUrl: WEBSITE_URL,
    }

    const html = renderGiftCertificateHtml(data, fontCss, order.template_key, order.template_custom_html)
    const { pngBuffer, pdfBuffer } = await renderCertificate(html, order.template_key)

    const [giftImageUrl, giftPdfUrl] = await Promise.all([
      uploadBuffer(`gifts/${certificateNumber}.png`, pngBuffer, 'image/png'),
      uploadBuffer(`gifts/${certificateNumber}.pdf`, pdfBuffer, 'application/pdf'),
    ])

    await pool.query(
      `UPDATE gift_orders SET gift_image_url=$1, gift_pdf_url=$2, qr_target_url=$3,
         certificate_number=$4, status='ready', updated_at=now() WHERE id=$5`,
      [giftImageUrl, giftPdfUrl, tributeUrl, certificateNumber, orderId]
    )

    if (order.recipient_email) {
      await sendGiftEmail(TEMPLATE_NAMES.GIFT_RECEIVED, order.recipient_email, order.recipient_name, {
        sender_name: order.sender_name, message: order.message || '', tribute_url: tributeUrl,
      })
    }
    if (order.recipient_user_id) {
      await createNotification(order.recipient_user_id, {
        type: 'gift_received',
        title: "You've received a surprise from a friend 🎁",
        body: `${order.sender_name} sent you a tribute.`,
        link: `/tribute/${order.tribute_slug}`,
      })
    }
  } catch (err) {
    console.error('Gift render failed', err)
    await pool.query(`UPDATE gift_orders SET status='failed', updated_at=now() WHERE id = $1`, [orderId]).catch(() => {})
  }
}

// Ephemeral preview — same renderer as the real gift, but no DB row, no S3
// upload, no QR (a real tribute URL doesn't exist yet). Returns a PNG
// buffer the caller can hand back as a data URI. Used by the wizard's
// "preview before you pay" step.
async function renderGiftPreview({ storyId, categoryKey, templateStyleKey, templateCustomHtml, message, aiTributeText, senderName, senderAvatarUrl, heroImageUrl }) {
  const { rows: storyRows } = await pool.query(
    `SELECT s.title, s.content, s.cover_image_url, p.full_name AS author_name, p.avatar_url AS author_avatar_url
     FROM stories s JOIN profiles p ON p.id = s.user_id WHERE s.id = $1`,
    [storyId]
  )
  const story = storyRows[0]
  if (!story) throw Object.assign(new Error('Story not found'), { status: 404 })

  const { rows: catRows } = await pool.query('SELECT label, emoji FROM gift_categories WHERE key = $1', [categoryKey])
  const category = catRows[0] || { label: 'Recognition', emoji: '🎁' }

  const fontCss = await getEmbeddedFontCss()
  const data = {
    fullName: story.author_name,
    avatarUrl: story.author_avatar_url,
    heroImageUrl: heroImageUrl || story.cover_image_url || story.author_avatar_url,
    storyTitle: story.title,
    storyExcerpt: extractHighlight(story.content),
    companyName: '', jobTitle: '', joiningDate: null,
    categoryLabel: `${category.label} Certificate`,
    categoryEmoji: category.emoji,
    friendMessage: message || '',
    senderName: senderName || 'A Friend',
    senderAvatarUrl: senderAvatarUrl || null,
    aiTributeText: aiTributeText || '',
    certificateNumber: 'PREVIEW',
    issuedAt: new Date().toISOString(),
    qrCodeDataUri: null,
    websiteUrl: WEBSITE_URL,
  }
  const html = renderGiftCertificateHtml(data, fontCss, templateStyleKey, templateCustomHtml)
  const { pngBuffer } = await renderCertificate(html, templateStyleKey)
  return pngBuffer
}

module.exports = { renderGiftAssets, renderGiftPreview, generateGiftCertNumber }
