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
    await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url TEXT`)
    await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gift_unlimited_sending BOOLEAN DEFAULT false`)
    await pool.query(`ALTER TABLE pending_signups ADD COLUMN IF NOT EXISTS phone TEXT`).catch(() => {})
    await pool.query(`ALTER TABLE stories ADD COLUMN IF NOT EXISTS flag_reason TEXT`)
    // landing_hero — admin-uploaded hero image(s) — slideshow of up to 3
    await pool.query(`ALTER TABLE landing_hero ADD COLUMN IF NOT EXISTS hero_image_url TEXT`)
    await pool.query(`ALTER TABLE landing_hero ADD COLUMN IF NOT EXISTS hero_image_urls JSONB DEFAULT '[]'`)

    // landing_bottom_section — fully admin-customizable section just before the footer
    await pool.query(`
      CREATE TABLE IF NOT EXISTS landing_bottom_section (
        id           INTEGER PRIMARY KEY DEFAULT 1,
        heading      TEXT DEFAULT 'Ready to start your story?',
        subheadline  TEXT DEFAULT '',
        body_text    TEXT DEFAULT '',
        image_urls   JSONB DEFAULT '[]',
        cta_text     TEXT DEFAULT '',
        cta_link     TEXT DEFAULT '',
        is_active    BOOLEAN DEFAULT true,
        updated_at   TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`INSERT INTO landing_bottom_section (id) VALUES (1) ON CONFLICT (id) DO NOTHING`)
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

    // Widen email_templates.category for membership lifecycle emails.
    await pool.query(`ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_category_check`)
    await pool.query(`
      ALTER TABLE email_templates ADD CONSTRAINT email_templates_category_check CHECK (category IN (
        'welcome','story','habit','challenge','event',
        'leaderboard','certificate','weekly_digest','monthly_digest','custom','membership','gift'))
    `)

    // ── Membership module ──────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS membership_plans (
        id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name            TEXT NOT NULL,
        description     TEXT,
        price           NUMERIC(10,2) NOT NULL DEFAULT 0,
        currency        TEXT NOT NULL DEFAULT 'INR',
        duration_type   TEXT NOT NULL CHECK (duration_type IN ('monthly','quarterly','annual','lifetime','custom')),
        duration_days   INT,
        benefits        JSONB DEFAULT '[]',
        badge_emoji     TEXT DEFAULT '⭐',
        badge_color     TEXT DEFAULT '#FF6B2B',
        priority_level  INT DEFAULT 0,
        status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
        created_at      TIMESTAMPTZ DEFAULT now(),
        updated_at      TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS membership_form_fields (
        id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        field_key   TEXT UNIQUE NOT NULL,
        label       TEXT NOT NULL,
        field_type  TEXT NOT NULL CHECK (field_type IN (
                      'text','textarea','email','phone','number','dropdown',
                      'checkbox','radio','file','image','linkedin_url','company_name')),
        is_required BOOLEAN DEFAULT false,
        options     JSONB DEFAULT '[]',
        sort_order  INT DEFAULT 0,
        is_active   BOOLEAN DEFAULT true,
        created_at  TIMESTAMPTZ DEFAULT now(),
        updated_at  TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS membership_applications (
        id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id          TEXT NOT NULL,
        plan_id          UUID NOT NULL REFERENCES membership_plans(id),
        form_responses   JSONB DEFAULT '{}',
        status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                           'pending','under_review','approved','rejected','expired','cancelled','suspended','renewal_due')),
        payment_method   TEXT CHECK (payment_method IN ('manual','upi','bank_transfer')),
        payment_proof_url TEXT,
        admin_notes      TEXT,
        reviewed_by      TEXT,
        reviewed_at      TIMESTAMPTZ,
        submitted_at     TIMESTAMPTZ DEFAULT now(),
        created_at       TIMESTAMPTZ DEFAULT now(),
        updated_at       TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS membership_payments (
        id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        application_id  UUID NOT NULL REFERENCES membership_applications(id) ON DELETE CASCADE,
        user_id         TEXT NOT NULL,
        plan_id         UUID NOT NULL REFERENCES membership_plans(id),
        amount          NUMERIC(10,2) NOT NULL,
        currency        TEXT NOT NULL DEFAULT 'INR',
        method          TEXT NOT NULL CHECK (method IN ('manual','upi','bank_transfer')),
        status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','refunded')),
        proof_url       TEXT,
        transaction_ref TEXT,
        verified_by     TEXT,
        verified_at     TIMESTAMPTZ,
        created_at      TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS memberships (
        id                     UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id                TEXT NOT NULL,
        plan_id                UUID NOT NULL REFERENCES membership_plans(id),
        application_id         UUID REFERENCES membership_applications(id),
        membership_number      TEXT UNIQUE NOT NULL,
        status                 TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled','suspended')),
        start_date             DATE NOT NULL DEFAULT CURRENT_DATE,
        end_date               DATE,
        expiry_reminder_sent_at TIMESTAMPTZ,
        created_at             TIMESTAMPTZ DEFAULT now(),
        updated_at             TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS membership_cards (
        id                 UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        membership_id      UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
        card_image_url     TEXT,
        card_pdf_url       TEXT,
        social_preview_url TEXT,
        qr_target_url      TEXT,
        status             TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','completed','failed')),
        created_at         TIMESTAMPTZ DEFAULT now(),
        updated_at         TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feature_access_rules (
        id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        feature_key     TEXT UNIQUE NOT NULL,
        label           TEXT NOT NULL,
        free_limit      INT NOT NULL DEFAULT 0,
        member_limit    INT NOT NULL DEFAULT -1,
        reset_frequency TEXT NOT NULL DEFAULT 'never' CHECK (reset_frequency IN ('daily','weekly','monthly','yearly','never')),
        is_active       BOOLEAN DEFAULT true,
        updated_at      TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feature_usage (
        id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id      TEXT NOT NULL,
        feature_key  TEXT NOT NULL,
        period_key   TEXT NOT NULL,
        usage_count  INT NOT NULL DEFAULT 0,
        last_used_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE (user_id, feature_key, period_key)
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_membership_applications_user ON membership_applications(user_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_membership_applications_status ON membership_applications(status)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_memberships_status_end ON memberships(status, end_date)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_feature_usage_lookup ON feature_usage(user_id, feature_key, period_key)`)

    // Razorpay online payment — widen payment method CHECKs for tables
    // created before 'razorpay' existed, and add its order id column.
    await pool.query(`ALTER TABLE membership_payments ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT`)
    await pool.query(`ALTER TABLE membership_payments ADD COLUMN IF NOT EXISTS refund_id TEXT`)
    await pool.query(`ALTER TABLE membership_payments ADD COLUMN IF NOT EXISTS refunded_by TEXT`)
    await pool.query(`ALTER TABLE membership_payments ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ`)
    await pool.query(`ALTER TABLE membership_applications DROP CONSTRAINT IF EXISTS membership_applications_payment_method_check`)
    await pool.query(`
      ALTER TABLE membership_applications ADD CONSTRAINT membership_applications_payment_method_check
        CHECK (payment_method IN ('manual','upi','bank_transfer','razorpay'))
    `)
    await pool.query(`ALTER TABLE membership_payments DROP CONSTRAINT IF EXISTS membership_payments_method_check`)
    await pool.query(`
      ALTER TABLE membership_payments ADD CONSTRAINT membership_payments_method_check
        CHECK (method IN ('manual','upi','bank_transfer','razorpay'))
    `)

    // Seed default application form fields (once — admin edits afterward persist).
    const { rows: ffCount } = await pool.query('SELECT COUNT(*)::int AS n FROM membership_form_fields')
    if (ffCount[0].n === 0) {
      const defaultFields = [
        ['full_name', 'Full Name', 'text', true, 0],
        ['email', 'Email', 'email', true, 1],
        ['mobile_number', 'Mobile Number', 'phone', true, 2],
        ['profile_photo', 'Profile Photo', 'image', false, 3],
        ['current_company', 'Current Company', 'company_name', false, 4],
        ['designation', 'Designation', 'text', false, 5],
        ['linkedin_profile', 'LinkedIn Profile', 'linkedin_url', false, 6],
        ['why_join', 'Why Do You Want To Join?', 'textarea', false, 7],
      ]
      for (const [field_key, label, field_type, is_required, sort_order] of defaultFields) {
        await pool.query(
          `INSERT INTO membership_form_fields (field_key, label, field_type, is_required, sort_order) VALUES ($1,$2,$3,$4,$5)`,
          [field_key, label, field_type, is_required, sort_order]
        )
      }
    }

    // Seed default feature access rules (once — admin edits afterward persist).
    const { rows: farCount } = await pool.query('SELECT COUNT(*)::int AS n FROM feature_access_rules')
    if (farCount[0].n === 0) {
      const defaultRules = [
        // feature_key, label, free_limit, member_limit, reset_frequency
        ['story_creation', 'Story Creation', 0, -1, 'never'],
        ['story_viewing', 'Story Viewing', 5, -1, 'monthly'],
        ['habit_adoption', 'Habit Adoption', 2, -1, 'never'],
        ['challenge_join', 'Challenge Join', 1, -1, 'monthly'],
        ['community_post', 'Community / Comment Posting', 0, -1, 'never'],
        ['event_registration', 'Event Registration', 0, -1, 'never'],
        ['job_applications', 'Job Applications', 2, -1, 'weekly'],
        ['certificate_download', 'Certificate Download', 0, -1, 'never'],
      ]
      for (const [feature_key, label, free_limit, member_limit, reset_frequency] of defaultRules) {
        await pool.query(
          `INSERT INTO feature_access_rules (feature_key, label, free_limit, member_limit, reset_frequency) VALUES ($1,$2,$3,$4,$5)`,
          [feature_key, label, free_limit, member_limit, reset_frequency]
        )
      }
    }

    // Seed any feature access rules added after the initial all-or-nothing
    // seed above (per-row existence check, so it still lands on environments
    // that already seeded the original list).
    {
      const laterRules = [
        ['gift_sending', 'Surprise A Friend — Send Gift', 1, -1, 'monthly'],
      ]
      for (const [feature_key, label, free_limit, member_limit, reset_frequency] of laterRules) {
        await pool.query(
          `INSERT INTO feature_access_rules (feature_key, label, free_limit, member_limit, reset_frequency)
           SELECT $1,$2,$3,$4,$5 WHERE NOT EXISTS (SELECT 1 FROM feature_access_rules WHERE feature_key = $1)`,
          [feature_key, label, free_limit, member_limit, reset_frequency]
        )
      }
    }

    // Seed default membership lifecycle email templates (once — admin edits
    // afterward persist). These power services/membershipEmails.js sends.
    {
      const wrap = (body) => `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;"><div style="background:#FF6B2B;padding:16px 22px;border-radius:10px 10px 0 0;"><span style="color:#fff;font-size:16px;font-weight:700;">Day1 Diaries</span></div><div style="background:#fff;padding:24px 22px;border:1px solid #F0EAE4;border-top:none;border-radius:0 0 10px 10px;">${body}</div></div>`
      const memTemplates = [
        ['Membership: Application Submitted', 'Your membership application is in! 🎉',
          wrap(`<p>Hi {{name}},</p><p>We've received your application for the <b>{{plan_name}}</b> membership. Our team will review it shortly.</p>`)],
        ['Membership: Payment Received', 'Payment received — thank you!',
          wrap(`<p>Hi {{name}},</p><p>We've received your payment of {{currency}} {{amount}} for the <b>{{plan_name}}</b> membership. It's now under review.</p>`)],
        ['Membership: Payment Failed', 'There was an issue with your payment',
          wrap(`<p>Hi {{name}},</p><p>We couldn't confirm your payment for the <b>{{plan_name}}</b> membership. Please try again or contact support.</p>`)],
        ['Membership: Approved', "You're approved! Welcome to Day1 Diaries Premium 🎉",
          wrap(`<p>Hi {{name}},</p><p>Your <b>{{plan_name}}</b> membership has been approved. Your membership number is <b>{{membership_number}}</b>.</p>`)],
        ['Membership: Rejected', 'Update on your membership application',
          wrap(`<p>Hi {{name}},</p><p>We're unable to approve your membership application at this time. {{admin_notes}}</p><p>You're welcome to re-apply.</p>`)],
        ['Membership: Activated', 'Your premium membership is now active!',
          wrap(`<p>Hi {{name}},</p><p>Your <b>{{plan_name}}</b> membership is active from {{start_date}} until {{end_date}}. Enjoy unlimited access!</p>`)],
        ['Membership: Card Ready', 'Your membership card is ready to download',
          wrap(`<p>Hi {{name}},</p><p>Your Day1 Diaries membership card (<b>{{membership_number}}</b>) is ready. Download it from your membership dashboard.</p>`)],
        ['Membership: Expiring Soon', 'Your membership is expiring soon',
          wrap(`<p>Hi {{name}},</p><p>Your <b>{{plan_name}}</b> membership expires on {{end_date}}. Renew now to keep your premium access.</p>`)],
        ['Membership: Renewed', 'Membership renewed — thank you!',
          wrap(`<p>Hi {{name}},</p><p>Your <b>{{plan_name}}</b> membership has been renewed through {{end_date}}.</p>`)],
        ['Membership: Expired', 'Your membership has expired',
          wrap(`<p>Hi {{name}},</p><p>Your <b>{{plan_name}}</b> membership expired on {{end_date}}. Renew anytime to restore premium access.</p>`)],
        ['Membership: Welcome Premium Member', 'Welcome to the Day1 Diaries Premium community! 🌟',
          wrap(`<p>Hi {{name}},</p><p>You're officially a premium member! Unlimited stories, habits, challenges, jobs, and full community access — all unlocked.</p>`)],
        ['Membership: Payment Refunded', 'Your payment has been refunded',
          wrap(`<p>Hi {{name}},</p><p>Your payment of {{currency}} {{amount}} for the <b>{{plan_name}}</b> membership has been refunded. It should reflect in your original payment method within 5–7 business days.</p>`)],
        ['Membership: Status Updated', 'Update on your membership application',
          wrap(`<p>Hi {{name}},</p><p>The status of your membership application has changed to <b>{{status}}</b>.</p><p>{{notes}}</p>`)],
      ]
      // Per-template existence check (not an all-or-nothing count) so adding
      // a new template name here still seeds it on environments that already
      // have the earlier ones — admin edits to existing ones are untouched.
      for (const [name, subject, html_body] of memTemplates) {
        await pool.query(
          `INSERT INTO email_templates (name, category, subject, html_body, status)
           SELECT $1,'membership',$2,$3,'active' WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = $1)`,
          [name, subject, html_body]
        )
      }
    }

    // ── Surprise A Friend (gifting module) ──────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gift_categories (
        id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        key         TEXT UNIQUE NOT NULL,
        label       TEXT NOT NULL,
        emoji       TEXT DEFAULT '🎁',
        sort_order  INT DEFAULT 0,
        is_active   BOOLEAN DEFAULT true,
        created_at  TIMESTAMPTZ DEFAULT now(),
        updated_at  TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gift_types (
        id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        key         TEXT UNIQUE NOT NULL,
        label       TEXT NOT NULL,
        description TEXT,
        base_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
        currency    TEXT NOT NULL DEFAULT 'INR',
        sort_order  INT DEFAULT 0,
        is_active   BOOLEAN DEFAULT true,
        created_at  TIMESTAMPTZ DEFAULT now(),
        updated_at  TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gift_templates (
        id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        key               TEXT UNIQUE NOT NULL,
        label             TEXT NOT NULL,
        preview_image_url TEXT,
        is_active         BOOLEAN DEFAULT true,
        created_at        TIMESTAMPTZ DEFAULT now(),
        updated_at        TIMESTAMPTZ DEFAULT now()
      )
    `)
    // `key` used to be restricted to exactly the 5 coded visual styles, which
    // blocked admins from cataloguing new templates under their own name. Now
    // `key` is any unique admin-chosen slug, and `style_key` (always one of the
    // 5 coded renderers) decides which actual design renders. Existing rows'
    // style_key defaults to their original key so they keep rendering the same.
    await pool.query(`ALTER TABLE gift_templates DROP CONSTRAINT IF EXISTS gift_templates_key_check`)
    await pool.query(`ALTER TABLE gift_templates ADD COLUMN IF NOT EXISTS style_key TEXT`)
    await pool.query(`UPDATE gift_templates SET style_key = key WHERE style_key IS NULL`)
    await pool.query(`ALTER TABLE gift_templates DROP CONSTRAINT IF EXISTS gift_templates_style_key_check`)
    await pool.query(`
      ALTER TABLE gift_templates ADD CONSTRAINT gift_templates_style_key_check CHECK (style_key IN (
        'luxury_gold','glassmorphism_orange','scrapbook_warm','executive_black_gold','magazine_cover'))
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gift_orders (
        id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        sender_user_id      TEXT NOT NULL,
        recipient_name      TEXT NOT NULL,
        recipient_email     TEXT,
        recipient_user_id   TEXT,
        story_id            UUID NOT NULL REFERENCES stories(id),
        category_id         UUID NOT NULL REFERENCES gift_categories(id),
        gift_type_id        UUID NOT NULL REFERENCES gift_types(id),
        template_id         UUID NOT NULL REFERENCES gift_templates(id),
        message             TEXT,
        voice_message_url   TEXT,
        video_message_url   TEXT,
        image_message_url   TEXT,
        ai_tribute_text     TEXT,
        ai_tribute_kind     TEXT,
        amount              NUMERIC(10,2) NOT NULL DEFAULT 0,
        currency            TEXT NOT NULL DEFAULT 'INR',
        payment_status      TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','free','paid','refunded','failed')),
        status              TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','processing','ready','failed')),
        tribute_slug        TEXT UNIQUE,
        gift_image_url      TEXT,
        gift_pdf_url        TEXT,
        social_preview_url  TEXT,
        qr_target_url       TEXT,
        certificate_number  TEXT,
        created_at          TIMESTAMPTZ DEFAULT now(),
        updated_at          TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gift_payments (
        id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        gift_order_id       UUID NOT NULL REFERENCES gift_orders(id) ON DELETE CASCADE,
        amount              NUMERIC(10,2) NOT NULL,
        currency            TEXT NOT NULL DEFAULT 'INR',
        method              TEXT NOT NULL CHECK (method IN ('razorpay','free')),
        status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','refunded')),
        razorpay_order_id   TEXT,
        razorpay_payment_id TEXT,
        refund_id           TEXT,
        refunded_by         TEXT,
        refunded_at         TIMESTAMPTZ,
        created_at          TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id     TEXT NOT NULL,
        type        TEXT NOT NULL,
        title       TEXT NOT NULL,
        body        TEXT,
        link        TEXT,
        is_read     BOOLEAN DEFAULT false,
        created_at  TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gift_orders_sender ON gift_orders(sender_user_id, created_at DESC)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gift_orders_recipient ON gift_orders(recipient_user_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gift_payments_order ON gift_payments(gift_order_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC)`)

    // Widen gift_payments.method for COD + coin-redemption, and track how
    // many coins a redemption spent (for the user-facing receipt/admin view).
    await pool.query(`ALTER TABLE gift_payments ADD COLUMN IF NOT EXISTS coins_spent INT`)
    await pool.query(`ALTER TABLE gift_payments DROP CONSTRAINT IF EXISTS gift_payments_method_check`)
    await pool.query(`
      ALTER TABLE gift_payments ADD CONSTRAINT gift_payments_method_check
        CHECK (method IN ('razorpay','free','cod','coins','manual'))
    `)
    await pool.query(`ALTER TABLE gift_orders ADD COLUMN IF NOT EXISTS payment_method TEXT`)

    // Seed gift categories (once — admin edits afterward persist).
    const { rows: gcCount } = await pool.query('SELECT COUNT(*)::int AS n FROM gift_categories')
    if (gcCount[0].n === 0) {
      const defaultCategories = [
        ['birthday', 'Birthday', '🎂', 0],
        ['sweet_memories', 'Sweet Memories', '❤️', 1],
        ['surprise_moment', 'Surprise Moment', '😊', 2],
        ['long_time_no_see', 'Long Time No See', '🤝', 3],
        ['career_milestone', 'Career Milestone', '🚀', 4],
        ['achievement_recognition', 'Achievement Recognition', '🏆', 5],
        ['story_contributor', 'Story Contributor', '🌟', 6],
        ['graduation', 'Graduation', '🎓', 7],
        ['first_job', 'First Job Celebration', '💼', 8],
        ['work_anniversary', 'Work Anniversary', '🎉', 9],
      ]
      for (const [key, label, emoji, sort_order] of defaultCategories) {
        await pool.query(
          `INSERT INTO gift_categories (key, label, emoji, sort_order) VALUES ($1,$2,$3,$4)`,
          [key, label, emoji, sort_order]
        )
      }
    }

    // Seed gift types + pricing (once — admin edits afterward persist).
    const { rows: gtCount } = await pool.query('SELECT COUNT(*)::int AS n FROM gift_types')
    if (gtCount[0].n === 0) {
      const defaultTypes = [
        ['digital_certificate', 'Digital Certificate', 'A beautifully designed digital certificate.', 99, 0],
        ['premium_certificate', 'Premium Certificate', 'A richer, premium-finish certificate design.', 199, 1],
        ['poster', 'Poster', 'A printable poster-style tribute.', 299, 2],
        ['story_tribute_card', 'Story Tribute Card', 'A compact shareable tribute card.', 149, 3],
        ['memory_scrapbook', 'Memory Scrapbook', 'A warm, photo-memory scrapbook page.', 249, 4],
        ['video_tribute', 'Video Tribute', 'A narrated video tribute (coming soon).', 499, 5],
        ['printable_frame', 'Printable Frame', 'A frame-ready printable design.', 349, 6],
        ['digital_plaque', 'Digital Plaque', 'A digital recognition plaque.', 199, 7],
        ['magazine_cover', 'Magazine Cover', 'A magazine-cover-style feature.', 399, 8],
        ['legacy_package', 'Legacy Package', 'The full premium bundle — certificate, poster, and plaque.', 1999, 9],
      ]
      for (const [key, label, description, base_price, sort_order] of defaultTypes) {
        await pool.query(
          `INSERT INTO gift_types (key, label, description, base_price, sort_order) VALUES ($1,$2,$3,$4,$5)`,
          [key, label, description, base_price, sort_order]
        )
      }
    }

    // Seed gift design templates (once — admin edits afterward persist).
    const { rows: gtmplCount } = await pool.query('SELECT COUNT(*)::int AS n FROM gift_templates')
    if (gtmplCount[0].n === 0) {
      const defaultTemplates = [
        ['luxury_gold', 'Luxury Gold — Dark Navy, Premium Border'],
        ['glassmorphism_orange', 'Modern Glassmorphism — Orange Gradient, Professional'],
        ['scrapbook_warm', 'Memory Scrapbook — Photo Memories, Warm Theme'],
        ['executive_black_gold', 'Executive Recognition — Black + Gold, Award Style'],
        ['magazine_cover', 'Magazine Cover — Forbes-Inspired, Professional Recognition'],
      ]
      for (const [key, label] of defaultTemplates) {
        await pool.query(
          `INSERT INTO gift_templates (key, label, style_key) VALUES ($1,$2,$1)`,
          [key, label]
        )
      }
    }

    // Seed the gift lifecycle email template (once — admin edits afterward persist).
    {
      const wrap = (body) => `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;"><div style="background:#0B1E3D;padding:16px 22px;border-radius:10px 10px 0 0;"><span style="color:#D4AF37;font-size:16px;font-weight:700;">Day1 Diaries</span></div><div style="background:#fff;padding:24px 22px;border:1px solid #F0EAE4;border-top:none;border-radius:0 0 10px 10px;">${body}</div></div>`
      await pool.query(
        `INSERT INTO email_templates (name, category, subject, html_body, status)
         SELECT $1,'gift',$2,$3,'active' WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = $1)`,
        [
          'Gift: Tribute Received',
          "You've Received A Surprise From A Friend 🎁",
          wrap(`<p>Hi {{recipient_name}},</p><p><b>{{sender_name}}</b> just sent you a surprise — a personalized tribute built from a story on Day1 Diaries.</p><p style="font-style:italic;color:#6B5347;">"{{message}}"</p><p><a href="{{tribute_url}}" style="display:inline-block;margin-top:10px;background:#FF6B2B;color:#fff;padding:10px 22px;border-radius:100px;text-decoration:none;font-weight:700;">View Your Surprise →</a></p>`),
        ]
      )
      const giftTemplates = [
        ['Gift: Payment Refunded', 'Your gift payment has been refunded',
          wrap(`<p>Hi {{recipient_name}},</p><p>Your payment of {{currency}} {{amount}} for the gift to <b>{{gift_recipient_name}}</b> has been refunded. {{notes}}</p>`)],
        ['Gift: Payment Failed', "There was an issue with your gift's payment",
          wrap(`<p>Hi {{recipient_name}},</p><p>We couldn't confirm your payment for the gift to <b>{{gift_recipient_name}}</b>. {{notes}}</p>`)],
        ['Gift: Wallet Claim Approved', 'Your coin claim has been approved 🎉',
          wrap(`<p>Hi {{recipient_name}},</p><p>Your claim for <b>{{tier_label}}</b> ({{tier_cost}} coins) has been approved. {{notes}}</p>`)],
        ['Gift: Wallet Claim Rejected', 'Update on your coin claim',
          wrap(`<p>Hi {{recipient_name}},</p><p>We're unable to fulfill your claim for <b>{{tier_label}}</b> ({{tier_cost}} coins) right now. Your coins have not been deducted. {{notes}}</p>`)],
      ]
      for (const [name, subject, html_body] of giftTemplates) {
        await pool.query(
          `INSERT INTO email_templates (name, category, subject, html_body, status)
           SELECT $1,'gift',$2,$3,'active' WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = $1)`,
          [name, subject, html_body]
        )
      }
    }

    // wallet_claims — a user's request to redeem an unlocked coin tier.
    // Coins are only deducted when an admin approves the claim (not at
    // request time), so a rejected claim never costs the user anything.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallet_claims (
        id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id       UUID NOT NULL REFERENCES profiles(id),
        tier_cost     INT NOT NULL,
        tier_kind     TEXT NOT NULL,
        tier_label    TEXT NOT NULL,
        gift_type_key TEXT,
        status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','fulfilled','rejected')),
        admin_notes   TEXT,
        reviewed_by   UUID REFERENCES profiles(id),
        reviewed_at   TIMESTAMPTZ,
        created_at    TIMESTAMPTZ DEFAULT now()
      )
    `)
    // Set once the user submits the actual gift details (story, recipient,
    // message) for an approved free_gift claim — links to the gift_orders
    // row an admin then manually processes (same "Apply Status" tooling
    // used for online-payment reconciliation).
    await pool.query(`ALTER TABLE wallet_claims ADD COLUMN IF NOT EXISTS gift_order_id UUID REFERENCES gift_orders(id)`)

    // membership_plans.linked_features — admin-picked feature_access_rules
    // keys whose member_limit should be surfaced as a real (not freeform)
    // benefit line for that plan, alongside the manual `benefits` text.
    await pool.query(`ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS linked_features JSONB DEFAULT '[]'`)

    // gift.allowed_audiences can include 'custom' — gift.custom_user_ids
    // holds the hand-picked profile ids allowed in that case.
    // (No table/column needed — stored as an app_settings row, same as
    // the rest of the gift.* settings.)

    // site_visit_counter — single-row global page-visit count, incremented
    // on every page load and directly editable by an admin.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_visit_counter (
        id         INT PRIMARY KEY DEFAULT 1,
        count      BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `)
    await pool.query(`INSERT INTO site_visit_counter (id) VALUES (1) ON CONFLICT (id) DO NOTHING`)

    console.log('DB schema init OK')
  } catch (err) {
    console.error('DB init error (non-fatal):', err.message)
  }
}

module.exports = { pool, initDB }
