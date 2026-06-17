// Auth routes: login (email OR cnic), /me, refresh, logout, password reset.
// All sensitive actions are audited. Failed-login throttling is handled by
// rate-limit middleware on POST /login and by per-account lockout logic.
const express = require('express');
const { z } = require('zod');
const crypto = require('crypto');
const { pool } = require('../db');
const { hash, verify } = require('./password');
const {
  signAccessToken,
  issueRefreshToken,
  consumeRefreshToken,
  revokeAllForUser,
} = require('./jwt');
const { loadUserWithPermissions, requireAuth } = require('./middleware');
const { log } = require('../audit/log');

const router = express.Router();

const loginSchema = z.object({
  identifier: z.string().min(3),                 // email OR cnic
  password: z.string().min(1),
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', detail: parsed.error.flatten() });
    const { identifier, password } = parsed.data;

    // Allow login by email or CNIC (parents primarily use CNIC).
    const isEmail = identifier.includes('@');
    const where = isEmail ? 'u.email = ?' : 'u.cnic = ?';

    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.full_name, u.status, u.failed_attempts, u.locked_until,
              r.key_name AS role_key
         FROM users u
         JOIN roles r ON r.id = u.role_id
        WHERE ${where} LIMIT 1`, [identifier]);

    const user = rows[0];
    const ip = req.ip;
    const ua = req.get('user-agent') || null;

    if (!user) {
      await log({ action: 'auth.login.failed', entityType: 'user', ip, userAgent: ua, meta: { reason: 'no_user', identifier } });
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    if (user.status !== 'active') {
      await log({ actorId: user.id, actorEmail: user.email, action: 'auth.login.blocked', entityType: 'user', entityId: user.id, ip, userAgent: ua, meta: { reason: 'inactive' } });
      return res.status(403).json({ error: 'user_inactive' });
    }
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: 'account_locked', until: user.locked_until });
    }

    const ok = await verify(password, user.password_hash);
    if (!ok) {
      const attempts = (user.failed_attempts || 0) + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await pool.query('UPDATE users SET failed_attempts=?, locked_until=? WHERE id=?', [attempts, lockUntil, user.id]);
      await log({ actorId: user.id, actorEmail: user.email, action: 'auth.login.failed', entityType: 'user', entityId: user.id, ip, userAgent: ua, meta: { attempts, locked: !!lockUntil } });
      return res.status(401).json({ error: 'invalid_credentials', attempts, locked: !!lockUntil });
    }

    // Success: reset counters, record login.
    await pool.query('UPDATE users SET failed_attempts=0, locked_until=NULL, last_login_at=NOW() WHERE id=?', [user.id]);
    const fullUser = await loadUserWithPermissions(user.id);
    const accessToken = signAccessToken({ userId: user.id, roleKey: fullUser.role_key, sessionId: req.sessionID });
    const { value: refreshToken } = await issueRefreshToken(user.id, { userAgent: ua, ip });
    await log({ actorId: user.id, actorEmail: user.email, action: 'auth.login.success', entityType: 'user', entityId: user.id, ip, userAgent: ua });

    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: fullUser.id,
        email: fullUser.email,
        full_name: fullUser.full_name,
        role: { key: fullUser.role_key, name: fullUser.role_name },
        permissions: fullUser.permissions,
      },
    });
  } catch (err) { next(err); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'missing_refresh_token' });
    const row = await consumeRefreshToken(refreshToken);
    if (!row) return res.status(401).json({ error: 'invalid_refresh_token' });
    const accessToken = signAccessToken({ userId: row.user_id, roleKey: row.role_key, sessionId: req.sessionID });
    const { value: newRefresh } = await issueRefreshToken(row.user_id, { userAgent: req.get('user-agent') || null, ip: req.ip });
    return res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) { next(err); }
});

router.post('/logout', requireAuth(), async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      // Best-effort revoke; ignore if not found.
      const crypto = require('crypto');
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash=? AND user_id=?', [tokenHash, req.user.id]);
    }
    await revokeAllForUser(req.user.id);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'auth.logout', entityType: 'user', entityId: req.user.id, ip: req.ip });
    return res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth(), async (req, res) => {
  return res.json({
    id: req.user.id,
    email: req.user.email,
    full_name: req.user.full_name,
    role: { key: req.user.role_key, name: req.user.role_name },
    permissions: req.user.permissions,
  });
});

// ---- Password reset flow ----------------------------------------------
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { identifier } = req.body || {};
    if (!identifier) return res.status(400).json({ error: 'missing_identifier' });
    const isEmail = identifier.includes('@');
    const [rows] = await pool.query(`SELECT id, email FROM users WHERE ${isEmail ? 'email' : 'cnic'} = ? LIMIT 1`, [identifier]);
    // Always return ok to prevent user enumeration.
    if (rows.length) {
      const user = rows[0];
      const raw = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await pool.query('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?,?,?)', [user.id, tokenHash, expiresAt]);
      // In production: send this via email. For dev we log it.
      // eslint-disable-next-line no-console
      console.log(`[dev] password reset token for ${user.email}: ${raw}`);
      await log({ actorId: user.id, actorEmail: user.email, action: 'auth.password_reset.requested', entityType: 'user', entityId: user.id });
    }
    return res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) return res.status(400).json({ error: 'missing_fields' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'password_too_short' });
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [rows] = await pool.query(
      `SELECT id, user_id, expires_at, used_at FROM password_resets
        WHERE token_hash = ? LIMIT 1`, [tokenHash]);
    if (!rows.length) return res.status(400).json({ error: 'invalid_token' });
    const row = rows[0];
    if (row.used_at) return res.status(400).json({ error: 'token_used' });
    if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'token_expired' });
    const passwordHash = await hash(newPassword);
    await pool.query('UPDATE users SET password_hash=? WHERE id=?', [passwordHash, row.user_id]);
    await pool.query('UPDATE password_resets SET used_at=NOW() WHERE id=?', [row.id]);
    await pool.query('UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=? AND revoked_at IS NULL', [row.user_id]);
    await log({ actorId: row.user_id, action: 'auth.password_reset.completed', entityType: 'user', entityId: row.user_id });
    return res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
