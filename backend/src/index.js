// Loads backend/.env for local dev. In ECS, real env vars are injected
// via the task definition/Secrets Manager and no .env file exists, so
// this is a harmless no-op in production.
require('dotenv').config()

const express = require('express')
// Patches Express so a rejected promise / thrown error inside an async
// route handler reaches the error-handling middleware below via
// next(err), instead of becoming an unhandled rejection that crashes
// the whole process (and takes down the API for every user). Must be
// required after express, before any router is created.
require('express-async-errors')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')

// AUTH_PROVIDER=local swaps in self-signed JWTs + a local password
// table instead of Cognito — see backend/src/routes/auth.local.js
// and README "Run locally".
const { initDB } = require('./db/pool')
initDB()

const authRoutes = process.env.AUTH_PROVIDER === 'local'
  ? require('./routes/auth.local')
  : require('./routes/auth')
const profileRoutes = require('./routes/profiles')
const storyRoutes = require('./routes/stories')
const socialRoutes = require('./routes/social')
const habitRoutes = require('./routes/habits')
const communityRoutes = require('./routes/community')
const adminRoutes = require('./routes/admin')
const landingRoutes = require('./routes/landing')
const { publicRouter: pagesPublicRoutes, adminRouter: pagesAdminRoutes } = require('./routes/pages')
const announcementRoutes = require('./routes/announcements')

const app = express()
const PORT = process.env.PORT || 4000

// ── CORS ─────────────────────────────────────────────────────
// CORS_ORIGIN can be a comma-separated list, e.g.:
//   "https://www.day1diaries.com,https://day1diaries.com,https://d1kxji3yv78nbx.cloudfront.net"
// If unset, defaults to allowing all origins WITHOUT credentials
// (browsers reject "*" + credentials:true together).
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

// ── CORS must come BEFORE helmet ─────────────────────────────
// helmet's crossOriginResourcePolicy defaults to "same-origin" which
// blocks cross-origin fetches — we disable it since our API is public.
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, server-to-server, health checks)
    if (!origin) return callback(null, true)
    if (allowedOrigins.length === 0) return callback(null, true) // no restriction configured
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`Not allowed by CORS: ${origin}`))
  },
  credentials: true,
}))

// Explicitly handle OPTIONS preflight for all routes
app.options('*', cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.length === 0) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`Not allowed by CORS: ${origin}`))
  },
  credentials: true,
}))

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow cross-origin API calls
  contentSecurityPolicy: false, // disable CSP — this is an API, not a browser page
}))
app.use(express.json({ limit: '2mb' }))
app.use(morgan('combined'))

// ── Health check (used by ALB target group) ──────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ── Routes ────────────────────────────────────────────────────
app.use('/auth', authRoutes)
app.use('/profiles', profileRoutes)
app.use('/stories', storyRoutes)
app.use('/social', socialRoutes)
app.use('/habits', habitRoutes)
app.use('/community', communityRoutes)
app.use('/admin', adminRoutes)
app.use('/landing', landingRoutes)
app.use('/pages', pagesPublicRoutes)
app.use('/admin/pages', pagesAdminRoutes)
app.use('/announcements', announcementRoutes)

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }))

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Day1 Diaries API listening on port ${PORT}`)
})
