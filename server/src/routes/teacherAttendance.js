// Teacher attendance (Phase 5) — daily check-in / check-out + monthly reports.
// Distinct from student attendance. Teachers mark themselves in/out via
// web UI today; a fingerprint integration hook exists at
// /api/integrations/fingerprint/event (Phase 5 stub).
const express = require('express');
const { z } = require('zod');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../auth/middleware');
const { requirePermission } = require('../rbac/middleware');
const { log } = require('../audit/log');

const router = express.Router();
router.use(requireAuth());

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function getTeacherProfile(userId) {
  const [rows] = await pool.query(`SELECT id AS teacher_id FROM teachers WHERE user_id=? LIMIT 1`, [userId]);
  return rows[0] || null;
}

// POST /api/teacher-attendance/checkin — mark self present for today.
router.post('/checkin', requirePermission('teacher_attendance.mark'), async (req, res, next) => {
  try {
    const t = await getTeacherProfile(req.user.id);
    if (!t) return res.status(400).json({ error: 'no_teacher_profile' });
    const schema = z.object({ time: z.string().optional(), remarks: z.string().max(255).optional() });
    const p = schema.safeParse(req.body || {});
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const today = todayDate();
    const checkIn = p.data.time || new Date().toTimeString().slice(0, 8);
    await pool.query(
      `INSERT INTO teacher_attendance (teacher_id, date, status, check_in, remarks, marked_by, source)
       VALUES (?,?, 'present', ?, ?, ?, 'manual')
       ON DUPLICATE KEY UPDATE status='present', check_in=VALUES(check_in), remarks=VALUES(remarks), marked_by=VALUES(marked_by)`,
      [t.teacher_id, today, checkIn, p.data.remarks || null, req.user.id]);
    await log({ actorId: req.user.id, action: 'teacher_attendance.checkin', entityType: 'teacher_attendance', ip: req.ip, meta: { date: today } });
    res.json({ ok: true, date: today, check_in: checkIn });
  } catch (e) { next(e); }
});

// POST /api/teacher-attendance/checkout — set check_out time for today.
router.post('/checkout', requirePermission('teacher_attendance.mark'), async (req, res, next) => {
  try {
    const t = await getTeacherProfile(req.user.id);
    if (!t) return res.status(400).json({ error: 'no_teacher_profile' });
    const schema = z.object({ time: z.string().optional() });
    const p = schema.safeParse(req.body || {});
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const today = todayDate();
    const checkOut = p.data.time || new Date().toTimeString().slice(0, 8);
    const [r] = await pool.query(
      `UPDATE teacher_attendance SET check_out=? WHERE teacher_id=? AND date=?`,
      [checkOut, t.teacher_id, today]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'no_checkin_today' });
    await log({ actorId: req.user.id, action: 'teacher_attendance.checkout', entityType: 'teacher_attendance', ip: req.ip, meta: { date: today } });
    res.json({ ok: true, date: today, check_out: checkOut });
  } catch (e) { next(e); }
});

// GET /api/teacher-attendance/today — own today's record.
router.get('/today', async (req, res, next) => {
  try {
    const t = await getTeacherProfile(req.user.id);
    if (!t) return res.json({ item: null });
    const [rows] = await pool.query(
      `SELECT * FROM teacher_attendance WHERE teacher_id=? AND date=? LIMIT 1`,
      [t.teacher_id, todayDate()]);
    res.json({ item: rows[0] || null });
  } catch (e) { next(e); }
});

// GET /api/teacher-attendance/history?from=&to= — own history.
router.get('/history', async (req, res, next) => {
  try {
    const t = await getTeacherProfile(req.user.id);
    if (!t) return res.json({ items: [] });
    const { from, to } = req.query;
    const where = ['teacher_id=?']; const p = [t.teacher_id];
    if (from) { where.push('date>=?'); p.push(from); }
    if (to)   { where.push('date<=?'); p.push(to); }
    const [rows] = await pool.query(
      `SELECT date, status, check_in, check_out, remarks FROM teacher_attendance WHERE ${where.join(' AND ')} ORDER BY date DESC LIMIT 365`, p);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

// GET /api/teacher-attendance/report?month=YYYY-MM — admin/coordinator view of all teachers
router.get('/report', requirePermission('teacher_attendance.view_all'), async (req, res, next) => {
  try {
    const month = (req.query.month || new Date().toISOString().slice(0, 7));
    const [rows] = await pool.query(
      `SELECT u.id AS user_id, u.full_name, t.id AS teacher_id, t.employee_code,
              (SELECT COUNT(*) FROM teacher_attendance ta
                 WHERE ta.teacher_id=t.id
                   AND DATE_FORMAT(ta.date,'%Y-%m')=?
                   AND ta.status='present') AS present_days,
              (SELECT COUNT(*) FROM teacher_attendance ta
                 WHERE ta.teacher_id=t.id
                   AND DATE_FORMAT(ta.date,'%Y-%m')=?
                   AND ta.status='late') AS late_days,
              (SELECT COUNT(*) FROM teacher_attendance ta
                 WHERE ta.teacher_id=t.id
                   AND DATE_FORMAT(ta.date,'%Y-%m')=?
                   AND ta.status='absent') AS absent_days
         FROM teachers t
         JOIN users u ON u.id = t.user_id
         WHERE t.status='active'
         ORDER BY u.full_name`, [month, month, month]);
    res.json({ month, items: rows });
  } catch (e) { next(e); }
});

module.exports = router;
