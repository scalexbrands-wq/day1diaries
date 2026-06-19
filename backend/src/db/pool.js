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
    // landing_hero — admin-uploaded hero image(s) — slideshow of up to 3
    await pool.query(`ALTER TABLE landing_hero ADD COLUMN IF NOT EXISTS hero_image_url TEXT`)
    await pool.query(`ALTER TABLE landing_hero ADD COLUMN IF NOT EXISTS hero_image_urls JSONB DEFAULT '[]'`)
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
    // certificates — Story Contributor Certificate (PNG/PDF/social preview, issued per-story)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        certificate_number    TEXT UNIQUE NOT NULL,
        user_id               TEXT NOT NULL,
        story_id              UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        company_name          TEXT NOT NULL,
        job_title             TEXT NOT NULL,
        joining_date          DATE,
        industry              TEXT,
        location              TEXT,
        company_logo_url      TEXT,
        ai_insights           JSONB,
        impact_level          TEXT,
        snapshot              JSONB,
        certificate_image_url TEXT,
        certificate_pdf_url   TEXT,
        social_preview_url    TEXT,
        qr_target_url         TEXT,
        status                TEXT NOT NULL DEFAULT 'completed',
        issued_at             TIMESTAMPTZ DEFAULT now(),
        created_at            TIMESTAMPTZ DEFAULT now(),
        updated_at            TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_certificates_story ON certificates(story_id)`)

    // ── Email module (Template/Audience/Workflow/Send management via Brevo) ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name            TEXT NOT NULL,
        category        TEXT NOT NULL CHECK (category IN (
                          'welcome','story','habit','challenge','event',
                          'leaderboard','certificate','weekly_digest','monthly_digest','custom')),
        subject         TEXT NOT NULL,
        html_body       TEXT NOT NULL,
        preview_text    TEXT,
        variables       JSONB DEFAULT '[]',
        status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
        current_version INT NOT NULL DEFAULT 1,
        created_by      TEXT,
        created_at      TIMESTAMPTZ DEFAULT now(),
        updated_at      TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_template_versions (
        id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
        version     INT NOT NULL,
        subject     TEXT NOT NULL,
        html_body   TEXT NOT NULL,
        created_by  TEXT,
        created_at  TIMESTAMPTZ DEFAULT now(),
        UNIQUE (template_id, version)
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_audiences (
        id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT,
        source      TEXT NOT NULL CHECK (source IN (
                      'all_users','story_authors','habit_adopters','habit_streak',
                      'challenge_participants','event_registrants','certificate_recipients','contact_inquirers',
                      'leaderboard_top_n')),
        filters     JSONB DEFAULT '{}',
        created_by  TEXT,
        created_at  TIMESTAMPTZ DEFAULT now(),
        updated_at  TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_workflows (
        id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name            TEXT NOT NULL,
        template_id     UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
        audience_id     UUID NOT NULL REFERENCES email_audiences(id) ON DELETE CASCADE,
        schedule_type   TEXT NOT NULL CHECK (schedule_type IN ('immediate','one_time','recurring')),
        scheduled_at    TIMESTAMPTZ,
        cron_expression TEXT,
        timezone        TEXT DEFAULT 'Asia/Kolkata',
        status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
        next_run_at     TIMESTAMPTZ,
        last_run_at     TIMESTAMPTZ,
        created_by      TEXT,
        created_at      TIMESTAMPTZ DEFAULT now(),
        updated_at      TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_sends (
        id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        workflow_id      UUID REFERENCES email_workflows(id) ON DELETE SET NULL,
        template_id      UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
        template_version INT,
        trigger_type     TEXT NOT NULL CHECK (trigger_type IN ('manual_test','manual_send_now','scheduled','recurring')),
        status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','partial')),
        total_recipients INT DEFAULT 0,
        sent_count       INT DEFAULT 0,
        failed_count     INT DEFAULT 0,
        started_at       TIMESTAMPTZ,
        completed_at     TIMESTAMPTZ,
        triggered_by     TEXT,
        error            TEXT,
        created_at       TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_recipients (
        id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        send_id          UUID NOT NULL REFERENCES email_sends(id) ON DELETE CASCADE,
        user_id          TEXT,
        email            TEXT NOT NULL,
        name             TEXT,
        variables        JSONB DEFAULT '{}',
        status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
        brevo_message_id TEXT,
        error            TEXT,
        sent_at          TIMESTAMPTZ
      )
    `)
    // Widen the source CHECK for tables created before 'leaderboard_top_n' existed.
    await pool.query(`ALTER TABLE email_audiences DROP CONSTRAINT IF EXISTS email_audiences_source_check`)
    await pool.query(`
      ALTER TABLE email_audiences ADD CONSTRAINT email_audiences_source_check CHECK (source IN (
        'all_users','story_authors','habit_adopters','habit_streak',
        'challenge_participants','event_registrants','certificate_recipients','contact_inquirers',
        'leaderboard_top_n'))
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_workflows_due ON email_workflows(status, next_run_at)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_recipients_send ON email_recipients(send_id, status)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_sends_workflow ON email_sends(workflow_id, created_at DESC)`)

    console.log('DB schema init OK')
  } catch (err) {
    console.error('DB init error (non-fatal):', err.message)
  }
}

module.exports = { pool, initDB }
