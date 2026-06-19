// One-off seed: inserts 5 starter templates per Email Center category
// (50 total) so admins have ready-to-clone examples instead of a blank
// editor. Safe to re-run — skips any name that already exists.
//
// Usage: node scripts/seedEmailTemplates.js   (run from backend/)

require('dotenv').config()
const { pool } = require('../src/db/pool')
const { extractVariables } = require('../src/utils/emailRender')

const shell = (preheader, bodyHtml) => `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1A0800;">
  <div style="background:#FF6B2B;padding:18px 24px;border-radius:12px 12px 0 0;">
    <span style="color:#fff;font-size:18px;font-weight:700;">Day1 Diaries</span>
  </div>
  <div style="background:#fff;padding:28px 24px;border:1px solid #F0EAE4;border-top:none;border-radius:0 0 12px 12px;">
    ${bodyHtml}
  </div>
  <p style="color:#8C7B6E;font-size:11px;text-align:center;margin-top:16px;">
    ${preheader} · Day1 Diaries, the community for every fresher's first day.
  </p>
</div>`

const templates = [
  // ── WELCOME ──────────────────────────────────────────────────
  { category: 'welcome', name: 'Welcome - Classic', subject: 'Welcome to Day1 Diaries, {{name}}! 🎉',
    html_body: shell('Welcome email', `<p>Hi {{name}},</p><p>Welcome to <b>Day1 Diaries</b> — the community where freshers share their first-day stories, build habits, and grow together.</p><p>You're starting at <b>{{level}}</b> level with <b>{{coins}} coins</b>. Share your first story to earn more!</p><p>— The Day1 Diaries Team</p>`) },
  { category: 'welcome', name: 'Welcome - Casual', subject: "Hey {{name}}, you're in! 👋",
    html_body: shell('Welcome email', `<p>Hey {{name}} 👋</p><p>So glad you joined us. Day1 Diaries is built by freshers, for freshers — real stories, real habits, zero judgment.</p><p>Your username is <b>@{{username}}</b>. Go say hi to the community!</p>`) },
  { category: 'welcome', name: 'Welcome - Minimal', subject: 'Welcome, {{name}}',
    html_body: shell('Welcome email', `<p>Hi {{name}}, your Day1 Diaries account is ready.</p><p>Email: {{email}}<br/>Username: {{username}}</p><p>Get started by writing your first story.</p>`) },
  { category: 'welcome', name: 'Welcome - Gamified', subject: '🏆 {{name}}, your journey starts now!',
    html_body: shell('Welcome email', `<p>{{name}}, welcome aboard! 🎮</p><p>Current stats:</p><ul><li>Level: <b>{{level}}</b></li><li>Score: <b>{{score}}</b></li><li>Coins: <b>{{coins}}</b></li></ul><p>Adopt a habit today to start climbing the leaderboard!</p>`) },
  { category: 'welcome', name: 'Welcome - Community Invite', subject: '{{name}}, your community is waiting',
    html_body: shell('Welcome email', `<p>Hi {{name}},</p><p>Thousands of freshers are sharing their Day 1 stories right now. Yours could be next.</p><p>Tap into the Feed, follow a few categories, and post your first story this week.</p>`) },

  // ── STORY ────────────────────────────────────────────────────
  { category: 'story', name: 'Story - Published Confirmation', subject: 'Your story "{{story_title}}" is live!',
    html_body: shell('Story email', `<p>Hi {{name}},</p><p>Your story <b>{{story_title}}</b> in <b>{{category}}</b> is now live on Day1 Diaries.</p><p>Share it with friends to get more likes and comments!</p>`) },
  { category: 'story', name: 'Story - Category Roundup', subject: 'New stories in {{category}} this week',
    html_body: shell('Story email', `<p>Hi {{name}},</p><p>There are fresh stories in <b>{{category}}</b> waiting for you to read — including yours, "{{story_title}}".</p><p>Jump back into the Feed to catch up.</p>`) },
  { category: 'story', name: 'Story - Milestone Likes', subject: '🎉 "{{story_title}}" is getting noticed!',
    html_body: shell('Story email', `<p>{{name}}, your story <b>{{story_title}}</b> is picking up likes and comments in the {{category}} community.</p><p>Keep writing — your next one could go further!</p>`) },
  { category: 'story', name: 'Story - Write Reminder', subject: "{{name}}, haven't shared in a while?",
    html_body: shell('Story email', `<p>Hi {{name}},</p><p>Your last story was in <b>{{category}}</b>. The community would love to hear what's new with you.</p><p>Write your next Day1 Diaries entry today.</p>`) },
  { category: 'story', name: 'Story - Featured', subject: 'You\'re featured! "{{story_title}}" picked by our editors',
    html_body: shell('Story email', `<p>Congrats {{name}}!</p><p>Your story <b>{{story_title}}</b> has been featured on the Day1 Diaries homepage under {{category}}.</p><p>Thanks for sharing your journey with us.</p>`) },

  // ── HABIT ────────────────────────────────────────────────────
  { category: 'habit', name: 'Habit - Adoption Welcome', subject: "You're now tracking {{habit_title}}!",
    html_body: shell('Habit email', `<p>Hi {{name}},</p><p>You've adopted <b>{{habit_title}}</b> — you're on day {{current_day}} with a streak of {{streak}}.</p><p>Log today's progress to keep your streak alive!</p>`) },
  { category: 'habit', name: 'Habit - Streak Encouragement', subject: '🔥 {{streak}}-day streak on {{habit_title}}!',
    html_body: shell('Habit email', `<p>{{name}}, you're on a {{streak}}-day streak for <b>{{habit_title}}</b>! 🔥</p><p>Don't break it now — log today's habit to keep going.</p>`) },
  { category: 'habit', name: 'Habit - Streak At Risk', subject: "Don't lose your {{habit_title}} streak",
    html_body: shell('Habit email', `<p>Hi {{name}},</p><p>You haven't logged <b>{{habit_title}}</b> today yet. Your {{streak}}-day streak is waiting on you!</p>`) },
  { category: 'habit', name: 'Habit - Milestone', subject: 'Day {{current_day}} of {{habit_title}} — milestone reached!',
    html_body: shell('Habit email', `<p>{{name}}, you've hit day {{current_day}} of <b>{{habit_title}}</b>.</p><p>That's real consistency — keep it up!</p>`) },
  { category: 'habit', name: 'Habit - Weekly Summary', subject: 'Your {{habit_title}} week in review',
    html_body: shell('Habit email', `<p>Hi {{name}},</p><p>This week on <b>{{habit_title}}</b>: streak of {{streak}}, currently on day {{current_day}}.</p><p>See your full progress on your Day1 Diaries profile.</p>`) },

  // ── CHALLENGE ────────────────────────────────────────────────
  { category: 'challenge', name: 'Challenge - Joined Confirmation', subject: "You're in! {{challenge_title}} starts now",
    html_body: shell('Challenge email', `<p>Hi {{name}},</p><p>You've joined <b>{{challenge_title}}</b>. Log your progress daily to earn points and climb the leaderboard.</p>`) },
  { category: 'challenge', name: 'Challenge - Progress Update', subject: '{{points_earned}} points so far in {{challenge_title}}',
    html_body: shell('Challenge email', `<p>{{name}}, you've earned <b>{{points_earned}} points</b> with a streak of {{streak}} in <b>{{challenge_title}}</b>.</p><p>Keep going to finish strong!</p>`) },
  { category: 'challenge', name: 'Challenge - Final Stretch', subject: 'Almost there — {{challenge_title}} is wrapping up',
    html_body: shell('Challenge email', `<p>Hi {{name}},</p><p><b>{{challenge_title}}</b> is almost over. You're at {{points_earned}} points with a {{streak}}-day streak — finish strong!</p>`) },
  { category: 'challenge', name: 'Challenge - Completed', subject: '🏆 You completed {{challenge_title}}!',
    html_body: shell('Challenge email', `<p>Congrats {{name}}!</p><p>You finished <b>{{challenge_title}}</b> with {{points_earned}} points and a {{streak}}-day streak. Amazing work!</p>`) },
  { category: 'challenge', name: 'Challenge - Re-engage', subject: "{{challenge_title}} misses you, {{name}}",
    html_body: shell('Challenge email', `<p>Hi {{name}},</p><p>You're at {{points_earned}} points in <b>{{challenge_title}}</b> — log today's progress to keep your {{streak}}-day streak going.</p>`) },

  // ── EVENT ────────────────────────────────────────────────────
  { category: 'event', name: 'Event - Registration Confirmation', subject: "You're registered for {{event_title}}",
    html_body: shell('Event email', `<p>Hi {{name}},</p><p>You're confirmed for <b>{{event_title}}</b> on {{event_date}}. We'll send a reminder closer to the date.</p>`) },
  { category: 'event', name: 'Event - 24hr Reminder', subject: 'Tomorrow: {{event_title}}',
    html_body: shell('Event email', `<p>Hi {{name}},</p><p>Quick reminder — <b>{{event_title}}</b> is happening on {{event_date}}. Don't miss it!</p>`) },
  { category: 'event', name: 'Event - 1hr Reminder', subject: 'Starting soon: {{event_title}}',
    html_body: shell('Event email', `<p>{{name}}, <b>{{event_title}}</b> starts in about an hour ({{event_date}}). See you there!</p>`) },
  { category: 'event', name: 'Event - Thank You', subject: 'Thanks for joining {{event_title}}!',
    html_body: shell('Event email', `<p>Hi {{name}},</p><p>Thanks for attending <b>{{event_title}}</b>. We hope it was valuable — look out for more events soon.</p>`) },
  { category: 'event', name: 'Event - Recording Available', subject: 'Missed it? Recording of {{event_title}} is up',
    html_body: shell('Event email', `<p>Hi {{name}},</p><p>In case you missed <b>{{event_title}}</b> ({{event_date}}), the recording is now available in the Community tab.</p>`) },

  // ── LEADERBOARD ──────────────────────────────────────────────
  { category: 'leaderboard', name: 'Leaderboard - Weekly Rank', subject: "{{name}}, you're rank #{{rank}} this week",
    html_body: shell('Leaderboard email', `<p>Hi {{name}},</p><p>You're currently rank <b>#{{rank}}</b> at <b>{{level}}</b> level with a score of <b>{{score}}</b>.</p><p>Keep posting and adopting habits to climb higher!</p>`) },
  { category: 'leaderboard', name: 'Leaderboard - Level Up', subject: "🎉 You've reached {{level}} level!",
    html_body: shell('Leaderboard email', `<p>Congrats {{name}}!</p><p>You've leveled up to <b>{{level}}</b> with a score of {{score}} — currently rank #{{rank}}. Amazing progress!</p>`) },
  { category: 'leaderboard', name: 'Leaderboard - Top 10 Alert', subject: "You're #{{rank}} on the leaderboard, {{name}}!",
    html_body: shell('Leaderboard email', `<p>Hi {{name}},</p><p>With a score of <b>{{score}}</b>, you've hit rank <b>#{{rank}}</b> on the Day1 Diaries leaderboard. Keep it up!</p>`) },
  { category: 'leaderboard', name: 'Leaderboard - Catch Up Nudge', subject: 'Others are climbing — are you, {{name}}?',
    html_body: shell('Leaderboard email', `<p>Hi {{name}},</p><p>Your score is {{score}} at {{level}} level. Post a story or log a habit today to move up the leaderboard.</p>`) },
  { category: 'leaderboard', name: 'Leaderboard - Monthly Champion', subject: 'This month\'s leaderboard highlights',
    html_body: shell('Leaderboard email', `<p>Hi {{name}},</p><p>You ended the month at <b>{{level}}</b> level with {{score}} points and {{coins}} coins. Here's to an even bigger month ahead!</p>`) },

  // ── CERTIFICATE ──────────────────────────────────────────────
  { category: 'certificate', name: 'Certificate - Issued', subject: 'Your Day1 Diaries certificate is ready 🎓',
    html_body: shell('Certificate email', `<p>Hi {{name}},</p><p>Your contributor certificate for <b>{{job_title}}</b> at <b>{{company_name}}</b> is ready to download and share.</p>`) },
  { category: 'certificate', name: 'Certificate - Share Reminder', subject: 'Share your certificate, {{name}}!',
    html_body: shell('Certificate email', `<p>Hi {{name}},</p><p>Your Day1 Diaries certificate for {{job_title}} at {{company_name}} looks great on LinkedIn — share it with your network!</p>`) },
  { category: 'certificate', name: 'Certificate - LinkedIn Prompt', subject: 'Add your certificate to LinkedIn',
    html_body: shell('Certificate email', `<p>Hi {{name}},</p><p>Showcase your journey as {{job_title}} at {{company_name}} — add your Day1 Diaries certificate to your LinkedIn profile.</p>`) },
  { category: 'certificate', name: 'Certificate - Anniversary', subject: 'One year ago, your Day1 story began',
    html_body: shell('Certificate email', `<p>Hi {{name}},</p><p>It's been a year since your certificate for {{job_title}} at {{company_name}}. Look how far you've come!</p>`) },
  { category: 'certificate', name: 'Certificate - Update Available', subject: 'Your certificate has a new look',
    html_body: shell('Certificate email', `<p>Hi {{name}},</p><p>We've refreshed the certificate design. Re-download your {{job_title}} certificate from {{company_name}} anytime.</p>`) },

  // ── WEEKLY DIGEST ────────────────────────────────────────────
  { category: 'weekly_digest', name: 'Weekly Digest - Standard', subject: 'Your Day1 Diaries week in review',
    html_body: shell('Weekly digest', `<p>Hi {{name}},</p><p>Here's what happened on Day1 Diaries this week — new stories, habit streaks, and leaderboard moves.</p><p>Log in to catch up.</p>`) },
  { category: 'weekly_digest', name: 'Weekly Digest - Highlights', subject: 'This week\'s top stories & habits',
    html_body: shell('Weekly digest', `<p>Hi {{name}},</p><p>Top picks from the community this week, plus your personal habit and story stats.</p>`) },
  { category: 'weekly_digest', name: 'Weekly Digest - Personal Stats', subject: '{{name}}, your week by the numbers',
    html_body: shell('Weekly digest', `<p>Hi {{name}},</p><p>A quick look at your activity this week on Day1 Diaries — stories, habits, and community engagement.</p>`) },
  { category: 'weekly_digest', name: 'Weekly Digest - Community Buzz', subject: "What's trending on Day1 Diaries this week",
    html_body: shell('Weekly digest', `<p>Hi {{name}},</p><p>See what the community is talking about this week — trending stories, popular habits, and upcoming events.</p>`) },
  { category: 'weekly_digest', name: 'Weekly Digest - Minimal', subject: 'Your weekly Day1 Diaries summary',
    html_body: shell('Weekly digest', `<p>Hi {{name}}, here's your short weekly summary. Log in for the full picture.</p>`) },

  // ── MONTHLY DIGEST ───────────────────────────────────────────
  { category: 'monthly_digest', name: 'Monthly Digest - Standard', subject: 'Your Day1 Diaries month in review',
    html_body: shell('Monthly digest', `<p>Hi {{name}},</p><p>A full month of stories, habits, and community growth — here's your recap.</p>`) },
  { category: 'monthly_digest', name: 'Monthly Digest - Achievements', subject: 'Your achievements this month, {{name}}',
    html_body: shell('Monthly digest', `<p>Hi {{name}},</p><p>Look back at the habits you kept, the stories you shared, and how far you've climbed this month.</p>`) },
  { category: 'monthly_digest', name: 'Monthly Digest - Community Growth', subject: 'Day1 Diaries this month: community edition',
    html_body: shell('Monthly digest', `<p>Hi {{name}},</p><p>See how the Day1 Diaries community grew this month — new members, top stories, and standout habits.</p>`) },
  { category: 'monthly_digest', name: 'Monthly Digest - Goals Ahead', subject: 'New month, new goals — {{name}}',
    html_body: shell('Monthly digest', `<p>Hi {{name}},</p><p>As a new month begins, set fresh habit and story goals. Here's last month's recap to inspire you.</p>`) },
  { category: 'monthly_digest', name: 'Monthly Digest - Minimal', subject: 'Your monthly Day1 Diaries summary',
    html_body: shell('Monthly digest', `<p>Hi {{name}}, here's your short monthly summary. Log in for the full picture.</p>`) },

  // ── CUSTOM ───────────────────────────────────────────────────
  { category: 'custom', name: 'Custom - Blank Starter', subject: 'Subject line goes here',
    html_body: shell('Custom email', `<p>Hi {{name}},</p><p>Write your custom campaign message here. Use {{email}} or any other variable your audience source provides.</p>`) },
  { category: 'custom', name: 'Custom - Announcement', subject: '📢 An update from Day1 Diaries',
    html_body: shell('Custom email', `<p>Hi {{name}},</p><p>We have an announcement to share with the community. Replace this with your message.</p>`) },
  { category: 'custom', name: 'Custom - Survey Request', subject: '{{name}}, we\'d love your feedback',
    html_body: shell('Custom email', `<p>Hi {{name}},</p><p>Help us improve Day1 Diaries — share your feedback in this quick survey. Replace this link with your survey URL.</p>`) },
  { category: 'custom', name: 'Custom - Re-engagement', subject: "We miss you, {{name}}",
    html_body: shell('Custom email', `<p>Hi {{name}},</p><p>It's been a while! Come back and see what's new on Day1 Diaries.</p>`) },
  { category: 'custom', name: 'Custom - Promotional', subject: 'Something exciting just dropped',
    html_body: shell('Custom email', `<p>Hi {{name}},</p><p>Replace this with your promotional message — new feature, limited-time campaign, or partner offer.</p>`) },
]

async function seed() {
  let inserted = 0, skipped = 0
  for (const t of templates) {
    const { rows: existing } = await pool.query('SELECT id FROM email_templates WHERE name = $1', [t.name])
    if (existing.length) { skipped++; continue }
    const variables = extractVariables(t.subject + ' ' + t.html_body)
    await pool.query(
      `INSERT INTO email_templates (name, category, subject, html_body, variables, status)
       VALUES ($1,$2,$3,$4,$5,'active')`,
      [t.name, t.category, t.subject, t.html_body, JSON.stringify(variables)]
    )
    inserted++
  }
  console.log(`Seed complete: ${inserted} inserted, ${skipped} skipped (already existed).`)
  await pool.end()
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1) })
