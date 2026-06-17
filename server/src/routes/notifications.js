// Notifications (Phase 7) — in-app feed + optional email/SMS with feature
// flags. The brief says "(build behind a feature flag so it can be enabled
// without refactoring core code)" — we ship the flag in env vars
// (EMAIL_ENABLED, SMS_ENABLED) and the transport layer no-ops gracefully
// when disabled.
const express = require('express');
const { z } = require('zod');
const { pool } = require('../db');
const { requireAuth } = require('../auth/middleware');
const { requirePermission } = require('../rbac/middleware');
const { log } = require('../audit/log');

const router = express.Router();
router.use(requireAuth());

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';
const SMS_ENABLED   = process.env.SMS_ENABLED   === 'true';

// Lazy require — integrations are pluggable.
const mail = require('../integrations/mail');
const sms  = require('../integrations/sms');
const wa   = require('../integrations/whatsapp');
const pushModule = require('./push');

// ---------------------------------------------------------------------
// List notifications visible to me (audience-filtered)
// ---------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT n.id, n.title, n.body, n.category, n.channel, n.created_at,
              EXISTS (SELECT 1 FROM notification_reads r WHERE r.notification_id=n.id AND r.user_id=?) AS is_read
         FROM notifications n
        WHERE n.audience='all'
           OR (n.audience='role' AND n.audience_role_id = (SELECT role_id FROM users WHERE id=?))
           OR (n.audience='students' AND ? IN ('student'))
           OR (n.audience='teachers' AND ? IN ('teacher'))
           OR (n.audience='parents'  AND ? IN ('parent'))
           OR (n.audience='staff'    AND ? IN ('coordinator','accountant','operator'))
        ORDER BY n.created_at DESC LIMIT 50`,
      [req.user.id, req.user.id, req.user.role_key, req.user.role_key, req.user.role_key, req.user.role_key]);
    // Also fetch unread count
    res.json({ items: rows, email_enabled: EMAIL_ENABLED, sms_enabled: SMS_ENABLED });
  } catch (e) { next(e); }
});

// Unread count (used by the bell badge)
router.get('/unread-count', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS n FROM notifications n
        WHERE (n.audience='all'
           OR (n.audience='role' AND n.audience_role_id = (SELECT role_id FROM users WHERE id=?))
           OR (n.audience='students' AND ? IN ('student'))
           OR (n.audience='teachers' AND ? IN ('teacher'))
           OR (n.audience='parents'  AND ? IN ('parent'))
           OR (n.audience='staff'    AND ? IN ('coordinator','accountant','operator')))
          AND NOT EXISTS (SELECT 1 FROM notification_reads r WHERE r.notification_id=n.id AND r.user_id=?)`,
      [req.user.id, req.user.role_key, req.user.role_key, req.user.role_key, req.user.role_key, req.user.id]);
    res.json({ count: Number(rows[0].n) });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Mark a notification as read
// ---------------------------------------------------------------------
router.post('/:id/read', async (req, res, next) => {
  try {
    await pool.query(
      `INSERT INTO notification_reads (notification_id, user_id) VALUES (?,?)
       ON DUPLICATE KEY UPDATE read_at=NOW()`,
      [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Create a notification (admin / teacher)
// ---------------------------------------------------------------------
const createSchema = z.object({
  title:    z.string().min(1).max(190),
  body:     z.string().min(1).max(5000),
  audience: z.enum(['all','students','teachers','parents','staff','role']),
  audience_role_id: z.number().int().positive().optional(),
  category: z.enum(['announcement','academic','fee','event','emergency']).default('announcement'),
  channel:  z.enum(['inapp','email','sms','push']).default('inapp'),
});

router.post('/', requirePermission('notifications.create'), async (req, res, next) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const [r] = await pool.query(
      `INSERT INTO notifications (audience, audience_role_id, title, body, channel, category, created_by)
       VALUES (?,?,?,?,?,?,?)`,
      [d.audience, d.audience_role_id || null, d.title, d.body, d.channel, d.category, req.user.id]);
    await log({ actorId: req.user.id, action: 'notifications.create', entityType: 'notification', entityId: r.insertId, ip: req.ip, meta: { audience: d.audience, channel: d.channel } });

    // Dispatch based on channel. EMAIL_ENABLED / SMS_ENABLED are the
    // global feature flags; the actual transport (driver, credentials)
    // is read from the integration_settings tables by the adapter.
    const dispatched = { inapp: true };
    if (d.channel === 'email' && EMAIL_ENABLED) {
      // Resolve recipients by audience. For now we send to a placeholder;
      // production should look up email addresses per audience.
      const recipients = await resolveEmailRecipients(d.audience, d.audience_role_id);
      const results = [];
      for (const to of recipients) {
        results.push(await mail.send({ to, subject: d.title, text: d.body, actorId: req.user.id }));
      }
      dispatched.email = { provider: 'mail', results };
    } else if (d.channel === 'email') {
      dispatched.email = { skipped: 'EMAIL_ENABLED=false' };
    }
    if (d.channel === 'sms' && SMS_ENABLED) {
      const recipients = await resolveSmsRecipients(d.audience, d.audience_role_id);
      const results = [];
      for (const to of recipients) {
        results.push(await sms.send({ to, message: `${d.title}\n\n${d.body}`, actorId: req.user.id }));
      }
      dispatched.sms = { provider: 'sms', results };
    } else if (d.channel === 'sms') {
      dispatched.sms = { skipped: 'SMS_ENABLED=false' };
    }
    if (d.channel === 'push') {
      const recipients = await resolvePushRecipients(d.audience, d.audience_role_id);
      const results = [];
      for (const uid of recipients) {
        results.push(await pushModule.sendToUser(uid, { title: d.title, body: d.body, tag: d.category }));
      }
      dispatched.push = { provider: 'web_push', results };
    }
    res.status(201).json({ id: r.insertId, dispatched });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Bulk send (used for class-wide announcements) — accepts array
// ---------------------------------------------------------------------
const bulkSchema = z.object({
  notifications: z.array(createSchema).min(1).max(20),
});

router.post('/bulk', requirePermission('notifications.create'), async (req, res, next) => {
  try {
    const p = bulkSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    let created = 0;
    for (const n of p.data.notifications) {
      await pool.query(
        `INSERT INTO notifications (audience, audience_role_id, title, body, channel, category, created_by)
         VALUES (?,?,?,?,?,?,?)`,
        [n.audience, n.audience_role_id || null, n.title, n.body, n.channel, n.category, req.user.id]);
      created++;
    }
    await log({ actorId: req.user.id, action: 'notifications.bulk_create', entityType: 'notification', ip: req.ip, meta: { count: created } });
    res.status(201).json({ count: created });
  } catch (e) { next(e); }
});

module.exports = router;

// ---------------------------------------------------------------------
// Recipients resolution — looks up email addresses / phone numbers for
// the given audience. Returns an array of strings.
// ---------------------------------------------------------------------
async function resolveEmailRecipients(audience, audienceRoleId) {
  let rows;
  if (audience === 'all') {
    [rows] = await pool.query(`SELECT email FROM users WHERE status='active' AND email IS NOT NULL`);
  } else if (audience === 'role' && audienceRoleId) {
    [rows] = await pool.query(`SELECT email FROM users WHERE status='active' AND role_id=? AND email IS NOT NULL`, [audienceRoleId]);
  } else if (audience === 'students' || audience === 'teachers' || audience === 'parents' || audience === 'staff') {
    const roleKey = audience === 'staff' ? null : audience.slice(0, -1); // student/teacher/parent
    if (roleKey) {
      [rows] = await pool.query(
        `SELECT u.email FROM users u JOIN roles r ON r.id=u.role_id
          WHERE u.status='active' AND r.key_name=? AND u.email IS NOT NULL`,
        [roleKey]);
    } else {
      // staff: coordinator + accountant + operator
      [rows] = await pool.query(
        `SELECT u.email FROM users u JOIN roles r ON r.id=u.role_id
          WHERE u.status='active' AND r.key_name IN ('coordinator','accountant','operator') AND u.email IS NOT NULL`);
    }
  }
  return (rows || []).map(r => r.email).filter(Boolean);
}

async function resolveSmsRecipients(audience, audienceRoleId) {
  let rows;
  if (audience === 'all') {
    [rows] = await pool.query(`SELECT phone FROM users WHERE status='active' AND phone IS NOT NULL`);
  } else if (audience === 'role' && audienceRoleId) {
    [rows] = await pool.query(`SELECT phone FROM users WHERE status='active' AND role_id=? AND phone IS NOT NULL`, [audienceRoleId]);
  } else if (audience === 'students') {
    [rows] = await pool.query(
      `SELECT s.guardian_phone AS phone FROM students s WHERE s.status='active' AND s.guardian_phone IS NOT NULL`);
  } else if (audience === 'parents') {
    [rows] = await pool.query(
      `SELECT u.phone FROM users u JOIN roles r ON r.id=u.role_id
        WHERE u.status='active' AND r.key_name='parent' AND u.phone IS NOT NULL`);
  } else if (audience === 'teachers') {
    [rows] = await pool.query(
      `SELECT u.phone FROM users u JOIN roles r ON r.id=u.role_id
        WHERE u.status='active' AND r.key_name='teacher' AND u.phone IS NOT NULL`);
  } else if (audience === 'staff') {
    [rows] = await pool.query(
      `SELECT u.phone FROM users u JOIN roles r ON r.id=u.role_id
        WHERE u.status='active' AND r.key_name IN ('coordinator','accountant','operator') AND u.phone IS NOT NULL`);
  }
  return (rows || []).map(r => r.phone).filter(Boolean);
}

async function resolvePushRecipients(audience, audienceRoleId) {
  // Push notifications go to USER IDs (since each user's subscriptions
  // are tied to their user_id). For students, we map via parent_student
  // — actually no, push goes to the user's own devices, so this matches
  // the user table directly.
  let rows;
  if (audience === 'all') {
    [rows] = await pool.query(`SELECT id FROM users WHERE status='active'`);
  } else if (audience === 'role' && audienceRoleId) {
    [rows] = await pool.query(`SELECT id FROM users WHERE status='active' AND role_id=?`, [audienceRoleId]);
  } else if (audience === 'students' || audience === 'teachers' || audience === 'parents' || audience === 'staff') {
    const roleKey = audience === 'staff' ? null : audience.slice(0, -1);
    if (roleKey) {
      [rows] = await pool.query(
        `SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE u.status='active' AND r.key_name=?`,
        [roleKey]);
    } else {
      [rows] = await pool.query(
        `SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id
          WHERE u.status='active' AND r.key_name IN ('coordinator','accountant','operator')`);
    }
  }
  return (rows || []).map(r => r.id);
}
