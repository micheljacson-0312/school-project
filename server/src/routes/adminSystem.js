// Admin system endpoints (Phase 3) — mail settings + audit log viewer.
// All routes require authenticated admin.
const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../auth/middleware');
const { requirePermission } = require('../rbac/middleware');
const { log } = require('../audit/log');

const router = express.Router();
router.use(requireAuth(), requireRole('admin'));

// =====================================================================
// Mail settings — get, update, send test email
// Password stored encrypted with AES-256 using MAIL_ENCRYPTION_KEY env.
// =====================================================================
const ALGO = 'aes-256-gcm';
function encKey() {
  const k = process.env.MAIL_ENCRYPTION_KEY;
  if (!k) {
    if (process.env.NODE_ENV === 'production') throw new Error('MAIL_ENCRYPTION_KEY must be set in production');
    // Dev fallback: deterministic but flagged.
    return Buffer.from('dev-only-mail-encryption-key-do-not-use-in-production'.padEnd(32, '!').slice(0, 32));
  }
  return crypto.createHash('sha256').update(k).digest();
}
function encryptPassword(plain) {
  if (!plain) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, encKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]);
}
function decryptPassword(cipherBuf) {
  if (!cipherBuf) return null;
  const iv  = cipherBuf.subarray(0, 12);
  const tag = cipherBuf.subarray(12, 28);
  const ct  = cipherBuf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, encKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

function shape(row, includePassword = false) {
  if (!row) return null;
  const out = { ...row };
  out.has_password = !!row.password_cipher;
  out.password_cipher = undefined;
  if (includePassword && row.password_cipher) {
    try { out.password = decryptPassword(row.password_cipher); } catch { out.password = null; }
  }
  return out;
}

router.get('/mail-settings', requirePermission('mail.manage'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM mail_settings WHERE id=1`);
    res.json({ item: shape(rows[0], true) });
  } catch (e) { next(e); }
});

const mailSchema = z.object({
  driver:       z.enum(['smtp','ses','mailgun','postmark','log','sendmail']).optional(),
  host:         z.string().max(190).optional(),
  port:         z.number().int().min(1).max(65535).nullable().optional(),
  username:     z.string().max(190).optional(),
  password:     z.string().max(255).optional(),                  // optional on update
  encryption:   z.enum(['none','tls','ssl']).optional(),
  from_address: z.string().email().optional().or(z.literal('')),
  from_name:    z.string().max(190).optional(),
  reply_to:     z.string().email().optional().or(z.literal('')),
  is_enabled:   z.boolean().optional(),
});

router.put('/mail-settings', requirePermission('mail.manage'), async (req, res, next) => {
  try {
    const p = mailSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const sets=[]; const v=[];
    for (const k of ['driver','host','username','from_name','reply_to']) {
      if (d[k] !== undefined) { sets.push(`\`${k}\`=?`); v.push(d[k] || null); }
    }
    if (d.port !== undefined)         { sets.push('port=?');         v.push(d.port); }
    if (d.encryption !== undefined)   { sets.push('encryption=?');   v.push(d.encryption); }
    if (d.from_address !== undefined) { sets.push('from_address=?'); v.push(d.from_address || null); }
    if (d.is_enabled !== undefined)   { sets.push('is_enabled=?');   v.push(d.is_enabled?1:0); }
    if (d.password)                   { sets.push('password_cipher=?'); v.push(encryptPassword(d.password)); }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    sets.push('updated_by=?'); v.push(req.user.id);
    await pool.query(`UPDATE mail_settings SET ${sets.join(', ')} WHERE id=1`, v);
    await log({ actorId: req.user.id, action: 'mail.settings.update', entityType: 'mail_settings', entityId: 1, ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/mail-settings/test', requirePermission('mail.manage'), async (req, res, next) => {
  try {
    const schema = z.object({ to: z.string().email() });
    const p = schema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const [rows] = await pool.query(`SELECT * FROM mail_settings WHERE id=1`);
    const cfg = rows[0];
    if (!cfg) return res.status(404).json({ error: 'no_config' });
    if (!cfg.is_enabled) return res.status(400).json({ error: 'mail_disabled', message: 'Enable mail in settings first.' });

    // Resolve password if needed
    let password = null;
    if (cfg.password_cipher) {
      try { password = decryptPassword(cfg.password_cipher); } catch { /* ignore */ }
    }

    let ok = false; let detail = '';
    if (cfg.driver === 'log' || cfg.driver === 'sendmail' || !cfg.host) {
      // In dev or with no SMTP, "send" by writing to console + audit log.
      // eslint-disable-next-line no-console
      console.log(`[mail:test] would send from ${cfg.from_address} → ${p.data.to} (driver=${cfg.driver}, host=${cfg.host||'n/a'})`);
      ok = true; detail = `Logged test message to console (driver=${cfg.driver}).`;
    } else {
      // For real SMTP drivers, we'd connect via nodemailer. Not bundled in this build —
      // the audit log + return value still tells admins whether the config was accepted.
      const issues = [];
      if (!cfg.host) issues.push('missing host');
      if (!cfg.port) issues.push('missing port');
      if (!cfg.username) issues.push('missing username');
      if (!password) issues.push('missing password');
      if (!cfg.from_address) issues.push('missing from_address');
      if (issues.length) {
        detail = 'Configuration incomplete: ' + issues.join(', ');
        ok = false;
      } else {
        // eslint-disable-next-line no-console
        console.log(`[mail:test] SMTP config accepted (host=${cfg.host}, port=${cfg.port}, enc=${cfg.encryption}) → ${p.data.to}`);
        ok = true; detail = 'SMTP config is well-formed. Connect + send not executed in this dev build.';
      }
    }
    await pool.query(
      `UPDATE mail_settings SET last_tested_at=NOW(), last_test_status=?, last_test_error=? WHERE id=1`,
      [ok ? 'ok' : 'failed', ok ? null : detail]);
    await log({ actorId: req.user.id, action: 'mail.test', entityType: 'mail_settings', entityId: 1, ip: req.ip, meta: { to: p.data.to, ok } });
    res.json({ ok, detail });
  } catch (e) { next(e); }
});

// =====================================================================
// Audit log viewer (with pagination + filters)
// =====================================================================
router.get('/audit-logs', requirePermission('audit.view'), async (req, res, next) => {
  try {
    const { action, actor_id, entity_type, from, to, limit = 100, offset = 0 } = req.query;
    const where=['1=1']; const p=[];
    if (action)      { where.push('action LIKE ?');        p.push(`${action}%`); }
    if (actor_id)    { where.push('actor_id=?');          p.push(actor_id); }
    if (entity_type) { where.push('entity_type=?');       p.push(entity_type); }
    if (from)        { where.push('created_at >= ?');     p.push(from); }
    if (to)          { where.push('created_at <= ?');     p.push(to); }
    const lim = Math.min(Number(limit) || 100, 500);
    const off = Math.max(Number(offset) || 0, 0);
    const [rows] = await pool.query(
      `SELECT id, actor_id, actor_email, action, entity_type, entity_id, ip, meta, created_at
         FROM audit_logs WHERE ${where.join(' AND ')}
         ORDER BY id DESC LIMIT ${lim} OFFSET ${off}`, p);
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM audit_logs WHERE ${where.join(' AND ')}`, p);
    res.json({ items: rows, total, limit: lim, offset: off });
  } catch (e) { next(e); }
});

// Group counts for the dashboard widget
router.get('/audit-logs/summary', requirePermission('audit.view'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT action, COUNT(*) AS n FROM audit_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY action ORDER BY n DESC LIMIT 20`);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

module.exports = router;
