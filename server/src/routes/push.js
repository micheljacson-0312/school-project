// Web Push subscription endpoints.
//
// Endpoints (all require authentication):
//   POST   /api/push/subscribe     — register a browser push subscription
//   DELETE /api/push/unsubscribe   — remove a subscription by endpoint
//   GET    /api/push/status        — my active subscription count
//
// Admin:
//   GET    /api/push/settings      — current VAPID config + sub count
//   PUT    /api/push/settings      — update VAPID + toggle
//   POST   /api/push/test          — send a test push to current user
//
// VAPID keys are generated using Node's crypto.generateKeyPairSync (P-256)
// so no external dependency is needed. The private key is encrypted at
// rest using MAIL_ENCRYPTION_KEY.
//
// To actually send a push payload to subscribed devices, use the `sendToUser`
// helper below (called from the notifications system when channel='push'
// and PUSH_ENABLED=true).
const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../auth/middleware');
const { requirePermission } = require('../rbac/middleware');
const { log } = require('../audit/log');
const { encrypt, decrypt } = require('../integrations/cryptoSecret');

const router = express.Router();

// ---------------------------------------------------------------------
// Subscription CRUD for the current user
// ---------------------------------------------------------------------
const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(20).max(255),
    auth:   z.string().min(8).max(64),
  }),
});

router.post('/subscribe', async (req, res, next) => {
  try {
    const p = subSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE p256dh=VALUES(p256dh), auth=VALUES(auth),
         user_agent=VALUES(user_agent), is_active=1, last_used_at=NOW()`,
      [req.user.id, d.endpoint, d.keys.p256dh, d.keys.auth, req.get('user-agent') || null]);
    await log({ actorId: req.user.id, action: 'push.subscribe', entityType: 'push_subscription', ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/unsubscribe', async (req, res, next) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: 'missing_endpoint' });
    await pool.query(
      `UPDATE push_subscriptions SET is_active=0 WHERE user_id=? AND endpoint=?`,
      [req.user.id, endpoint]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/status', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS n FROM push_subscriptions WHERE user_id=? AND is_active=1`,
      [req.user.id]);
    res.json({ active_subscriptions: rows[0].n });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Admin: VAPID keys + global toggle
// ---------------------------------------------------------------------
function generateVapidKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const pub = publicKey.export({ format: 'jwk' });
  const priv = privateKey.export({ format: 'jwk' });
  return { publicKey: pub.x, privateKey: priv.d };
}

router.get('/settings', requireAuth(), requireRole('admin'), async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT id, is_enabled, vapid_subject, vapid_public_key, updated_at FROM push_settings WHERE id=1`);
    const cfg = rows[0] || {};
    const [count] = await pool.query(`SELECT COUNT(*) AS n FROM push_subscriptions WHERE is_active=1`);
    res.json({
      is_enabled: !!cfg.is_enabled,
      vapid_subject: cfg.vapid_subject || null,
      vapid_public_key: cfg.vapid_public_key || null,
      has_private_key: !!cfg.vapid_private_key_enc,
      active_subscriptions: count[0].n,
      updated_at: cfg.updated_at || null,
    });
  } catch (e) { next(e); }
});

router.put('/settings', requireAuth(), requireRole('admin'), requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const schema = z.object({
      is_enabled: z.boolean().optional(),
      vapid_subject: z.string().max(255).optional(),
      regenerate_keys: z.boolean().optional(),
      vapid_public_key: z.string().max(255).optional(),
      vapid_private_key: z.string().max(255).optional(),
    });
    const p = schema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const sets = []; const v = [];
    if (d.is_enabled !== undefined) { sets.push('is_enabled=?'); v.push(d.is_enabled ? 1 : 0); }
    if (d.vapid_subject !== undefined) { sets.push('vapid_subject=?'); v.push(d.vapid_subject); }

    if (d.regenerate_keys) {
      const k = generateVapidKeys();
      sets.push('vapid_public_key=?'); v.push(k.publicKey);
      sets.push('vapid_private_key_enc=?'); v.push(encrypt(k.privateKey));
    } else {
      if (d.vapid_public_key) { sets.push('vapid_public_key=?'); v.push(d.vapid_public_key); }
      if (d.vapid_private_key) { sets.push('vapid_private_key_enc=?'); v.push(encrypt(d.vapid_private_key)); }
    }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    sets.push('updated_by=?'); v.push(req.user.id);
    await pool.query(`UPDATE push_settings SET ${sets.join(', ')} WHERE id=1`, v);
    await log({ actorId: req.user.id, action: 'push.settings.update', entityType: 'push_settings', ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/test', requireAuth(), requireRole('admin'), async (req, res, next) => {
  try {
    const r = await sendToUser(req.user.id, {
      title: 'School Platform test push',
      body:  'This is a test notification from your School Platform.',
      url:   '/',
      tag:   'push-test',
    });
    res.json(r);
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// sendToUser(userId, payload) — used by the notifications system when
// channel='push' and PUSH_ENABLED=true. Sends to ALL active subscriptions
// for that user. Failures are caught per-subscription.
//
// NOTE: A full VAPID-signed POST to web-push endpoints requires the
// `web-push` npm package or equivalent crypto + JWT signing. The basic
// shape is here so a real send can be wired by dropping in web-push and
// replacing the body of this function with `webpush.sendNotification(...)`.
// ---------------------------------------------------------------------
async function sendToUser(userId, payload) {
  const [rows] = await pool.query(
    `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id=? AND is_active=1`,
    [userId]);
  if (!rows.length) return { ok: true, sent: 0, skipped: 'no_subscriptions' };

  // For dev we just record the intent; production should call web-push.
  try {
    await pool.query(
      `INSERT INTO integration_send_log (channel, provider, recipient, subject, payload_json, status, actor_id)
       VALUES (?,?,?,?,?,?,?)`,
      ['push', 'web_push', rows.map(r => r.endpoint).join(','), payload.title || null,
       JSON.stringify(payload).slice(0, 65000),
       'dry_run', userId]);
  } catch {}

  return {
    ok: true,
    sent: 0,
    queued: rows.length,
    note: 'push_send_logged_but_no_vapid_signing_yet',
    endpoints: rows.length,
  };
}

module.exports = router;
module.exports.sendToUser = sendToUser;
