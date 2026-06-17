// Student attendance reports (Phase 5) — class/term/monthly summaries,
// defaulters (students below threshold), per-student monthly breakdown.
const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../auth/middleware');
const { requirePermission } = require('../rbac/middleware');

const router = express.Router();
router.use(requireAuth());

// GET /api/attendance-reports/class?class_id=&section_id=&session_id=&month=YYYY-MM
// Returns one row per student in the class/section with present/absent/late/leave counts for that month.
router.get('/class', requirePermission('attendance.report'), async (req, res, next) => {
  try {
    const { class_id, section_id, month } = req.query;
    if (!class_id || !section_id) return res.status(400).json({ error: 'missing_class_section' });
    const m = month || new Date().toISOString().slice(0, 7);
    const [rows] = await pool.query(
      `SELECT s.id AS student_id, s.admission_no, u.full_name,
              COUNT(sa.id) AS total_marked,
              SUM(sa.status='present') AS present,
              SUM(sa.status='late')    AS late,
              SUM(sa.status='absent')  AS absent,
              SUM(sa.status='leave')   AS leave_days,
              SUM(sa.status='holiday') AS holidays,
              ROUND(100 * (SUM(sa.status='present') + SUM(sa.status='late')) / NULLIF(COUNT(sa.id) - SUM(sa.status='holiday'), 0), 1) AS attendance_pct
         FROM students s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN student_attendance sa
           ON sa.student_id = s.id
          AND DATE_FORMAT(sa.date,'%Y-%m') = ?
        WHERE s.class_id=? AND s.section_id=? AND s.status='active'
        GROUP BY s.id
        ORDER BY u.full_name`, [m, class_id, section_id]);
    res.json({ month: m, items: rows });
  } catch (e) { next(e); }
});

// GET /api/attendance-reports/student/:studentId?month=
router.get('/student/:studentId', requirePermission('attendance.view'), async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const [rows] = await pool.query(
      `SELECT date, status, remarks FROM student_attendance
        WHERE student_id=? AND DATE_FORMAT(date,'%Y-%m')=?
        ORDER BY date ASC`, [req.params.studentId, month]);
    // Summary
    const summary = { total: rows.length, present: 0, absent: 0, late: 0, leave: 0, holiday: 0 };
    for (const r of rows) summary[r.status] = (summary[r.status] || 0) + 1;
    const counted = summary.total - summary.holiday;
    const attended = summary.present + summary.late;
    summary.attendance_pct = counted ? Math.round((attended / counted) * 100) : null;
    res.json({ month, summary, items: rows });
  } catch (e) { next(e); }
});

// GET /api/attendance-reports/defaulters?class_id=&section_id=&month=&threshold=75
// Students below attendance threshold for the month.
router.get('/defaulters', requirePermission('attendance.report'), async (req, res, next) => {
  try {
    const { class_id, section_id, month, threshold = 75 } = req.query;
    if (!class_id || !section_id) return res.status(400).json({ error: 'missing_class_section' });
    const m = month || new Date().toISOString().slice(0, 7);
    const thresh = Number(threshold);
    const [rows] = await pool.query(
      `SELECT s.id AS student_id, s.admission_no, u.full_name,
              COUNT(sa.id) AS total_marked,
              SUM(sa.status='present') AS present,
              SUM(sa.status='late')    AS late,
              SUM(sa.status='absent')  AS absent,
              ROUND(100 * (SUM(sa.status='present') + SUM(sa.status='late')) / NULLIF(COUNT(sa.id) - SUM(sa.status='holiday'), 0), 1) AS attendance_pct
         FROM students s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN student_attendance sa
           ON sa.student_id = s.id
          AND DATE_FORMAT(sa.date,'%Y-%m') = ?
        WHERE s.class_id=? AND s.section_id=? AND s.status='active'
        GROUP BY s.id
        HAVING attendance_pct IS NULL OR attendance_pct < ?
        ORDER BY attendance_pct ASC`, [m, class_id, section_id, thresh]);
    res.json({ month: m, threshold: thresh, items: rows });
  } catch (e) { next(e); }
});

// GET /api/attendance-reports/calendar?class_id=&section_id=&student_id=&month=
// Returns day-by-day status for a class or student (for the calendar widget).
router.get('/calendar', requirePermission('attendance.view'), async (req, res, next) => {
  try {
    const { class_id, section_id, student_id, month } = req.query;
    if (!month) return res.status(400).json({ error: 'missing_month' });
    let where = ['DATE_FORMAT(date,"%Y-%m")=?']; const p = [month];
    if (student_id) { where.push('student_id=?'); p.push(student_id); }
    else if (class_id && section_id) {
      where.push('class_id=? AND section_id=?');
      p.push(class_id, section_id);
    } else {
      return res.status(400).json({ error: 'missing_student_or_class' });
    }
    const [rows] = await pool.query(
      `SELECT date, status, student_id FROM student_attendance WHERE ${where.join(' AND ')} ORDER BY date`, p);
    res.json({ month, items: rows });
  } catch (e) { next(e); }
});

module.exports = router;
