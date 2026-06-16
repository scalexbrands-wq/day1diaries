-- ============================================================
-- FINAL MIGRATION — Private/Public accounts, story visibility,
--                   editable story categories
-- Run: psql -h <rds> -U day1admin -d day1diaries -f migration_final.sql
-- Safe to run multiple times.
-- ============================================================

-- 1. Private account flag
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- 2. Story visibility (public / followers_only / private)
ALTER TABLE stories ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

-- 3. Editable story categories
CREATE TABLE IF NOT EXISTS story_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text UNIQUE NOT NULL,
  icon       text DEFAULT '📖',
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO story_categories (name, icon, sort_order) VALUES
  ('First Day at Job',         '💼', 1),
  ('First Startup Experience', '🚀', 2),
  ('First Business Client',    '🤝', 3),
  ('First College Day',        '🎓', 4),
  ('First Failure',            '💪', 5),
  ('First Success',            '🏆', 6),
  ('Habit Transformation',     '🔄', 7)
ON CONFLICT (name) DO NOTHING;

SELECT 'Final migration complete.' AS status;
SELECT count(*) AS categories FROM story_categories;
