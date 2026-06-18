const express = require('express')
const QRCode = require('qrcode')
const { pool } = require('../db/pool')
const { requireAuth, optionalAuth } = require('../middleware/auth')
const { uploadBuffer } = require('../utils/s3')
const { getEmbeddedFontCss } = require('../utils/fontEmbed')
const { renderCertificate, renderSocialPreview } = require('../utils/certificateRender')
const { renderCertificateHtml, renderSocialPreviewHtml } = require('../templates/certificateTemplate')
const {
  computeImpactLevel, IMPACT_LEVEL_ICONS, extractInsightTags, extractHighlight, generateCertificateNumber,
} = require('../utils/certificateInsights')

const router = express.Router()
const WEBSITE_URL = process.env.WEBSITE_URL || 'https://d1kxji3yv78nbx.cloudfront.net'

// ── POST /certificates/generate ─────────────────────────────────
// body: { storyId, companyName, jobTitle, joiningDate, industry, location, companyLogoUrl }
router.post('/generate', requireAuth, async (req, res) => {
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
  if (story.user_id !== req.cognitoSub) {
    return res.status(403).json({ error: 'Only the story author can generate a certificate for it' })
  }

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
  const qrCodeDataUri = await QRCode.toDataURL(qrTargetUrl, { width: 240, margin: 1 })

  const certificateData = {
    fullName: snapshot.fullName,
    avatarUrl: snapshot.avatarUrl,
    storyTitle: story.title,
    storyExcerpt: snapshot.excerpt,
    highlight,
    companyName, jobTitle, joiningDate, industry, location, companyLogoUrl,
    insightTags, impactLevel, impactIcon, snapshot,
    issuedAt: new Date().toISOString(),
    qrCodeDataUri,
    websiteUrl: WEBSITE_URL,
  }

  const fontCss = await getEmbeddedFontCss()

  let certificateNumber, insertedRow
  for (let attempt = 0; attempt < 3 && !insertedRow; attempt++) {
    certificateNumber = generateCertificateNumber()
    const html = renderCertificateHtml({ ...certificateData, certificateNumber }, fontCss)
    const socialHtml = renderSocialPreviewHtml(certificateData, fontCss)

    const [{ pngBuffer, pdfBuffer }, socialBuffer] = await Promise.all([
      renderCertificate(html),
      renderSocialPreview(socialHtml),
    ])

    const [certificateImageUrl, certificatePdfUrl, socialPreviewUrl] = await Promise.all([
      uploadBuffer(`certificates/${certificateNumber}.png`, pngBuffer, 'image/png'),
      uploadBuffer(`certificates/${certificateNumber}.pdf`, pdfBuffer, 'application/pdf'),
      uploadBuffer(`certificates/${certificateNumber}-social.png`, socialBuffer, 'image/png'),
    ])

    try {
      const { rows: inserted } = await pool.query(
        `INSERT INTO certificates (
           certificate_number, user_id, story_id, company_name, job_title, joining_date,
           industry, location, company_logo_url, ai_insights, impact_level, snapshot,
           certificate_image_url, certificate_pdf_url, social_preview_url, qr_target_url
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING *`,
        [
          certificateNumber, req.cognitoSub, storyId, companyName, jobTitle, joiningDate || null,
          industry || null, location || null, companyLogoUrl || null,
          JSON.stringify({ tags: insightTags, highlight }), impactLevel, JSON.stringify(snapshot),
          certificateImageUrl, certificatePdfUrl, socialPreviewUrl, qrTargetUrl,
        ]
      )
      insertedRow = inserted[0]
    } catch (err) {
      if (err.code !== '23505') throw err // unique_violation on certificate_number — retry with a new one
    }
  }

  if (!insertedRow) return res.status(500).json({ error: 'Could not generate a unique certificate number' })
  res.status(201).json({ certificate: insertedRow })
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
