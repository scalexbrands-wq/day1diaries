const crypto = require('crypto')
const QRCode = require('qrcode')
const { pool } = require('../db/pool')
const { renderMembershipCard } = require('../utils/certificateRender')
const { renderMembershipCardHtml } = require('../templates/membershipCardTemplate')
const { getEmbeddedFontCss } = require('../utils/fontEmbed')
const imageStorage = require('../utils/imageStorage')
const { TEMPLATE_NAMES, sendMembershipEmail } = require('./membershipEmails')

const WEBSITE_URL = process.env.WEBSITE_URL || 'https://d1kxji3yv78nbx.cloudfront.net'

function generateMembershipNumber() {
  const code = crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 6)
  return `D1D-MEM-${code}`
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// Runs after the membership row is created — generates the card async
// (same 202-then-poll pattern as certificates) and emails the result.
async function generateCardAndNotify(membership, profile, plan, baseUrl) {
  const { rows: cardRows } = await pool.query(
    `INSERT INTO membership_cards (membership_id, qr_target_url, status) VALUES ($1,$2,'processing') RETURNING *`,
    [membership.id, `${WEBSITE_URL}/membership/verify/${membership.membership_number}`]
  )
  const card = cardRows[0]

  try {
    const qrCodeDataUri = await QRCode.toDataURL(card.qr_target_url, { width: 200, margin: 1 })
    const fontCss = await getEmbeddedFontCss()
    const html = renderMembershipCardHtml({
      fullName: profile.full_name || profile.username,
      avatarUrl: profile.avatar_url,
      membershipNumber: membership.membership_number,
      planName: plan.name,
      badgeEmoji: plan.badge_emoji,
      badgeColor: plan.badge_color,
      startDate: membership.start_date,
      endDate: membership.end_date,
      qrCodeDataUri,
    }, fontCss)

    const { pngBuffer, pdfBuffer } = await renderMembershipCard(html)
    const [cardImageUrl, cardPdfUrl] = await Promise.all([
      imageStorage.saveImage(`membership/${membership.membership_number}.png`, pngBuffer, 'image/png', baseUrl),
      imageStorage.saveImage(`membership/${membership.membership_number}.pdf`, pdfBuffer, 'application/pdf', baseUrl),
    ])

    await pool.query(
      `UPDATE membership_cards SET card_image_url=$1, card_pdf_url=$2, status='completed', updated_at=now() WHERE id=$3`,
      [cardImageUrl, cardPdfUrl, card.id]
    )

    await sendMembershipEmail(TEMPLATE_NAMES.CARD_READY, profile.email, profile.full_name || profile.username, {
      membership_number: membership.membership_number, plan_name: plan.name,
    })
  } catch (err) {
    console.error('Membership card render failed', err)
    await pool.query(`UPDATE membership_cards SET status='failed', updated_at=now() WHERE id=$1`, [card.id]).catch(() => {})
  }
}

// Approves an application: creates the active membership row, fires
// Approved + Activated + (first-time) Welcome Premium emails, and kicks
// off async card generation. Returns the new membership row.
async function approveApplication(applicationId, adminId, baseUrl) {
  const { rows: appRows } = await pool.query('SELECT * FROM membership_applications WHERE id = $1', [applicationId])
  const application = appRows[0]
  if (!application) throw Object.assign(new Error('Application not found'), { status: 404 })
  if (application.status === 'approved') throw Object.assign(new Error('Application already approved'), { status: 400 })

  const { rows: planRows } = await pool.query('SELECT * FROM membership_plans WHERE id = $1', [application.plan_id])
  const plan = planRows[0]
  if (!plan) throw Object.assign(new Error('Plan not found'), { status: 404 })

  const { rows: profileRows } = await pool.query('SELECT * FROM profiles WHERE id = $1', [application.user_id])
  const profile = profileRows[0]
  if (!profile) throw Object.assign(new Error('User profile not found'), { status: 404 })

  const startDate = new Date()
  const endDate = plan.duration_type === 'lifetime' ? null : addDays(startDate, plan.duration_days || 30)

  let membership
  for (let attempt = 0; attempt < 5 && !membership; attempt++) {
    const membershipNumber = generateMembershipNumber()
    try {
      const { rows } = await pool.query(
        `INSERT INTO memberships (user_id, plan_id, application_id, membership_number, status, start_date, end_date)
         VALUES ($1,$2,$3,$4,'active',$5,$6) RETURNING *`,
        [application.user_id, application.plan_id, application.id, membershipNumber, startDate, endDate]
      )
      membership = rows[0]
    } catch (err) {
      if (err.code !== '23505') throw err
    }
  }
  if (!membership) throw new Error('Could not generate a unique membership number')

  await pool.query(
    `UPDATE membership_applications SET status='approved', reviewed_by=$1, reviewed_at=now(), updated_at=now() WHERE id=$2`,
    [adminId, applicationId]
  )

  const emailVars = {
    plan_name: plan.name,
    membership_number: membership.membership_number,
    start_date: new Date(membership.start_date).toLocaleDateString('en-IN'),
    end_date: membership.end_date ? new Date(membership.end_date).toLocaleDateString('en-IN') : 'Lifetime',
  }
  const toName = profile.full_name || profile.username
  await sendMembershipEmail(TEMPLATE_NAMES.APPROVED, profile.email, toName, emailVars)
  await sendMembershipEmail(TEMPLATE_NAMES.ACTIVATED, profile.email, toName, emailVars)

  const { rows: priorMemberships } = await pool.query(
    'SELECT id FROM memberships WHERE user_id = $1 AND id != $2', [application.user_id, membership.id]
  )
  if (priorMemberships.length === 0) {
    await sendMembershipEmail(TEMPLATE_NAMES.WELCOME_PREMIUM, profile.email, toName, emailVars)
  }

  generateCardAndNotify(membership, profile, plan, baseUrl).catch(err => console.error('generateCardAndNotify failed', err))

  return membership
}

async function rejectApplication(applicationId, adminId, notes) {
  const { rows: appRows } = await pool.query('SELECT * FROM membership_applications WHERE id = $1', [applicationId])
  const application = appRows[0]
  if (!application) throw Object.assign(new Error('Application not found'), { status: 404 })

  const { rows: planRows } = await pool.query('SELECT name FROM membership_plans WHERE id = $1', [application.plan_id])
  const { rows: profileRows } = await pool.query('SELECT * FROM profiles WHERE id = $1', [application.user_id])
  const profile = profileRows[0]

  await pool.query(
    `UPDATE membership_applications SET status='rejected', admin_notes=$1, reviewed_by=$2, reviewed_at=now(), updated_at=now() WHERE id=$3`,
    [notes || null, adminId, applicationId]
  )

  if (profile?.email) {
    await sendMembershipEmail(TEMPLATE_NAMES.REJECTED, profile.email, profile.full_name || profile.username, {
      plan_name: planRows[0]?.name || 'membership',
      admin_notes: notes ? `Reason: ${notes}` : '',
    })
  }
}

module.exports = { generateMembershipNumber, approveApplication, rejectApplication, generateCardAndNotify }
