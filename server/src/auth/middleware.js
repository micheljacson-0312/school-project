// Express middleware: authenticate the JWT access token and load the user
// (including role and permission set) onto req.user.
const { verifyAccessToken } = require('./jwt');
const { pool } = require('../db');

async function loadUserWithPermissions(userId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.status, u.locked_until, u.role_id,
            r.key_name AS role_key, r.display_name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.id = ? LIMIT 1`, [userId]);
  if (!rows.length) return null;
  const user = rows[0];
  const [perms] = await pool.query(
    `SELECT p.key_name
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ?`, [user.role_id]);
  user.permissions = perms.map(p => p.key_name);
  return user;
}

function requireAuth() {
  return async (req, res, next) => {
    try {
      const header = req.headers.authorization || '';
      const m = header.match(/^Bearer\s+(.+)$/i);
      if (!m) return res.status(401).json({ error: 'missing_token' });
      let claims;
      try {
        claims = verifyAccessToken(m[1]);
      } catch (e) {
        return res.status(401).json({ error: 'invalid_token', detail: e.message });
      }
      const user = await loadUserWithPermissions(claims.sub);
      if (!user) return res.status(401).json({ error: 'user_not_found' });
      if (user.status !== 'active') return res.status(403).json({ error: 'user_inactive' });
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return res.status(423).json({ error: 'account_locked' });
      }
      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}

function requireRole(...allowedRoleKeys) {
  const allowed = new Set(allowedRoleKeys);
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'not_authenticated' });
    if (!allowed.has(req.user.role_key)) {
      return res.status(403).json({ error: 'forbidden_role', required: [...allowed], actual: req.user.role_key });
    }
    next();
  };
}

// Convenience: require auth AND a role, in one call.
function requireAuthAndRole(...allowedRoleKeys) {
  return [requireAuth(), requireRole(...allowedRoleKeys)];
}

module.exports = { requireAuth, requireRole, requireAuthAndRole, loadUserWithPermissions };
