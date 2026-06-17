// Admin academic setup (Phase 3) — sessions, terms, classes, sections,
// subjects, teachers, students, parents, teacher assignments.
// All routes require authenticated admin. Mutations are audit-logged.
const express = require('express');
const { z } = require('zod');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../auth/middleware');
const { requirePermission } = require('../rbac/middleware');
const { log } = require('../audit/log');

const router = express.Router();
router.use(requireAuth(), requireRole('admin'));

// ---------------------------------------------------------------------
// Academic sessions
// ---------------------------------------------------------------------
const sessionSchema = z.object({
  name:        z.string().min(1).max(64),
  start_date:  z.string(),
  end_date:    z.string(),
  is_current:  z.boolean().optional(),
});
router.get('/academic/sessions', async (req, res, next) => {
  try { const [r] = await pool.query(`SELECT * FROM academic_sessions ORDER BY start_date DESC`); res.json({ items: r }); }
  catch (e) { next(e); }
});
router.post('/academic/sessions', requirePermission('academic.manage'), async (req, res, next) => {
  try {
    const p = sessionSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    if (d.is_current) await pool.query('UPDATE academic_sessions SET is_current=0');
    const [r] = await pool.query(
      `INSERT INTO academic_sessions (name, start_date, end_date, is_current) VALUES (?,?,?,?)`,
      [d.name, d.start_date, d.end_date, d.is_current ? 1 : 0]);
    await log({ actorId: req.user.id, action: 'academic.session.create', entityType: 'academic_session', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});
router.put('/academic/sessions/:id', requirePermission('academic.manage'), async (req, res, next) => {
  try {
    const p = sessionSchema.partial().safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const d = p.data;
    const f=[], v=[];
    for (const k of ['name','start_date','end_date']) if (d[k]!==undefined) { f.push('??=?'); }
    const sets = [];
    for (const k of ['name','start_date','end_date']) if (d[k]!==undefined) { sets.push(`\`${k}\`=?`); v.push(d[k]); }
    if (d.is_current !== undefined) { sets.push('is_current=?'); v.push(d.is_current?1:0); }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    if (d.is_current) await pool.query('UPDATE academic_sessions SET is_current=0');
    v.push(req.params.id);
    await pool.query(`UPDATE academic_sessions SET ${sets.join(', ')} WHERE id=?`, v);
    await log({ actorId: req.user.id, action: 'academic.session.update', entityType: 'academic_session', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.delete('/academic/sessions/:id', requirePermission('academic.manage'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM academic_sessions WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, action: 'academic.session.delete', entityType: 'academic_session', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Terms (nested under session)
// ---------------------------------------------------------------------
const termSchema = z.object({
  session_id: z.number().int().positive(),
  name:       z.string().min(1).max(64),
  start_date: z.string(),
  end_date:   z.string(),
  is_current: z.boolean().optional(),
});
router.get('/academic/terms', async (req, res, next) => {
  try {
    const [r] = await pool.query(
      `SELECT t.*, s.name AS session_name FROM terms t JOIN academic_sessions s ON s.id=t.session_id
        ORDER BY s.start_date DESC, t.start_date ASC`);
    res.json({ items: r });
  } catch (e) { next(e); }
});
router.post('/academic/terms', requirePermission('academic.manage'), async (req, res, next) => {
  try {
    const p = termSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    if (d.is_current) await pool.query('UPDATE terms SET is_current=0');
    const [r] = await pool.query(
      `INSERT INTO terms (session_id, name, start_date, end_date, is_current) VALUES (?,?,?,?,?)`,
      [d.session_id, d.name, d.start_date, d.end_date, d.is_current?1:0]);
    await log({ actorId: req.user.id, action: 'academic.term.create', entityType: 'term', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});
router.put('/academic/terms/:id', requirePermission('academic.manage'), async (req, res, next) => {
  try {
    const p = termSchema.partial().safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const d = p.data;
    const sets=[]; const v=[];
    for (const k of ['session_id','name','start_date','end_date']) if (d[k]!==undefined) { sets.push(`\`${k}\`=?`); v.push(d[k]); }
    if (d.is_current !== undefined) { sets.push('is_current=?'); v.push(d.is_current?1:0); if (d.is_current) await pool.query('UPDATE terms SET is_current=0'); }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    v.push(req.params.id);
    await pool.query(`UPDATE terms SET ${sets.join(', ')} WHERE id=?`, v);
    await log({ actorId: req.user.id, action: 'academic.term.update', entityType: 'term', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.delete('/academic/terms/:id', requirePermission('academic.manage'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM terms WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, action: 'academic.term.delete', entityType: 'term', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------
const classSchema = z.object({
  name:  z.string().min(1).max(64),
  level: z.number().int().min(0).max(20),
});
router.get('/academic/classes', async (req, res, next) => {
  try {
    const [r] = await pool.query(`
      SELECT c.*,
             (SELECT COUNT(*) FROM sections sec WHERE sec.class_id=c.id)  AS section_count,
             (SELECT COUNT(*) FROM subjects sub WHERE sub.class_id=c.id)  AS subject_count
        FROM classes c ORDER BY c.level`);
    res.json({ items: r });
  } catch (e) { next(e); }
});
router.post('/academic/classes', requirePermission('classes.manage'), async (req, res, next) => {
  try {
    const p = classSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const [r] = await pool.query(`INSERT INTO classes (name, level) VALUES (?,?)`, [p.data.name, p.data.level]);
    await log({ actorId: req.user.id, action: 'academic.class.create', entityType: 'class', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});
router.put('/academic/classes/:id', requirePermission('classes.manage'), async (req, res, next) => {
  try {
    const p = classSchema.partial().safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const d = p.data;
    const sets=[]; const v=[];
    for (const k of ['name','level']) if (d[k]!==undefined) { sets.push(`\`${k}\`=?`); v.push(d[k]); }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    v.push(req.params.id);
    await pool.query(`UPDATE classes SET ${sets.join(', ')} WHERE id=?`, v);
    await log({ actorId: req.user.id, action: 'academic.class.update', entityType: 'class', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.delete('/academic/classes/:id', requirePermission('classes.manage'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM classes WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, action: 'academic.class.delete', entityType: 'class', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Sections (under class)
// ---------------------------------------------------------------------
const sectionSchema = z.object({
  class_id: z.number().int().positive(),
  name:     z.string().min(1).max(32),
  capacity: z.number().int().min(1).max(500).default(40),
});
router.get('/academic/sections', async (req, res, next) => {
  try {
    const [r] = await pool.query(
      `SELECT sec.*, c.name AS class_name, c.level AS class_level
         FROM sections sec JOIN classes c ON c.id=sec.class_id
         ORDER BY c.level, sec.name`);
    res.json({ items: r });
  } catch (e) { next(e); }
});
router.post('/academic/sections', requirePermission('classes.manage'), async (req, res, next) => {
  try {
    const p = sectionSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const [r] = await pool.query(`INSERT INTO sections (class_id, name, capacity) VALUES (?,?,?)`, [p.data.class_id, p.data.name, p.data.capacity]);
    await log({ actorId: req.user.id, action: 'academic.section.create', entityType: 'section', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});
router.put('/academic/sections/:id', requirePermission('classes.manage'), async (req, res, next) => {
  try {
    const p = sectionSchema.partial().safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const d = p.data;
    const sets=[]; const v=[];
    for (const k of ['class_id','name','capacity']) if (d[k]!==undefined) { sets.push(`\`${k}\`=?`); v.push(d[k]); }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    v.push(req.params.id);
    await pool.query(`UPDATE sections SET ${sets.join(', ')} WHERE id=?`, v);
    await log({ actorId: req.user.id, action: 'academic.section.update', entityType: 'section', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.delete('/academic/sections/:id', requirePermission('classes.manage'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM sections WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, action: 'academic.section.delete', entityType: 'section', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Subjects (under class)
// ---------------------------------------------------------------------
const subjectSchema = z.object({
  class_id:    z.number().int().positive(),
  name:        z.string().min(1).max(128),
  code:        z.string().max(32).optional(),
  is_optional: z.boolean().optional(),
});
router.get('/academic/subjects', async (req, res, next) => {
  try {
    const [r] = await pool.query(
      `SELECT sub.*, c.name AS class_name, c.level AS class_level
         FROM subjects sub JOIN classes c ON c.id=sub.class_id
         ORDER BY c.level, sub.name`);
    res.json({ items: r });
  } catch (e) { next(e); }
});
router.post('/academic/subjects', requirePermission('subjects.manage'), async (req, res, next) => {
  try {
    const p = subjectSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const [r] = await pool.query(`INSERT INTO subjects (class_id, name, code, is_optional) VALUES (?,?,?,?)`,
      [p.data.class_id, p.data.name, p.data.code || null, p.data.is_optional?1:0]);
    await log({ actorId: req.user.id, action: 'academic.subject.create', entityType: 'subject', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});
router.put('/academic/subjects/:id', requirePermission('subjects.manage'), async (req, res, next) => {
  try {
    const p = subjectSchema.partial().safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const d = p.data;
    const sets=[]; const v=[];
    for (const k of ['class_id','name','code']) if (d[k]!==undefined) { sets.push(`\`${k}\`=?`); v.push(d[k]); }
    if (d.is_optional !== undefined) { sets.push('is_optional=?'); v.push(d.is_optional?1:0); }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    v.push(req.params.id);
    await pool.query(`UPDATE subjects SET ${sets.join(', ')} WHERE id=?`, v);
    await log({ actorId: req.user.id, action: 'academic.subject.update', entityType: 'subject', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.delete('/academic/subjects/:id', requirePermission('subjects.manage'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM subjects WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, action: 'academic.subject.delete', entityType: 'subject', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Teacher assignments (teacher × subject × class × section × session)
// ---------------------------------------------------------------------
const taSchema = z.object({
  teacher_id: z.number().int().positive(),
  subject_id: z.number().int().positive(),
  class_id:   z.number().int().positive(),
  section_id: z.number().int().positive(),
  session_id: z.number().int().positive(),
});
router.get('/academic/teacher-assignments', async (req, res, next) => {
  try {
    const [r] = await pool.query(
      `SELECT ta.id, ta.teacher_id, ta.subject_id, ta.class_id, ta.section_id, ta.session_id,
              t.employee_code, u.full_name AS teacher_name,
              sub.name AS subject_name, c.name AS class_name, sec.name AS section_name, ay.name AS session_name
         FROM teacher_assignments ta
         JOIN teachers t ON t.id = ta.teacher_id
         JOIN users u ON u.id = t.user_id
         JOIN subjects sub ON sub.id = ta.subject_id
         JOIN classes c ON c.id = ta.class_id
         JOIN sections sec ON sec.id = ta.section_id
         JOIN academic_sessions ay ON ay.id = ta.session_id
         ORDER BY c.level, sec.name, sub.name`);
    res.json({ items: r });
  } catch (e) { next(e); }
});
router.post('/academic/teacher-assignments', requirePermission('academic.manage'), async (req, res, next) => {
  try {
    const p = taSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    try {
      const [r] = await pool.query(
        `INSERT INTO teacher_assignments (teacher_id, subject_id, class_id, section_id, session_id) VALUES (?,?,?,?,?)`,
        [p.data.teacher_id, p.data.subject_id, p.data.class_id, p.data.section_id, p.data.session_id]);
      await log({ actorId: req.user.id, action: 'academic.teacher_assignment.create', entityType: 'teacher_assignment', entityId: r.insertId, ip: req.ip });
      res.status(201).json({ id: r.insertId });
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'duplicate_assignment' });
      throw e;
    }
  } catch (e) { next(e); }
});
router.delete('/academic/teacher-assignments/:id', requirePermission('academic.manage'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM teacher_assignments WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, action: 'academic.teacher_assignment.delete', entityType: 'teacher_assignment', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Students — list (with profile + class info), create/update via /users
// ---------------------------------------------------------------------
router.get('/academic/students', requirePermission('students.view'), async (req, res, next) => {
  try {
    const { class_id, section_id, session_id, q } = req.query;
    const where=['1=1']; const p=[];
    if (class_id)   { where.push('s.class_id=?');   p.push(class_id); }
    if (section_id) { where.push('s.section_id=?'); p.push(section_id); }
    if (session_id) { where.push('s.session_id=?'); p.push(session_id); }
    if (q) { where.push('(s.admission_no LIKE ? OR u.full_name LIKE ?)'); const l=`%${q}%`; p.push(l,l); }
    const [r] = await pool.query(
      `SELECT s.id AS student_id, s.admission_no, s.roll_no, s.status AS student_status,
              s.date_of_birth, s.gender, s.guardian_name, s.guardian_phone, s.admission_date,
              c.name AS class_name, sec.name AS section_name, ay.name AS session_name,
              u.id AS user_id, u.email, u.full_name, u.status AS user_status, u.cnic, u.phone
         FROM students s
         JOIN users u ON u.id = s.user_id
         JOIN classes c ON c.id = s.class_id
         JOIN sections sec ON sec.id = s.section_id
         JOIN academic_sessions ay ON ay.id = s.session_id
        WHERE ${where.join(' AND ')}
        ORDER BY c.level, sec.name, s.admission_no LIMIT 500`, p);
    res.json({ items: r });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Teachers — list with profile + assignments
// ---------------------------------------------------------------------
router.get('/academic/teachers', requirePermission('teachers.view'), async (req, res, next) => {
  try {
    const [r] = await pool.query(
      `SELECT t.id AS teacher_id, t.employee_code, t.designation, t.qualification, t.joining_date, t.status AS teacher_status,
              u.id AS user_id, u.email, u.full_name, u.status AS user_status, u.phone,
              (SELECT COUNT(*) FROM teacher_assignments ta WHERE ta.teacher_id = t.id) AS assignment_count
         FROM teachers t JOIN users u ON u.id = t.user_id
         ORDER BY u.full_name LIMIT 500`);
    res.json({ items: r });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Parents — list with profile + linked students
// ---------------------------------------------------------------------
router.get('/academic/parents', requirePermission('parents.view'), async (req, res, next) => {
  try {
    const [r] = await pool.query(
      `SELECT p.id AS parent_id, p.occupation, p.address, p.cnic,
              u.id AS user_id, u.email, u.full_name, u.status AS user_status, u.phone,
              (SELECT GROUP_CONCAT(CONCAT(s.admission_no,' ',c.name,'/',sec.name) SEPARATOR ', ')
                 FROM parent_student ps
                 JOIN students s ON s.id = ps.student_id
                 JOIN classes c ON c.id = s.class_id
                 JOIN sections sec ON sec.id = s.section_id
                WHERE ps.parent_id = p.id) AS children_summary
         FROM parents p JOIN users u ON u.id = p.user_id
         ORDER BY u.full_name LIMIT 500`);
    res.json({ items: r });
  } catch (e) { next(e); }
});

module.exports = router;
