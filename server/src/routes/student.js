// Student portal (Phase 4) — replaces the Phase 1 stub.
const express = require('express');
const { requireAuth, requireRole } = require('../auth/middleware');
const { pool } = require('../db');

const router = express.Router();

async function getStudentProfile(userId) {
  const [rows] = await pool.query(
    `SELECT s.id AS student_id, s.admission_no, s.roll_no,
            c.name AS class_name, sec.name AS section_name, c.id AS class_id, sec.id AS section_id,
            ay.id AS session_id, ay.name AS session_name,
            s.guardian_name, s.guardian_phone
       FROM students s
       JOIN classes c          ON c.id = s.class_id
       JOIN sections sec       ON sec.id = s.section_id
       JOIN academic_sessions ay ON ay.id = s.session_id
      WHERE s.user_id = ? LIMIT 1`, [userId]);
  return rows[0] || null;
}

router.get('/dashboard', requireAuth(), requireRole('student'), async (req, res, next) => {
  try {
    const profile = await getStudentProfile(req.user.id);
    if (!profile) return res.json({ role: 'student', greeting: `Welcome, ${req.user.full_name}`, profile: null, todo: null });
    // Upcoming live classes for this student
    const [live] = await pool.query(
      `SELECT lc.id, lc.title, lc.starts_at, lc.ends_at, lc.status, lc.jitsi_room,
              sub.name AS subject_name, u.full_name AS teacher_name
         FROM live_classes lc
         JOIN subjects sub ON sub.id = lc.subject_id
         JOIN teachers t  ON t.id = lc.teacher_id
         JOIN users u     ON u.id = t.user_id
        WHERE lc.class_id=? AND lc.section_id=? AND lc.session_id=? AND lc.starts_at >= NOW()
        ORDER BY lc.starts_at ASC LIMIT 5`,
      [profile.class_id, profile.section_id, profile.session_id]);
    // Pending assignments (no submission yet)
    const [pending] = await pool.query(
      `SELECT a.id, a.title, a.due_at, a.total_marks, sub.name AS subject_name
         FROM assignments a
         JOIN subjects sub ON sub.id = a.subject_id
        WHERE a.class_id=? AND a.section_id=? AND a.session_id=?
          AND NOT EXISTS (SELECT 1 FROM assignment_submissions s WHERE s.assignment_id=a.id AND s.student_id=?)
        ORDER BY a.due_at ASC LIMIT 5`,
      [profile.class_id, profile.section_id, profile.session_id, profile.student_id]);
    // Available quizzes
    const [quizzes] = await pool.query(
      `SELECT q.id, q.title, q.available_to, q.time_limit_min, sub.name AS subject_name,
              EXISTS (SELECT 1 FROM quiz_attempts WHERE quiz_id=q.id AND student_id=? AND submitted_at IS NOT NULL) AS completed
         FROM quizzes q
         JOIN subjects sub ON sub.id = q.subject_id
        WHERE q.class_id=? AND q.section_id=? AND q.session_id=?
          AND q.available_from <= NOW() AND q.available_to >= NOW()
        ORDER BY q.available_to ASC LIMIT 5`,
      [profile.student_id, profile.class_id, profile.section_id, profile.session_id]);
    // Attendance %
    const [att] = await pool.query(
      `SELECT COUNT(*) AS total,
              SUM(status='present') AS present,
              SUM(status='late')   AS late,
              SUM(status='leave')  AS leave_days,
              SUM(status='absent') AS absent
         FROM student_attendance
        WHERE student_id=? AND date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)`,
      [profile.student_id]);
    const a = att[0] || {};
    const counted = (a.present || 0) + (a.late || 0) + (a.absent || 0);
    const attended = (a.present || 0) + (a.late || 0);
    const attendance_pct = counted ? Math.round((attended / counted) * 100) : null;
    // Unpaid fees
    const [fees] = await pool.query(
      `SELECT COUNT(*) AS unpaid_count, IFNULL(SUM(net_amount - paid_amount), 0) AS unpaid_total
         FROM fee_collections WHERE student_id=? AND status IN ('unpaid','partial','overdue')`,
      [profile.student_id]);
    return res.json({
      role: 'student', greeting: `Welcome, ${req.user.full_name}`, profile,
      live_classes: live, pending_assignments: pending, quizzes,
      attendance: { ...a, attendance_pct, counted },
      fees: fees[0],
    });
  } catch (err) { next(err); }
});

// Attendance history
router.get('/attendance', requireAuth(), requireRole('student'), async (req, res, next) => {
  try {
    const [stu] = await pool.query(`SELECT id FROM students WHERE user_id=?`, [req.user.id]);
    if (!stu.length) return res.json({ items: [] });
    const { from, to } = req.query;
    const where=['student_id=?']; const p=[stu[0].id];
    if (from) { where.push('date>=?'); p.push(from); }
    if (to)   { where.push('date<=?'); p.push(to); }
    const [rows] = await pool.query(
      `SELECT date, status, remarks FROM student_attendance WHERE ${where.join(' AND ')} ORDER BY date DESC LIMIT 365`, p);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

// Results history
router.get('/results', requireAuth(), requireRole('student'), async (req, res, next) => {
  try {
    const [stu] = await pool.query(`SELECT id FROM students WHERE user_id=?`, [req.user.id]);
    if (!stu.length) return res.json({ items: [] });
    const [rows] = await pool.query(
      `SELECT r.id, r.marks_obtained, r.total_marks, r.grade, r.remarks, r.created_at,
              sub.name AS subject_name, t.name AS term_name, ay.name AS session_name
         FROM results r
         JOIN subjects sub ON sub.id = r.subject_id
         JOIN terms t      ON t.id = r.term_id
         JOIN academic_sessions ay ON ay.id = r.session_id
        WHERE r.student_id=? ORDER BY r.created_at DESC LIMIT 200`, [stu[0].id]);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

// Fee records
router.get('/fees', requireAuth(), requireRole('student'), async (req, res, next) => {
  try {
    const [stu] = await pool.query(`SELECT id FROM students WHERE user_id=?`, [req.user.id]);
    if (!stu.length) return res.json({ items: [] });
    const [rows] = await pool.query(
      `SELECT fc.id, fc.amount, fc.discount_amount, fc.net_amount, fc.paid_amount, fc.due_date,
              fc.status, fc.challan_no, fc.collected_at, fc.notes,
              fs.name AS structure_name, ay.name AS session_name
         FROM fee_collections fc
         JOIN fee_structures fs ON fs.id = fc.fee_structure_id
         JOIN academic_sessions ay ON ay.id = fs.session_id
        WHERE fc.student_id=? ORDER BY fc.due_date DESC LIMIT 200`, [stu[0].id]);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

// Remarks about this student (visible ones)
router.get('/remarks', requireAuth(), requireRole('student'), async (req, res, next) => {
  try {
    const [stu] = await pool.query(`SELECT id FROM students WHERE user_id=?`, [req.user.id]);
    if (!stu.length) return res.json({ items: [] });
    const [rows] = await pool.query(
      `SELECT r.id, r.body, r.category, r.created_at, u.full_name AS author_name
         FROM student_remarks r
         JOIN users u ON u.id = r.author_id
        WHERE r.student_id=? AND r.is_visible_to_parent=1
        ORDER BY r.created_at DESC LIMIT 100`, [stu[0].id]);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

module.exports = router;
