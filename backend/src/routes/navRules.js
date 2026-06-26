const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, optionalAuth, requirePermission } = require('../middleware/auth')
const { isAudienceAllowed } = require('../services/accessControl')

const router = express.Router()
const adminRouter = express.Router()

const SETTINGS_KEY = 'sidebar.nav_rules'

// The 9 sidebar items not already gated by their own module toggle
// (Membership/Gifts/Wallet keep using getMembershipStatus/getGiftModuleStatus
// separately — see frontend/src/components/Sidebar.js). Single source of
// truth for both rule evaluation and the admin Settings UI's row list.
const NAV_KEYS = [
  { key: 'feed',        icon: '⌂', label: 'My Feed' },
  { key: 'discover',    icon: '◉', label: 'Discover' },
  { key: 'groups',      icon: '☷', label: 'Groups' },
  { key: 'community',   icon: '🌍', label: 'Community' },
  { key: 'habits',      icon: '◈', label: 'Habits' },
  { key: 'jobs',        icon: '💼', label: 'Jobs' },
  { key: 'leaderboard', icon: '◎', label: 'Leaderboard' },
  { key: 'saved',       icon: '◇', label: 'Saved' },
  { key: 'refer',       icon: '🎉', label: 'Refer & Earn' },
]

async function getStoredRules() {
  const { rows } = await pool.query(`SELECT value FROM app_settings WHERE key = $1`, [SETTINGS_KEY])
  return rows[0]?.value || {}
}

// ── GET /nav-rules — public, which of the 9 items can the current viewer see ──
router.get('/nav-rules', optionalAuth, async (req, res) => {
  const stored = await getStoredRules()
  const result = {}
  for (const { key } of NAV_KEYS) {
    const rule = stored[key]
    result[key] = await isAudienceAllowed(rule?.allowed_audiences, rule?.custom_user_ids, req.profile)
  }
  res.json(result)
})

// ── GET /admin/nav-rules — admin, full config + metadata ─────────
adminRouter.get('/nav-rules', requireAuth, requirePermission('manage_settings'), async (req, res) => {
  const stored = await getStoredRules()
  const items = NAV_KEYS.map(({ key, icon, label }) => ({
    key, icon, label,
    allowed_audiences: stored[key]?.allowed_audiences || ['everyone'],
    custom_user_ids: stored[key]?.custom_user_ids || [],
  }))
  res.json({ items })
})

// ── PUT /admin/nav-rules — admin, save all rows at once ───────────
// body: { [navKey]: { allowed_audiences, custom_usernames } }
adminRouter.put('/nav-rules', requireAuth, requirePermission('manage_settings'), async (req, res) => {
  const stored = await getStoredRules()
  const validKeys = new Set(NAV_KEYS.map(n => n.key))

  for (const [navKey, rule] of Object.entries(req.body || {})) {
    if (!validKeys.has(navKey)) continue
    const allowed_audiences = Array.isArray(rule.allowed_audiences) && rule.allowed_audiences.length
      ? rule.allowed_audiences : ['everyone']
    let custom_user_ids = stored[navKey]?.custom_user_ids || []
    if (Array.isArray(rule.custom_usernames) && rule.custom_usernames.length) {
      const { rows } = await pool.query('SELECT id FROM profiles WHERE username = ANY($1)', [rule.custom_usernames])
      custom_user_ids = rows.map(r => r.id)
    }
    stored[navKey] = { allowed_audiences, custom_user_ids }
  }

  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
    [SETTINGS_KEY, JSON.stringify(stored)]
  )

  const items = NAV_KEYS.map(({ key, icon, label }) => ({
    key, icon, label,
    allowed_audiences: stored[key]?.allowed_audiences || ['everyone'],
    custom_user_ids: stored[key]?.custom_user_ids || [],
  }))
  res.json({ items })
})

module.exports = { publicRouter: router, adminRouter }
