const { pool } = require('../db/pool')

async function createNotification(userId, { type, title, body, link }) {
  if (!userId) return null
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [userId, type, title, body || null, link || null]
  )
  return rows[0]
}

module.exports = { createNotification }
