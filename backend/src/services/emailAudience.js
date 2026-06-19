// ============================================================
// Email Audiences ("data source" picker) — Segment Builder
//
// Deliberately NOT a free-text SQL box: the spec wants non-technical
// admins, and a SQL textarea is both an injection/exfiltration risk
// and contradicts that goal. Instead we expose a fixed whitelist of
// safe, parameterized "sources". Filter *values* come from the admin
// UI and are always bound as query parameters ($1, $2, ...) — filter
// *keys/SQL shape* are hardcoded here, never built from user input.
// ============================================================

const { pool } = require('../db/pool')

const SOURCES = {
  all_users: {
    label: 'All Users',
    filters: [
      { key: 'role', label: 'Role', type: 'select', options: ['user', 'contributor', 'admin'] },
      { key: 'joined_within_days', label: 'Joined within last N days', type: 'number' },
    ],
    variables: ['name', 'email', 'username', 'level', 'score', 'coins'],
    build(filters) {
      return {
        text: `SELECT id AS user_id, email, full_name AS name, username, level, score, coins
               FROM profiles
               WHERE ($1::text IS NULL OR role = $1)
                 AND ($2::int IS NULL OR created_at >= now() - ($2::text || ' days')::interval)`,
        values: [filters.role || null, filters.joined_within_days || null],
      }
    },
  },
  story_authors: {
    label: 'Story Authors',
    filters: [
      { key: 'category', label: 'Story Category', type: 'text' },
      { key: 'since_days', label: 'Published within last N days', type: 'number' },
    ],
    variables: ['name', 'email', 'category', 'story_title'],
    build(filters) {
      return {
        text: `SELECT DISTINCT p.id AS user_id, p.email, p.full_name AS name, s.category, s.title AS story_title
               FROM stories s JOIN profiles p ON p.id = s.user_id
               WHERE s.status = 'published'
                 AND ($1::text IS NULL OR s.category = $1)
                 AND ($2::int IS NULL OR s.created_at >= now() - ($2::text || ' days')::interval)`,
        values: [filters.category || null, filters.since_days || null],
      }
    },
  },
  habit_adopters: {
    label: 'Habit Adopters',
    filters: [
      { key: 'habit_id', label: 'Habit', type: 'habit_select' },
    ],
    variables: ['name', 'email', 'habit_title', 'streak', 'current_day'],
    build(filters) {
      return {
        text: `SELECT p.id AS user_id, p.email, p.full_name AS name, h.title AS habit_title, uh.streak, uh.current_day
               FROM user_habits uh JOIN profiles p ON p.id = uh.user_id JOIN habits h ON h.id = uh.habit_id
               WHERE ($1::uuid IS NULL OR uh.habit_id = $1)`,
        values: [filters.habit_id || null],
      }
    },
  },
  habit_streak: {
    label: 'Habit Streak ≥ N',
    filters: [
      { key: 'min_streak', label: 'Minimum streak (days)', type: 'number', required: true },
      { key: 'habit_id', label: 'Habit (optional)', type: 'habit_select' },
    ],
    variables: ['name', 'email', 'habit_title', 'streak'],
    build(filters) {
      return {
        text: `SELECT p.id AS user_id, p.email, p.full_name AS name, h.title AS habit_title, uh.streak
               FROM user_habits uh JOIN profiles p ON p.id = uh.user_id JOIN habits h ON h.id = uh.habit_id
               WHERE uh.streak >= $1 AND ($2::uuid IS NULL OR uh.habit_id = $2)`,
        values: [filters.min_streak || 0, filters.habit_id || null],
      }
    },
  },
  challenge_participants: {
    label: 'Challenge Participants',
    filters: [
      { key: 'challenge_id', label: 'Challenge', type: 'challenge_select', required: true },
      { key: 'completed', label: 'Completed only', type: 'boolean' },
    ],
    variables: ['name', 'email', 'challenge_title', 'streak', 'points_earned'],
    build(filters) {
      return {
        text: `SELECT p.id AS user_id, p.email, p.full_name AS name, hc.title AS challenge_title, cp.streak, cp.points_earned
               FROM challenge_participations cp
               JOIN profiles p ON p.id = cp.user_id
               JOIN habit_challenges hc ON hc.id = cp.challenge_id
               WHERE cp.challenge_id = $1 AND ($2::boolean IS NULL OR cp.completed = $2)`,
        values: [filters.challenge_id, filters.completed ?? null],
      }
    },
  },
  event_registrants: {
    label: 'Event Registrants',
    filters: [
      { key: 'event_id', label: 'Event', type: 'event_select', required: true },
    ],
    variables: ['name', 'email', 'event_title', 'event_date'],
    build(filters) {
      return {
        text: `SELECT p.id AS user_id, p.email, p.full_name AS name, cu.title AS event_title, cu.event_date
               FROM event_registrations er
               JOIN profiles p ON p.id = er.user_id
               JOIN community_updates cu ON cu.id = er.event_id
               WHERE er.event_id = $1`,
        values: [filters.event_id],
      }
    },
  },
  certificate_recipients: {
    label: 'Certificate Recipients',
    filters: [
      { key: 'since_days', label: 'Issued within last N days', type: 'number' },
    ],
    variables: ['name', 'email', 'company_name', 'job_title'],
    build(filters) {
      return {
        text: `SELECT DISTINCT p.id AS user_id, p.email, p.full_name AS name, c.company_name, c.job_title
               FROM certificates c JOIN profiles p ON p.id::text = c.user_id
               WHERE ($1::int IS NULL OR c.created_at >= now() - ($1::text || ' days')::interval)`,
        values: [filters.since_days || null],
      }
    },
  },
  leaderboard_top_n: {
    label: 'Leaderboard (Top N by Score)',
    filters: [
      { key: 'top_n', label: 'Top N users', type: 'number', required: true },
      { key: 'min_score', label: 'Minimum score (optional)', type: 'number' },
    ],
    variables: ['name', 'email', 'username', 'level', 'score', 'coins', 'rank'],
    build(filters) {
      return {
        text: `SELECT id AS user_id, email, full_name AS name, username, level, score, coins,
                 ROW_NUMBER() OVER (ORDER BY score DESC) AS rank
               FROM profiles
               WHERE ($2::int IS NULL OR score >= $2)
               ORDER BY score DESC
               LIMIT $1`,
        values: [filters.top_n || 10, filters.min_score || null],
      }
    },
  },
  contact_inquirers: {
    label: 'Contact Form Inquirers',
    filters: [
      { key: 'status', label: 'Status', type: 'select', options: ['new', 'read', 'replied'] },
    ],
    variables: ['name', 'email', 'subject'],
    build(filters) {
      return {
        text: `SELECT NULL::text AS user_id, email, name, subject
               FROM contact_messages
               WHERE ($1::text IS NULL OR status = $1)`,
        values: [filters.status || null],
      }
    },
  },
}

function listSources() {
  return Object.entries(SOURCES).map(([id, s]) => ({
    id, label: s.label, filters: s.filters, variables: s.variables,
  }))
}

function resolveQuery(source, filters = {}) {
  const def = SOURCES[source]
  if (!def) throw Object.assign(new Error('Unknown audience source'), { status: 400 })
  for (const f of def.filters) {
    if (f.required && !filters[f.key]) {
      throw Object.assign(new Error(`Missing required filter: ${f.label}`), { status: 400 })
    }
  }
  return def.build(filters)
}

// Returns all matching recipient rows (deduped by email, dropping rows with no email).
async function resolveAudience(source, filters = {}) {
  const { text, values } = resolveQuery(source, filters)
  const { rows } = await pool.query(text, values)
  const seen = new Set()
  return rows.filter(r => {
    if (!r.email || seen.has(r.email)) return false
    seen.add(r.email)
    return true
  })
}

// Capped preview for the admin "Preview" button — full count + a small sample.
async function previewAudience(source, filters = {}, sampleLimit = 20) {
  const rows = await resolveAudience(source, filters)
  return { totalCount: rows.length, sample: rows.slice(0, sampleLimit) }
}

module.exports = { listSources, resolveAudience, previewAudience }
