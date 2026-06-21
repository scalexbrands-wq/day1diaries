const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, optionalAuth, requirePermission } = require('../middleware/auth')
const { hasActiveMembership } = require('../services/accessControl')

const router = express.Router()
const adminRouter = express.Router()

const VALID_AUDIENCES = ['everyone', 'member', 'free', 'contributor', 'admin', 'custom']

// Same shape as gift.js/ads.js's isAudienceAllowed — 'everyone' (or an
// empty list) means unrestricted. Otherwise checks membership tier,
// role, or the group's hand-picked custom_user_ids.
async function isGroupAudienceAllowed(group, profile) {
  const audiences = Array.isArray(group.allowed_audiences) ? group.allowed_audiences : ['everyone']
  if (audiences.length === 0 || audiences.includes('everyone')) return true
  if (!profile) return false
  if (audiences.includes(profile.role)) return true
  if (audiences.includes('member') && await hasActiveMembership(profile.id)) return true
  if (audiences.includes('free') && !(await hasActiveMembership(profile.id))) return true
  if (audiences.includes('custom')) {
    const customIds = Array.isArray(group.custom_user_ids) ? group.custom_user_ids : []
    if (customIds.includes(profile.id)) return true
  }
  return false
}

function normalizeAudiences(input) {
  if (!Array.isArray(input) || input.length === 0) return ['everyone']
  const cleaned = input.filter(a => VALID_AUDIENCES.includes(a))
  return cleaned.length ? cleaned : ['everyone']
}

// Resolves a list of usernames to profile ids for the custom audience —
// unknown usernames are silently skipped rather than erroring the whole
// create/update, since this mirrors the lightweight "type a username"
// pattern already used by /invite, not a validated multi-select.
async function resolveCustomUserIds(usernames) {
  if (!Array.isArray(usernames) || usernames.length === 0) return []
  const { rows } = await pool.query('SELECT id FROM profiles WHERE username = ANY($1)', [usernames])
  return rows.map(r => r.id)
}

// Generates a URL-safe slug from a name, ensuring uniqueness against groups
async function generateSlug(name) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'group'

  let slug = base
  let suffix = 1
  while (true) {
    const { rows } = await pool.query('SELECT id FROM groups WHERE slug = $1', [slug])
    if (!rows.length) return slug
    slug = `${base}-${suffix++}`
  }
}

async function getMembership(groupId, userId) {
  if (!userId) return null
  const { rows } = await pool.query(
    'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  )
  return rows[0]?.role || null
}

// ── GET /groups — list public groups, paginate, filter by topic_category ──
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 0
  const limit = parseInt(req.query.limit) || 20
  const { topic_category, search } = req.query

  const conditions = [`visibility = 'public'`]
  const params = []
  let i = 1
  if (topic_category) { conditions.push(`topic_category = $${i++}`); params.push(topic_category) }
  if (search) { conditions.push(`name ILIKE $${i++}`); params.push(`%${search}%`) }
  params.push(limit, page * limit)

  const { rows } = await pool.query(
    `SELECT * FROM groups WHERE ${conditions.join(' AND ')}
     ORDER BY member_count DESC, created_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    params
  )
  res.json({ groups: rows })
})

// ── GET /groups/mine — groups the current user belongs to (for the
// WriteStory "Post to a group" dropdown). Must be before /:slug.
router.get('/mine', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT g.*, gm.role AS my_role FROM groups g
     JOIN group_members gm ON gm.group_id = g.id
     WHERE gm.user_id = $1
     ORDER BY g.name`,
    [req.cognitoSub]
  )
  res.json({ groups: rows })
})

// ── GET /groups/invites/mine — pending invites for the current user ──
router.get('/invites/mine', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT gi.*, g.name AS group_name, g.slug AS group_slug,
            json_build_object('id', p.id, 'username', p.username, 'full_name', p.full_name) AS invited_by_profile
     FROM group_invites gi
     JOIN groups g ON g.id = gi.group_id
     JOIN profiles p ON p.id = gi.invited_by
     WHERE gi.invited_user_id = $1 AND gi.status = 'pending'
     ORDER BY gi.created_at DESC`,
    [req.cognitoSub]
  )
  res.json({ invites: rows })
})

// ── GET /groups/:slug — group detail. 404 (not 403) if the viewer isn't
// a member and doesn't match the group's allowed_audiences, so a
// restricted group's existence isn't confirmed to outsiders. ──
router.get('/:slug', optionalAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM groups WHERE slug = $1', [req.params.slug])
  if (!rows.length) return res.status(404).json({ error: 'Group not found' })
  const group = rows[0]

  const myRole = await getMembership(group.id, req.cognitoSub)
  if (!myRole && !(await isGroupAudienceAllowed(group, req.profile))) {
    return res.status(404).json({ error: 'Group not found' })
  }
  res.json({ group, myRole })
})

// ── POST /groups — create a group (any authenticated user); creator
// becomes the owner and first member. Visibility follows the same
// audience-targeting model as the gift module: allowed_audiences=
// ['everyone'] is a fully public group; anything else gates viewing/
// joining by membership tier, role, or a hand-picked custom user list. ──
router.post('/', requireAuth, async (req, res) => {
  const { name, description, topic_category, cover_image_url, allowed_audiences, custom_usernames } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
  const slug = await generateSlug(name)

  const audiences = normalizeAudiences(allowed_audiences)
  const visibility = audiences.includes('everyone') ? 'public' : 'private'
  const customUserIds = audiences.includes('custom') ? await resolveCustomUserIds(custom_usernames) : []

  const { rows } = await pool.query(
    `INSERT INTO groups (name, slug, description, topic_category, visibility, owner_id, cover_image_url, member_count, allowed_audiences, custom_user_ids)
     VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,$9) RETURNING *`,
    [name.trim(), slug, description || null, topic_category || null, visibility, req.cognitoSub, cover_image_url || null, JSON.stringify(audiences), JSON.stringify(customUserIds)]
  )
  const group = rows[0]
  await pool.query(
    `INSERT INTO group_members (group_id, user_id, role) VALUES ($1,$2,'owner')`,
    [group.id, req.cognitoSub]
  )
  res.status(201).json({ group })
})

// ── PATCH /groups/:id — owner/moderator updates audience targeting ──
router.patch('/:id', requireAuth, async (req, res) => {
  const myRole = await getMembership(req.params.id, req.cognitoSub)
  if (!['owner', 'moderator'].includes(myRole)) {
    return res.status(403).json({ error: 'Only the group owner or a moderator can edit this group' })
  }
  const { name, description, topic_category, allowed_audiences, custom_usernames } = req.body
  const audiences = normalizeAudiences(allowed_audiences)
  const visibility = audiences.includes('everyone') ? 'public' : 'private'
  const customUserIds = audiences.includes('custom') ? await resolveCustomUserIds(custom_usernames) : []

  const { rows } = await pool.query(
    `UPDATE groups SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       topic_category = COALESCE($3, topic_category),
       allowed_audiences = $4,
       custom_user_ids = $5,
       visibility = $6
     WHERE id = $7 RETURNING *`,
    [name?.trim() || null, description ?? null, topic_category ?? null, JSON.stringify(audiences), JSON.stringify(customUserIds), visibility, req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Group not found' })
  res.json({ group: rows[0] })
})

// ── POST /groups/:id/join — instant for anyone matching the group's
// allowed_audiences (gift-style audience targeting). Otherwise falls
// back to an already-accepted one-off invite (the invite system below
// still works as a manual override regardless of audience config). ──
router.post('/:id/join', requireAuth, async (req, res) => {
  const { rows: groupRows } = await pool.query('SELECT * FROM groups WHERE id = $1', [req.params.id])
  if (!groupRows.length) return res.status(404).json({ error: 'Group not found' })
  const group = groupRows[0]

  const existingRole = await getMembership(group.id, req.cognitoSub)
  if (existingRole) return res.json({ joined: true, alreadyMember: true })

  const audienceAllowed = await isGroupAudienceAllowed(group, req.profile)
  if (!audienceAllowed) {
    const { rows: inviteRows } = await pool.query(
      `SELECT id FROM group_invites WHERE group_id = $1 AND invited_user_id = $2 AND status = 'accepted'`,
      [group.id, req.cognitoSub]
    )
    if (!inviteRows.length) {
      return res.status(403).json({ error: "You don't have access to join this group." })
    }
  }

  await pool.query(`INSERT INTO group_members (group_id, user_id, role) VALUES ($1,$2,'member')`, [group.id, req.cognitoSub])
  await pool.query('UPDATE groups SET member_count = member_count + 1 WHERE id = $1', [group.id])
  res.json({ joined: true, alreadyMember: false })
})

// ── POST /groups/:id/invite — owner/moderator invites a user by username ──
router.post('/:id/invite', requireAuth, async (req, res) => {
  const { username } = req.body
  if (!username?.trim()) return res.status(400).json({ error: 'username is required' })

  const myRole = await getMembership(req.params.id, req.cognitoSub)
  if (!['owner', 'moderator'].includes(myRole)) {
    return res.status(403).json({ error: 'Only the group owner or a moderator can send invites' })
  }

  const { rows: userRows } = await pool.query('SELECT id FROM profiles WHERE username = $1', [username.trim()])
  if (!userRows.length) return res.status(404).json({ error: 'User not found' })
  const invitedUserId = userRows[0].id

  const existingRole = await getMembership(req.params.id, invitedUserId)
  if (existingRole) return res.status(400).json({ error: 'That user is already a member' })

  const { rows } = await pool.query(
    `INSERT INTO group_invites (group_id, invited_user_id, invited_by, status)
     VALUES ($1,$2,$3,'pending')
     ON CONFLICT (group_id, invited_user_id) DO UPDATE SET status = 'pending', invited_by = $3, created_at = now()
     RETURNING *`,
    [req.params.id, invitedUserId, req.cognitoSub]
  )
  res.status(201).json({ invite: rows[0] })
})

// ── POST /groups/invites/:id/respond — invited user accepts/declines ──
// body: { action: 'accept' | 'decline' }
router.post('/invites/:id/respond', requireAuth, async (req, res) => {
  const { action } = req.body
  if (!['accept', 'decline'].includes(action)) return res.status(400).json({ error: 'action must be "accept" or "decline"' })

  const { rows: inviteRows } = await pool.query(
    'SELECT * FROM group_invites WHERE id = $1 AND invited_user_id = $2',
    [req.params.id, req.cognitoSub]
  )
  if (!inviteRows.length) return res.status(404).json({ error: 'Invite not found' })
  const invite = inviteRows[0]
  if (invite.status !== 'pending') return res.status(400).json({ error: 'This invite has already been responded to' })

  const newStatus = action === 'accept' ? 'accepted' : 'declined'
  const { rows } = await pool.query(
    'UPDATE group_invites SET status = $1 WHERE id = $2 RETURNING *',
    [newStatus, req.params.id]
  )

  if (action === 'accept') {
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role) VALUES ($1,$2,'member') ON CONFLICT (group_id, user_id) DO NOTHING`,
      [invite.group_id, req.cognitoSub]
    )
    await pool.query('UPDATE groups SET member_count = member_count + 1 WHERE id = $1', [invite.group_id])
  }
  res.json({ invite: rows[0] })
})

// ── GET /groups/:id/stories — stories in this group. Group membership
// is an ADDITIONAL gate on top of each story's own visibility, never a
// bypass: public stories always show, followers_only only to followers,
// private only to the author. ──
router.get('/:id/stories', optionalAuth, async (req, res) => {
  const { rows: groupRows } = await pool.query('SELECT * FROM groups WHERE id = $1', [req.params.id])
  if (!groupRows.length) return res.status(404).json({ error: 'Group not found' })
  const group = groupRows[0]

  const myRole = await getMembership(group.id, req.cognitoSub)
  if (!myRole && !(await isGroupAudienceAllowed(group, req.profile))) {
    return res.status(404).json({ error: 'Group not found' })
  }

  const page = parseInt(req.query.page) || 0
  const limit = parseInt(req.query.limit) || 10

  let followingIds = []
  if (req.cognitoSub) {
    const { rows: f } = await pool.query('SELECT following_id FROM follows WHERE follower_id = $1', [req.cognitoSub])
    followingIds = f.map(r => r.following_id)
  }

  const { rows } = await pool.query(
    `SELECT s.*, json_build_object(
        'id', p.id, 'username', p.username, 'full_name', p.full_name,
        'avatar_url', p.avatar_url, 'level', p.level, 'is_private', p.is_private
      ) AS profiles
     FROM stories s JOIN profiles p ON p.id = s.user_id
     WHERE s.group_id = $1 AND s.status = 'published'
       AND (
         s.visibility = 'public'
         OR s.user_id = $2
         OR (s.visibility = 'followers_only' AND s.user_id = ANY($3))
       )
     ORDER BY s.created_at DESC
     LIMIT $4 OFFSET $5`,
    [group.id, req.cognitoSub || null, followingIds, limit, page * limit]
  )
  res.json({ stories: rows })
})

// ── DELETE /groups/:id/members/me — leave the group ──
router.delete('/:id/members/me', requireAuth, async (req, res) => {
  const myRole = await getMembership(req.params.id, req.cognitoSub)
  if (!myRole) return res.status(404).json({ error: 'You are not a member of this group' })
  if (myRole === 'owner') {
    return res.status(400).json({ error: "The owner can't leave their own group — archive it via admin instead." })
  }
  await pool.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [req.params.id, req.cognitoSub])
  await pool.query('UPDATE groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

// ════════════════════════════════════════════════════════════
// ADMIN — moderation (mounted at /admin/groups)
// ════════════════════════════════════════════════════════════

// ── GET /admin/groups — list every group, for moderation ──
adminRouter.get('/', requireAuth, requirePermission('moderate_content'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT g.*, json_build_object('id', p.id, 'username', p.username, 'full_name', p.full_name) AS owner
     FROM groups g JOIN profiles p ON p.id = g.owner_id
     ORDER BY g.created_at DESC`
  )
  res.json({ groups: rows })
})

// ── DELETE /admin/groups/:id — admin takedown ──
adminRouter.delete('/:id', requireAuth, requirePermission('moderate_content'), async (req, res) => {
  await pool.query('DELETE FROM groups WHERE id = $1', [req.params.id])
  res.json({ success: true })
})

module.exports = { publicRouter: router, adminRouter }
