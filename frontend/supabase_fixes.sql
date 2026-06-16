-- ============================================================
-- DAY1 DIARIES — FIXES & CONTRIBUTOR ROLE
-- Run in Supabase SQL Editor
-- ============================================================

-- ── 1. AUTO-UPDATE followers/following counts via triggers ───

-- Trigger: when a follow row is inserted or deleted, update both profiles
CREATE OR REPLACE FUNCTION public.sync_follow_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE public.profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.following_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_follow_counts ON public.follows;
CREATE TRIGGER trg_sync_follow_counts
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.sync_follow_counts();

-- ── 2. AUTO-UPDATE stories_count on profiles ────────────────

CREATE OR REPLACE FUNCTION public.sync_story_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'published' THEN
    UPDATE public.profiles SET stories_count = stories_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'published' THEN
    UPDATE public.profiles SET stories_count = GREATEST(stories_count - 1, 0) WHERE id = OLD.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'published' AND NEW.status = 'published' THEN
      UPDATE public.profiles SET stories_count = stories_count + 1 WHERE id = NEW.user_id;
    ELSIF OLD.status = 'published' AND NEW.status != 'published' THEN
      UPDATE public.profiles SET stories_count = GREATEST(stories_count - 1, 0) WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_story_count ON public.stories;
CREATE TRIGGER trg_sync_story_count
  AFTER INSERT OR UPDATE OR DELETE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.sync_story_count();

-- ── 3. AUTO-UPDATE like counts ──────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.stories  SET likes_count    = likes_count    + 1 WHERE id = NEW.story_id;
    UPDATE public.profiles SET likes_received = likes_received + 1
      WHERE id = (SELECT user_id FROM public.stories WHERE id = NEW.story_id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.stories  SET likes_count    = GREATEST(likes_count    - 1, 0) WHERE id = OLD.story_id;
    UPDATE public.profiles SET likes_received = GREATEST(likes_received - 1, 0)
      WHERE id = (SELECT user_id FROM public.stories WHERE id = OLD.story_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_like_count ON public.likes;
CREATE TRIGGER trg_sync_like_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_like_count();

-- ── 4. AUTO-UPDATE comment counts ──────────────────────────

CREATE OR REPLACE FUNCTION public.sync_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.stories SET comments_count = comments_count + 1 WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.stories SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.story_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_comment_count ON public.comments;
CREATE TRIGGER trg_sync_comment_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_comment_count();

-- ── 5. AUTO-UPDATE score / level ────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_profile_level()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_level text;
BEGIN
  SELECT name INTO new_level
  FROM public.gamification_levels
  WHERE NEW.score >= min_score AND (max_score IS NULL OR NEW.score <= max_score)
  ORDER BY min_score DESC LIMIT 1;

  IF new_level IS NOT NULL AND new_level != COALESCE(NEW.level, '') THEN
    NEW.level = new_level;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_level ON public.profiles;
CREATE TRIGGER trg_sync_level
  BEFORE UPDATE OF score ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_level();

-- ── 6. AUTO-SYNC plan label when subscription activates ─────

CREATE OR REPLACE FUNCTION public.sync_plan_on_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE plan_slug text; plan_badge text;
BEGIN
  IF NEW.status = 'active' THEN
    SELECT slug, badge_label INTO plan_slug, plan_badge FROM public.plans WHERE id = NEW.plan_id;
    UPDATE public.profiles
    SET
      plan           = COALESCE(plan_slug, 'free'),
      is_pro         = (plan_slug != 'free'),
      pro_badge_label = CASE WHEN plan_slug != 'free' THEN COALESCE(plan_badge,'👑 PRO') ELSE NULL END
    WHERE id = NEW.user_id;
  ELSIF NEW.status IN ('cancelled','expired') THEN
    UPDATE public.profiles
    SET plan = 'free', is_pro = false, pro_badge_label = NULL
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_plan ON public.user_subscriptions;
CREATE TRIGGER trg_sync_plan
  AFTER INSERT OR UPDATE OF status ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_plan_on_subscription();

-- ── 7. CONTRIBUTOR ROLE ──────────────────────────────────────

-- Add contributor role to profiles check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user','contributor','admin'));

-- Contributors can create/edit events, community updates, challenges, habits
-- but NOT manage users, plans, or see revenue

-- RLS: contributors can insert/update community_updates
DROP POLICY IF EXISTS "cu_contributor_write" ON public.community_updates;
CREATE POLICY "cu_contributor_write" ON public.community_updates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','contributor'))
  );

DROP POLICY IF EXISTS "cu_contributor_update" ON public.community_updates;
CREATE POLICY "cu_contributor_update" ON public.community_updates
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "cu_contributor_delete" ON public.community_updates;
CREATE POLICY "cu_contributor_delete" ON public.community_updates
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Contributors can manage habit challenges they created
DROP POLICY IF EXISTS "challenges_contributor_write" ON public.habit_challenges;
CREATE POLICY "challenges_contributor_write" ON public.habit_challenges
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','contributor'))
  );

DROP POLICY IF EXISTS "challenges_contributor_update" ON public.habit_challenges;
CREATE POLICY "challenges_contributor_update" ON public.habit_challenges
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "challenges_contributor_delete" ON public.habit_challenges;
CREATE POLICY "challenges_contributor_delete" ON public.habit_challenges
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Contributors can manage habits they created
DROP POLICY IF EXISTS "habits_contributor_write" ON public.habits;
CREATE POLICY "habits_contributor_write" ON public.habits
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','contributor'))
  );

DROP POLICY IF EXISTS "habits_contributor_update" ON public.habits;
CREATE POLICY "habits_contributor_update" ON public.habits
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "habits_contributor_delete" ON public.habits;
CREATE POLICY "habits_contributor_delete" ON public.habits
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Add created_by to habits if missing
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

-- ── 8. CHALLENGE PARTICIPANTS VIEW (top 10) ─────────────────

CREATE OR REPLACE VIEW public.challenge_leaderboard AS
SELECT
  cp.challenge_id,
  cp.user_id,
  cp.streak,
  cp.points_earned,
  cp.completed,
  cp.joined_at,
  p.username,
  p.full_name,
  p.avatar_url,
  p.level,
  p.is_pro,
  p.pro_badge_label,
  ROW_NUMBER() OVER (PARTITION BY cp.challenge_id ORDER BY cp.points_earned DESC, cp.streak DESC) AS rank
FROM public.challenge_participations cp
JOIN public.profiles p ON p.id = cp.user_id;

GRANT SELECT ON public.challenge_leaderboard TO authenticated, anon;

-- ── 9. RESYNC all existing counts (run once) ────────────────

-- Resync followers
UPDATE public.profiles p
SET followers_count = (SELECT count(*) FROM public.follows WHERE following_id = p.id);

UPDATE public.profiles p
SET following_count = (SELECT count(*) FROM public.follows WHERE follower_id = p.id);

-- Resync stories
UPDATE public.profiles p
SET stories_count = (SELECT count(*) FROM public.stories WHERE user_id = p.id AND status = 'published');

-- Resync likes
UPDATE public.stories s
SET likes_count = (SELECT count(*) FROM public.likes WHERE story_id = s.id);

UPDATE public.profiles p
SET likes_received = (SELECT COALESCE(sum(s.likes_count),0) FROM public.stories s WHERE s.user_id = p.id);

-- Confirm
SELECT 'Triggers and contributor role installed successfully' AS status;
