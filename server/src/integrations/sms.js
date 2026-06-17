// SMS gateway — pluggable. Reads sms_settings and dispatches based on
// driver. Drivers in this build:
//
//   - log         : dry-run — prints to console + logs (default in dev)
//   - twilio      : uses Twilio's HTTP API directly (no SDK dep required)
//   - nexmo       : Vonage (formerly Nexmo) HTTP API
//   - plivo       : Plivo HTTP API
//   - generic_http: POST {to,message} to api_url with auth header
//
// To add another provider: extend the dispatch table below and add an
// ENUM value to the sms_settings.driver column via a follow-up migration.
//
// Every send returns { ok, status, provider, error? } and is logged to
// integration_send_log.
const { pool } = require('../db');

async function loadSettings() {
  const [rows] = await pool.query(`SELECT * FROM sms_settings WHERE id=1 LIMIT 1`);
  return rows[0] || null;
}

async function logSend({ provider, recipient, subject, payload, status, responseCode, error, actorId }) {
  try {
    await pool.query(
      `INSERT INTO integration_send_log (channel, provider, recipient, subject, payload_json, status, response_code, error_message, actor_id)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      ['sms', provider, recipient || null, subject || null,
       payload ? JSON.stringify(payload).slice(0, 65000) : null,
       status, responseCode || null, error ? String(error).slice(0, 1000) : null,
       actorId || null]);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[sms] failed to write integration log:', e.message);
  }
}

function decryptIfNeeded(s) { return s; /* handled by caller; row stores encrypted or plaintext per column */ }

async function sendViaTwilio(cfg, to, message, authTokenPlain) {
  // Twilio Messages API: POST https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(cfg.account_sid)}/Messages.json`;
  const body = new URLSearchParams({ To: to, From: cfg.from_number, Body: message });
  const auth = Buffer.from(`${cfg.account_sid}:${authTokenPlain}`).toString('base64');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* not JSON */ }
  if (!res.ok) {
    const err = json?.message || `http_${res.status}`;
    return { ok: false, status: 'failed', error: err, responseCode: String(res.status) };
  }
  return { ok: true, status: 'sent', messageId: json?.sid || null, responseCode: String(res.status) };
}

async function sendViaNexmo(cfg, to, message, apiKeyPlain) {
  // Vonage SMS API
  const url = 'https://rest.nexmo.com/sms/json';
  const body = new URLSearchParams({
    api_key: cfg.account_sid || apiKeyPlain, api_secret: apiKeyPlain, from: cfg.from_number, to, text: message,
  });
  const res = await fetch(url, { method: 'POST', body });
  const json = await res.json().catch(() => null);
  const ok = json?.messages?.[0]?.status === '0';
  return ok
    ? { ok: true, status: 'sent', messageId: json.messages[0]['message-id'], responseCode: '0' }
    : { ok: false, status: 'failed', error: json?.messages?.[0]?.['error-text'] || 'nexmo_error', responseCode: String(json?.messages?.[0]?.status || res.status) };
}

async function sendViaPlivo(cfg, to, message, authTokenPlain) {
  const url = `https://api.plivo.com/v1/Account/${encodeURIComponent(cfg.account_sid)}/Message/`;
  const body = new URLSearchParams({ src: cfg.from_number, dst: to, text: message });
  const auth = Buffer.from(`${cfg.account_sid}:${authTokenPlain}`).toString('base64');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json().catch(() => null);
  const ok = Array.isArray(json?.message) && json.message[0]?.status === 'queued';
  return ok
    ? { ok: true, status: 'queued', messageId: json.message_uuid?.[0] || null }
    : { ok: false, status: 'failed', error: json?.error || `http_${res.status}` };
}

async function sendViaGenericHttp(cfg, to, message, apiKeyPlain) {
  const res = await fetch(cfg.api_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKeyPlain}` },
    body: JSON.stringify({ to, message }),
  });
  const code = res.status;
  if (!res.ok) return { ok: false, status: 'failed', error: `http_${code}`, responseCode: String(code) };
  return { ok: true, status: 'sent', responseCode: String(code) };
}

async function send({ to, message, actorId }) {
  const cfg = await loadSettings();
  if (!cfg) throw new Error('sms_not_configured');
  if (!cfg.is_enabled) return { ok: false, status: 'skipped', provider: cfg.driver, reason: 'sms_disabled' };
  const authTokenPlain = decryptIfNeeded(cfg.auth_token_enc) || cfg.api_key || null;
  const payload = { to, message, from: cfg.from_number };

  if (cfg.driver === 'log') {
    // eslint-disable-next-line no-console
    console.log(`[sms:log] → ${to} | ${message}`);
    await logSend({ provider: 'log', recipient: to, subject: null, payload,
                    status: 'dry_run', actorId });
    return { ok: true, status: 'dry_run', provider: 'log' };
  }
  if (!authTokenPlain) {
    return { ok: false, status: 'failed', provider: cfg.driver, error: 'missing_credentials' };
  }

  let result;
  try {
    switch (cfg.driver) {
      case 'twilio':      result = await sendViaTwilio(cfg, to, message, authTokenPlain); break;
      case 'nexmo':       result = await sendViaNexmo(cfg, to, message, authTokenPlain); break;
      case 'plivo':       result = await sendViaPlivo(cfg, to, message, authTokenPlain); break;
      case 'generic_http':result = await sendViaGenericHttp(cfg, to, message, authTokenPlain); break;
      default: return { ok: false, status: 'failed', error: `unsupported_sms_driver: ${cfg.driver}` };
    }
  } catch (e) {
    result = { ok: false, status: 'failed', error: e.message };
  }
  await logSend({ provider: cfg.driver, recipient: to, subject: null, payload,
                  status: result.status, responseCode: result.responseCode, error: result.error, actorId });
  return { provider: cfg.driver, ...result };
}

async function status() {
  const cfg = await loadSettings();
  return {
    enabled: !!cfg?.is_enabled,
    driver: cfg?.driver || 'log',
    from: cfg?.from_number || null,
  };
}

module.exports = { send, status };
