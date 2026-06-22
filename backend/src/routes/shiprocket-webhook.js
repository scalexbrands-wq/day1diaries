// Shiprocket push-notification webhook — unauthenticated like
// gift.js's /razorpay/webhook, but verified via a configured secret
// header (Shiprocket echoes back whatever string you set in its
// dashboard) rather than an HMAC signature over the body.

const express = require('express')
const { pool } = require('../db/pool')
const shiprocket = require('../utils/shiprocket')
const { mapShiprocketStatus, notifyOrderParties } = require('../services/shipmentService')

const router = express.Router()

router.post('/webhook', async (req, res) => {
  const secret = req.headers['x-api-key'] || req.headers['x-shiprocket-secret']
  if (!shiprocket.verifyWebhookSecret(secret)) {
    return res.status(401).json({ error: 'Invalid webhook secret' })
  }

  const body = req.body || {}
  const awbCode = body.awb || body.awb_code
  const shiprocketOrderId = body.order_id ? String(body.order_id) : null
  if (!awbCode && !shiprocketOrderId) return res.json({ received: true })

  const { rows } = await pool.query(
    `SELECT s.*, g.id AS order_id FROM shipments s JOIN gift_orders g ON g.id = s.gift_order_id
     WHERE s.awb_code = $1 OR s.shiprocket_order_id = $2 LIMIT 1`,
    [awbCode || null, shiprocketOrderId]
  )
  const shipment = rows[0]
  if (!shipment) return res.json({ received: true })

  const status = mapShiprocketStatus(body.current_status || body.status)
  await pool.query(
    `INSERT INTO shipment_tracking_events (shipment_id, status, status_detail, location, raw_payload)
     VALUES ($1,$2,$3,$4,$5)`,
    [shipment.id, status, body.current_status || body.status || null, body.location || null, JSON.stringify(body)]
  )
  await pool.query(`UPDATE shipments SET status = $1, updated_at = now() WHERE id = $2`, [status, shipment.id])
  await pool.query(`UPDATE gift_orders SET status = $1, updated_at = now() WHERE id = $2`, [status, shipment.order_id])

  if (['shipped', 'delivered', 'delivery_failed', 'returned'].includes(status)) {
    const { rows: orderRows } = await pool.query(
      `SELECT g.*, sender.full_name AS sender_name, sender.email AS sender_email
       FROM gift_orders g JOIN profiles sender ON sender.id::text = g.sender_user_id WHERE g.id = $1`,
      [shipment.order_id]
    )
    if (orderRows[0]) {
      notifyOrderParties(orderRows[0], status, `Your gift's delivery status: ${status.replace(/_/g, ' ')}`)
        .catch(err => console.error('Shipment webhook notify failed', err))
    }
  }

  res.json({ received: true })
})

module.exports = router
