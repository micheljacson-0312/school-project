// Centralised config loaded from .env. Throws if a required key is missing.
require('dotenv').config();

function required(name) {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required env var: ${name}. See server/.env.example`);
  }
  return v;
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'school_platform',
  },

  jwt: {
    accessSecret:  required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessTtl:     process.env.JWT_ACCESS_TTL  || '15m',
    refreshTtl:    process.env.JWT_REFRESH_TTL || '14d',
  },

  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
  },

  rateLimit: {
    loginPerMin: Number(process.env.LOGIN_RATE_LIMIT_PER_MIN || 10),
  },

  // 32-byte key used to encrypt mail passwords at rest. In production this
  // MUST come from env. Dev fallback lives in adminSystem.js.
  mail: {
    encryptionKey: process.env.MAIL_ENCRYPTION_KEY || '',
  },
};
