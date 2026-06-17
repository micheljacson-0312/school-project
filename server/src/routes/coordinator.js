// Coordinator aggregated dashboard (Phase 5).
const express = require('express');
const { requireAuth, requireRole } = require('../auth/middleware');
const { pool } = require('../db');

const router = express.Router();
router.use(requireAuth(), requireRole('coordinator','admin'));

router.get('/dashboard', async (req, res, next) => {
  try {
    const [classes]     = await pool.query(`SELECT COUNT(*) AS n FROM classes`);
    const [students]    = await pool.query(`SELECT COUNT(*) AS n FROM students WHERE status='active'`);
    const [evaluations] = await pool.query(`SELECT COUNT(*) AS n FROM evaluation_forms WHERE is_active=1`);
    // Defaulters for current month
    const month = new Date().toISOString().slice(0, 7);
    const [defaulterRows] = await pool.query(
      `SELECT s.id AS student_id
         FROM students s
         JOIN classes c ON c.id = s.class_id
         JOIN sections sec ON sec.id = s.section_id
         LEFT JOIN student_attendance sa
           ON sa.student_id = s.id
          AND DATE_FORMAT(sa.date,'%Y-%m') = ?
        WHERE s.status='active'
        GROUP BY s.id
        HAVING ROUND(100 * (SUM(sa.status='present') + SUM(sa.status='late')) / NULLIF(COUNT(sa.id) - SUM(sa.status='holiday'), 0), 1) < 75`,
      [month]);
    res.json({
      role: 'coordinator',
      greeting: `Welcome, ${req.user.full_name}`,
      classes: classes[0].n,
      students_active: students[0].n,
      defaulters: defaulterRows.length,
      active_evaluations: evaluations[0].n,
    });
  } catch (e) { next(e); }
});

module.exports = router;
