// Public website endpoints (news, events, gallery, contact form). These are
// mounted at /api/public and intentionally unauthenticated.
const express = require('express');
const { z } = require('zod');
const { pool } = require('../db');
const { log } = require('../audit/log');

const router = express.Router();

router.get('/news', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, type, title, slug, excerpt, cover_image, event_date, published_at
         FROM news_events
        WHERE is_published = 1
        ORDER BY published_at DESC LIMIT 50`);
    res.json({ items: rows });
  } catch (err) { next(err); }
});

router.get('/news/:slug', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, type, title, slug, excerpt, body, cover_image, event_date, published_at
         FROM news_events WHERE slug=? AND is_published=1 LIMIT 1`, [req.params.slug]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json({ item: rows[0] });
  } catch (err) { next(err); }
});

router.get('/gallery', async (req, res, next) => {
  try {
    const cat = req.query.category;
    const params = [];
    let where = 'is_published = 1';
    if (cat) { where += ' AND category = ?'; params.push(cat); }
    const [rows] = await pool.query(
      `SELECT id, category, caption, media_url, media_type, taken_on
         FROM gallery_items WHERE ${where}
         ORDER BY taken_on DESC LIMIT 200`, params);
    res.json({ items: rows });
  } catch (err) { next(err); }
});

const contactSchema = z.object({
  name: z.string().min(1).max(190),
  email: z.string().email(),
  phone: z.string().max(32).optional(),
  subject: z.string().max(190).optional(),
  message: z.string().min(1).max(5000),
});

router.post('/contact', async (req, res, next) => {
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', detail: parsed.error.flatten() });
    const { name, email, phone, subject, message } = parsed.data;
    await pool.query(
      `INSERT INTO contact_messages (name, email, phone, subject, message, ip) VALUES (?,?,?,?,?,?)`,
      [name, email, phone || null, subject || null, message, req.ip]);
    await log({ action: 'public.contact.submitted', entityType: 'contact_message', ip: req.ip, meta: { email } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

const admissionSchema = z.object({
  applicant_name: z.string().min(1).max(190),
  parent_name: z.string().min(1).max(190),
  email: z.string().email(),
  phone: z.string().min(5).max(32),
  applying_class_id: z.coerce.number().int().positive(),
  date_of_birth: z.string().optional(),
  previous_school: z.string().max(255).optional(),
  address: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
});

router.post('/admissions/apply', async (req, res, next) => {
  try {
    const parsed = admissionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', detail: parsed.error.flatten() });
    const data = parsed.data;
    const [result] = await pool.query(
      `INSERT INTO admission_applications
        (applicant_name, parent_name, email, phone, applying_class_id, date_of_birth, previous_school, address, notes)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [data.applicant_name, data.parent_name, data.email, data.phone, data.applying_class_id,
       data.date_of_birth || null, data.previous_school || null, data.address || null, data.notes || null]);
    await log({ action: 'public.admission.submitted', entityType: 'admission_application', entityId: result.insertId, ip: req.ip });
    res.status(201).json({ ok: true, id: result.insertId });
  } catch (err) { next(err); }
});

const jobSchema = z.object({
  position: z.string().min(1).max(190),
  full_name: z.string().min(1).max(190),
  email: z.string().email(),
  phone: z.string().min(5).max(32),
  cnic: z.string().max(32).optional(),
  experience: z.string().max(255).optional(),
  cover_letter: z.string().max(5000).optional(),
});

router.post('/jobs/apply', async (req, res, next) => {
  try {
    const parsed = jobSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', detail: parsed.error.flatten() });
    const data = parsed.data;
    const [result] = await pool.query(
      `INSERT INTO job_applications
        (position, full_name, email, phone, cnic, experience, cover_letter)
       VALUES (?,?,?,?,?,?,?)`,
      [data.position, data.full_name, data.email, data.phone, data.cnic || null,
       data.experience || null, data.cover_letter || null]);
    await log({ action: 'public.job.submitted', entityType: 'job_application', entityId: result.insertId, ip: req.ip });
    res.status(201).json({ ok: true, id: result.insertId });
  } catch (err) { next(err); }
});

router.get('/classes', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT id, name, level FROM classes ORDER BY level`);
    res.json({ items: rows });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------
// Phase 2 — Combined homepage payload: settings + slides + achievements
// + principal message + (caller can fetch news/gallery separately).
// ---------------------------------------------------------------------
async function buildHomepagePayload() {
  const [settingsRows] = await pool.query(`SELECT key_name, value, type FROM site_settings`);
  const settings = {};
  for (const r of settingsRows) {
    let v = r.value;
    if (r.type === 'boolean') v = v === 'true' || v === '1';
    else if (r.type === 'integer') v = v != null ? Number(v) : null;
    else if (r.type === 'json') { try { v = JSON.parse(v); } catch { v = null; } }
    settings[r.key_name] = v;
  }

  const [slides] = await pool.query(
    `SELECT id, title, subtitle, image_url, cta_label, cta_href
       FROM homepage_slides
      WHERE is_active = 1
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (ends_at   IS NULL OR ends_at   >= NOW())
      ORDER BY position ASC, id ASC`);

  const [achievements] = await pool.query(
    `SELECT id, year, title, description, icon
       FROM achievements WHERE is_active = 1
       ORDER BY position ASC, year DESC LIMIT 8`);

  const [principalRows] = await pool.query(`SELECT * FROM principal_message WHERE id = 1 LIMIT 1`);
  const principal = principalRows[0] || null;

  return { settings, slides, achievements, principal };
}

router.get('/site', async (req, res, next) => {
  try {
    res.json(await buildHomepagePayload());
  } catch (err) { next(err); }
});

router.get('/homepage', async (req, res, next) => {
  try {
    const payload = await buildHomepagePayload();
    // Also include 3 latest news + 6 latest gallery items for the homepage.
    const [news] = await pool.query(
      `SELECT id, type, title, slug, excerpt, cover_image, event_date, published_at
         FROM news_events WHERE is_published = 1
         ORDER BY published_at DESC LIMIT 3`);
    const [gallery] = await pool.query(
      `SELECT id, category, caption, media_url, media_type, taken_on
         FROM gallery_items WHERE is_published = 1
         ORDER BY taken_on DESC LIMIT 6`);
    res.json({ ...payload, latest_news: news, gallery_preview: gallery });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------
// Job postings (public list + detail)
// ---------------------------------------------------------------------
router.get('/jobs', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, department, location, employment_type, description,
              salary_range, apply_deadline, published_at
         FROM job_postings
        WHERE is_published = 1
          AND (apply_deadline IS NULL OR apply_deadline >= CURDATE())
        ORDER BY published_at DESC`);
    res.json({ items: rows });
  } catch (err) { next(err); }
});

router.get('/jobs/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, department, location, employment_type, description,
              requirements, salary_range, apply_deadline, published_at
         FROM job_postings
        WHERE id = ? AND is_published = 1 LIMIT 1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json({ item: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
