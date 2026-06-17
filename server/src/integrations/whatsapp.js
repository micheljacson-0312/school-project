// WhatsApp integration — pluggable. Reads whatsapp_settings and dispatches.
//
// Providers:
//   - click_to_chat : no backend send; returns a wa.me URL the caller can
//                     share / open. This is what the public site uses
//                     today. Always available.
//   - meta_cloud     : Meta WhatsApp Cloud API (graph.facebook.com).
//                      Send a free-form text message via /messages endpoint.
//                      Requires phone_number_id + access token.
//   - twilio         : Twilio WhatsApp (reuses Twilio Messages API; same
//                      transport as SMS but with whatsapp: prefix on From).
//
// Every send returns { ok, status, provider, error?, url? } and is logged
// to integration_send_log.
const { pool } = require('../db');

async function loadSettings() {
  const [rows] = await pool.query(`SELECT * FROM whatsapp_settings WHERE id=1 LIMIT 1`);
  return rows[0] || null;
}

async function logSend({ provider, recipient, subject, payload, status, responseCode, error, actorId }) {
  try {
    await pool.query(
      `INSERT INTO integration_send_log (channel, provider, recipient, subject, payload_json, status, response_code, error_message, actor_id)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      ['whatsapp', provider, recipient || null, subject || null,
       payload ? JSON.stringify(payload).slice(0, 65000) : null,
       status, responseCode || null, error ? String(error).slice(0, 1000) : null,
       actorId || null]);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[whatsapp] failed to write integration log:', e.message);
  }
}

// Returns the wa.me click-to-chat URL (always works).
function buildClickToChatUrl(number, message) {
  const digits = String(number).replace(/[^0-9]/g, '');
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return digits ? `https://wa.me/${digits}${text}` : null;
}

async function sendViaMetaCloud(cfg, to, message, tokenPlain) {
  const url = `https://graph.facebook.com/${encodeURIComponent(cfg.api_version || 'v18.0')}/${encodeURIComponent(cfg.phone_number_id)}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: message, preview_url: true },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenPlain}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, status: 'failed', error: json?.error?.message || `http_${res.status}`, responseCode: String(res.status) };
  }
  return { ok: true, status: 'sent', messageId: json?.messages?.[0]?.id || null, responseCode: String(res.status) };
}

async function sendViaTwilioWhatsApp(cfg, to, message, authTokenPlain) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(cfg.account_sid || cfg.business_account_id)}/Messages.json`;
  const from = cfg.from_number ? `whatsapp:${cfg.from_number}` : (cfg.phone_number_id ? `whatsapp:${cfg.phone_number_id}` : null);
  if (!from) return { ok: false, status: 'failed', error: 'missing_from' };
  const body = new URLSearchParams({ To: `whatsapp:${to}`, From: from, Body: message });
  const auth = Buffer.from(`${cfg.account_sid || cfg.business_account_id}:${authTokenPlain}`).toString('base64');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, status: 'failed', error: json?.message || `http_${res.status}`, responseCode: String(res.status) };
  return { ok: true, status: 'sent', messageId: json?.sid || null, responseCode: String(res.status) };
}

async function send({ to, message, subject, actorId, buildUrlOnly }) {
  const cfg = await loadSettings();
  const provider = cfg?.provider || 'click_to_chat';

  // Always compute the click-to-chat URL — works regardless of provider.
  const url = buildClickToChatUrl(to, message);

  if (buildUrlOnly || provider === 'click_to_chat') {
    await logSend({ provider, recipient: to, subject: subject || null, payload: { url, message },
                    status: 'dry_run', actorId });
    return { ok: true, status: 'dry_run', provider, url };
  }
  if (!cfg.is_enabled) return { ok: false, status: 'skipped', provider, reason: 'whatsapp_disabled' };
  const tokenPlain = cfg.access_token_enc || null;
  if (!tokenPlain) return { ok: false, status: 'failed', provider, error: 'missing_credentials' };

  let result;
  try {
    if (provider === 'meta_cloud') result = await sendViaMetaCloud(cfg, to, message, tokenPlain);
    else if (provider === 'twilio') result = await sendViaTwilioWhatsApp(cfg, to, message, tokenPlain);
    else result = { ok: false, status: 'failed', error: `unsupported_whatsapp_provider: ${provider}` };
  } catch (e) {
    result = { ok: false, status: 'failed', error: e.message };
  }
  await logSend({ provider, recipient: to, subject: subject || null, payload: { url, message },
                  status: result.status, responseCode: result.responseCode, error: result.error, actorId });
  return { provider, url, ...result };
}

async function status() {
  const cfg = await loadSettings();
  return {
    enabled: !!cfg?.is_enabled,
    provider: cfg?.provider || 'click_to_chat',
    phone_number_id: cfg?.phone_number_id || null,
    click_to_chat_available: true,
  };
}

module.exports = { send, status, buildClickToChatUrl };
