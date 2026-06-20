// ============================================================
// Feature Access Control Engine — gates free vs. premium-member
// usage across Stories/Habits/Challenges/Jobs/Community/Certificates,
// fully driven by the admin-configurable `feature_access_rules` table
// (no hardcoded limits in code).
// ============================================================

const { pool } = require('../db/pool')

function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function periodKeyFor(resetFrequency, now = new Date()) {
  switch (resetFrequency) {
    case 'daily': return now.toISOString().slice(0, 10)
    case 'weekly': return isoWeekKey(now)
    case 'monthly': return now.toISOString().slice(0, 7)
    case 'yearly': return String(now.getFullYear())
    default: return 'total'
  }
}

// Master kill-switch — when the admin turns the whole Membership module
// off, free-tier restrictions stop being enforced entirely (no point
// blocking users from a program that isn't currently running, with no
// way for them to apply since the page/nav is hidden too).
async function isModuleEnabled() {
  const { rows } = await pool.query(`SELECT value FROM app_settings WHERE key = 'membership.module_enabled'`)
  return rows.length === 0 ? true : rows[0].value !== false
}

async function hasActiveMembership(userId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM memberships WHERE user_id = $1 AND status = 'active' AND (end_date IS NULL OR end_date >= CURRENT_DATE) LIMIT 1`,
    [userId]
  )
  return rows.length > 0
}

// Returns { allowed, remaining, reason, isPremium }. Anonymous (no userId)
// is always allowed and untracked — gating only applies to logged-in users.
async function checkAndConsume(userId, featureKey) {
  if (!userId) return { allowed: true, remaining: null, reason: 'anonymous', isPremium: false }
  if (!(await isModuleEnabled())) return { allowed: true, remaining: null, reason: 'module_disabled', isPremium: false }

  const { rows: ruleRows } = await pool.query('SELECT * FROM feature_access_rules WHERE feature_key = $1', [featureKey])
  const rule = ruleRows[0]
  if (!rule || !rule.is_active) {
    return { allowed: true, remaining: null, reason: 'unrestricted', isPremium: false }
  }

  const isPremium = await hasActiveMembership(userId)
  const limit = isPremium ? rule.member_limit : rule.free_limit

  if (limit === -1) {
    return { allowed: true, remaining: -1, reason: 'unlimited', isPremium }
  }
  if (limit === 0) {
    return { allowed: false, remaining: 0, reason: 'Upgrade to a premium membership to access this feature.', isPremium }
  }

  const periodKey = periodKeyFor(rule.reset_frequency)
  const { rows: usageRows } = await pool.query(
    'SELECT usage_count FROM feature_usage WHERE user_id = $1 AND feature_key = $2 AND period_key = $3',
    [userId, featureKey, periodKey]
  )
  const currentCount = usageRows[0]?.usage_count || 0
  if (currentCount >= limit) {
    return { allowed: false, remaining: 0, reason: `You've reached your ${isPremium ? 'member' : 'free'} limit for this feature.`, isPremium }
  }

  const { rows: updated } = await pool.query(
    `INSERT INTO feature_usage (user_id, feature_key, period_key, usage_count, last_used_at)
     VALUES ($1,$2,$3,1,now())
     ON CONFLICT (user_id, feature_key, period_key) DO UPDATE SET usage_count = feature_usage.usage_count + 1, last_used_at = now()
     RETURNING usage_count`,
    [userId, featureKey, periodKey]
  )
  return { allowed: true, remaining: Math.max(limit - updated[0].usage_count, 0), reason: 'ok', isPremium }
}

// Express middleware factory. Applies only to logged-in users — req.profile
// must already be populated by requireAuth/optionalAuth upstream.
function requireFeatureAccess(featureKey) {
  return async (req, res, next) => {
    const userId = req.cognitoSub || req.profile?.id
    const result = await checkAndConsume(userId, featureKey)
    if (!result.allowed) {
      return res.status(403).json({ error: result.reason, feature: featureKey, remaining: 0 })
    }
    req.accessResult = result
    next()
  }
}

// Read-only check (no usage consumed) — for showing remaining limits in the UI.
async function peekUsage(userId, featureKey) {
  if (!(await isModuleEnabled())) return { limit: -1, used: 0, remaining: -1 }

  const { rows: ruleRows } = await pool.query('SELECT * FROM feature_access_rules WHERE feature_key = $1', [featureKey])
  const rule = ruleRows[0]
  if (!rule || !rule.is_active) return { limit: -1, used: 0, remaining: -1 }

  const isPremium = await hasActiveMembership(userId)
  const limit = isPremium ? rule.member_limit : rule.free_limit
  if (limit === -1) return { limit: -1, used: 0, remaining: -1 }
  if (limit === 0) return { limit: 0, used: 0, remaining: 0 }

  const periodKey = periodKeyFor(rule.reset_frequency)
  const { rows } = await pool.query(
    'SELECT usage_count FROM feature_usage WHERE user_id = $1 AND feature_key = $2 AND period_key = $3',
    [userId, featureKey, periodKey]
  )
  const used = rows[0]?.usage_count || 0
  return { limit, used, remaining: Math.max(limit - used, 0) }
}

module.exports = { checkAndConsume, requireFeatureAccess, peekUsage, hasActiveMembership, periodKeyFor, isModuleEnabled }
