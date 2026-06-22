// Admin shipment lifecycle for physical gifts — sibling to
// admin-gift.js (which stays scoped to catalog/payments), mounted at
// the same /admin/gift prefix. All endpoints hang off
// /admin/gift/orders/:id/... to match the existing URL shape.

const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, requirePermission } = require('../middleware/auth')
const shipmentService = require('../services/shipmentService')

const router = express.Router()
router.use(requireAuth)
const manageShipments = requirePermission('manage_gifting', 'manage_shipments')

const ORDER_STATUSES = [
  'pending_payment', 'processing', 'ready', 'failed',
  'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'delivery_failed', 'returned', 'cancelled',
]

router.post('/orders/:id/ship', manageShipments, async (req, res) => {
  const shipment = await shipmentService.createShipmentForOrder(req.params.id)
  res.status(201).json({ shipment })
})

router.post('/orders/:id/cancel-shipment', manageShipments, async (req, res) => {
  const shipment = await shipmentService.cancelShipment(req.params.id, req.body?.reason)
  res.json({ shipment })
})

router.get('/orders/:id/tracking', manageShipments, async (req, res) => {
  const result = await shipmentService.fetchTracking(req.params.id)
  if (!result) return res.status(404).json({ error: 'Order not found' })
  res.json(result)
})

// Manual order/shipping status override — same intent as admin-gift.js's
// set-payment-status (reconciling when Shiprocket's webhook is delayed
// or missing), but for gift_orders.status rather than payment_status.
router.post('/orders/:id/status', manageShipments, async (req, res) => {
  const { status } = req.body
  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${ORDER_STATUSES.join(', ')}` })
  }
  const { rows } = await pool.query(
    `UPDATE gift_orders SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [status, req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Order not found' })
  res.json({ order: rows[0] })
})

router.put('/orders/:id/shipping-address', manageShipments, async (req, res) => {
  const { rows: shipRows } = await pool.query(
    `SELECT * FROM shipments WHERE gift_order_id = $1 AND status != 'cancelled' ORDER BY created_at DESC LIMIT 1`,
    [req.params.id]
  )
  if (shipRows.length && shipRows[0].status !== 'created') {
    return res.status(409).json({ error: "Can't edit the address — pickup is already scheduled with the courier. Cancel the shipment first." })
  }

  const { recipientPhone, shippingAddressLine1, shippingAddressLine2, shippingCity, shippingState, shippingPincode, shippingCountry } = req.body
  const { rows } = await pool.query(
    `UPDATE gift_orders SET
       recipient_phone = COALESCE($1, recipient_phone),
       shipping_address_line1 = COALESCE($2, shipping_address_line1),
       shipping_address_line2 = COALESCE($3, shipping_address_line2),
       shipping_city = COALESCE($4, shipping_city),
       shipping_state = COALESCE($5, shipping_state),
       shipping_pincode = COALESCE($6, shipping_pincode),
       shipping_country = COALESCE($7, shipping_country),
       updated_at = now()
     WHERE id = $8 RETURNING *`,
    [recipientPhone, shippingAddressLine1, shippingAddressLine2, shippingCity, shippingState, shippingPincode, shippingCountry, req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Order not found' })
  res.json({ order: rows[0] })
})

module.exports = router
