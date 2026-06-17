-- ============================================================
-- LOCAL-DEV-ONLY AUTH TABLE
-- Only needed when running the API with AUTH_PROVIDER=local
-- (see backend/src/routes/auth.local.js). Not used in
-- production — Cognito is the source of truth there, so this
-- table is never created/read when AUTH_PROVIDER=cognito.
--
-- Run via: psql -d day1diaries -f backend/local-auth-schema.sql
-- (after infrastructure/schema.sql)
-- ============================================================

CREATE TABLE IF NOT EXISTS local_credentials (
  profile_id    uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at    timestamptz DEFAULT now()
);

-- Holds signups awaiting email confirmation when an admin has
-- app_settings.email_verification_required = true. There's no real
-- email transport locally, so the "code" is printed to the backend
-- console instead of sent — see routes/auth.local.js.
CREATE TABLE IF NOT EXISTS pending_signups (
  email         text PRIMARY KEY,
  username      text NOT NULL,
  full_name     text,
  password_hash text NOT NULL,
  code          text NOT NULL,
  created_at    timestamptz DEFAULT now()
);
