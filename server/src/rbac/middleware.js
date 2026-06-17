// RBAC enforcement middleware. Use requirePermission('students.view')
// on any route that should be permission-checked. Admins bypass the
// permission check (they hold '*' conceptually) — but explicit checks
// still apply when you want to be strict (use requireStrictPermission).
const { pool } = require('../db');

// Wildcards and aliases can be added here if needed later.
const ADMIN_BYPASS = true;

function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'not_authenticated' });
    if (ADMIN_BYPASS && req.user.role_key === 'admin') return next();
    if (!req.user.permissions || !req.user.permissions.includes(permissionKey)) {
      return res.status(403).json({ error: 'forbidden_permission', required: permissionKey });
    }
    next();
  };
}

function requireAnyPermission(...permissionKeys) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'not_authenticated' });
    if (ADMIN_BYPASS && req.user.role_key === 'admin') return next();
    const has = permissionKeys.some(k => req.user.permissions?.includes(k));
    if (!has) return res.status(403).json({ error: 'forbidden_permission', required_any: permissionKeys });
    next();
  };
}

module.exports = { requirePermission, requireAnyPermission };
