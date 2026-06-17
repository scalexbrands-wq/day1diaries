const express = require('express')
const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  ConfirmSignUpCommand,
  AdminConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  GlobalSignOutCommand,
} = require('@aws-sdk/client-cognito-identity-provider')
const { pool } = require('../db/pool')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION })
const CLIENT_ID = process.env.COGNITO_CLIENT_ID
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID

// Reads the email_verification_required setting (defaults to true if missing/unset)
async function isEmailVerificationRequired() {
  try {
    const { rows } = await pool.query(
      `SELECT value FROM app_settings WHERE key = 'email_verification_required'`
    )
    if (!rows.length) return true
    return rows[0].value === true || rows[0].value === 'true'
  } catch (err) {
    console.error('Settings lookup error:', err.message)
    return true // fail safe — require verification if settings can't be read
  }
}

// ── POST /auth/signup ───────────────────────────────────────
// body: { email, password, username, fullName }
router.post('/signup', async (req, res) => {
  const { email, password, username, fullName } = req.body
  if (!email || !password || !username) {
    return res.status(400).json({ error: 'email, password, and username are required' })
  }

  try {
    // Check username uniqueness in our DB first
    const existing = await pool.query('SELECT id FROM profiles WHERE username = $1', [username])
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Username already taken' })
    }

    const result = await client.send(new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'preferred_username', Value: username },
      ],
    }))

    const verificationRequired = await isEmailVerificationRequired()

    if (!verificationRequired) {
      // Auto-confirm the user, create the profile, and sign them in immediately —
      // no email code step needed.
      await client.send(new AdminConfirmSignUpCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
      }))

      const authResult = await client.send(new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: { USERNAME: email, PASSWORD: password },
      }))

      const idToken = authResult.AuthenticationResult.IdToken
      const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString())
      const sub = payload.sub

      await pool.query(
        `INSERT INTO profiles (id, username, full_name, email)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [sub, username, fullName || username, email]
      )

      // Daily login bonus on first login
      await pool.query(
        `UPDATE profiles
         SET score = score + 10, coins = coins + 10, last_login_date = CURRENT_DATE
         WHERE id = $1 AND (last_login_date IS NULL OR last_login_date < CURRENT_DATE)`,
        [sub]
      )

      return res.json({
        message: 'Account created successfully.',
        autoConfirmed: true,
        tokens: {
          accessToken: authResult.AuthenticationResult.AccessToken,
          idToken: authResult.AuthenticationResult.IdToken,
          refreshToken: authResult.AuthenticationResult.RefreshToken,
          expiresIn: authResult.AuthenticationResult.ExpiresIn,
        },
      })
    }

    // Note: profile row is created after email confirmation (see /confirm)
    res.json({
      message: 'Signup successful. Please check your email for a verification code.',
      autoConfirmed: false,
      userSub: result.UserSub,
      username,
      fullName,
    })
  } catch (err) {
    console.error('Signup error:', err)
    res.status(400).json({ error: err.message })
  }
})

// ── POST /auth/confirm ──────────────────────────────────────
// body: { email, code, username, fullName }
router.post('/confirm', async (req, res) => {
  const { email, code, username, fullName } = req.body
  try {
    await client.send(new ConfirmSignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
    }))

    // Now sign in to get the Cognito sub, then create the profile row
    const authResult = await client.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: req.body.password },
    }))

    // Decode the id token to get the sub (without verification — we just confirmed it)
    const idToken = authResult.AuthenticationResult.IdToken
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString())
    const sub = payload.sub

    await pool.query(
      `INSERT INTO profiles (id, username, full_name, email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [sub, username, fullName || username, email]
    )

    res.json({
      message: 'Account confirmed and profile created',
      tokens: {
        accessToken: authResult.AuthenticationResult.AccessToken,
        idToken: authResult.AuthenticationResult.IdToken,
        refreshToken: authResult.AuthenticationResult.RefreshToken,
        expiresIn: authResult.AuthenticationResult.ExpiresIn,
      },
    })
  } catch (err) {
    console.error('Confirm error:', err)
    res.status(400).json({ error: err.message })
  }
})

// ── POST /auth/resend-code ──────────────────────────────────
router.post('/resend-code', async (req, res) => {
  const { email } = req.body
  try {
    await client.send(new ResendConfirmationCodeCommand({ ClientId: CLIENT_ID, Username: email }))
    res.json({ message: 'Verification code resent' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── POST /auth/signin ───────────────────────────────────────
// body: { email, password }
router.post('/signin', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })

  try {
    const result = await client.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }))

    // Daily login bonus: +10 score + coins if user hasn't logged in today
    try {
      const payload = JSON.parse(Buffer.from(result.AuthenticationResult.IdToken.split('.')[1], 'base64').toString())
      await pool.query(
        `UPDATE profiles
         SET score = score + 10, coins = coins + 10, last_login_date = CURRENT_DATE
         WHERE id = $1 AND (last_login_date IS NULL OR last_login_date < CURRENT_DATE)`,
        [payload.sub]
      )
    } catch (bonusErr) {
      console.error('Daily login bonus error (non-fatal):', bonusErr.message)
    }

    res.json({
      tokens: {
        accessToken: result.AuthenticationResult.AccessToken,
        idToken: result.AuthenticationResult.IdToken,
        refreshToken: result.AuthenticationResult.RefreshToken,
        expiresIn: result.AuthenticationResult.ExpiresIn,
      },
    })
  } catch (err) {
    console.error('Signin error:', err)
    if (err.name === 'UserNotConfirmedException') {
      return res.status(403).json({ error: 'Account not confirmed. Please verify your email.', code: 'UNCONFIRMED' })
    }
    res.status(401).json({ error: 'Invalid email or password' })
  }
})

// ── POST /auth/refresh ──────────────────────────────────────
// body: { refreshToken }
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  try {
    const result = await client.send(new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: { REFRESH_TOKEN: refreshToken },
    }))
    res.json({
      tokens: {
        accessToken: result.AuthenticationResult.AccessToken,
        idToken: result.AuthenticationResult.IdToken,
        expiresIn: result.AuthenticationResult.ExpiresIn,
      },
    })
  } catch (err) {
    res.status(401).json({ error: 'Could not refresh session' })
  }
})

// ── POST /auth/signout ──────────────────────────────────────
router.post('/signout', requireAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.slice(7)
    await client.send(new GlobalSignOutCommand({ AccessToken: token }))
    res.json({ message: 'Signed out' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── GET /auth/me ─────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  if (!req.profile) {
    // Profile doesn't exist yet — create it from token claims (edge case)
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
// Public endpoint — lets the frontend know whether the email
// verification step should be shown during registration.
router.get('/config', async (req, res) => {
  const required = await isEmailVerificationRequired()
  res.json({ emailVerificationRequired: required })
})

module.exports = router
