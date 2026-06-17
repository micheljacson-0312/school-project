// Mail transport — pluggable. Reads mail_settings and dispatches based on
// driver. nodemailer is lazy-loaded so the dependency is optional.
//
// Drivers:
//   - smtp     : nodemailer SMTP transport (host/port/user/pass from settings)
//   - ses      : nodemailer SES transport (AWS SES)
//   - mailgun  : nodemailer Mailgun transport
//   - postmark : nodemailer Postmark transport
//   - sendmail : nodemailer sendmail transport (system sendmail)
//   - log      : dry-run — writes to console + integration_send_log (default in dev)
//
// Every send returns { ok, status, provider, error? } and is logged to
// integration_send_log for observability.
const { pool } = require('../db');

let nodemailer = null;
function loadNodemailer() {
  if (nodemailer) return nodemailer;
  try { nodemailer = require('nodemailer'); } catch (e) {
    nodemailer = { _missing: true, reason: e.message };
  }
  return nodemailer;
}

async function loadSettings() {
  const [rows] = await pool.query(`SELECT * FROM mail_settings WHERE id=1 LIMIT 1`);
  return rows[0] || null;
}

async function logSend({ provider, recipient, subject, payload, status, responseCode, error, actorId }) {
  try {
    await pool.query(
      `INSERT INTO integration_send_log (channel, provider, recipient, subject, payload_json, status, response_code, error_message, actor_id)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      ['email', provider, recipient || null, subject || null,
       payload ? JSON.stringify(payload).slice(0, 65000) : null,
       status, responseCode || null, error ? String(error).slice(0, 1000) : null,
       actorId || null]);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[mail] failed to write integration log:', e.message);
  }
}

async function sendWithSmtpOrHttp(cfg, message) {
  const nm = loadNodemailer();
  if (nm._missing) throw new Error('nodemailer_not_installed: run `npm i nodemailer` in server/');

  let transport;
  switch (cfg.driver) {
    case 'smtp':
      transport = nm.createTransport({
        host: cfg.host, port: cfg.port || 587, secure: !!cfg.use_ssl,
        auth: cfg.smtp_user ? { user: cfg.smtp_user, pass: cfg.smtp_pass } : undefined,
      });
      break;
    case 'ses':
      transport = nm.createTransport({
        SES: { /* expects AWS SDK in the user's project */ },
      });
      break;
    case 'mailgun':
      transport = nm.createTransport({
        host: cfg.smtp_host || 'smtp.mailgun.org',
        port: 587, secure: false,
        auth: { user: cfg.smtp_user || 'api', pass: cfg.smtp_pass },
      });
      break;
    case 'postmark':
      transport = nm.createTransport({
        host: 'smtp.postmarkapp.com', port: 587, secure: false,
        auth: { user: cfg.smtp_user || cfg.postmark_token, pass: cfg.postmark_token },
      });
      break;
    case 'sendmail':
      transport = nm.createTransport({ sendmail: true, newline: 'unix', path: '/usr/sbin/sendmail' });
      break;
    default:
      throw new Error(`unsupported_mail_driver: ${cfg.driver}`);
  }
  return transport.sendMail(message);
}

async function send({ to, subject, text, html, actorId }) {
  const cfg = await loadSettings();
  if (!cfg) throw new Error('mail_not_configured');
  if (!cfg.is_enabled) return { ok: false, status: 'skipped', provider: cfg.driver, reason: 'mail_disabled' };

  const message = {
    from: cfg.from_name ? `${cfg.from_name} <${cfg.from_address}>` : cfg.from_address,
    to, subject, text, html,
    replyTo: cfg.reply_to || undefined,
  };

  if (cfg.driver === 'log') {
    // eslint-disable-next-line no-console
    console.log(`[mail:log] ${message.from} → ${to} | ${subject}\n${text || html || ''}`);
    await logSend({ provider: 'log', recipient: to, subject, payload: message, status: 'dry_run', actorId });
    return { ok: true, status: 'dry_run', provider: 'log' };
  }

  try {
    const info = await sendWithSmtpOrHttp(cfg, message);
    const code = info?.messageId || info?.response?.statusCode || 'sent';
    await logSend({ provider: cfg.driver, recipient: to, subject, payload: message,
                    status: 'sent', responseCode: String(code), actorId });
    return { ok: true, status: 'sent', provider: cfg.driver, messageId: info?.messageId || null };
  } catch (e) {
    await logSend({ provider: cfg.driver, recipient: to, subject, payload: message,
                    status: 'failed', error: e.message, actorId });
    return { ok: false, status: 'failed', provider: cfg.driver, error: e.message };
  }
}

async function status() {
  const cfg = await loadSettings();
  const nm = loadNodemailer();
  return {
    enabled: !!cfg?.is_enabled,
    driver: cfg?.driver || 'log',
    from: cfg?.from_address || null,
    nodemailer_available: !nm._missing,
    last_send: null, // could be fetched from integration_send_log if needed
  };
}

module.exports = { send, status };
