// JWT signing/verification for access tokens. Refresh tokens live in the
// refresh_tokens table (rotation capable, revocable per-session).
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../db');
const config = require('../config');

function signAccessToken({ userId, roleKey, sessionId }) {
  return jwt.sign(
    { sub: userId, role: roleKey, sid: sessionId, typ: 'access' },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessTtl }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

function newRefreshTokenValue() {
  // 48 random bytes → 64-char hex string. Stored only as sha256 hash.
  return crypto.randomBytes(48).toString('hex');
}

function hashToken(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function issueRefreshToken(userId, { userAgent, ip }) {
  const value = newRefreshTokenValue();
  const tokenHash = hashToken(value);
  // Refresh TTL: parse e.g. "14d" → days
  const days = parseInt(config.jwt.refreshTtl, 10) || 14;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip, expires_at) VALUES (?,?,?,?,?)`,
    [userId, tokenHash, userAgent || null, ip || null, expiresAt]
  );
  return { value, expiresAt };
}

async function consumeRefreshToken(value) {
  const tokenHash = hashToken(value);
  const [rows] = await pool.query(
    `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, u.role_id, u.status, r.key_name AS role_key
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       JOIN roles r ON r.id = u.role_id
      WHERE rt.token_hash = ? LIMIT 1`, [tokenHash]);
  if (!rows.length) return null;
  const row = rows[0];
  if (row.revoked_at) return null;
  if (new Date(row.expires_at) < new Date()) return null;
  if (row.status !== 'active') return null;
  // Rotate: revoke old, caller will issue a new one.
  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [row.id]);
  return row;
}

async function revokeAllForUser(userId) {
  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [userId]);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  newRefreshTokenValue,
  hashToken,
  issueRefreshToken,
  consumeRefreshToken,
  revokeAllForUser,
};
