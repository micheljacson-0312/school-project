// Teacher portal (Phase 4) — replaces the Phase 1 stub. Includes
// assigned-classes summary, attendance marking, lecture/assignment/quiz
// listings (via LMS), result upload, and remark writing.
const express = require('express');
const { z } = require('zod');
const { requireAuth, requireRole } = require('../auth/middleware');
const { requirePermission } = require('../rbac/middleware');
const { pool } = require('../db');
const { log } = require('../audit/log');

const router = express.Router();

async function getTeacherProfile(userId) {
  const [rows] = await pool.query(
    `SELECT id AS teacher_id, employee_code, designation, qualification, joining_date
       FROM teachers WHERE user_id=? LIMIT 1`, [userId]);
  return rows[0] || null;
}

router.get('/dashboard', requireAuth(), requireRole('teacher'), async (req, res, next) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    if (!teacher) return res.json({ role: 'teacher', greeting: `Welcome, ${req.user.full_name}`, teacher: null, assignments: [] });
    const [assignments] = await pool.query(
      `SELECT ta.id, sub.name AS subject, c.name AS class_name, sec.name AS section,
              ay.name AS session_name, c.id AS class_id, sec.id AS section_id, sub.id AS subject_id, ay.id AS session_id
         FROM teacher_assignments ta
         JOIN subjects sub ON sub.id = ta.subject_id
         JOIN classes c   ON c.id = ta.class_id
         JOIN sections sec ON sec.id = ta.section_id
         JOIN academic_sessions ay ON ay.id = ta.session_id
        WHERE ta.teacher_id=? ORDER BY c.level, sub.name`, [teacher.teacher_id]);
    const [pendingGrading] = await pool.query(
      `SELECT s.id, s.submitted_at, s.assignment_id, a.title, u.full_name AS student_name, st.admission_no
         FROM assignment_submissions s
         JOIN assignments a ON a.id = s.assignment_id
         JOIN students st ON st.id = s.student_id
         JOIN users u ON u.id = st.user_id
        WHERE a.teacher_id=? AND s.marks_obtained IS NULL
        ORDER BY s.submitted_at ASC LIMIT 5`, [teacher.teacher_id]);
    const [upcoming] = await pool.query(
      `SELECT lc.id, lc.title, lc.starts_at, lc.status, c.name AS class_name, sec.name AS section_name, sub.name AS subject_name
         FROM live_classes lc
         JOIN classes c   ON c.id = lc.class_id
         JOIN sections sec ON sec.id = lc.section_id
         JOIN subjects sub ON sub.id = lc.subject_id
        WHERE lc.teacher_id=? AND lc.starts_at >= NOW()
        ORDER BY lc.starts_at ASC LIMIT 5`, [teacher.teacher_id]);
    res.json({
      role: 'teacher', greeting: `Welcome, ${req.user.full_name}`, teacher, assignments,
      pending_grading: pendingGrading, upcoming_live: upcoming,
    });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Attendance: list roster + existing marks for a given class+section+date
// ---------------------------------------------------------------------
router.get('/attendance', requireAuth(), requireRole('teacher'), async (req, res, next) => {
  try {
    const { class_id, section_id, date } = req.query;
    if (!class_id || !section_id || !date) return res.status(400).json({ error: 'missing_class_section_date' });
    const [roster] = await pool.query(
      `SELECT s.id AS student_id, s.admission_no, s.roll_no, u.full_name,
              sa.status, sa.remarks
         FROM students s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN student_attendance sa ON sa.student_id = s.id AND sa.date = ?
        WHERE s.class_id=? AND s.section_id=? AND s.status='active'
        ORDER BY u.full_name`, [date, class_id, section_id]);
    res.json({ items: roster });
  } catch (e) { next(e); }
});

const attendanceMarkSchema = z.object({
  class_id:   z.number().int().positive(),
  section_id: z.number().int().positive(),
  date:       z.string(),
  marks:      z.array(z.object({
    student_id: z.number().int().positive(),
    status:     z.enum(['present','absent','late','leave','holiday']),
    remarks:    z.string().max(255).optional(),
  })).min(1),
});

router.post('/attendance', requireAuth(), requireRole('teacher'), requirePermission('attendance.mark'), async (req, res, next) => {
  try {
    const p = attendanceMarkSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const { class_id, section_id, date, marks } = p.data;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const m of marks) {
        await conn.query(
          `INSERT INTO student_attendance (student_id, class_id, section_id, date, status, remarks, marked_by, source)
           VALUES (?,?,?,?,?,?,?, 'manual')
           ON DUPLICATE KEY UPDATE status=VALUES(status), remarks=VALUES(remarks), marked_by=VALUES(marked_by)`,
          [m.student_id, class_id, section_id, date, m.status, m.remarks || null, req.user.id]);
      }
      await conn.commit();
    } catch (e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
    await log({ actorId: req.user.id, action: 'attendance.mark', entityType: 'student_attendance', ip: req.ip, meta: { class_id, section_id, date, count: marks.length } });
    res.json({ ok: true, count: marks.length });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Result upload
// ---------------------------------------------------------------------
const resultUploadSchema = z.object({
  student_id:     z.number().int().positive(),
  subject_id:     z.number().int().positive(),
  term_id:        z.number().int().positive(),
  session_id:     z.number().int().positive(),
  marks_obtained: z.number().min(0).max(10000),
  total_marks:    z.number().min(0).max(10000).default(100),
  grade:          z.string().max(8).optional(),
  remarks:        z.string().max(255).optional(),
});

router.post('/results', requireAuth(), requireRole('teacher'), requirePermission('results.upload'), async (req, res, next) => {
  try {
    const p = resultUploadSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    await pool.query(
      `INSERT INTO results (student_id, subject_id, term_id, session_id, marks_obtained, total_marks, grade, remarks, uploaded_by)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE marks_obtained=VALUES(marks_obtained), total_marks=VALUES(total_marks),
         grade=VALUES(grade), remarks=VALUES(remarks), uploaded_by=VALUES(uploaded_by)`,
      [d.student_id, d.subject_id, d.term_id, d.session_id, d.marks_obtained, d.total_marks,
       d.grade || null, d.remarks || null, req.user.id]);
    await log({ actorId: req.user.id, action: 'results.upload', entityType: 'result', ip: req.ip, meta: d });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Remarks write
// ---------------------------------------------------------------------
const remarkSchema = z.object({
  student_id:          z.number().int().positive(),
  category:            z.enum(['behavior','performance','general','commendation']).default('general'),
  body:                z.string().min(1).max(2000),
  is_visible_to_parent: z.boolean().default(true),
});

router.post('/remarks', requireAuth(), requireRole('teacher'), requirePermission('remarks.create'), async (req, res, next) => {
  try {
    const p = remarkSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const d = p.data;
    const [r] = await pool.query(
      `INSERT INTO student_remarks (student_id, author_id, category, body, is_visible_to_parent) VALUES (?,?,?,?,?)`,
      [d.student_id, req.user.id, d.category, d.body, d.is_visible_to_parent ? 1 : 0]);
    await log({ actorId: req.user.id, action: 'remarks.create', entityType: 'student_remark', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});

router.get('/remarks', requireAuth(), requireRole('teacher'), async (req, res, next) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    if (!teacher) return res.json({ items: [] });
    // Remarks by this teacher + ones about students in their classes
    const [rows] = await pool.query(
      `SELECT r.id, r.body, r.category, r.created_at, r.is_visible_to_parent,
              u.full_name AS author_name, st.admission_no, st.roll_no, c.name AS class_name, sec.name AS section_name
         FROM student_remarks r
         JOIN students st ON st.id = r.student_id
         JOIN classes c ON c.id = st.class_id
         JOIN sections sec ON sec.id = st.section_id
         JOIN users u ON u.id = r.author_id
        WHERE r.author_id=? OR (st.class_id IN (
            SELECT class_id FROM teacher_assignments WHERE teacher_id=?
          ))
        ORDER BY r.created_at DESC LIMIT 200`,
      [req.user.id, teacher.teacher_id]);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

// Roster of students in one of my assigned classes (for grading/results UI)
router.get('/roster', requireAuth(), requireRole('teacher'), async (req, res, next) => {
  try {
    const { class_id, section_id, session_id } = req.query;
    if (!class_id || !section_id) return res.status(400).json({ error: 'missing_class_section' });
    const [rows] = await pool.query(
      `SELECT s.id AS student_id, s.admission_no, s.roll_no, u.full_name
         FROM students s
         JOIN users u ON u.id = s.user_id
        WHERE s.class_id=? AND s.section_id=? AND s.status='active'
        ORDER BY u.full_name`, [class_id, section_id]);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

// List subjects taught by this teacher (used for filtering)
router.get('/subjects', requireAuth(), requireRole('teacher'), async (req, res, next) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    if (!teacher) return res.json({ items: [] });
    const [rows] = await pool.query(
      `SELECT DISTINCT sub.id, sub.name FROM subjects sub
         JOIN teacher_assignments ta ON ta.subject_id = sub.id
        WHERE ta.teacher_id=? ORDER BY sub.name`, [teacher.teacher_id]);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

module.exports = router;
