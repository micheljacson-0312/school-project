// Accountant portal (Phase 6) — fee structures, discount engine, bill
// generation, collection recording, defaulter list, reports, expenditures.
const express = require('express');
const { z } = require('zod');
const crypto = require('crypto');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../auth/middleware');
const { requirePermission } = require('../rbac/middleware');
const { log } = require('../audit/log');

const router = express.Router();
router.use(requireAuth(), requireRole('accountant','admin'));

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------
router.get('/dashboard', async (req, res, next) => {
  try {
    const today = new Date();
    const month = today.toISOString().slice(0, 7);
    const [collected] = await pool.query(
      `SELECT IFNULL(SUM(paid_amount), 0) AS month_collected, COUNT(*) AS month_payments
         FROM fee_collections
        WHERE status IN ('paid','partial') AND DATE_FORMAT(collected_at,'%Y-%m')=?`, [month]);
    const [outstanding] = await pool.query(
      `SELECT IFNULL(SUM(net_amount - paid_amount), 0) AS total_due,
              COUNT(*) AS unpaid_count
         FROM fee_collections WHERE status IN ('unpaid','partial','overdue')`);
    const [overdue] = await pool.query(
      `SELECT COUNT(*) AS overdue_count FROM fee_collections WHERE status='overdue'`);
    const [structures] = await pool.query(`SELECT COUNT(*) AS n FROM fee_structures WHERE is_active=1`);
    const [expMonth] = await pool.query(
      `SELECT IFNULL(SUM(amount), 0) AS month_spent
         FROM expenditures WHERE DATE_FORMAT(spent_on,'%Y-%m')=?`, [month]);
    res.json({
      role: 'accountant',
      greeting: `Welcome, ${req.user.full_name}`,
      month,
      collected_month: Number(collected[0].month_collected),
      payments_month:    Number(collected[0].month_payments),
      outstanding_total:  Number(outstanding[0].total_due),
      unpaid_count:       Number(outstanding[0].unpaid_count),
      overdue_count:      Number(overdue[0].overdue_count),
      active_structures:  Number(structures[0].n),
      spent_month:        Number(expMonth[0].month_spent),
    });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Fee structures (per class × session × month/annual/custom)
// ---------------------------------------------------------------------
const fsSchema = z.object({
  session_id: z.number().int().positive(),
  class_id:   z.number().int().positive(),
  name:       z.string().min(1).max(128),
  amount:     z.number().min(0).max(1000000),
  due_day:    z.number().int().min(1).max(28).default(10),
  is_active:  z.boolean().optional(),
});

router.get('/fee-structures', requirePermission('fees.structure.manage'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT fs.*, c.name AS class_name, ay.name AS session_name
         FROM fee_structures fs
         JOIN classes c ON c.id = fs.class_id
         JOIN academic_sessions ay ON ay.id = fs.session_id
         ORDER BY ay.start_date DESC, c.level`);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

router.post('/fee-structures', requirePermission('fees.structure.manage'), async (req, res, next) => {
  try {
    const p = fsSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const [r] = await pool.query(
      `INSERT INTO fee_structures (session_id, class_id, name, amount, due_day, is_active) VALUES (?,?,?,?,?,?)`,
      [d.session_id, d.class_id, d.name, d.amount, d.due_day, d.is_active === false ? 0 : 1]);
    await log({ actorId: req.user.id, action: 'fees.structure.create', entityType: 'fee_structure', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});

router.put('/fee-structures/:id', requirePermission('fees.structure.manage'), async (req, res, next) => {
  try {
    const p = fsSchema.partial().safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const d = p.data;
    const sets = []; const v = [];
    for (const k of ['name','amount','due_day']) if (d[k] !== undefined) { sets.push(`\`${k}\`=?`); v.push(d[k]); }
    if (d.is_active !== undefined) { sets.push('is_active=?'); v.push(d.is_active ? 1 : 0); }
    if (!sets.length) return res.status(400).json({ error: 'no_fields' });
    v.push(req.params.id);
    await pool.query(`UPDATE fee_structures SET ${sets.join(', ')} WHERE id=?`, v);
    await log({ actorId: req.user.id, action: 'fees.structure.update', entityType: 'fee_structure', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/fee-structures/:id', requirePermission('fees.structure.manage'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM fee_structures WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, action: 'fees.structure.delete', entityType: 'fee_structure', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Discount rules + student discounts
// ---------------------------------------------------------------------
router.get('/discount-rules', requirePermission('fees.discount.manage'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM fee_discount_rules WHERE is_active=1 ORDER BY priority DESC, display_name`);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

const sdSchema = z.object({
  student_id:       z.number().int().positive(),
  fee_structure_id: z.number().int().positive().nullable().optional(),
  discount_rule_id: z.number().int().positive(),
  valid_from:       z.string(),
  valid_to:         z.string().optional(),
});

router.get('/student-discounts', requirePermission('fees.discount.manage'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT sd.*, dr.key_name, dr.display_name AS rule_name, dr.discount_percent, dr.priority,
              s.admission_no, u.full_name AS student_name, fs.name AS structure_name
         FROM student_fee_discounts sd
         JOIN fee_discount_rules dr ON dr.id = sd.discount_rule_id
         JOIN students s ON s.id = sd.student_id
         JOIN users u ON u.id = s.user_id
         LEFT JOIN fee_structures fs ON fs.id = sd.fee_structure_id
        ORDER BY sd.approved_at DESC, sd.id DESC LIMIT 500`);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

router.post('/student-discounts', requirePermission('fees.discount.manage'), async (req, res, next) => {
  try {
    const p = sdSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const d = p.data;
    const [r] = await pool.query(
      `INSERT INTO student_fee_discounts (student_id, fee_structure_id, discount_rule_id, valid_from, valid_to, approved_by, approved_at)
       VALUES (?,?,?,?,?,?, NOW())`,
      [d.student_id, d.fee_structure_id || null, d.discount_rule_id, d.valid_from, d.valid_to || null, req.user.id]);
    await log({ actorId: req.user.id, action: 'fees.discount.assign', entityType: 'student_fee_discount', entityId: r.insertId, ip: req.ip });
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});

router.delete('/student-discounts/:id', requirePermission('fees.discount.manage'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM student_fee_discounts WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, action: 'fees.discount.remove', entityType: 'student_fee_discount', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Resolve effective discount for a (student, fee_structure) pair.
// Picks the highest-priority applicable student_fee_discounts row.
async function resolveDiscount(studentId, feeStructureId) {
  const [rows] = await pool.query(
    `SELECT sd.*, dr.discount_percent, dr.priority, dr.display_name
       FROM student_fee_discounts sd
       JOIN fee_discount_rules dr ON dr.id = sd.discount_rule_id
      WHERE sd.student_id = ?
        AND sd.valid_from <= CURDATE()
        AND (sd.valid_to IS NULL OR sd.valid_to >= CURDATE())
        AND dr.is_active = 1
        AND (sd.fee_structure_id IS NULL OR sd.fee_structure_id = ?)
      ORDER BY dr.priority DESC, sd.id DESC
      LIMIT 1`, [studentId, feeStructureId]);
  return rows[0] || null;
}

// ---------------------------------------------------------------------
// Bill generation — creates fee_collections rows for a class/section/session.
// Discount engine applies per-student discount rules (priority-resolved).
// ---------------------------------------------------------------------
const billGenSchema = z.object({
  fee_structure_id: z.number().int().positive(),
  class_id:         z.number().int().positive(),
  section_id:       z.number().int().positive(),
  session_id:       z.number().int().positive(),
  due_date:         z.string().optional(),       // override; defaults to fee_structure.due_day of current month
  amount_override:  z.number().min(0).max(1000000).optional(),
});

router.post('/generate-bills', requirePermission('fees.bulk_generate'), async (req, res, next) => {
  try {
    const p = billGenSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const [fsRows] = await pool.query(`SELECT * FROM fee_structures WHERE id=?`, [d.fee_structure_id]);
    if (!fsRows.length) return res.status(404).json({ error: 'fee_structure_not_found' });
    const fs = fsRows[0];

    // Default due date = current month's due_day in the structure's session.
    let dueDate = d.due_date;
    if (!dueDate) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(Math.min(fs.due_day, 28)).padStart(2, '0');
      dueDate = `${yyyy}-${mm}-${dd}`;
    }

    // Roster
    const [roster] = await pool.query(
      `SELECT s.id AS student_id, s.admission_no FROM students s
        WHERE s.class_id=? AND s.section_id=? AND s.status='active'`,
      [d.class_id, d.section_id]);

    const conn = await pool.getConnection();
    let generated = 0; let skipped_existing = 0; const errors = [];
    try {
      await conn.beginTransaction();
      for (const r of roster) {
        // Skip if an unpaid bill already exists for this student × structure.
        const [existing] = await conn.query(
          `SELECT id FROM fee_collections
            WHERE student_id=? AND fee_structure_id=? AND status IN ('unpaid','partial','overdue','paid','waived')
            LIMIT 1`, [r.student_id, d.fee_structure_id]);
        if (existing.length) { skipped_existing++; continue; }

        const discount = await resolveDiscount(r.student_id, d.fee_structure_id);
        const gross = d.amount_override ?? Number(fs.amount);
        const discountPct = discount ? Number(discount.discount_percent) : 0;
        const discountAmount = +(gross * discountPct / 100).toFixed(2);
        const net = +(gross - discountAmount).toFixed(2);
        const challan = `CL-${Date.now().toString(36).toUpperCase()}-${r.student_id}`;

        await conn.query(
          `INSERT INTO fee_collections
             (student_id, fee_structure_id, amount, discount_amount, net_amount, paid_amount, due_date, status, challan_no, collected_by, notes)
           VALUES (?,?,?,?,?, 0, ?, 'unpaid', ?, NULL, ?)`,
          [r.student_id, d.fee_structure_id, gross, discountAmount, net, dueDate, challan,
           discount ? `Discount: ${discount.display_name} (${discountPct}%)` : null]);
        generated++;
      }
      await conn.commit();
    } catch (e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
    await log({ actorId: req.user.id, action: 'fees.bills.generated', entityType: 'fee_collection', ip: req.ip,
                meta: { fee_structure_id: d.fee_structure_id, generated, skipped_existing, class_id: d.class_id, section_id: d.section_id } });
    res.json({ ok: true, generated, skipped_existing, roster_count: roster.length });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Collections — list + record payment
// ---------------------------------------------------------------------
router.get('/collections', requirePermission('fees.collect'), async (req, res, next) => {
  try {
    const { status, class_id, section_id, from, to, q } = req.query;
    const where = ['1=1']; const p = [];
    if (status)     { where.push('fc.status=?'); p.push(status); }
    if (class_id)   { where.push('s.class_id=?'); p.push(class_id); }
    if (section_id) { where.push('s.section_id=?'); p.push(section_id); }
    if (from)       { where.push('fc.due_date>=?'); p.push(from); }
    if (to)         { where.push('fc.due_date<=?'); p.push(to); }
    if (q)          { where.push('(s.admission_no LIKE ? OR u.full_name LIKE ?)'); const l = `%${q}%`; p.push(l, l); }
    const [rows] = await pool.query(
      `SELECT fc.id, fc.amount, fc.discount_amount, fc.net_amount, fc.paid_amount, fc.due_date,
              fc.status, fc.challan_no, fc.collected_at, fc.notes,
              s.admission_no, u.full_name AS student_name,
              c.name AS class_name, sec.name AS section_name, ay.name AS session_name,
              fs.name AS structure_name
         FROM fee_collections fc
         JOIN students s ON s.id = fc.student_id
         JOIN users u ON u.id = s.user_id
         JOIN classes c ON c.id = s.class_id
         JOIN sections sec ON sec.id = s.section_id
         JOIN academic_sessions ay ON ay.id = s.session_id
         JOIN fee_structures fs ON fs.id = fc.fee_structure_id
        WHERE ${where.join(' AND ')}
        ORDER BY fc.due_date DESC, fc.id DESC LIMIT 500`, p);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

const paymentSchema = z.object({
  amount: z.number().min(0.01).max(1000000),
  payment_method: z.enum(['cash','bank','cheque','other']).default('cash'),
  reference: z.string().max(190).optional(),
  notes: z.string().max(500).optional(),
});

router.post('/collections/:id/payment', requirePermission('fees.collect'), async (req, res, next) => {
  try {
    const p = paymentSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body' });
    const [bills] = await pool.query(
      `SELECT * FROM fee_collections WHERE id=? LIMIT 1`, [req.params.id]);
    if (!bills.length) return res.status(404).json({ error: 'not_found' });
    const bill = bills[0];
    const outstanding = Number(bill.net_amount) - Number(bill.paid_amount);
    if (p.data.amount > outstanding + 0.01) return res.status(400).json({ error: 'overpayment', outstanding });
    const newPaid = Number(bill.paid_amount) + p.data.amount;
    const newStatus = Math.abs(newPaid - Number(bill.net_amount)) < 0.01 ? 'paid'
                    : newPaid > 0 ? 'partial'
                    : 'unpaid';
    await pool.query(
      `UPDATE fee_collections
         SET paid_amount=?, status=?, collected_by=?, collected_at=NOW(), notes=CONCAT_WS(' | ', notes, ?)
       WHERE id=?`,
      [newPaid, newStatus, req.user.id, p.data.reference ? `[${p.data.payment_method} ${p.data.reference}]` : `[${p.data.payment_method}]`, req.params.id]);
    await log({ actorId: req.user.id, action: 'fees.payment.recorded', entityType: 'fee_collection', entityId: Number(req.params.id), ip: req.ip, meta: { amount: p.data.amount, total_paid: newPaid } });
    res.json({ ok: true, new_paid: newPaid, status: newStatus, outstanding: Number(bill.net_amount) - newPaid });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Challan preview (data for PDF rendering in the frontend)
// ---------------------------------------------------------------------
router.get('/challan/:id', requirePermission('fees.view'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT fc.*, s.admission_no, s.roll_no, s.date_of_birth, s.guardian_name, s.guardian_phone,
              u.full_name AS student_name,
              c.name AS class_name, sec.name AS section_name, ay.name AS session_name,
              fs.name AS structure_name, fs.amount AS structure_amount, fs.session_id AS structure_session_id
         FROM fee_collections fc
         JOIN students s ON s.id = fc.student_id
         JOIN users u ON u.id = s.user_id
         JOIN classes c ON c.id = s.class_id
         JOIN sections sec ON sec.id = s.section_id
         JOIN fee_structures fs ON fs.id = fc.fee_structure_id
         JOIN academic_sessions ay ON ay.id = fs.session_id
        WHERE fc.id=? LIMIT 1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json({ challan: rows[0] });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Defaulter list — students with overdue (or unpaid beyond due_date) bills
// ---------------------------------------------------------------------
router.get('/defaulters', requirePermission('fees.report'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.full_name AS student_name, s.admission_no,
              c.name AS class_name, sec.name AS section_name,
              COUNT(fc.id) AS overdue_count,
              IFNULL(SUM(fc.net_amount - fc.paid_amount), 0) AS overdue_amount,
              MIN(fc.due_date) AS oldest_due
         FROM fee_collections fc
         JOIN students s ON s.id = fc.student_id
         JOIN users u ON u.id = s.user_id
         JOIN classes c ON c.id = s.class_id
         JOIN sections sec ON sec.id = s.section_id
        WHERE fc.status IN ('unpaid','partial','overdue')
          AND fc.due_date < CURDATE()
        GROUP BY s.id
        ORDER BY overdue_amount DESC`);
    // Mark as overdue in DB (cheap batch update of past-due unpaid bills)
    await pool.query(
      `UPDATE fee_collections SET status='overdue' WHERE status IN ('unpaid','partial') AND due_date < CURDATE()`);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Reports — collected vs pending by class/term/session
// ---------------------------------------------------------------------
router.get('/reports/summary', requirePermission('fees.report'), async (req, res, next) => {
  try {
    const { session_id, term } = req.query;
    const params = [];
    let where = '1=1';
    if (session_id) { where += ' AND fs.session_id=?'; params.push(session_id); }
    if (term)       { where += ' AND DATE_FORMAT(fc.due_date,"%Y-%m")=?'; params.push(term); }
    const [rows] = await pool.query(
      `SELECT c.name AS class_name, c.level,
              COUNT(fc.id) AS bills_count,
              IFNULL(SUM(fc.amount), 0) AS gross_total,
              IFNULL(SUM(fc.net_amount), 0) AS net_total,
              IFNULL(SUM(fc.paid_amount), 0) AS collected_total,
              IFNULL(SUM(fc.net_amount - fc.paid_amount), 0) AS outstanding_total,
              SUM(CASE WHEN fc.status='paid' THEN 1 ELSE 0 END) AS paid_count,
              SUM(CASE WHEN fc.status='unpaid' THEN 1 ELSE 0 END) AS unpaid_count,
              SUM(CASE WHEN fc.status='overdue' THEN 1 ELSE 0 END) AS overdue_count
         FROM fee_collections fc
         JOIN students s ON s.id = fc.student_id
         JOIN classes c ON c.id = s.class_id
         JOIN fee_structures fs ON fs.id = fc.fee_structure_id
         LEFT JOIN academic_sessions ay ON ay.id = fs.session_id
        WHERE ${where}
        GROUP BY c.id
        ORDER BY c.level`, params);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

router.get('/reports/collection-trend', requirePermission('fees.report'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(collected_at,'%Y-%m') AS month,
              IFNULL(SUM(paid_amount), 0) AS amount,
              COUNT(*) AS payments
         FROM fee_collections
        WHERE collected_at IS NOT NULL
          AND collected_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY month ORDER BY month`);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------
// Expenditures
// ---------------------------------------------------------------------
const expSchema = z.object({
  category:      z.string().min(1).max(64),
  description:   z.string().min(1).max(255),
  amount:        z.number().min(0.01).max(10000000),
  spent_on:      z.string(),
  vendor:        z.string().max(190).optional(),
  payment_method: z.enum(['cash','bank','cheque','other']).default('cash'),
  reference:     z.string().max(190).optional(),
  notes:         z.string().max(5000).optional(),
});

router.get('/expenditures', requirePermission('expenditures.view'), async (req, res, next) => {
  try {
    const { category, from, to } = req.query;
    const where = ['1=1']; const p = [];
    if (category) { where.push('e.category=?'); p.push(category); }
    if (from)     { where.push('e.spent_on>=?'); p.push(from); }
    if (to)       { where.push('e.spent_on<=?'); p.push(to); }
    const [rows] = await pool.query(
      `SELECT e.*, u.full_name AS incurred_by_name FROM expenditures e
         LEFT JOIN users u ON u.id = e.incurred_by
        WHERE ${where.join(' AND ')}
        ORDER BY e.spent_on DESC, e.id DESC LIMIT 500`, p);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

router.post('/expenditures', requirePermission('expenditures.manage'), async (req, res, next) => {
  try {
    const p = expSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const [r] = await pool.query(
      `INSERT INTO expenditures (category, description, amount, spent_on, vendor, payment_method, reference, notes, incurred_by)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [d.category, d.description, d.amount, d.spent_on, d.vendor || null, d.payment_method,
       d.reference || null, d.notes || null, req.user.id]);
    await log({ actorId: req.user.id, action: 'expenditure.create', entityType: 'expenditure', entityId: r.insertId, ip: req.ip, meta: { category: d.category, amount: d.amount } });
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});

router.delete('/expenditures/:id', requirePermission('expenditures.manage'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM expenditures WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, action: 'expenditure.delete', entityType: 'expenditure', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
