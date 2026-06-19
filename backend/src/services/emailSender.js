// ============================================================
// Email Sender — turns a resolved audience + template into a
// logged email_sends/email_recipients run, then delivers via Brevo.
// ============================================================

const { pool } = require('../db/pool')
const brevo = require('../utils/brevo')
const { render } = require('../utils/emailRender')

// rows: [{ user_id, email, name, ...templateVariables }]
async function createAndProcessSend({ workflowId, template, rows, triggerType, triggeredBy }) {
  const { rows: sendRows } = await pool.query(
    `INSERT INTO email_sends (workflow_id, template_id, template_version, trigger_type, status, total_recipients, started_at, triggered_by)
     VALUES ($1,$2,$3,$4,'processing',$5,now(),$6) RETURNING *`,
    [workflowId || null, template.id, template.current_version, triggerType, rows.length, triggeredBy || null]
  )
  const send = sendRows[0]

  if (rows.length === 0) {
    await pool.query(`UPDATE email_sends SET status='completed', completed_at=now() WHERE id=$1`, [send.id])
    return send
  }

  for (const row of rows) {
    const { user_id, email, name, ...variables } = row
    await pool.query(
      `INSERT INTO email_recipients (send_id, user_id, email, name, variables) VALUES ($1,$2,$3,$4,$5)`,
      [send.id, user_id || null, email, name || null, JSON.stringify({ name, email, ...variables })]
    )
  }

  const { rows: pending } = await pool.query(
    `SELECT * FROM email_recipients WHERE send_id = $1 AND status = 'pending'`,
    [send.id]
  )

  const messages = pending.map(r => ({
    to: r.email,
    toName: r.name,
    subject: render(template.subject, r.variables),
    htmlContent: render(template.html_body, r.variables),
    _recipientId: r.id,
  }))

  const results = await brevo.sendBatch(messages)

  let sentCount = 0, failedCount = 0
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const recipientId = messages[i]._recipientId
    if (result.success) {
      sentCount++
      await pool.query(
        `UPDATE email_recipients SET status='sent', brevo_message_id=$1, sent_at=now() WHERE id=$2`,
        [result.messageId || null, recipientId]
      )
    } else {
      failedCount++
      await pool.query(
        `UPDATE email_recipients SET status='failed', error=$1 WHERE id=$2`,
        [result.error || 'Unknown error', recipientId]
      )
    }
  }

  const finalStatus = failedCount === 0 ? 'completed' : (sentCount === 0 ? 'failed' : 'partial')
  await pool.query(
    `UPDATE email_sends SET status=$1, sent_count=$2, failed_count=$3, completed_at=now() WHERE id=$4`,
    [finalStatus, sentCount, failedCount, send.id]
  )

  return { ...send, status: finalStatus, sent_count: sentCount, failed_count: failedCount }
}

async function testSend({ template, toEmail, toName, sampleVariables }) {
  const variables = { name: toName || 'there', email: toEmail, ...sampleVariables }
  const { rows: sendRows } = await pool.query(
    `INSERT INTO email_sends (template_id, template_version, trigger_type, status, total_recipients, started_at)
     VALUES ($1,$2,'manual_test','processing',1,now()) RETURNING *`,
    [template.id, template.current_version]
  )
  const send = sendRows[0]

  const result = await brevo.sendTransactional({
    to: toEmail,
    toName,
    subject: render(template.subject, variables),
    htmlContent: render(template.html_body, variables),
  })

  await pool.query(
    `UPDATE email_sends SET status=$1, sent_count=$2, failed_count=$3, completed_at=now(), error=$4 WHERE id=$5`,
    [result.success ? 'completed' : 'failed', result.success ? 1 : 0, result.success ? 0 : 1, result.error || null, send.id]
  )

  return result
}

module.exports = { createAndProcessSend, testSend }
