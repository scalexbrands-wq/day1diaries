-- ============================================================
-- DAY1 DIARIES — SEED FILE v3 (works in Supabase)
-- Run in Supabase SQL Editor after supabase_schema.sql
-- ============================================================

-- ── STEP 1: Insert demo users into auth.users directly ───────
-- Supabase exposes auth schema in SQL Editor — this works fine
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud
)
VALUES
  ('11111111-1111-1111-1111-111111111111',
   '00000000-0000-0000-0000-000000000000',
   'arjun@day1diaries.demo',
   '$2a$10$PgjZCCIBSPbkSmH6nAT3GeGGHLfVGtTbPKBiMBEJuGYoMmhWaTkwy',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Arjun Mehta","username":"arjun_mehta"}',
   false, 'authenticated', 'authenticated'),

  ('22222222-2222-2222-2222-222222222222',
   '00000000-0000-0000-0000-000000000000',
   'sneha@day1diaries.demo',
   '$2a$10$PgjZCCIBSPbkSmH6nAT3GeGGHLfVGtTbPKBiMBEJuGYoMmhWaTkwy',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Sneha Malhotra","username":"sneha_malhotra"}',
   false, 'authenticated', 'authenticated'),

  ('33333333-3333-3333-3333-333333333333',
   '00000000-0000-0000-0000-000000000000',
   'rahul@day1diaries.demo',
   '$2a$10$PgjZCCIBSPbkSmH6nAT3GeGGHLfVGtTbPKBiMBEJuGYoMmhWaTkwy',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Rahul Kumar","username":"rahul_kumar"}',
   false, 'authenticated', 'authenticated'),

  ('44444444-4444-4444-4444-444444444444',
   '00000000-0000-0000-0000-000000000000',
   'priya@day1diaries.demo',
   '$2a$10$PgjZCCIBSPbkSmH6nAT3GeGGHLfVGtTbPKBiMBEJuGYoMmhWaTkwy',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Priya Rao","username":"priya_rao"}',
   false, 'authenticated', 'authenticated'),

  ('55555555-5555-5555-5555-555555555555',
   '00000000-0000-0000-0000-000000000000',
   'neha@day1diaries.demo',
   '$2a$10$PgjZCCIBSPbkSmH6nAT3GeGGHLfVGtTbPKBiMBEJuGYoMmhWaTkwy',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Neha Kapoor","username":"neha_kapoor"}',
   false, 'authenticated', 'authenticated'),

  ('66666666-6666-6666-6666-666666666666',
   '00000000-0000-0000-0000-000000000000',
   'vikram@day1diaries.demo',
   '$2a$10$PgjZCCIBSPbkSmH6nAT3GeGGHLfVGtTbPKBiMBEJuGYoMmhWaTkwy',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Vikram Singh","username":"vikram_s"}',
   false, 'authenticated', 'authenticated'),

  ('77777777-7777-7777-7777-777777777777',
   '00000000-0000-0000-0000-000000000000',
   'ananya@day1diaries.demo',
   '$2a$10$PgjZCCIBSPbkSmH6nAT3GeGGHLfVGtTbPKBiMBEJuGYoMmhWaTkwy',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Ananya Trivedi","username":"ananya_t"}',
   false, 'authenticated', 'authenticated'),

  ('88888888-8888-8888-8888-888888888888',
   '00000000-0000-0000-0000-000000000000',
   'karthik@day1diaries.demo',
   '$2a$10$PgjZCCIBSPbkSmH6nAT3GeGGHLfVGtTbPKBiMBEJuGYoMmhWaTkwy',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Karthik R","username":"karthik_r"}',
   false, 'authenticated', 'authenticated'),

  ('99999999-9999-9999-9999-999999999999',
   '00000000-0000-0000-0000-000000000000',
   'tanvi@day1diaries.demo',
   '$2a$10$PgjZCCIBSPbkSmH6nAT3GeGGHLfVGtTbPKBiMBEJuGYoMmhWaTkwy',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Tanvi Nair","username":"tanvi_nair"}',
   false, 'authenticated', 'authenticated'),

  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '00000000-0000-0000-0000-000000000000',
   'admin@day1diaries.demo',
   '$2a$10$PgjZCCIBSPbkSmH6nAT3GeGGHLfVGtTbPKBiMBEJuGYoMmhWaTkwy',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Day1 Admin","username":"admin_day1"}',
   false, 'authenticated', 'authenticated')

ON CONFLICT (id) DO NOTHING;

-- ── STEP 2: Insert profiles (auth.users exists now) ──────────
INSERT INTO public.profiles
  (id, username, full_name, bio, location, role, plan,
   score, stories_count, followers_count, likes_received)
VALUES
  ('11111111-1111-1111-1111-111111111111','arjun_mehta',
   'Arjun Mehta','Software Engineer sharing my journey 🚀',
   'Bangalore','user','premium',38440,98,1240,5300),

  ('22222222-2222-2222-2222-222222222222','sneha_malhotra',
   'Sneha Malhotra','Marketing storyteller & habit enthusiast',
   'Mumbai','user','pro',74100,287,9800,9800),

  ('33333333-3333-3333-3333-333333333333','rahul_kumar',
   'Rahul Kumar','Startup founder | First-generation entrepreneur',
   'Pune','user','premium',51880,134,7100,7100),

  ('44444444-4444-4444-4444-444444444444','priya_rao',
   'Priya Rao','IT Fresher navigating the corporate world',
   'Hyderabad','user','free',12310,23,126,284),

  ('55555555-5555-5555-5555-555555555555','neha_kapoor',
   'Neha Kapoor','Content creator | Legend on Day1 Diaries',
   'Delhi','user','pro',98420,512,12400,14200),

  ('66666666-6666-6666-6666-666666666666','vikram_s',
   'Vikram Singh','Product Manager | Story of failure & comeback',
   'Chennai','user','pro',74100,287,8100,9800),

  ('77777777-7777-7777-7777-777777777777','ananya_t',
   'Ananya Trivedi','Finance professional | Habit transformer',
   'Pune','user','premium',51880,134,5700,7100),

  ('88888888-8888-8888-8888-888888888888','karthik_r',
   'Karthik R','Freelancer | First international client at 22',
   'Hyderabad','user','free',9200,19,430,1200),

  ('99999999-9999-9999-9999-999999999999','tanvi_nair',
   'Tanvi Nair','Startup founder (failed, then rose again)',
   'Chennai','user','premium',18200,41,2100,2400),

  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','admin_day1',
   'Day1 Admin','Platform administrator',
   'Bangalore','admin','pro',0,0,0,0)

ON CONFLICT (id) DO UPDATE SET
  username        = EXCLUDED.username,
  full_name       = EXCLUDED.full_name,
  bio             = EXCLUDED.bio,
  location        = EXCLUDED.location,
  role            = EXCLUDED.role,
  plan            = EXCLUDED.plan,
  score           = EXCLUDED.score,
  stories_count   = EXCLUDED.stories_count,
  followers_count = EXCLUDED.followers_count,
  likes_received  = EXCLUDED.likes_received;

-- ── STEP 3: Seed habits ──────────────────────────────────────
INSERT INTO public.habits
  (title, description, icon, category, adopters_count, completion_rate)
VALUES
  ('Read 10 Pages Daily',
   'Read at least 10 pages of any book every single day',
   '📚','Learning',8421,74),
  ('Meditation',
   'Practice mindfulness for at least 10 minutes daily',
   '🧘','Mental Health',7103,68),
  ('Learn AI Daily',
   'Spend 30 minutes learning AI tools, concepts or coding',
   '🤖','Technology',5890,81),
  ('Wake Up at 5AM',
   'Start your day at 5AM for 3 hours of focused work',
   '🌅','Productivity',4302,52),
  ('Exercise Daily',
   'At least 30 minutes of physical activity every day',
   '💪','Fitness',4201,61),
  ('Daily Journaling',
   'Write 3 gratitudes + 1 lesson learned every day',
   '✍️','Self Growth',3788,69),
  ('No Sugar Challenge',
   'Eliminate refined sugar completely from your diet',
   '🚫','Health',2901,44),
  ('Networking Daily',
   'Connect with 1 new professional every single day',
   '🤝','Career',2344,57)
ON CONFLICT DO NOTHING;

-- ── STEP 4: Seed 300 stories ─────────────────────────────────
DO $$
DECLARE
  authors uuid[] := ARRAY[
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555',
    '66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777',
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999'
  ];
  cats text[] := ARRAY[
    'First Day at Job','First Day at Job','First Day at Job',
    'First Startup Experience','First Startup Experience',
    'First Business Client',
    'First College Day',
    'First Failure','First Failure',
    'First Success','First Success',
    'Habit Transformation','Habit Transformation',
    'First Day at Job','First Startup Experience',
    'First Business Client','First College Day',
    'First Failure','First Success','Habit Transformation'
  ];
  titles text[] := ARRAY[
    'I accidentally replied-all to 200 people on Day 1',
    'My first day as a software engineer — I almost quit by noon',
    'I wore formals to a startup that wore pajamas',
    'We built our MVP in a garage. Here is what nobody tells you.',
    'My co-founder and I argued on Day 1. Best thing ever.',
    'My first client paid me ₹500. That story changed everything.',
    'Cold email to a Fortune 500. They replied in 8 minutes.',
    'First day of college — I knew no one. Here is how I survived.',
    'My startup failed in 6 months. 11 things I would do differently.',
    'I lost ₹15 lakh of family money. This is that story.',
    'The day I got my first promotion — 9 months into the job.',
    'How I closed a ₹50 lakh deal with zero experience.',
    '30 days of waking up at 5AM. What actually happened.',
    'I read 10 pages every day for 100 days. The full report.',
    'Day 1 at Infosys — 500 freshers, 1 orientation, zero clarity',
    'My first investor call. I froze completely.',
    'We launched with zero users. Here is how we got our first 100.',
    'My startup failed in 6 months. What I wish I knew.',
    'From ₹8,000 salary to ₹1.5 lakh in 2 years.',
    'Meditation changed my mornings. Honest 60-day review.'
  ];
  bodies text[] := ARRAY[
    'I hit reply-all to a company-wide thread with 200+ people. The CTO responded "Welcome to the team 😂". Three years later that CTO became my biggest sponsor. Never let one embarrassing moment define your entire career.',
    'The IDE would not open. My buddy was on leave. The codebase had 47,000 files and zero comments. By noon I was ready to quit. Then the senior dev took his headphones off and said "Day 1 is always like this. Come, I will buy you chai." That chai changed everything.',
    'My joining letter said business casual. I showed up in a full suit. Everyone else wore jeans. My team lead looked me up and said "You are definitely a fresher." I laughed. She laughed. That became a running joke for months. Dress for the culture you are joining.',
    'We had a product, a laptop, a co-founder, and absolutely no idea what we were doing. The MVP took 14 days. We launched to our WhatsApp contacts. Three people signed up. One was my mother. That ugly MVP taught us more than any course ever could.',
    'Within 6 hours of starting our startup, my co-founder and I had our first real fight — about the name. I wanted something cool. She wanted something clear. We went with her suggestion. Two years later users say they signed up because the name told them exactly what we do.',
    'My first client ran a bakery and could only afford ₹500. I said yes because I needed a portfolio piece. Six months later she referred me to her friend who owned a chain of 12 restaurants. That ₹500 project turned into ₹3 lakh of work. Never underestimate a small first yes.',
    'I found a bug on a Fortune 500 company pricing page. Fixed it locally. Sent them an email with subject: "I fixed a bug on your website." They replied in 8 minutes. Signed a contract in 2 weeks. Give value before you ask for value.',
    'I got on the wrong bus and arrived 40 minutes late. My batch had already found their friend groups. I sat alone at lunch. Then the girl across the table asked if I wanted to sit with her group because she also did not know anyone. We have been best friends for 6 years.',
    'We burned through ₹15 lakh in 6 months. Revenue: zero. What I would do differently: talk to 50 customers before writing a single line of code. Validate pricing before building. Hire slow. Do not build what is cool — build what people desperately need.',
    'My family gave me everything they saved. ₹15 lakh. I called it an investment. Eighteen months later, the startup was dead. My father said: "You tried something most people only dream about. Now you know things no classroom could teach you." That conversation is why I am building again.',
    'Nine months in, my manager called me for a 1:1 and said she was recommending me for promotion. I asked what made her decide. She said: "You solved problems I did not know we had, never made excuses, and made the people around you better." Three things. I wrote them down.',
    'I was 23, no MBA, no network. Called the procurement head of a manufacturing company at 9:15AM. He picked up. I pitched for 90 seconds. He said "Come meet me." I took a bus. Could not afford Uber. He signed a ₹50 lakh contract that evening.',
    'I set my alarm for 4:50AM every day for 30 days. Day 14 it stopped feeling like a challenge and started feeling like the default. Day 30: I cannot imagine sleeping past 6AM. Week 1 is willpower. Week 2 is habit forming. Week 3 is just your life.',
    'I set a rule: 10 pages minimum, every single day. 100 days later I had finished 8 books. The non-obvious thing: my thinking changed. I started connecting ideas across books. Knowledge compound interest is real but takes 30 days to feel. Judge habits at Day 30, not Day 1.',
    'Day 1 at Infosys. 500 freshers. Four hours of compliance videos. Then my buddy disappeared and I was alone with a codebase I had never seen. The senior dev beside me said "Everyone is lost on Day 1. The ones who thrive are those who ask questions shamelessly."',
    'My first investor call. I had rehearsed 50 times. The moment it started I forgot everything. I just said: "I do not know where to start so let me just show you the product." He laughed. We talked for 45 minutes. Got a term sheet three weeks later. Authenticity beats rehearsed pitches.',
    'Zero users on launch day. Week 1: 22 signups from Reddit posts. Week 2: 18 more from personal emails. Week 3: one user shared it and we got 60 signups in a day. By day 30: 100 users and our first real feedback. The first 100 users are a treasure hunt, not a numbers game.',
    'We had a great product, a growing team, and a runway that should have lasted 18 months. We hired too fast, pivoted twice for the wrong reasons, and ran out of money in 10 months. The startup that kills you is usually the one you are most excited about.',
    'Year 1: ₹8,000 per month junior writer. Year 3: ₹1.5 lakh per month. The playbook: learn obsessively for 6 months, write publicly for the next 6, let visibility compound. Always build your public presence while working your day job.',
    'I had tried meditating 4 times before. Quit every time in 2 weeks. This time I started with just 5 minutes. Day 60: a panic situation that would have derailed my whole day got handled in 45 minutes. Same situation, completely different response. That is the ROI of meditation.'
  ];
  i           integer;
  author_id   uuid;
  cat         text;
  stitle      text;
  sbody       text;
  likes_val   integer;
  cmts_val    integer;
  offset_days integer;
  suffix      text;
BEGIN
  FOR i IN 1..300 LOOP
    author_id   := authors[1 + ((i-1) % array_length(authors,1))];
    cat         := cats   [1 + ((i-1) % array_length(cats,   1))];
    stitle      := titles [1 + ((i-1) % array_length(titles, 1))];
    sbody       := bodies [1 + ((i-1) % array_length(bodies, 1))];
    likes_val   := 50  + (random() * 2950)::integer;
    cmts_val    := 5   + (random() * 395)::integer;
    offset_days := (random() * 180)::integer;
    suffix      := CASE WHEN i > array_length(titles,1)
                        THEN ' — Part ' || i::text
                        ELSE '' END;

    INSERT INTO public.stories
      (user_id, title, content, category, tags,
       likes_count, comments_count, shares_count,
       created_at, updated_at)
    VALUES (
      author_id,
      stitle || suffix,
      sbody,
      cat,
      ARRAY[lower(regexp_replace(cat,'\s+','','g'))],
      likes_val,
      cmts_val,
      (likes_val * 0.1)::integer,
      now() - (offset_days || ' days')::interval,
      now() - (offset_days || ' days')::interval
    );
  END LOOP;
END;
$$;

-- ── STEP 5: Update story counts ──────────────────────────────
UPDATE public.profiles p
SET stories_count = (
  SELECT count(*) FROM public.stories s WHERE s.user_id = p.id
);

-- ── STEP 6: Confirm row counts ───────────────────────────────
SELECT
  (SELECT count(*) FROM auth.users)      AS auth_users,
  (SELECT count(*) FROM public.profiles) AS profiles,
  (SELECT count(*) FROM public.stories)  AS stories,
  (SELECT count(*) FROM public.habits)   AS habits;
