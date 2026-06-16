-- One-off migration to bring an existing database (already created from
-- an older copy of schema.sql) up to date with the CMS/settings tables
-- added later. Safe to re-run (CREATE TABLE IF NOT EXISTS).
-- For brand-new databases, just run the updated schema.sql instead.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coins integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS story_categories (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       text NOT NULL,
  icon       text,
  sort_order integer DEFAULT 0,
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS about_sections (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title      text NOT NULL,
  content    text,
  image_url  text,
  video_url  text,
  sort_order integer DEFAULT 0,
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title        text NOT NULL,
  slug         text UNIQUE NOT NULL,
  excerpt      text,
  content      text NOT NULL,
  cover_image  text,
  author_name  text,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published, published_at DESC);

CREATE TABLE IF NOT EXISTS careers_jobs (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title        text NOT NULL,
  department   text,
  location     text,
  job_type     text DEFAULT 'Full-time',
  salary_min   integer,
  salary_max   integer,
  currency     text DEFAULT 'INR',
  description  text NOT NULL,
  requirements text,
  is_active    boolean DEFAULT true,
  sort_order   integer DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_applications (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id      uuid REFERENCES careers_jobs(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  email       text NOT NULL,
  phone       text,
  resume_url  text,
  cover_note  text,
  status      text DEFAULT 'new' CHECK (status IN ('new','reviewed','shortlisted','rejected','hired')),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications(job_id);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       text NOT NULL,
  email      text NOT NULL,
  subject    text,
  message    text NOT NULL,
  status     text DEFAULT 'new' CHECK (status IN ('new','read','replied')),
  created_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER trg_touch_blog_posts BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_touch_careers_jobs BEFORE UPDATE ON careers_jobs FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
