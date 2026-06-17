// Parent portal (Phase 4) — replaces the Phase 1 stub. Lists linked
// children and exposes per-child drilldowns for attendance, results, fees.
const express = require('express');
const { requireAuth, requireRole } = require('../auth/middleware');
const { pool } = require('../db');

const router = express.Router();

async function getChildIdsFor(userId) {
  const [rows] = await pool.query(
    `SELECT st.id AS student_id, st.admission_no, c.name AS class_name, sec.name AS section_name, ay.name AS session_name,
            ps.relation, st.class_id, st.section_id, st.session_id, u.full_name AS student_name
       FROM parents p
       JOIN parent_student ps ON ps.parent_id = p.id
       JOIN students st ON st.id = ps.student_id
       JOIN classes c ON c.id = st.class_id
       JOIN sections sec ON sec.id = st.section_id
       JOIN academic_sessions ay ON ay.id = st.session_id
       JOIN users u ON u.id = st.user_id
      WHERE p.user_id=? ORDER BY st.admission_no`, [userId]);
  return rows;
}

async function assertChildOf(parentUserId, studentId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM parents p JOIN parent_student ps ON ps.parent_id=p.id
       WHERE p.user_id=? AND ps.student_id=? LIMIT 1`, [parentUserId, studentId]);
  return rows.length > 0;
}

router.get('/dashboard', requireAuth(), requireRole('parent'), async (req, res, next) => {
  try {
    const children = await getChildIdsFor(req.user.id);
    if (!children.length) {
      return res.json({ role: 'parent', greeting: `Welcome, ${req.user.full_name}`, children: [], summaries: [] });
    }
    // Per-child attendance % (last 60 days) + fee status + latest result
    const summaries = [];
    for (const c of children) {
      const [att] = await pool.query(
        `SELECT COUNT(*) AS total,
                SUM(status='present') AS present,
                SUM(status='late')   AS late,
                SUM(status='absent') AS absent
           FROM student_attendance
          WHERE student_id=? AND date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)`,
        [c.student_id]);
      const a = att[0] || {};
      const counted = (a.present || 0) + (a.late || 0) + (a.absent || 0);
      const attended = (a.present || 0) + (a.late || 0);
      const attendance_pct = counted ? Math.round((attended / counted) * 100) : null;
      const [fees] = await pool.query(
        `SELECT COUNT(*) AS unpaid_count, IFNULL(SUM(net_amount - paid_amount), 0) AS unpaid_total
           FROM fee_collections WHERE student_id=? AND status IN ('unpaid','partial','overdue')`,
        [c.student_id]);
      const [latestRes] = await pool.query(
        `SELECT r.marks_obtained, r.total_marks, r.grade, sub.name AS subject_name, t.name AS term_name
           FROM results r
           JOIN subjects sub ON sub.id = r.subject_id
           JOIN terms t ON t.id = r.term_id
          WHERE r.student_id=? ORDER BY r.created_at DESC LIMIT 1`, [c.student_id]);
      const [remarks] = await pool.query(
        `SELECT r.body, r.category, r.created_at, u.full_name AS author_name
           FROM student_remarks r JOIN users u ON u.id = r.author_id
          WHERE r.student_id=? AND r.is_visible_to_parent=1
          ORDER BY r.created_at DESC LIMIT 3`, [c.student_id]);
      summaries.push({
        student_id: c.student_id,
        student_name: c.student_name,
        attendance: { ...a, attendance_pct, counted },
        fees: fees[0],
        latest_result: latestRes[0] || null,
        recent_remarks: remarks,
      });
    }
    return res.json({ role: 'parent', greeting: `Welcome, ${req.user.full_name}`, children, summaries });
  } catch (e) { next(e); }
});

router.get('/children/:studentId/attendance', requireAuth(), requireRole('parent'), async (req, res, next) => {
  try {
    if (!(await assertChildOf(req.user.id, req.params.studentId))) return res.status(403).json({ error: 'not_linked' });
    const [rows] = await pool.query(
      `SELECT date, status, remarks FROM student_attendance WHERE student_id=? ORDER BY date DESC LIMIT 365`,
      [req.params.studentId]);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

router.get('/children/:studentId/results', requireAuth(), requireRole('parent'), async (req, res, next) => {
  try {
    if (!(await assertChildOf(req.user.id, req.params.studentId))) return res.status(403).json({ error: 'not_linked' });
    const [rows] = await pool.query(
      `SELECT r.marks_obtained, r.total_marks, r.grade, r.remarks, r.created_at,
              sub.name AS subject_name, t.name AS term_name, ay.name AS session_name
         FROM results r
         JOIN subjects sub ON sub.id = r.subject_id
         JOIN terms t ON t.id = r.term_id
         JOIN academic_sessions ay ON ay.id = r.session_id
        WHERE r.student_id=? ORDER BY r.created_at DESC`, [req.params.studentId]);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

router.get('/children/:studentId/fees', requireAuth(), requireRole('parent'), async (req, res, next) => {
  try {
    if (!(await assertChildOf(req.user.id, req.params.studentId))) return res.status(403).json({ error: 'not_linked' });
    const [rows] = await pool.query(
      `SELECT fc.amount, fc.discount_amount, fc.net_amount, fc.paid_amount, fc.due_date,
              fc.status, fc.challan_no, fc.collected_at,
              fs.name AS structure_name, ay.name AS session_name
         FROM fee_collections fc
         JOIN fee_structures fs ON fs.id = fc.fee_structure_id
         JOIN academic_sessions ay ON ay.id = fs.session_id
        WHERE fc.student_id=? ORDER BY fc.due_date DESC`, [req.params.studentId]);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

module.exports = router;
