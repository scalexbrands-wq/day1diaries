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

// Mirrors routes/auth.js's isEmailVerificationRequired — reads the
// same admin-controlled app_settings row so toggling it in the admin
// Settings tab behaves the same in local dev as it does with Cognito.
async function isEmailVerificationRequired() {
  try {
    const { rows } = await pool.query(
      `SELECT value FROM app_settings WHERE key = 'email_verification_required'`
    )
    if (!rows.length) return true
    return rows[0].value === true || rows[0].value === 'true'
  } catch (err) {
    console.error('Settings lookup error:', err.message)
    return true
  }
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// ── POST /auth/signup ───────────────────────────────────────
// body: { email, password, username, fullName }
// Skips straight to a confirmed account unless an admin has turned
// on email_verification_required (Admin → Settings). There's no real
// email transport in local dev, so when verification IS required the
// "code" is printed to the backend console instead of emailed.
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

    const passwordHash = await bcrypt.hash(password, 10)
    const verificationRequired = await isEmailVerificationRequired()

    if (!verificationRequired) {
      const sub = crypto.randomUUID()
      await pool.query(
        `INSERT INTO profiles (id, username, full_name, email) VALUES ($1, $2, $3, $4)`,
        [sub, username, fullName || username, email]
      )
      await pool.query(
        `INSERT INTO local_credentials (profile_id, password_hash) VALUES ($1, $2)`,
        [sub, passwordHash]
      )
      return res.json({
        message: 'Account created successfully.',
        autoConfirmed: true,
        tokens: signTokens(sub, email),
      })
    }

    const code = generateCode()
    await pool.query(
      `INSERT INTO pending_signups (email, username, full_name, password_hash, code)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET username=$2, full_name=$3, password_hash=$4, code=$5, created_at=now()`,
      [email, username, fullName || username, passwordHash, code]
    )
    console.log(`[local-auth] verification code for ${email}: ${code}`)

    res.json({
      message: 'Signup successful. Check the backend console for your verification code (no real email in local dev).',
      autoConfirmed: false,
      username,
      fullName,
    })
  } catch (err) {
    console.error('Local signup error:', err)
    res.status(400).json({ error: err.message })
  }
})

// ── POST /auth/confirm ──────────────────────────────────────
// body: { email, code }
router.post('/confirm', async (req, res) => {
  const { email, code } = req.body
  try {
    const { rows } = await pool.query('SELECT * FROM pending_signups WHERE email = $1', [email])
    const pending = rows[0]
    if (!pending || pending.code !== code) {
      return res.status(400).json({ error: 'Invalid or expired verification code' })
    }

    const sub = crypto.randomUUID()
    await pool.query(
      `INSERT INTO profiles (id, username, full_name, email) VALUES ($1, $2, $3, $4)`,
      [sub, pending.username, pending.full_name, email]
    )
    await pool.query(
      `INSERT INTO local_credentials (profile_id, password_hash) VALUES ($1, $2)`,
      [sub, pending.password_hash]
    )
    await pool.query('DELETE FROM pending_signups WHERE email = $1', [email])

    res.json({
      message: 'Account confirmed and profile created',
      tokens: signTokens(sub, email),
    })
  } catch (err) {
    console.error('Local confirm error:', err)
    res.status(400).json({ error: err.message })
  }
})

// ── POST /auth/resend-code ──────────────────────────────────
router.post('/resend-code', async (req, res) => {
  const { email } = req.body
  const code = generateCode()
  const { rowCount } = await pool.query(
    'UPDATE pending_signups SET code = $1, created_at = now() WHERE email = $2',
    [code, email]
  )
  if (!rowCount) return res.status(404).json({ error: 'No pending signup for this email' })
  console.log(`[local-auth] resent verification code for ${email}: ${code}`)
  res.json({ message: 'Verification code resent (check the backend console in local dev)' })
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
  res.json({ emailVerificationRequired: await isEmailVerificationRequired() })
})

module.exports = router
