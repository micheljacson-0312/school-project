// Admin content management endpoints (Phase 2 / Phase 3 prep).
// All routes require authentication + the `content.<area>` permission
// where applicable. Audit-logged on every mutation.
const express = require('express');
const { z } = require('zod');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../auth/middleware');
const { requirePermission } = require('../rbac/middleware');
const { log } = require('../audit/log');

const router = express.Router();

// All admin content endpoints require an authenticated admin.
router.use(requireAuth(), requireRole('admin'));

// =====================================================================
// News & Events
// =====================================================================
const newsSchema = z.object({
  type:        z.enum(['news','event']),
  title:       z.string().min(1).max(190),
  slug:        z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  excerpt:     z.string().max(500).optional(),
  body:        z.string().max(50000).optional(),
  cover_image: z.string().max(255).optional(),
  event_date:  z.string().optional(),
  is_published: z.boolean().optional(),
});

router.get('/news', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, type, title, slug, excerpt, cover_image, event_date, is_published, published_at, created_at
         FROM news_events ORDER BY COALESCE(published_at, created_at) DESC LIMIT 200`);
    res.json({ items: rows });
  } catch (err) { next(err); }
});

router.post('/news', requirePermission('content.news.manage'), async (req, res, next) => {
  try {
    const p = newsSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const [r] = await pool.query(
      `INSERT INTO news_events (type, title, slug, excerpt, body, cover_image, event_date, is_published, published_at, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [d.type, d.title, d.slug, d.excerpt || null, d.body || null, d.cover_image || null,
       d.event_date || null, d.is_published ? 1 : 0,
       d.is_published ? new Date() : null, req.user.id]);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'content.news.create',
                entityType: 'news_event', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (err) { next(err); }
});

router.put('/news/:id', requirePermission('content.news.manage'), async (req, res, next) => {
  try {
    const p = newsSchema.partial().safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const fields = [];
    const vals = [];
    for (const k of ['type','title','slug','excerpt','body','cover_image','event_date']) {
      if (d[k] !== undefined) { fields.push(`${k}=?`); vals.push(d[k]); }
    }
  if (d.is_published !== undefined) {
    fields.push('is_published=?');
    vals.push(d.is_published ? 1 : 0);
    if (d.is_published) { fields.push('published_at=NOW()'); }
  }
  if (!fields.length) return res.status(400).json({ error: 'no_fields' });
  vals.push(req.params.id);
  await pool.query(`UPDATE news_events SET ${fields.join(', ')} WHERE id=?`, vals);
  await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'content.news.update',
              entityType: 'news_event', entityId: Number(req.params.id), ip: req.ip, meta: d });
  // Auto-broadcast on transition to published.
  if (d.is_published === true) {
    const [rows] = await pool.query(`SELECT title, slug FROM news_events WHERE id=?`, [req.params.id]);
    const r = rows[0];
    if (r) await autoBroadcast({
      text: `${r.title} — read more on the school website.`,
      link: `${req.protocol}://${req.get('host') || 'school.test'}/news/${r.slug}`,
      kind: 'news',
    });
  }
  res.json({ ok: true });
} catch (err) { next(err); }
});

router.delete('/news/:id', requirePermission('content.news.manage'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM news_events WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'content.news.delete',
                entityType: 'news_event', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// =====================================================================
// Gallery
// =====================================================================
const gallerySchema = z.object({
  category:     z.string().max(64).optional(),
  caption:      z.string().max(255).optional(),
  media_url:    z.string().min(1).max(255),
  media_type:   z.enum(['image','video']).default('image'),
  taken_on:     z.string().optional(),
  is_published: z.boolean().optional(),
});

router.get('/gallery', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, category, caption, media_url, media_type, taken_on, is_published, created_at
         FROM gallery_items ORDER BY taken_on DESC, created_at DESC LIMIT 500`);
    res.json({ items: rows });
  } catch (err) { next(err); }
});

router.post('/gallery', requirePermission('content.gallery.manage'), async (req, res, next) => {
  try {
    const p = gallerySchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const [r] = await pool.query(
      `INSERT INTO gallery_items (category, caption, media_url, media_type, taken_on, is_published)
       VALUES (?,?,?,?,?,?)`,
      [d.category || null, d.caption || null, d.media_url, d.media_type,
       d.taken_on || null, d.is_published === false ? 0 : 1]);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'content.gallery.create',
                entityType: 'gallery_item', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (err) { next(err); }
});

router.delete('/gallery/:id', requirePermission('content.gallery.manage'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM gallery_items WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'content.gallery.delete',
                entityType: 'gallery_item', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// =====================================================================
// Job postings
// =====================================================================
const jobSchema = z.object({
  title:            z.string().min(1).max(190),
  department:       z.string().max(128).optional(),
  location:         z.string().max(128).optional(),
  employment_type:  z.enum(['full_time','part_time','contract','visiting','internship']).default('full_time'),
  description:      z.string().min(1),
  requirements:     z.string().optional(),
  salary_range:     z.string().max(64).optional(),
  apply_deadline:   z.string().optional(),
  is_published:     z.boolean().optional(),
});

router.get('/jobs', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM job_postings ORDER BY created_at DESC LIMIT 200`);
    res.json({ items: rows });
  } catch (err) { next(err); }
});

router.post('/jobs', async (req, res, next) => {
  try {
    const p = jobSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const [r] = await pool.query(
      `INSERT INTO job_postings (title, department, location, employment_type, description,
                                  requirements, salary_range, apply_deadline, is_published, published_at, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [d.title, d.department || null, d.location || null, d.employment_type, d.description,
       d.requirements || null, d.salary_range || null, d.apply_deadline || null,
       d.is_published ? 1 : 0, d.is_published ? new Date() : null, req.user.id]);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'content.job.create',
                entityType: 'job_posting', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (err) { next(err); }
});

router.put('/jobs/:id', async (req, res, next) => {
  try {
    const p = jobSchema.partial().safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const fields = []; const vals = [];
    for (const k of ['title','department','location','employment_type','description','requirements','salary_range','apply_deadline']) {
      if (d[k] !== undefined) { fields.push(`${k}=?`); vals.push(d[k]); }
    }
    if (d.is_published !== undefined) {
      fields.push('is_published=?'); vals.push(d.is_published ? 1 : 0);
      if (d.is_published) fields.push('published_at=NOW()');
    }
    if (!fields.length) return res.status(400).json({ error: 'no_fields' });
    vals.push(req.params.id);
    await pool.query(`UPDATE job_postings SET ${fields.join(', ')} WHERE id=?`, vals);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'content.job.update',
                entityType: 'job_posting', entityId: Number(req.params.id), ip: req.ip });
    // Auto-broadcast on transition to published.
    if (d.is_published === true) {
      const [rows] = await pool.query(`SELECT title FROM job_postings WHERE id=?`, [req.params.id]);
      const r = rows[0];
      if (r) await autoBroadcast({
        text: `Now hiring: ${r.title}. Apply via the Careers page.`,
        link: `${req.protocol}://${req.get('host') || 'school.test'}/careers/${req.params.id}`,
        kind: 'job',
      });
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/jobs/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM job_postings WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'content.job.delete',
                entityType: 'job_posting', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// =====================================================================
// Homepage slides
// =====================================================================
const slideSchema = z.object({
  title:     z.string().min(1).max(190),
  subtitle:  z.string().max(255).optional(),
  image_url: z.string().max(255).optional(),
  cta_label: z.string().max(64).optional(),
  cta_href:  z.string().max(255).optional(),
  position:  z.number().int().min(0).max(999).optional(),
  is_active: z.boolean().optional(),
});

router.get('/slides', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM homepage_slides ORDER BY position ASC, id ASC`);
    res.json({ items: rows });
  } catch (err) { next(err); }
});

router.post('/slides', async (req, res, next) => {
  try {
    const p = slideSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const [r] = await pool.query(
      `INSERT INTO homepage_slides (title, subtitle, image_url, cta_label, cta_href, position, is_active)
       VALUES (?,?,?,?,?,?,?)`,
      [d.title, d.subtitle || null, d.image_url || null, d.cta_label || null, d.cta_href || null,
       d.position || 0, d.is_active === false ? 0 : 1]);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'content.slide.create',
                entityType: 'homepage_slide', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (err) { next(err); }
});

router.put('/slides/:id', async (req, res, next) => {
  try {
    const p = slideSchema.partial().safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const fields = []; const vals = [];
    for (const k of ['title','subtitle','image_url','cta_label','cta_href','position']) {
      if (d[k] !== undefined) { fields.push(`${k}=?`); vals.push(d[k]); }
    }
    if (d.is_active !== undefined) { fields.push('is_active=?'); vals.push(d.is_active ? 1 : 0); }
    if (!fields.length) return res.status(400).json({ error: 'no_fields' });
    vals.push(req.params.id);
    await pool.query(`UPDATE homepage_slides SET ${fields.join(', ')} WHERE id=?`, vals);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'content.slide.update',
                entityType: 'homepage_slide', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/slides/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM homepage_slides WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'content.slide.delete',
                entityType: 'homepage_slide', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// =====================================================================
// Achievements
// =====================================================================
const achievementSchema = z.object({
  year:        z.number().int().min(1900).max(2100),
  title:       z.string().min(1).max(190),
  description: z.string().max(500).optional(),
  icon:        z.enum(['trophy','medal','star','book','flask']).default('trophy'),
  position:    z.number().int().min(0).max(999).optional(),
  is_active:   z.boolean().optional(),
});

router.get('/achievements', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM achievements ORDER BY position ASC, year DESC`);
    res.json({ items: rows });
  } catch (err) { next(err); }
});

router.post('/achievements', async (req, res, next) => {
  try {
    const p = achievementSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const [r] = await pool.query(
      `INSERT INTO achievements (year, title, description, icon, position, is_active)
       VALUES (?,?,?,?,?,?)`,
      [d.year, d.title, d.description || null, d.icon, d.position || 0, d.is_active === false ? 0 : 1]);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'content.achievement.create',
                entityType: 'achievement', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (err) { next(err); }
});

router.put('/achievements/:id', async (req, res, next) => {
  try {
    const p = achievementSchema.partial().safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const fields = []; const vals = [];
    for (const k of ['year','title','description','icon','position']) {
      if (d[k] !== undefined) { fields.push(`${k}=?`); vals.push(d[k]); }
    }
    if (d.is_active !== undefined) { fields.push('is_active=?'); vals.push(d.is_active ? 1 : 0); }
    if (!fields.length) return res.status(400).json({ error: 'no_fields' });
    vals.push(req.params.id);
    await pool.query(`UPDATE achievements SET ${fields.join(', ')} WHERE id=?`, vals);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'content.achievement.update',
                entityType: 'achievement', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/achievements/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM achievements WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'content.achievement.delete',
                entityType: 'achievement', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// =====================================================================
// Principal message (singleton)
// =====================================================================
router.get('/principal-message', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM principal_message WHERE id=1`);
    res.json({ item: rows[0] || null });
  } catch (err) { next(err); }
});

router.put('/principal-message', async (req, res, next) => {
  try {
    const schema = z.object({
      principal_name: z.string().min(1).max(190),
      designation:    z.string().max(190).optional(),
      photo_url:      z.string().max(255).optional(),
      message_body:   z.string().min(1),
      signature_url:  z.string().max(255).optional(),
    });
    const p = schema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    await pool.query(
      `INSERT INTO principal_message (id, principal_name, designation, photo_url, message_body, signature_url, updated_by)
       VALUES (1, ?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE principal_name=VALUES(principal_name), designation=VALUES(designation),
         photo_url=VALUES(photo_url), message_body=VALUES(message_body),
         signature_url=VALUES(signature_url), updated_by=VALUES(updated_by)`,
      [d.principal_name, d.designation || null, d.photo_url || null, d.message_body,
       d.signature_url || null, req.user.id]);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'content.principal_message.update',
                entityType: 'principal_message', entityId: 1, ip: req.ip });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// =====================================================================
// Site settings (key/value store; admin can update individual keys)
// =====================================================================
router.get('/settings', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT id, key_name, value, type, description, updated_at FROM site_settings ORDER BY key_name`);
    res.json({ items: rows });
  } catch (err) { next(err); }
});

router.put('/settings/:key', requirePermission('settings.manage'), async (req, res, next) => {
  try {
    const schema = z.object({
      value: z.string().optional(),
      type:  z.enum(['string','text','json','integer','boolean','url']).optional(),
      description: z.string().max(255).optional(),
    });
    const p = schema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const fields = []; const vals = [];
    if (d.value !== undefined) { fields.push('value=?'); vals.push(d.value); }
    if (d.type !== undefined) { fields.push('type=?'); vals.push(d.type); }
    if (d.description !== undefined) { fields.push('description=?'); vals.push(d.description); }
    fields.push('updated_by=?'); vals.push(req.user.id);
    vals.push(req.params.key);
    await pool.query(`UPDATE site_settings SET ${fields.join(', ')} WHERE key_name=?`, vals);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'settings.update',
                entityType: 'site_setting', meta: { key: req.params.key, ...d }, ip: req.ip });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// =====================================================================
// Review queues: admission applications, job applications, contact msgs
// =====================================================================
router.get('/admissions', async (req, res, next) => {
  try {
    const status = req.query.status;
    const params = [];
    let where = '1=1';
    if (status) { where += ' AND status=?'; params.push(status); }
    const [rows] = await pool.query(
      `SELECT a.*, c.name AS applying_class_name
         FROM admission_applications a
         JOIN classes c ON c.id = a.applying_class_id
        WHERE ${where}
        ORDER BY created_at DESC LIMIT 500`, params);
    res.json({ items: rows });
  } catch (err) { next(err); }
});

router.patch('/admissions/:id', requirePermission('content.admissions.review'), async (req, res, next) => {
  try {
    const schema = z.object({
      status: z.enum(['new','under_review','accepted','rejected','waitlisted']),
    });
    const p = schema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    await pool.query(
      `UPDATE admission_applications SET status=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?`,
      [p.data.status, req.user.id, req.params.id]);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'admission.review',
                entityType: 'admission_application', entityId: Number(req.params.id),
                ip: req.ip, meta: { status: p.data.status } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get('/job-applications', requirePermission('content.jobs.review'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM job_applications ORDER BY created_at DESC LIMIT 500`);
    res.json({ items: rows });
  } catch (err) { next(err); }
});

router.patch('/job-applications/:id', requirePermission('content.jobs.review'), async (req, res, next) => {
  try {
    const schema = z.object({ status: z.enum(['new','under_review','shortlisted','rejected','hired']) });
    const p = schema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    await pool.query(
      `UPDATE job_applications SET status=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?`,
      [p.data.status, req.user.id, req.params.id]);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'job_application.review',
                entityType: 'job_application', entityId: Number(req.params.id),
                ip: req.ip, meta: { status: p.data.status } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get('/contact-messages', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 500`);
    res.json({ items: rows });
  } catch (err) { next(err); }
});

// =====================================================================
// Announcements — short time-sensitive notices shown on the homepage.
// Uses the same notifications.create / notifications.view permissions.
// =====================================================================
// Pluggable social-broadcast helper. No-op if no platform is enabled.
// Errors are caught and logged so a social failure never breaks the
// content publish path.
async function autoBroadcast({ text, link, kind }) {
  try {
    const social = require('../integrations/social');
    const enabled = (social.status().then(s => (s.platforms || []).some(p => p.is_enabled)) || Promise.resolve(false));
    if (!await enabled) return;
    const r = await social.broadcast({ text, link });
    await log({ action: 'integrations.social.broadcast', entityType: 'social', meta: { kind, results: r } });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[autoBroadcast] social broadcast failed:', e.message);
  }
}

const announcementSchema = z.object({
  title: z.string().min(1).max(190),
  body: z.string().max(1000).optional(),
  link_label: z.string().max(64).optional(),
  link_href: z.string().max(255).optional(),
  severity: z.enum(['info', 'success', 'warning', 'danger']).default('info'),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  is_active: z.boolean().optional(),
});

router.get('/announcements', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM announcements ORDER BY id DESC LIMIT 200`);
    res.json({ items: rows });
  } catch (err) { next(err); }
});

router.post('/announcements', requirePermission('notifications.create'), async (req, res, next) => {
  try {
    const p = announcementSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const [r] = await pool.query(
      `INSERT INTO announcements (title, body, link_label, link_href, severity,
         starts_at, ends_at, is_active, created_by)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [d.title, d.body || null, d.link_label || null, d.link_href || null,
       d.severity, d.starts_at || null, d.ends_at || null,
       d.is_active === false ? 0 : 1, req.user.id]);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'announcement.create',
                entityType: 'announcement', entityId: r.insertId, ip: req.ip, meta: d });
    res.status(201).json({ id: r.insertId });
  } catch (err) { next(err); }
});

router.put('/announcements/:id', requirePermission('notifications.create'), async (req, res, next) => {
  try {
    const p = announcementSchema.partial().safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const fields = []; const vals = [];
    for (const k of ['title', 'body', 'link_label', 'link_href', 'severity', 'starts_at', 'ends_at']) {
      if (d[k] !== undefined) { fields.push(`${k}=?`); vals.push(d[k]); }
    }
    if (d.is_active !== undefined) { fields.push('is_active=?'); vals.push(d.is_active ? 1 : 0); }
    if (!fields.length) return res.status(400).json({ error: 'no_fields' });
    vals.push(req.params.id);
    await pool.query(`UPDATE announcements SET ${fields.join(', ')} WHERE id=?`, vals);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'announcement.update',
                entityType: 'announcement', entityId: Number(req.params.id), ip: req.ip, meta: d });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/announcements/:id', requirePermission('notifications.create'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'announcement.delete',
                entityType: 'announcement', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
