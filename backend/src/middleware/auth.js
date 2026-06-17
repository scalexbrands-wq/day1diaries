const { CognitoJwtVerifier } = require('aws-jwt-verify')
const jwt = require('jsonwebtoken')
const { pool } = require('../db/pool')

// AUTH_PROVIDER=local switches token verification from Cognito to a
// simple HS256 JWT signed by backend/src/routes/auth.local.js — lets
// the API run fully offline for local dev (see README "Run locally").
const AUTH_PROVIDER = process.env.AUTH_PROVIDER || 'cognito'
const LOCAL_JWT_SECRET = process.env.LOCAL_JWT_SECRET || 'dev-only-insecure-secret'

const verifier = AUTH_PROVIDER === 'local'
  ? null
  : CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      tokenUse: 'access',
      clientId: process.env.COGNITO_CLIENT_ID,
    })

// Verifies the bearer token and returns { sub, email }, regardless of
// which provider issued it.
async function verifyAccessToken(token) {
  if (AUTH_PROVIDER === 'local') {
    const payload = jwt.verify(token, LOCAL_JWT_SECRET)
    return { sub: payload.sub, email: payload.email }
  }
  const payload = await verifier.verify(token)
  return { sub: payload.sub, email: payload.email || payload.username }
}

/**
 * requireAuth — verifies the access token from the
 * Authorization: Bearer <token> header and attaches req.user
 * (Cognito sub + profile row from Postgres).
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return res.status(401).json({ error: 'Missing Authorization header' })

    const { sub, email } = await verifyAccessToken(token)
    req.cognitoSub = sub
    req.cognitoEmail = email

    // Attach the profile row (if it exists yet)
    const { rows } = await pool.query('SELECT * FROM profiles WHERE id = $1', [sub])
    req.profile = rows[0] || null

    if (req.profile?.is_blocked) {
      return res.status(403).json({ error: 'Your account has been blocked. Please contact support.' })
    }

    next()
  } catch (err) {
    console.error('Auth error:', err.message)
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/**
 * optionalAuth — same as requireAuth but doesn't fail if no token present.
 * Useful for endpoints that work for both logged-in and anonymous users.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return next()

  try {
    const { sub, email } = await verifyAccessToken(token)
    req.cognitoSub = sub
    req.cognitoEmail = email
    const { rows } = await pool.query('SELECT * FROM profiles WHERE id = $1', [sub])
    req.profile = rows[0] || null
  } catch {
    // ignore invalid token for optional auth
  }
  next()
}

/**
 * requireRole — restricts to specific roles (e.g., 'admin', 'contributor')
 * Must be used after requireAuth.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.profile) return res.status(401).json({ error: 'Profile not found' })
    if (!roles.includes(req.profile.role)) {
      return res.status(403).json({ error: 'Forbidden — insufficient role' })
    }
    next()
  }
}

module.exports = { requireAuth, optionalAuth, requireRole }
