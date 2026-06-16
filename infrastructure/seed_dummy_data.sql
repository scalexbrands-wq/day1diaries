-- ============================================================
-- DAY1 DIARIES — DUMMY SEED DATA (100 stories + supporting data)
-- Run: psql -h <endpoint> -U day1admin -d day1diaries -f seed_dummy_data.sql
-- ============================================================

-- ── 1. DUMMY PROFILES ──────────────────────────────────────
INSERT INTO profiles (id, email, username, full_name, bio, location, role, level, score) VALUES
('11111111-1111-1111-1111-111111111101', 'priya.rao@example.com', 'priya_rao', 'Priya Rao', 'Software Engineer at Infosys, Bangalore. Sharing my Day 1 chaos so you don''t feel alone.', 'Bangalore', 'user', 'Legend', 112400),
('11111111-1111-1111-1111-111111111102', 'arjun.mehta@example.com', 'arjun_mehta', 'Arjun Mehta', 'PM @ a Series A startup. Wake up at 5AM club member.', 'Mumbai', 'user', 'Super Hero', 48200),
('11111111-1111-1111-1111-111111111103', 'neha.kapoor@example.com', 'neha_kapoor', 'Neha Kapoor', 'Habit coach. 88-day streak and counting.', 'Delhi', 'user', 'Habit Master', 215600),
('11111111-1111-1111-1111-111111111104', 'sneha.r@example.com', 'sneha_r', 'Sneha Reddy', 'Finance fresher. Got lost on my way to my first client meeting — true story.', 'Pune', 'user', 'Achiever', 18900),
('11111111-1111-1111-1111-111111111105', 'rahul.kumar@example.com', 'rahul_kumar', 'Rahul Kumar', 'Marketing fresher turned team lead in 18 months.', 'Hyderabad', 'user', 'Super Hero', 61200),
('11111111-1111-1111-1111-111111111106', 'ananya.iyer@example.com', 'ananya_iyer', 'Ananya Iyer', 'First job at a startup. Still figuring out Slack etiquette.', 'Chennai', 'user', 'Explorer', 4300),
('11111111-1111-1111-1111-111111111107', 'vikram.singh@example.com', 'vikram_singh', 'Vikram Singh', 'Senior PM & career coach. Here to help freshers skip my mistakes.', 'Gurgaon', 'user', 'Community Champion', 327000),
('11111111-1111-1111-1111-111111111108', 'divya.nair@example.com', 'divya_nair', 'Divya Nair', 'College freshman. First day on campus felt like a movie.', 'Kochi', 'user', 'Beginner', 850),
('11111111-1111-1111-1111-111111111109', 'karthik.v@example.com', 'karthik_v', 'Karthik V', 'Backend dev. Replied-all to 200 people on Day 1. Never again.', 'Bangalore', 'user', 'Hero', 27500),
('11111111-1111-1111-1111-111111111110', 'meera.joshi@example.com', 'meera_joshi', 'Meera Joshi', 'UX designer. Building a reading habit, one page at a time.', 'Ahmedabad', 'user', 'Explorer', 9200),
('11111111-1111-1111-1111-111111111111', 'aditya.rao@example.com', 'aditya_rao', 'Aditya Rao', 'First startup experience — wore a suit, everyone else wore hoodies.', 'Bangalore', 'user', 'Hero', 36800),
('11111111-1111-1111-1111-111111111112', 'ishita.desai@example.com', 'ishita_d', 'Ishita Desai', 'Content writer. Sharing my first-failure story so others feel less alone.', 'Mumbai', 'user', 'Super Hero', 73100)
ON CONFLICT (id) DO NOTHING;

-- ── 2. 100 STORIES ───────────────────────────────────────────
INSERT INTO stories (user_id, title, content, category, likes_count, comments_count, status, is_featured) VALUES
('11111111-1111-1111-1111-111111111111', 'I sat at the wrong desk for two hours and nobody told me', 'I walked in confidently, found an empty desk near the window, set up my laptop, and got to work. Two hours later, during the all-hands meeting, I realized I''d been sitting at a director''s desk who was on leave. Everyone had noticed. Nobody said anything. I wanted to disappear.', 'First Day at Job', 461, 3, 'published', true),
('11111111-1111-1111-1111-111111111112', 'My first work email went to 200 people by mistake', 'I hit ''reply all'' instead of ''reply'' on what I thought was a private thank-you note to my manager. It went to the entire org distribution list. My phone didn''t stop buzzing for an hour. The CEO replied with a laughing emoji. I survived.', 'First Day at Job', 1131, 31, 'published', true),
('11111111-1111-1111-1111-111111111104', 'I wore a full suit to a startup where everyone wore hoodies', 'I''d prepared for weeks — ironed shirt, polished shoes, the works. I walked into the office and every single person was in shorts and a hoodie. The founder looked at me and said ''are you here for a job interview?'' I said yes, even though it was my first day.', 'First Day at Job', 576, 94, 'published', true),
('11111111-1111-1111-1111-111111111102', 'I cried in the bathroom at 11AM on Day 1', 'Nobody trained me, my laptop wasn''t set up till noon, and I felt like the dumbest person in the room. I locked myself in a stall and cried for ten minutes. Then I washed my face, walked back out, and asked someone to help me. That one question changed everything.', 'First Day at Job', 2776, 94, 'published', false),
('11111111-1111-1111-1111-111111111109', 'I introduced myself to the CEO as ''the new intern'' — I wasn''t an intern', 'I was so nervous I forgot my own job title. The CEO laughed and said ''an intern with a full-time offer letter? lucky you.'' We still laugh about it two years later.', 'First Day at Job', 361, 75, 'published', false),
('11111111-1111-1111-1111-111111111107', 'My laptop didn''t arrive until 3PM on my first day', 'I sat there for six hours with nothing to do, too scared to ask anyone for work, pretending to take notes on a blank notepad. By 3PM I was so relieved to finally have something to click on.', 'First Day at Job', 135, 3, 'published', false),
('11111111-1111-1111-1111-111111111102', 'I called my manager by the wrong name for a whole week', 'Her name was Ankita. I called her Ankur for five straight days. On Friday she finally corrected me, laughing so hard she could barely speak. We''re good friends now.', 'First Day at Job', 900, 29, 'published', false),
('11111111-1111-1111-1111-111111111109', 'Day 1 at the startup: the ''office'' was a 2BHK apartment', 'I showed up to the address expecting a corporate building. It was someone''s flat. The ''meeting room'' was the kitchen. The founder was making chai while reviewing my onboarding docs. Best decision of my career.', 'First Startup Experience', 2470, 3, 'published', false),
('11111111-1111-1111-1111-111111111109', 'We had no HR, no onboarding doc, and no idea what I was supposed to do', 'My first task was literally ''figure out what needs figuring out.'' I spent the whole day just observing. By week two I was running a whole feature. Startups move fast.', 'First Startup Experience', 819, 91, 'published', false),
('11111111-1111-1111-1111-111111111111', 'The wifi went down 3 times on my first day and everyone just laughed', 'Turns out the office wifi router was held together with tape and prayers. I learned more about resilience that day than in four years of college.', 'First Startup Experience', 2877, 69, 'published', false),
('11111111-1111-1111-1111-111111111107', 'I was handed admin access to production on Day 1 — I panicked', 'No training, no warning, just ''here''s the keys, don''t break anything.'' I didn''t touch a single thing for 6 hours out of pure fear. Eventually I asked for a sandbox environment. Lesson learned.', 'First Startup Experience', 907, 57, 'published', false),
('11111111-1111-1111-1111-111111111110', 'My first startup task was to name our Slack channels — that was it', 'I thought it was a joke. It wasn''t. Naming things turned out to be one of the hardest problems in software, and I spent my entire first day on #general vs #announcements.', 'First Startup Experience', 1144, 103, 'published', false),
('11111111-1111-1111-1111-111111111101', 'I showed up 40 minutes late to my first client meeting — I got lost', 'Google Maps sent me to the wrong building entirely. I called, apologized profusely, and the client said ''happens to everyone, grab a coffee first.'' That kindness stuck with me.', 'First Business Client', 3113, 103, 'published', false),
('11111111-1111-1111-1111-111111111103', 'My first client asked a question I had zero idea how to answer', 'I froze for what felt like an hour (probably 5 seconds). Then I said ''great question — let me confirm the details and get back to you by EOD.'' I did. The client respected the honesty more than a wrong answer.', 'First Business Client', 2864, 54, 'published', false),
('11111111-1111-1111-1111-111111111106', 'I accidentally called my first client by my ex''s name', 'It just slipped out mid-sentence. The silence afterward was deafening. We somehow still closed the deal. To this day I have no idea how.', 'First Business Client', 1143, 19, 'published', false),
('11111111-1111-1111-1111-111111111104', 'My first client presentation crashed mid-slide and I had to wing it', 'PowerPoint froze on slide 3 of 20. I improvised the rest from memory, standing, with no slides. The client said it was the most engaging pitch they''d seen all quarter.', 'First Business Client', 3132, 43, 'published', false),
('11111111-1111-1111-1111-111111111102', 'I walked into the wrong lecture hall and sat through an entire class for the wrong subject', 'I realized at the very end when the professor mentioned a course code that didn''t match my timetable. I''d just attended a 90-minute lecture on Organic Chemistry. I''m an English major.', 'First College Day', 384, 48, 'published', false),
('11111111-1111-1111-1111-111111111102', 'My roommate and I didn''t speak for the entire first day out of pure awkwardness', 'We just unpacked in silence, occasionally smiling at each other. By night three we were best friends and stayed roommates for all four years.', 'First College Day', 1475, 108, 'published', false),
('11111111-1111-1111-1111-111111111106', 'I got lost on campus for 3 hours looking for my first class', 'The campus map made no sense to me. I finally found the building by following a group of students who looked equally lost. Turns out half of them were freshers too.', 'First College Day', 2477, 33, 'published', false),
('8153ed0a-a0d1-70c2-91be-8bcbac441fd1', 'I tripped and fell in front of the entire orientation hall on Day 1', 'Books went flying everywhere. The whole auditorium turned to look. A senior helped me pick everything up and said ''congrats, now everyone knows your face.'' We''re still friends.', 'First College Day', 182, 93, 'published', false),
('11111111-1111-1111-1111-111111111108', 'I failed my first big presentation so badly my manager had to step in', 'I''d prepared for a week, but stage fright took over completely. I stumbled through slides, lost my train of thought, and my manager gently took over halfway through. I felt like a complete failure that night.', 'First Failure', 2201, 15, 'published', false),
('11111111-1111-1111-1111-111111111107', 'My first project shipped with a bug that took down the app for 2 hours', 'It was a one-line typo in a config file. The whole platform was down. I thought I''d get fired. Instead my lead said ''welcome to engineering — now let''s write a postmortem together.''', 'First Failure', 327, 70, 'published', false),
('11111111-1111-1111-1111-111111111105', 'I missed my first major deadline because I underestimated everything', 'I told my manager ''2 days, easy.'' It took 2 weeks. I learned to always add buffer, and to communicate blockers early instead of hoping they''d resolve themselves.', 'First Failure', 3402, 80, 'published', false),
('11111111-1111-1111-1111-111111111110', 'I got rejected from 47 internships before landing my first job', 'Forty. Seven. Rejections. Each one stung a little less than the last. The 48th said yes. That job changed the entire trajectory of my career.', 'First Failure', 1486, 73, 'published', false),
('11111111-1111-1111-1111-111111111104', 'I closed my first sale and did a happy dance in the office bathroom', 'It was a tiny deal — ₹15,000. But it was MY deal, start to finish. I locked myself in a stall and did a literal happy dance before walking back out calmly.', 'First Success', 2890, 8, 'published', false),
('11111111-1111-1111-1111-111111111101', 'My first pull request got merged and I screenshot it like a trophy', 'Three lines of code. A typo fix. But it was MY code, in production, and I still have that screenshot saved on three different devices.', 'First Success', 2713, 29, 'published', false),
('8153ed0a-a0d1-70c2-91be-8bcbac441fd1', 'I got my first ''great job'' from a manager I was terrified of', 'She had a reputation for being tough. After my first project review, she said two words: ''great job.'' I floated home that evening.', 'First Success', 1190, 10, 'published', false),
('11111111-1111-1111-1111-111111111104', 'My first habit streak hit 30 days and I actually cried a little', 'I''d never completed anything for 30 consecutive days in my life. Reading 10 pages a day, every single day, for a month. It doesn''t sound like much. It changed how I see myself.', 'First Success', 418, 48, 'published', false),
('11111111-1111-1111-1111-111111111105', 'I went from zero books a year to 24 books in 12 months — here''s how', 'I started with just 10 pages a day. Some days that was 1 page if I was exhausted. But I never skipped to zero. By the end of the year, I''d read 24 books. Consistency beat intensity every time.', 'Habit Transformation', 1862, 81, 'published', false),
('11111111-1111-1111-1111-111111111106', 'Waking up at 5AM for 100 days straight changed my entire personality', 'I used to be someone who hit snooze 6 times. After 100 days of 5AM wake-ups, I''m calmer, more focused, and somehow have 3 extra hours every single day that I didn''t know existed.', 'Habit Transformation', 671, 47, 'published', false),
('11111111-1111-1111-1111-111111111106', 'My meditation streak hit Day 60 and I finally understand what ''present'' means', 'I used to think meditation was nonsense. 60 days in, I notice when my mind wanders during conversations — and I can bring it back. That''s the whole game.', 'Habit Transformation', 863, 85, 'published', false),
('11111111-1111-1111-1111-111111111105', 'I learned AI tools for 30 minutes daily for 90 days — landed a promotion', 'I started because everyone said ''learn AI or get left behind.'' Ninety days of 30-minute sessions later, I built an internal tool that automated a process my whole team hated. Promotion followed.', 'Habit Transformation', 2879, 119, 'published', false),
('11111111-1111-1111-1111-111111111111', 'I sat at the wrong desk for two hours and nobody told me (Reflection #2)', 'I walked in confidently, found an empty desk near the window, set up my laptop, and got to work. Two hours later, during the all-hands meeting, I realized I''d been sitting at a director''s desk who was on leave. Everyone had noticed. Nobody said anything. I wanted to disappear. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Day at Job', 2659, 9, 'published', false),
('11111111-1111-1111-1111-111111111110', 'My first work email went to 200 people by mistake (Reflection #2)', 'I hit ''reply all'' instead of ''reply'' on what I thought was a private thank-you note to my manager. It went to the entire org distribution list. My phone didn''t stop buzzing for an hour. The CEO replied with a laughing emoji. I survived. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Day at Job', 2605, 21, 'published', false),
('11111111-1111-1111-1111-111111111109', 'I wore a full suit to a startup where everyone wore hoodies (Reflection #2)', 'I''d prepared for weeks — ironed shirt, polished shoes, the works. I walked into the office and every single person was in shorts and a hoodie. The founder looked at me and said ''are you here for a job interview?'' I said yes, even though it was my first day. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Day at Job', 2991, 31, 'published', false),
('11111111-1111-1111-1111-111111111103', 'I cried in the bathroom at 11AM on Day 1 (Reflection #2)', 'Nobody trained me, my laptop wasn''t set up till noon, and I felt like the dumbest person in the room. I locked myself in a stall and cried for ten minutes. Then I washed my face, walked back out, and asked someone to help me. That one question changed everything. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Day at Job', 1898, 48, 'published', false),
('11111111-1111-1111-1111-111111111105', 'I introduced myself to the CEO as ''the new intern'' — I wasn''t an intern (Reflection #2)', 'I was so nervous I forgot my own job title. The CEO laughed and said ''an intern with a full-time offer letter? lucky you.'' We still laugh about it two years later. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Day at Job', 2626, 88, 'published', false),
('11111111-1111-1111-1111-111111111109', 'My laptop didn''t arrive until 3PM on my first day (Reflection #2)', 'I sat there for six hours with nothing to do, too scared to ask anyone for work, pretending to take notes on a blank notepad. By 3PM I was so relieved to finally have something to click on. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Day at Job', 904, 87, 'published', false),
('11111111-1111-1111-1111-111111111106', 'I called my manager by the wrong name for a whole week (Reflection #2)', 'Her name was Ankita. I called her Ankur for five straight days. On Friday she finally corrected me, laughing so hard she could barely speak. We''re good friends now. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Day at Job', 3457, 98, 'published', false),
('8153ed0a-a0d1-70c2-91be-8bcbac441fd1', 'Day 1 at the startup: the ''office'' was a 2BHK apartment (Reflection #2)', 'I showed up to the address expecting a corporate building. It was someone''s flat. The ''meeting room'' was the kitchen. The founder was making chai while reviewing my onboarding docs. Best decision of my career. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Startup Experience', 234, 29, 'published', false),
('11111111-1111-1111-1111-111111111101', 'We had no HR, no onboarding doc, and no idea what I was supposed to do (Reflection #2)', 'My first task was literally ''figure out what needs figuring out.'' I spent the whole day just observing. By week two I was running a whole feature. Startups move fast. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Startup Experience', 3302, 40, 'published', false),
('11111111-1111-1111-1111-111111111107', 'The wifi went down 3 times on my first day and everyone just laughed (Reflection #2)', 'Turns out the office wifi router was held together with tape and prayers. I learned more about resilience that day than in four years of college. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Startup Experience', 1101, 8, 'published', false),
('11111111-1111-1111-1111-111111111104', 'I was handed admin access to production on Day 1 — I panicked (Reflection #2)', 'No training, no warning, just ''here''s the keys, don''t break anything.'' I didn''t touch a single thing for 6 hours out of pure fear. Eventually I asked for a sandbox environment. Lesson learned. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Startup Experience', 2328, 112, 'published', false),
('11111111-1111-1111-1111-111111111112', 'My first startup task was to name our Slack channels — that was it (Reflection #2)', 'I thought it was a joke. It wasn''t. Naming things turned out to be one of the hardest problems in software, and I spent my entire first day on #general vs #announcements. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Startup Experience', 1293, 27, 'published', false),
('11111111-1111-1111-1111-111111111111', 'I showed up 40 minutes late to my first client meeting — I got lost (Reflection #2)', 'Google Maps sent me to the wrong building entirely. I called, apologized profusely, and the client said ''happens to everyone, grab a coffee first.'' That kindness stuck with me. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Business Client', 2049, 50, 'published', false),
('11111111-1111-1111-1111-111111111111', 'My first client asked a question I had zero idea how to answer (Reflection #2)', 'I froze for what felt like an hour (probably 5 seconds). Then I said ''great question — let me confirm the details and get back to you by EOD.'' I did. The client respected the honesty more than a wrong answer. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Business Client', 1884, 18, 'published', false),
('11111111-1111-1111-1111-111111111105', 'I accidentally called my first client by my ex''s name (Reflection #2)', 'It just slipped out mid-sentence. The silence afterward was deafening. We somehow still closed the deal. To this day I have no idea how. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Business Client', 576, 31, 'published', false),
('11111111-1111-1111-1111-111111111112', 'My first client presentation crashed mid-slide and I had to wing it (Reflection #2)', 'PowerPoint froze on slide 3 of 20. I improvised the rest from memory, standing, with no slides. The client said it was the most engaging pitch they''d seen all quarter. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Business Client', 2304, 68, 'published', false),
('11111111-1111-1111-1111-111111111105', 'I walked into the wrong lecture hall and sat through an entire class for the wrong subject (Reflection #2)', 'I realized at the very end when the professor mentioned a course code that didn''t match my timetable. I''d just attended a 90-minute lecture on Organic Chemistry. I''m an English major. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First College Day', 3064, 74, 'published', false),
('11111111-1111-1111-1111-111111111107', 'My roommate and I didn''t speak for the entire first day out of pure awkwardness (Reflection #2)', 'We just unpacked in silence, occasionally smiling at each other. By night three we were best friends and stayed roommates for all four years. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First College Day', 2395, 51, 'published', false),
('11111111-1111-1111-1111-111111111106', 'I got lost on campus for 3 hours looking for my first class (Reflection #2)', 'The campus map made no sense to me. I finally found the building by following a group of students who looked equally lost. Turns out half of them were freshers too. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First College Day', 903, 17, 'published', false),
('11111111-1111-1111-1111-111111111109', 'I tripped and fell in front of the entire orientation hall on Day 1 (Reflection #2)', 'Books went flying everywhere. The whole auditorium turned to look. A senior helped me pick everything up and said ''congrats, now everyone knows your face.'' We''re still friends. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First College Day', 2026, 11, 'published', false),
('8153ed0a-a0d1-70c2-91be-8bcbac441fd1', 'I failed my first big presentation so badly my manager had to step in (Reflection #2)', 'I''d prepared for a week, but stage fright took over completely. I stumbled through slides, lost my train of thought, and my manager gently took over halfway through. I felt like a complete failure that night. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Failure', 197, 110, 'published', false),
('11111111-1111-1111-1111-111111111102', 'My first project shipped with a bug that took down the app for 2 hours (Reflection #2)', 'It was a one-line typo in a config file. The whole platform was down. I thought I''d get fired. Instead my lead said ''welcome to engineering — now let''s write a postmortem together.'' Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Failure', 631, 80, 'published', false),
('11111111-1111-1111-1111-111111111103', 'I missed my first major deadline because I underestimated everything (Reflection #2)', 'I told my manager ''2 days, easy.'' It took 2 weeks. I learned to always add buffer, and to communicate blockers early instead of hoping they''d resolve themselves. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Failure', 3249, 87, 'published', false),
('11111111-1111-1111-1111-111111111107', 'I got rejected from 47 internships before landing my first job (Reflection #2)', 'Forty. Seven. Rejections. Each one stung a little less than the last. The 48th said yes. That job changed the entire trajectory of my career. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Failure', 2447, 8, 'published', false),
('11111111-1111-1111-1111-111111111107', 'I closed my first sale and did a happy dance in the office bathroom (Reflection #2)', 'It was a tiny deal — ₹15,000. But it was MY deal, start to finish. I locked myself in a stall and did a literal happy dance before walking back out calmly. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Success', 1568, 76, 'published', false),
('11111111-1111-1111-1111-111111111108', 'My first pull request got merged and I screenshot it like a trophy (Reflection #2)', 'Three lines of code. A typo fix. But it was MY code, in production, and I still have that screenshot saved on three different devices. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Success', 2172, 32, 'published', false),
('11111111-1111-1111-1111-111111111109', 'I got my first ''great job'' from a manager I was terrified of (Reflection #2)', 'She had a reputation for being tough. After my first project review, she said two words: ''great job.'' I floated home that evening. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Success', 52, 87, 'published', false),
('11111111-1111-1111-1111-111111111112', 'My first habit streak hit 30 days and I actually cried a little (Reflection #2)', 'I''d never completed anything for 30 consecutive days in my life. Reading 10 pages a day, every single day, for a month. It doesn''t sound like much. It changed how I see myself. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Success', 474, 87, 'published', false),
('11111111-1111-1111-1111-111111111109', 'I went from zero books a year to 24 books in 12 months — here''s how (Reflection #2)', 'I started with just 10 pages a day. Some days that was 1 page if I was exhausted. But I never skipped to zero. By the end of the year, I''d read 24 books. Consistency beat intensity every time. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'Habit Transformation', 3080, 34, 'published', false),
('8153ed0a-a0d1-70c2-91be-8bcbac441fd1', 'Waking up at 5AM for 100 days straight changed my entire personality (Reflection #2)', 'I used to be someone who hit snooze 6 times. After 100 days of 5AM wake-ups, I''m calmer, more focused, and somehow have 3 extra hours every single day that I didn''t know existed. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'Habit Transformation', 2630, 43, 'published', false),
('11111111-1111-1111-1111-111111111102', 'My meditation streak hit Day 60 and I finally understand what ''present'' means (Reflection #2)', 'I used to think meditation was nonsense. 60 days in, I notice when my mind wanders during conversations — and I can bring it back. That''s the whole game. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'Habit Transformation', 1207, 55, 'published', false),
('11111111-1111-1111-1111-111111111103', 'I learned AI tools for 30 minutes daily for 90 days — landed a promotion (Reflection #2)', 'I started because everyone said ''learn AI or get left behind.'' Ninety days of 30-minute sessions later, I built an internal tool that automated a process my whole team hated. Promotion followed. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'Habit Transformation', 1863, 0, 'published', false),
('11111111-1111-1111-1111-111111111112', 'I sat at the wrong desk for two hours and nobody told me (Reflection #3)', 'I walked in confidently, found an empty desk near the window, set up my laptop, and got to work. Two hours later, during the all-hands meeting, I realized I''d been sitting at a director''s desk who was on leave. Everyone had noticed. Nobody said anything. I wanted to disappear. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Day at Job', 2952, 33, 'published', false),
('11111111-1111-1111-1111-111111111109', 'My first work email went to 200 people by mistake (Reflection #3)', 'I hit ''reply all'' instead of ''reply'' on what I thought was a private thank-you note to my manager. It went to the entire org distribution list. My phone didn''t stop buzzing for an hour. The CEO replied with a laughing emoji. I survived. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Day at Job', 3125, 22, 'published', false),
('11111111-1111-1111-1111-111111111109', 'I wore a full suit to a startup where everyone wore hoodies (Reflection #3)', 'I''d prepared for weeks — ironed shirt, polished shoes, the works. I walked into the office and every single person was in shorts and a hoodie. The founder looked at me and said ''are you here for a job interview?'' I said yes, even though it was my first day. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Day at Job', 440, 111, 'published', false),
('11111111-1111-1111-1111-111111111111', 'I cried in the bathroom at 11AM on Day 1 (Reflection #3)', 'Nobody trained me, my laptop wasn''t set up till noon, and I felt like the dumbest person in the room. I locked myself in a stall and cried for ten minutes. Then I washed my face, walked back out, and asked someone to help me. That one question changed everything. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Day at Job', 1227, 107, 'published', false),
('11111111-1111-1111-1111-111111111111', 'I introduced myself to the CEO as ''the new intern'' — I wasn''t an intern (Reflection #3)', 'I was so nervous I forgot my own job title. The CEO laughed and said ''an intern with a full-time offer letter? lucky you.'' We still laugh about it two years later. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Day at Job', 2084, 77, 'published', false),
('11111111-1111-1111-1111-111111111104', 'My laptop didn''t arrive until 3PM on my first day (Reflection #3)', 'I sat there for six hours with nothing to do, too scared to ask anyone for work, pretending to take notes on a blank notepad. By 3PM I was so relieved to finally have something to click on. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Day at Job', 631, 47, 'published', false),
('8153ed0a-a0d1-70c2-91be-8bcbac441fd1', 'I called my manager by the wrong name for a whole week (Reflection #3)', 'Her name was Ankita. I called her Ankur for five straight days. On Friday she finally corrected me, laughing so hard she could barely speak. We''re good friends now. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Day at Job', 666, 69, 'published', false),
('8153ed0a-a0d1-70c2-91be-8bcbac441fd1', 'Day 1 at the startup: the ''office'' was a 2BHK apartment (Reflection #3)', 'I showed up to the address expecting a corporate building. It was someone''s flat. The ''meeting room'' was the kitchen. The founder was making chai while reviewing my onboarding docs. Best decision of my career. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Startup Experience', 2177, 117, 'published', false),
('11111111-1111-1111-1111-111111111101', 'We had no HR, no onboarding doc, and no idea what I was supposed to do (Reflection #3)', 'My first task was literally ''figure out what needs figuring out.'' I spent the whole day just observing. By week two I was running a whole feature. Startups move fast. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Startup Experience', 2458, 41, 'published', false),
('11111111-1111-1111-1111-111111111108', 'The wifi went down 3 times on my first day and everyone just laughed (Reflection #3)', 'Turns out the office wifi router was held together with tape and prayers. I learned more about resilience that day than in four years of college. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Startup Experience', 84, 14, 'published', false),
('11111111-1111-1111-1111-111111111106', 'I was handed admin access to production on Day 1 — I panicked (Reflection #3)', 'No training, no warning, just ''here''s the keys, don''t break anything.'' I didn''t touch a single thing for 6 hours out of pure fear. Eventually I asked for a sandbox environment. Lesson learned. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Startup Experience', 3411, 103, 'published', false),
('11111111-1111-1111-1111-111111111105', 'My first startup task was to name our Slack channels — that was it (Reflection #3)', 'I thought it was a joke. It wasn''t. Naming things turned out to be one of the hardest problems in software, and I spent my entire first day on #general vs #announcements. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Startup Experience', 985, 7, 'published', false),
('11111111-1111-1111-1111-111111111104', 'I showed up 40 minutes late to my first client meeting — I got lost (Reflection #3)', 'Google Maps sent me to the wrong building entirely. I called, apologized profusely, and the client said ''happens to everyone, grab a coffee first.'' That kindness stuck with me. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Business Client', 2328, 10, 'published', false),
('11111111-1111-1111-1111-111111111102', 'My first client asked a question I had zero idea how to answer (Reflection #3)', 'I froze for what felt like an hour (probably 5 seconds). Then I said ''great question — let me confirm the details and get back to you by EOD.'' I did. The client respected the honesty more than a wrong answer. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Business Client', 3002, 62, 'published', false),
('11111111-1111-1111-1111-111111111102', 'I accidentally called my first client by my ex''s name (Reflection #3)', 'It just slipped out mid-sentence. The silence afterward was deafening. We somehow still closed the deal. To this day I have no idea how. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Business Client', 3120, 68, 'published', false),
('8153ed0a-a0d1-70c2-91be-8bcbac441fd1', 'My first client presentation crashed mid-slide and I had to wing it (Reflection #3)', 'PowerPoint froze on slide 3 of 20. I improvised the rest from memory, standing, with no slides. The client said it was the most engaging pitch they''d seen all quarter. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Business Client', 520, 16, 'published', false),
('11111111-1111-1111-1111-111111111111', 'I walked into the wrong lecture hall and sat through an entire class for the wrong subject (Reflection #3)', 'I realized at the very end when the professor mentioned a course code that didn''t match my timetable. I''d just attended a 90-minute lecture on Organic Chemistry. I''m an English major. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First College Day', 1951, 70, 'published', false),
('11111111-1111-1111-1111-111111111103', 'My roommate and I didn''t speak for the entire first day out of pure awkwardness (Reflection #3)', 'We just unpacked in silence, occasionally smiling at each other. By night three we were best friends and stayed roommates for all four years. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First College Day', 1090, 67, 'published', false),
('11111111-1111-1111-1111-111111111110', 'I got lost on campus for 3 hours looking for my first class (Reflection #3)', 'The campus map made no sense to me. I finally found the building by following a group of students who looked equally lost. Turns out half of them were freshers too. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First College Day', 1738, 27, 'published', false),
('11111111-1111-1111-1111-111111111109', 'I tripped and fell in front of the entire orientation hall on Day 1 (Reflection #3)', 'Books went flying everywhere. The whole auditorium turned to look. A senior helped me pick everything up and said ''congrats, now everyone knows your face.'' We''re still friends. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First College Day', 3098, 93, 'published', false),
('11111111-1111-1111-1111-111111111112', 'I failed my first big presentation so badly my manager had to step in (Reflection #3)', 'I''d prepared for a week, but stage fright took over completely. I stumbled through slides, lost my train of thought, and my manager gently took over halfway through. I felt like a complete failure that night. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Failure', 828, 91, 'published', false),
('11111111-1111-1111-1111-111111111105', 'My first project shipped with a bug that took down the app for 2 hours (Reflection #3)', 'It was a one-line typo in a config file. The whole platform was down. I thought I''d get fired. Instead my lead said ''welcome to engineering — now let''s write a postmortem together.'' Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Failure', 1639, 85, 'published', false),
('11111111-1111-1111-1111-111111111111', 'I missed my first major deadline because I underestimated everything (Reflection #3)', 'I told my manager ''2 days, easy.'' It took 2 weeks. I learned to always add buffer, and to communicate blockers early instead of hoping they''d resolve themselves. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Failure', 1534, 56, 'published', false),
('11111111-1111-1111-1111-111111111109', 'I got rejected from 47 internships before landing my first job (Reflection #3)', 'Forty. Seven. Rejections. Each one stung a little less than the last. The 48th said yes. That job changed the entire trajectory of my career. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Failure', 1854, 15, 'published', false),
('11111111-1111-1111-1111-111111111104', 'I closed my first sale and did a happy dance in the office bathroom (Reflection #3)', 'It was a tiny deal — ₹15,000. But it was MY deal, start to finish. I locked myself in a stall and did a literal happy dance before walking back out calmly. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Success', 925, 8, 'published', false),
('11111111-1111-1111-1111-111111111106', 'My first pull request got merged and I screenshot it like a trophy (Reflection #3)', 'Three lines of code. A typo fix. But it was MY code, in production, and I still have that screenshot saved on three different devices. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Success', 91, 75, 'published', false),
('11111111-1111-1111-1111-111111111109', 'I got my first ''great job'' from a manager I was terrified of (Reflection #3)', 'She had a reputation for being tough. After my first project review, she said two words: ''great job.'' I floated home that evening. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Success', 947, 75, 'published', false),
('11111111-1111-1111-1111-111111111104', 'My first habit streak hit 30 days and I actually cried a little (Reflection #3)', 'I''d never completed anything for 30 consecutive days in my life. Reading 10 pages a day, every single day, for a month. It doesn''t sound like much. It changed how I see myself. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Success', 34, 9, 'published', false),
('11111111-1111-1111-1111-111111111112', 'I went from zero books a year to 24 books in 12 months — here''s how (Reflection #3)', 'I started with just 10 pages a day. Some days that was 1 page if I was exhausted. But I never skipped to zero. By the end of the year, I''d read 24 books. Consistency beat intensity every time. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'Habit Transformation', 2589, 7, 'published', false),
('11111111-1111-1111-1111-111111111104', 'Waking up at 5AM for 100 days straight changed my entire personality (Reflection #3)', 'I used to be someone who hit snooze 6 times. After 100 days of 5AM wake-ups, I''m calmer, more focused, and somehow have 3 extra hours every single day that I didn''t know existed. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'Habit Transformation', 281, 115, 'published', false),
('11111111-1111-1111-1111-111111111101', 'My meditation streak hit Day 60 and I finally understand what ''present'' means (Reflection #3)', 'I used to think meditation was nonsense. 60 days in, I notice when my mind wanders during conversations — and I can bring it back. That''s the whole game. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'Habit Transformation', 1358, 9, 'published', false),
('11111111-1111-1111-1111-111111111109', 'I learned AI tools for 30 minutes daily for 90 days — landed a promotion (Reflection #3)', 'I started because everyone said ''learn AI or get left behind.'' Ninety days of 30-minute sessions later, I built an internal tool that automated a process my whole team hated. Promotion followed. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'Habit Transformation', 979, 35, 'published', false),
('11111111-1111-1111-1111-111111111111', 'I sat at the wrong desk for two hours and nobody told me (Reflection #4)', 'I walked in confidently, found an empty desk near the window, set up my laptop, and got to work. Two hours later, during the all-hands meeting, I realized I''d been sitting at a director''s desk who was on leave. Everyone had noticed. Nobody said anything. I wanted to disappear. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Day at Job', 1993, 27, 'published', false),
('11111111-1111-1111-1111-111111111109', 'My first work email went to 200 people by mistake (Reflection #4)', 'I hit ''reply all'' instead of ''reply'' on what I thought was a private thank-you note to my manager. It went to the entire org distribution list. My phone didn''t stop buzzing for an hour. The CEO replied with a laughing emoji. I survived. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Day at Job', 546, 92, 'published', false),
('11111111-1111-1111-1111-111111111110', 'I wore a full suit to a startup where everyone wore hoodies (Reflection #4)', 'I''d prepared for weeks — ironed shirt, polished shoes, the works. I walked into the office and every single person was in shorts and a hoodie. The founder looked at me and said ''are you here for a job interview?'' I said yes, even though it was my first day. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Day at Job', 2365, 60, 'published', false),
('11111111-1111-1111-1111-111111111104', 'I cried in the bathroom at 11AM on Day 1 (Reflection #4)', 'Nobody trained me, my laptop wasn''t set up till noon, and I felt like the dumbest person in the room. I locked myself in a stall and cried for ten minutes. Then I washed my face, walked back out, and asked someone to help me. That one question changed everything. Looking back on this again, months later, I realize it taught me even more than I thought at the time.', 'First Day at Job', 3218, 60, 'published', false);

SELECT 'Seed part 1 (profiles + stories) loaded.' AS status;

-- ============================================================
-- PART 2 — Likes, comments, saves, follows
-- Run AFTER seed_dummy_data.sql
-- ============================================================

-- ── 3. LIKES ─────────────────────────────────────────────────
INSERT INTO likes (user_id, story_id)
SELECT u.id, s.id FROM
(SELECT id FROM profiles WHERE id != '8153ed0a-a0d1-70c2-91be-8bcbac441fd1' ORDER BY random()) u,
LATERAL (SELECT id FROM stories ORDER BY random() LIMIT 18) s
ON CONFLICT DO NOTHING;

INSERT INTO likes (user_id, story_id)
SELECT '8153ed0a-a0d1-70c2-91be-8bcbac441fd1', id FROM stories ORDER BY created_at DESC LIMIT 10
ON CONFLICT DO NOTHING;

-- ── 4. COMMENTS ──────────────────────────────────────────────
INSERT INTO comments (story_id, user_id, content)
SELECT s.id, u.id, c.txt FROM
(SELECT id FROM stories ORDER BY random() LIMIT 80) s
CROSS JOIN LATERAL (SELECT id FROM profiles ORDER BY random() LIMIT 1) u
CROSS JOIN LATERAL (SELECT (ARRAY[
  'This is exactly how I felt on my first day too — thank you for sharing!',
  'I''m not alone. I needed to read this today.',
  'Wow, this brought back so many memories. Day 1 is rough for everyone apparently.',
  'Saving this. Going through something similar right now.',
  'The way you described this had me laughing AND nodding along.',
  'Sending this to my friend who starts her first job next week.',
  'I did almost the exact same thing! Glad it worked out for you.',
  'This community is honestly such a relief to be part of.',
  'Reading this at 11pm before my own Day 1 tomorrow. Feeling better now.',
  'The honesty in this post is so refreshing.'
])[1 + floor(random()*10)::int] AS txt) c;

-- ── 5. SAVES ─────────────────────────────────────────────────
INSERT INTO saves (user_id, story_id)
SELECT u.id, s.id FROM
(SELECT id FROM profiles ORDER BY random()) u,
LATERAL (SELECT id FROM stories ORDER BY random() LIMIT 5) s
ON CONFLICT DO NOTHING;

-- ── 6. FOLLOWS ───────────────────────────────────────────────
-- Dummy users follow your account
INSERT INTO follows (follower_id, following_id)
('11111111-1111-1111-1111-111111111101', '8153ed0a-a0d1-70c2-91be-8bcbac441fd1'),
('11111111-1111-1111-1111-111111111102', '8153ed0a-a0d1-70c2-91be-8bcbac441fd1'),
('11111111-1111-1111-1111-111111111103', '8153ed0a-a0d1-70c2-91be-8bcbac441fd1'),
('11111111-1111-1111-1111-111111111104', '8153ed0a-a0d1-70c2-91be-8bcbac441fd1'),
('11111111-1111-1111-1111-111111111105', '8153ed0a-a0d1-70c2-91be-8bcbac441fd1'),
('11111111-1111-1111-1111-111111111106', '8153ed0a-a0d1-70c2-91be-8bcbac441fd1'),
('11111111-1111-1111-1111-111111111107', '8153ed0a-a0d1-70c2-91be-8bcbac441fd1'),
('11111111-1111-1111-1111-111111111108', '8153ed0a-a0d1-70c2-91be-8bcbac441fd1'),
('11111111-1111-1111-1111-111111111109', '8153ed0a-a0d1-70c2-91be-8bcbac441fd1'),
('11111111-1111-1111-1111-111111111110', '8153ed0a-a0d1-70c2-91be-8bcbac441fd1'),
('11111111-1111-1111-1111-111111111111', '8153ed0a-a0d1-70c2-91be-8bcbac441fd1'),
('11111111-1111-1111-1111-111111111112', '8153ed0a-a0d1-70c2-91be-8bcbac441fd1')
ON CONFLICT DO NOTHING;

-- You follow a few dummy users
INSERT INTO follows (follower_id, following_id)
('8153ed0a-a0d1-70c2-91be-8bcbac441fd1', '11111111-1111-1111-1111-111111111101'),
('8153ed0a-a0d1-70c2-91be-8bcbac441fd1', '11111111-1111-1111-1111-111111111102'),
('8153ed0a-a0d1-70c2-91be-8bcbac441fd1', '11111111-1111-1111-1111-111111111103'),
('8153ed0a-a0d1-70c2-91be-8bcbac441fd1', '11111111-1111-1111-1111-111111111104'),
('8153ed0a-a0d1-70c2-91be-8bcbac441fd1', '11111111-1111-1111-1111-111111111105')
ON CONFLICT DO NOTHING;

-- Dummy users follow each other (random graph)
INSERT INTO follows (follower_id, following_id)
('11111111-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111105'),
('11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111103'),
('11111111-1111-1111-1111-111111111108', '11111111-1111-1111-1111-111111111106'),
('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111112'),
('11111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111108'),
('11111111-1111-1111-1111-111111111110', '11111111-1111-1111-1111-111111111108'),
('11111111-1111-1111-1111-111111111110', '11111111-1111-1111-1111-111111111101'),
('11111111-1111-1111-1111-111111111109', '11111111-1111-1111-1111-111111111107'),
('11111111-1111-1111-1111-111111111110', '11111111-1111-1111-1111-111111111106'),
('11111111-1111-1111-1111-111111111110', '11111111-1111-1111-1111-111111111109'),
('11111111-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111101'),
('11111111-1111-1111-1111-111111111107', '11111111-1111-1111-1111-111111111103'),
('11111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111103'),
('11111111-1111-1111-1111-111111111109', '11111111-1111-1111-1111-111111111108'),
('11111111-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111107'),
('11111111-1111-1111-1111-111111111105', '11111111-1111-1111-1111-111111111110'),
('11111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111101'),
('11111111-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111105'),
('11111111-1111-1111-1111-111111111105', '11111111-1111-1111-1111-111111111102'),
('11111111-1111-1111-1111-111111111109', '11111111-1111-1111-1111-111111111110'),
('11111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111110'),
('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111101'),
('11111111-1111-1111-1111-111111111108', '11111111-1111-1111-1111-111111111111'),
('11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111106'),
('11111111-1111-1111-1111-111111111106', '11111111-1111-1111-1111-111111111109')
ON CONFLICT DO NOTHING;

SELECT 'Seed part 2 (likes, comments, saves, follows) loaded.' AS status;

-- ============================================================
-- PART 3 — Habit adoptions, habit logs, challenges, events
-- Run AFTER seed_dummy_data_part2.sql
-- ============================================================

-- ── 7. USER HABIT ADOPTIONS ────────────────────────────────────
INSERT INTO user_habits (user_id, habit_id, current_day, streak, last_updated)
SELECT u.id, h.id, d.day, d.day, CURRENT_DATE FROM
(SELECT id FROM profiles) u
CROSS JOIN LATERAL (SELECT id FROM habits ORDER BY random() LIMIT 2) h
CROSS JOIN LATERAL (SELECT (5 + floor(random()*60))::int AS day) d
ON CONFLICT (user_id, habit_id) DO NOTHING;

-- ── 8. HABIT LOGS ─────────────────────────────────────────────
INSERT INTO habit_logs (user_id, habit_id, day_number, note, logged_at)
SELECT uh.user_id, uh.habit_id, gs.day,
  (ARRAY[
    'Day ' || gs.day || ': Stayed consistent even though I was tired. Small wins add up.',
    'Day ' || gs.day || ': Almost skipped today but pushed through. Feeling good about it.',
    'Day ' || gs.day || ': Best session yet. Starting to feel like a real habit now.',
    'Day ' || gs.day || ': Did it during my commute. Found a way to make it work.',
    'Day ' || gs.day || ': Reflecting on how far I've come since Day 1.'
  ])[1 + floor(random()*5)::int],
  now() - ((uh.current_day - gs.day) || ' days')::interval
FROM user_habits uh
CROSS JOIN LATERAL generate_series(1, LEAST(uh.current_day, 60)) AS gs(day)
ON CONFLICT DO NOTHING;

-- ── 9. HABIT CHALLENGES ──────────────────────────────────────
INSERT INTO habit_challenges (habit_id, title, description, duration_days, start_date, end_date, reward_points, daily_points, weekly_points, visibility, status, participants_count, created_by)
SELECT id, 'Wake Up 5AM — July Challenge', 'Wake up at 5AM every single day for 30 days. Log your check-in daily. Top 3 win special Legend badges.', 30, date_trunc('month', now() + interval '1 month')::date, (date_trunc('month', now() + interval '1 month') + interval '29 days')::date, 1000, 10, 100, 'free', 'upcoming', 0, '8153ed0a-a0d1-70c2-91be-8bcbac441fd1'
FROM habits WHERE title = 'Wake Up at 5AM' LIMIT 1;

INSERT INTO habit_challenges (habit_id, title, description, duration_days, start_date, end_date, reward_points, daily_points, weekly_points, visibility, status, participants_count, created_by)
SELECT id, '30-Day Reading Sprint', 'Read at least 10 pages every day for 30 days. Track your progress and compare notes with the community.', 30, CURRENT_DATE - 10, CURRENT_DATE + 20, 800, 8, 80, 'free', 'active', 0, '8153ed0a-a0d1-70c2-91be-8bcbac441fd1'
FROM habits WHERE title = 'Read 10 Pages Daily' LIMIT 1;

-- ── 10. CHALLENGE PARTICIPATIONS (active challenge) ────────────
INSERT INTO challenge_participations (challenge_id, user_id, streak, points_earned, completed)
SELECT c.id, p.id, (3 + floor(random()*25))::int, (50 + floor(random()*900))::int, (random() > 0.85)
FROM habit_challenges c
CROSS JOIN profiles p
WHERE c.title = '30-Day Reading Sprint'
ON CONFLICT DO NOTHING;

UPDATE habit_challenges SET participants_count = (SELECT count(*) FROM challenge_participations WHERE challenge_id = habit_challenges.id);

-- ── 11. COMMUNITY EVENTS ────────────────────────────────────────
INSERT INTO community_updates (title, description, event_type, event_date, duration_mins, seats_available, speaker_name, speaker_bio, is_published, created_by) VALUES
('30-Day Morning Habit Challenge Kickoff', 'Join 500+ freshers in the most ambitious morning routine challenge of 2026. Wake up at 5AM, log your progress daily, and win 1000 points.', 'free_event', now() + interval '7 days', 60, 500, 'Neha Kapoor', 'Legend Creator & Habit Coach at Day1 Diaries', true, '8153ed0a-a0d1-70c2-91be-8bcbac441fd1'),
('From Fresher to Team Lead in 18 Months — Live AMA', 'Rahul Kumar shares the exact strategies that took him from fresher to team lead. Live Q&A included.', 'webinar', now() + interval '14 days', 90, 200, 'Rahul Kumar', 'Product Manager & Day1 Diaries Top Creator', true, '8153ed0a-a0d1-70c2-91be-8bcbac441fd1'),
('Career Coaching Masterclass', 'A 2-hour masterclass covering salary negotiation, personal branding, and networking that actually works.', 'workshop', now() + interval '21 days', 120, 100, 'Vikram Singh', 'Senior Product Manager & Career Coach', true, '8153ed0a-a0d1-70c2-91be-8bcbac441fd1')
ON CONFLICT DO NOTHING;

-- ── 12. EVENT REGISTRATIONS ──────────────────────────────────────
INSERT INTO event_registrations (event_id, user_id)
SELECT e.id, p.id FROM community_updates e
CROSS JOIN LATERAL (SELECT id FROM profiles ORDER BY random() LIMIT 6) p
ON CONFLICT DO NOTHING;

UPDATE community_updates SET seats_booked = (SELECT count(*) FROM event_registrations WHERE event_id = community_updates.id);

-- ── 13. LANDING TESTIMONIALS ─────────────────────────────────────
INSERT INTO landing_testimonials (name, role, quote, sort_order, is_active) VALUES
('Priya Rao', 'Software Engineer, Bangalore', 'I thought I was the only one who felt completely lost on Day 1. Then I read 200 stories just like mine. That was the first time I felt like I''d be okay.', 1, true),
('Rahul Kumar', 'Marketing Lead, Hyderabad', 'I''ve tried building a reading habit five times and failed every time. With 8,000 people tracking the same habit alongside me, I just hit 28 days. First time ever.', 2, true),
('Sneha Reddy', 'Finance Fresher, Pune', 'I shared my most embarrassing Day 1 story not expecting anyone to care. It got 891 likes. I''ve made more genuine connections here than on LinkedIn in 3 years.', 3, true);

-- ── DONE ─────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM profiles) AS profiles,
  (SELECT count(*) FROM stories) AS stories,
  (SELECT count(*) FROM likes) AS likes,
  (SELECT count(*) FROM comments) AS comments,
  (SELECT count(*) FROM saves) AS saves,
  (SELECT count(*) FROM follows) AS follows,
  (SELECT count(*) FROM user_habits) AS user_habits,
  (SELECT count(*) FROM habit_logs) AS habit_logs,
  (SELECT count(*) FROM habit_challenges) AS challenges,
  (SELECT count(*) FROM challenge_participations) AS challenge_participants,
  (SELECT count(*) FROM community_updates) AS events,
  (SELECT count(*) FROM event_registrations) AS event_registrations,
  (SELECT count(*) FROM landing_testimonials) AS testimonials;
