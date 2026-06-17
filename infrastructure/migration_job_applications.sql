-- Add user-side tracking columns to job_applications
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_status TEXT DEFAULT 'applied',
  ADD COLUMN IF NOT EXISTS user_notes TEXT,
  ADD COLUMN IF NOT EXISTS custom_status TEXT;

CREATE INDEX IF NOT EXISTS idx_job_apps_user_id ON job_applications(user_id);
