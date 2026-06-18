-- ============================================================
-- CERTIFICATES MIGRATION — Story Contributor Certificate feature
-- Run: psql -h <rds> -U day1admin -d day1diaries -f migration_certificates.sql
-- Safe to run multiple times.
-- ============================================================

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
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_story ON certificates(story_id);

SELECT 'Certificates migration complete.' AS status;
