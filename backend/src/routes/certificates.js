const express = require('express')
const QRCode = require('qrcode')
const { pool } = require('../db/pool')
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth')
const { uploadBuffer } = require('../utils/s3')
const { getEmbeddedFontCss } = require('../utils/fontEmbed')
const { renderCertificate, renderSocialPreview } = require('../utils/certificateRender')
const { renderCertificateHtml, renderSocialPreviewHtml } = require('../templates/certificateTemplate')
const {
  computeImpactLevel, IMPACT_LEVEL_ICONS, extractInsightTags, extractHighlight, generateCertificateNumber,
} = require('../utils/certificateInsights')

const router = express.Router()
const WEBSITE_URL = process.env.WEBSITE_URL || 'https://d1kxji3yv78nbx.cloudfront.net'

// ── Background rendering — runs after the request has already responded ──
// Puppeteer rendering + S3 upload can take longer than typical gateway/ALB
// timeouts, so the row is inserted as 'processing' first and the client
// polls GET /certificates/:id until this finishes and flips it to 'completed'.
async function renderCertificateAssets(certRow, certificateData) {
  try {
    const qrCodeDataUri = await QRCode.toDataURL(certificateData.qrTargetUrl, { width: 240, margin: 1 })
    const fontCss = await getEmbeddedFontCss()
    const fullData = {
      ...certificateData,
      qrCodeDataUri,
      issuedAt: new Date(certRow.issued_at).toISOString(),
      websiteUrl: WEBSITE_URL,
      certificateNumber: certRow.certificate_number,
    }
    const html = renderCertificateHtml(fullData, fontCss)
    const socialHtml = renderSocialPreviewHtml(fullData, fontCss)

    const [{ pngBuffer, pdfBuffer }, socialBuffer] = await Promise.all([
      renderCertificate(html),
      renderSocialPreview(socialHtml),
    ])

    const [certificateImageUrl, certificatePdfUrl, socialPreviewUrl] = await Promise.all([
      uploadBuffer(`certificates/${certRow.certificate_number}.png`, pngBuffer, 'image/png'),
      uploadBuffer(`certificates/${certRow.certificate_number}.pdf`, pdfBuffer, 'application/pdf'),
      uploadBuffer(`certificates/${certRow.certificate_number}-social.png`, socialBuffer, 'image/png'),
    ])

    await pool.query(
      `UPDATE certificates SET certificate_image_url=$1, certificate_pdf_url=$2,
         social_preview_url=$3, status='completed', updated_at=now() WHERE id=$4`,
      [certificateImageUrl, certificatePdfUrl, socialPreviewUrl, certRow.id]
    )
  } catch (err) {
    console.error('Certificate render failed', err)
    await pool.query(`UPDATE certificates SET status='failed', updated_at=now() WHERE id=$1`, [certRow.id]).catch(() => {})
  }
}

// ── POST /certificates/generate ─────────────────────────────────
// Admin-only — issued on behalf of the story's author.
// body: { storyId, companyName, jobTitle, joiningDate, industry, location, companyLogoUrl }
router.post('/generate', requireAuth, requireRole('admin'), async (req, res) => {
  const { storyId, companyName, jobTitle, joiningDate, industry, location, companyLogoUrl } = req.body
  if (!storyId || !companyName || !jobTitle) {
    return res.status(400).json({ error: 'storyId, companyName, and jobTitle are required' })
  }

  const { rows } = await pool.query(
    `SELECT s.*, json_build_object(
        'id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url
      ) AS profiles
     FROM stories s JOIN profiles p ON p.id = s.user_id WHERE s.id = $1`,
    [storyId]
  )
  if (!rows.length) return res.status(404).json({ error: 'Story not found' })
  const story = rows[0]

  const wordCount = (story.content || '').trim().split(/\s+/).filter(Boolean).length
  const impactLevel = computeImpactLevel(wordCount)
  const impactIcon = IMPACT_LEVEL_ICONS[impactLevel]
  const insightTags = extractInsightTags(story.content)
  const highlight = extractHighlight(story.content)

  const { rows: viewRows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM story_views WHERE story_id = $1', [storyId]
  )
  const snapshot = {
    storyTitle: story.title,
    excerpt: story.content.slice(0, 500),
    fullName: story.profiles.full_name,
    avatarUrl: story.profiles.avatar_url,
    likesCount: story.likes_count || 0,
    commentsCount: story.comments_count || 0,
    sharesCount: story.shares_count || 0,
    savesCount: story.saves_count || 0,
    viewsCount: viewRows[0]?.count || 0,
  }

  const qrTargetUrl = `${WEBSITE_URL}/story/${storyId}`

  let certificateNumber, insertedRow
  for (let attempt = 0; attempt < 5 && !insertedRow; attempt++) {
    certificateNumber = generateCertificateNumber()
    try {
      const { rows: inserted } = await pool.query(
        `INSERT INTO certificates (
           certificate_number, user_id, story_id, company_name, job_title, joining_date,
           industry, location, company_logo_url, ai_insights, impact_level, snapshot,
           qr_target_url, status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'processing')
         RETURNING *`,
        [
          certificateNumber, story.user_id, storyId, companyName, jobTitle, joiningDate || null,
          industry || null, location || null, companyLogoUrl || null,
          JSON.stringify({ tags: insightTags, highlight }), impactLevel, JSON.stringify(snapshot),
          qrTargetUrl,
        ]
      )
      insertedRow = inserted[0]
    } catch (err) {
      if (err.code !== '23505') throw err // unique_violation on certificate_number — retry with a new one
    }
  }

  if (!insertedRow) return res.status(500).json({ error: 'Could not generate a unique certificate number' })
  res.status(202).json({ certificate: insertedRow })

  renderCertificateAssets(insertedRow, {
    fullName: snapshot.fullName,
    avatarUrl: snapshot.avatarUrl,
    storyTitle: story.title,
    storyExcerpt: snapshot.excerpt,
    highlight,
    companyName, jobTitle, joiningDate, industry, location, companyLogoUrl,
    insightTags, impactLevel, impactIcon, snapshot,
    qrTargetUrl,
  })
})

// ── GET /certificates/:id ────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM certificates WHERE id = $1', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Certificate not found' })
  res.json({ certificate: rows[0] })
})

// ── GET /certificates/:id/download?format=png|pdf ───────────────
router.get('/:id/download', async (req, res) => {
  const format = req.query.format === 'pdf' ? 'pdf' : 'png'
  const { rows } = await pool.query('SELECT * FROM certificates WHERE id = $1', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Certificate not found' })

  const url = format === 'pdf' ? rows[0].certificate_pdf_url : rows[0].certificate_image_url
  if (!url) return res.status(404).json({ error: `No ${format} available for this certificate` })
  res.redirect(url)
})

// ── POST /certificates/share ─────────────────────────────────────
// body: { certificateId, platform }
router.post('/share', requireAuth, async (req, res) => {
  const { certificateId, platform } = req.body
  if (!certificateId || !platform) {
    return res.status(400).json({ error: 'certificateId and platform are required' })
  }
  const { rows } = await pool.query('SELECT id FROM certificates WHERE id = $1', [certificateId])
  if (!rows.length) return res.status(404).json({ error: 'Certificate not found' })
  res.json({ success: true })
})

module.exports = router
