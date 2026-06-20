const express = require('express')
const multer = require('multer')
const { pool } = require('../db/pool')
const { requireAuth, requireRole } = require('../middleware/auth')
const imageStorage = require('../utils/imageStorage')

const router = express.Router()
router.use(requireAuth, requireRole('admin'))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(Object.assign(new Error('Only image files are allowed'), { status: 400 }))
    cb(null, true)
  },
})

const SETTINGS_KEYS = ['seo.default_title', 'seo.default_description', 'seo.default_og_image', 'seo.google_site_verification']

router.get('/settings', async (req, res) => {
  const { rows } = await pool.query('SELECT key, value FROM app_settings WHERE key = ANY($1)', [SETTINGS_KEYS])
  const settings = {}
  for (const row of rows) settings[row.key] = row.value
  res.json({ settings })
})

router.patch('/settings', async (req, res) => {
  const entries = Object.entries(req.body || {}).filter(([k]) => SETTINGS_KEYS.includes(k))
  if (!entries.length) return res.status(400).json({ error: 'No valid SEO settings provided' })
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

router.post('/settings/og-image', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file uploaded' })
  const baseUrl = `${req.protocol}://${req.get('host')}`
  const ext = (req.file.mimetype.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
  const url = await imageStorage.saveImage(`seo/og-image-${Date.now()}.${ext}`, req.file.buffer, req.file.mimetype, baseUrl)
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ('seo.default_og_image',$1,now())
     ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=now()`,
    [JSON.stringify(url)]
  )
  res.json({ ogImageUrl: url })
})

module.exports = router
