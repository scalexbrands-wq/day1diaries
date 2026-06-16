-- ============================================================
-- MIGRATION — Site Pages (About, Blog, Careers, Contact)
-- Run: psql -h <rds-endpoint> -U day1admin -d day1diaries -f migration_site_pages.sql
-- Safe to run multiple times.
-- ============================================================

-- ── ABOUT PAGE SECTIONS ──────────────────────────────────────
-- Multiple ordered content blocks. Each can have a title, rich
-- text content, an image, and/or an embedded video URL.
CREATE TABLE IF NOT EXISTS about_sections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text,
  content     text,
  image_url   text,
  video_url   text,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ── BLOG POSTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  slug         text UNIQUE NOT NULL,
  excerpt      text,
  content      text NOT NULL,
  cover_image  text,
  author_name  text,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts (is_published, published_at DESC);

-- ── CAREERS / JOB POSTINGS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS careers_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  department    text,
  location      text,
  job_type      text DEFAULT 'Full-time',   -- Full-time, Part-time, Contract, Internship, Remote
  salary_min    numeric,
  salary_max    numeric,
  currency      text DEFAULT 'INR',
  description   text NOT NULL,
  requirements  text,                       -- newline-separated bullet points
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_careers_jobs_active ON careers_jobs (is_active, sort_order);

-- ── JOB APPLICATIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_applications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       uuid REFERENCES careers_jobs(id) ON DELETE SET NULL,
  full_name    text NOT NULL,
  email        text NOT NULL,
  phone        text,
  resume_url   text,
  cover_note   text,
  status       text NOT NULL DEFAULT 'new',  -- new, reviewed, shortlisted, rejected, hired
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications (job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications (status);

-- ── CONTACT MESSAGES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL,
  subject     text,
  message     text NOT NULL,
  status      text NOT NULL DEFAULT 'new',   -- new, read, replied
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages (status);

-- ── touch_updated_at trigger reuse (defined in main schema) ───
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'touch_updated_at') THEN
    CREATE TRIGGER trg_touch_about_sections BEFORE UPDATE ON about_sections FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    CREATE TRIGGER trg_touch_blog_posts BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
    CREATE TRIGGER trg_touch_careers_jobs BEFORE UPDATE ON careers_jobs FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- triggers already exist, ignore
END $$;

-- ── SEED: starter About sections ──────────────────────────────
INSERT INTO about_sections (title, content, sort_order) VALUES
  ('Our Story', 'Day1 Diaries started with a simple idea: everyone remembers their first day — at a new job, a new school, a new chapter. We built a place where those stories could be shared, and where the habits that help people grow could be tracked together, as a community.', 1),
  ('Our Mission', 'We believe that sharing honest, unfiltered first experiences helps people feel less alone — and that small daily habits, tracked consistently, compound into real change. Our mission is to make both of those things easier and more rewarding.', 2),
  ('Join Us', 'Day1 Diaries is growing fast, and we''re always looking for people who care about community, storytelling, and habit-building. Check out our open roles on the Careers page.', 3)
ON CONFLICT DO NOTHING;

-- ── SEED: starter careers jobs ──────────────────────────────────
INSERT INTO careers_jobs (title, department, location, job_type, salary_min, salary_max, currency, description, requirements, sort_order) VALUES
  ('Frontend Engineer (React)', 'Engineering', 'Remote (India)', 'Full-time', 800000, 1500000, 'INR',
   'We''re looking for a Frontend Engineer to help us build delightful, fast experiences for the Day1 Diaries community — from the story feed to the habit tracker and leaderboard.',
   E'3+ years of experience with React\nStrong CSS and responsive design skills\nExperience with REST APIs\nBonus: experience with AWS, Cognito, or CloudFront', 1),
  ('Community Manager', 'Community', 'Remote (India)', 'Full-time', 500000, 900000, 'INR',
   'Help grow and nurture the Day1 Diaries community — moderating content, running habit challenges, and hosting community events.',
   E'Excellent written communication\nExperience with online communities (Discord, Reddit, or similar)\nEmpathy and patience\nBonus: experience in EdTech or career coaching', 2),
  ('Backend Engineer (Node.js)', 'Engineering', 'Remote (India)', 'Full-time', 900000, 1800000, 'INR',
   'Build and scale the APIs powering stories, habits, gamification, and admin tools on AWS (ECS, RDS, Cognito).',
   E'3+ years with Node.js / Express\nExperience with PostgreSQL\nFamiliarity with AWS (ECS, RDS, Cognito, S3)\nBonus: experience with Terraform', 3)
ON CONFLICT DO NOTHING;

SELECT 'Site pages migration complete.' AS status;
SELECT 'about_sections' AS table_name, count(*) FROM about_sections
UNION ALL SELECT 'blog_posts', count(*) FROM blog_posts
UNION ALL SELECT 'careers_jobs', count(*) FROM careers_jobs
UNION ALL SELECT 'job_applications', count(*) FROM job_applications
UNION ALL SELECT 'contact_messages', count(*) FROM contact_messages;
