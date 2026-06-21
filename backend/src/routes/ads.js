const express = require('express')
const { pool } = require('../db/pool')
const { optionalAuth } = require('../middleware/auth')
const { hasActiveMembership } = require('../services/accessControl')

const router = express.Router()
const VALID_PLACEMENTS = ['discover', 'story_detail', 'feed', 'jobs', 'leaderboard', 'community', 'wallet']

async function isModuleEnabled() {
  const { rows } = await pool.query(`SELECT value FROM app_settings WHERE key = 'marketing.module_enabled'`)
  return rows.length === 0 ? true : rows[0].value !== false
}

// 'everyone' (or an empty/missing list) means unrestricted. Otherwise the
// list is a set of: 'member' (active membership / paid), 'free' (no active
// membership / non-paid — also covers anonymous visitors), 'contributor',
// 'custom' (hand-picked user ids in marketing.custom_user_ids).
async function isAudienceAllowed(profile) {
  const { rows } = await pool.query(
    `SELECT key, value FROM app_settings WHERE key IN ('marketing.allowed_audiences','marketing.custom_user_ids')`
  )
  const settings = {}
  for (const row of rows) settings[row.key] = row.value
  const audiences = settings['marketing.allowed_audiences']
  if (!Array.isArray(audiences) || audiences.length === 0 || audiences.includes('everyone')) return true

  const isPaid = profile ? await hasActiveMembership(profile.id) : false
  if (audiences.includes('member') && isPaid) return true
  if (audiences.includes('free') && !isPaid) return true
  if (profile && audiences.includes('contributor') && profile.role === 'contributor') return true
  if (profile && audiences.includes('custom')) {
    const customIds = Array.isArray(settings['marketing.custom_user_ids']) ? settings['marketing.custom_user_ids'] : []
    if (customIds.includes(profile.id)) return true
  }
  return false
}

// GET /ads/active?placement=discover|story_detail|feed — active campaigns
// scheduled for right now, eligible for that placement, for an audience
// this visitor is part of. The frontend picks one (or rotates) per ad slot.
router.get('/active', optionalAuth, async (req, res) => {
  const { placement } = req.query
  if (!VALID_PLACEMENTS.includes(placement)) {
    return res.status(400).json({ error: `placement must be one of: ${VALID_PLACEMENTS.join(', ')}` })
  }
  if (!(await isModuleEnabled()) || !(await isAudienceAllowed(req.profile))) {
    return res.json({ ads: [] })
  }
  const { rows } = await pool.query(
    `SELECT id, name, advertiser_name, ad_type, creative_url, click_url
     FROM ad_campaigns
     WHERE status = 'active'
       AND placements @> to_jsonb($1::text)
       AND (start_date IS NULL OR start_date <= CURRENT_DATE)
       AND (end_date IS NULL OR end_date >= CURRENT_DATE)
     ORDER BY sort_order, created_at DESC`,
    [placement]
  )
  res.json({ ads: rows })
})

// POST /ads/:id/impression — fire-and-forget view log
router.post('/:id/impression', optionalAuth, async (req, res) => {
  const { placement, storyId } = req.body
  if (!VALID_PLACEMENTS.includes(placement)) {
    return res.status(400).json({ error: 'Invalid placement' })
  }
  await pool.query(
    `INSERT INTO ad_events (campaign_id, event_type, placement, user_id, story_id) VALUES ($1,'impression',$2,$3,$4)`,
    [req.params.id, placement, req.profile?.id || null, storyId || null]
  )
  res.json({ success: true })
})

// POST /ads/:id/click — logs the click and hands back the destination URL
router.post('/:id/click', optionalAuth, async (req, res) => {
  const { placement, storyId } = req.body
  if (!VALID_PLACEMENTS.includes(placement)) {
    return res.status(400).json({ error: 'Invalid placement' })
  }
  const { rows } = await pool.query('SELECT click_url FROM ad_campaigns WHERE id = $1', [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'Ad not found' })

  await pool.query(
    `INSERT INTO ad_events (campaign_id, event_type, placement, user_id, story_id) VALUES ($1,'click',$2,$3,$4)`,
    [req.params.id, placement, req.profile?.id || null, storyId || null]
  )
  res.json({ click_url: rows[0].click_url })
})

module.exports = router
