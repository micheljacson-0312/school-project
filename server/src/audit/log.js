// Audit logging for sensitive actions. Fire-and-forget; never throws into the
// request lifecycle (a missing audit row must not break a user request).
const { pool } = require('../db');

async function log({ actorId, actorEmail, action, entityType, entityId, ip, userAgent, meta }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (actor_id, actor_email, action, entity_type, entity_id, ip, user_agent, meta)
       VALUES (?,?,?,?,?,?,?,?)`,
      [actorId || null, actorEmail || null, action, entityType || null,
       entityId || null, ip || null, userAgent || null,
       meta ? JSON.stringify(meta) : null]
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[audit] failed to write audit log:', err.message);
  }
}

module.exports = { log };
