// Central integration router. Mounts status / test endpoints for each
// provider and is the single entry point for all external sends.
//
// All routes require authentication + the `settings.manage` permission,
// except /status which is open for diagnostics.
const express = require('express');
const { z } = require('zod');
const { pool } = require('../db');
const { requireAuth } = require('../auth/middleware');
const { requirePermission } = require('../rbac/middleware');
const { log } = require('../audit/log');
const { encrypt, decrypt } = require('./cryptoSecret');

const mail = require('./mail');
const sms = require('./sms');
const whatsapp = require('./whatsapp');
const social = require('./social');

const router = express.Router();

// ---------------------------------------------------------------------
// Status endpoints (open — used by the admin dashboard for diagnostics).
// ---------------------------------------------------------------------
router.get('/mail/status',      async (_req, res) => res.json(await mail.status()));
router.get('/sms/status',       async (_req, res) => res.json(await sms.status()));
router.get('/whatsapp/status',  async (_req, res) => res.json(await whatsapp.status()));
router.get('/social/status',    async (_req, res) => res.json(await social.status()));
router.get('/fingerprint/status', (_req, res) => res.json({
  enabled: process.env.FINGERPRINT_ENABLED === 'true',
  driver:  process.env.FINGERPRINT_DRIVER || 'stub',
}));

// ---------------------------------------------------------------------
// Recent send log (admin only)
// ---------------------------------------------------------------------
router.get('/log', requireAuth(), requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const channel = req.query.channel;
    const where = ['1=1']; const p = [];
    if (channel) { where.push('channel=?'); p.push(channel); }
    const [rows] = await pool.query(
      `SELECT id, channel, provider, recipient, subject, status, response_code, error_message, created_at
         FROM integration_send_log WHERE ${where.join(' AND ')}
        ORDER BY created_at DESC LIMIT 200`, p);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Mail — update settings (encrypts password before storage)
// ---------------------------------------------------------------------
const mailUpdateSchema = z.object({
  driver:       z.enum(['smtp','ses','mailgun','postmark','log','sendmail']).optional(),
  is_enabled:   z.boolean().optional(),
  from_name:    z.string().max(190).optional(),
  from_address: z.string().email().optional().or(z.literal('')),
  reply_to:     z.string().email().optional().or(z.literal('')),
  host:         z.string().max(255).optional(),
  port:         z.number().int().min(1).max(65535).optional(),
  use_ssl:      z.boolean().optional(),
  smtp_user:    z.string().max(190).optional(),
  smtp_pass:    z.string().max(255).optional(),
  api_key:      z.string().max(255).optional(),
});

router.put('/mail/settings', requireAuth(), requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const parsed = mailUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', detail: parsed.error.flatten() });
    const d = parsed.data;
    const sets = []; const v = [];
    for (const k of ['driver','from_name','from_address','reply_to','host','smtp_user']) {
      if (d[k] !== undefined) { sets.push(`${k}=?`); v.push(d[k] || null); }
    }
    if (d.port !== undefined)     { sets.push('port=?');     v.push(d.port); }
    if (d.use_ssl !== undefined)  { sets.push('use_ssl=?');  v.push(d.use_ssl ? 1 : 0); }
    if (d.is_enabled !== undefined){ sets.push('is_enabled=?'); v.push(d.is_enabled ? 1 : 0); }
    if (d.smtp_pass !== undefined) { sets.push('smtp_pass_enc=?'); v.push(d.smtp_pass ? encrypt(d.smtp_pass) : null); }
    if (d.api_key !== undefined)   { sets.push('smtp_pass_enc=?'); v.push(d.api_key ? encrypt(d.api_key) : null); }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    sets.push('updated_by=?'); v.push(req.user.id);
    await pool.query(`UPDATE mail_settings SET ${sets.join(', ')} WHERE id=1`, v);
    await log({ actorId: req.user.id, action: 'integrations.mail.update', entityType: 'mail_settings', ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Send a test email right now.
router.post('/mail/test', requireAuth(), requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const { to, subject, text } = req.body || {};
    if (!to) return res.status(400).json({ error: 'missing_to' });
    const r = await mail.send({ to, subject: subject || 'School Platform test', text: text || 'This is a test message from your School Platform integration.', actorId: req.user.id });
    res.json(r);
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// SMS — settings + test send
// ---------------------------------------------------------------------
const smsUpdateSchema = z.object({
  driver:       z.enum(['log','twilio','nexmo','plivo','generic_http']).optional(),
  is_enabled:   z.boolean().optional(),
  account_sid:  z.string().max(190).optional(),
  auth_token:   z.string().max(255).optional(),
  from_number:  z.string().max(64).optional(),
  api_url:      z.string().max(255).optional(),
  api_key:      z.string().max(255).optional(),
});

router.put('/sms/settings', requireAuth(), requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const p = smsUpdateSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const sets = []; const v = [];
    for (const k of ['driver','account_sid','from_number','api_url']) {
      if (d[k] !== undefined) { sets.push(`${k}=?`); v.push(d[k] || null); }
    }
    if (d.is_enabled !== undefined) { sets.push('is_enabled=?'); v.push(d.is_enabled ? 1 : 0); }
    if (d.auth_token !== undefined) { sets.push('auth_token_enc=?'); v.push(d.auth_token ? encrypt(d.auth_token) : null); }
    if (d.api_key !== undefined)    { sets.push('api_key=?');        v.push(d.api_key ? encrypt(d.api_key) : null); }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    sets.push('updated_by=?'); v.push(req.user.id);
    await pool.query(`UPDATE sms_settings SET ${sets.join(', ')} WHERE id=1`, v);
    await log({ actorId: req.user.id, action: 'integrations.sms.update', entityType: 'sms_settings', ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/sms/test', requireAuth(), requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const { to, message } = req.body || {};
    if (!to) return res.status(400).json({ error: 'missing_to' });
    const r = await sms.send({ to, message: message || 'School Platform test SMS', actorId: req.user.id });
    res.json(r);
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// WhatsApp — settings + test send
// ---------------------------------------------------------------------
const whatsappUpdateSchema = z.object({
  provider:             z.enum(['click_to_chat','meta_cloud','twilio']).optional(),
  is_enabled:           z.boolean().optional(),
  phone_number_id:      z.string().max(64).optional(),
  business_account_id:  z.string().max(64).optional(),
  access_token:         z.string().max(255).optional(),
  api_version:          z.string().max(16).optional(),
  account_sid:          z.string().max(190).optional(),
  from_number:          z.string().max(64).optional(),
});

router.put('/whatsapp/settings', requireAuth(), requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const p = whatsappUpdateSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const sets = []; const v = [];
    for (const k of ['provider','phone_number_id','business_account_id','api_version','account_sid','from_number']) {
      if (d[k] !== undefined) { sets.push(`${k}=?`); v.push(d[k] || null); }
    }
    if (d.is_enabled !== undefined) { sets.push('is_enabled=?'); v.push(d.is_enabled ? 1 : 0); }
    if (d.access_token !== undefined) { sets.push('access_token_enc=?'); v.push(d.access_token ? encrypt(d.access_token) : null); }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    sets.push('updated_by=?'); v.push(req.user.id);
    await pool.query(`UPDATE whatsapp_settings SET ${sets.join(', ')} WHERE id=1`, v);
    await log({ actorId: req.user.id, action: 'integrations.whatsapp.update', entityType: 'whatsapp_settings', ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/whatsapp/test', requireAuth(), requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const { to, message } = req.body || {};
    if (!to) return res.status(400).json({ error: 'missing_to' });
    const r = await whatsapp.send({ to, message: message || 'School Platform test WhatsApp', actorId: req.user.id });
    res.json(r);
  } catch (e) { next(e); }
});

// Convenience: build a click-to-chat URL without sending (the public
// site uses this when provider=click_to_chat).
router.post('/whatsapp/click-to-chat-url', async (req, res) => {
  const { to, message } = req.body || {};
  const url = whatsapp.buildClickToChatUrl(to, message);
  res.json({ url });
});

// ---------------------------------------------------------------------
// Social — per-platform settings + test post + broadcast
// ---------------------------------------------------------------------
const socialUpdateSchema = z.object({
  platform:     z.enum(['facebook','twitter','linkedin','instagram']).optional(),
  is_enabled:   z.boolean().optional(),
  page_or_handle: z.string().max(190).optional(),
  access_token: z.string().max(255).optional(),
});

router.put('/social/settings', requireAuth(), requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const p = socialUpdateSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    if (!d.platform) return res.status(400).json({ error: 'missing_platform' });
    const sets = []; const v = [];
    if (d.page_or_handle !== undefined) { sets.push('page_or_handle=?'); v.push(d.page_or_handle || null); }
    if (d.is_enabled !== undefined)     { sets.push('is_enabled=?');     v.push(d.is_enabled ? 1 : 0); }
    if (d.access_token !== undefined)   { sets.push('access_token_enc=?'); v.push(d.access_token ? encrypt(d.access_token) : null); }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    sets.push('updated_by=?'); v.push(req.user.id);
    await pool.query(`UPDATE social_settings SET ${sets.join(', ')} WHERE platform=?`, [...v, d.platform]);
    await log({ actorId: req.user.id, action: 'integrations.social.update',
                entityType: 'social_settings', entityId: d.platform, ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/social/test', requireAuth(), requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const { platform, text, link } = req.body || {};
    if (!platform) return res.status(400).json({ error: 'missing_platform' });
    const r = await social.post({ platform, text: text || 'Test post from School Platform.', link, actorId: req.user.id });
    res.json(r);
  } catch (e) { next(e); }
});

router.post('/social/broadcast', requireAuth(), requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const { text, link, platforms } = req.body || {};
    if (!text) return res.status(400).json({ error: 'missing_text' });
    const r = await social.broadcast({ text, link, platforms, actorId: req.user.id });
    res.json({ results: r });
  } catch (e) { next(e); }
});

module.exports = router;
