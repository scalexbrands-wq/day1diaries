const express = require('express')
const multer = require('multer')
const { pool } = require('../db/pool')
const { requireAuth, requirePermission } = require('../middleware/auth')
const imageStorage = require('../utils/imageStorage')

const router = express.Router()
router.use(requireAuth, requirePermission('manage_marketing'))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB — covers short video ad creatives
  fileFilter: (req, file, cb) => {
    if (!/^image\/|^video\//.test(file.mimetype)) return cb(Object.assign(new Error('Only image or video files are allowed'), { status: 400 }))
    cb(null, true)
  },
})

// GET /admin/ads — campaigns with aggregated impression/click counts
router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT c.*,
      COALESCE(imp.cnt, 0) AS impressions,
      COALESCE(clk.cnt, 0) AS clicks
    FROM ad_campaigns c
    LEFT JOIN (SELECT campaign_id, count(*) cnt FROM ad_events WHERE event_type = 'impression' GROUP BY campaign_id) imp ON imp.campaign_id = c.id
    LEFT JOIN (SELECT campaign_id, count(*) cnt FROM ad_events WHERE event_type = 'click' GROUP BY campaign_id) clk ON clk.campaign_id = c.id
    ORDER BY c.created_at DESC
  `)
  res.json({ campaigns: rows })
})

// GET /admin/ads/:id/analytics — per-placement impression/click breakdown
router.get('/:id/analytics', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT placement, event_type, count(*)::int AS count
     FROM ad_events WHERE campaign_id = $1
     GROUP BY placement, event_type`,
    [req.params.id]
  )
  const byPlacement = {
    discover: { impressions: 0, clicks: 0 }, story_detail: { impressions: 0, clicks: 0 }, feed: { impressions: 0, clicks: 0 },
    jobs: { impressions: 0, clicks: 0 }, leaderboard: { impressions: 0, clicks: 0 },
    community: { impressions: 0, clicks: 0 }, wallet: { impressions: 0, clicks: 0 },
  }
  for (const r of rows) {
    byPlacement[r.placement][r.event_type === 'impression' ? 'impressions' : 'clicks'] = r.count
  }
  res.json({ byPlacement })
})

// POST /admin/ads — create. multipart with field "creative" (image/video),
// or pass creative_url directly in the body if the marketer already hosts it.
router.post('/', upload.single('creative'), async (req, res) => {
  const { name, advertiser_name, ad_type, click_url, placements, start_date, end_date, sort_order } = req.body
  if (!name || !ad_type || !click_url) return res.status(400).json({ error: 'name, ad_type, and click_url are required' })
  if (!['image', 'video'].includes(ad_type)) return res.status(400).json({ error: 'ad_type must be "image" or "video"' })

  let creative_url = req.body.creative_url
  if (req.file) {
    const ext = (req.file.mimetype.split('/')[1] || 'bin').replace('jpeg', 'jpg')
    const key = `ads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const baseUrl = `${req.protocol}://${req.get('host')}`
    creative_url = await imageStorage.saveImage(key, req.file.buffer, req.file.mimetype, baseUrl, { maxWidth: 1280, maxHeight: 1280 })
  }
  if (!creative_url) return res.status(400).json({ error: 'A creative file or creative_url is required' })

  const placementsArr = (() => {
    try { return JSON.parse(placements) } catch { return Array.isArray(placements) ? placements : ['discover', 'story_detail', 'feed', 'jobs', 'leaderboard', 'community', 'wallet'] }
  })()

  const { rows } = await pool.query(
    `INSERT INTO ad_campaigns (name, advertiser_name, ad_type, creative_url, click_url, placements, start_date, end_date, sort_order, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [name, advertiser_name || null, ad_type, creative_url, click_url, JSON.stringify(placementsArr),
     start_date || null, end_date || null, sort_order || 0, req.profile.id]
  )
  res.status(201).json({ campaign: rows[0] })
})

// PUT /admin/ads/:id — update (optionally replacing the creative file)
router.put('/:id', upload.single('creative'), async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM ad_campaigns WHERE id = $1', [req.params.id])
  const existing = existingRows[0]
  if (!existing) return res.status(404).json({ error: 'Campaign not found' })

  let creative_url = req.body.creative_url || existing.creative_url
  if (req.file) {
    const ext = (req.file.mimetype.split('/')[1] || 'bin').replace('jpeg', 'jpg')
    const key = `ads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const baseUrl = `${req.protocol}://${req.get('host')}`
    creative_url = await imageStorage.saveImage(key, req.file.buffer, req.file.mimetype, baseUrl, { maxWidth: 1280, maxHeight: 1280 })
  }

  const placementsArr = (() => {
    if (req.body.placements === undefined) return existing.placements
    try { return JSON.parse(req.body.placements) } catch { return Array.isArray(req.body.placements) ? req.body.placements : existing.placements }
  })()

  const merged = {
    name: req.body.name ?? existing.name,
    advertiser_name: req.body.advertiser_name ?? existing.advertiser_name,
    ad_type: req.body.ad_type ?? existing.ad_type,
    click_url: req.body.click_url ?? existing.click_url,
    status: req.body.status ?? existing.status,
    start_date: req.body.start_date ?? existing.start_date,
    end_date: req.body.end_date ?? existing.end_date,
    sort_order: req.body.sort_order ?? existing.sort_order,
  }

  const { rows } = await pool.query(
    `UPDATE ad_campaigns SET name=$1, advertiser_name=$2, ad_type=$3, creative_url=$4, click_url=$5,
       placements=$6, status=$7, start_date=$8, end_date=$9, sort_order=$10, updated_at=now()
     WHERE id=$11 RETURNING *`,
    [merged.name, merged.advertiser_name, merged.ad_type, creative_url, merged.click_url,
     JSON.stringify(placementsArr), merged.status, merged.start_date, merged.end_date, merged.sort_order, req.params.id]
  )
  res.json({ campaign: rows[0] })
})

// PATCH /admin/ads/:id/status — quick activate/pause/archive
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body
  if (!['draft', 'active', 'paused', 'archived'].includes(status)) return res.status(400).json({ error: 'Invalid status' })
  const { rows } = await pool.query(
    'UPDATE ad_campaigns SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
    [status, req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Campaign not found' })
  res.json({ campaign: rows[0] })
})

// DELETE /admin/ads/:id
router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM ad_campaigns WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

// ════════════════════════════════════════════════════════════
// SETTINGS (marketing.* keys on the shared app_settings table) —
// master enable + who ads are shown to (paid/non-paid/contributor/custom)
// ════════════════════════════════════════════════════════════

const SETTINGS_KEYS = ['marketing.module_enabled', 'marketing.allowed_audiences', 'marketing.custom_user_ids']

router.get('/settings', async (req, res) => {
  const { rows } = await pool.query('SELECT key, value FROM app_settings WHERE key = ANY($1)', [SETTINGS_KEYS])
  const settings = {}
  for (const row of rows) settings[row.key] = row.value
  res.json({ settings })
})

router.patch('/settings', async (req, res) => {
  const entries = Object.entries(req.body || {}).filter(([k]) => SETTINGS_KEYS.includes(k))
  if (!entries.length) return res.status(400).json({ error: 'No valid marketing settings provided' })
  for (const [key, value] of entries) {
    await pool.query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1,$2,now())
       ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=now()`,
      [key, JSON.stringify(value)]
    )
  }
  const { rows } = await pool.query('SELECT key, value FROM app_settings WHERE key = ANY($1)', [SETTINGS_KEYS])
  const settings = {}
  for (const row of rows) settings[row.key] = row.value
  res.json({ settings })
})

module.exports = router
