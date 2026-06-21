const express = require('express')
const { pool } = require('../db/pool')
const { requireAuth, requireRole } = require('../middleware/auth')
const { ROLES, EDITABLE_ROLE_KEYS, PERMISSIONS, PERMISSION_KEYS } = require('../services/permissions')

const router = express.Router()
// Editing the permission matrix itself is restricted to the true 'admin'
// role (not requirePermission) — otherwise a role could grant itself
// more access, defeating the point of RBAC.
router.use(requireAuth, requireRole('admin'))

// GET /admin/rbac — full catalog + current grants, for the matrix UI
router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT role, permission_key FROM role_permissions')
  const grants = {}
  for (const role of EDITABLE_ROLE_KEYS) grants[role] = []
  for (const row of rows) {
    if (grants[row.role]) grants[row.role].push(row.permission_key)
  }
  res.json({ roles: ROLES, permissions: PERMISSIONS, grants })
})

// PUT /admin/rbac/:role — replace a role's full permission set
router.put('/:role', async (req, res) => {
  const { role } = req.params
  if (!EDITABLE_ROLE_KEYS.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${EDITABLE_ROLE_KEYS.join(', ')} ('admin' is a superuser and not editable)` })
  }
  const keys = Array.isArray(req.body.permissions) ? req.body.permissions.filter(k => PERMISSION_KEYS.includes(k)) : []

  await pool.query('DELETE FROM role_permissions WHERE role = $1', [role])
  for (const key of keys) {
    await pool.query('INSERT INTO role_permissions (role, permission_key) VALUES ($1,$2)', [role, key])
  }
  res.json({ role, permissions: keys })
})

module.exports = router
