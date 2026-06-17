-- Points system enhancements
-- Adds last_login_date for daily login bonus tracking
-- Adds shares_count to stories if not present

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_login_date DATE DEFAULT NULL;

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;
