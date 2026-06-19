// ============================================================
// Email Workflow Scheduler — in-process ticker (no Redis/SQS
// needed since ECS Fargate keeps this Express process alive).
//
// Ticks every 60s and claims due workflows with
// `FOR UPDATE SKIP LOCKED` inside a transaction, updating
// next_run_at/status before COMMIT. That claim is what keeps this
// safe if the API ever scales to >1 ECS task — only one task's
// transaction can lock a given row, so a workflow only fires once
// per due cycle no matter how many replicas are ticking.
// ============================================================

const cronParser = require('cron-parser')
const { pool } = require('../db/pool')
const { resolveAudience } = require('./emailAudience')
const { createAndProcessSend } = require('./emailSender')

const TICK_MS = 60 * 1000
let timer = null

async function claimDueWorkflows() {
  const client = await pool.connect()
  const claimed = []
  try {
    await client.query('BEGIN')
    const { rows: due } = await client.query(
      `SELECT * FROM email_workflows
       WHERE status = 'active' AND next_run_at IS NOT NULL AND next_run_at <= now()
       FOR UPDATE SKIP LOCKED`
    )
    for (const wf of due) {
      let nextRunAt = null
      let status = wf.status
      if (wf.schedule_type === 'recurring' && wf.cron_expression) {
        try {
          const interval = cronParser.parseExpression(wf.cron_expression, { tz: wf.timezone || 'Asia/Kolkata', currentDate: new Date() })
          nextRunAt = interval.next().toDate()
        } catch (err) {
          console.error(`[emailScheduler] bad cron for workflow ${wf.id}:`, err.message)
          status = 'paused'
        }
      } else {
        // one_time (or immediate, which shouldn't normally reach the
        // ticker — it's run synchronously on activation) — done after this run.
        status = 'archived'
      }
      await client.query(
        `UPDATE email_workflows SET next_run_at = $1, last_run_at = now(), status = $2, updated_at = now() WHERE id = $3`,
        [nextRunAt, status, wf.id]
      )
      claimed.push(wf)
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[emailScheduler] claim error:', err.message)
  } finally {
    client.release()
  }
  return claimed
}

async function runWorkflow(wf) {
  try {
    const { rows: templates } = await pool.query('SELECT * FROM email_templates WHERE id = $1', [wf.template_id])
    const { rows: audiences } = await pool.query('SELECT * FROM email_audiences WHERE id = $1', [wf.audience_id])
    const template = templates[0]
    const audience = audiences[0]
    if (!template || !audience) {
      console.error(`[emailScheduler] workflow ${wf.id} missing template/audience`)
      return
    }
    const rows = await resolveAudience(audience.source, audience.filters || {})
    await createAndProcessSend({
      workflowId: wf.id,
      template,
      rows,
      triggerType: wf.schedule_type === 'recurring' ? 'recurring' : 'scheduled',
    })
  } catch (err) {
    console.error(`[emailScheduler] workflow ${wf.id} run failed:`, err.message)
  }
}

async function tick() {
  const due = await claimDueWorkflows()
  // Run sends after the claiming transaction commits, in parallel,
  // without blocking the next tick.
  await Promise.allSettled(due.map(runWorkflow))
}

function start() {
  if (timer) return
  timer = setInterval(() => { tick().catch(err => console.error('[emailScheduler] tick error:', err.message)) }, TICK_MS)
  console.log('[emailScheduler] started (60s tick)')
}

module.exports = { start, tick }
