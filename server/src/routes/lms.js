// LMS shared endpoints (Phase 4) — lectures, live classes, assignments,
// quizzes. RBAC is enforced inside each handler based on req.user.role.
//
//   GET    /api/lms/lectures           — list (scoped by class/section/subject)
//   POST   /api/lms/lectures           — teacher upload
//   PUT    /api/lms/lectures/:id       — edit
//   DELETE /api/lms/lectures/:id       — remove
//
//   GET    /api/lms/live-classes       — list (with status filter)
//   POST   /api/lms/live-classes       — teacher schedule
//   PATCH  /api/lms/live-classes/:id   — update status
//   GET    /api/lms/live-classes/:id   — detail + jitsi join URL
//
//   GET    /api/lms/assignments        — list (filter by class/section/subject)
//   POST   /api/lms/assignments        — teacher create
//   GET    /api/lms/assignments/:id    — detail (+ submission if student)
//   PUT    /api/lms/assignments/:id    — teacher edit
//   DELETE /api/lms/assignments/:id    — teacher delete
//   POST   /api/lms/assignments/:id/submit    — student submission
//   GET    /api/lms/assignments/:id/submissions — teacher lists all submissions
//   POST   /api/lms/assignments/:id/grade/:submissionId — teacher grades
//
//   GET    /api/lms/quizzes            — list
//   POST   /api/lms/quizzes            — teacher create
//   GET    /api/lms/quizzes/:id        — detail (+ questions; correct_key hidden for students)
//   PUT    /api/lms/quizzes/:id        — teacher edit
//   DELETE /api/lms/quizzes/:id        — teacher delete
//   POST   /api/lms/quizzes/:id/questions        — teacher add question
//   DELETE /api/lms/quizzes/:id/questions/:qid   — teacher remove question
//   POST   /api/lms/quizzes/:id/attempt          — student starts attempt
//   POST   /api/lms/quizzes/:id/attempt/:aid/submit — student submits attempt
//   POST   /api/lms/quizzes/:id/attempt/:aid/grade — teacher grades essay

const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');
const { pool } = require('../db');
const { requireAuth } = require('../auth/middleware');
const { requirePermission } = require('../rbac/middleware');
const { log } = require('../audit/log');

const router = express.Router();
router.use(requireAuth());

// Accept ISO datetime strings from clients and convert to MySQL DATETIME format.
function toMysqlDatetime(v) {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

const JITSI_BASE = (process.env.JITSI_BASE_URL || 'https://meet.jit.si').replace(/\/$/, '');
function jitsiRoomFor(liveClassId, subjectId) {
  return `school-${process.env.JITSI_ROOM_PREFIX || 'demo'}-${liveClassId}-${subjectId}`.toLowerCase();
}

// ---------------------------------------------------------------------
// Lectures
// ---------------------------------------------------------------------
const lectureSchema = z.object({
  subject_id:   z.number().int().positive(),
  class_id:     z.number().int().positive(),
  section_id:   z.number().int().positive(),
  session_id:   z.number().int().positive(),
  title:        z.string().min(1).max(190),
  description:  z.string().max(2000).optional(),
  file_url:     z.string().max(255).optional(),
  duration_min: z.number().int().min(0).max(10000).optional(),
});

router.get('/lectures', async (req, res, next) => {
  try {
    const { class_id, section_id, subject_id, teacher_id, session_id } = req.query;
    const where=['1=1']; const p=[];
    if (class_id)   { where.push('l.class_id=?');   p.push(class_id); }
    if (section_id) { where.push('l.section_id=?'); p.push(section_id); }
    if (subject_id) { where.push('l.subject_id=?'); p.push(subject_id); }
    if (teacher_id) { where.push('l.teacher_id=?'); p.push(teacher_id); }
    if (session_id) { where.push('l.session_id=?'); p.push(session_id); }
    const [rows] = await pool.query(
      `SELECT l.id, l.title, l.description, l.file_url, l.duration_min, l.recorded_at,
              sub.name AS subject_name, c.name AS class_name, sec.name AS section_name,
              ay.name AS session_name, u.full_name AS teacher_name
         FROM lectures l
         JOIN subjects sub ON sub.id = l.subject_id
         JOIN classes c   ON c.id = l.class_id
         JOIN sections sec ON sec.id = l.section_id
         JOIN academic_sessions ay ON ay.id = l.session_id
         JOIN teachers t  ON t.id = l.teacher_id
         JOIN users u     ON u.id = t.user_id
         WHERE ${where.join(' AND ')}
         ORDER BY l.recorded_at DESC, l.id DESC LIMIT 200`, p);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

router.post('/lectures', requirePermission('lms.lecture.upload'), async (req, res, next) => {
  try {
    const p = lectureSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const [teacherRows] = await pool.query(`SELECT id FROM teachers WHERE user_id=? LIMIT 1`, [req.user.id]);
    if (!teacherRows.length) return res.status(400).json({ error: 'no_teacher_profile' });
    const [r] = await pool.query(
      `INSERT INTO lectures (teacher_id, subject_id, class_id, section_id, session_id, title, description, file_url, duration_min, recorded_at)
       VALUES (?,?,?,?,?,?,?,?,?, NOW())`,
      [teacherRows[0].id, d.subject_id, d.class_id, d.section_id, d.session_id,
       d.title, d.description || null, d.file_url || null, d.duration_min || null]);
    await log({ actorId: req.user.id, action: 'lms.lecture.create', entityType: 'lecture', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});

router.put('/lectures/:id', requirePermission('lms.lecture.upload'), async (req, res, next) => {
  try {
    const p = lectureSchema.partial().safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const d = p.data;
    const sets=[]; const v=[];
    for (const k of ['title','description','file_url']) if (d[k] !== undefined) { sets.push(`\`${k}\`=?`); v.push(d[k]); }
    if (d.duration_min !== undefined) { sets.push('duration_min=?'); v.push(d.duration_min); }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    v.push(req.params.id);
    await pool.query(`UPDATE lectures SET ${sets.join(', ')} WHERE id=?`, v);
    await log({ actorId: req.user.id, action: 'lms.lecture.update', entityType: 'lecture', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/lectures/:id', requirePermission('lms.lecture.upload'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM lectures WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, action: 'lms.lecture.delete', entityType: 'lecture', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Live classes (Jitsi)
// ---------------------------------------------------------------------
const liveSchema = z.object({
  subject_id:   z.number().int().positive(),
  class_id:     z.number().int().positive(),
  section_id:   z.number().int().positive(),
  session_id:   z.number().int().positive(),
  title:        z.string().min(1).max(190),
  starts_at:    z.string(),
  ends_at:      z.string().optional(),
});

router.get('/live-classes', async (req, res, next) => {
  try {
    const { status, teacher_id, upcoming } = req.query;
    const where=['1=1']; const p=[];
    if (status)     { where.push('lc.status=?'); p.push(status); }
    if (teacher_id) { where.push('lc.teacher_id=?'); p.push(teacher_id); }
    if (upcoming === '1') where.push('lc.starts_at >= NOW()');
    const [rows] = await pool.query(
      `SELECT lc.id, lc.title, lc.jitsi_room, lc.starts_at, lc.ends_at, lc.status,
              sub.name AS subject_name, c.name AS class_name, sec.name AS section_name,
              u.full_name AS teacher_name
         FROM live_classes lc
         JOIN subjects sub ON sub.id = lc.subject_id
         JOIN classes c   ON c.id = lc.class_id
         JOIN sections sec ON sec.id = lc.section_id
         JOIN teachers t  ON t.id = lc.teacher_id
         JOIN users u     ON u.id = t.user_id
         WHERE ${where.join(' AND ')}
         ORDER BY lc.starts_at DESC LIMIT 200`, p);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

router.post('/live-classes', requirePermission('lms.liveclass.host'), async (req, res, next) => {
  try {
    const p = liveSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const [tRows] = await pool.query(`SELECT id FROM teachers WHERE user_id=? LIMIT 1`, [req.user.id]);
    if (!tRows.length) return res.status(400).json({ error: 'no_teacher_profile' });
    const teacherId = tRows[0].id;
    // Reserve the Jitsi room name early so it shows up in lists before insert (room uses insert id).
    const tempRoom = `pending-${crypto.randomBytes(6).toString('hex')}`;
    const [r] = await pool.query(
      `INSERT INTO live_classes (teacher_id, subject_id, class_id, section_id, session_id, title, jitsi_room, starts_at, ends_at, status)
       VALUES (?,?,?,?,?,?,?,?,?, 'scheduled')`,
      [teacherId, d.subject_id, d.class_id, d.section_id, d.session_id, d.title,
       tempRoom, d.starts_at, d.ends_at || null]);
    const room = jitsiRoomFor(r.insertId, d.subject_id);
    await pool.query('UPDATE live_classes SET jitsi_room=? WHERE id=?', [room, r.insertId]);
    await log({ actorId: req.user.id, action: 'lms.live_class.create', entityType: 'live_class', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId, jitsi_room: room });
  } catch (e) { next(e); }
});

router.get('/live-classes/:id', requirePermission('lms.liveclass.join'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT lc.*, sub.name AS subject_name, c.name AS class_name, sec.name AS section_name,
              u.full_name AS teacher_name
         FROM live_classes lc
         JOIN subjects sub ON sub.id = lc.subject_id
         JOIN classes c   ON c.id = lc.class_id
         JOIN sections sec ON sec.id = lc.section_id
         JOIN teachers t  ON t.id = lc.teacher_id
         JOIN users u     ON u.id = t.user_id
         WHERE lc.id=? LIMIT 1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json({ item: rows[0], jitsi_url: `${JITSI_BASE}/${rows[0].jitsi_room}` });
  } catch (e) { next(e); }
});

const livePatch = z.object({
  status: z.enum(['scheduled','live','ended','cancelled']).optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  title: z.string().min(1).max(190).optional(),
});

router.patch('/live-classes/:id', async (req, res, next) => {
  try {
    // Teachers can edit their own; admins can edit any (caught by 403 below).
    const p = livePatch.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const [own] = await pool.query(
      `SELECT t.id FROM live_classes lc JOIN teachers t ON t.id=lc.teacher_id
        WHERE lc.id=? AND t.user_id=? LIMIT 1`, [req.params.id, req.user.id]);
    const isAdmin = req.user.role_key === 'admin';
    if (!own.length && !isAdmin) return res.status(403).json({ error: 'not_owner' });
    const d = p.data;
    const sets=[]; const v=[];
    for (const k of ['title','starts_at','ends_at']) if (d[k] !== undefined) { sets.push(`\`${k}\`=?`); v.push(d[k]); }
    if (d.status !== undefined) { sets.push('status=?'); v.push(d.status); }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    v.push(req.params.id);
    await pool.query(`UPDATE live_classes SET ${sets.join(', ')} WHERE id=?`, v);
    await log({ actorId: req.user.id, action: 'lms.live_class.update', entityType: 'live_class', entityId: Number(req.params.id), ip: req.ip, meta: d });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------
const assignmentSchema = z.object({
  subject_id:  z.number().int().positive(),
  class_id:    z.number().int().positive(),
  section_id:  z.number().int().positive(),
  session_id:  z.number().int().positive(),
  title:       z.string().min(1).max(190),
  description: z.string().max(5000).optional(),
  total_marks: z.number().min(0).max(10000).default(100),
  due_at:      z.string(),
});

router.get('/assignments', async (req, res, next) => {
  try {
    const { class_id, section_id, subject_id, teacher_id } = req.query;
    const where=['1=1']; const p=[];
    if (class_id)   { where.push('a.class_id=?');   p.push(class_id); }
    if (section_id) { where.push('a.section_id=?'); p.push(section_id); }
    if (subject_id) { where.push('a.subject_id=?'); p.push(subject_id); }
    if (teacher_id) { where.push('a.teacher_id=?'); p.push(teacher_id); }
    // Students additionally get their submission status
    const selectSubmission = req.user.role_key === 'student'
      ? `, (SELECT id FROM assignment_submissions WHERE assignment_id=a.id AND student_id=(SELECT id FROM students WHERE user_id=${Number(req.user.id)})) AS my_submission_id`
      : '';
    const [rows] = await pool.query(
      `SELECT a.id, a.title, a.description, a.total_marks, a.due_at, a.created_at,
              sub.name AS subject_name, c.name AS class_name, sec.name AS section_name,
              u.full_name AS teacher_name
              ${selectSubmission}
         FROM assignments a
         JOIN subjects sub ON sub.id = a.subject_id
         JOIN classes c   ON c.id = a.class_id
         JOIN sections sec ON sec.id = a.section_id
         JOIN teachers t  ON t.id = a.teacher_id
         JOIN users u     ON u.id = t.user_id
         WHERE ${where.join(' AND ')}
         ORDER BY a.due_at DESC LIMIT 200`, p);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

router.post('/assignments', requirePermission('lms.assignment.create'), async (req, res, next) => {
  try {
    const p = assignmentSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const [tRows] = await pool.query(`SELECT id FROM teachers WHERE user_id=?`, [req.user.id]);
    if (!tRows.length) return res.status(400).json({ error: 'no_teacher_profile' });
    const d = p.data;
    const dueSql = toMysqlDatetime(d.due_at);
    const values = [
      tRows[0].id,
      d.subject_id,
      d.class_id,
      d.section_id,
      d.session_id,
      d.title,
      d.description || null,
      d.total_marks,
      dueSql
    ];
    const [r] = await pool.query(
      `INSERT INTO assignments (teacher_id, subject_id, class_id, section_id, session_id, title, description, total_marks, due_at) VALUES (?,?,?,?,?,?,?,?,?)`,
      values
    );
    await log({ actorId: req.user.id, action: 'lms.assignment.create', entityType: 'assignment', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});

router.get('/assignments/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, sub.name AS subject_name, c.name AS class_name, sec.name AS section_name,
              u.full_name AS teacher_name
         FROM assignments a
         JOIN subjects sub ON sub.id = a.subject_id
         JOIN classes c   ON c.id = a.class_id
         JOIN sections sec ON sec.id = a.section_id
         JOIN teachers t  ON t.id = a.teacher_id
         JOIN users u     ON u.id = t.user_id
         WHERE a.id=? LIMIT 1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    const item = rows[0];
    if (req.user.role_key === 'student') {
      const [my] = await pool.query(
        `SELECT * FROM assignment_submissions WHERE assignment_id=? AND student_id=(SELECT id FROM students WHERE user_id=?)`,
        [req.params.id, req.user.id]);
      item.my_submission = my[0] || null;
    } else if (['teacher','admin'].includes(req.user.role_key)) {
      const [subs] = await pool.query(
        `SELECT s.*, u.full_name AS student_name, st.admission_no
           FROM assignment_submissions s
           JOIN students st ON st.id = s.student_id
           JOIN users u ON u.id = st.user_id
          WHERE s.assignment_id=? ORDER BY s.submitted_at`, [req.params.id]);
      item.submissions = subs;
    }
    res.json({ item });
  } catch (e) { next(e); }
});

router.put('/assignments/:id', requirePermission('lms.assignment.create'), async (req, res, next) => {
  try {
    const p = assignmentSchema.partial().safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const d = p.data;
    const sets=[]; const v=[];
    for (const k of ['title','description','due_at']) if (d[k] !== undefined) { sets.push(`\`${k}\`=?`); v.push(d[k]); }
    if (d.total_marks !== undefined) { sets.push('total_marks=?'); v.push(d.total_marks); }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    v.push(req.params.id);
    await pool.query(`UPDATE assignments SET ${sets.join(', ')} WHERE id=?`, v);
    await log({ actorId: req.user.id, action: 'lms.assignment.update', entityType: 'assignment', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/assignments/:id', requirePermission('lms.assignment.create'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM assignments WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, action: 'lms.assignment.delete', entityType: 'assignment', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

const submissionSchema = z.object({
  notes:     z.string().max(5000).optional(),
  file_url:  z.string().max(255).optional(),
});

router.post('/assignments/:id/submit', requirePermission('lms.assignment.submit'), async (req, res, next) => {
  try {
    const p = submissionSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const [stu] = await pool.query(`SELECT id FROM students WHERE user_id=? LIMIT 1`, [req.user.id]);
    if (!stu.length) return res.status(400).json({ error: 'no_student_profile' });
    try {
      const [r] = await pool.query(
        `INSERT INTO assignment_submissions (assignment_id, student_id, file_url, notes, submitted_at)
         VALUES (?,?,?,?, NOW())`,
        [req.params.id, stu[0].id, p.data.file_url || null, p.data.notes || null]);
      await log({ actorId: req.user.id, action: 'lms.assignment.submit', entityType: 'assignment_submission', entityId: r.insertId, ip: req.ip });
      res.status(201).json({ id: r.insertId });
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'already_submitted' });
      throw e;
    }
  } catch (e) { next(e); }
});

router.post('/assignments/:id/grade/:submissionId', requirePermission('lms.assignment.grade'), async (req, res, next) => {
  try {
    const p = z.object({
      marks_obtained: z.number().min(0).max(10000),
      feedback:       z.string().max(5000).optional(),
    }).safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    await pool.query(
      `UPDATE assignment_submissions SET marks_obtained=?, feedback=?, graded_by=?, graded_at=NOW()
        WHERE id=? AND assignment_id=?`,
      [p.data.marks_obtained, p.data.feedback || null, req.user.id, req.params.submissionId, req.params.id]);
    await log({ actorId: req.user.id, action: 'lms.assignment.grade', entityType: 'assignment_submission', entityId: Number(req.params.submissionId), ip: req.ip, meta: { marks: p.data.marks_obtained } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------
const quizSchema = z.object({
  subject_id:     z.number().int().positive(),
  class_id:       z.number().int().positive(),
  section_id:     z.number().int().positive(),
  session_id:     z.number().int().positive(),
  title:          z.string().min(1).max(190),
  total_marks:    z.number().min(0).max(10000).default(100),
  available_from: z.string(),
  available_to:   z.string(),
  time_limit_min: z.number().int().min(1).max(600).optional(),
});

router.get('/quizzes', async (req, res, next) => {
  try {
    const { class_id, section_id, subject_id, teacher_id, available } = req.query;
    const where=['1=1']; const p=[];
    if (class_id)   { where.push('q.class_id=?');   p.push(class_id); }
    if (section_id) { where.push('q.section_id=?'); p.push(section_id); }
    if (subject_id) { where.push('q.subject_id=?'); p.push(subject_id); }
    if (teacher_id) { where.push('q.teacher_id=?'); p.push(teacher_id); }
    if (available === '1') where.push('q.available_from <= NOW() AND q.available_to >= NOW()');
    const attemptSelect = req.user.role_key === 'student'
      ? `, (SELECT id FROM quiz_attempts WHERE quiz_id=q.id AND student_id=(SELECT id FROM students WHERE user_id=${Number(req.user.id)}) ORDER BY id DESC LIMIT 1) AS my_attempt_id`
      : '';
    const [rows] = await pool.query(
      `SELECT q.id, q.title, q.total_marks, q.available_from, q.available_to, q.time_limit_min,
              sub.name AS subject_name, c.name AS class_name, sec.name AS section_name,
              u.full_name AS teacher_name
              ${attemptSelect}
         FROM quizzes q
         JOIN subjects sub ON sub.id = q.subject_id
         JOIN classes c   ON c.id = q.class_id
         JOIN sections sec ON sec.id = q.section_id
         JOIN teachers t  ON t.id = q.teacher_id
         JOIN users u     ON u.id = t.user_id
         WHERE ${where.join(' AND ')}
         ORDER BY q.available_from DESC LIMIT 200`, p);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

router.post('/quizzes', requirePermission('lms.quiz.create'), async (req, res, next) => {
  try {
    const p = quizSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const [tRows] = await pool.query(`SELECT id FROM teachers WHERE user_id=?`, [req.user.id]);
    if (!tRows.length) return res.status(400).json({ error: 'no_teacher_profile' });
    const d = p.data;
    const [r] = await pool.query(
      `INSERT INTO quizzes (teacher_id, subject_id, class_id, section_id, session_id, title, total_marks, available_from, available_to, time_limit_min)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [tRows[0].id, d.subject_id, d.class_id, d.section_id, d.session_id,
       d.title, d.total_marks, toMysqlDatetime(d.available_from), toMysqlDatetime(d.available_to), d.time_limit_min || null]);
    await log({ actorId: req.user.id, action: 'lms.quiz.create', entityType: 'quiz', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});

router.get('/quizzes/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT q.*, sub.name AS subject_name, c.name AS class_name, sec.name AS section_name,
              u.full_name AS teacher_name
         FROM quizzes q
         JOIN subjects sub ON sub.id = q.subject_id
         JOIN classes c   ON c.id = q.class_id
         JOIN sections sec ON sec.id = q.section_id
         JOIN teachers t  ON t.id = q.teacher_id
         JOIN users u     ON u.id = t.user_id
         WHERE q.id=? LIMIT 1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    const item = rows[0];
    const [questions] = await pool.query(
      `SELECT id, prompt, type, options_json, marks, position FROM quiz_questions WHERE quiz_id=? ORDER BY position, id`,
      [req.params.id]);
    // For students, hide correct_key
    const visible = req.user.role_key === 'student'
      ? questions.map(q => ({ ...q, options_json: q.options_json, correct_key: undefined }))
      : questions;
    item.questions = visible;
    if (req.user.role_key === 'student') {
      const [attempts] = await pool.query(
        `SELECT * FROM quiz_attempts WHERE quiz_id=? AND student_id=(SELECT id FROM students WHERE user_id=?) ORDER BY id DESC`,
        [req.params.id, req.user.id]);
      item.my_attempts = attempts;
    }
    res.json({ item });
  } catch (e) { next(e); }
});

router.put('/quizzes/:id', requirePermission('lms.quiz.create'), async (req, res, next) => {
  try {
    const p = quizSchema.partial().safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const d = p.data;
    const sets=[]; const v=[];
    for (const k of ['title','available_from','available_to']) if (d[k] !== undefined) { sets.push(`\`${k}\`=?`); v.push(d[k]); }
    if (d.total_marks !== undefined) { sets.push('total_marks=?'); v.push(d.total_marks); }
    if (d.time_limit_min !== undefined) { sets.push('time_limit_min=?'); v.push(d.time_limit_min); }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    v.push(req.params.id);
    await pool.query(`UPDATE quizzes SET ${sets.join(', ')} WHERE id=?`, v);
    await log({ actorId: req.user.id, action: 'lms.quiz.update', entityType: 'quiz', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/quizzes/:id', requirePermission('lms.quiz.create'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM quizzes WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, action: 'lms.quiz.delete', entityType: 'quiz', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

const questionSchema = z.object({
  prompt:       z.string().min(1),
  type:         z.enum(['mcq','truefalse','short','essay']).default('mcq'),
  options_json: z.array(z.object({ key: z.string(), text: z.string() })).optional(),
  correct_key:  z.string().optional(),
  marks:        z.number().min(0).max(10000).default(1),
  position:     z.number().int().min(0).max(999).optional(),
});

router.post('/quizzes/:id/questions', requirePermission('lms.quiz.create'), async (req, res, next) => {
  try {
    const p = questionSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const d = p.data;
    const [r] = await pool.query(
      `INSERT INTO quiz_questions (quiz_id, prompt, type, options_json, correct_key, marks, position)
       VALUES (?,?,?,?,?,?,?)`,
      [req.params.id, d.prompt, d.type,
       d.options_json ? JSON.stringify(d.options_json) : null,
       d.correct_key || null, d.marks, d.position || 0]);
    await log({ actorId: req.user.id, action: 'lms.quiz.question.create', entityType: 'quiz_question', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});

router.delete('/quizzes/:id/questions/:qid', requirePermission('lms.quiz.create'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM quiz_questions WHERE id=? AND quiz_id=?', [req.params.qid, req.params.id]);
    await log({ actorId: req.user.id, action: 'lms.quiz.question.delete', entityType: 'quiz_question', entityId: Number(req.params.qid), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Quiz attempts
const attemptStartSchema = z.object({});
router.post('/quizzes/:id/attempt', requirePermission('lms.quiz.take'), async (req, res, next) => {
  try {
    const [stu] = await pool.query(`SELECT id FROM students WHERE user_id=?`, [req.user.id]);
    if (!stu.length) return res.status(400).json({ error: 'no_student_profile' });
    // Prevent multiple open attempts; allow re-attempt after grading
    const [open] = await pool.query(
      `SELECT id FROM quiz_attempts WHERE quiz_id=? AND student_id=? AND submitted_at IS NULL LIMIT 1`,
      [req.params.id, stu[0].id]);
    if (open.length) return res.status(409).json({ error: 'attempt_in_progress', attempt_id: open[0].id });
    const [r] = await pool.query(
      `INSERT INTO quiz_attempts (quiz_id, student_id, started_at) VALUES (?,?,NOW())`,
      [req.params.id, stu[0].id]);
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});

const submitSchema = z.object({
  answers: z.record(z.string(), z.any()),
});
router.post('/quizzes/:id/attempt/:aid/submit', requirePermission('lms.quiz.take'), async (req, res, next) => {
  try {
    const p = submitSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const [stu] = await pool.query(`SELECT id FROM students WHERE user_id=?`, [req.user.id]);
    if (!stu.length) return res.status(400).json({ error: 'no_student_profile' });
    // Auto-grade MCQ + truefalse
    const [questions] = await pool.query(`SELECT id, type, correct_key, marks FROM quiz_questions WHERE quiz_id=?`, [req.params.id]);
    let score = 0;
    const answers = p.data.answers;
    for (const q of questions) {
      const given = answers[String(q.id)];
      if (given == null) continue;
      if ((q.type === 'mcq' || q.type === 'truefalse') && q.correct_key && given === q.correct_key) {
        score += Number(q.marks);
      }
      // essay / short are not auto-graded
    }
    await pool.query(
      `UPDATE quiz_attempts SET submitted_at=NOW(), score=?, answers_json=? WHERE id=? AND student_id=?`,
      [score, JSON.stringify(answers), req.params.aid, stu[0].id]);
    res.json({ ok: true, score });
  } catch (e) { next(e); }
});

module.exports = router;
