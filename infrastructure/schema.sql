-- ============================================================
-- DAY1 DIARIES — AWS RDS POSTGRESQL SCHEMA
-- Run via: psql -h <rds-endpoint> -U postgres -d day1diaries -f schema.sql
-- Differences from Supabase version:
--   - No "auth" schema / auth.users dependency
--   - profiles.id is a Cognito "sub" (UUID string), not an FK to auth.users
--   - No Supabase RLS (access control handled in Express API)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. PROFILES (1:1 with Cognito user, keyed by Cognito sub) ──
CREATE TABLE profiles (
  id                uuid PRIMARY KEY,                 -- Cognito "sub" claim
  username          text UNIQUE NOT NULL,
  full_name         text,
  email             text UNIQUE NOT NULL,
  bio               text,
  location          text,
  avatar_url        text,
  is_private        boolean DEFAULT false,
  role              text DEFAULT 'user' CHECK (role IN ('user','contributor','admin')),
  level             text DEFAULT 'Beginner',
  score             integer DEFAULT 0,
  stories_count     integer DEFAULT 0,
  followers_count   integer DEFAULT 0,
  following_count   integer DEFAULT 0,
  likes_received    integer DEFAULT 0,
  engagement_points integer DEFAULT 0,
  completed_habits_count integer DEFAULT 0,
  coins             integer DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_score ON profiles(score DESC);

-- ── 2. STORIES ──────────────────────────────────────────────
CREATE TABLE stories (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title           text NOT NULL,
  content         text NOT NULL,
  category        text NOT NULL,
  tags            text[] DEFAULT '{}',
  cover_image_url text,
  status          text DEFAULT 'published' CHECK (status IN ('published','draft','removed')),
  visibility      text DEFAULT 'public' CHECK (visibility IN ('public','followers_only','private')),
  is_featured     boolean DEFAULT false,
  is_flagged      boolean DEFAULT false,
  likes_count     integer DEFAULT 0,
  comments_count  integer DEFAULT 0,
  shares_count    integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_stories_user ON stories(user_id);
CREATE INDEX idx_stories_category ON stories(category);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_featured ON stories(is_featured) WHERE is_featured = true;
CREATE INDEX idx_stories_created ON stories(created_at DESC);

-- ── 3. LIKES ─────────────────────────────────────────────────
CREATE TABLE likes (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  story_id   uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, story_id)
);

CREATE INDEX idx_likes_story ON likes(story_id);
CREATE INDEX idx_likes_user ON likes(user_id);

-- ── 4. COMMENTS ──────────────────────────────────────────────
CREATE TABLE comments (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  story_id   uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_comments_story ON comments(story_id);

-- ── 5. SAVES ─────────────────────────────────────────────────
CREATE TABLE saves (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  story_id   uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, story_id)
);

CREATE INDEX idx_saves_user ON saves(user_id);

-- ── 6. FOLLOWS ───────────────────────────────────────────────
CREATE TABLE follows (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id   uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id  uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- ── 7. HABITS ────────────────────────────────────────────────
CREATE TABLE habits (
  id               uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title            text NOT NULL,
  description      text,
  icon             text DEFAULT '✨',
  category         text,
  adopters_count   integer DEFAULT 0,
  completion_rate  integer DEFAULT 0,
  likes_count      integer DEFAULT 0,
  comments_count   integer DEFAULT 0,
  is_active        boolean DEFAULT true,
  cover_image_url  text,
  created_by       uuid REFERENCES profiles(id),
  created_at       timestamptz DEFAULT now()
);

-- ── 8. USER_HABITS (adoption + progress) ─────────────────────
CREATE TABLE user_habits (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  habit_id      uuid REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  current_day   integer DEFAULT 1,
  streak        integer DEFAULT 1,
  last_updated  date DEFAULT CURRENT_DATE,
  started_at    timestamptz DEFAULT now(),
  UNIQUE (user_id, habit_id)
);

CREATE INDEX idx_user_habits_user ON user_habits(user_id);

-- ── 9. HABIT_LOGS ─────────────────────────────────────────────
CREATE TABLE habit_logs (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  habit_id   uuid REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  day_number integer NOT NULL,
  note       text,
  logged_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_habit_logs_user_habit ON habit_logs(user_id, habit_id);

-- ── 10. HABIT CHALLENGES ──────────────────────────────────────
CREATE TABLE habit_challenges (
  id                  uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  habit_id            uuid REFERENCES habits(id) ON DELETE CASCADE,
  title               text NOT NULL,
  description         text,
  duration_days       integer NOT NULL DEFAULT 30,
  start_date          date,
  end_date            date,
  reward_points       integer DEFAULT 1000,
  daily_points        integer DEFAULT 10,
  weekly_points       integer DEFAULT 100,
  participants_limit  integer,
  visibility          text DEFAULT 'free' CHECK (visibility IN ('free','restricted')),
  status              text DEFAULT 'upcoming' CHECK (status IN ('upcoming','active','completed')),
  participants_count  integer DEFAULT 0,
  cover_image_url     text,
  created_by          uuid REFERENCES profiles(id),
  created_at          timestamptz DEFAULT now()
);

-- ── 11. CHALLENGE PARTICIPATIONS ──────────────────────────────
CREATE TABLE challenge_participations (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  challenge_id  uuid REFERENCES habit_challenges(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at     timestamptz DEFAULT now(),
  completed     boolean DEFAULT false,
  streak        integer DEFAULT 0,
  points_earned integer DEFAULT 0,
  UNIQUE (challenge_id, user_id)
);

-- ── 12. COMMUNITY UPDATES / EVENTS ────────────────────────────
CREATE TABLE community_updates (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title           text NOT NULL,
  description     text,
  cover_image_url text,
  event_type      text NOT NULL CHECK (event_type IN (
                    'community_news','success_story','free_event','webinar','workshop')),
  event_date      timestamptz,
  duration_mins   integer,
  seats_available integer,
  seats_booked    integer DEFAULT 0,
  zoom_link       text,
  speaker_name    text,
  speaker_bio     text,
  speaker_avatar  text,
  agenda          text,
  likes_count     integer DEFAULT 0,
  comments_count  integer DEFAULT 0,
  is_published    boolean DEFAULT true,
  created_by      uuid REFERENCES profiles(id),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_cu_published ON community_updates(is_published) WHERE is_published = true;

-- ── 13. EVENT REGISTRATIONS ───────────────────────────────────
CREATE TABLE event_registrations (
  id             uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id       uuid REFERENCES community_updates(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES profiles(id) ON DELETE CASCADE,
  registered_at  timestamptz DEFAULT now(),
  calendar_added boolean DEFAULT false,
  UNIQUE (event_id, user_id)
);

-- ── 14. GAMIFICATION LEVELS ────────────────────────────────────
CREATE TABLE gamification_levels (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       text NOT NULL,
  icon       text NOT NULL,
  min_score  integer NOT NULL,
  max_score  integer,
  color      text DEFAULT '#FF6B2B',
  sort_order integer DEFAULT 0
);

INSERT INTO gamification_levels (name, icon, min_score, max_score, color, sort_order) VALUES
('Beginner',           '🥉', 0,     999,   '#8C7B6E', 1),
('Explorer',           '🥈', 1000,  4999,  '#2563EB', 2),
('Achiever',           '🥇', 5000,  19999, '#059669', 3),
('Hero',               '🏆', 20000, 49999, '#7C3AED', 4),
('Super Hero',         '🔥', 50000, 99999, '#FF6B2B', 5),
('Legend',             '👑', 100000,199999,'#FFD166', 6),
('Habit Master',       '🔥', 200000,299999,'#059669', 7),
('Community Champion', '🌟', 300000,NULL,  '#EC4899', 8);

-- ── 15. LANDING PAGE CONTENT ───────────────────────────────────
CREATE TABLE landing_hero (
  id integer PRIMARY KEY DEFAULT 1,
  eyebrow text DEFAULT 'For Every Fresher, Everywhere',
  headline text DEFAULT 'Your first day at work is a story only you lived.',
  headline_highlight text DEFAULT 'only you',
  subheadline text DEFAULT 'Now the world can read it. Day1 Diaries is the community where freshers share raw stories, adopt life-changing habits, and grow together.',
  cta_primary_text text DEFAULT 'Share My Day 1 ✍️',
  cta_secondary_text text DEFAULT 'See How It Works →',
  diary_date text DEFAULT 'Day 1 — June 4, 2026',
  diary_title text DEFAULT '"I accidentally replied-all to 200 people on my very first email."',
  diary_content text DEFAULT 'My heart stopped when I saw 200+ names in the To: field...',
  diary_author_name text DEFAULT 'Priya Rao',
  diary_author_role text DEFAULT 'Software Engineer · Bangalore',
  diary_likes text DEFAULT '3.1K',
  diary_comments text DEFAULT '284',
  badge_1_text text DEFAULT '🎉 Just published!',
  badge_2_text text DEFAULT '👀 842 reading now',
  ticker_items text DEFAULT 'First Day at Job — real stories|Habit Tracking — Day 1 to Day 100|Leaderboard — Beginner to Legend',
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO landing_hero (id) VALUES (1);

CREATE TABLE landing_categories (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  icon text NOT NULL DEFAULT '📝',
  name text NOT NULL,
  story_count_override integer,
  is_active boolean DEFAULT true,
  is_cta boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

INSERT INTO landing_categories (icon, name, sort_order) VALUES
('💼','First Day at Job',1),('🚀','First Startup Experience',2),
('🤝','First Business Client',3),('🎓','First College Day',4),
('💔','First Failure',5),('⭐','First Success',6),
('🌱','Habit Transformation',7);
INSERT INTO landing_categories (icon, name, is_cta, sort_order) VALUES ('✍️','Share Yours',true,8);

CREATE TABLE landing_testimonials (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  quote text NOT NULL,
  author_name text NOT NULL,
  author_role text NOT NULL,
  author_initials text NOT NULL DEFAULT 'XX',
  avatar_gradient text DEFAULT 'linear-gradient(135deg,#FF6B2B,#FFD166)',
  rating integer DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ── 16. CATEGORY COUNTS VIEW ───────────────────────────────────
CREATE OR REPLACE VIEW landing_category_counts AS
SELECT
  lc.id, lc.icon, lc.name, lc.is_active, lc.is_cta, lc.sort_order,
  COALESCE(lc.story_count_override, count(s.id))::integer AS story_count
FROM landing_categories lc
LEFT JOIN stories s ON s.category = lc.name AND s.status = 'published'
GROUP BY lc.id, lc.icon, lc.name, lc.is_active, lc.is_cta, lc.sort_order, lc.story_count_override
ORDER BY lc.sort_order;

-- ── 17. CHALLENGE LEADERBOARD VIEW ─────────────────────────────
CREATE OR REPLACE VIEW challenge_leaderboard AS
SELECT
  cp.challenge_id, cp.user_id, cp.streak, cp.points_earned, cp.completed, cp.joined_at,
  p.username, p.full_name, p.avatar_url, p.level,
  ROW_NUMBER() OVER (PARTITION BY cp.challenge_id ORDER BY cp.points_earned DESC, cp.streak DESC) AS rank
FROM challenge_participations cp
JOIN profiles p ON p.id = cp.user_id;

-- ============================================================
-- TRIGGERS — auto-sync counts (same logic as Supabase version)
-- ============================================================

-- Follows
CREATE OR REPLACE FUNCTION sync_follow_counts() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.following_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_follow_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION sync_follow_counts();

-- Stories count
CREATE OR REPLACE FUNCTION sync_story_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'published' THEN
    UPDATE profiles SET stories_count = stories_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'published' THEN
    UPDATE profiles SET stories_count = GREATEST(stories_count - 1, 0) WHERE id = OLD.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'published' AND NEW.status = 'published' THEN
      UPDATE profiles SET stories_count = stories_count + 1 WHERE id = NEW.user_id;
    ELSIF OLD.status = 'published' AND NEW.status != 'published' THEN
      UPDATE profiles SET stories_count = GREATEST(stories_count - 1, 0) WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_story_count
  AFTER INSERT OR UPDATE OR DELETE ON stories
  FOR EACH ROW EXECUTE FUNCTION sync_story_count();

-- Likes count
CREATE OR REPLACE FUNCTION sync_like_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stories SET likes_count = likes_count + 1 WHERE id = NEW.story_id;
    UPDATE profiles SET likes_received = likes_received + 1
      WHERE id = (SELECT user_id FROM stories WHERE id = NEW.story_id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE stories SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.story_id;
    UPDATE profiles SET likes_received = GREATEST(likes_received - 1, 0)
      WHERE id = (SELECT user_id FROM stories WHERE id = OLD.story_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_like_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION sync_like_count();

-- Comments count
CREATE OR REPLACE FUNCTION sync_comment_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stories SET comments_count = comments_count + 1 WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE stories SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.story_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_comment_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION sync_comment_count();

-- Level auto-sync
CREATE OR REPLACE FUNCTION sync_profile_level() RETURNS TRIGGER AS $$
DECLARE new_level text;
BEGIN
  SELECT name INTO new_level FROM gamification_levels
  WHERE NEW.score >= min_score AND (max_score IS NULL OR NEW.score <= max_score)
  ORDER BY min_score DESC LIMIT 1;

  IF new_level IS NOT NULL AND new_level != COALESCE(NEW.level, '') THEN
    NEW.level = new_level;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_level
  BEFORE UPDATE OF score ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_profile_level();

-- updated_at auto-touch
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_touch_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- SITE CMS / SETTINGS
-- Backs the admin "Pages" content tabs (About/Blog/Careers/Contact),
-- app-wide settings (e.g. email_verification_required), and the
-- editable story category list. Referenced by routes/pages.js,
-- routes/admin.js, and routes/stories.js (GET /stories/categories)
-- but were missing from the original migration — added here.
-- ============================================================

-- ── App settings (key/value, e.g. email_verification_required) ──
CREATE TABLE app_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- ── Story categories (editable list shown on Write Story / Discover) ──
CREATE TABLE story_categories (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       text NOT NULL,
  icon       text,
  sort_order integer DEFAULT 0,
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ── About page sections ──────────────────────────────────────
CREATE TABLE about_sections (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title      text NOT NULL,
  content    text,
  image_url  text,
  video_url  text,
  sort_order integer DEFAULT 0,
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ── Blog ──────────────────────────────────────────────────────
CREATE TABLE blog_posts (
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

CREATE INDEX idx_blog_posts_published ON blog_posts(is_published, published_at DESC);

-- ── Careers / jobs ────────────────────────────────────────────
CREATE TABLE careers_jobs (
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

CREATE TABLE job_applications (
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

CREATE INDEX idx_job_applications_job ON job_applications(job_id);

-- ── Contact messages ──────────────────────────────────────────
CREATE TABLE contact_messages (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       text NOT NULL,
  email      text NOT NULL,
  subject    text,
  message    text NOT NULL,
  status     text DEFAULT 'new' CHECK (status IN ('new','read','replied')),
  created_at timestamptz DEFAULT now()
);

CREATE TRIGGER trg_touch_blog_posts BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_touch_careers_jobs BEFORE UPDATE ON careers_jobs FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_touch_stories  BEFORE UPDATE ON stories  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
