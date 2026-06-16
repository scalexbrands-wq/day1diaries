-- ============================================================
-- MIGRATION — Add app_settings table (email verification toggle)
-- Run: psql -h <rds-endpoint> -U day1admin -d day1diaries -f migration_app_settings.sql
-- Safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO app_settings (key, value) VALUES
  ('email_verification_required', 'true')
ON CONFLICT (key) DO NOTHING;

SELECT 'app_settings migration complete.' AS status;
SELECT * FROM app_settings;
