// ============================================================
// Local-dev auth routes — used instead of routes/auth.js when
// AUTH_PROVIDER=local (see backend/.env and README "Run locally").
//
// Same endpoint shapes as the Cognito version (so the frontend's
// src/lib/api.js needs no changes), but backed by a password hash
// stored in the local_credentials table (backend/local-auth-schema.sql)
// and self-signed JWTs instead of Cognito. There is no email
// verification step — accounts are auto-confirmed at signup.
//
// NOT for production use.
// ============================================================
const express = require('express')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { pool } = require('../db/pool')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
const JWT_SECRET = process.env.LOCAL_JWT_SECRET || 'dev-only-insecure-secret'
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 // 1 hour

function signTokens(sub, email) {
  const accessToken = jwt.sign({ sub, email }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SECONDS })
  return {
    accessToken,
    idToken: accessToken, // kept for shape-parity with the Cognito response
    refreshToken: jwt.sign({ sub, email, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' }),
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  }
}

// ── POST /auth/signup ───────────────────────────────────────
// body: { email, password, username, fullName }
// Auto-confirmed — no email verification step in local dev.
router.post('/signup', async (req, res) => {
  const { email, password, username, fullName } = req.body
  if (!email || !password || !username) {
    return res.status(400).json({ error: 'email, password, and username are required' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM profiles WHERE username = $1 OR email = $2',
      [username, email]
    )
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Username or email already taken' })
    }

    const sub = crypto.randomUUID()
    const passwordHash = await bcrypt.hash(password, 10)

    await pool.query(
      `INSERT INTO profiles (id, username, full_name, email) VALUES ($1, $2, $3, $4)`,
      [sub, username, fullName || username, email]
    )
    await pool.query(
      `INSERT INTO local_credentials (profile_id, password_hash) VALUES ($1, $2)`,
      [sub, passwordHash]
    )

    res.json({
      message: 'Account created successfully (local dev — auto-confirmed).',
      autoConfirmed: true,
      tokens: signTokens(sub, email),
    })
  } catch (err) {
    console.error('Local signup error:', err)
    res.status(400).json({ error: err.message })
  }
})

// ── POST /auth/confirm ──────────────────────────────────────
// No-op in local dev — accounts are auto-confirmed at signup.
router.post('/confirm', async (req, res) => {
  res.status(400).json({ error: 'Email confirmation is not used in local dev mode — accounts are auto-confirmed at signup.' })
})

// ── POST /auth/resend-code ──────────────────────────────────
router.post('/resend-code', async (req, res) => {
  res.status(400).json({ error: 'Email confirmation is not used in local dev mode.' })
})

// ── POST /auth/signin ───────────────────────────────────────
router.post('/signin', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })

  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.email, c.password_hash
       FROM profiles p JOIN local_credentials c ON c.profile_id = p.id
       WHERE p.email = $1`,
      [email]
    )
    const row = rows[0]
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    res.json({ tokens: signTokens(row.id, row.email) })
  } catch (err) {
    console.error('Local signin error:', err)
    res.status(401).json({ error: 'Invalid email or password' })
  }
})

// ── POST /auth/refresh ──────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET)
    if (payload.type !== 'refresh') throw new Error('Not a refresh token')
    res.json({ tokens: signTokens(payload.sub, payload.email) })
  } catch (err) {
    res.status(401).json({ error: 'Could not refresh session' })
  }
})

// ── POST /auth/signout ───────────────────────────────────────
// Stateless locally — nothing server-side to revoke.
router.post('/signout', requireAuth, async (req, res) => {
  res.json({ message: 'Signed out' })
})

// ── GET /auth/me ─────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  if (!req.profile) {
    const { rows } = await pool.query(
      `INSERT INTO profiles (id, username, full_name, email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING RETURNING *`,
      [req.cognitoSub, req.cognitoEmail.split('@')[0], req.cognitoEmail.split('@')[0], req.cognitoEmail]
    )
    return res.json({ profile: rows[0] })
  }
  res.json({ profile: req.profile })
})

// ── GET /auth/config ─────────────────────────────────────────
router.get('/config', async (req, res) => {
  res.json({ emailVerificationRequired: false })
})

module.exports = router
