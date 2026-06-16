-- ============================================================
-- DAY1 DIARIES — ENHANCEMENT SCHEMA v2
-- Run in Supabase SQL Editor AFTER existing schema files
-- ============================================================

-- ── 1. SUBSCRIPTION PLANS (admin managed) ───────────────────
CREATE TABLE IF NOT EXISTS public.plans (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,          -- 'free' | 'pro_monthly' | 'pro_annual'
  monthly_price integer DEFAULT 0,             -- in INR paise (0 = free)
  yearly_price  integer DEFAULT 0,
  trial_days    integer DEFAULT 0,
  features      text[] DEFAULT '{}',
  is_active     boolean DEFAULT true,
  badge_label   text,                          -- e.g. '👑 PRO'
  badge_color   text DEFAULT '#FF6B2B',
  sort_order    integer DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_read_all"    ON public.plans FOR SELECT USING (true);
CREATE POLICY "plans_admin_write" ON public.plans FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

INSERT INTO public.plans (name, slug, monthly_price, yearly_price, trial_days, features, badge_label, badge_color, sort_order) VALUES
('Free',       'free',        0,      0,     0,  ARRAY['Read all stories','Post up to 5 stories','Follow users','Basic habit tracking','Community access'],                                          NULL,       '#8C7B6E', 1),
('Pro Monthly','pro_monthly', 19900,  0,     7,  ARRAY['Everything in Free','Unlimited stories','Premium Badge','Premium Habit Challenges','Free Access to Paid Events','Priority Community Access','Advanced Analytics'], '👑 PRO', '#FF6B2B', 2),
('Pro Annual', 'pro_annual',  0,      149900,14, ARRAY['Everything in Pro Monthly','Save 37%','Exclusive Annual Badge','Early Feature Access','Dedicated Support'],                                '👑 PRO',   '#FF6B2B', 3)
ON CONFLICT (slug) DO NOTHING;

-- ── 2. USER SUBSCRIPTIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id             uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id        uuid REFERENCES public.plans(id) NOT NULL,
  status         text DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','trial')),
  payment_method text,                         -- 'upi' | 'gpay' | 'phonepe' | 'paytm' | 'razorpay'
  razorpay_order_id   text,
  razorpay_payment_id text,
  amount_paid    integer DEFAULT 0,
  trial_ends_at  timestamptz,
  current_period_start timestamptz DEFAULT now(),
  current_period_end   timestamptz,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (user_id, plan_id)
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_own"       ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subs_insert"    ON public.user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subs_admin_all" ON public.user_subscriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── 3. HABIT CHALLENGES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.habit_challenges (
  id               uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  habit_id         uuid REFERENCES public.habits(id) ON DELETE CASCADE,
  title            text NOT NULL,
  description      text,
  duration_days    integer NOT NULL DEFAULT 30,
  start_date       date,
  end_date         date,
  reward_points    integer DEFAULT 1000,
  daily_points     integer DEFAULT 10,
  weekly_points    integer DEFAULT 100,
  participants_limit integer,                  -- NULL = unlimited
  visibility       text DEFAULT 'free' CHECK (visibility IN ('free','pro')),
  status           text DEFAULT 'upcoming' CHECK (status IN ('upcoming','active','completed')),
  participants_count integer DEFAULT 0,
  cover_image_url  text,
  created_by       uuid REFERENCES public.profiles(id),
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE public.habit_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges_read_all"   ON public.habit_challenges FOR SELECT USING (true);
CREATE POLICY "challenges_admin_write" ON public.habit_challenges FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── 4. CHALLENGE PARTICIPATIONS ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.challenge_participations (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  challenge_id uuid REFERENCES public.habit_challenges(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at    timestamptz DEFAULT now(),
  completed    boolean DEFAULT false,
  streak       integer DEFAULT 0,
  points_earned integer DEFAULT 0,
  UNIQUE (challenge_id, user_id)
);

ALTER TABLE public.challenge_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_read_all"  ON public.challenge_participations FOR SELECT USING (true);
CREATE POLICY "cp_own_write" ON public.challenge_participations FOR ALL USING (auth.uid() = user_id);

-- ── 5. COMMUNITY UPDATES / EVENTS ────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_updates (
  id             uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title          text NOT NULL,
  description    text,
  cover_image_url text,
  event_type     text NOT NULL CHECK (event_type IN (
                   'community_news','success_story','free_event',
                   'paid_event','webinar','workshop')),
  event_date     timestamptz,
  event_end_date timestamptz,
  duration_mins  integer,
  seats_available integer,
  seats_booked   integer DEFAULT 0,
  is_paid        boolean DEFAULT false,
  price          integer DEFAULT 0,            -- INR paise
  zoom_link      text,
  speaker_name   text,
  speaker_bio    text,
  speaker_avatar text,
  agenda         text,
  likes_count    integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  is_published   boolean DEFAULT true,
  created_by     uuid REFERENCES public.profiles(id),
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.community_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cu_read_published" ON public.community_updates FOR SELECT USING (is_published = true);
CREATE POLICY "cu_admin_all"      ON public.community_updates FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── 6. EVENT REGISTRATIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id     uuid REFERENCES public.community_updates(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  registered_at timestamptz DEFAULT now(),
  calendar_added boolean DEFAULT false,
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "er_own"   ON public.event_registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "er_insert" ON public.event_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "er_delete" ON public.event_registrations FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "er_admin"  ON public.event_registrations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── 7. GAMIFICATION LEVELS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gamification_levels (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name         text NOT NULL,
  icon         text NOT NULL,
  min_score    integer NOT NULL,
  max_score    integer,
  color        text DEFAULT '#FF6B2B',
  sort_order   integer DEFAULT 0
);

ALTER TABLE public.gamification_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gl_read_all" ON public.gamification_levels FOR SELECT USING (true);
CREATE POLICY "gl_admin"    ON public.gamification_levels FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

INSERT INTO public.gamification_levels (name, icon, min_score, max_score, color, sort_order) VALUES
('Contributor',        '✍️', 0,     4999,  '#8C7B6E', 1),
('Hero',               '🏆', 5000,  19999, '#2563EB', 2),
('Super Hero',         '⚡', 20000, 49999, '#7C3AED', 3),
('Legend',             '👑', 50000, 99999, '#FF6B2B', 4),
('Habit Master',       '🔥', 100000,199999,'#059669', 5),
('Community Champion', '🌟', 200000,NULL,  '#EC4899', 6)
ON CONFLICT DO NOTHING;

-- ── 8. EXTEND profiles with is_pro flag ──────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pro_badge_label text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS engagement_points integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS completed_habits_count integer DEFAULT 0;

-- ── 9. EXTEND habits with more fields ────────────────────────
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS likes_count    integer DEFAULT 0;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS is_active      boolean DEFAULT true;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS cover_image_url text;

-- ── 10. ADMIN STATS RPC ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'total_users',      (SELECT count(*) FROM public.profiles),
    'active_users',     (SELECT count(*) FROM public.profiles WHERE updated_at > now() - interval '30 days'),
    'pro_users',        (SELECT count(*) FROM public.profiles WHERE is_pro = true),
    'total_habits',     (SELECT count(*) FROM public.habits),
    'active_challenges',(SELECT count(*) FROM public.habit_challenges WHERE status = 'active'),
    'total_stories',    (SELECT count(*) FROM public.stories WHERE status = 'published'),
    'total_events',     (SELECT count(*) FROM public.community_updates WHERE is_published = true),
    'events_booked',    (SELECT count(*) FROM public.event_registrations),
    'mrr',              (SELECT COALESCE(sum(amount_paid),0) FROM public.user_subscriptions
                         WHERE status = 'active'
                         AND current_period_start > date_trunc('month', now()))
  ) INTO result;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

-- ── 11. Seed sample community updates ────────────────────────
INSERT INTO public.community_updates
  (title, description, event_type, event_date, duration_mins, seats_available,
   is_paid, price, speaker_name, speaker_bio, is_published, created_by)
VALUES
  ('30-Day Morning Habit Challenge Kickoff',
   'Join 500+ freshers in the most ambitious morning routine challenge of 2026. Wake up at 5AM, log your progress daily, and win 1000 points.',
   'free_event',
   now() + interval '7 days', 60, 500,
   false, 0,
   'Neha Kapoor', 'Legend Creator & Habit Coach at Day1 Diaries',
   true,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),

  ('From Fresher to Team Lead in 18 Months — Live AMA',
   'Rahul Kumar shares the exact strategies that took him from fresher to team lead. Live Q&A included.',
   'webinar',
   now() + interval '14 days', 90, 200,
   false, 0,
   'Rahul Kumar', 'Product Manager & Day1 Diaries Top Creator',
   true,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),

  ('Career Coaching Masterclass — Pro Members Only',
   'Exclusive 2-hour masterclass for Pro members. Cover salary negotiation, personal branding, and networking that actually works.',
   'paid_event',
   now() + interval '21 days', 120, 50,
   true, 49900,
   'Vikram Singh', 'Senior Product Manager & Career Coach',
   true,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT DO NOTHING;

-- ── 12. Seed sample challenges ───────────────────────────────
INSERT INTO public.habit_challenges
  (title, description, duration_days, start_date, end_date,
   reward_points, daily_points, weekly_points,
   visibility, status, participants_count, created_by)
SELECT
  'Wake Up 5AM — July Challenge',
  'Wake up at 5AM every single day for 30 days. Log your check-in daily with a selfie or note. Top 3 win special Legend badges.',
  30,
  date_trunc('month', now() + interval '1 month')::date,
  (date_trunc('month', now() + interval '1 month') + interval '29 days')::date,
  1000, 10, 100,
  'free', 'upcoming', 0,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
WHERE NOT EXISTS (SELECT 1 FROM public.habit_challenges LIMIT 1);

SELECT
  (SELECT count(*) FROM public.plans)             AS plans,
  (SELECT count(*) FROM public.gamification_levels) AS levels,
  (SELECT count(*) FROM public.community_updates)  AS events,
  (SELECT count(*) FROM public.habit_challenges)   AS challenges;
