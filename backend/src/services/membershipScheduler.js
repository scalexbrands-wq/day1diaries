// ============================================================
// Membership Expiry/Renewal-Reminder Scheduler — same in-process
// ticker pattern as services/emailScheduler.js. Runs hourly:
//   1. Expires memberships past end_date, fires "Expired" email once.
//   2. Flags memberships inside the configurable renewal-reminder
//      window and fires "Expiring Soon" once (guarded by
//      expiry_reminder_sent_at so it never double-sends).
// ============================================================

const { pool } = require('../db/pool')
const { TEMPLATE_NAMES, sendMembershipEmail } = require('./membershipEmails')

const TICK_MS = 60 * 60 * 1000 // 1 hour
let timer = null

async function getReminderDays() {
  const { rows } = await pool.query(`SELECT value FROM app_settings WHERE key = 'membership.renewal_reminder_days'`)
  const value = rows[0]?.value
  return typeof value === 'number' ? value : 7
}

async function expireDueMemberships() {
  const { rows } = await pool.query(
    `UPDATE memberships SET status='expired', updated_at=now()
     WHERE status='active' AND end_date IS NOT NULL AND end_date < CURRENT_DATE
     RETURNING *`
  )
  for (const membership of rows) {
    const { rows: profileRows } = await pool.query('SELECT * FROM profiles WHERE id = $1', [membership.user_id])
    const { rows: planRows } = await pool.query('SELECT name FROM membership_plans WHERE id = $1', [membership.plan_id])
    const profile = profileRows[0]
    if (!profile?.email) continue
    await sendMembershipEmail(TEMPLATE_NAMES.EXPIRED, profile.email, profile.full_name || profile.username, {
      plan_name: planRows[0]?.name || 'membership',
      end_date: new Date(membership.end_date).toLocaleDateString('en-IN'),
    }).catch(err => console.error('[membershipScheduler] expired email failed', err.message))
  }
}

async function sendExpiryReminders() {
  const reminderDays = await getReminderDays()
  const { rows } = await pool.query(
    `UPDATE memberships SET expiry_reminder_sent_at = now()
     WHERE status='active' AND end_date IS NOT NULL
       AND end_date <= CURRENT_DATE + ($1 || ' days')::interval
       AND expiry_reminder_sent_at IS NULL
     RETURNING *`,
    [reminderDays]
  )
  for (const membership of rows) {
    const { rows: profileRows } = await pool.query('SELECT * FROM profiles WHERE id = $1', [membership.user_id])
    const { rows: planRows } = await pool.query('SELECT name FROM membership_plans WHERE id = $1', [membership.plan_id])
    const profile = profileRows[0]
    if (!profile?.email) continue
    await sendMembershipEmail(TEMPLATE_NAMES.EXPIRING, profile.email, profile.full_name || profile.username, {
      plan_name: planRows[0]?.name || 'membership',
      end_date: new Date(membership.end_date).toLocaleDateString('en-IN'),
    }).catch(err => console.error('[membershipScheduler] expiring email failed', err.message))
  }
}

async function tick() {
  await expireDueMemberships()
  await sendExpiryReminders()
}

function start() {
  if (timer) return
  timer = setInterval(() => { tick().catch(err => console.error('[membershipScheduler] tick error:', err.message)) }, TICK_MS)
  console.log('[membershipScheduler] started (60min tick)')
}

module.exports = { start, tick }
