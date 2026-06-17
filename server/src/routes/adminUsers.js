// Admin user management + RBAC role/permission management (Phase 3).
// All routes require an authenticated admin. Mutations are audit-logged.
const express = require('express');
const { z } = require('zod');
const crypto = require('crypto');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../auth/middleware');
const { requirePermission } = require('../rbac/middleware');
const { hash } = require('../auth/password');
const { log } = require('../audit/log');

const router = express.Router();
router.use(requireAuth(), requireRole('admin'));

// =====================================================================
// Users — list, get, create, update, delete
// =====================================================================
const SAFE_USER_SELECT = `
  SELECT u.id, u.role_id, u.email, u.cnic, u.full_name, u.phone, u.status,
         u.last_login_at, u.failed_attempts, u.locked_until, u.created_at, u.updated_at,
         r.key_name AS role_key, r.display_name AS role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id`;

router.get('/users', async (req, res, next) => {
  try {
    const { role, status, q } = req.query;
    const where = ['1=1']; const params = [];
    if (role)   { where.push('r.key_name = ?'); params.push(role); }
    if (status) { where.push('u.status = ?');  params.push(status); }
    if (q) {
      where.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.cnic LIKE ?)');
      const like = `%${q}%`; params.push(like, like, like);
    }
    const [rows] = await pool.query(`${SAFE_USER_SELECT} WHERE ${where.join(' AND ')} ORDER BY u.id DESC LIMIT 500`, params);
    res.json({ items: rows });
  } catch (err) { next(err); }
});

router.get('/users/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`${SAFE_USER_SELECT} WHERE u.id = ? LIMIT 1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    const user = rows[0];
    // Load profile extension if any
    if (user.role_key === 'student') {
      const [s] = await pool.query(`SELECT * FROM students WHERE user_id = ?`, [user.id]);
      user.student_profile = s[0] || null;
    } else if (user.role_key === 'teacher') {
      const [t] = await pool.query(`SELECT * FROM teachers WHERE user_id = ?`, [user.id]);
      user.teacher_profile = t[0] || null;
    } else if (user.role_key === 'parent') {
      const [p] = await pool.query(`SELECT * FROM parents WHERE user_id = ?`, [user.id]);
      user.parent_profile = p[0] || null;
    } else if (user.role_key === 'coordinator' || user.role_key === 'accountant' || user.role_key === 'operator') {
      const [s] = await pool.query(`SELECT * FROM staff WHERE user_id = ?`, [user.id]);
      user.staff_profile = s[0] || null;
    }
    res.json({ item: user });
  } catch (err) { next(err); }
});

const createUserSchema = z.object({
  email:           z.string().email(),
  full_name:       z.string().min(1).max(190),
  role_key:        z.enum(['admin','coordinator','teacher','student','parent','accountant','operator','alumni']),
  password:        z.string().min(8).max(128),
  phone:           z.string().max(32).optional(),
  cnic:            z.string().max(32).optional(),
  status:          z.enum(['active','inactive','pending']).default('active'),
  // Optional profile extension (snake_case keys to match DB)
  profile:         z.record(z.any()).optional(),
});

router.post('/users', requirePermission('users.create'), async (req, res, next) => {
  try {
    const p = createUserSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;

    const [roleRows] = await pool.query(`SELECT id FROM roles WHERE key_name=? LIMIT 1`, [d.role_key]);
    if (!roleRows.length) return res.status(400).json({ error: 'invalid_role' });
    const roleId = roleRows[0].id;

    const passwordHash = await hash(d.password);
    let userId;
    try {
      const [r] = await pool.query(
        `INSERT INTO users (role_id, email, password_hash, cnic, full_name, phone, status, email_verified_at)
         VALUES (?,?,?,?,?,?,?, NOW())`,
        [roleId, d.email, passwordHash, d.cnic || null, d.full_name, d.phone || null, d.status]);
      userId = r.insertId;
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'duplicate_email_or_cnic' });
      throw e;
    }
    await createProfileExtension(userId, d.role_key, d.profile || {});
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'users.create',
                entityType: 'user', entityId: userId, ip: req.ip, meta: { role: d.role_key } });
    res.status(201).json({ id: userId });
  } catch (err) { next(err); }
});

async function createProfileExtension(userId, roleKey, p) {
  if (roleKey === 'student') {
    if (!p.admission_no || !p.class_id || !p.section_id || !p.session_id) {
      throw Object.assign(new Error('student profile requires admission_no, class_id, section_id, session_id'), { status: 400 });
    }
    await pool.query(
      `INSERT INTO students (user_id, admission_no, class_id, section_id, session_id, roll_no,
                             date_of_birth, gender, address, guardian_name, guardian_phone, admission_date, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?, COALESCE(?, CURDATE()), 'active')`,
      [userId, p.admission_no, p.class_id, p.section_id, p.session_id, p.roll_no || null,
       p.date_of_birth || null, p.gender || null, p.address || null,
       p.guardian_name || null, p.guardian_phone || null, p.admission_date || null]);
  } else if (roleKey === 'teacher') {
    if (!p.employee_code) throw Object.assign(new Error('teacher profile requires employee_code'), { status: 400 });
    await pool.query(
      `INSERT INTO teachers (user_id, employee_code, designation, qualification, joining_date, status)
       VALUES (?,?,?,?,?, 'active')`,
      [userId, p.employee_code, p.designation || null, p.qualification || null,
       p.joining_date || null]);
  } else if (roleKey === 'parent') {
    await pool.query(
      `INSERT INTO parents (user_id, occupation, cnic, address) VALUES (?,?,?,?)`,
      [userId, p.occupation || null, p.cnic || null, p.address || null]);
  } else if (roleKey === 'coordinator' || roleKey === 'accountant' || roleKey === 'operator') {
    if (!p.employee_code) throw Object.assign(new Error('staff profile requires employee_code'), { status: 400 });
    await pool.query(
      `INSERT INTO staff (user_id, employee_code, department, designation, joining_date)
       VALUES (?,?,?,?,?)`,
      [userId, p.employee_code, p.department || null, p.designation || null,
       p.joining_date || null]);
  }
  // alumni: profile is optional; can be filled later via alumni API.
}

const updateUserSchema = z.object({
  email:           z.string().email().optional(),
  full_name:       z.string().min(1).max(190).optional(),
  phone:           z.string().max(32).optional(),
  cnic:            z.string().max(32).optional(),
  status:          z.enum(['active','inactive','suspended','pending']).optional(),
  role_key:        z.enum(['admin','coordinator','teacher','student','parent','accountant','operator','alumni']).optional(),
  password:        z.string().min(8).max(128).optional(),
});

router.put('/users/:id', requirePermission('users.edit'), async (req, res, next) => {
  try {
    const p = updateUserSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const d = p.data;
    const fields = []; const vals = [];
    if (d.email !== undefined)     { fields.push('email=?');     vals.push(d.email); }
    if (d.full_name !== undefined) { fields.push('full_name=?'); vals.push(d.full_name); }
    if (d.phone !== undefined)     { fields.push('phone=?');     vals.push(d.phone); }
    if (d.cnic !== undefined)      { fields.push('cnic=?');      vals.push(d.cnic); }
    if (d.status !== undefined)    { fields.push('status=?');    vals.push(d.status); }
    if (d.password !== undefined)  { fields.push('password_hash=?'); vals.push(await hash(d.password)); }
    if (d.role_key !== undefined) {
      const [roleRows] = await pool.query(`SELECT id FROM roles WHERE key_name=? LIMIT 1`, [d.role_key]);
      if (!roleRows.length) return res.status(400).json({ error: 'invalid_role' });
      fields.push('role_id=?'); vals.push(roleRows[0].id);
    }
    if (!fields.length) return res.status(400).json({ error: 'no_fields' });
    vals.push(req.params.id);
    try {
      await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id=?`, vals);
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'duplicate_email_or_cnic' });
      throw e;
    }
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'users.update',
                entityType: 'user', entityId: Number(req.params.id), ip: req.ip, meta: d });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/users/:id', requirePermission('users.delete'), async (req, res, next) => {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'cannot_delete_self' });
    }
    await pool.query('DELETE FROM users WHERE id=?', [req.params.id]);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'users.delete',
                entityType: 'user', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// =====================================================================
// RBAC — assign permissions to a role
// =====================================================================
router.put('/roles/:id/permissions', requirePermission('roles.manage'), async (req, res, next) => {
  try {
    const schema = z.object({
      permission_keys: z.array(z.string()).max(200),
    });
    const p = schema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid_body', detail: p.error.flatten() });
    const { permission_keys } = p.data;

    // Validate all keys exist
    if (permission_keys.length) {
      const [existing] = await pool.query(
        `SELECT key_name FROM permissions WHERE key_name IN (?)`,
        [permission_keys]);
      const existingKeys = new Set(existing.map(r => r.key_name));
      const missing = permission_keys.filter(k => !existingKeys.has(k));
      if (missing.length) return res.status(400).json({ error: 'unknown_permissions', missing });
    }

    // Replace mapping atomically
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM role_permissions WHERE role_id=?', [req.params.id]);
      if (permission_keys.length) {
        const [permRows] = await conn.query(
          `SELECT id, key_name FROM permissions WHERE key_name IN (?)`, [permission_keys]);
        const values = permRows.map(r => [req.params.id, r.id]);
        await conn.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [values]);
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'roles.permissions.replace',
                entityType: 'role', entityId: Number(req.params.id), ip: req.ip,
                meta: { count: permission_keys.length } });
    res.json({ ok: true, count: permission_keys.length });
  } catch (err) { next(err); }
});

// =====================================================================
// Lightweight profile extensions update (admin convenience)
// =====================================================================
router.put('/users/:id/profile', requirePermission('users.edit'), async (req, res, next) => {
  try {
    const [u] = await pool.query(`SELECT role_id, r.key_name AS role_key FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?`, [req.params.id]);
    if (!u.length) return res.status(404).json({ error: 'not_found' });
    const roleKey = u[0].role_key;
    const p = req.body || {};
    const fields = []; const vals = [];
    // Whitelist per role
    const allowed = {
      student: ['roll_no','date_of_birth','gender','address','guardian_name','guardian_phone','status'],
      teacher: ['designation','qualification','joining_date','status'],
      parent:  ['occupation','address'],
      staff:   ['department','designation','joining_date'],
    }[roleKey];
    if (!allowed) return res.status(400).json({ error: 'role_has_no_profile' });
    for (const k of allowed) if (p[k] !== undefined) { fields.push('??=?'); /* placeholder, fix below */ }
    if (!fields.length) return res.status(400).json({ error: 'no_fields' });
    // Build the update SQL safely (column names are from the whitelist)
    const setClause = [];
    for (const k of allowed) {
      if (p[k] !== undefined) { setClause.push('`' + k + '`=?'); vals.push(p[k]); }
    }
    const table = { student: 'students', teacher: 'teachers', parent: 'parents', staff: 'staff' }[roleKey];
    vals.push(req.params.id);
    await pool.query(`UPDATE ${table} SET ${setClause.join(', ')} WHERE user_id=?`, vals);
    await log({ actorId: req.user.id, actorEmail: req.user.email, action: 'users.profile.update',
                entityType: 'user', entityId: Number(req.params.id), ip: req.ip });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
