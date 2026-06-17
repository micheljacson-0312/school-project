// Results reports & bulk upload (Phase 5).
//   POST /api/results/bulk              — upload many results in one request
//   GET  /api/results/report-card/:sid  — full report card for a student
//   GET  /api/results/summary           — class summary (averages, pass/fail)
//   GET  /api/results/promotion         — students at risk / candidate list
const express = require('express');
const { z } = require('zod');
const { pool } = require('../db');
const { requireAuth } = require('../auth/middleware');
const { requirePermission } = require('../rbac/middleware');
const { log } = require('../audit/log');

const router = express.Router();
router.use(requireAuth());

const bulkSchema = z.object({
  subject_id: z.number().int().positive(),
  term_id:    z.number().int().positive(),
  session_id: z.number().int().positive(),
  total_marks: z.number().min(0).max(10000).default(100),
  results: z.array(z.object({
    student_id: z.number().int().positive(),
    marks_obtained: z.number().min(0).max(10000),
    grade:    z.string().max(8).optional(),
    remarks:  z.string().max(255).optional(),
  })).min(1).max(500),
});

router.post('/bulk', requirePermission('results.bulk_upload'), async (req, res, next) => {
  try {
    const p = bulkSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const conn = await pool.getConnection();
    let inserted = 0;
    try {
      await conn.beginTransaction();
      for (const r of d.results) {
        await conn.query(
          `INSERT INTO results (student_id, subject_id, term_id, session_id, marks_obtained, total_marks, grade, remarks, uploaded_by)
           VALUES (?,?,?,?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE marks_obtained=VALUES(marks_obtained), total_marks=VALUES(total_marks),
             grade=VALUES(grade), remarks=VALUES(remarks), uploaded_by=VALUES(uploaded_by)`,
          [r.student_id, d.subject_id, d.term_id, d.session_id, r.marks_obtained, d.total_marks,
           r.grade || null, r.remarks || null, req.user.id]);
        inserted++;
      }
      await conn.commit();
    } catch (e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
    await log({ actorId: req.user.id, action: 'results.bulk_upload', entityType: 'result', ip: req.ip, meta: { subject_id: d.subject_id, term_id: d.term_id, count: inserted } });
    res.json({ ok: true, count: inserted });
  } catch (e) { next(e); }
});

// GET /api/results/report-card/:studentId?term_id=
// Returns a full per-subject result card for a student.
router.get('/report-card/:studentId', requirePermission('results.report_card'), async (req, res, next) => {
  try {
    const { term_id, session_id } = req.query;
    const where = ['r.student_id=?']; const p = [req.params.studentId];
    if (term_id)    { where.push('r.term_id=?');    p.push(term_id); }
    if (session_id) { where.push('r.session_id=?'); p.push(session_id); }
    const [rows] = await pool.query(
      `SELECT r.id, r.marks_obtained, r.total_marks, r.grade, r.remarks,
              sub.id AS subject_id, sub.name AS subject_name,
              t.name AS term_name, ay.name AS session_name
         FROM results r
         JOIN subjects sub ON sub.id = r.subject_id
         JOIN terms t      ON t.id = r.term_id
         JOIN academic_sessions ay ON ay.id = r.session_id
        WHERE ${where.join(' AND ')}
        ORDER BY sub.name`, p);
    // Compute summary
    const summary = { subjects: rows.length, total_marks: 0, marks_obtained: 0 };
    for (const r of rows) {
      summary.total_marks += Number(r.total_marks);
      summary.marks_obtained += Number(r.marks_obtained);
    }
    summary.percentage = summary.total_marks ? Math.round((summary.marks_obtained / summary.total_marks) * 100) : null;
    res.json({ student_id: Number(req.params.studentId), summary, items: rows });
  } catch (e) { next(e); }
});

// GET /api/results/summary?class_id=&section_id=&term_id=
// Class-level summary: per-subject averages, pass/fail counts.
router.get('/summary', requirePermission('results.view'), async (req, res, next) => {
  try {
    const { class_id, section_id, term_id, session_id } = req.query;
    if (!class_id || !section_id || !term_id) return res.status(400).json({ error: 'missing_class_section_term' });
    const sid = session_id || 1; // default to current session if not provided
    const [rows] = await pool.query(
      `SELECT sub.id AS subject_id, sub.name AS subject_name,
              COUNT(r.id) AS graded_count,
              ROUND(AVG(r.marks_obtained), 2) AS avg_marks,
              ROUND(AVG(100 * r.marks_obtained / NULLIF(r.total_marks, 0)), 1) AS avg_pct,
              SUM(CASE WHEN r.marks_obtained >= 0.5 * r.total_marks THEN 1 ELSE 0 END) AS passed,
              SUM(CASE WHEN r.marks_obtained <  0.5 * r.total_marks THEN 1 ELSE 0 END) AS failed,
              MAX(r.marks_obtained) AS max_marks,
              MIN(r.marks_obtained) AS min_marks
         FROM subjects sub
         LEFT JOIN results r
           ON r.subject_id = sub.id
          AND r.term_id    = ?
          AND r.session_id = ?
          AND r.student_id IN (SELECT id FROM students WHERE class_id=? AND section_id=? AND status='active')
        WHERE sub.class_id=?
        GROUP BY sub.id
        ORDER BY sub.name`, [term_id, sid, class_id, section_id, class_id]);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

// GET /api/results/promotion?class_id=&section_id=&term_id=&pass_pct=50
// Students whose overall percentage is below threshold — promotion/fail candidates.
router.get('/promotion', requirePermission('results.view'), async (req, res, next) => {
  try {
    const { class_id, section_id, term_id, session_id, pass_pct = 50 } = req.query;
    if (!class_id || !section_id || !term_id) return res.status(400).json({ error: 'missing_class_section_term' });
    const sid = session_id || 1;
    const pp = Number(pass_pct);
    const [rows] = await pool.query(
      `SELECT s.id AS student_id, s.admission_no, u.full_name,
              COUNT(r.id) AS graded_subjects,
              ROUND(100 * SUM(r.marks_obtained) / NULLIF(SUM(r.total_marks), 0), 1) AS overall_pct,
              SUM(CASE WHEN 100 * r.marks_obtained / r.total_marks >= ? THEN 1 ELSE 0 END) AS subjects_passed,
              SUM(CASE WHEN 100 * r.marks_obtained / r.total_marks <  ? THEN 1 ELSE 0 END) AS subjects_failed
         FROM students s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN results r
           ON r.student_id = s.id
          AND r.term_id    = ?
          AND r.session_id = ?
        WHERE s.class_id=? AND s.section_id=? AND s.status='active'
        GROUP BY s.id
        HAVING overall_pct IS NULL OR overall_pct < ?
        ORDER BY overall_pct ASC`, [pp, pp, term_id, sid, class_id, section_id, pp]);
    res.json({ pass_pct: pp, items: rows });
  } catch (e) { next(e); }
});

module.exports = router;
