// Evaluation forms (Phase 5).
//   GET    /api/evaluation/forms              — list active forms (audience-filtered)
//   POST   /api/evaluation/forms              — create (admin/coordinator)
//   GET    /api/evaluation/forms/:id          — get form (with respondent eligibility check)
//   PUT    /api/evaluation/forms/:id          — update
//   DELETE /api/evaluation/forms/:id          — soft-delete (is_active=0)
//   POST   /api/evaluation/forms/:id/respond  — submit response
//   GET    /api/evaluation/forms/:id/responses — list responses (admin/coordinator)
//   GET    /api/evaluation/forms/:id/summary   — aggregated stats
//   GET    /api/evaluation/my-responses       — forms I have already responded to
const express = require('express');
const { z } = require('zod');
const { pool } = require('../db');
const { requireAuth } = require('../auth/middleware');
const { requirePermission } = require('../rbac/middleware');
const { log } = require('../audit/log');

const router = express.Router();
router.use(requireAuth());

const formSchema = z.object({
  title:      z.string().min(1).max(190),
  audience:   z.enum(['all','students','teachers','parents','staff','role']),
  audience_role_id: z.number().int().positive().optional(),
  schema_json: z.any(),                       // array of questions, flexible
  is_active:  z.boolean().optional(),
});

router.get('/forms', async (req, res, next) => {
  try {
    const where = ['is_active=1'];
    const p = [];
    // Filter by audience
    if (req.user.role_key === 'student')  where.push("audience IN ('all','students','role')");
    if (req.user.role_key === 'teacher')  where.push("audience IN ('all','teachers','role')");
    if (req.user.role_key === 'parent')   where.push("audience IN ('all','parents','role')");
    if (['coordinator','accountant','operator'].includes(req.user.role_key)) where.push("audience IN ('all','staff','role')");
    // Check if already responded
    const [rows] = await pool.query(
      `SELECT f.id, f.title, f.audience, f.schema_json, f.created_at,
              EXISTS (SELECT 1 FROM evaluation_responses r WHERE r.form_id=f.id AND r.respondent_id=?) AS responded
         FROM evaluation_forms f
        WHERE ${where.join(' AND ')}
        ORDER BY f.created_at DESC LIMIT 50`, [req.user.id]);
    // Hide correct answers for non-admin
    const isAdmin = req.user.role_key === 'admin' || req.user.permissions?.includes('evaluation.view_responses');
    const items = rows.map(f => ({
      ...f,
      schema_json: isAdmin ? f.schema_json : sanitize(f.schema_json),
    }));
    res.json({ items });
  } catch (e) { next(e); }
});

// Strip correct answers from questions so respondents don't see them.
function sanitize(schema) {
  if (!Array.isArray(schema)) return schema;
  return schema.map(q => ({ ...q, correct: undefined, correct_key: undefined }));
}

router.post('/forms', requirePermission('evaluation.manage_forms'), async (req, res, next) => {
  try {
    const p = formSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const [r] = await pool.query(
      `INSERT INTO evaluation_forms (title, audience, audience_role_id, schema_json, is_active, created_by)
       VALUES (?,?,?,?,?,?)`,
      [d.title, d.audience, d.audience_role_id || null, JSON.stringify(d.schema_json),
       d.is_active === false ? 0 : 1, req.user.id]);
    await log({ actorId: req.user.id, action: 'evaluation.form.create', entityType: 'evaluation_form', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});

router.get('/forms/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM evaluation_forms WHERE id=? LIMIT 1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    const f = rows[0];
    const isAdmin = req.user.role_key === 'admin' || req.user.permissions?.includes('evaluation.view_responses');
    f.schema_json = isAdmin ? f.schema_json : sanitize(f.schema_json);
    // Mark whether the requester has responded
    const [my] = await pool.query(
      `SELECT id, answers_json, created_at FROM evaluation_responses WHERE form_id=? AND respondent_id=? LIMIT 1`,
      [req.params.id, req.user.id]);
    f.my_response = my[0] || null;
    res.json({ item: f });
  } catch (e) { next(e); }
});

router.put('/forms/:id', requirePermission('evaluation.manage_forms'), async (req, res, next) => {
  try {
    const p = formSchema.partial().safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const d = p.data;
    const sets=[]; const v=[];
    for (const k of ['title','audience','audience_role_id']) if (d[k] !== undefined) { sets.push(`\`${k}\`=?`); v.push(d[k]); }
    if (d.schema_json !== undefined) { sets.push('schema_json=?'); v.push(JSON.stringify(d.schema_json)); }
    if (d.is_active !== undefined) { sets.push('is_active=?'); v.push(d.is_active?1:0); }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    v.push(req.params.id);
    await pool.query(`UPDATE evaluation_forms SET ${sets.join(', ')} WHERE id=?`, v);
    await log({ actorId: req.user.id, action: 'evaluation.form.update', entityType: 'evaluation_form', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/forms/:id', requirePermission('evaluation.manage_forms'), async (req, res, next) => {
  try {
    await pool.query('UPDATE evaluation_forms SET is_active=0 WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, action: 'evaluation.form.deactivate', entityType: 'evaluation_form', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

const responseSchema = z.object({
  answers:    z.record(z.string(), z.any()),
  target_id:  z.number().int().positive().optional(),
});

router.post('/forms/:id/respond', requirePermission('evaluation.respond'), async (req, res, next) => {
  try {
    const p = responseSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const d = p.data;
    // Prevent duplicate response
    const [existing] = await pool.query(
      `SELECT id FROM evaluation_responses WHERE form_id=? AND respondent_id=? LIMIT 1`,
      [req.params.id, req.user.id]);
    if (existing.length) return res.status(409).json({ error: 'already_responded', response_id: existing[0].id });
    const [r] = await pool.query(
      `INSERT INTO evaluation_responses (form_id, respondent_id, target_id, answers_json, created_at)
       VALUES (?,?,?,?, NOW())`,
      [req.params.id, req.user.id, d.target_id || null, JSON.stringify(d.answers)]);
    await log({ actorId: req.user.id, action: 'evaluation.respond', entityType: 'evaluation_response', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});

router.get('/forms/:id/responses', requirePermission('evaluation.view_responses'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT er.id, er.answers_json, er.target_id, er.created_at,
              u.full_name AS respondent_name, u.email AS respondent_email
         FROM evaluation_responses er
         JOIN users u ON u.id = er.respondent_id
        WHERE er.form_id = ?
        ORDER BY er.created_at DESC LIMIT 500`, [req.params.id]);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

// Aggregated stats: how many respondents, score distribution per question.
router.get('/forms/:id/summary', requirePermission('evaluation.view_responses'), async (req, res, next) => {
  try {
    const [formRows] = await pool.query(`SELECT id, schema_json FROM evaluation_forms WHERE id=?`, [req.params.id]);
    if (!formRows.length) return res.status(404).json({ error: 'not_found' });
    const form = formRows[0];
    const schema = typeof form.schema_json === 'string' ? JSON.parse(form.schema_json) : form.schema_json;

    const [stats] = await pool.query(
      `SELECT COUNT(*) AS respondents, MIN(created_at) AS first_response, MAX(created_at) AS last_response
         FROM evaluation_responses WHERE form_id=?`, [req.params.id]);

    // Per-question aggregation (rating/score questions)
    const [responses] = await pool.query(
      `SELECT answers_json FROM evaluation_responses WHERE form_id=?`, [req.params.id]);
    const perQuestion = [];
    if (Array.isArray(schema)) {
      for (let i = 0; i < schema.length; i++) {
        const q = schema[i];
        const bucket = { question: q.prompt || q.text || `Q${i+1}`, type: q.type || 'rating', count: 0, sum: 0, avg: null };
        for (const r of responses) {
          const ans = typeof r.answers_json === 'string' ? JSON.parse(r.answers_json) : r.answers_json;
          const v = ans[String(q.id) ?? ans[String(i)] ?? ans[String(i+1)]];
          if (typeof v === 'number') { bucket.count++; bucket.sum += v; }
        }
        bucket.avg = bucket.count ? +(bucket.sum / bucket.count).toFixed(2) : null;
        perQuestion.push(bucket);
      }
    }
    res.json({ form_id: Number(req.params.id), ...stats[0], per_question: perQuestion });
  } catch (e) { next(e); }
});

module.exports = router;
