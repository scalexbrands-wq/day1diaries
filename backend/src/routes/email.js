const express = require('express')
const cronParser = require('cron-parser')
const { pool } = require('../db/pool')
const { requireAuth, requireRole } = require('../middleware/auth')
const audiences = require('../services/emailAudience')
const { createAndProcessSend, testSend } = require('../services/emailSender')
const { render, extractVariables } = require('../utils/emailRender')

const router = express.Router()
router.use(requireAuth, requireRole('admin'))

const CATEGORIES = ['welcome', 'story', 'habit', 'challenge', 'event', 'leaderboard', 'certificate', 'weekly_digest', 'monthly_digest', 'custom']

// ════════════════════════════════════════════════════════════
// TEMPLATES
// ════════════════════════════════════════════════════════════

router.get('/templates', async (req, res) => {
  const status = req.query.status
  const { rows } = await pool.query(
    status
      ? `SELECT * FROM email_templates WHERE status = $1 ORDER BY updated_at DESC`
      : `SELECT * FROM email_templates WHERE status != 'archived' ORDER BY updated_at DESC`,
    status ? [status] : []
  )
  res.json({ templates: rows })
})

router.post('/templates', async (req, res) => {
  const { name, category, subject, html_body, preview_text } = req.body
  if (!name || !CATEGORIES.includes(category) || !subject || !html_body) {
    return res.status(400).json({ error: 'name, valid category, subject and html_body are required' })
  }
  const variables = extractVariables(subject + ' ' + html_body)
  const { rows } = await pool.query(
    `INSERT INTO email_templates (name, category, subject, html_body, preview_text, variables, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [name, category, subject, html_body, preview_text || null, JSON.stringify(variables), req.profile.id]
  )
  res.status(201).json({ template: rows[0] })
})

router.get('/templates/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM email_templates WHERE id = $1', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Template not found' })
  res.json({ template: rows[0] })
})

router.put('/templates/:id', async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM email_templates WHERE id = $1', [req.params.id])
  if (!existingRows.length) return res.status(404).json({ error: 'Template not found' })
  const existing = existingRows[0]

  const name = req.body.name ?? existing.name
  const category = req.body.category ?? existing.category
  const subject = req.body.subject ?? existing.subject
  const html_body = req.body.html_body ?? existing.html_body
  const preview_text = req.body.preview_text ?? existing.preview_text
  const status = req.body.status ?? existing.status
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' })

  const contentChanged = subject !== existing.subject || html_body !== existing.html_body
  let newVersion = existing.current_version

  if (contentChanged) {
    // Snapshot the OLD content before overwriting, so version history is restorable.
    await pool.query(
      `INSERT INTO email_template_versions (template_id, version, subject, html_body, created_by)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (template_id, version) DO NOTHING`,
      [existing.id, existing.current_version, existing.subject, existing.html_body, existing.created_by]
    )
    newVersion = existing.current_version + 1
  }

  const variables = extractVariables(subject + ' ' + html_body)
  const { rows } = await pool.query(
    `UPDATE email_templates SET name=$1, category=$2, subject=$3, html_body=$4, preview_text=$5, status=$6, variables=$7, current_version=$8, updated_at=now()
     WHERE id=$9 RETURNING *`,
    [name, category, subject, html_body, preview_text, status, JSON.stringify(variables), newVersion, req.params.id]
  )
  res.json({ template: rows[0] })
})

router.post('/templates/:id/clone', async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM email_templates WHERE id = $1', [req.params.id])
  if (!existingRows.length) return res.status(404).json({ error: 'Template not found' })
  const t = existingRows[0]
  const { rows } = await pool.query(
    `INSERT INTO email_templates (name, category, subject, html_body, preview_text, variables, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [`${t.name} (Copy)`, t.category, t.subject, t.html_body, t.preview_text, JSON.stringify(t.variables), req.profile.id]
  )
  res.status(201).json({ template: rows[0] })
})

router.post('/templates/:id/archive', async (req, res) => {
  const { rows } = await pool.query(`UPDATE email_templates SET status='archived', updated_at=now() WHERE id=$1 RETURNING *`, [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Template not found' })
  res.json({ template: rows[0] })
})

router.post('/templates/:id/restore', async (req, res) => {
  const { rows } = await pool.query(`UPDATE email_templates SET status='draft', updated_at=now() WHERE id=$1 RETURNING *`, [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Template not found' })
  res.json({ template: rows[0] })
})

router.get('/templates/:id/versions', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM email_template_versions WHERE template_id = $1 ORDER BY version DESC`,
    [req.params.id]
  )
  res.json({ versions: rows })
})

router.post('/templates/:id/versions/:version/restore', async (req, res) => {
  const { rows: versionRows } = await pool.query(
    `SELECT * FROM email_template_versions WHERE template_id = $1 AND version = $2`,
    [req.params.id, req.params.version]
  )
  if (!versionRows.length) return res.status(404).json({ error: 'Version not found' })
  const v = versionRows[0]
  const { rows: existingRows } = await pool.query('SELECT * FROM email_templates WHERE id = $1', [req.params.id])
  const existing = existingRows[0]
  if (!existing) return res.status(404).json({ error: 'Template not found' })

  await pool.query(
    `INSERT INTO email_template_versions (template_id, version, subject, html_body, created_by)
     VALUES ($1,$2,$3,$4,$5) ON CONFLICT (template_id, version) DO NOTHING`,
    [existing.id, existing.current_version, existing.subject, existing.html_body, existing.created_by]
  )
  const { rows } = await pool.query(
    `UPDATE email_templates SET subject=$1, html_body=$2, current_version=$3, updated_at=now() WHERE id=$4 RETURNING *`,
    [v.subject, v.html_body, existing.current_version + 1, req.params.id]
  )
  res.json({ template: rows[0] })
})

router.post('/templates/:id/preview', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM email_templates WHERE id = $1', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Template not found' })
  const t = rows[0]
  const sampleVariables = req.body.sampleVariables || {}
  res.json({
    subject: render(t.subject, sampleVariables),
    html: render(t.html_body, sampleVariables),
  })
})

router.post('/templates/:id/test-send', async (req, res) => {
  const { toEmail, toName, sampleVariables } = req.body
  if (!toEmail) return res.status(400).json({ error: 'toEmail is required' })
  const { rows } = await pool.query('SELECT * FROM email_templates WHERE id = $1', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Template not found' })
  const result = await testSend({ template: rows[0], toEmail, toName, sampleVariables })
  if (!result.success) return res.status(502).json({ error: result.error || 'Send failed' })
  res.json({ success: true })
})

// ════════════════════════════════════════════════════════════
// AUDIENCES
// ════════════════════════════════════════════════════════════

router.get('/audiences/sources', (req, res) => {
  res.json({ sources: audiences.listSources() })
})

router.post('/audiences/preview', async (req, res) => {
  const { source, filters } = req.body
  try {
    const result = await audiences.previewAudience(source, filters || {})
    res.json(result)
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message })
  }
})

router.get('/audiences', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM email_audiences ORDER BY updated_at DESC')
  res.json({ audiences: rows })
})

router.post('/audiences', async (req, res) => {
  const { name, description, source, filters } = req.body
  if (!name || !source) return res.status(400).json({ error: 'name and source are required' })
  if (!audiences.listSources().some(s => s.id === source)) return res.status(400).json({ error: 'Unknown audience source' })
  try {
    const { rows } = await pool.query(
      `INSERT INTO email_audiences (name, description, source, filters, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, description || null, source, JSON.stringify(filters || {}), req.profile.id]
    )
    res.status(201).json({ audience: rows[0] })
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message })
  }
})

router.get('/audiences/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM email_audiences WHERE id = $1', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Audience not found' })
  res.json({ audience: rows[0] })
})

router.put('/audiences/:id', async (req, res) => {
  const { name, description, source, filters } = req.body
  const { rows } = await pool.query(
    `UPDATE email_audiences SET name=COALESCE($1,name), description=COALESCE($2,description),
       source=COALESCE($3,source), filters=COALESCE($4,filters), updated_at=now()
     WHERE id=$5 RETURNING *`,
    [name, description, source, filters ? JSON.stringify(filters) : null, req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Audience not found' })
  res.json({ audience: rows[0] })
})

router.delete('/audiences/:id', async (req, res) => {
  const { rows } = await pool.query('DELETE FROM email_audiences WHERE id = $1 RETURNING id', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Audience not found' })
  res.json({ success: true })
})

router.post('/audiences/:id/preview', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM email_audiences WHERE id = $1', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Audience not found' })
  const a = rows[0]
  try {
    const result = await audiences.previewAudience(a.source, a.filters || {})
    res.json(result)
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
// WORKFLOWS
// ════════════════════════════════════════════════════════════

function computeNextRunAt({ schedule_type, scheduled_at, cron_expression, timezone }) {
  if (schedule_type === 'one_time') return scheduled_at ? new Date(scheduled_at) : null
  if (schedule_type === 'recurring' && cron_expression) {
    const interval = cronParser.parseExpression(cron_expression, { tz: timezone || 'Asia/Kolkata' })
    return interval.next().toDate()
  }
  return null // immediate — handled synchronously on activate
}

router.get('/workflows', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT w.*, t.name AS template_name, a.name AS audience_name
     FROM email_workflows w
     JOIN email_templates t ON t.id = w.template_id
     JOIN email_audiences a ON a.id = w.audience_id
     ORDER BY w.updated_at DESC`
  )
  res.json({ workflows: rows })
})

router.post('/workflows', async (req, res) => {
  const { name, template_id, audience_id, schedule_type, scheduled_at, cron_expression, timezone } = req.body
  if (!name || !template_id || !audience_id || !['immediate', 'one_time', 'recurring'].includes(schedule_type)) {
    return res.status(400).json({ error: 'name, template_id, audience_id and a valid schedule_type are required' })
  }
  if (schedule_type === 'one_time' && !scheduled_at) return res.status(400).json({ error: 'scheduled_at is required for one_time workflows' })
  if (schedule_type === 'recurring' && !cron_expression) return res.status(400).json({ error: 'cron_expression is required for recurring workflows' })

  let next_run_at
  try {
    next_run_at = computeNextRunAt({ schedule_type, scheduled_at, cron_expression, timezone })
  } catch (err) {
    return res.status(400).json({ error: `Invalid cron_expression: ${err.message}` })
  }

  const { rows } = await pool.query(
    `INSERT INTO email_workflows (name, template_id, audience_id, schedule_type, scheduled_at, cron_expression, timezone, next_run_at, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [name, template_id, audience_id, schedule_type, scheduled_at || null, cron_expression || null, timezone || 'Asia/Kolkata', next_run_at, req.profile.id]
  )
  res.status(201).json({ workflow: rows[0] })
})

router.get('/workflows/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM email_workflows WHERE id = $1', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Workflow not found' })
  res.json({ workflow: rows[0] })
})

router.put('/workflows/:id', async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM email_workflows WHERE id = $1', [req.params.id])
  if (!existingRows.length) return res.status(404).json({ error: 'Workflow not found' })
  const existing = existingRows[0]

  const merged = {
    name: req.body.name ?? existing.name,
    template_id: req.body.template_id ?? existing.template_id,
    audience_id: req.body.audience_id ?? existing.audience_id,
    schedule_type: req.body.schedule_type ?? existing.schedule_type,
    scheduled_at: req.body.scheduled_at ?? existing.scheduled_at,
    cron_expression: req.body.cron_expression ?? existing.cron_expression,
    timezone: req.body.timezone ?? existing.timezone,
  }

  let next_run_at
  try {
    next_run_at = computeNextRunAt(merged)
  } catch (err) {
    return res.status(400).json({ error: `Invalid cron_expression: ${err.message}` })
  }

  const { rows } = await pool.query(
    `UPDATE email_workflows SET name=$1, template_id=$2, audience_id=$3, schedule_type=$4, scheduled_at=$5,
       cron_expression=$6, timezone=$7, next_run_at=$8, updated_at=now()
     WHERE id=$9 RETURNING *`,
    [merged.name, merged.template_id, merged.audience_id, merged.schedule_type, merged.scheduled_at,
     merged.cron_expression, merged.timezone, next_run_at, req.params.id]
  )
  res.json({ workflow: rows[0] })
})

router.delete('/workflows/:id', async (req, res) => {
  const { rows } = await pool.query('DELETE FROM email_workflows WHERE id = $1 RETURNING id', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Workflow not found' })
  res.json({ success: true })
})

async function loadWorkflowWithRelations(id) {
  const { rows } = await pool.query('SELECT * FROM email_workflows WHERE id = $1', [id])
  if (!rows.length) return null
  const workflow = rows[0]
  const { rows: templateRows } = await pool.query('SELECT * FROM email_templates WHERE id = $1', [workflow.template_id])
  const { rows: audienceRows } = await pool.query('SELECT * FROM email_audiences WHERE id = $1', [workflow.audience_id])
  return { workflow, template: templateRows[0], audience: audienceRows[0] }
}

router.post('/workflows/:id/activate', async (req, res) => {
  const data = await loadWorkflowWithRelations(req.params.id)
  if (!data || !data.template || !data.audience) return res.status(404).json({ error: 'Workflow, template or audience not found' })
  const { workflow, template, audience } = data

  if (workflow.schedule_type === 'immediate') {
    const rows = await audiences.resolveAudience(audience.source, audience.filters || {})
    createAndProcessSend({ workflowId: workflow.id, template, rows, triggerType: 'scheduled', triggeredBy: req.profile.id })
      .catch(err => console.error(`[email] immediate workflow ${workflow.id} send failed:`, err.message))
    const { rows: updated } = await pool.query(
      `UPDATE email_workflows SET status='archived', last_run_at=now(), updated_at=now() WHERE id=$1 RETURNING *`,
      [workflow.id]
    )
    return res.json({ workflow: updated[0] })
  }

  const { rows: updated } = await pool.query(
    `UPDATE email_workflows SET status='active', updated_at=now() WHERE id=$1 RETURNING *`,
    [workflow.id]
  )
  res.json({ workflow: updated[0] })
})

router.post('/workflows/:id/pause', async (req, res) => {
  const { rows } = await pool.query(`UPDATE email_workflows SET status='paused', updated_at=now() WHERE id=$1 RETURNING *`, [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Workflow not found' })
  res.json({ workflow: rows[0] })
})

router.post('/workflows/:id/run-now', async (req, res) => {
  const data = await loadWorkflowWithRelations(req.params.id)
  if (!data || !data.template || !data.audience) return res.status(404).json({ error: 'Workflow, template or audience not found' })
  const { workflow, template, audience } = data
  const rows = await audiences.resolveAudience(audience.source, audience.filters || {})
  createAndProcessSend({ workflowId: workflow.id, template, rows, triggerType: 'manual_send_now', triggeredBy: req.profile.id })
    .catch(err => console.error(`[email] run-now workflow ${workflow.id} failed:`, err.message))
  await pool.query(`UPDATE email_workflows SET last_run_at=now(), updated_at=now() WHERE id=$1`, [workflow.id])
  res.json({ success: true, recipientCount: rows.length })
})

// ════════════════════════════════════════════════════════════
// SENDS (logs)
// ════════════════════════════════════════════════════════════

router.get('/sends', async (req, res) => {
  const page = parseInt(req.query.page) || 0
  const limit = parseInt(req.query.limit) || 50
  const workflowId = req.query.workflow_id
  const { rows } = await pool.query(
    workflowId
      ? `SELECT s.*, t.name AS template_name FROM email_sends s JOIN email_templates t ON t.id = s.template_id
         WHERE s.workflow_id = $1 ORDER BY s.created_at DESC LIMIT $2 OFFSET $3`
      : `SELECT s.*, t.name AS template_name FROM email_sends s JOIN email_templates t ON t.id = s.template_id
         ORDER BY s.created_at DESC LIMIT $1 OFFSET $2`,
    workflowId ? [workflowId, limit, page * limit] : [limit, page * limit]
  )
  res.json({ sends: rows })
})

router.get('/sends/:id/recipients', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM email_recipients WHERE send_id = $1 ORDER BY sent_at DESC NULLS LAST`,
    [req.params.id]
  )
  res.json({ recipients: rows })
})

module.exports = router
