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
