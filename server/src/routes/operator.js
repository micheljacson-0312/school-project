// Computer Operator portal (Phase 7) — ID cards, certificates, document
// templates, fee structure PDFs. The brief says "templated, exportable as
// PDF" — Phase 7 ships the data endpoints + a print-friendly frontend
// layout. A real PDF renderer (e.g. Puppeteer, react-pdf) can be plugged
// in later by swapping the frontend `window.print()` step for a
// `printToPdf()` call.
const express = require('express');
const { z } = require('zod');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../auth/middleware');
const { requirePermission } = require('../rbac/middleware');
const { log } = require('../audit/log');

const router = express.Router();
router.use(requireAuth(), requireRole('operator','admin'));

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------
router.get('/dashboard', async (req, res, next) => {
  try {
    const [students]   = await pool.query(`SELECT COUNT(*) AS n FROM students WHERE status='active'`);
    const [teachers]   = await pool.query(`SELECT COUNT(*) AS n FROM teachers WHERE status='active'`);
    const [templates]  = await pool.query(`SELECT COUNT(*) AS n FROM document_templates WHERE is_active=1`);
    const [generated]  = await pool.query(`SELECT COUNT(*) AS n FROM generated_documents`);
    res.json({
      role: 'operator',
      greeting: `Welcome, ${req.user.full_name}`,
      students_active: students[0].n,
      teachers_active: teachers[0].n,
      active_templates: templates[0].n,
      documents_generated: generated[0].n,
    });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Document templates — list (admin manages templates in Phase 3)
// ---------------------------------------------------------------------
router.get('/templates', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, key_name, display_name, is_active, created_at
         FROM document_templates WHERE is_active=1 ORDER BY display_name`);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Generated documents — list (history)
// ---------------------------------------------------------------------
router.get('/generated', async (req, res, next) => {
  try {
    const { kind, student_id } = req.query;
    const where = ['1=1']; const p = [];
    if (kind) { where.push('dt.key_name=?'); p.push(kind); }
    if (student_id) { where.push('gd.student_id=?'); p.push(student_id); }
    const [rows] = await pool.query(
      `SELECT gd.id, gd.file_url, gd.created_at, gd.payload_json,
              dt.key_name AS template_key, dt.display_name AS template_name,
              u.full_name AS generated_by_name,
              s.admission_no AS student_admission_no
         FROM generated_documents gd
         JOIN document_templates dt ON dt.id = gd.template_id
         LEFT JOIN users u ON u.id = gd.generated_by
         LEFT JOIN students s ON s.id = gd.student_id
        WHERE ${where.join(' AND ')}
        ORDER BY gd.created_at DESC LIMIT 200`, p);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Generate document — records a generated_documents row + returns data
// for the printable layout (no real PDF rendering yet; window.print()
// covers it).
// ---------------------------------------------------------------------
const genSchema = z.object({
  template_id: z.number().int().positive(),
  student_id:  z.number().int().positive().optional(),
  staff_id:    z.number().int().positive().optional(),
  payload:     z.record(z.string(), z.any()).optional(),
});

router.post('/generate', requirePermission('documents.generate'), async (req, res, next) => {
  try {
    const p = genSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const [tRows] = await pool.query(`SELECT id, display_name FROM document_templates WHERE id=?`, [d.template_id]);
    if (!tRows.length) return res.status(404).json({ error: 'template_not_found' });
    const [r] = await pool.query(
      `INSERT INTO generated_documents (template_id, student_id, staff_id, payload_json, generated_by)
       VALUES (?,?,?,?,?)`,
      [d.template_id, d.student_id || null, d.staff_id || null,
       d.payload ? JSON.stringify(d.payload) : null, req.user.id]);
    await log({ actorId: req.user.id, action: 'documents.generate', entityType: 'generated_document', entityId: r.insertId, ip: req.ip, meta: { template_id: d.template_id } });
    res.status(201).json({ id: r.insertId, template_name: tRows[0].display_name });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Student ID card data
// ---------------------------------------------------------------------
router.get('/id-card/student/:studentId', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id AS student_id, s.admission_no, s.roll_no, s.date_of_birth, s.guardian_name, s.guardian_phone,
              u.full_name, u.email, u.phone,
              c.name AS class_name, sec.name AS section_name, ay.name AS session_name
         FROM students s
         JOIN users u ON u.id = s.user_id
         JOIN classes c ON c.id = s.class_id
         JOIN sections sec ON sec.id = s.section_id
         JOIN academic_sessions ay ON ay.id = s.session_id
        WHERE s.id=? LIMIT 1`, [req.params.studentId]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    const sc = rows[0];
    // Record the generation
    const [tRows] = await pool.query(`SELECT id, display_name FROM document_templates WHERE key_name='student_id_card' LIMIT 1`);
    if (tRows.length) {
      await pool.query(
        `INSERT INTO generated_documents (template_id, student_id, payload_json, generated_by) VALUES (?,?,?,?)`,
        [tRows[0].id, sc.student_id, JSON.stringify({ adm: sc.admission_no }), req.user.id]);
    }
    res.json({ card: { ...sc, template_name: tRows[0]?.display_name || 'Student ID Card' } });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Staff ID card data (teachers / coordinator / accountant / operator)
// ---------------------------------------------------------------------
router.get('/id-card/staff/:userId', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id AS user_id, u.full_name, u.email, u.phone,
              r.key_name AS role_key, r.display_name AS role_name,
              t.employee_code, t.designation, t.joining_date,
              s.id AS staff_id
         FROM users u
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN teachers t ON t.user_id = u.id
         LEFT JOIN staff s    ON s.user_id = u.id
        WHERE u.id=? LIMIT 1`, [req.params.userId]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    const [tRows] = await pool.query(`SELECT id, display_name FROM document_templates WHERE key_name='staff_id_card' LIMIT 1`);
    if (tRows.length) {
      await pool.query(
        `INSERT INTO generated_documents (template_id, staff_id, payload_json, generated_by) VALUES (?,?,?,?)`,
        [tRows[0].id, rows[0].staff_id, JSON.stringify({ role: rows[0].role_key }), req.user.id]);
    }
    res.json({ card: { ...rows[0], template_name: tRows[0]?.display_name || 'Staff ID Card' } });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Certificate (generic, per student)
// ---------------------------------------------------------------------
router.get('/certificate/student/:studentId', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id AS student_id, s.admission_no, s.date_of_birth,
              u.full_name,
              c.name AS class_name, sec.name AS section_name, ay.name AS session_name
         FROM students s
         JOIN users u ON u.id = s.user_id
         JOIN classes c ON c.id = s.class_id
         JOIN sections sec ON sec.id = s.section_id
         JOIN academic_sessions ay ON ay.id = s.session_id
        WHERE s.id=? LIMIT 1`, [req.params.studentId]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    const reason = req.query.reason || 'Academic excellence';
    const [tRows] = await pool.query(`SELECT id, display_name FROM document_templates WHERE key_name='certificate' LIMIT 1`);
    if (tRows.length) {
      await pool.query(
        `INSERT INTO generated_documents (template_id, student_id, payload_json, generated_by) VALUES (?,?,?,?)`,
        [tRows[0].id, rows[0].student_id, JSON.stringify({ reason }), req.user.id]);
    }
    res.json({
      certificate: {
        ...rows[0],
        reason,
        issued_on: new Date().toISOString().slice(0, 10),
        template_name: tRows[0]?.display_name || 'Certificate',
      },
    });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Fee structure PDF — printable layout data
// ---------------------------------------------------------------------
router.get('/fee-structure/pdf', async (req, res, next) => {
  try {
    const sessionId = req.query.session_id;
    const where = ['fs.is_active=1']; const p = [];
    if (sessionId) { where.push('fs.session_id=?'); p.push(sessionId); }
    const [rows] = await pool.query(
      `SELECT fs.id, fs.name, fs.amount, fs.due_day,
              c.name AS class_name, ay.name AS session_name
         FROM fee_structures fs
         JOIN classes c ON c.id = fs.class_id
         JOIN academic_sessions ay ON ay.id = fs.session_id
        WHERE ${where.join(' AND ')}
        ORDER BY c.level`, p);
    const [tRows] = await pool.query(`SELECT id, display_name FROM document_templates WHERE key_name='fee_structure' LIMIT 1`);
    if (tRows.length) {
      await pool.query(
        `INSERT INTO generated_documents (template_id, payload_json, generated_by) VALUES (?,?,?)`,
        [tRows[0].id, JSON.stringify({ count: rows.length }), req.user.id]);
    }
    res.json({ structures: rows, template_name: tRows[0]?.display_name || 'Fee Structure', generated_on: new Date().toISOString().slice(0,10) });
  } catch (e) { next(e); }
});

module.exports = router;
