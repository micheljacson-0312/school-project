// Alumni portal (Phase 7) — replaces Phase 1 placeholder dashboard.
const express = require('express');
const { z } = require('zod');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../auth/middleware');
const { requirePermission } = require('../rbac/middleware');
const { log } = require('../audit/log');

const router = express.Router();
router.use(requireAuth(), requireRole('alumni','admin'));

// ---------------------------------------------------------------------
// Dashboard — alumni's own profile + aggregate stats
// ---------------------------------------------------------------------
router.get('/dashboard', async (req, res, next) => {
  try {
    const [own] = await pool.query(
      `SELECT id, full_name, passing_year, batch_name, profession, organization, city, country, bio, is_verified
         FROM alumni WHERE user_id=? LIMIT 1`, [req.user.id]);
    const [stats] = await pool.query(
      `SELECT COUNT(*) AS total,
              (SELECT COUNT(*) FROM alumni WHERE passing_year = YEAR(CURDATE()) - 1) AS last_year,
              COUNT(DISTINCT profession) AS distinct_professions,
              COUNT(DISTINCT country) AS distinct_countries
         FROM alumni`);
    res.json({
      role: 'alumni',
      greeting: `Welcome, ${own[0]?.full_name || req.user.full_name}`,
      profile: own[0] || null,
      stats: stats[0],
    });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Search alumni (all authenticated alumni can browse the directory)
// ---------------------------------------------------------------------
router.get('/search', async (req, res, next) => {
  try {
    const { q, year, profession, batch } = req.query;
    const where = ['is_verified=1']; const p = [];
    if (q) {
      where.push('(full_name LIKE ? OR profession LIKE ? OR organization LIKE ? OR batch_name LIKE ? OR city LIKE ?)');
      const l = `%${q}%`; p.push(l, l, l, l, l);
    }
    if (year)       { where.push('passing_year=?'); p.push(Number(year)); }
    if (profession) { where.push('profession LIKE ?'); p.push(`%${profession}%`); }
    if (batch)      { where.push('batch_name=?'); p.push(batch); }
    const [rows] = await pool.query(
      `SELECT id, full_name, passing_year, batch_name, profession, organization, city, country
         FROM alumni WHERE ${where.join(' AND ')}
         ORDER BY passing_year DESC, full_name LIMIT 100`, p);
    res.json({ results: rows });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Distinct batches / years (for filter dropdowns)
// ---------------------------------------------------------------------
router.get('/batches', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT batch_name, MIN(passing_year) AS first_year, MAX(passing_year) AS last_year, COUNT(*) AS count
         FROM alumni WHERE batch_name IS NOT NULL AND batch_name<>''
         GROUP BY batch_name ORDER BY first_year`);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Update own profile
// ---------------------------------------------------------------------
const profileUpdateSchema = z.object({
  profession:  z.string().max(190).optional(),
  organization: z.string().max(190).optional(),
  city:         z.string().max(128).optional(),
  country:      z.string().max(128).optional(),
  bio:          z.string().max(2000).optional(),
});

router.put('/profile', async (req, res, next) => {
  try {
    const p = profileUpdateSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const d = p.data;
    const sets=[]; const v=[];
    for (const k of ['profession','organization','city','country','bio']) if (d[k] !== undefined) { sets.push(`\`${k}\`=?`); v.push(d[k]); }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    v.push(req.user.id);
    const [r] = await pool.query(`UPDATE alumni SET ${sets.join(', ')} WHERE user_id=?`, v);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'no_alumni_profile' });
    await log({ actorId: req.user.id, action: 'alumni.profile.update', entityType: 'alumni', ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Admin: register a new alumni (no existing user — admin adds manually)
// ---------------------------------------------------------------------
const registerSchema = z.object({
  full_name:     z.string().min(1).max(190),
  passing_year:  z.number().int().min(1900).max(2200),
  batch_name:    z.string().max(64).optional(),
  profession:    z.string().max(190).optional(),
  organization:  z.string().max(190).optional(),
  city:          z.string().max(128).optional(),
  country:       z.string().max(128).optional(),
  email:         z.string().email().optional(),
  phone:         z.string().max(32).optional(),
});

router.post('/register', requirePermission('alumni.manage'), async (req, res, next) => {
  try {
    const p = registerSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const [r] = await pool.query(
      `INSERT INTO alumni (full_name, passing_year, batch_name, profession, organization, city, country, email, phone, is_verified)
       VALUES (?,?,?,?,?,?,?,?,?,1)`,
      [d.full_name, d.passing_year, d.batch_name || null, d.profession || null, d.organization || null,
       d.city || null, d.country || null, d.email || null, d.phone || null]);
    await log({ actorId: req.user.id, action: 'alumni.register', entityType: 'alumni', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Admin: verify an alumni entry (sets is_verified=1)
// ---------------------------------------------------------------------
router.post('/:id/verify', requirePermission('alumni.manage'), async (req, res, next) => {
  try {
    await pool.query('UPDATE alumni SET is_verified=1 WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, action: 'alumni.verify', entityType: 'alumni', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
