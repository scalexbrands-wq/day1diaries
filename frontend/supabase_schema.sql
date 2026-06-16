-- ============================================================
-- DAY1 DIARIES — SUPABASE SCHEMA (Run this in Supabase SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────────────────────
-- 1. PROFILES (extends auth.users)
-- ──────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  location text,
  role text default 'user' check (role in ('user','admin')),
  plan text default 'free' check (plan in ('free','premium','pro')),
  level text default 'Beginner',
  score integer default 0,
  stories_count integer default 0,
  followers_count integer default 0,
  following_count integer default 0,
  likes_received integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Public profiles readable" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ──────────────────────────────────────────────────────────────
-- 2. STORIES
-- ──────────────────────────────────────────────────────────────
create table public.stories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  category text not null check (category in (
    'First Day at Job','First Startup Experience','First Business Client',
    'First College Day','First Failure','First Success','Habit Transformation'
  )),
  tags text[] default '{}',
  image_url text,
  video_url text,
  likes_count integer default 0,
  comments_count integer default 0,
  shares_count integer default 0,
  saves_count integer default 0,
  is_featured boolean default false,
  is_flagged boolean default false,
  status text default 'published' check (status in ('draft','published','removed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.stories enable row level security;
create policy "Published stories readable" on public.stories for select using (status = 'published');
create policy "Users insert own stories" on public.stories for insert with check (auth.uid() = user_id);
create policy "Users update own stories" on public.stories for update using (auth.uid() = user_id);
create policy "Users delete own stories" on public.stories for delete using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- 3. LIKES
-- ──────────────────────────────────────────────────────────────
create table public.likes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  story_id uuid references public.stories(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, story_id)
);

alter table public.likes enable row level security;
create policy "Likes readable" on public.likes for select using (true);
create policy "Users insert likes" on public.likes for insert with check (auth.uid() = user_id);
create policy "Users delete likes" on public.likes for delete using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- 4. COMMENTS
-- ──────────────────────────────────────────────────────────────
create table public.comments (
  id uuid default uuid_generate_v4() primary key,
  story_id uuid references public.stories(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table public.comments enable row level security;
create policy "Comments readable" on public.comments for select using (true);
create policy "Users insert comments" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users delete own comments" on public.comments for delete using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- 5. SAVES (Bookmarks)
-- ──────────────────────────────────────────────────────────────
create table public.saves (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  story_id uuid references public.stories(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, story_id)
);

alter table public.saves enable row level security;
create policy "Users read own saves" on public.saves for select using (auth.uid() = user_id);
create policy "Users insert saves" on public.saves for insert with check (auth.uid() = user_id);
create policy "Users delete saves" on public.saves for delete using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- 6. FOLLOWS
-- ──────────────────────────────────────────────────────────────
create table public.follows (
  id uuid default uuid_generate_v4() primary key,
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.follows enable row level security;
create policy "Follows readable" on public.follows for select using (true);
create policy "Users insert follows" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users delete follows" on public.follows for delete using (auth.uid() = follower_id);

-- ──────────────────────────────────────────────────────────────
-- 7. HABITS
-- ──────────────────────────────────────────────────────────────
create table public.habits (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  icon text default '✨',
  category text,
  adopters_count integer default 0,
  completion_rate integer default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.habits enable row level security;
create policy "Habits readable" on public.habits for select using (true);
create policy "Admins manage habits" on public.habits for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ──────────────────────────────────────────────────────────────
-- 8. USER HABITS (Adoptions + Tracking)
-- ──────────────────────────────────────────────────────────────
create table public.user_habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  habit_id uuid references public.habits(id) on delete cascade not null,
  current_day integer default 1,
  streak integer default 0,
  best_streak integer default 0,
  last_updated date,
  started_at timestamptz default now(),
  unique(user_id, habit_id)
);

alter table public.user_habits enable row level security;
create policy "Users read own habits" on public.user_habits for select using (auth.uid() = user_id);
create policy "Users manage own habits" on public.user_habits for all using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- 9. HABIT LOGS
-- ──────────────────────────────────────────────────────────────
create table public.habit_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  habit_id uuid references public.habits(id) on delete cascade not null,
  day_number integer not null,
  note text,
  logged_at timestamptz default now()
);

alter table public.habit_logs enable row level security;
create policy "Users read own logs" on public.habit_logs for select using (auth.uid() = user_id);
create policy "Users insert own logs" on public.habit_logs for insert with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- 10. BADGES
-- ──────────────────────────────────────────────────────────────
create table public.user_badges (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  badge_name text not null,
  badge_icon text,
  awarded_at timestamptz default now()
);

alter table public.user_badges enable row level security;
create policy "Badges readable" on public.user_badges for select using (true);

-- ──────────────────────────────────────────────────────────────
-- SEED: 300 STORIES + SAMPLE DATA
-- ──────────────────────────────────────────────────────────────

-- Seed habits
insert into public.habits (title, description, icon, category, adopters_count, completion_rate) values
('Read 10 Pages Daily', 'Read at least 10 pages of any book every single day', '📚', 'Learning', 8421, 74),
('Meditation', 'Practice mindfulness meditation for at least 10 minutes', '🧘', 'Mental Health', 7103, 68),
('Learn AI Daily', 'Spend 30 minutes learning AI tools, concepts or coding', '🤖', 'Technology', 5890, 81),
('Wake Up at 5AM', 'Start your day at 5AM for 3 hours of focused work', '🌅', 'Productivity', 4302, 52),
('Exercise Daily', 'At least 30 minutes of physical activity every day', '💪', 'Fitness', 4201, 61),
('Daily Journaling', 'Write 3 things you are grateful for + 1 lesson learned', '✍️', 'Self Growth', 3788, 69),
('No Sugar Challenge', 'Eliminate refined sugar completely from your diet', '🚫', 'Health', 2901, 44),
('Networking Daily', 'Connect with 1 new professional every single day', '🤝', 'Career', 2344, 57);

-- ============================================================
-- NOTE: The 300 story seeds are inserted via the app's seed
-- script (seed_stories.sql) to keep this file manageable.
-- Run seed_stories.sql AFTER this schema in Supabase.
-- ============================================================
