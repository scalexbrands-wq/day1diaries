const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
})

pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err)
})

async function initDB() {
  try {
    // story_views — deduplicated read tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS story_views (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        story_id UUID NOT NULL,
        viewed_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, story_id)
      )
    `)
    // story_unlocks — coins spent to read private-account stories
    await pool.query(`
      CREATE TABLE IF NOT EXISTS story_unlocks (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        story_id UUID NOT NULL,
        coins_spent INT NOT NULL DEFAULT 10,
        unlocked_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, story_id)
      )
    `)
    // profiles extra columns
    await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stories_read INT DEFAULT 0`)
    await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_date DATE`)
    await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS score INT DEFAULT 0`)
    await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coins INT DEFAULT 0`)
    await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false`)
    await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT`)
    await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_welcome_sent_at TIMESTAMPTZ`)
    await pool.query(`ALTER TABLE pending_signups ADD COLUMN IF NOT EXISTS phone TEXT`).catch(() => {})
    await pool.query(`ALTER TABLE stories ADD COLUMN IF NOT EXISTS flag_reason TEXT`)
    // job_applications user tracking columns
    await pool.query(`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS user_id TEXT`)
    await pool.query(`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS user_status TEXT NOT NULL DEFAULT 'applied'`)
    await pool.query(`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS user_notes TEXT`)
    await pool.query(`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS custom_status TEXT`)
    // announcements
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        title      TEXT NOT NULL,
        message    TEXT NOT NULL,
        emoji      TEXT DEFAULT '📢',
        bg_color   TEXT DEFAULT '#FF6B2B',
        is_active  BOOLEAN DEFAULT true,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcement_reads (
        id               BIGSERIAL PRIMARY KEY,
        user_id          TEXT NOT NULL,
        announcement_id  UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
        read_at          TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, announcement_id)
      )
    `)
    // topic_follows — user follows of story categories and job departments ("companies")
    await pool.query(`
      CREATE TABLE IF NOT EXISTS topic_follows (
        id          BIGSERIAL PRIMARY KEY,
        user_id     TEXT NOT NULL,
        topic_type  TEXT NOT NULL CHECK (topic_type IN ('category','department')),
        topic_value TEXT NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, topic_type, topic_value)
      )
    `)
    console.log('DB schema init OK')
  } catch (err) {
    console.error('DB init error (non-fatal):', err.message)
  }
}

module.exports = { pool, initDB }
