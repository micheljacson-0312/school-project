// =====================================================================
// Seed script: roles, permissions catalog, role->permission mapping,
// academic structure, fee discount rules, demo users (1 per role),
// sample assignments and fee structures.
// Run with: npm run seed
// =====================================================================
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// ----- Roles & Permissions ---------------------------------------------
const ROLES = [
  { key: 'admin',        name: 'Administrator',       desc: 'Full system access' },
  { key: 'coordinator',  name: 'Coordinator',         desc: 'Academic oversight and teacher/student performance monitoring' },
  { key: 'teacher',      name: 'Teacher',             desc: 'Manages classes, attendance, results, LMS' },
  { key: 'student',      name: 'Student',             desc: 'Learner portal' },
  { key: 'parent',       name: 'Parent / Guardian',   desc: 'Tracks child progress' },
  { key: 'accountant',   name: 'Accountant',          desc: 'Fee and financial management' },
  { key: 'operator',     name: 'Computer Operator',   desc: 'Document generation and printing' },
  { key: 'alumni',       name: 'Alumni',              desc: 'Alumni network' },
];

// Permission catalog — every permission the system supports.
// Action suffix is the verb: .view, .create, .edit, .delete, .manage.
const PERMISSIONS = [
  // User & RBAC management
  { key: 'users.view',          module: 'users',     action: 'view' },
  { key: 'users.create',        module: 'users',     action: 'create' },
  { key: 'users.edit',          module: 'users',     action: 'edit' },
  { key: 'users.delete',        module: 'users',     action: 'delete' },
  { key: 'roles.manage',        module: 'roles',     action: 'manage' },

  // Academic structure
  { key: 'academic.view',       module: 'academic',  action: 'view' },
  { key: 'academic.manage',     module: 'academic',  action: 'manage' },
  { key: 'classes.view',        module: 'classes',   action: 'view' },
  { key: 'classes.manage',      module: 'classes',   action: 'manage' },
  { key: 'subjects.view',       module: 'subjects',  action: 'view' },
  { key: 'subjects.manage',     module: 'subjects',  action: 'manage' },

  // Student/Teacher/Parent/Staff profiles
  { key: 'students.view',       module: 'students',  action: 'view' },
  { key: 'students.create',     module: 'students',  action: 'create' },
  { key: 'students.edit',       module: 'students',  action: 'edit' },
  { key: 'students.delete',     module: 'students',  action: 'delete' },
  { key: 'teachers.view',       module: 'teachers',  action: 'view' },
  { key: 'teachers.create',     module: 'teachers',  action: 'create' },
  { key: 'teachers.edit',       module: 'teachers',  action: 'edit' },
  { key: 'teachers.delete',     module: 'teachers',  action: 'delete' },
  { key: 'parents.view',        module: 'parents',   action: 'view' },
  { key: 'parents.manage',      module: 'parents',   action: 'manage' },

  // Attendance
  { key: 'attendance.mark', module: 'attendance',action: 'mark' },
  { key: 'attendance.view', module: 'attendance',action: 'view' },
  { key: 'attendance.report', module: 'attendance',action: 'report' },
  { key: 'attendance.bulk_mark', module: 'attendance',action: 'bulk_mark' },
  // Teacher attendance
  { key: 'teacher_attendance.mark', module: 'teacher_attendance',action: 'mark' },
  { key: 'teacher_attendance.view_all', module: 'teacher_attendance',action: 'view_all' },

  // LMS
  { key: 'lms.lecture.upload',  module: 'lms',       action: 'lecture_upload' },
  { key: 'lms.lecture.view',    module: 'lms',       action: 'lecture_view' },
  { key: 'lms.assignment.create', module: 'lms',     action: 'assignment_create' },
  { key: 'lms.assignment.submit', module: 'lms',     action: 'assignment_submit' },
  { key: 'lms.assignment.grade', module: 'lms',      action: 'assignment_grade' },
  { key: 'lms.quiz.create',     module: 'lms',       action: 'quiz_create' },
  { key: 'lms.quiz.take',       module: 'lms',       action: 'quiz_take' },
  { key: 'lms.quiz.grade',      module: 'lms',       action: 'quiz_grade' },
  { key: 'lms.liveclass.host',  module: 'lms',       action: 'liveclass_host' },
  { key: 'lms.liveclass.join',  module: 'lms',       action: 'liveclass_join' },

  // Results
  { key: 'results.upload',      module: 'results',   action: 'upload' },
  { key: 'results.view',        module: 'results',   action: 'view' },
  { key: 'results.override',    module: 'results',   action: 'override' },
  { key: 'results.bulk_upload', module: 'results',   action: 'bulk_upload' },
  { key: 'results.report_card', module: 'results',   action: 'report_card' },

  // Fees
  { key: 'fees.structure.manage', module: 'fees',    action: 'structure_manage' },
  { key: 'fees.collect',        module: 'fees',      action: 'collect' },
  { key: 'fees.view',           module: 'fees',      action: 'view' },
  { key: 'fees.report',         module: 'fees',      action: 'report' },
  { key: 'fees.discount.manage', module: 'fees',     action: 'discount_manage' },
  { key: 'fees.bulk_generate',   module: 'fees',     action: 'bulk_generate' },
  // Expenditures
  { key: 'expenditures.manage', module: 'expenditures', action: 'manage' },
  { key: 'expenditures.view',   module: 'expenditures', action: 'view' },

  // Evaluations
  { key: 'evaluation.create',   module: 'evaluation',action: 'create' },
  { key: 'evaluation.respond',  module: 'evaluation',action: 'respond' },
  { key: 'evaluation.view',     module: 'evaluation',action: 'view' },
  { key: 'evaluation.view_responses', module: 'evaluation',action: 'view_responses' },
  { key: 'evaluation.manage_forms',   module: 'evaluation',action: 'manage_forms' },
  { key: 'remarks.create',      module: 'remarks',   action: 'create' },
  { key: 'remarks.view',        module: 'remarks',   action: 'view' },
  { key: 'awards.create',       module: 'awards',    action: 'create' },

  // Documents
  { key: 'documents.generate',  module: 'documents', action: 'generate' },
  { key: 'documents.template.manage', module: 'documents', action: 'template_manage' },

  // Notifications
  { key: 'notifications.create', module: 'notifications', action: 'create' },
  { key: 'notifications.view',   module: 'notifications', action: 'view' },

  // Website content
  { key: 'content.news.manage', module: 'content', action: 'news_manage' },
  { key: 'content.gallery.manage', module: 'content', action: 'gallery_manage' },
  { key: 'content.admissions.review', module: 'content', action: 'admissions_review' },
  { key: 'content.jobs.review', module: 'content', action: 'jobs_review' },

  // Alumni
  { key: 'alumni.view',         module: 'alumni',    action: 'view' },
  { key: 'alumni.manage',       module: 'alumni',    action: 'manage' },

  // Reports & audit
  { key: 'reports.view',        module: 'reports',   action: 'view' },
  { key: 'audit.view',          module: 'audit',     action: 'view' },
  { key: 'settings.manage',     module: 'settings',  action: 'manage' },
  { key: 'mail.manage',         module: 'mail',      action: 'manage' },
];

// Role -> permission mapping. '*' = all permissions (admin convenience).
const ROLE_PERMS = {
  admin:       '*',
  coordinator: [
    'academic.view', 'classes.view', 'subjects.view',
    'students.view', 'teachers.view',
    'attendance.view', 'attendance.report',
    'teacher_attendance.view_all',
    'lms.lecture.view',
    'results.view', 'results.report_card',
    'evaluation.view', 'evaluation.view_responses', 'remarks.view', 'remarks.create', 'awards.create',
    'reports.view',
    'notifications.create', 'notifications.view',
  ],
  teacher: [
    'academic.view', 'classes.view', 'subjects.view',
    'students.view', 'teachers.view',
    'attendance.mark', 'attendance.view',
    'teacher_attendance.mark',
    'lms.lecture.upload', 'lms.lecture.view',
    'lms.assignment.create', 'lms.assignment.grade',
    'lms.quiz.create', 'lms.quiz.grade',
    'lms.liveclass.host',
    'results.upload', 'results.view', 'results.bulk_upload',
    'evaluation.create', 'evaluation.view', 'evaluation.respond',
    'remarks.create', 'remarks.view', 'awards.create',
    'notifications.view',
  ],
  student: [
    'classes.view', 'subjects.view',
    'attendance.view',
    'lms.lecture.view', 'lms.assignment.submit', 'lms.quiz.take',
    'lms.liveclass.join',
    'results.view', 'results.report_card',
    'fees.view',
    'evaluation.respond',
    'remarks.view',
    'notifications.view',
  ],
  parent: [
    'students.view',
    'attendance.view',
    'lms.lecture.view',
    'results.view', 'results.report_card',
    'fees.view',
    'evaluation.respond',
    'remarks.view',
    'notifications.view',
  ],
  accountant: [
    'students.view',
    'fees.structure.manage', 'fees.collect', 'fees.view', 'fees.report',
    'fees.discount.manage', 'fees.bulk_generate',
    'expenditures.manage', 'expenditures.view',
    'reports.view',
    'notifications.create',
  ],
  operator: [
    'students.view',
    'documents.generate',
    'documents.template.manage',
    'fees.structure.manage',
  ],
  alumni: [
    'alumni.view',
    'notifications.view',
  ],
};

// =====================================================================
// Run
// =====================================================================
(async () => {
  const db = await mysql.createConnection({
    host:     process.env.DB_HOST     || '127.0.0.1',
    port:     Number(process.env.DB_PORT || 3306),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'school_platform',
    multipleStatements: true,
  });

  console.log('Connected. Seeding...');

  // Roles
  const roleIds = {};
  for (const r of ROLES) {
    const [res] = await db.query(
      'INSERT INTO roles (key_name, display_name, description) VALUES (?,?,?) ON DUPLICATE KEY UPDATE display_name=VALUES(display_name)',
      [r.key, r.name, r.desc]
    );
    const [rows] = await db.query('SELECT id FROM roles WHERE key_name=?', [r.key]);
    roleIds[r.key] = rows[0].id;
  }
  console.log('  • roles seeded');

  // Permissions
  const permIds = {};
  for (const p of PERMISSIONS) {
    await db.query(
      'INSERT INTO permissions (key_name, module, action, display_name) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE display_name=VALUES(display_name)',
      [p.key, p.module, p.action, p.key]
    );
    const [rows] = await db.query('SELECT id FROM permissions WHERE key_name=?', [p.key]);
    permIds[p.key] = rows[0].id;
  }
  console.log('  • permissions seeded');

  // Role -> permissions
  for (const [roleKey, perms] of Object.entries(ROLE_PERMS)) {
    const roleId = roleIds[roleKey];
    const list = perms === '*' ? Object.keys(permIds) : perms;
    for (const p of list) {
      if (!permIds[p]) continue;
      await db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?,?) ON DUPLICATE KEY UPDATE permission_id=permission_id', [roleId, permIds[p]]);
    }
  }
  console.log('  • role_permissions seeded');

  // Academic session + terms
  await db.query(`INSERT INTO academic_sessions (name, start_date, end_date, is_current)
                  VALUES ('2025-2026','2025-04-01','2026-03-31',1)
                  ON DUPLICATE KEY UPDATE is_current=1`);
  const [sessRows] = await db.query(`SELECT id FROM academic_sessions WHERE is_current=1 LIMIT 1`);
  const sessionId = sessRows[0].id;
  for (const t of [
    { name: 'Term 1',  start: '2025-04-01', end: '2025-09-30' },
    { name: 'Term 2',  start: '2025-10-01', end: '2026-03-31' },
    { name: 'Final',   start: '2026-02-15', end: '2026-03-31' },
  ]) {
    await db.query(`INSERT INTO terms (session_id, name, start_date, end_date) VALUES (?,?,?,?)
                    ON DUPLICATE KEY UPDATE start_date=VALUES(start_date)`, [sessionId, t.name, t.start, t.end]);
  }
  console.log('  • session + terms seeded');

  // Classes + sections + subjects
  const classes = [
    { level: 1, name: 'Grade 1' },
    { level: 2, name: 'Grade 2' },
    { level: 3, name: 'Grade 3' },
    { level: 4, name: 'Grade 4' },
    { level: 5, name: 'Grade 5' },
  ];
  const subjects = ['English','Mathematics','Science','Social Studies','Urdu','Computer'];
  const classIds = {};
  for (const c of classes) {
    await db.query(`INSERT INTO classes (name, level) VALUES (?,?) ON DUPLICATE KEY UPDATE level=VALUES(level)`, [c.name, c.level]);
    const [rows] = await db.query('SELECT id FROM classes WHERE name=?', [c.name]);
    classIds[c.name] = rows[0].id;
    for (const sec of ['A','B']) {
      await db.query('INSERT INTO sections (class_id, name) VALUES (?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)', [rows[0].id, sec]);
    }
    for (const s of subjects) {
      await db.query('INSERT INTO subjects (class_id, name) VALUES (?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)', [rows[0].id, s]);
    }
  }
  console.log('  • classes/sections/subjects seeded');

  // Fee discount rules per brief
  const rules = [
    { key: 'normal',                 name: 'Normal',                    pct: 0.00,  sib: 0, priority: 0  },
    { key: 'half_fee',               name: 'Half Fee (50%)',            pct: 50.00, sib: 0, priority: 50 },
    { key: 'orphan',                 name: 'Orphan (50%)',              pct: 50.00, sib: 0, priority: 80 },
    { key: 'employee_child_current', name: 'Current Employee Child (100%)', pct: 100.00, sib: 0, priority: 100 },
    { key: 'employee_child_ex',     name: 'Ex-Employee Child (50%)',   pct: 50.00, sib: 0, priority: 70 },
    { key: 'sibling_2',              name: 'Sibling 2nd child (20%)',   pct: 20.00, sib: 2, priority: 30 },
    { key: 'sibling_3',              name: 'Sibling 3rd child (30%)',   pct: 30.00, sib: 3, priority: 31 },
    { key: 'sibling_4',              name: 'Sibling 4th child (40%)',   pct: 40.00, sib: 4, priority: 32 },
    { key: 'sibling_5',              name: 'Sibling 5th child (50%)',   pct: 50.00, sib: 5, priority: 33 },
    { key: 'sibling_6_free',         name: 'Sibling 6th child (Free)',  pct: 100.00,sib: 6, priority: 34 },
    { key: 'bsf_free',               name: 'BSF Free (100%)',           pct: 100.00,sib: 0, priority: 90 },
  ];
  for (const r of rules) {
    await db.query(`INSERT INTO fee_discount_rules (key_name, display_name, discount_percent, requires_siblings, priority, is_active, notes)
                    VALUES (?,?,?,?,?,1,'Seed')
                    ON DUPLICATE KEY UPDATE discount_percent=VALUES(discount_percent), priority=VALUES(priority)`,
                   [r.key, r.name, r.pct, r.sib, r.priority]);
  }
  console.log('  • fee discount rules seeded');

  // Fee structures — monthly tuition per class
  for (const c of classes) {
    const base = 2000 + c.level * 300;
    await db.query(`INSERT INTO fee_structures (session_id, class_id, name, amount, due_day, is_active)
                    VALUES (?,?,?,?,10,1)
                    ON DUPLICATE KEY UPDATE amount=VALUES(amount)`,
                   [sessionId, classIds[c.name], 'Monthly Tuition', base]);
  }
  console.log('  • fee structures seeded');

  // Demo users (one per role)
  const password = await bcrypt.hash('Password123!', 10);
  const demoUsers = [
    { role: 'admin',       email: 'admin@school.test',      name: 'System Admin',   cnic: null },
    { role: 'coordinator', email: 'coord@school.test',      name: 'Sara Coordinator',cnic: null },
    { role: 'teacher',     email: 'teacher@school.test',    name: 'Mr. Asim Teacher',cnic: null },
    { role: 'accountant',  email: 'accounts@school.test',   name: 'Ayesha Accounts', cnic: null },
    { role: 'operator',    email: 'operator@school.test',   name: 'Bilal Operator', cnic: null },
    { role: 'student',     email: 'student@school.test',    name: 'Ahmad Student',  cnic: null },
    { role: 'parent',      email: 'parent@school.test',     name: 'Fatima Parent',  cnic: '42101-1234567-8' },
    { role: 'alumni',      email: 'alumni@school.test',     name: 'Hassan Alumni',  cnic: null },
  ];
  const userIds = {};
  for (const u of demoUsers) {
    await db.query(`INSERT INTO users (role_id, email, password_hash, cnic, full_name, phone, status, email_verified_at)
                    VALUES (?,?,?,?,?,?, 'active', NOW())
                    ON DUPLICATE KEY UPDATE full_name=VALUES(full_name)`,
                   [roleIds[u.role], u.email, password, u.cnic, u.name, '+923001234567']);
    const [rows] = await db.query('SELECT id FROM users WHERE email=?', [u.email]);
    userIds[u.role] = rows[0].id;
  }
  console.log('  • demo users seeded');

  // Demo teacher profile + assignment
  await db.query(`INSERT INTO teachers (user_id, employee_code, designation, qualification, joining_date, status)
                  VALUES (?, 'T-0001', 'Senior Teacher', 'M.Ed', '2020-08-15', 'active')
                  ON DUPLICATE KEY UPDATE designation=VALUES(designation)`,
                 [userIds.teacher]);
  const [teacherRows] = await db.query('SELECT id FROM teachers WHERE user_id=?', [userIds.teacher]);
  const teacherProfileId = teacherRows[0].id;
  const grade3 = classIds['Grade 3'];
  const [secRows] = await db.query('SELECT id FROM sections WHERE class_id=? AND name=?', [grade3, 'A']);
  const [mathRows] = await db.query('SELECT id FROM subjects WHERE class_id=? AND name=?', [grade3, 'Mathematics']);
  await db.query(`INSERT INTO teacher_assignments (teacher_id, subject_id, class_id, section_id, session_id)
                  VALUES (?,?,?,?,?)
                  ON DUPLICATE KEY UPDATE subject_id=VALUES(subject_id)`,
                 [teacherProfileId, mathRows[0].id, grade3, secRows[0].id, sessionId]);
  console.log('  • teacher + assignment seeded');

  // Demo student + parent relationship
  await db.query(`INSERT INTO students (user_id, admission_no, class_id, section_id, session_id, date_of_birth, gender, guardian_name, guardian_phone, admission_date, status)
                  VALUES (?, 'ADM-0001', ?, ?, ?, '2014-05-12', 'male', 'Fatima Parent', '+923001234567', '2023-04-01', 'active')
                  ON DUPLICATE KEY UPDATE admission_no=VALUES(admission_no)`,
                 [userIds.student, grade3, secRows[0].id, sessionId]);
  const [studentRows] = await db.query('SELECT id FROM students WHERE user_id=?', [userIds.student]);
  await db.query(`INSERT INTO parents (user_id, occupation, cnic, address) VALUES (?, 'Housewife', '42101-1234567-8', '123 Main St')
                  ON DUPLICATE KEY UPDATE occupation=VALUES(occupation)`, [userIds.parent]);
  const [parentRows] = await db.query('SELECT id FROM parents WHERE user_id=?', [userIds.parent]);
  await db.query(`INSERT INTO parent_student (parent_id, student_id, relation, is_primary) VALUES (?,?, 'mother', 1)
                  ON DUPLICATE KEY UPDATE relation=VALUES(relation)`, [parentRows[0].id, studentRows[0].id]);
  console.log('  • student + parent seeded');

  // Alumni
  await db.query(`INSERT INTO alumni (user_id, full_name, passing_year, batch_name, profession, organization, city, country, is_verified)
                  VALUES (?, 'Hassan Alumni', 2020, '2018-2020', 'Software Engineer', 'Acme Co', 'Karachi', 'Pakistan', 1)
                  ON DUPLICATE KEY UPDATE profession=VALUES(profession)`, [userIds.alumni]);
  console.log('  • alumni seeded');

  // Public website content (news + gallery)
  const newsItems = [
    { type:'news', title:'Admissions Open for 2026', slug:'admissions-open-2026',
      excerpt:'Apply online for the new academic session.',
      body:'<p>Applications are now being accepted for the 2026 academic session. Parents can apply online through our admissions portal, or visit the school office between 9 AM and 2 PM, Monday to Friday.</p><p>Required documents: birth certificate, two recent photographs, previous school transcripts (if applicable), and a copy of the parent\'s CNIC.</p>' },
    { type:'news', title:'Science Fair Winners Announced', slug:'science-fair-2025',
      excerpt:'Grade 8 students swept the regional science fair with three first-place finishes.',
      body:'<p>Our Grade 8 students brought home three first-place trophies from the Regional Science Fair held at the City Convention Center. The winning projects covered renewable energy, water purification, and a low-cost Braille reader prototype.</p>' },
    { type:'event', title:'Annual Sports Day', slug:'annual-sports-day',
      excerpt:'Join us on March 10 for the annual sports day celebration.',
      body:'<p>The Annual Sports Day will be held on March 10 from 9 AM to 2 PM on the main school grounds. Events include track and field, football, cricket, and a closing ceremony with prizes.</p>' },
    { type:'event', title:'Parent-Teacher Meeting', slug:'ptm-march-2026',
      excerpt:'Quarterly PTM scheduled for March 18.',
      body:'<p>Our quarterly Parent-Teacher Meeting will be held on March 18 from 2 PM to 5 PM. All parents are encouraged to attend to review their child\'s progress.</p>' },
  ];
  for (const n of newsItems) {
    await db.query(
      `INSERT INTO news_events (type, title, slug, excerpt, body, is_published, published_at)
       VALUES (?,?,?,?,?,1,NOW())
       ON DUPLICATE KEY UPDATE title=VALUES(title), body=VALUES(body)`,
      [n.type, n.title, n.slug, n.excerpt, n.body]);
  }

  const galleryItems = [
    { category:'campus',     caption:'Main Building',       media_url:'/images/gallery/main-building.jpg', taken_on:'2025-09-12' },
    { category:'campus',     caption:'Library',             media_url:'/images/gallery/library.jpg',       taken_on:'2025-09-12' },
    { category:'sports',     caption:'Annual Sports Day',   media_url:'/images/gallery/sports-day.jpg',    taken_on:'2025-03-10' },
    { category:'academics',  caption:'Science Lab',         media_url:'/images/gallery/science-lab.jpg',   taken_on:'2025-10-05' },
    { category:'events',     caption:'Graduation 2025',     media_url:'/images/gallery/graduation-2025.jpg',taken_on:'2025-06-20' },
    { category:'academics',  caption:'Computer Lab',        media_url:'/images/gallery/computer-lab.jpg',  taken_on:'2025-10-05' },
  ];
  for (const g of galleryItems) {
    await db.query(
      `INSERT INTO gallery_items (category, caption, media_url, media_type, taken_on, is_published)
       VALUES (?,?,?, 'image', ?, 1)
       ON DUPLICATE KEY UPDATE caption=VALUES(caption)`,
      [g.category, g.caption, g.media_url, g.taken_on]);
  }
  console.log('  • public content seeded');

  // Document templates (Phase 7) — seeded so the operator portal has templates to display
  const docTemplates = [
    { key: 'student_id_card', name: 'Student ID Card', html: '<div class="id-card"><h2>{{school_name}}</h2><p>{{full_name}}</p><p>Adm: {{admission_no}}</p><p>Class: {{class_name}} / {{section_name}}</p><p>Session: {{session_name}}</p></div>' },
    { key: 'staff_id_card',   name: 'Staff ID Card',   html: '<div class="id-card"><h2>{{school_name}}</h2><p>{{full_name}}</p><p>{{designation}}</p><p>Code: {{employee_code}}</p></div>' },
    { key: 'certificate',     name: 'Certificate of Achievement', html: '<div class="cert"><h1>Certificate</h1><p>Awarded to {{full_name}} for {{reason}}.</p><p>Issued on {{issued_on}}</p></div>' },
    { key: 'fee_structure',   name: 'Fee Structure Schedule', html: '<h2>Fee Schedule {{session_name}}</h2><table>{{rows}}</table>' },
  ];
  for (const t of docTemplates) {
    const fields = Array.from(new Set([...t.html.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1])));
    await db.query(
      `INSERT INTO document_templates (key_name, display_name, html_template, fields_json, is_active)
       VALUES (?,?,?,?,1)
       ON DUPLICATE KEY UPDATE display_name=VALUES(display_name), html_template=VALUES(html_template)`,
      [t.key, t.name, t.html, JSON.stringify(fields)]
    );
  }
  console.log('  • document templates seeded');

  // -------------------------------------------------------------------
  // Phase 2: site settings, slides, achievements, principal, jobs
  // -------------------------------------------------------------------
  const settings = [
    ['school_name',           'City Public School',                       'string', 'Display name of the school'],
    ['school_tagline',        'Inspiring minds, building character.',     'string', 'Short tagline used in hero'],
    ['school_address',        '123 Education Road, Karachi, Pakistan',    'string', 'Postal address'],
    ['school_phone',          '+92-21-1234567',                           'string', 'Front desk phone'],
    ['school_email',          'info@school.test',                         'string', 'Front desk email'],
    ['school_whatsapp',       '923001234567',                             'string', 'WhatsApp number in international format (no + or spaces)'],
    ['school_facebook',       'https://facebook.com/school.test',         'url',    'Facebook page URL'],
    ['school_instagram',      'https://instagram.com/school.test',        'url',    'Instagram URL'],
    ['school_youtube',        'https://youtube.com/@school.test',         'url',    'YouTube channel URL'],
    ['map_embed_url',         'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3619.0!2d67.0!3d24.9!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sCity%20Public%20School!5e0!3m2!1sen!2s!4v1700000000000', 'url', 'Google Maps embed iframe src'],
    ['admissions_open',       'true',                                      'boolean','Whether admissions are currently open'],
    ['office_hours',          'Mon–Fri 8:00 AM – 3:00 PM',                'string', 'Front office hours'],
  ];
  for (const [key, value, type, description] of settings) {
    await db.query(`INSERT INTO site_settings (key_name, value, type, description)
                    VALUES (?,?,?,?)
                    ON DUPLICATE KEY UPDATE value=VALUES(value), type=VALUES(type)`,
                   [key, value, type, description]);
  }
  console.log('  • site settings seeded');

  // Homepage slides
  const slides = [
    { title:'Welcome to City Public School', subtitle:'A 60-year tradition of academic excellence and character building.', image_url:null, cta_label:'Apply for 2026', cta_href:'/admissions', position:1 },
    { title:'Admissions Open for 2026',      subtitle:'Apply online — limited seats per grade.',                       image_url:'/images/hero/admissions.jpg', cta_label:'Start application', cta_href:'/admissions', position:2 },
    { title:'Annual Sports Day — March 10',  subtitle:'Join us for a day of track, field, and community.',           image_url:'/images/hero/sports.jpg',     cta_label:'Read more',           cta_href:'/news/annual-sports-day', position:3 },
  ];
  for (const s of slides) {
    await db.query(
      `INSERT INTO homepage_slides (title, subtitle, image_url, cta_label, cta_href, position, is_active)
       VALUES (?,?,?,?,?,?,1)
       ON DUPLICATE KEY UPDATE title=VALUES(title), subtitle=VALUES(subtitle)`,
      [s.title, s.subtitle, s.image_url, s.cta_label, s.cta_href, s.position]);
  }
  console.log('  • homepage slides seeded');

  // Achievements
  const ach = [
    { year:2025, title:'Regional Science Fair Champions',  description:'Three first-place trophies at the Regional Science Fair.', icon:'trophy', position:1 },
    { year:2025, title:'100% Board Exam Pass Rate',        description:'All Grade 10 students passed the federal board exams with distinction.', icon:'medal', position:2 },
    { year:2024, title:'National Robotics Olympiad',       description:'Team qualified for the National Robotics Olympiad finals.', icon:'flask', position:3 },
    { year:2024, title:'Best School Award — City',         description:'Recognised by the City Education Board for academic excellence.', icon:'star', position:4 },
    { year:2023, title:'Inter-School Debate Champions',    description:'Senior debate team won the regional championship.', icon:'book', position:5 },
  ];
  for (const a of ach) {
    await db.query(
      `INSERT INTO achievements (year, title, description, icon, position, is_active)
       VALUES (?,?,?,?,?,1)
       ON DUPLICATE KEY UPDATE title=VALUES(title)`,
      [a.year, a.title, a.description, a.icon, a.position]);
  }
  console.log('  • achievements seeded');

  // Principal message (singleton)
  await db.query(
    `INSERT INTO principal_message (id, principal_name, designation, photo_url, message_body)
     VALUES (1, 'Dr. Ayesha Khan', 'Principal', NULL, ?)
     ON DUPLICATE KEY UPDATE message_body=VALUES(message_body)`,
    [`At City Public School, we believe every child carries a unique potential. Our role is to nurture that potential through rigorous academics, character education, and the kind of patient mentorship that turns curiosity into capability.

We are proud of the generations of alumni who have carried these values into medicine, engineering, the arts, public service, and entrepreneurship. Whether you are a parent considering admission, an alumnus reconnecting with old friends, or a member of the wider community — welcome, and please do reach out.`]);
  console.log('  • principal message seeded');

  // Job postings
  const jobs = [
    { title:'Mathematics Teacher (Grade 6–8)', department:'Academics',      location:'On-campus', employment_type:'full_time',
      description:'Plan and deliver engaging mathematics lessons for Grades 6–8 following the national curriculum. Contribute to academic events and mentor students.',
      requirements:'B.Ed or M.Ed in Mathematics. Minimum 2 years teaching experience. Strong English communication.',
      salary_range:'PKR 45,000 – 65,000 / month', days:30 },
    { title:'Computer Science Instructor',     department:'Academics',      location:'On-campus', employment_type:'full_time',
      description:'Teach introductory computer science and digital literacy to Grades 4–10. Maintain lab equipment and run an after-school coding club.',
      requirements:'BS in Computer Science or related. Teaching experience preferred but not required.',
      salary_range:'PKR 50,000 – 70,000 / month', days:21 },
    { title:'Accounts Officer',                department:'Administration', location:'On-campus', employment_type:'contract',
      description:'Manage fee collection records, generate monthly reports, coordinate with the accountant on challan preparation.',
      requirements:'B.Com / BBA. At least 1 year experience with accounting software.',
      salary_range:'PKR 30,000 – 40,000 / month', days:14 },
  ];
  for (const j of jobs) {
    await db.query(
      `INSERT INTO job_postings (title, department, location, employment_type, description, requirements, salary_range, apply_deadline, is_published, published_at)
       VALUES (?,?,?,?,?,?,?, DATE_ADD(CURDATE(), INTERVAL ? DAY), 1, NOW())
       ON DUPLICATE KEY UPDATE title=VALUES(title)`,
      [j.title, j.department, j.location, j.employment_type, j.description, j.requirements, j.salary_range, j.days]);
  }
  console.log('  • job postings seeded');

  // -------------------------------------------------------------------
  // Phase 2 (enhancement): time-sensitive announcements for the homepage.
  // -------------------------------------------------------------------
  const announcements = [
    { title:'Admissions for 2026 are now open',
      body:'Apply online for the upcoming academic session. Limited seats per grade.',
      link_label:'Apply now', link_href:'/admissions', severity:'success', days:30 },
    { title:'School closed on Monday for public holiday',
      body:'In observance of the public holiday, the school will remain closed on Monday. Classes resume Tuesday as usual.',
      link_label:'View academic calendar', link_href:'/news', severity:'warning', days:7 },
    { title:'Mid-term exam schedule released',
      body:'The mid-term exam schedule for all grades is now available on the notices board.',
      link_label:'Download schedule', link_href:'/news', severity:'info', days:14 },
  ];
  for (const a of announcements) {
    await db.query(
      `INSERT INTO announcements (title, body, link_label, link_href, severity,
         starts_at, ends_at, is_active, created_by)
       VALUES (?,?,?,?,?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 1, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), body=VALUES(body)`,
      [a.title, a.body, a.link_label, a.link_href, a.severity, a.days, userIds.admin]);
  }
  console.log('  • announcements seeded');

  console.log('\nSeed complete. Demo login: admin@school.test / Password123!');
  await db.end();
})().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
