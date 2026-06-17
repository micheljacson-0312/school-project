// Express app entry. Wires middleware, mounts routes, exposes a /health probe.
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { ping } = require('./db');

const authRoutes = require('./auth/routes');
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');
const teacherRoutes = require('./routes/teacher');
const parentRoutes = require('./routes/parent');
const coordinatorRoutes = require('./routes/coordinator');
const accountantRoutes = require('./routes/accountant');
const operatorRoutes = require('./routes/operator');
const alumniRoutes = require('./routes/alumni');
const publicRoutes = require('./routes/public');
const adminContentRoutes = require('./routes/adminContent');
const adminUsersRoutes = require('./routes/adminUsers');
const adminAcademicRoutes = require('./routes/adminAcademic');
const adminSystemRoutes = require('./routes/adminSystem');
const lmsRoutes = require('./routes/lms');
const teacherAttendanceRoutes = require('./routes/teacherAttendance');
const attendanceReportsRoutes = require('./routes/attendanceReports');
const resultsRoutes = require('./routes/results');
const evaluationRoutes = require('./routes/evaluation');
const notificationsRoutes = require('./routes/notifications');
const reportsRoutes = require('./routes/reports');
const fingerprintIntegration = require('./integrations/fingerprint');
const integrationsRouter = require('./integrations/router');
const pushRouter = require('./routes/push');

const app = express();

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                      // server-to-server
    if (config.cors.origin.includes(origin)) return cb(null, true);
    return cb(new Error('cors_blocked'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Login-specific rate limit (per IP).
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.rateLimit.loginPerMin,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited' },
});

app.get('/health', async (_req, res) => {
  try {
    await ping();
    res.json({ ok: true, env: config.env });
  } catch (e) {
    res.status(503).json({ ok: false, error: 'db_unreachable', detail: e.message });
  }
});

// --- Auth (rate-limited login) ---
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);

// --- Public website ---
app.use('/api/public', publicRoutes);

// --- Role-scoped portals ---
app.use('/api/admin',       adminRoutes);
app.use('/api/admin',       adminContentRoutes);
app.use('/api/admin',       adminUsersRoutes);
app.use('/api/admin',       adminAcademicRoutes);
app.use('/api/admin',       adminSystemRoutes);

// --- LMS (shared between student/teacher/parent based on perms) ---
app.use('/api/lms',         lmsRoutes);

// --- Phase 5: attendance reports, teacher attendance, results, evaluation, fingerprint ---
app.use('/api/teacher-attendance', teacherAttendanceRoutes);
app.use('/api/attendance-reports', attendanceReportsRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/evaluation', evaluationRoutes);
app.use('/api/integrations/fingerprint', fingerprintIntegration);
app.use('/api/integrations', integrationsRouter);
app.use('/api/push', pushRouter);
app.use('/api/coordinator', coordinatorRoutes);
app.use('/api/student',     studentRoutes);
app.use('/api/teacher',     teacherRoutes);
app.use('/api/parent',      parentRoutes);
app.use('/api/coordinator', coordinatorRoutes);
app.use('/api/accountant',  accountantRoutes);
app.use('/api/operator',    operatorRoutes);
app.use('/api/alumni',      alumniRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reports',     reportsRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));

// Centralised error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  if (err.message === 'cors_blocked') {
    return res.status(403).json({ error: 'cors_blocked' });
  }
  res.status(500).json({ error: 'internal_error', detail: err.message });
});

if (require.main === module) {
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`School platform API listening on http://localhost:${config.port}  (${config.env})`);
  });
}

module.exports = app;
