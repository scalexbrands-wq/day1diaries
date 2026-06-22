// One-off seed: populates the Community page with realistic launch content
// across the 4 categories admins asked for — news, free webinars, paid
// webinars, and workshops (52 rows total, ≥50 requested). created_by is
// left null so this doesn't depend on any specific admin account existing.
//
// Re-running is safe but not idempotent — it INSERTs fresh rows each time
// (no unique key to upsert against), so don't run this twice without
// clearing old seed rows first if you don't want duplicates.
//
// Usage (production): run as a one-off ECS task overriding the command,
// same as the other scripts/ files in this directory.

require('dotenv').config()
const { pool } = require('../src/db/pool')

const DAY_MS = 24 * 60 * 60 * 1000
const daysFromNow = (n) => new Date(Date.now() + n * DAY_MS).toISOString()
const daysAgo = (n) => new Date(Date.now() - n * DAY_MS).toISOString()

const NEWS = [
  'Day1 Diaries crosses 50,000 published stories!',
  'New: AI Tribute feature lets you gift a friend\'s story as a certificate',
  'Day1 Diaries launches regional language support for Hindi, Tamil, Telugu, Malayalam & Kannada',
  'Meet our Top 10 Contributors of the Month',
  'Day1 Diaries partners with StartupTN to spotlight first-day stories from founders',
  'New Habit Tracker module is live — turn your Day 1 lessons into daily routines',
  'Day1 Diaries Membership Program launches with exclusive perks',
  'Community guidelines update: building a safer space for first-time storytellers',
  'Introducing Surprise A Friend — turn any story into a heartfelt gift',
  'Day1 Diaries mobile experience gets a fresh redesign',
  'Over 200 companies now featured in our Careers section',
  'Day1 Diaries Wallet — earn coins for engagement, redeem real rewards',
  'Behind the scenes: how we built the AI-powered story translation engine',
].map((title, i) => ({
  title,
  description: `${title}. Read the full update on the Day1 Diaries community feed.`,
  event_type: 'community_news',
  is_published: true,
  // Spread across the recent past so the feed doesn't look like it all
  // landed in the same second.
  created_at_offset_days: i,
}))

const FREE_WEBINARS = [
  ['Surviving Your First Week at a New Job', 'Aditi Rao', 'Senior HR Business Partner, Infosys'],
  ['How to Write a Story That Gets Noticed', 'Karan Mehta', 'Content Lead, Day1 Diaries'],
  ['From Intern to Full-Time: Career Lessons from Freshers', 'Sneha Pillai', 'Campus Hiring Manager, TCS'],
  ['Building Confidence on Day 1: A Fresher\'s Guide', 'Rohan Iyer', 'Organizational Psychologist'],
  ['Decoding Corporate Jargon for First-Time Employees', 'Megha Nair', 'L&D Consultant'],
  ['Mental Health at Work: Starting Strong Without Burning Out', 'Dr. Ananya Krishnan', 'Workplace Wellness Coach'],
  ['Networking 101: Making Your First Work Friends', 'Vikram Suresh', 'Community Manager, Day1 Diaries'],
  ['Remote Work Realities: Lessons from First-Day Freshers', 'Pooja Reddy', 'Remote Ops Lead, Zoho'],
  ['Personal Branding for Early-Career Professionals', 'Arjun Kapoor', 'LinkedIn Top Voice'],
  ['How Habits Shape Your First 90 Days at Work', 'Divya Menon', 'Behavioral Coach'],
  ['Ask Me Anything: HR Leaders on What They Look for in New Hires', 'Sanjay Bhatt', 'VP HR, Wipro'],
  ['Turning Failure into Fuel: First-Day Mistakes That Taught Us the Most', 'Riya Chawla', 'Day1 Diaries Contributor'],
  ['Women in Tech: Navigating Your First Job with Confidence', 'Lakshmi Venkat', 'Engineering Manager, Freshworks'],
]

const PAID_WEBINARS = [
  ['Masterclass: Negotiating Your First Salary', 'Nikhil Saxena', 'Career Coach & Ex-Recruiter', 499],
  ['LinkedIn Branding Bootcamp for Freshers', 'Tanvi Shah', 'Personal Branding Strategist', 299],
  ['Resume & Interview Intensive: Crack Your Next Role', 'Abhishek Joshi', 'Talent Acquisition Lead, Accenture', 599],
  ['Public Speaking for Early Professionals', 'Meera Krishnamurthy', 'Toastmasters Trainer', 399],
  ['Excel + Data Skills Crash Course for New Hires', 'Suresh Pillai', 'Data Analytics Trainer', 349],
  ['From Fresher to Manager: A 5-Year Career Roadmap', 'Priya Desai', 'Engineering Director, Swiggy', 699],
  ['Workplace Communication Mastery', 'Rahul Bose', 'Soft Skills Trainer', 349],
  ['Building Your First Personal Finance Plan as a Working Professional', 'Anjali Mathur', 'Certified Financial Planner', 299],
  ['Cracking Product/Tech Interviews: Insider Tips', 'Varun Khanna', 'Senior SDE, Amazon', 799],
  ['Time Management for First-Time Employees', 'Shalini Rao', 'Productivity Coach', 249],
  ['Building a Standout Portfolio in Your First Year', 'Ishaan Verma', 'Design Lead, Razorpay', 449],
  ['Leadership Foundations for Early-Career Talent', 'Geeta Subramaniam', 'Leadership Coach', 599],
  ['Advanced Storytelling: Turn Your Day 1 Into a Personal Brand', 'Karan Mehta', 'Content Lead, Day1 Diaries', 399],
]

const WORKSHOPS = [
  ['Hands-On Resume Building Workshop', 'Sneha Pillai', 'Campus Hiring Manager, TCS', 0],
  ['Storytelling Workshop: Craft Your Day 1 Narrative', 'Karan Mehta', 'Content Lead, Day1 Diaries', 0],
  ['Mock Interview Workshop with Industry Mentors', 'Abhishek Joshi', 'Talent Acquisition Lead, Accenture', 499],
  ['LinkedIn Profile Makeover Workshop', 'Tanvi Shah', 'Personal Branding Strategist', 0],
  ['Habit-Building Workshop: Design Your First 30 Days', 'Divya Menon', 'Behavioral Coach', 0],
  ['Public Speaking Workshop for Freshers', 'Meera Krishnamurthy', 'Toastmasters Trainer', 349],
  ['Personal Finance Workshop for First Salary Earners', 'Anjali Mathur', 'Certified Financial Planner', 0],
  ['Portfolio Building Workshop for Designers & Developers', 'Ishaan Verma', 'Design Lead, Razorpay', 599],
  ['Career Goal-Setting Workshop', 'Geeta Subramaniam', 'Leadership Coach', 0],
  ['Email & Workplace Etiquette Workshop', 'Rahul Bose', 'Soft Skills Trainer', 0],
  ['Negotiation Skills Workshop', 'Nikhil Saxena', 'Career Coach & Ex-Recruiter', 449],
  ['Networking & Personal Branding Workshop', 'Vikram Suresh', 'Community Manager, Day1 Diaries', 0],
  ['Stress Management & Mindfulness Workshop for New Joinees', 'Dr. Ananya Krishnan', 'Workplace Wellness Coach', 0],
]

function buildEventRows() {
  const rows = []
  FREE_WEBINARS.forEach(([title, speaker_name, speaker_bio], i) => rows.push({
    title, speaker_name, speaker_bio,
    description: `Join ${speaker_name} for a free live session: "${title}". Open to all Day1 Diaries members — register to save your seat.`,
    event_type: 'webinar', price: 0,
    event_date: daysFromNow(7 + i * 7), duration_mins: 60, seats_available: 150 + i * 10,
    zoom_link: 'https://zoom.us/j/00000000000', is_published: true,
  }))
  PAID_WEBINARS.forEach(([title, speaker_name, speaker_bio, price], i) => rows.push({
    title, speaker_name, speaker_bio,
    description: `A premium live masterclass with ${speaker_name}: "${title}". Limited seats, certificate of participation included.`,
    event_type: 'webinar', price,
    event_date: daysFromNow(10 + i * 7), duration_mins: 75, seats_available: 80 + i * 5,
    zoom_link: 'https://zoom.us/j/00000000000', is_published: true,
  }))
  WORKSHOPS.forEach(([title, speaker_name, speaker_bio, price], i) => rows.push({
    title, speaker_name, speaker_bio,
    description: `A hands-on workshop led by ${speaker_name}: "${title}". Bring your laptop — this is a working session, not a lecture.`,
    event_type: 'workshop', price,
    event_date: daysFromNow(14 + i * 7), duration_mins: 120, seats_available: 60 + i * 5,
    zoom_link: 'https://zoom.us/j/00000000000', is_published: true,
  }))
  return rows
}

async function main() {
  let inserted = 0

  for (const n of NEWS) {
    await pool.query(
      `INSERT INTO community_updates (title, description, event_type, is_published, created_at)
       VALUES ($1,$2,$3,$4, now() - interval '1 day' * $5)`,
      [n.title, n.description, n.event_type, n.is_published, n.created_at_offset_days]
    )
    inserted++
  }

  for (const e of buildEventRows()) {
    await pool.query(
      `INSERT INTO community_updates
         (title, description, event_type, event_date, duration_mins, seats_available,
          speaker_name, speaker_bio, zoom_link, price, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [e.title, e.description, e.event_type, e.event_date, e.duration_mins, e.seats_available,
       e.speaker_name, e.speaker_bio, e.zoom_link, e.price, e.is_published]
    )
    inserted++
  }

  console.log(`Seeded ${inserted} community_updates rows (${NEWS.length} news, ${FREE_WEBINARS.length} free webinars, ${PAID_WEBINARS.length} paid webinars, ${WORKSHOPS.length} workshops).`)
}

main().catch(err => { console.error(err); process.exitCode = 1 }).finally(() => pool.end())
