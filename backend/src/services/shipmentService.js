// Physical-gift shipment lifecycle — mirrors giftRenderService.js's
// pattern (a service the routes call into, not inline route logic), so
// the same logic is reachable from the sender API, admin API, and the
// Shiprocket webhook handler without duplicating queries.

const { pool } = require('../db/pool')
const shiprocket = require('../utils/shiprocket')
const { sendGiftEmail, TEMPLATE_NAMES } = require('./giftEmails')
const { createNotification } = require('./notifications')

const WEBSITE_URL = process.env.SITE_URL || 'https://www.day1diaries.com'

// Human-friendly labels for the synthetic + shipment timeline entries.
const STATUS_LABELS = {
  pending_payment: 'Awaiting payment',
  processing: 'Payment confirmed — preparing your gift',
  ready: 'Ready to ship',
  failed: 'Payment failed',
  created: 'Shipment created',
  awb_assigned: 'Courier assigned',
  pickup_scheduled: 'Pickup scheduled',
  shipped: 'Shipped',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  delivery_failed: 'Delivery attempt failed',
  returned: 'Returned to sender',
  cancelled: 'Shipment cancelled',
}

async function loadOrder(orderId) {
  const { rows } = await pool.query(
    `SELECT g.*, gt.is_physical, gt.label AS gift_type_label, sender.full_name AS sender_name, sender.email AS sender_email
     FROM gift_orders g
     JOIN gift_types gt ON gt.id = g.gift_type_id
     JOIN profiles sender ON sender.id::text = g.sender_user_id
     WHERE g.id = $1`,
    [orderId]
  )
  return rows[0] || null
}

async function getActiveShipment(orderId) {
  const { rows } = await pool.query(
    `SELECT * FROM shipments WHERE gift_order_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [orderId]
  )
  return rows[0] || null
}

// Returns one flat, time-ordered array of { status, label, occurred_at,
// source } combining the order/payment lifecycle (synthesized from the
// current row — these tables don't keep their own transition history)
// with real shipment_tracking_events rows. Single function shared by
// the sender API, recipient/tribute API, and admin API.
async function getUnifiedTimeline(orderId) {
  const order = await loadOrder(orderId)
  if (!order) return null

  const timeline = [
    { status: 'placed', label: 'Gift order placed', occurred_at: order.created_at, source: 'order' },
  ]
  if (order.payment_status === 'paid' || order.payment_status === 'free') {
    timeline.push({ status: 'processing', label: STATUS_LABELS.processing, occurred_at: order.updated_at, source: 'payment' })
  } else if (order.payment_status === 'failed') {
    timeline.push({ status: 'failed', label: STATUS_LABELS.failed, occurred_at: order.updated_at, source: 'payment' })
  } else if (order.payment_status === 'refunded') {
    timeline.push({ status: 'refunded', label: 'Payment refunded', occurred_at: order.updated_at, source: 'payment' })
  }
  if (order.status === 'ready') {
    timeline.push({ status: 'ready', label: STATUS_LABELS.ready, occurred_at: order.updated_at, source: 'order' })
  }

  const { rows: events } = await pool.query(
    `SELECT e.status, e.status_detail, e.location, e.occurred_at
     FROM shipment_tracking_events e
     JOIN shipments s ON s.id = e.shipment_id
     WHERE s.gift_order_id = $1
     ORDER BY e.occurred_at ASC`,
    [orderId]
  )
  for (const ev of events) {
    timeline.push({
      status: ev.status,
      label: STATUS_LABELS[ev.status] || ev.status,
      detail: ev.status_detail,
      location: ev.location,
      occurred_at: ev.occurred_at,
      source: 'shipment',
    })
  }

  timeline.sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))
  const shipment = await getActiveShipment(orderId)
  return { timeline, order, shipment }
}

async function createShipmentForOrder(orderId) {
  const order = await loadOrder(orderId)
  if (!order) throw Object.assign(new Error('Order not found'), { status: 404 })
  if (!order.is_physical) throw Object.assign(new Error('This gift type is digital — no shipment needed'), { status: 400 })
  if (!['paid', 'free'].includes(order.payment_status)) {
    throw Object.assign(new Error('Payment must be confirmed before creating a shipment'), { status: 400 })
  }
  if (!order.shipping_address_line1 || !order.shipping_city || !order.shipping_state || !order.shipping_pincode || !order.recipient_phone) {
    throw Object.assign(new Error('Shipping address and recipient phone are required'), { status: 400 })
  }
  const existing = await getActiveShipment(orderId)
  if (existing && !['cancelled'].includes(existing.status)) {
    throw Object.assign(new Error('An active shipment already exists for this order'), { status: 409 })
  }

  const response = await shiprocket.createOrder({
    order_id: order.id,
    order_date: new Date(order.created_at).toISOString().slice(0, 19).replace('T', ' '),
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
    billing_customer_name: order.recipient_name,
    billing_address: order.shipping_address_line1,
    billing_address_2: order.shipping_address_line2 || '',
    billing_city: order.shipping_city,
    billing_state: order.shipping_state,
    billing_pincode: order.shipping_pincode,
    billing_country: order.shipping_country || 'India',
    billing_phone: order.recipient_phone,
    billing_email: order.recipient_email || undefined,
    shipping_is_billing: true,
    order_items: [{ name: order.gift_type_label || 'Personalized Gift', sku: order.gift_type_id, units: 1, selling_price: order.amount }],
    payment_method: 'Prepaid',
    sub_total: order.amount,
    length: 10, breadth: 10, height: 10, weight: 0.5,
  })

  const { rows } = await pool.query(
    `INSERT INTO shipments (gift_order_id, shiprocket_order_id, shiprocket_shipment_id, awb_code, courier_name, status)
     VALUES ($1,$2,$3,$4,$5,'created') RETURNING *`,
    [orderId, String(response.order_id || ''), String(response.shipment_id || ''), response.awb_code || null, response.courier_name || null]
  )
  const shipment = rows[0]
  await pool.query(
    `INSERT INTO shipment_tracking_events (shipment_id, status, status_detail) VALUES ($1,'created','Shipment created with Shiprocket')`,
    [shipment.id]
  )
  await pool.query(`UPDATE gift_orders SET status = CASE WHEN status = 'processing' THEN 'ready' ELSE status END, updated_at = now() WHERE id = $1`, [orderId])

  notifyOrderParties(order, 'shipped', 'Your gift is being prepared for shipping').catch(err => console.error('Shipment notify failed', err))
  return shipment
}

async function cancelShipment(orderId, reason) {
  const order = await loadOrder(orderId)
  if (!order) throw Object.assign(new Error('Order not found'), { status: 404 })
  const shipment = await getActiveShipment(orderId)
  if (!shipment || ['cancelled', 'delivered'].includes(shipment.status)) {
    throw Object.assign(new Error('No active shipment to cancel'), { status: 400 })
  }

  if (shiprocket.isConfigured() && shipment.shiprocket_shipment_id) {
    await shiprocket.cancelShipment(shipment.shiprocket_shipment_id)
  }

  await pool.query(`UPDATE shipments SET status = 'cancelled', updated_at = now() WHERE id = $1`, [shipment.id])
  await pool.query(
    `INSERT INTO shipment_tracking_events (shipment_id, status, status_detail) VALUES ($1,'cancelled',$2)`,
    [shipment.id, reason || 'Cancelled by admin']
  )
  await pool.query(`UPDATE gift_orders SET status = 'cancelled', updated_at = now() WHERE id = $1`, [orderId])
  return shipment
}

// On-demand pull/refresh (admin "refresh tracking" button) — the
// webhook (routes/shiprocket-webhook.js) is the primary push-based
// path; this exists as a fallback / explicit refresh.
async function fetchTracking(orderId) {
  const shipment = await getActiveShipment(orderId)
  if (!shipment || !shipment.awb_code) return getUnifiedTimeline(orderId)

  const data = await shiprocket.trackByAwb(shipment.awb_code)
  const scans = data?.tracking_data?.shipment_track_activities || []
  for (const scan of scans) {
    const occurredAt = scan.date ? new Date(scan.date) : new Date()
    const { rows: dupe } = await pool.query(
      `SELECT 1 FROM shipment_tracking_events WHERE shipment_id = $1 AND status_detail = $2 AND occurred_at = $3`,
      [shipment.id, scan.activity || scan.status, occurredAt]
    )
    if (dupe.length) continue
    await pool.query(
      `INSERT INTO shipment_tracking_events (shipment_id, status, status_detail, location, occurred_at, raw_payload)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [shipment.id, mapShiprocketStatus(scan.status), scan.activity || null, scan.location || null, occurredAt, JSON.stringify(scan)]
    )
  }
  return getUnifiedTimeline(orderId)
}

// Maps Shiprocket's free-form status strings to our own shipments/
// gift_orders status enum — used by both fetchTracking and the webhook.
function mapShiprocketStatus(raw) {
  const s = String(raw || '').toLowerCase()
  if (s.includes('deliver') && s.includes('fail')) return 'delivery_failed'
  if (s.includes('delivered')) return 'delivered'
  if (s.includes('out for delivery')) return 'out_for_delivery'
  if (s.includes('transit')) return 'in_transit'
  if (s.includes('return')) return 'returned'
  if (s.includes('cancel')) return 'cancelled'
  if (s.includes('pickup')) return 'pickup_scheduled'
  if (s.includes('shipped') || s.includes('dispatch')) return 'shipped'
  return 'in_transit'
}

async function notifyOrderParties(order, type, body) {
  const link = `/gift/${order.id}`
  if (order.sender_user_id) {
    await createNotification(order.sender_user_id, { type: `gift_${type}`, title: STATUS_LABELS[type] || type, body, link })
  }
  if (order.recipient_user_id) {
    await createNotification(order.recipient_user_id, { type: `gift_${type}`, title: STATUS_LABELS[type] || type, body, link: `/tribute/${order.tribute_slug}` })
  }
  const templateName = type === 'delivered' ? TEMPLATE_NAMES.GIFT_DELIVERED
    : type === 'delivery_failed' ? TEMPLATE_NAMES.GIFT_DELIVERY_FAILED
    : type === 'shipped' ? TEMPLATE_NAMES.GIFT_SHIPPED
    : null
  if (order.sender_email && templateName) {
    sendGiftEmail(templateName, order.sender_email, order.sender_name, {
      gift_recipient_name: order.recipient_name, tracking_url: `${WEBSITE_URL}/my-gifts`,
    }).catch(err => console.error('Shipment status email failed', err))
  }
}

module.exports = { getUnifiedTimeline, createShipmentForOrder, cancelShipment, fetchTracking, mapShiprocketStatus, notifyOrderParties, STATUS_LABELS }
