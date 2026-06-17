/**
 * Day1 Diaries — Seed Script
 * Inserts: 100 users, 300 stories, 50 habits, 10 challenges, 50 jobs
 * Run: node infrastructure/seed_data.js
 * Uses local .env from backend/
 */
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') })

const { Pool } = require('pg')
const crypto = require('crypto')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'day1diaries',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
})

const uuid = () => crypto.randomUUID()

// ── Helpers ──────────────────────────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const randArr = (arr, n) => [...arr].sort(() => .5 - Math.random()).slice(0, n)

// ── Data pools ────────────────────────────────────────────────────
const firstNames = ['Arjun','Priya','Rahul','Anjali','Vikram','Neha','Aditya','Sneha','Rohit','Kavya','Karthik','Pooja','Suresh','Divya','Manoj','Riya','Amit','Swathi','Raj','Meera','Dev','Nisha','Siddharth','Lavanya','Harish','Deepa','Varun','Shruti','Ganesh','Ananya','Akash','Rekha','Vivek','Preeti','Krishna','Vidya','Sachin','Asha','Mohan','Jyoti','Naveen','Radha','Pavan','Sunita','Ramu','Chitra','Sanjay','Usha','Ramesh','Geetha','Alok','Bharati','Ajay','Shobha','Bala','Saranya','Hari','Padma','Sunil','Malathi','Anand','Revathi','Kunal','Nandini','Vijay','Sangeetha','Ravi','Vani','Arun','Shantha','Murali','Kamala','Suresh','Latha','Kishore','Sudha','Prakash','Mala','Teja','Rani','Abhi','Suma','Gopal','Saritha','Prem','Hema','Sudhir','Shashi','Venkat','Kavitha','Balaji','Usha','Dinesh','Srimathi','Rajan','Nalini','Madhu','Subha']
const lastNames = ['Kumar','Sharma','Reddy','Patel','Singh','Rao','Nair','Iyer','Pillai','Gupta','Joshi','Mehta','Shah','Das','Bose','Verma','Tiwari','Mishra','Pandey','Srivastava','Agarwal','Banerjee','Chatterjee','Ghosh','Mukherjee','Roy','Sen','Dutta','Chakraborty','Mandal']
const cities = ['Bengaluru','Mumbai','Chennai','Hyderabad','Delhi','Pune','Kolkata','Ahmedabad','Jaipur','Kochi','Chandigarh','Lucknow','Nagpur','Surat','Coimbatore','Mysuru','Vizag','Bhopal','Patna','Vadodara']
const bios = [
  'Software engineer | First-gen professional sharing raw stories from corporate life',
  'MBA graduate navigating the maze of corporate politics and coffee machines',
  'Finance analyst who survived Day 1 to tell the tale',
  'Product manager | Turning chaos into roadmaps since Day 1',
  'Marketing maven with imposter syndrome and lots of caffeine',
  'HR professional helping others have better Day 1s than mine',
  'Data scientist who accidentally replied-all on my first week',
  'Designer turning confusion into clarity, one pixel at a time',
  'Sales executive — rejected 20 times before lunch on Day 1',
  'Operations lead | Making chaos look organized since my first day',
  'Full-stack dev who pushed to production on Day 1. It was fine. Mostly.',
  'Growth hacker | Started with zero followers and zero clue',
  'Startup founder who failed twice before finding the right path',
  'Content creator documenting the unfiltered journey of professional life',
  'Consultant who once got lost looking for the bathroom on Day 1',
]

const STORY_CATEGORIES = ['First Day at Job','First Startup Experience','First Business Client','First College Day','First Failure','First Success','Habit Transformation']

const storyTitles = {
  'First Day at Job': [
    'I accidentally replied-all to the entire company on Day 1','My first day was a complete disaster — and I survived','Walked into the wrong meeting room and stayed anyway','The badge that wouldn\'t work — my first hour at the job','How I spilled coffee on my manager\'s laptop on Day 1','I showed up 2 hours early and waited in the parking lot','My onboarding checklist had 47 items. I understood 3.','The Zoom call where I forgot to unmute for 20 minutes','First day anxiety vs reality: what nobody tells you','Lost on the office campus for 45 minutes before finding my desk',
  ],
  'First Startup Experience': [
    'We had 3 employees, 1 laptop and $500 in the bank','How we went from garage to Series A in 18 months','The startup that almost killed me — and what I learned','Building a product nobody asked for: our first pivot story','From 10 users to 10,000: the messy middle nobody talks about','Our first investor meeting — we wore suits in a chai shop','Burning out at 23 while building something I loved','The day the server went down and we lost our biggest client','Hiring our first employee changed everything','How we almost shut down three times before finding product-market fit',
  ],
  'First Business Client': [
    'Landing our first paying customer at ₹500/month','The cold call that changed everything','How I convinced a Fortune 500 to try our MVP','First client ghosted us — here\'s what we did next','Closing a ₹10 lakh deal with zero experience','The proposal I rewrote 14 times before sending','My first sales demo: everything that could go wrong did','How I turned a "no" into our best long-term client','Referral magic: how one happy client became ten','Negotiating my first contract at 22 years old',
  ],
  'First College Day': [
    'Ragging, roommates, and reality — my first day at IIT','From small town to big city hostel: culture shock edition','I cried in the bathroom on my first day at college','How I made my best friends in the first 24 hours','The scholarship kid adjusting to a rich kids\' college','Walking into NIT on Day 1 with one suitcase and big dreams','My first mess food experience: survival guide','Lost in a campus bigger than my hometown','Engineering or arts? My battle with parental expectations','The night before Day 1: no sleep, pure anxiety',
  ],
  'First Failure': [
    'I failed my probation and it was the best thing that happened','The startup that crashed and burned in 90 days','Failing the CAT three times before I changed direction','My first product launch was a total flop — here\'s why','Bankruptcy at 26: what I learned losing everything','The interview rejection that reoriented my entire career','I quit my dream job in 6 months. No regrets.','When your startup idea gets copied by a bigger company','Failing publicly on social media: my viral embarrassment','The promotion I didn\'t get — and what I did about it',
  ],
  'First Success': [
    'The day we crossed ₹1 crore in revenue — I couldn\'t stop shaking','Getting promoted 3 levels in 2 years at my first job','My blog hit 1 million readers — from a bedroom in Pune','How I got into IIM without coaching','Landing a job at Google fresh out of tier-3 college','The app I built in 30 days that got acquired','My TEDx talk at 25 and the panic that preceded it','First time I hired someone: the responsibility hit different','Winning the national business plan competition as an undergrad','Going from intern to team lead in 18 months',
  ],
  'Habit Transformation': [
    'How waking up at 5 AM changed my career trajectory','30 days no phone in the morning — here\'s what I discovered','I meditated every day for a year. This is what happened.','Running changed my relationship with failure','Reading 52 books in a year: the habits that made it possible','How I went from couch to half-marathon in 3 months','The journaling habit that saved my mental health','Cold showers for 90 days: productivity or punishment?','Digital detox for 30 days while working a tech job','I stopped scrolling social media for 6 months',
  ],
}

const storyContents = [
  `Day 1 was nothing like I expected. I had rehearsed everything — my introduction, my questions, my outfit. But reality had other plans.\n\nI arrived at the office 30 minutes early, which seemed smart until I realized nobody else was there. The receptionist hadn't arrived, the badges weren't programmed, and the coffee machine was broken.\n\nBy 9 AM, I had been assigned a laptop that couldn't connect to the WiFi, placed in a "temporary" desk that would be mine for four months, and introduced to sixteen people whose names I immediately forgot.\n\nBut here's what nobody tells you about Day 1: it's not about impressing anyone. It's about surviving. And I survived.\n\nWhat I learned: ask more questions, write everything down, and bring your own coffee.`,

  `The first startup I joined had no formal onboarding. The founder literally pointed at a desk, said "that's yours," and walked back into a meeting.\n\nI spent the first three days figuring out where the bathroom was, what the product actually did, and why everyone looked like they hadn't slept.\n\nSix months later, I understood. We were building something impossible on a timeline that made no sense with a team held together by shared delusion and exceptional chai.\n\nI wouldn't trade it for anything.`,

  `My first client meeting was at 11 AM on a Tuesday. I had prepared slides, research, a backup plan, and a backup to the backup plan.\n\nI showed up at 10:30. The client showed up at 12:15.\n\nBut when he finally walked in, something clicked. He wasn't looking for a perfect presentation. He was looking for someone who understood his problem.\n\nI closed the deal that day — not because of my slides, but because I listened.\n\nRevenue: ₹50,000. Lessons: priceless.`,

  `Nobody talks about the loneliness of Day 1 at college.\n\nEveryone looked like they already had their friend group, their story, their confidence. I felt like I was watching a movie I hadn't auditioned for.\n\nBut somewhere around 11 PM, in a hostel common room, eating instant noodles with three strangers who were just as lost as I was — something shifted.\n\nThose three people are still my closest friends today.`,

  `I failed. Spectacularly. Publicly. In ways that still make me cringe at 2 AM.\n\nThe product I spent eight months building had six users. My co-founder left. The investors passed. The company dissolved into a silence that felt very loud.\n\nBut failure has this strange way of introducing you to yourself. You find out what you're actually made of when everything you built is gone.\n\nTurns out, I'm made of the kind of stuff that starts over.`,

  `The first month of waking up at 5 AM, I hated it. My alarm felt like a personal attack.\n\nBy month two, something started to shift. An hour of uninterrupted time before the world woke up became the most productive part of my day.\n\nBy month three, I was shipping more work, reading more books, and feeling genuinely calm for the first time in years.\n\nThe habit didn't change my circumstances. It changed my relationship with my circumstances. That turned out to matter more.`,
]

const habitData = [
  {title:'Morning Pages',description:'Write 3 pages of stream-of-consciousness every morning to clear mental clutter and unlock creativity.',icon:'✍️',category:'Mindfulness'},
  {title:'5 AM Wake-Up',description:'Start your day before the world. Use the quiet hours for deep work, exercise, or reflection.',icon:'🌅',category:'Productivity'},
  {title:'Daily Meditation',description:'10 minutes of focused breathing and mindfulness to reduce anxiety and improve focus.',icon:'🧘',category:'Mindfulness'},
  {title:'Reading 30 Min/Day',description:'Build a consistent reading habit — 30 minutes a day adds up to 12+ books a year.',icon:'📚',category:'Learning'},
  {title:'10,000 Steps Daily',description:'Walk your way to better health. Track your steps and hit 10K before bed.',icon:'🚶',category:'Fitness'},
  {title:'No Phone First Hour',description:'Reclaim your morning. No social media, no news, no notifications for the first 60 minutes.',icon:'📵',category:'Digital Wellness'},
  {title:'Daily Gratitude Journal',description:'Write 3 things you\'re grateful for every evening. Rewire your brain toward positivity.',icon:'🙏',category:'Mindfulness'},
  {title:'Cold Shower Challenge',description:'3-minute cold shower every morning. Builds resilience, improves circulation, beats procrastination.',icon:'🚿',category:'Fitness'},
  {title:'Weekly Deep Work',description:'Block 4 hours every week for focused, distraction-free work on your most important project.',icon:'💻',category:'Productivity'},
  {title:'Daily Pushups',description:'Start with 10, build to 50. Simple bodyweight exercise you can do anywhere, anytime.',icon:'💪',category:'Fitness'},
  {title:'Inbox Zero',description:'Process your email to zero every day. Triage, respond, delete, archive — nothing lingers.',icon:'📧',category:'Productivity'},
  {title:'Learn 5 New Words',description:'Expand your vocabulary daily. Use a dictionary app or word-a-day service and use each word in a sentence.',icon:'🔤',category:'Learning'},
  {title:'Evening Walk',description:'30-minute walk after dinner aids digestion, clears your head, and improves sleep quality.',icon:'🌙',category:'Fitness'},
  {title:'No Sugar Weekdays',description:'Cut refined sugar Monday to Friday. Cheat days allowed on weekends for sustainability.',icon:'🍎',category:'Health'},
  {title:'2L Water Daily',description:'Drink 2 litres of water every day. Set reminders, use a marked bottle, stay hydrated.',icon:'💧',category:'Health'},
  {title:'One Skill Per Month',description:'Pick one skill and spend 30 minutes on it every day for a month. Piano, Python, Spanish — your choice.',icon:'🎯',category:'Learning'},
  {title:'Weekly Review',description:'Every Sunday, review your week: what worked, what didn\'t, what you\'ll do differently. Adjust and plan forward.',icon:'📋',category:'Productivity'},
  {title:'Digital Detox Sunday',description:'One full day offline every week. No social media, no news, no screens beyond the essentials.',icon:'🌿',category:'Digital Wellness'},
  {title:'Daily Pushups Ladder',description:'Day 1: 1 pushup. Day 2: 2. Keep going for 30 days. By the end you\'ll do 30 pushups without thinking.',icon:'🔼',category:'Fitness'},
  {title:'Read Before Bed',description:'Replace 30 minutes of screen time before bed with a physical book. Better sleep, more books.',icon:'🌛',category:'Learning'},
  {title:'Stretch Every Morning',description:'5-10 minutes of light stretching right after you wake up. Reduces stiffness and sets the tone.',icon:'🤸',category:'Fitness'},
  {title:'One Compliment Daily',description:'Give one genuine, specific compliment to someone every day. Builds relationships and brightens days.',icon:'💛',category:'Relationships'},
  {title:'Save ₹100 Daily',description:'Transfer ₹100 to savings every day before spending anything else. Automatic wealth building.',icon:'💰',category:'Finance'},
  {title:'No Gossip Challenge',description:'30 days without speaking negatively about someone behind their back. Hard but transformative.',icon:'🤐',category:'Mindfulness'},
  {title:'Weekly Call With Family',description:'Schedule one call with a family member every week. 15 minutes of intentional connection.',icon:'📞',category:'Relationships'},
  {title:'Afternoon Walk',description:'10-minute walk after lunch. Beats the post-lunch slump, improves digestion, resets focus.',icon:'☀️',category:'Fitness'},
  {title:'Learn To Cook',description:'Cook one new dish every week. Saves money, improves health, builds a surprisingly useful life skill.',icon:'🍳',category:'Life Skills'},
  {title:'Public Speaking',description:'Record a 2-minute video of yourself speaking on any topic, every day for 30 days. Watch yourself improve.',icon:'🎤',category:'Career'},
  {title:'LinkedIn Post Weekly',description:'Share one professional insight, story, or lesson on LinkedIn every week. Build your professional brand.',icon:'💼',category:'Career'},
  {title:'Declutter 10 Items',description:'Remove 10 items from your home every week — donate, sell, or discard. Reduce noise, increase clarity.',icon:'🗑️',category:'Life Skills'},
  {title:'Daily Spanish (Duolingo)',description:'10 minutes of Spanish every day. A new language opens new worlds, opportunities, and conversations.',icon:'🇪🇸',category:'Learning'},
  {title:'Track Every Rupee',description:'Log every expense, no matter how small. Awareness is the first step to financial control.',icon:'📊',category:'Finance'},
  {title:'No Snooze Challenge',description:'When the alarm rings, get up. No snooze, no "five more minutes." 30 days of winning the first battle.',icon:'⏰',category:'Productivity'},
  {title:'Yoga Nidra Before Sleep',description:'20-minute guided yoga nidra meditation before sleep. Equivalent to 3-4 hours of rest for the nervous system.',icon:'🌙',category:'Health'},
  {title:'Weekly Fasting',description:'One 16-hour intermittent fast per week. Rest your digestion, reset your relationship with food.',icon:'⚡',category:'Health'},
  {title:'Daily Art Practice',description:'Draw, sketch, or doodle for 10 minutes every day. Builds creativity and makes you better at explaining ideas.',icon:'🎨',category:'Creativity'},
  {title:'Podcast Learning Hour',description:'Replace commute music with educational podcasts. 1 hour/day = 365 hours of learning per year.',icon:'🎧',category:'Learning'},
  {title:'Stand While Working',description:'Alternate between sitting and standing every 45 minutes. Better posture, more energy, fewer back problems.',icon:'🧍',category:'Health'},
  {title:'No Alcohol Weekdays',description:'Keep alcohol to weekends only. Clearer mornings, better sleep, sharper thinking Monday to Friday.',icon:'🚫',category:'Health'},
  {title:'Power Nap',description:'20-minute nap between 1-3 PM when possible. Proven to restore alertness and boost afternoon performance.',icon:'😴',category:'Health'},
  {title:'Weekly Volunteering',description:'Give 2 hours a week to a cause you care about. Builds community, perspective, and genuine satisfaction.',icon:'🤝',category:'Relationships'},
  {title:'Morning Run',description:'30-minute run before breakfast. Fasted cardio burns fat, clears your head, and starts the day with a win.',icon:'🏃',category:'Fitness'},
  {title:'Visualization Practice',description:'Spend 5 minutes every morning visualizing your goals as already achieved. Programs your reticular activating system.',icon:'🔮',category:'Mindfulness'},
  {title:'Weekly Mentor Call',description:'Schedule a 30-minute call with a mentor or someone more experienced. One insight per call compounds enormously.',icon:'📡',category:'Career'},
  {title:'Daily Affirmations',description:'Write or speak 5 positive affirmations every morning. Reprograms limiting beliefs over time.',icon:'✨',category:'Mindfulness'},
  {title:'Phone-Free Meals',description:'No phone during any meal. Just food, presence, and conversation. Start with one meal a day.',icon:'🍽️',category:'Digital Wellness'},
  {title:'Deep Breathing',description:'4-7-8 breathing: inhale 4 counts, hold 7, exhale 8. Do this 3 times when stressed. Instant calm.',icon:'🌬️',category:'Health'},
  {title:'Finish What You Start',description:'Complete every task you begin before starting the next. Builds momentum and eliminates half-finished energy drains.',icon:'✅',category:'Productivity'},
  {title:'Weekly Planning',description:'Every Sunday evening, plan the week ahead in detail. Know your top 3 priorities before Monday begins.',icon:'🗓️',category:'Productivity'},
  {title:'Two-Minute Rule',description:'If a task takes less than 2 minutes, do it immediately. Reduces the pile, eliminates procrastination on small things.',icon:'⚡',category:'Productivity'},
  {title:'Learn Keyboard Shortcuts',description:'Spend 5 minutes a day learning keyboard shortcuts for your most-used apps. Saves 20+ minutes daily within a month.',icon:'⌨️',category:'Productivity'},
]

const challengeData = [
  {title:'30-Day 5 AM Club',description:'Wake up at 5 AM every day for 30 days. Transform your mornings and claim your most productive hours.',duration_days:30,reward_points:1500,daily_points:50,weekly_points:400,status:'active'},
  {title:'100 Pushup Challenge',description:'Build up to 100 consecutive pushups in 60 days. Simple, effective, transformative.',duration_days:60,reward_points:2000,daily_points:30,weekly_points:250,status:'active'},
  {title:'21-Day Meditation Sprint',description:'Meditate for at least 10 minutes every day for 21 days. Science says that\'s how long habits take to form.',duration_days:21,reward_points:800,daily_points:40,weekly_points:300,status:'active'},
  {title:'30-Day Reading Challenge',description:'Read for 30 minutes every day for 30 days. At least one book must be completed.',duration_days:30,reward_points:1000,daily_points:35,weekly_points:280,status:'upcoming'},
  {title:'Digital Detox Month',description:'No social media scrolling for 30 days. Only intentional use: posting, messaging, searching. No doomscrolling.',duration_days:30,reward_points:1200,daily_points:40,weekly_points:350,status:'active'},
  {title:'52-Week Savings Challenge',description:'Save ₹100 in week 1, ₹200 in week 2... ₹5200 in week 52. Total: ₹1,37,800 saved in a year.',duration_days:365,reward_points:5000,daily_points:10,weekly_points:100,status:'active'},
  {title:'6-Week Running Plan',description:'Go from zero to running 5K without stopping in 6 weeks. Structured daily workouts included.',duration_days:42,reward_points:1800,daily_points:45,weekly_points:350,status:'upcoming'},
  {title:'14-Day Journaling Kickstart',description:'Write every day for 14 days — morning pages, evening reflections, or stream-of-consciousness. Build the habit.',duration_days:14,reward_points:600,daily_points:45,weekly_points:350,status:'active'},
  {title:'90-Day Career Glow-Up',description:'Daily tasks to level up your professional presence: LinkedIn, skills, networking, portfolio.',duration_days:90,reward_points:4000,daily_points:45,weekly_points:350,status:'upcoming'},
  {title:'30-Day No Junk Food',description:'30 days without processed junk food: chips, soda, instant noodles. Home-cooked meals only.',duration_days:30,reward_points:1200,daily_points:40,weekly_points:320,status:'active'},
]

const jobStreams = [
  {department:'Technology',titles:['Frontend Developer','Backend Engineer','Full Stack Developer','DevOps Engineer','Data Scientist','ML Engineer','iOS Developer','Android Developer','QA Engineer','Cloud Architect']},
  {department:'Marketing',titles:['Digital Marketing Manager','SEO Specialist','Content Strategist','Social Media Manager','Performance Marketing Lead','Brand Manager','Email Marketing Specialist','Growth Hacker','Marketing Analyst','Influencer Marketing Lead']},
  {department:'Finance',titles:['Financial Analyst','Accounts Manager','Tax Consultant','Chartered Accountant','Investment Analyst','Risk Manager','Treasury Manager','Budget Analyst','Audit Executive','CFO (Startup)']},
  {department:'Human Resources',titles:['HR Business Partner','Talent Acquisition Lead','L&D Manager','Compensation & Benefits Manager','HR Analyst','Employee Engagement Lead','Recruiter','HRIS Specialist','Diversity & Inclusion Lead','People Operations Manager']},
  {department:'Design',titles:['Product Designer','UX Researcher','UI Designer','Brand Identity Designer','Motion Designer','Design Lead','Graphic Designer','Web Designer','Design Systems Lead','Illustrator']},
]

const jobLocations = ['Bengaluru','Mumbai','Hyderabad','Chennai','Delhi','Pune','Remote','Hybrid — Bengaluru','Hybrid — Mumbai','Hybrid — Hyderabad']
const jobTypes = ['Full-time','Part-time','Contract','Internship']

async function seed() {
  const client = await pool.connect()
  try {
    console.log('Starting seed...')

    // ── 100 Users ──────────────────────────────────────────────
    console.log('Creating 100 users...')
    const userIds = []
    for (let i = 0; i < 100; i++) {
      const id = uuid()
      const firstName = pick(firstNames)
      const lastName = pick(lastNames)
      const fullName = `${firstName} ${lastName}`
      const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${rand(10,999)}`
      const email = `${username}@day1diaries.dev`
      const score = rand(0, 5000)
      const level = score >= 5000 ? 'Achiever' : score >= 1000 ? 'Explorer' : 'Beginner'

      await client.query(
        `INSERT INTO profiles (id, username, full_name, email, bio, location, score, coins, level, is_private)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (username) DO NOTHING`,
        [id, username, fullName, email, pick(bios), pick(cities), score, score, level, Math.random() < 0.2]
      )
      userIds.push(id)
    }
    console.log(`Created ${userIds.length} users`)

    // ── 300 Stories ────────────────────────────────────────────
    console.log('Creating 300 stories...')
    for (let i = 0; i < 300; i++) {
      const category = pick(STORY_CATEGORIES)
      const titles = storyTitles[category]
      const title = titles[i % titles.length] + (i >= titles.length ? ` — Part ${Math.floor(i/titles.length)+1}` : '')
      const content = pick(storyContents) + `\n\n---\n*Story ${i+1} of 300. Category: ${category}.*`
      const likes = rand(0, 500)
      const comments = rand(0, 80)
      const daysAgo = rand(1, 365)
      const createdAt = new Date(Date.now() - daysAgo * 86400000)
      const tags = randArr(['career','startup','life','growth','habits','mindset','india','fresher','corporate','day1'], rand(2,4))

      await client.query(
        `INSERT INTO stories (id, user_id, title, content, category, tags, status, likes_count, comments_count, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,'published',$7,$8,$9)`,
        [uuid(), pick(userIds), title, content, category, tags, likes, comments, createdAt]
      )
    }
    console.log('Created 300 stories')

    // ── Update stories_count on profiles ──────────────────────
    await client.query(`
      UPDATE profiles SET stories_count = (
        SELECT COUNT(*) FROM stories WHERE stories.user_id = profiles.id AND stories.status = 'published'
      )
    `)

    // ── 50 Habits ──────────────────────────────────────────────
    console.log('Creating 50 habits...')
    const habitIds = []
    for (let i = 0; i < Math.min(50, habitData.length); i++) {
      const h = habitData[i]
      const id = uuid()
      await client.query(
        `INSERT INTO habits (id, title, description, icon, category, adopters_count, completion_rate, is_active, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8)`,
        [id, h.title, h.description, h.icon, h.category, rand(10, 2000), rand(30, 92), pick(userIds)]
      )
      habitIds.push(id)
    }
    console.log('Created 50 habits')

    // ── 10 Challenges ──────────────────────────────────────────
    console.log('Creating 10 challenges...')
    for (let i = 0; i < challengeData.length; i++) {
      const c = challengeData[i]
      const startDate = new Date(Date.now() - rand(0, 30) * 86400000)
      const endDate = new Date(startDate.getTime() + c.duration_days * 86400000)
      await client.query(
        `INSERT INTO habit_challenges (id, habit_id, title, description, duration_days, start_date, end_date, reward_points, daily_points, weekly_points, status, participants_count, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [uuid(), habitIds[i] || pick(habitIds), c.title, c.description, c.duration_days, startDate, endDate, c.reward_points, c.daily_points, c.weekly_points, c.status, rand(5, 500), pick(userIds)]
      )
    }
    console.log('Created 10 challenges')

    // ── 50 Jobs ────────────────────────────────────────────────
    console.log('Creating 50 jobs...')
    for (let i = 0; i < 50; i++) {
      const stream = jobStreams[i % jobStreams.length]
      const titleList = stream.titles
      const title = titleList[Math.floor(i / jobStreams.length) % titleList.length]
      const salMin = rand(3, 25) * 100000
      const salMax = salMin + rand(2, 15) * 100000

      await client.query(
        `INSERT INTO careers_jobs (id, title, department, location, job_type, salary_min, salary_max, description, requirements, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)`,
        [
          uuid(),
          title,
          stream.department,
          pick(jobLocations),
          pick(jobTypes),
          salMin,
          salMax,
          `We are looking for a talented ${title} to join our ${stream.department} team. You will work on challenging problems, collaborate with smart people, and build products that impact millions of users across India and beyond.\n\nThis is a high-growth opportunity with excellent learning potential and competitive compensation.`,
          `• 1-5 years of relevant experience\n• Strong fundamentals in ${stream.department}\n• Excellent communication skills\n• Ability to work in a fast-paced environment\n• Team player with a growth mindset\n• Bonus: Prior startup or product company experience`,
        ]
      )
    }
    console.log('Created 50 jobs')

    console.log('\n✅ Seed complete!')
    console.log('  100 users | 300 stories | 50 habits | 10 challenges | 50 jobs')

  } catch (err) {
    console.error('Seed error:', err.message)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
