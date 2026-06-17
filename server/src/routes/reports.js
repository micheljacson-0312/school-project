// Reports & Analytics exports (Phase 7) — CSV data endpoints for
// student, teacher, and financial reports. The frontend renders
// them as download links or copy-to-clipboard; a real PDF renderer
// can be added later.
const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../auth/middleware');
const { requirePermission } = require('../rbac/middleware');

const router = express.Router();
router.use(requireAuth());

// Helper: convert array of objects to CSV string
function toCSV(rows, columns) {
  if (!rows.length) return columns.join(',');
  const escape = v => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map(c => escape(c.label)).join(',');
  const body = rows.map(r => columns.map(c => escape(r[c.key])).join(',')).join('\n');
  return head + '\n' + body + '\n';
}

// ---------------------------------------------------------------------
// Student directory CSV (per session/class)
// ---------------------------------------------------------------------
router.get('/csv/students', requirePermission('reports.view'), async (req, res, next) => {
  try {
    const { class_id, section_id, session_id } = req.query;
    const where = ['s.status="active"']; const p = [];
    if (class_id)   { where.push('s.class_id=?');   p.push(class_id); }
    if (section_id) { where.push('s.section_id=?'); p.push(section_id); }
    if (session_id) { where.push('s.session_id=?'); p.push(session_id); }
    const [rows] = await pool.query(
      `SELECT s.admission_no, u.full_name, s.roll_no, s.date_of_birth, s.gender,
              c.name AS class_name, sec.name AS section_name, ay.name AS session_name,
              s.guardian_name, s.guardian_phone, u.email
         FROM students s
         JOIN users u ON u.id = s.user_id
         JOIN classes c ON c.id = s.class_id
         JOIN sections sec ON sec.id = s.section_id
         JOIN academic_sessions ay ON ay.id = s.session_id
        WHERE ${where.join(' AND ')}
        ORDER BY c.level, sec.name, u.full_name`, p);
    const csv = toCSV(rows, [
      { key: 'admission_no',    label: 'Admission No' },
      { key: 'full_name',        label: 'Name' },
      { key: 'roll_no',          label: 'Roll' },
      { key: 'class_name',       label: 'Class' },
      { key: 'section_name',     label: 'Section' },
      { key: 'session_name',     label: 'Session' },
      { key: 'date_of_birth',    label: 'DOB' },
      { key: 'gender',           label: 'Gender' },
      { key: 'guardian_name',    label: 'Guardian' },
      { key: 'guardian_phone',   label: 'Guardian Phone' },
      { key: 'email',            label: 'Email' },
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
    res.send(csv);
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Teacher directory CSV
// ---------------------------------------------------------------------
router.get('/csv/teachers', requirePermission('reports.view'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.employee_code, u.full_name, u.email, u.phone, t.designation, t.qualification, t.joining_date, t.status
         FROM teachers t
         JOIN users u ON u.id = t.user_id
         ORDER BY u.full_name`);
    const csv = toCSV(rows, [
      { key: 'employee_code', label: 'Employee Code' },
      { key: 'full_name',     label: 'Name' },
      { key: 'email',         label: 'Email' },
      { key: 'phone',         label: 'Phone' },
      { key: 'designation',   label: 'Designation' },
      { key: 'qualification', label: 'Qualification' },
      { key: 'joining_date',  label: 'Joining Date' },
      { key: 'status',        label: 'Status' },
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="teachers.csv"');
    res.send(csv);
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Marks sheet CSV (per class + term)
// ---------------------------------------------------------------------
router.get('/csv/marks-sheet', requirePermission('reports.view'), async (req, res, next) => {
  try {
    const { class_id, section_id, term_id, session_id } = req.query;
    if (!class_id || !section_id || !term_id) return res.status(400).json({ error: 'missing_class_section_term' });
    const sid = session_id || 1;
    const [subjects] = await pool.query(`SELECT id, name FROM subjects WHERE class_id=? ORDER BY name`, [class_id]);
    const [students] = await pool.query(
      `SELECT s.id AS student_id, s.admission_no, u.full_name FROM students s JOIN users u ON u.id=s.user_id
        WHERE s.class_id=? AND s.section_id=? AND s.status='active' ORDER BY u.full_name`,
      [class_id, section_id]);
    // Pivot: one row per student, columns per subject
    const [marks] = await pool.query(
      `SELECT r.student_id, r.subject_id, r.marks_obtained, r.total_marks, r.grade
         FROM results r WHERE r.term_id=? AND r.session_id=? AND r.student_id IN (?)`,
      [term_id, sid, students.map(s => s.student_id)]);
    const grid = {};
    for (const m of marks) {
      grid[m.student_id] = grid[m.student_id] || {};
      grid[m.student_id][m.subject_id] = m;
    }
    const header = [
      { key: 'admission_no', label: 'Admission No' },
      { key: 'full_name',     label: 'Name' },
      ...subjects.map(s => ({ key: `s${s.id}_marks`, label: `${s.name} (Marks)` })),
      ...subjects.map(s => ({ key: `s${s.id}_grade`, label: `${s.name} (Grade)` })),
    ];
    const rows = students.map(s => {
      const m = grid[s.student_id] || {};
      const obj = { admission_no: s.admission_no, full_name: s.full_name };
      for (const subj of subjects) {
        obj[`s${subj.id}_marks`] = m[subj.id]?.marks_obtained ?? '';
        obj[`s${subj.id}_grade`] = m[subj.id]?.grade ?? '';
      }
      return obj;
    });
    const csv = toCSV(rows, header);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="marks-sheet-${class_id}-${section_id}-${term_id}.csv"`);
    res.send(csv);
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Attendance CSV (per class + month)
// ---------------------------------------------------------------------
router.get('/csv/attendance', requirePermission('reports.view'), async (req, res, next) => {
  try {
    const { class_id, section_id, month } = req.query;
    if (!class_id || !section_id || !month) return res.status(400).json({ error: 'missing_class_section_month' });
    const [rows] = await pool.query(
      `SELECT s.admission_no, u.full_name, sa.date, sa.status, sa.remarks
         FROM student_attendance sa
         JOIN students s ON s.id = sa.student_id
         JOIN users u ON u.id = s.user_id
        WHERE sa.class_id=? AND sa.section_id=? AND DATE_FORMAT(sa.date,'%Y-%m')=?
        ORDER BY sa.date, u.full_name`,
      [class_id, section_id, month]);
    const csv = toCSV(rows, [
      { key: 'admission_no', label: 'Admission No' },
      { key: 'full_name',     label: 'Name' },
      { key: 'date',          label: 'Date' },
      { key: 'status',        label: 'Status' },
      { key: 'remarks',       label: 'Remarks' },
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${class_id}-${section_id}-${month}.csv"`);
    res.send(csv);
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Fee report CSV
// ---------------------------------------------------------------------
router.get('/csv/fees', requirePermission('reports.view'), async (req, res, next) => {
  try {
    const { status, class_id, session_id } = req.query;
    const where = ['1=1']; const p = [];
    if (status)     { where.push('fc.status=?'); p.push(status); }
    if (class_id)   { where.push('c.id=?'); p.push(class_id); }
    if (session_id) { where.push('fs.session_id=?'); p.push(session_id); }
    const [rows] = await pool.query(
      `SELECT s.admission_no, u.full_name, c.name AS class_name, sec.name AS section_name,
              fs.name AS structure_name, fc.amount AS gross, fc.discount_amount, fc.net_amount,
              fc.paid_amount, (fc.net_amount - fc.paid_amount) AS outstanding,
              fc.status, fc.due_date, fc.challan_no
         FROM fee_collections fc
         JOIN students s ON s.id = fc.student_id
         JOIN users u ON u.id = s.user_id
         JOIN classes c ON c.id = s.class_id
         JOIN sections sec ON sec.id = s.section_id
         JOIN fee_structures fs ON fs.id = fc.fee_structure_id
        WHERE ${where.join(' AND ')}
        ORDER BY fc.due_date DESC`,
      p);
    const csv = toCSV(rows, [
      { key: 'admission_no',    label: 'Admission No' },
      { key: 'full_name',        label: 'Name' },
      { key: 'class_name',       label: 'Class' },
      { key: 'section_name',     label: 'Section' },
      { key: 'structure_name',   label: 'Structure' },
      { key: 'gross',            label: 'Gross' },
      { key: 'discount_amount',  label: 'Discount' },
      { key: 'net_amount',       label: 'Net' },
      { key: 'paid_amount',      label: 'Paid' },
      { key: 'outstanding',      label: 'Outstanding' },
      { key: 'status',           label: 'Status' },
      { key: 'due_date',         label: 'Due Date' },
      { key: 'challan_no',       label: 'Challan No' },
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="fees.csv"');
    res.send(csv);
  } catch (e) { next(e); }
});

module.exports = router;
