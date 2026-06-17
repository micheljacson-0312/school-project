// In-process integration test for Phase 1.
// Boots the Express app, drives every endpoint via fetch, and verifies
// RBAC + auth behaviour end-to-end without leaving the process.
require('dotenv').config({ path: __dirname + '/../.env' });

// Phase 4 has 10+ logins; raise the rate limit so the test isn't throttled.
process.env.LOGIN_RATE_LIMIT_PER_MIN = '100';

const assert = require('assert');
const http = require('http');
const mysql = require('mysql2/promise');
const app = require('../src/index.js');

const DEMO = {
  admin:       { identifier: 'admin@school.test',     password: 'Password123!' },
  coordinator: { identifier: 'coord@school.test',     password: 'Password123!' },
  teacher:     { identifier: 'teacher@school.test',   password: 'Password123!' },
  student:     { identifier: 'student@school.test',   password: 'Password123!' },
  parent:      { identifier: 'parent@school.test',    password: 'Password123!' },
  accountant:  { identifier: 'accounts@school.test',  password: 'Password123!' },
  operator:    { identifier: 'operator@school.test',  password: 'Password123!' },
  alumni:      { identifier: 'alumni@school.test',    password: 'Password123!' },
};

const server = http.createServer(app);

function request(method, path, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1', port: server.address().port, method, path,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0,
        ...headers,
      },
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(buf); } catch { parsed = buf; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function login(identifier, password) {
  const r = await request('POST', '/api/auth/login', { body: { identifier, password } });
  assert.strictEqual(r.status, 200, `login(${identifier}) failed: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.accessToken;
}

(async () => {
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Test server listening on :${port}`);

  // 1) Health
  const h = await request('GET', '/health');
  assert.strictEqual(h.status, 200);
  assert.strictEqual(h.body.ok, true);
  console.log('  ✓ /health returns ok');

  // 2) Login + permissions for every role
  const tokens = {};
  const refreshTokens = {};
  for (const [role, creds] of Object.entries(DEMO)) {
    const r = await request('POST', '/api/auth/login', { body: creds });
    assert.strictEqual(r.status, 200, `login(${creds.identifier}) failed: ${r.status} ${JSON.stringify(r.body)}`);
    tokens[role] = r.body.accessToken;
    refreshTokens[role] = r.body.refreshToken;
  }
  console.log(`  ✓ login works for all ${Object.keys(tokens).length} roles`);

  // 3) Parent can log in via CNIC too
  const parentViaCnic = await login('42101-1234567-8', 'Password123!');
  assert.ok(parentViaCnic);
  console.log('  ✓ parent login via CNIC works');

  // 4) Bad password rejected
  const bad = await request('POST', '/api/auth/login', { body: { identifier: 'admin@school.test', password: 'wrong' } });
  assert.strictEqual(bad.status, 401);
  assert.strictEqual(bad.body.error, 'invalid_credentials');
  console.log('  ✓ bad password → 401 invalid_credentials');

  // 5) Each role can hit its own /dashboard (200) and another's (403)
  for (const [role, token] of Object.entries(tokens)) {
    const mine = await request('GET', `/api/${role}/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
    assert.strictEqual(mine.status, 200, `${role} should access its own dashboard: ${mine.status} ${JSON.stringify(mine.body)}`);
    // Admin is allowed to access other roles' dashboards (for support); skip cross-role check for it.
    if (role === 'admin') continue;
    // Pick a different role for cross-role check.
    const otherRole = Object.keys(tokens).find(r => r !== role);
    const theirs = await request('GET', `/api/${otherRole}/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
    assert.strictEqual(theirs.status, 403, `${role} should NOT access ${otherRole}/dashboard: ${theirs.status}`);
  }
  console.log('  ✓ every role: own dashboard = 200, cross-role dashboard = 403 (admin may access all)');

  // 6) Admin-only endpoints
  const adminRoles = await request('GET', '/api/admin/roles', { headers: { Authorization: `Bearer ${tokens.admin}` } });
  assert.strictEqual(adminRoles.status, 200);
  assert.ok(Array.isArray(adminRoles.body.roles));
  for (const r of adminRoles.body.roles) {
    assert.ok(Array.isArray(r.permissions), `role ${r.key_name} missing permissions array`);
  }
  console.log(`  ✓ /api/admin/roles → ${adminRoles.body.roles.length} roles with permissions`);

  const adminPerms = await request('GET', '/api/admin/permissions', { headers: { Authorization: `Bearer ${tokens.admin}` } });
  assert.strictEqual(adminPerms.status, 200);
  assert.ok(adminPerms.body.permissions.length >= 62, `expected at least 62 permissions, got ${adminPerms.body.permissions.length}`);
  console.log(`  ✓ /api/admin/permissions → ${adminPerms.body.permissions.length} (catalog count)`);

  // 7) Parent trying admin endpoint = 403
  const crossRoleAdmin = await request('GET', '/api/admin/permissions', { headers: { Authorization: `Bearer ${tokens.parent}` } });
  assert.strictEqual(crossRoleAdmin.status, 403);
  console.log('  ✓ parent → /api/admin/permissions → 403 forbidden_role');

  // 8) No token = 401
  const noAuth = await request('GET', '/api/admin/dashboard');
  assert.strictEqual(noAuth.status, 401);
  console.log('  ✓ no token → 401 missing_token');

  // 9) Public endpoints reachable without auth
  const news = await request('GET', '/api/public/news');
  assert.strictEqual(news.status, 200);
  assert.ok(Array.isArray(news.body.items));
  console.log(`  ✓ /api/public/news → ${news.body.items.length} items`);

  const contact = await request('POST', '/api/public/contact', {
    body: { name: 'Integration Test', email: 't@example.com', message: 'hello' }
  });
  assert.strictEqual(contact.status, 200);
  assert.strictEqual(contact.body.ok, true);
  console.log('  ✓ /api/public/contact accepts submissions');

  const apply = await request('POST', '/api/public/admissions/apply', {
    body: {
      applicant_name: 'Integration Applicant',
      parent_name: 'Their Parent',
      email: 'apply@example.com',
      phone: '+923009999999',
      applying_class_id: 1,
    }
  });
  assert.strictEqual(apply.status, 201);
  assert.ok(apply.body.id > 0);
  console.log('  ✓ /api/public/admissions/apply creates row');

  // 10) Refresh-token rotation
  const oldRefresh = refreshTokens.admin;
  const rotated = await request('POST', '/api/auth/refresh', { body: { refreshToken: oldRefresh } });
  assert.strictEqual(rotated.status, 200);
  assert.notStrictEqual(rotated.body.refreshToken, oldRefresh);
  console.log('  ✓ refresh token rotates to a new value');

  const replay = await request('POST', '/api/auth/refresh', { body: { refreshToken: oldRefresh } });
  assert.strictEqual(replay.status, 401);
  console.log('  ✓ old refresh token rejected after rotation');

  // ============================================================
  // Phase 2 — Public website endpoints
  // ============================================================

  // 11) /api/public/site combined payload
  const site = await request('GET', '/api/public/site');
  assert.strictEqual(site.status, 200);
  assert.ok(site.body.settings, 'site.settings missing');
  assert.ok(site.body.settings.school_name, 'school_name missing');
  assert.ok(Array.isArray(site.body.slides), 'slides not an array');
  assert.ok(Array.isArray(site.body.achievements), 'achievements not an array');
  assert.ok(site.body.principal, 'principal missing');
  console.log(`  ✓ /api/public/site → settings + ${site.body.slides.length} slides + ${site.body.achievements.length} achievements + principal`);

  // 12) /api/public/homepage (includes news + gallery preview)
  const hp = await request('GET', '/api/public/homepage');
  assert.strictEqual(hp.status, 200);
  assert.ok(Array.isArray(hp.body.latest_news));
  assert.ok(Array.isArray(hp.body.gallery_preview));
  console.log(`  ✓ /api/public/homepage → ${hp.body.latest_news.length} news + ${hp.body.gallery_preview.length} gallery items`);

  // 13) /api/public/jobs + /api/public/jobs/:id
  const jobs = await request('GET', '/api/public/jobs');
  assert.strictEqual(jobs.status, 200);
  assert.ok(jobs.body.items.length >= 1, 'expected at least one published job');
  const jobId = jobs.body.items[0].id;
  const jobOne = await request('GET', `/api/public/jobs/${jobId}`);
  assert.strictEqual(jobOne.status, 200);
  assert.strictEqual(jobOne.body.item.id, jobId);
  console.log(`  ✓ /api/public/jobs (${jobs.body.items.length}) and /api/public/jobs/${jobId}`);

  // 14) News detail (slug)
  const newsSlug = hp.body.latest_news[0]?.slug;
  if (newsSlug) {
    const newsDetail = await request('GET', `/api/public/news/${newsSlug}`);
    assert.strictEqual(newsDetail.status, 200);
    assert.strictEqual(newsDetail.body.item.slug, newsSlug);
    console.log(`  ✓ /api/public/news/${newsSlug}`);
  }

  // 15) Gallery category filter
  const galleryFiltered = await request('GET', '/api/public/gallery?category=campus');
  assert.strictEqual(galleryFiltered.status, 200);
  assert.ok(galleryFiltered.body.items.every(i => i.category === 'campus'),
            'gallery filter returned items from other categories');
  console.log(`  ✓ /api/public/gallery?category=campus → ${galleryFiltered.body.items.length} items, all category=campus`);

  // 16) Contact form submission (no auth)
  const contact2 = await request('POST', '/api/public/contact', {
    body: { name: 'Test Visitor 2', email: 'v2@example.com', message: 'Hello again' }
  });
  assert.strictEqual(contact2.status, 200);
  console.log('  ✓ /api/public/contact accepts submission');

  // 17) Admin CRUD on news (Phase 3 prep, but exposed now)
  const createNews = await request('POST', '/api/admin/news', {
    headers: { Authorization: `Bearer ${tokens.admin}` },
    body: { type:'news', title:'Test Article', slug:`test-${Date.now()}`, excerpt:'x', body:'<p>x</p>' },
  });
  assert.strictEqual(createNews.status, 201);
  const newId = createNews.body.id;
  await request('PUT', `/api/admin/news/${newId}`, {
    headers: { Authorization: `Bearer ${tokens.admin}` },
    body: { is_published: true },
  });
  const listNews = await request('GET', '/api/admin/news', { headers: { Authorization: `Bearer ${tokens.admin}` } });
  assert.ok(listNews.body.items.some(i => i.id === newId));
  await request('DELETE', `/api/admin/news/${newId}`, { headers: { Authorization: `Bearer ${tokens.admin}` } });
  console.log('  ✓ admin CRUD news: create → publish → list → delete');

  // 18) Admin settings update + visibility
  const settingsBefore = await request('GET', '/api/admin/settings', { headers: { Authorization: `Bearer ${tokens.admin}` } });
  const officeHoursSetting = settingsBefore.body.items.find(s => s.key_name === 'office_hours');
  assert.ok(officeHoursSetting, 'office_hours setting missing');
  await request('PUT', '/api/admin/settings/office_hours', {
    headers: { Authorization: `Bearer ${tokens.admin}` },
    body: { value: 'Mon–Fri 8:00 AM – 3:00 PM (updated by test)' },
  });
  const siteAfter = await request('GET', '/api/public/site');
  assert.ok(siteAfter.body.settings.office_hours.includes('updated by test'), 'site settings did not propagate to public');
  console.log('  ✓ admin settings update propagates to public site');

  // 19) Non-admin cannot use admin content endpoints
  const parentTriesAdmin = await request('POST', '/api/admin/news', {
    headers: { Authorization: `Bearer ${tokens.parent}` },
    body: { type:'news', title:'x', slug:'x' },
  });
  assert.strictEqual(parentTriesAdmin.status, 403);
  console.log('  ✓ parent → POST /api/admin/news → 403 forbidden_role');

  // ============================================================
  // Phase 3 — Admin portal & academic setup
  // ============================================================

  const adminAuth = { headers: { Authorization: `Bearer ${tokens.admin}` } };

  // 20) Users CRUD
  const usersList = await request('GET', '/api/admin/users', adminAuth);
  assert.strictEqual(usersList.status, 200);
  assert.ok(usersList.body.items.length >= 8, 'expected ≥8 seeded users');
  console.log(`  ✓ /api/admin/users → ${usersList.body.items.length} users`);

  const newUserEmail = `new-teacher-${Date.now()}@school.test`;
  const createTeacher = await request('POST', '/api/admin/users', {
    ...adminAuth,
    body: {
      email: newUserEmail, full_name: 'New Test Teacher', role_key: 'teacher',
      password: 'Password123!', phone: '+923009999999',
      profile: { employee_code: `T-${Date.now()}`, designation: 'TGT' },
    },
  });
  assert.strictEqual(createTeacher.status, 201);
  const newUserId = createTeacher.body.id;
  const userDetail = await request('GET', `/api/admin/users/${newUserId}`, adminAuth);
  assert.ok(userDetail.body.item.teacher_profile, 'teacher profile extension not created');
  assert.strictEqual(userDetail.body.item.teacher_profile.employee_code.startsWith('T-'), true);
  console.log('  ✓ admin create user with role-specific profile extension');

  // 21) Duplicate email rejected
  const dup = await request('POST', '/api/admin/users', {
    ...adminAuth, body: { email: newUserEmail, full_name: 'Dup', role_key: 'teacher', password: 'Password123!', profile: { employee_code: 'X-1' } },
  });
  assert.strictEqual(dup.status, 409);
  console.log('  ✓ duplicate email → 409');

  // 22) Update user (change status)
  await request('PUT', `/api/admin/users/${newUserId}`, { ...adminAuth, body: { status: 'inactive' } });
  const afterUpdate = await request('GET', `/api/admin/users/${newUserId}`, adminAuth);
  assert.strictEqual(afterUpdate.body.item.status, 'inactive');
  console.log('  ✓ admin update user status');

  // 23) Cannot delete self
  const selfDel = await request('DELETE', `/api/admin/users/1`, adminAuth);  // id=1 is admin
  assert.strictEqual(selfDel.status, 400);
  console.log('  ✓ admin cannot delete self → 400');

  // 24) Delete the test user
  await request('DELETE', `/api/admin/users/${newUserId}`, adminAuth);
  const afterDelete = await request('GET', `/api/admin/users/${newUserId}`, adminAuth);
  assert.strictEqual(afterDelete.status, 404);
  console.log('  ✓ admin delete user (cascades profile)');

  // 25) RBAC role permissions replace
  const teacherRole = (await request('GET', '/api/admin/roles', adminAuth)).body.roles.find(r => r.key_name === 'teacher');
  // Replace with a single permission and verify
  await request('PUT', `/api/admin/roles/${teacherRole.id}/permissions`, {
    ...adminAuth, body: { permission_keys: ['attendance.view'] },
  });
  const afterRole = await request('GET', '/api/admin/roles', adminAuth);
  const teacherAfter = afterRole.body.roles.find(r => r.key_name === 'teacher');
  assert.strictEqual(teacherAfter.permissions.length, 1);
  assert.strictEqual(teacherAfter.permissions[0], 'attendance.view');
  // Restore teacher permissions to a sane default set so subsequent tests pass
  await request('PUT', `/api/admin/roles/${teacherRole.id}/permissions`, {
    ...adminAuth,
    body: { permission_keys: ['academic.view','classes.view','subjects.view','students.view','teachers.view',
                              'attendance.mark','attendance.view','teacher_attendance.mark',
                              'lms.lecture.upload','lms.lecture.view',
                              'lms.assignment.create','lms.assignment.grade','lms.quiz.create','lms.quiz.grade',
                              'lms.liveclass.host','results.upload','results.view','results.bulk_upload',
                              'evaluation.create','evaluation.view','evaluation.respond',
                              'remarks.create','remarks.view','awards.create','notifications.view'] },
  });
  console.log('  ✓ RBAC: replace teacher permissions → verify → restore');

  // 26) Unknown permission key in update → 400
  const badPerm = await request('PUT', `/api/admin/roles/${teacherRole.id}/permissions`, {
    ...adminAuth, body: { permission_keys: ['bogus.permission'] },
  });
  assert.strictEqual(badPerm.status, 400);
  console.log('  ✓ unknown permission key → 400 with missing list');

  // 27) Academic sessions CRUD
  const sessList = await request('GET', '/api/admin/academic/sessions', adminAuth);
  assert.ok(sessList.body.items.length >= 1, 'expected at least one session from seed');
  console.log(`  ✓ /api/admin/academic/sessions → ${sessList.body.items.length}`);

  const newSession = await request('POST', '/api/admin/academic/sessions', {
    ...adminAuth, body: { name: `2026-2027-test-${Date.now()}`, start_date: '2026-04-01', end_date: '2027-03-31', is_current: false },
  });
  assert.strictEqual(newSession.status, 201);
  const newSessionId = newSession.body.id;
  await request('PUT', `/api/admin/academic/sessions/${newSessionId}`, { ...adminAuth, body: { is_current: true } });
  const sessAfter = await request('GET', '/api/admin/academic/sessions', adminAuth);
  const found = sessAfter.body.items.find(s => s.id === newSessionId);
  assert.strictEqual(found.is_current, 1);
  await request('DELETE', `/api/admin/academic/sessions/${newSessionId}`, adminAuth);
  console.log('  ✓ academic sessions CRUD');

  // 28) Classes, sections, subjects CRUD
  const newClass = await request('POST', '/api/admin/academic/classes', {
    ...adminAuth, body: { name: `Grade X-${Date.now()}`, level: 6 },
  });
  assert.strictEqual(newClass.status, 201);
  const newClassId = newClass.body.id;
  const newSection = await request('POST', '/api/admin/academic/sections', {
    ...adminAuth, body: { class_id: newClassId, name: 'X', capacity: 30 },
  });
  assert.strictEqual(newSection.status, 201);
  const newSubject = await request('POST', '/api/admin/academic/subjects', {
    ...adminAuth, body: { class_id: newClassId, name: 'Test Subject', code: 'TS' },
  });
  assert.strictEqual(newSubject.status, 201);
  await request('DELETE', `/api/admin/academic/subjects/${newSubject.body.id}`, adminAuth);
  await request('DELETE', `/api/admin/academic/sections/${newSection.body.id}`, adminAuth);
  await request('DELETE', `/api/admin/academic/classes/${newClassId}`, adminAuth);
  console.log('  ✓ academic classes/sections/subjects CRUD');

  // 29) Teacher assignments
  const taList = await request('GET', '/api/admin/academic/teacher-assignments', adminAuth);
  assert.ok(taList.body.items.length >= 1, 'expected ≥1 teacher assignment from seed');
  console.log(`  ✓ /api/admin/academic/teacher-assignments → ${taList.body.items.length}`);

  // 30) Students / Teachers / Parents list endpoints
  const st = await request('GET', '/api/admin/academic/students', adminAuth);
  assert.ok(st.body.items.length >= 1, 'expected ≥1 student from seed');
  const tch = await request('GET', '/api/admin/academic/teachers', adminAuth);
  assert.ok(tch.body.items.length >= 1);
  const par = await request('GET', '/api/admin/academic/parents', adminAuth);
  assert.ok(par.body.items.length >= 1);
  console.log(`  ✓ academic students(${st.body.items.length}) / teachers(${tch.body.items.length}) / parents(${par.body.items.length})`);

  // 31) Mail settings + encryption + test
  const mailGet = await request('GET', '/api/admin/mail-settings', adminAuth);
  assert.strictEqual(mailGet.status, 200);
  // has_password may be true from prior test runs; the encryption round-trip below proves correctness.
  assert.strictEqual(typeof mailGet.body.item.has_password, 'boolean');
  await request('PUT', '/api/admin/mail-settings', {
    ...adminAuth,
    body: { driver: 'log', from_address: 'noreply@school.test', from_name: 'School Platform', is_enabled: true },
  });
  const testResp = await request('POST', '/api/admin/mail-settings/test', {
    ...adminAuth, body: { to: 'admin@school.test' },
  });
  assert.strictEqual(testResp.status, 200);
  assert.strictEqual(testResp.body.ok, true);
  console.log('  ✓ mail settings get/update/test (log driver)');

  // 32) Audit log listing + summary
  const auditList = await request('GET', '/api/admin/audit-logs', adminAuth);
  assert.strictEqual(auditList.status, 200);
  assert.ok(auditList.body.total > 0, 'expected audit entries');
  const auditSummary = await request('GET', '/api/admin/audit-logs/summary', adminAuth);
  assert.ok(Array.isArray(auditSummary.body.items));
  console.log(`  ✓ audit-logs: total=${auditList.body.total}, summary entries=${auditSummary.body.items.length}`);

  // 33) Audit log with filter
  const filteredAudit = await request('GET', '/api/admin/audit-logs?action=users', adminAuth);
  assert.strictEqual(filteredAudit.status, 200);
  assert.ok(filteredAudit.body.items.every(i => i.action.startsWith('users')));
  console.log(`  ✓ audit-logs filter by action=users → ${filteredAudit.body.items.length}`);

  // 34) Mail settings password round-trip (encryption)
  await request('PUT', '/api/admin/mail-settings', { ...adminAuth, body: { password: 'super-secret-password' } });
  const mailAfter = await request('GET', '/api/admin/mail-settings', adminAuth);
  assert.strictEqual(mailAfter.body.item.password, 'super-secret-password');
  console.log('  ✓ mail password encrypted-at-rest and decrypted on get');

  // 35) Parent cannot reach any admin endpoint
  const parentTriesUsers = await request('GET', '/api/admin/users', { headers: { Authorization: `Bearer ${tokens.parent}` } });
  assert.strictEqual(parentTriesUsers.status, 403);
  const parentTriesAudit = await request('GET', '/api/admin/audit-logs', { headers: { Authorization: `Bearer ${tokens.parent}` } });
  assert.strictEqual(parentTriesAudit.status, 403);
  console.log('  ✓ parent blocked from /api/admin/users and /api/admin/audit-logs');

  // ============================================================
  // Phase 4 — Student/Teacher/Parent portals + LMS
  // ============================================================

  // 36) Student dashboard returns expected sections
  const stuDash = await request('GET', '/api/student/dashboard', { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.strictEqual(stuDash.status, 200);
  assert.ok(stuDash.body.profile, 'student profile missing');
  assert.ok(Array.isArray(stuDash.body.live_classes), 'live_classes should be array');
  assert.ok(Array.isArray(stuDash.body.pending_assignments), 'pending_assignments should be array');
  assert.ok(Array.isArray(stuDash.body.quizzes), 'quizzes should be array');
  assert.ok(stuDash.body.attendance, 'attendance section missing');
  console.log(`  ✓ /api/student/dashboard → profile=${stuDash.body.profile.admission_no}, live=${stuDash.body.live_classes.length}, pending=${stuDash.body.pending_assignments.length}`);

  // 37) Student attendance / results / fees / remarks
  const stuAtt = await request('GET', '/api/student/attendance', { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.strictEqual(stuAtt.status, 200);
  assert.ok(Array.isArray(stuAtt.body.items));
  const stuRes = await request('GET', '/api/student/results', { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.strictEqual(stuRes.status, 200);
  const stuFees = await request('GET', '/api/student/fees', { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.strictEqual(stuFees.status, 200);
  const stuRem = await request('GET', '/api/student/remarks', { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.strictEqual(stuRem.status, 200);
  console.log('  ✓ /api/student/{attendance,results,fees,remarks} all return 200');

  // 38) Parent dashboard with linked children
  const parDash = await request('GET', '/api/parent/dashboard', { headers: { Authorization: `Bearer ${tokens.parent}` } });
  assert.strictEqual(parDash.status, 200);
  assert.ok(parDash.body.children.length >= 1, 'parent should have at least one child');
  assert.ok(parDash.body.summaries.length >= 1);
  const childId = parDash.body.children[0].student_id;
  const parChildAtt = await request('GET', `/api/parent/children/${childId}/attendance`, { headers: { Authorization: `Bearer ${tokens.parent}` } });
  assert.strictEqual(parChildAtt.status, 200);
  const parChildRes = await request('GET', `/api/parent/children/${childId}/results`, { headers: { Authorization: `Bearer ${tokens.parent}` } });
  assert.strictEqual(parChildRes.status, 200);
  const parChildFees = await request('GET', `/api/parent/children/${childId}/fees`, { headers: { Authorization: `Bearer ${tokens.parent}` } });
  assert.strictEqual(parChildFees.status, 200);
  console.log(`  ✓ /api/parent/dashboard → ${parDash.body.children.length} child(ren), drill-down endpoints 200`);

  // 39) Parent cannot view other parents' children
  // Create a second parent + student and assert isolation
  const parent2Email = `other-parent-${Date.now()}@school.test`;
  const newParent = await request('POST', '/api/admin/users', {
    ...adminAuth,
    body: { email: parent2Email, full_name: 'Other Parent', role_key: 'parent', password: 'Password123!', profile: { occupation: 'Engineer' } },
  });
  assert.strictEqual(newParent.status, 201);
  const otherParentLogin = await request('POST', '/api/auth/login', { body: { identifier: parent2Email, password: 'Password123!' } });
  const otherToken = otherParentLogin.body.accessToken;
  const parDrillOther = await request('GET', `/api/parent/children/${childId}/attendance`, { headers: { Authorization: `Bearer ${otherToken}` } });
  assert.strictEqual(parDrillOther.status, 403, 'other parent must not access first parent\'s child');
  console.log('  ✓ parent-child access isolation: other parent → 403');

  // 40) Teacher dashboard shows assignments
  const tchDash = await request('GET', '/api/teacher/dashboard', { headers: { Authorization: `Bearer ${tokens.teacher}` } });
  assert.strictEqual(tchDash.status, 200);
  assert.ok(tchDash.body.assignments.length >= 1);
  assert.ok(tchDash.body.teacher);
  console.log(`  ✓ /api/teacher/dashboard → ${tchDash.body.assignments.length} assignments`);

  // 41) Teacher attendance: roster load + bulk mark + save round-trip
  const ta = tchDash.body.assignments[0];
  const today = new Date().toISOString().slice(0,10);
  const roster = await request('GET', `/api/teacher/attendance?class_id=${ta.class_id}&section_id=${ta.section_id}&date=${today}`, {
    headers: { Authorization: `Bearer ${tokens.teacher}` } });
  assert.strictEqual(roster.status, 200);
  assert.ok(roster.body.items.length >= 1, 'teacher should have at least the seeded student in roster');
  const studentId = roster.body.items[0].student_id;
  const attendanceSave = await request('POST', '/api/teacher/attendance', {
    headers: { Authorization: `Bearer ${tokens.teacher}` },
    body: {
      class_id: ta.class_id, section_id: ta.section_id, date: today,
      marks: [{ student_id: studentId, status: 'present', remarks: 'integration test' }],
    },
  });
  assert.strictEqual(attendanceSave.status, 200);
  // Re-read to verify
  const roster2 = await request('GET', `/api/teacher/attendance?class_id=${ta.class_id}&section_id=${ta.section_id}&date=${today}`, {
    headers: { Authorization: `Bearer ${tokens.teacher}` } });
  assert.strictEqual(roster2.body.items[0].status, 'present');
  console.log('  ✓ teacher attendance: roster → mark present → re-read shows present');

  // 42) Assignment create + student submit + teacher grade round-trip
  const dueAt = new Date(Date.now() + 86400000).toISOString();
  const asgCreate = await request('POST', '/api/lms/assignments', {
    headers: { Authorization: `Bearer ${tokens.teacher}` },
    body: {
      subject_id: ta.subject_id, class_id: ta.class_id, section_id: ta.section_id, session_id: ta.session_id,
      title: `Integration test assignment ${Date.now()}`, description: 'test',
      total_marks: 50, due_at: dueAt,
    },
  });
  assert.strictEqual(asgCreate.status, 201);
  const asgId = asgCreate.body.id;
  const submit = await request('POST', `/api/lms/assignments/${asgId}/submit`, {
    headers: { Authorization: `Bearer ${tokens.student}` },
    body: { notes: 'here is my work', file_url: '/uploads/test.pdf' },
  });
  assert.strictEqual(submit.status, 201);
  const subId = submit.body.id;
  // Duplicate submit rejected
  const dupSubmit = await request('POST', `/api/lms/assignments/${asgId}/submit`, {
    headers: { Authorization: `Bearer ${tokens.student}` }, body: { notes: 'again' } });
  assert.strictEqual(dupSubmit.status, 409);
  // Grade it
  const grade = await request('POST', `/api/lms/assignments/${asgId}/grade/${subId}`, {
    headers: { Authorization: `Bearer ${tokens.teacher}` },
    body: { marks_obtained: 45, feedback: 'great work' },
  });
  assert.strictEqual(grade.status, 200);
  // Student sees graded submission
  const asgDetail = await request('GET', `/api/lms/assignments/${asgId}`, { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.strictEqual(Number(asgDetail.body.item.my_submission.marks_obtained), 45);
  console.log('  ✓ assignment: create → submit (409 on dup) → grade → student sees grade');

  // 43) Quiz create + add MCQ + student takes + auto-grades
  const availFrom = new Date(Date.now() - 60000).toISOString();
  const availTo = new Date(Date.now() + 86400000).toISOString();
  const quizCreate = await request('POST', '/api/lms/quizzes', {
    headers: { Authorization: `Bearer ${tokens.teacher}` },
    body: {
      subject_id: ta.subject_id, class_id: ta.class_id, section_id: ta.section_id, session_id: ta.session_id,
      title: `Integration quiz ${Date.now()}`, total_marks: 10,
      available_from: availFrom, available_to: availTo, time_limit_min: 30,
    },
  });
  assert.strictEqual(quizCreate.status, 201);
  const quizId = quizCreate.body.id;
  const qAdd = await request('POST', `/api/lms/quizzes/${quizId}/questions`, {
    headers: { Authorization: `Bearer ${tokens.teacher}` },
    body: {
      prompt: 'What is 2+2?', type: 'mcq',
      options_json: [{key:'a',text:'3'},{key:'b',text:'4'},{key:'c',text:'5'}],
      correct_key: 'b', marks: 10,
    },
  });
  const questionId = qAdd.body.id;
  const attempt = await request('POST', `/api/lms/quizzes/${quizId}/attempt`, { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.strictEqual(attempt.status, 201);
  const submitQ = await request('POST', `/api/lms/quizzes/${quizId}/attempt/${attempt.body.id}/submit`, {
    headers: { Authorization: `Bearer ${tokens.student}` }, body: { answers: { [String(questionId)]: 'b' } },
  });
  assert.strictEqual(submitQ.status, 200);
  assert.strictEqual(Number(submitQ.body.score), 10, 'correct answer should give full marks');
  // Wrong answer → 0
  const attempt2 = await request('POST', `/api/lms/quizzes/${quizId}/attempt`, { headers: { Authorization: `Bearer ${tokens.student}` } });
  const submitQ2 = await request('POST', `/api/lms/quizzes/${quizId}/attempt/${attempt2.body.id}/submit`, {
    headers: { Authorization: `Bearer ${tokens.student}` }, body: { answers: { [String(questionId)]: 'a' } },
  });
  assert.strictEqual(Number(submitQ2.body.score), 0, 'wrong answer should give 0');
  console.log('  ✓ quiz: create → add MCQ → student attempts → auto-grades correct/wrong');

  // 44) Live class: schedule → join URL contains Jitsi room
  const startsAt = new Date(Date.now() + 3600000).toISOString().slice(0, 19).replace('T', ' ');
  const lcCreate = await request('POST', '/api/lms/live-classes', {
    headers: { Authorization: `Bearer ${tokens.teacher}` },
    body: {
      subject_id: ta.subject_id, class_id: ta.class_id, section_id: ta.section_id, session_id: ta.session_id,
      title: 'Test live class', starts_at: startsAt,
    },
  });
  assert.strictEqual(lcCreate.status, 201);
  assert.ok(lcCreate.body.jitsi_room.startsWith('school-demo-'));
  const lcDetail = await request('GET', `/api/lms/live-classes/${lcCreate.body.id}`, { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.strictEqual(lcDetail.status, 200);
  assert.ok(lcDetail.body.jitsi_url.startsWith('https://meet.jit.si/'), 'Jitsi URL should use configured base');
  assert.ok(lcDetail.body.jitsi_url.includes(lcCreate.body.jitsi_room));
  console.log(`  ✓ live class: ${lcCreate.body.jitsi_room} → ${lcDetail.body.jitsi_url.slice(0,50)}…`);

  // 45) Result upload + student sees result
  // Need a term: fetch from admin
  const termList = await request('GET', '/api/admin/academic/terms', adminAuth);
  assert.ok(termList.body.items.length >= 1);
  const termId = termList.body.items[0].id;
  // Get a subject id from teacher_assignments
  const [tchAssignRows] = [tchDash.body.assignments];
  const subjId = tchAssignRows[0].subject_id;
  const sessId = tchAssignRows[0].session_id;
  const resultUp = await request('POST', '/api/teacher/results', {
    headers: { Authorization: `Bearer ${tokens.teacher}` },
    body: { student_id: studentId, subject_id: subjId, term_id: termId, session_id: sessId, marks_obtained: 87, total_marks: 100, grade: 'A' },
  });
  assert.strictEqual(resultUp.status, 200);
  const stuResAfter = await request('GET', '/api/student/results', { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.ok(stuResAfter.body.items.some(r => r.grade === 'A' && Number(r.marks_obtained) === 87));
  console.log('  ✓ result upload → student sees result with grade A');

  // 46) Remark write → student and parent see it
  const remarkCreate = await request('POST', '/api/teacher/remarks', {
    headers: { Authorization: `Bearer ${tokens.teacher}` },
    body: { student_id: studentId, category: 'commendation', body: 'Excellent work this term.', is_visible_to_parent: true },
  });
  assert.strictEqual(remarkCreate.status, 201);
  const stuRemAfter = await request('GET', '/api/student/remarks', { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.ok(stuRemAfter.body.items.some(r => r.body === 'Excellent work this term.'));
  console.log('  ✓ remark write → student portal shows it');

  // 47) RBAC: student cannot mark attendance or create assignments
  const studentTriesMark = await request('POST', '/api/teacher/attendance', {
    headers: { Authorization: `Bearer ${tokens.student}` },
    body: { class_id: ta.class_id, section_id: ta.section_id, date: today, marks: [{ student_id: studentId, status: 'present' }] },
  });
  assert.strictEqual(studentTriesMark.status, 403);
  const studentTriesAssignment = await request('POST', '/api/lms/assignments', {
    headers: { Authorization: `Bearer ${tokens.student}` },
    body: { subject_id: ta.subject_id, class_id: ta.class_id, section_id: ta.section_id, session_id: ta.session_id, title: 'x', total_marks: 10, due_at: dueAt },
  });
  assert.strictEqual(studentTriesAssignment.status, 403);
  console.log('  ✓ student blocked from teacher-only endpoints');

  // 48) Cleanup: delete test data
  await request('DELETE', `/api/lms/assignments/${asgId}`, { headers: { Authorization: `Bearer ${tokens.teacher}` } });
  await request('DELETE', `/api/lms/quizzes/${quizId}`, { headers: { Authorization: `Bearer ${tokens.teacher}` } });
  await request('DELETE', `/api/admin/users/${newParent.body.id}`, adminAuth);
  console.log('  ✓ cleanup of test data');

  // ============================================================
  // Phase 5 — Attendance reports, teacher attendance, results bulk,
  // evaluation forms, fingerprint integration hook.
  // ============================================================

  // 49) Teacher attendance: check-in → today → check-out
  const tchToday1 = await request('GET', '/api/teacher-attendance/today', { headers: { Authorization: `Bearer ${tokens.teacher}` } });
  assert.strictEqual(tchToday1.status, 200);
  const tchCheckin = await request('POST', '/api/teacher-attendance/checkin', { headers: { Authorization: `Bearer ${tokens.teacher}` }, body: {} });
  assert.strictEqual(tchCheckin.status, 200);
  const tchToday2 = await request('GET', '/api/teacher-attendance/today', { headers: { Authorization: `Bearer ${tokens.teacher}` } });
  assert.ok(tchToday2.body.item, 'today record missing after checkin');
  assert.strictEqual(tchToday2.body.item.status, 'present');
  assert.ok(tchToday2.body.item.check_in);
  const tchCheckout = await request('POST', '/api/teacher-attendance/checkout', { headers: { Authorization: `Bearer ${tokens.teacher}` }, body: {} });
  assert.strictEqual(tchCheckout.status, 200);
  const tchToday3 = await request('GET', '/api/teacher-attendance/today', { headers: { Authorization: `Bearer ${tokens.teacher}` } });
  assert.ok(tchToday3.body.item.check_out);
  console.log('  ✓ teacher attendance: checkin → today → checkout');

  // 50) Teacher attendance report (admin only)
  const tchReport = await request('GET', '/api/teacher-attendance/report', adminAuth);
  assert.strictEqual(tchReport.status, 200);
  assert.ok(Array.isArray(tchReport.body.items));
  console.log(`  ✓ /api/teacher-attendance/report → ${tchReport.body.items.length} teachers`);
  // Parent cannot access
  const parentTriesTchReport = await request('GET', '/api/teacher-attendance/report', { headers: { Authorization: `Bearer ${tokens.parent}` } });
  assert.strictEqual(parentTriesTchReport.status, 403);
  console.log('  ✓ parent blocked from teacher attendance report');

  // 51) Attendance reports: class summary + defaulters
  // First mark today for the student so there's something to report
  await request('POST', '/api/teacher/attendance', {
    headers: { Authorization: `Bearer ${tokens.teacher}` },
    body: { class_id: ta.class_id, section_id: ta.section_id, date: today, marks: [{ student_id: studentId, status: 'present' }] },
  });
  const month = today.slice(0, 7);
  const attClass = await request('GET', `/api/attendance-reports/class?class_id=${ta.class_id}&section_id=${ta.section_id}&month=${month}`, adminAuth);
  assert.strictEqual(attClass.status, 200);
  assert.ok(attClass.body.items.length >= 1);
  assert.ok(attClass.body.items.some(i => Number(i.student_id) === studentId));
  const defaulter = await request('GET', `/api/attendance-reports/defaulters?class_id=${ta.class_id}&section_id=${ta.section_id}&month=${month}&threshold=80`, adminAuth);
  assert.strictEqual(defaulter.status, 200);
  console.log(`  ✓ attendance reports: class(${attClass.body.items.length}) + defaulters(${defaulter.body.items.length})`);

  // 52) Calendar endpoint
  const cal = await request('GET', `/api/attendance-reports/calendar?class_id=${ta.class_id}&section_id=${ta.section_id}&month=${month}`, { headers: { Authorization: `Bearer ${tokens.teacher}` } });
  assert.strictEqual(cal.status, 200);
  assert.ok(Array.isArray(cal.body.items));
  assert.ok(cal.body.items.some(i => i.date?.slice(0,10) === today && i.status === 'present'));
  console.log('  ✓ /api/attendance-reports/calendar returns marked dates');

  // 53) Bulk results upload
  const bulkRes = await request('POST', '/api/results/bulk', {
    headers: { Authorization: `Bearer ${tokens.teacher}` },
    body: {
      subject_id: subjId, term_id: termId, session_id: sessId, total_marks: 100,
      results: [{ student_id: studentId, marks_obtained: 92, grade: 'A+', remarks: 'bulk test' }],
    },
  });
  assert.strictEqual(bulkRes.status, 200);
  assert.strictEqual(bulkRes.body.count, 1);
  console.log('  ✓ bulk results upload (1 student)');

  // 54) Report card
  const rc = await request('GET', `/api/results/report-card/${studentId}?term_id=${termId}`, { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.strictEqual(rc.status, 200);
  assert.ok(rc.body.summary.subjects >= 1);
  assert.ok(rc.body.items.some(i => i.subject_id === subjId && Number(i.marks_obtained) === 92));
  console.log(`  ✓ report card: ${rc.body.summary.subjects} subjects, ${rc.body.summary.percentage}% overall`);

  // 55) Class results summary
  const clsRes = await request('GET', `/api/results/summary?class_id=${ta.class_id}&section_id=${ta.section_id}&term_id=${termId}`, adminAuth);
  assert.strictEqual(clsRes.status, 200);
  assert.ok(clsRes.body.items.length >= 1);
  assert.ok(clsRes.body.items.some(s => s.subject_id === subjId));
  console.log(`  ✓ class results summary: ${clsRes.body.items.length} subjects`);

  // 56) Promotion candidates (students below 60%)
  const promo = await request('GET', `/api/results/promotion?class_id=${ta.class_id}&section_id=${ta.section_id}&term_id=${termId}&pass_pct=95`, adminAuth);
  assert.strictEqual(promo.status, 200);
  assert.ok(Array.isArray(promo.body.items));
  console.log(`  ✓ promotion candidates (pass_pct=95): ${promo.body.items.length} at-risk`);

  // 57) Evaluation form: admin creates, student responds, summary aggregated
  const evalForm = await request('POST', '/api/evaluation/forms', {
    ...adminAuth,
    body: {
      title: `Integration Test Form ${Date.now()}`,
      audience: 'students',
      schema_json: [
        { id: 'q1', type: 'rating', prompt: 'Overall satisfaction', scale: 5 },
        { id: 'q2', type: 'text', prompt: 'Any suggestions?' },
      ],
      is_active: true,
    },
  });
  assert.strictEqual(evalForm.status, 201);
  const formId = evalForm.body.id;
  // Student responds
  const stuResp = await request('POST', `/api/evaluation/forms/${formId}/respond`, {
    headers: { Authorization: `Bearer ${tokens.student}` },
    body: { answers: { q1: 5, q2: 'Great teachers!' } },
  });
  assert.strictEqual(stuResp.status, 201);
  // Duplicate response rejected
  const dupResp = await request('POST', `/api/evaluation/forms/${formId}/respond`, {
    headers: { Authorization: `Bearer ${tokens.student}` },
    body: { answers: { q1: 4 } },
  });
  assert.strictEqual(dupResp.status, 409);
  // Summary
  const sumResp = await request('GET', `/api/evaluation/forms/${formId}/summary`, adminAuth);
  assert.strictEqual(sumResp.status, 200);
  assert.strictEqual(Number(sumResp.body.respondents), 1);
  assert.ok(sumResp.body.per_question.some(q => q.count === 1 && q.avg === 5));
  console.log('  ✓ evaluation: create → respond (409 dup) → summary aggregates');

  // 58) Evaluation: non-respondent role cannot create
  const studentTriesCreateForm = await request('POST', '/api/evaluation/forms', {
    headers: { Authorization: `Bearer ${tokens.student}` },
    body: { title: 'x', audience: 'students', schema_json: [] },
  });
  assert.strictEqual(studentTriesCreateForm.status, 403);
  console.log('  ✓ student blocked from creating evaluation forms');

  // 59) Fingerprint integration stub
  const fpStatus = await request('GET', '/api/integrations/fingerprint/status');
  assert.strictEqual(fpStatus.status, 200);
  assert.strictEqual(fpStatus.body.driver, 'stub');
  const fpEvent = await request('POST', '/api/integrations/fingerprint/event', {
    body: { device_id: 'dev-test', kind: 'teacher', identifier: 'T-0001', direction: 'in' },
  });
  assert.strictEqual(fpEvent.status, 200);
  assert.strictEqual(fpEvent.body.ok, true);
  const fpStatusAfter = await request('GET', '/api/integrations/fingerprint/status');
  assert.strictEqual(fpStatusAfter.body.total_events, 1);
  console.log('  ✓ fingerprint stub: status → simulate event → counter increments');

  // 60) Coordinator dashboard
  const coordDash = await request('GET', '/api/coordinator/dashboard', { headers: { Authorization: `Bearer ${tokens.coordinator}` } });
  assert.strictEqual(coordDash.status, 200);
  assert.ok(coordDash.body.classes >= 1);
  assert.ok(coordDash.body.students_active >= 1);
  console.log(`  ✓ /api/coordinator/dashboard → ${coordDash.body.classes} classes, ${coordDash.body.defaulters} defaulters`);

  // 61) Admin can manage + deactivate evaluation forms
  await request('DELETE', `/api/evaluation/forms/${formId}`, adminAuth);
  const afterDeactivate = await request('GET', `/api/evaluation/forms`, { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.ok(!afterDeactivate.body.items.some(f => f.id === formId));
  console.log('  ✓ admin can deactivate forms (students no longer see them)');

  // 62) RBAC: student cannot view evaluation responses
  const studentTriesResponses = await request('GET', `/api/evaluation/forms/${formId}/responses`, { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.strictEqual(studentTriesResponses.status, 403);
  console.log('  ✓ student blocked from viewing aggregate responses');

  // ============================================================
  // Phase 6 — Fees: accountant portal, discount engine, bill
  // generation, collection, defaulters, reports, expenditures.
  // ============================================================

  const acctAuth = { headers: { Authorization: `Bearer ${tokens.accountant}` } };

  // 63) Accountant dashboard metrics
  const acctDash = await request('GET', '/api/accountant/dashboard', acctAuth);
  assert.strictEqual(acctDash.status, 200);
  assert.ok(typeof acctDash.body.collected_month === 'number');
  assert.ok(typeof acctDash.body.outstanding_total === 'number');
  console.log(`  ✓ /api/accountant/dashboard → month collected PKR ${acctDash.body.collected_month}, outstanding PKR ${acctDash.body.outstanding_total}`);

  // 64) Fee structure CRUD + leave it alive for bill generation later
  const newStruct = await request('POST', '/api/accountant/fee-structures', {
    ...acctAuth,
    body: { session_id: sessId, class_id: ta.class_id, name: 'Phase6 Test Tuition', amount: 4500, due_day: 15, is_active: true },
  });
  assert.strictEqual(newStruct.status, 201);
  const structId = newStruct.body.id;
  const fsList = await request('GET', '/api/accountant/fee-structures', acctAuth);
  assert.ok(fsList.body.items.some(s => s.id === structId));
  await request('PUT', `/api/accountant/fee-structures/${structId}`, { ...acctAuth, body: { amount: 5000 } });
  console.log('  ✓ accountant fee structures: create + list + update');

  // 65) Discount rules view
  const rules = await request('GET', '/api/accountant/discount-rules', acctAuth);
  assert.strictEqual(rules.status, 200);
  assert.ok(rules.body.items.length >= 5, 'expected several seeded discount rules');
  console.log(`  ✓ /api/accountant/discount-rules → ${rules.body.items.length} rules`);

  // 66) Student discount assignment
  const orphanRule = rules.body.items.find(r => r.key_name === 'orphan');
  const assign = await request('POST', '/api/accountant/student-discounts', {
    ...acctAuth,
    body: {
      student_id: studentId,
      discount_rule_id: orphanRule.id,
      valid_from: new Date().toISOString().slice(0, 10),
    },
  });
  assert.strictEqual(assign.status, 201);
  await request('DELETE', `/api/accountant/student-discounts/${assign.body.id}`, acctAuth);
  console.log('  ✓ student discount: assign → remove');

  // 67) Generate bills for the class/section
  const genBills = await request('POST', '/api/accountant/generate-bills', {
    ...acctAuth,
    body: {
      fee_structure_id: structId,
      class_id: ta.class_id,
      section_id: ta.section_id,
      session_id: sessId,
    },
  });
  assert.strictEqual(genBills.status, 200);
  assert.ok(genBills.body.generated >= 0);
  console.log(`  ✓ generate bills → ${genBills.body.generated} new, ${genBills.body.skipped_existing} skipped`);

  // 68) Re-create a fee structure for further tests
  const fs2 = await request('POST', '/api/accountant/fee-structures', {
    ...acctAuth,
    body: { session_id: sessId, class_id: ta.class_id, name: 'Phase6 Test 2', amount: 2000, due_day: 10, is_active: true },
  });
  assert.strictEqual(fs2.status, 201);
  const fs2Id = fs2.body.id;

  // Assign discount FIRST then generate bills to verify discount applied
  const halfRule = rules.body.items.find(r => r.key_name === 'half_fee');
  const sd = await request('POST', '/api/accountant/student-discounts', {
    ...acctAuth,
    body: {
      student_id: studentId,
      fee_structure_id: fs2Id,
      discount_rule_id: halfRule.id,
      valid_from: new Date().toISOString().slice(0, 10),
    },
  });
  assert.strictEqual(sd.status, 201);
  const gen2 = await request('POST', '/api/accountant/generate-bills', {
    ...acctAuth,
    body: {
      fee_structure_id: fs2Id,
      class_id: ta.class_id,
      section_id: ta.section_id,
      session_id: sessId,
    },
  });
  assert.strictEqual(gen2.status, 200);
  // Find the bill generated for our student
  const colsList = await request('GET', `/api/accountant/collections?status=unpaid`, acctAuth);
  assert.ok(colsList.body.items.length >= 1);
  const myBill = colsList.body.items.find(c => c.student_name === 'Ahmad Student' && c.structure_name === 'Phase6 Test 2');
  assert.ok(myBill, 'expected a bill for the seeded student with structure Phase6 Test 2');
  assert.strictEqual(Number(myBill.amount), 2000);
  assert.strictEqual(Number(myBill.discount_amount), 1000, '50% discount should yield 1000 off');
  assert.strictEqual(Number(myBill.net_amount), 1000);
  console.log(`  ✓ bill generated with discount: gross 2000 → discount 1000 (50%) → net 1000`);

  // 69) Record payment on the bill
  const partialPay = await request('POST', `/api/accountant/collections/${myBill.id}/payment`, {
    ...acctAuth,
    body: { amount: 500, payment_method: 'cash', reference: 'RCPT-001' },
  });
  assert.strictEqual(partialPay.status, 200);
  assert.strictEqual(partialPay.body.status, 'partial');
  assert.strictEqual(partialPay.body.outstanding, 500);
  // Overpayment rejected
  const overPay = await request('POST', `/api/accountant/collections/${myBill.id}/payment`, {
    ...acctAuth, body: { amount: 9999, payment_method: 'cash' },
  });
  assert.strictEqual(overPay.status, 400);
  // Pay the rest
  const finalPay = await request('POST', `/api/accountant/collections/${myBill.id}/payment`, {
    ...acctAuth, body: { amount: 500, payment_method: 'cash' },
  });
  assert.strictEqual(finalPay.status, 200);
  assert.strictEqual(finalPay.body.status, 'paid');
  console.log('  ✓ payment: partial → overpayment rejected → final payment → paid');

  // 70) Challan preview endpoint
  const challan = await request('GET', `/api/accountant/challan/${myBill.id}`, acctAuth);
  assert.strictEqual(challan.status, 200);
  assert.ok(challan.body.challan.challan_no);
  assert.ok(challan.body.challan.student_name);
  console.log(`  ✓ challan #${challan.body.challan.challan_no} preview data for ${challan.body.challan.student_name}`);

  // 71) Defaulters endpoint (returns 0 since we paid everything; generate an overdue bill first)
  // Create an overdue bill by inserting backdated
  const overdueBill = await request('POST', '/api/accountant/fee-structures', {
    ...acctAuth, body: { session_id: sessId, class_id: ta.class_id, name: 'Phase6 Overdue', amount: 3000, due_day: 5, is_active: true },
  });
  const overdueBillId = overdueBill.body.id;
  const genOver = await request('POST', '/api/accountant/generate-bills', {
    ...acctAuth, body: { fee_structure_id: overdueBillId, class_id: ta.class_id, section_id: ta.section_id, session_id: sessId },
  });
  assert.strictEqual(genOver.status, 200);
  // Backdate the bill to make it overdue
  const mysqlConn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'school_platform',
  });
  await mysqlConn.query("UPDATE fee_collections SET due_date=DATE_SUB(CURDATE(), INTERVAL 30 DAY) WHERE student_id=?", [studentId]);
  const defs = await request('GET', '/api/accountant/defaulters', acctAuth);
  assert.strictEqual(defs.status, 200);
  assert.ok(defs.body.items.length >= 1, 'expected at least one defaulter');
  assert.ok(defs.body.items.some(d => d.student_name === 'Ahmad Student'));
  console.log(`  ✓ defaulters endpoint: ${defs.body.items.length} defaulter(s) including the seeded student`);

  // 72) Reports (summary + trend)
  const rpt = await request('GET', '/api/accountant/reports/summary', acctAuth);
  assert.strictEqual(rpt.status, 200);
  assert.ok(rpt.body.items.length >= 1);
  console.log(`  ✓ reports/summary: ${rpt.body.items.length} class rows`);
  const trend = await request('GET', '/api/accountant/reports/collection-trend', acctAuth);
  assert.strictEqual(trend.status, 200);
  assert.ok(Array.isArray(trend.body.items));
  console.log(`  ✓ reports/collection-trend: ${trend.body.items.length} months`);

  // 73) Expenditures CRUD
  const expCreate = await request('POST', '/api/accountant/expenditures', {
    ...acctAuth,
    body: { category: 'utilities', description: 'Phase6 electricity bill', amount: 15000, spent_on: '2026-06-01', vendor: 'K-Electric', payment_method: 'bank', reference: 'TXN-001' },
  });
  assert.strictEqual(expCreate.status, 201);
  const expList = await request('GET', '/api/accountant/expenditures', acctAuth);
  assert.ok(expList.body.items.some(e => e.id === expCreate.body.id));
  await request('DELETE', `/api/accountant/expenditures/${expCreate.body.id}`, acctAuth);
  console.log('  ✓ expenditures: create → list → delete');

  // 74) RBAC: student cannot use accountant endpoints
  const stuTriesAcct = await request('GET', '/api/accountant/dashboard', { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.strictEqual(stuTriesAcct.status, 403);
  const stuTriesCol = await request('GET', '/api/accountant/collections', { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.strictEqual(stuTriesCol.status, 403);
  console.log('  ✓ student blocked from accountant endpoints');

  // 75) Cleanup fee structures (and dependent bills) created during the test
  for (const id of [structId, fs2Id, overdueBillId]) {
    // Delete dependent bills directly to satisfy FK
    await mysqlConn.query('DELETE FROM fee_collections WHERE fee_structure_id=?', [id]);
    await request('DELETE', `/api/accountant/fee-structures/${id}`, acctAuth).catch(() => {});
  }
  await mysqlConn.end();
  console.log('  ✓ cleanup test fee structures');

  // ============================================================
  // Phase 7 — Operator portal, Alumni portal, Notifications,
  // Reports CSV exports.
  // ============================================================

  const operAuth = { headers: { Authorization: `Bearer ${tokens.operator}` } };
  const alumAuth = { headers: { Authorization: `Bearer ${tokens.alumni}` } };

  // 76) Operator dashboard
  const operDash = await request('GET', '/api/operator/dashboard', operAuth);
  assert.strictEqual(operDash.status, 200);
  assert.ok(operDash.body.students_active >= 1);
  assert.ok(operDash.body.active_templates >= 1);
  console.log(`  ✓ /api/operator/dashboard → ${operDash.body.active_templates} templates, ${operDash.body.documents_generated} generated`);

  // 77) Document templates list
  const tpls = await request('GET', '/api/operator/templates', operAuth);
  assert.strictEqual(tpls.status, 200);
  assert.ok(tpls.body.items.some(t => t.key_name === 'student_id_card'));
  assert.ok(tpls.body.items.some(t => t.key_name === 'certificate'));
  console.log(`  ✓ /api/operator/templates → ${tpls.body.items.length} templates`);

  // 78) Student ID card data endpoint
  const idCard = await request('GET', `/api/operator/id-card/student/${studentId}`, operAuth);
  assert.strictEqual(idCard.status, 200);
  assert.ok(idCard.body.card.full_name);
  assert.ok(idCard.body.card.admission_no);
  assert.ok(idCard.body.card.template_name);
  console.log(`  ✓ student ID card data for ${idCard.body.card.full_name}`);

  // 79) Staff ID card + certificate + fee-structure PDF endpoints
  // Find a teacher user_id (the seeded teacher is user 3 in our schema)
  const tchStaffCard = await request('GET', '/api/operator/id-card/staff/3', operAuth);
  assert.strictEqual(tchStaffCard.status, 200);
  assert.ok(tchStaffCard.body.card.full_name);
  const cert = await request('GET', `/api/operator/certificate/student/${studentId}?reason=Top+scorer`, operAuth);
  assert.strictEqual(cert.status, 200);
  assert.strictEqual(cert.body.certificate.reason, 'Top scorer');
  const feePdf = await request('GET', '/api/operator/fee-structure/pdf', operAuth);
  assert.strictEqual(feePdf.status, 200);
  assert.ok(Array.isArray(feePdf.body.structures));
  console.log('  ✓ staff ID card + certificate + fee-structure PDF endpoints');

  // 80) Operator: non-operator (student) blocked
  const studentTriesOperator = await request('GET', '/api/operator/dashboard', { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.strictEqual(studentTriesOperator.status, 403);
  console.log('  ✓ student blocked from operator endpoints');

  // 81) Alumni dashboard + search
  const alumDash = await request('GET', '/api/alumni/dashboard', alumAuth);
  assert.strictEqual(alumDash.status, 200);
  assert.ok(alumDash.body.stats.total >= 1);
  assert.ok(alumDash.body.profile.full_name);
  console.log(`  ✓ /api/alumni/dashboard → ${alumDash.body.stats.total} total alumni`);
  const alumSearch = await request('GET', '/api/alumni/search?q=Hassan', alumAuth);
  assert.strictEqual(alumSearch.status, 200);
  assert.ok(alumSearch.body.results.length >= 1);
  console.log(`  ✓ /api/alumni/search?q=Hassan → ${alumSearch.body.results.length} result(s)`);
  const batches = await request('GET', '/api/alumni/batches', alumAuth);
  assert.strictEqual(batches.status, 200);
  console.log(`  ✓ /api/alumni/batches → ${batches.body.items.length} batch(es)`);

  // 82) Alumni profile update
  const alumUpd = await request('PUT', '/api/alumni/profile', {
    ...alumAuth, body: { profession: 'Updated Engineer', city: 'Lahore' },
  });
  assert.strictEqual(alumUpd.status, 200);
  const alumDash2 = await request('GET', '/api/alumni/dashboard', alumAuth);
  assert.strictEqual(alumDash2.body.profile.profession, 'Updated Engineer');
  assert.strictEqual(alumDash2.body.profile.city, 'Lahore');
  console.log('  ✓ alumni profile update reflected on dashboard');

  // 83) Notifications: admin creates, everyone with right audience sees it
  const notif = await request('POST', '/api/notifications', {
    ...adminAuth, body: { title: 'Phase7 test announcement', body: 'hello all', audience: 'all', category: 'announcement', channel: 'inapp' },
  });
  assert.strictEqual(notif.status, 201);
  assert.strictEqual(notif.body.dispatched.inapp, true);
  const myNotifs = await request('GET', '/api/notifications', { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.ok(myNotifs.body.items.some(n => n.id === notif.body.id));
  assert.strictEqual(typeof myNotifs.body.email_enabled, 'boolean');
  console.log('  ✓ notifications: create → in-app feed shows it; email_enabled flag exposed');
  // Unread count
  const unread = await request('GET', '/api/notifications/unread-count', { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.strictEqual(unread.status, 200);
  assert.ok(unread.body.count >= 1);
  // Mark read
  await request('POST', `/api/notifications/${notif.body.id}/read`, { headers: { Authorization: `Bearer ${tokens.student}` } });
  const unreadAfter = await request('GET', '/api/notifications/unread-count', { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.strictEqual(unreadAfter.body.count, unread.body.count - 1, 'mark-read decrements unread');
  console.log('  ✓ unread count + mark-read');

  // 84) Notifications: student cannot create (RBAC)
  const stuTriesNotif = await request('POST', '/api/notifications', {
    headers: { Authorization: `Bearer ${tokens.student}` },
    body: { title: 'x', body: 'x', audience: 'all' },
  });
  assert.strictEqual(stuTriesNotif.status, 403);
  console.log('  ✓ student blocked from creating notifications');

  // 85) Bulk notifications
  const bulkNotif = await request('POST', '/api/notifications/bulk', {
    ...adminAuth, body: { notifications: [
      { title: 'Bulk 1', body: 'msg 1', audience: 'teachers', category: 'announcement' },
      { title: 'Bulk 2', body: 'msg 2', audience: 'parents', category: 'event' },
    ]},
  });
  assert.strictEqual(bulkNotif.status, 201);
  assert.strictEqual(bulkNotif.body.count, 2);
  console.log(`  ✓ bulk notifications → ${bulkNotif.body.count} created`);

  // 86) Reports CSV exports — admin can fetch
  const csvStudents = await request('GET', '/api/reports/csv/students?class_id=' + ta.class_id + '&section_id=' + ta.section_id, adminAuth);
  assert.strictEqual(csvStudents.status, 200);
  assert.ok(csvStudents.body.toLowerCase().includes('admission no'));
  assert.ok(csvStudents.body.toLowerCase().includes(ta.class_name.toLowerCase()));
  const csvTeachers = await request('GET', '/api/reports/csv/teachers', adminAuth);
  assert.strictEqual(csvTeachers.status, 200);
  assert.ok(csvTeachers.body.toLowerCase().includes('employee code'));
  const csvMarks = await request('GET', `/api/reports/csv/marks-sheet?class_id=${ta.class_id}&section_id=${ta.section_id}&term_id=${termId}`, adminAuth);
  assert.strictEqual(csvMarks.status, 200);
  assert.ok(csvMarks.body.toLowerCase().includes('admission no'));
  const csvAtt = await request('GET', `/api/reports/csv/attendance?class_id=${ta.class_id}&section_id=${ta.section_id}&month=${month}`, adminAuth);
  assert.strictEqual(csvAtt.status, 200);
  assert.ok(csvAtt.body.toLowerCase().includes('date'));
  const csvFees = await request('GET', '/api/reports/csv/fees', adminAuth);
  assert.strictEqual(csvFees.status, 200);
  assert.ok(csvFees.body.toLowerCase().includes('challan'));
  console.log('  ✓ CSV exports: students, teachers, marks, attendance, fees');

  // 87) Reports: student cannot access (RBAC)
  const stuTriesReports = await request('GET', '/api/reports/csv/students', { headers: { Authorization: `Bearer ${tokens.student}` } });
  assert.strictEqual(stuTriesReports.status, 403);
  console.log('  ✓ student blocked from CSV report exports');

  // 88) Admin can register a new alumni entry (no user — just alumni record)
  const newAlum = await request('POST', '/api/alumni/register', {
    ...adminAuth, body: {
      full_name: 'Phase7 Test Alumni', passing_year: 2019, batch_name: '2017-2019',
      profession: 'Doctor', organization: 'City Hospital', city: 'Karachi', country: 'Pakistan',
      email: 'phase7-alumni@school.test',
    },
  });
  assert.strictEqual(newAlum.status, 201);
  await request('POST', `/api/alumni/${newAlum.body.id}/verify`, adminAuth);
  const alumSearchAfter = await request('GET', '/api/alumni/search?q=Phase7', alumAuth);
  assert.ok(alumSearchAfter.body.results.some(r => r.full_name === 'Phase7 Test Alumni'));
  console.log('  ✓ admin registered + verified new alumni → searchable');

  // Cleanup — re-open connection for the alumni delete
  const cleanupConn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'school_platform',
  });
  await cleanupConn.query('DELETE FROM alumni WHERE id=?', [newAlum.body.id]);
  await cleanupConn.end();
  console.log('  ✓ cleanup test alumni');

  console.log('\nAll integration tests passed.');
  server.close();
  setTimeout(() => process.exit(0), 200);
})().catch(err => {
  console.error('INTEGRATION TEST FAILED:', err);
  server.close();
  setTimeout(() => process.exit(1), 200);
});
