-- ============================================================
-- DAY1 DIARIES — LANDING PAGE DYNAMIC CONTENT SCHEMA
-- Run this AFTER supabase_schema.sql in Supabase SQL Editor
-- ============================================================

-- ── 1. HERO SECTION ─────────────────────────────────────────
create table public.landing_hero (
  id integer primary key default 1,
  eyebrow text default 'For Every Fresher, Everywhere',
  headline text default 'Your first day at work is a story only you lived.',
  headline_highlight text default 'only you',
  subheadline text default 'Now the world can read it. Day1 Diaries is the community where freshers share raw stories, adopt life-changing habits, and grow together — one day at a time.',
  cta_primary_text text default 'Share My Day 1 ✍️',
  cta_secondary_text text default 'See How It Works →',
  -- Floating diary card content
  diary_date text default 'Day 1 — June 4, 2026',
  diary_title text default '"I accidentally replied-all to 200 people on my very first email."',
  diary_content text default 'My heart stopped when I saw 200+ names in the To: field. The CTO replied "Welcome to the team 😂" — that response saved my entire career...',
  diary_author_name text default 'Priya Rao',
  diary_author_role text default 'Software Engineer · Bangalore',
  diary_likes text default '3.1K',
  diary_comments text default '284',
  -- Badge overlays
  badge_1_text text default '🎉 Just published!',
  badge_2_text text default '👀 842 reading now',
  -- Ticker text (pipe-separated items)
  ticker_items text default 'First Day at Job — real stories from freshers|Habit Tracking — Day 1 to Day 100|Leaderboard — climb from Beginner to Legend|First Failure — shared, learned from|Coaching Marketplace — book your mentor',
  is_active boolean default true,
  updated_at timestamptz default now()
);

-- Ensure only one row
create unique index landing_hero_singleton on public.landing_hero((id = 1));

alter table public.landing_hero enable row level security;
create policy "Hero readable by all" on public.landing_hero for select using (true);
create policy "Admins update hero" on public.landing_hero for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Seed default hero row
insert into public.landing_hero (id) values (1) on conflict (id) do nothing;

-- ── 2. STORY CATEGORIES ─────────────────────────────────────
create table public.landing_categories (
  id uuid default uuid_generate_v4() primary key,
  icon text not null default '📝',
  name text not null,
  story_count_override integer,   -- null = auto-count from stories table
  is_active boolean default true,
  is_cta boolean default false,   -- marks the "Share Yours" CTA card
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table public.landing_categories enable row level security;
create policy "Categories readable" on public.landing_categories for select using (true);
create policy "Admins manage categories" on public.landing_categories for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Seed default categories
insert into public.landing_categories (icon, name, story_count_override, sort_order) values
('💼', 'First Day at Job',         null, 1),
('🚀', 'First Startup Experience', null, 2),
('🤝', 'First Business Client',    null, 3),
('🎓', 'First College Day',        null, 4),
('💔', 'First Failure',            null, 5),
('⭐', 'First Success',            null, 6),
('🌱', 'Habit Transformation',     null, 7),
('✍️', 'Share Yours',              null, 8);

-- ── 3. TESTIMONIALS ─────────────────────────────────────────
create table public.landing_testimonials (
  id uuid default uuid_generate_v4() primary key,
  quote text not null,
  author_name text not null,
  author_role text not null,
  author_initials text not null default 'XX',
  avatar_gradient text default 'linear-gradient(135deg,#FF6B2B,#FFD166)',
  rating integer default 5 check (rating between 1 and 5),
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table public.landing_testimonials enable row level security;
create policy "Testimonials readable" on public.landing_testimonials for select using (is_active = true);
create policy "Admins manage testimonials" on public.landing_testimonials for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Seed default testimonials
insert into public.landing_testimonials (quote, author_name, author_role, author_initials, avatar_gradient, sort_order) values
('I thought I was the only one who cried in the washroom on Day 1. Turns out, everyone does. This platform made me feel completely human again.',
 'Priya Mehta', 'IT Fresher · Hyderabad', 'PM', 'linear-gradient(135deg,#FF6B2B,#FFD166)', 1),
('Reading others'' Day 1 stories made me feel so prepared before I even walked through the office door. The habit tracker kept me accountable for 60 days straight.',
 'Rahul Kumar', 'Marketing Fresher · Mumbai', 'RK', 'linear-gradient(135deg,#7C3AED,#A78BFA)', 2),
('This platform is like a warm hug for every nervous fresher. I''ve found mentors, made genuine friends, and built habits that changed my performance at work.',
 'Sneha Rao', 'Finance Fresher · Pune', 'SR', 'linear-gradient(135deg,#059669,#34D399)', 3);

-- ── 4. ADD is_featured TO stories (if not already present) ──
alter table public.stories add column if not exists is_featured boolean default false;
create index if not exists idx_stories_featured on public.stories(is_featured) where is_featured = true;

-- ── 5. HELPER VIEW: category story counts ───────────────────
create or replace view public.landing_category_counts as
select 
  lc.id,
  lc.icon,
  lc.name,
  lc.is_active,
  lc.is_cta,
  lc.sort_order,
  coalesce(lc.story_count_override, count(s.id))::integer as story_count
from public.landing_categories lc
left join public.stories s 
  on s.category = lc.name and s.status = 'published'
group by lc.id, lc.icon, lc.name, lc.is_active, lc.is_cta, lc.sort_order, lc.story_count_override
order by lc.sort_order;

-- ── 6. RPC: get full landing page data in one call ───────────
create or replace function public.get_landing_data()
returns json language plpgsql security definer as $$
declare
  result json;
begin
  select json_build_object(
    'stats', json_build_object(
      'total_users',       (select count(*) from public.profiles),
      'total_stories',     (select count(*) from public.stories where status = 'published'),
      'habit_adoptions',   (select count(*) from public.user_habits),
      'categories_count',  (select count(distinct category) from public.stories where status = 'published')
    ),
    'hero',        (select row_to_json(h) from public.landing_hero h where h.is_active = true limit 1),
    'categories',  (select json_agg(c order by c.sort_order) from public.landing_category_counts c where c.is_active = true),
    'testimonials',(select json_agg(t order by t.sort_order) from public.landing_testimonials t where t.is_active = true),
    'habits',      (select json_agg(h order by h.adopters_count desc) from (select * from public.habits order by adopters_count desc limit 6) h),
    'leaderboard', (select json_agg(p order by p.score desc) from (select id,username,full_name,avatar_url,level,score,stories_count from public.profiles order by score desc limit 5) p),
    'featured_stories', (
      select json_agg(s)
      from (
        select s.id, s.title, s.content, s.category, s.likes_count, s.comments_count, s.created_at,
               json_build_object('username', p.username, 'full_name', p.full_name, 'avatar_url', p.avatar_url) as profiles
        from public.stories s
        join public.profiles p on p.id = s.user_id
        where s.status = 'published' and s.is_featured = true
        order by s.created_at desc limit 3
      ) s
    )
  ) into result;
  return result;
end;
$$;

grant execute on function public.get_landing_data() to anon, authenticated;
