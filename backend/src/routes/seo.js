// ============================================================
// SEO module — sitemap.xml, and server-rendered "share preview"
// pages so social crawlers (which mostly don't run JS) see a
// story/profile's own title/description/image instead of the
// generic site card. Real visitors bounce straight through to
// the actual SPA page via a meta-refresh + JS redirect.
// ============================================================

const express = require('express')
const { pool } = require('../db/pool')

const router = express.Router()

// SITE_URL is the canonical www domain — NOT the CloudFront default
// domain, and NOT the bare apex (day1diaries.com only redirects "/" to
// www and 404s on every other path, e.g. /story/:id, /robots.txt).
// No Terraform change needed: this just needs an env var override if
// the domain setup ever changes.
const SITE_URL = process.env.SITE_URL || 'https://www.day1diaries.com'

function escapeXml(s) {
  return String(s ?? '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]))
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]))
}

async function getSeoDefaults() {
  const { rows } = await pool.query(
    `SELECT key, value FROM app_settings WHERE key IN ('seo.default_title','seo.default_description','seo.default_og_image')`
  )
  const settings = {}
  for (const row of rows) settings[row.key] = row.value
  return {
    title: settings['seo.default_title'] || 'Day1 Diaries — Share Your First Day Story',
    description: settings['seo.default_description'] || 'Day1 Diaries — Share your first day at work story. Learn from real experiences, adopt better habits, and document your personal growth journey.',
    image: settings['seo.default_og_image'] || null,
  }
}

// ── GET /seo/defaults — for Landing.js to set its own <head> tags ──
router.get('/seo/defaults', async (req, res) => {
  res.json(await getSeoDefaults())
})

// ── GET /sitemap.xml ────────────────────────────────────────────
router.get('/sitemap.xml', async (req, res) => {
  const staticPaths = [
    '/', '/discover', '/habits', '/community', '/jobs', '/about', '/blog',
    '/careers', '/contact', '/membership', '/privacy', '/terms',
    '/content-policy', '/posting-guidelines', '/refund-policy',
  ]

  const [stories, posts, jobs] = await Promise.all([
    pool.query(`SELECT id, updated_at FROM stories WHERE status = 'published' AND visibility = 'public' ORDER BY updated_at DESC LIMIT 5000`),
    pool.query(`SELECT slug, updated_at FROM blog_posts WHERE is_published = true ORDER BY updated_at DESC LIMIT 2000`).catch(() => ({ rows: [] })),
    pool.query(`SELECT id, updated_at FROM careers_jobs WHERE is_active = true ORDER BY updated_at DESC LIMIT 1000`).catch(() => ({ rows: [] })),
  ])

  const urls = [
    ...staticPaths.map(p => ({ loc: `${SITE_URL}${p}`, lastmod: null })),
    ...stories.rows.map(s => ({ loc: `${SITE_URL}/story/${s.id}`, lastmod: s.updated_at })),
    ...posts.rows.map(p => ({ loc: `${SITE_URL}/blog/${p.slug}`, lastmod: p.updated_at })),
    ...jobs.rows.map(j => ({ loc: `${SITE_URL}/careers/${j.id}`, lastmod: j.updated_at })),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`

  res.set('Content-Type', 'application/xml').send(xml)
})

function sharePage({ title, description, image, canonicalUrl, redirectUrl }) {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}"/>
<link rel="canonical" href="${escapeHtml(canonicalUrl)}"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="${escapeHtml(title)}"/>
<meta property="og:description" content="${escapeHtml(description)}"/>
<meta property="og:url" content="${escapeHtml(canonicalUrl)}"/>
${image ? `<meta property="og:image" content="${escapeHtml(image)}"/>` : ''}
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}"/>
<meta name="twitter:title" content="${escapeHtml(title)}"/>
<meta name="twitter:description" content="${escapeHtml(description)}"/>
${image ? `<meta name="twitter:image" content="${escapeHtml(image)}"/>` : ''}
<meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}"/>
<script>location.replace(${JSON.stringify(redirectUrl)})</script>
</head><body>
<p>Redirecting to <a href="${escapeHtml(redirectUrl)}">${escapeHtml(title)}</a>…</p>
</body></html>`
}

// ── GET /share/story/:id ─────────────────────────────────────────
router.get('/share/story/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*, p.full_name, p.username FROM stories s JOIN profiles p ON p.id = s.user_id WHERE s.id = $1`,
    [req.params.id]
  )
  const story = rows[0]
  const redirectUrl = `${SITE_URL}/story/${req.params.id}`
  if (!story || story.status !== 'published' || story.visibility !== 'public') {
    return res.redirect(302, redirectUrl)
  }

  const defaults = await getSeoDefaults()
  const excerpt = (story.content || '').replace(/\s+/g, ' ').trim().slice(0, 200)
  res.set('Content-Type', 'text/html').send(sharePage({
    title: `${story.title} — Day1 Diaries`,
    description: excerpt || defaults.description,
    image: story.cover_image_url || defaults.image,
    canonicalUrl: redirectUrl,
    redirectUrl,
  }))
})

// ── GET /share/profile/:username ──────────────────────────────────
router.get('/share/profile/:username', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM profiles WHERE username = $1`, [req.params.username])
  const profile = rows[0]
  const redirectUrl = `${SITE_URL}/profile/${req.params.username}`
  if (!profile) return res.redirect(302, redirectUrl)

  const defaults = await getSeoDefaults()
  res.set('Content-Type', 'text/html').send(sharePage({
    title: `${profile.full_name || profile.username} on Day1 Diaries`,
    description: profile.bio || defaults.description,
    image: profile.avatar_url || defaults.image,
    canonicalUrl: redirectUrl,
    redirectUrl,
  }))
})

// ── GET /share/tribute/:slug — same pattern as /share/story above ─
router.get('/share/tribute/:slug', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT g.*, s.title AS story_title, p.full_name AS author_name
     FROM gift_orders g JOIN stories s ON s.id = g.story_id JOIN profiles p ON p.id = s.user_id
     WHERE g.tribute_slug = $1`,
    [req.params.slug]
  )
  const tribute = rows[0]
  const redirectUrl = `${SITE_URL}/tribute/${req.params.slug}`
  if (!tribute || tribute.status !== 'ready') return res.redirect(302, redirectUrl)

  const defaults = await getSeoDefaults()
  res.set('Content-Type', 'text/html').send(sharePage({
    title: `A Surprise For ${tribute.recipient_name} — Day1 Diaries`,
    description: tribute.message || `${tribute.author_name}'s story, turned into a tribute. ${defaults.description}`,
    image: tribute.gift_image_url || defaults.image,
    canonicalUrl: redirectUrl,
    redirectUrl,
  }))
})

module.exports = router
