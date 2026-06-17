// Admin portal stub. Returns a placeholder payload so the frontend can render
// a working dashboard; will be replaced with real admin actions in Phase 3.
const express = require('express');
const { requireAuth, requireRole } = require('../auth/middleware');
const { requirePermission } = require('../rbac/middleware');
const { pool } = require('../db');

const router = express.Router();

router.get('/dashboard', requireAuth(), requireRole('admin'), async (req, res, next) => {
  try {
    const [counts] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE status='active') AS users_active,
        (SELECT COUNT(*) FROM students WHERE status='active') AS students_active,
        (SELECT COUNT(*) FROM teachers WHERE status='active') AS teachers_active,
        (SELECT COUNT(*) FROM news_events WHERE is_published=1) AS news_published,
        (SELECT COUNT(*) FROM admission_applications WHERE status='new') AS new_admissions
    `);
    res.json({
      role: 'admin',
      greeting: `Welcome, ${req.user.full_name}`,
      metrics: counts[0],
      quick_links: [
        { label: 'Users',           href: '/admin/users',           permission: 'users.view' },
        { label: 'Academic Setup',  href: '/admin/academic',        permission: 'academic.manage' },
        { label: 'Fees',            href: '/admin/fees',            permission: 'fees.structure.manage' },
        { label: 'Notifications',   href: '/admin/notifications',   permission: 'notifications.create' },
        { label: 'Audit Logs',      href: '/admin/audit',           permission: 'audit.view' },
      ],
    });
  } catch (err) { next(err); }
});

// Permission catalog endpoint (admin uses this to manage RBAC UI).
router.get('/permissions', requireAuth(), requireRole('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT id, key_name, module, action, display_name FROM permissions ORDER BY module, action`);
    res.json({ permissions: rows });
  } catch (err) { next(err); }
});

router.get('/roles', requireAuth(), requireRole('admin'), async (req, res, next) => {
  try {
    const [roles] = await pool.query(`SELECT id, key_name, display_name, description, is_system FROM roles ORDER BY id`);
    const [perms]  = await pool.query(`SELECT role_id, permission_id, p.key_name FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id`);
    const grouped = {};
    for (const r of roles) grouped[r.id] = { ...r, permissions: [] };
    for (const p of perms) {
      const bucket = grouped[p.role_id] || (grouped[p.role_id] = { permissions: [] });
      bucket.permissions.push(p.key_name);
    }
    res.json({ roles: Object.values(grouped) });
  } catch (err) { next(err); }
});

module.exports = router;
