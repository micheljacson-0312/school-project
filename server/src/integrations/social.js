// Social media auto-posting — abstract posting service. Each platform has
// its own driver; new platforms are added by extending the dispatch table
// and adding an ENUM value to social_settings.platform.
//
// Drivers (all are HTTP POSTs to the platform's API):
//   - log       : dry-run — writes the intended post to console + log
//   - facebook  : Graph API page post (/PAGE_ID/feed)
//   - twitter   : v2 API /tweets
//   - linkedin  : UGC API / ugPosts
//   - instagram : Graph API media publish
//
// All drivers require an OAuth access token stored in social_settings.
// Calls return { ok, status, postId?, error? } and log to integration_send_log.
const { pool } = require('../db');

async function loadPlatformCfg(platform) {
  const [rows] = await pool.query(`SELECT * FROM social_settings WHERE platform=? LIMIT 1`, [platform]);
  return rows[0] || null;
}

async function logSend({ provider, recipient, subject, payload, status, responseCode, error, actorId }) {
  try {
    await pool.query(
      `INSERT INTO integration_send_log (channel, provider, recipient, subject, payload_json, status, response_code, error_message, actor_id)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      ['social', provider, recipient || null, subject || null,
       payload ? JSON.stringify(payload).slice(0, 65000) : null,
       status, responseCode || null, error ? String(error).slice(0, 1000) : null,
       actorId || null]);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[social] failed to write integration log:', e.message);
  }
}

async function postViaFacebook(cfg, text, link, token) {
  // POST /{page-id}/feed
  const url = `https://graph.facebook.com/v18.0/${encodeURIComponent(cfg.page_or_handle)}/feed`;
  const body = new URLSearchParams({ message: text, access_token: token });
  if (link) body.set('link', link);
  const res = await fetch(url, { method: 'POST', body });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.error) return { ok: false, status: 'failed', error: json?.error?.message || `http_${res.status}`, responseCode: String(res.status) };
  return { ok: true, status: 'sent', postId: json?.id, responseCode: String(res.status) };
}

async function postViaTwitter(cfg, text, token) {
  const url = 'https://api.twitter.com/2/tweets';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, status: 'failed', error: json?.detail || json?.title || `http_${res.status}`, responseCode: String(res.status) };
  return { ok: true, status: 'sent', postId: json?.data?.id, responseCode: String(res.status) };
}

async function postViaLinkedIn(cfg, text, link, token) {
  const url = 'https://api.linkedin.com/v2/ugcPosts';
  const body = {
    author: `urn:li:organization:${cfg.page_or_handle}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text }, shareMediaCategory: link ? 'ARTICLE' : 'NONE',
        media: link ? [{ status: 'READY', description: { text }, originalUrl: link }] : [],
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, status: 'failed', error: json?.message || `http_${res.status}`, responseCode: String(res.status) };
  return { ok: true, status: 'sent', postId: json?.id, responseCode: String(res.status) };
}

async function postViaInstagram(cfg, text, link, token) {
  // Instagram publishing requires a 2-step flow (create media, then publish).
  // Here we keep it simple: create a media object with caption + image_url.
  // Production should resolve the IG user id, create container, then publish.
  const url = `https://graph.facebook.com/v18.0/${encodeURIComponent(cfg.page_or_handle)}/media`;
  const body = new URLSearchParams({ caption: text, access_token: token });
  if (link) body.set('image_url', link);
  const res = await fetch(url, { method: 'POST', body });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.error) return { ok: false, status: 'failed', error: json?.error?.message || `http_${res.status}`, responseCode: String(res.status) };
  return { ok: true, status: 'queued', postId: json?.id, responseCode: String(res.status) };
}

async function post({ platform, text, link, actorId }) {
  const cfg = await loadPlatformCfg(platform);
  if (!cfg) throw new Error(`social_platform_not_configured: ${platform}`);
  if (!cfg.is_enabled) return { ok: false, status: 'skipped', provider: platform, reason: 'platform_disabled' };
  const token = cfg.access_token_enc || null;
  if (!token) return { ok: false, status: 'failed', provider: platform, error: 'missing_credentials' };

  const payload = { text, link, page: cfg.page_or_handle };

  if (platform === 'log') {
    // eslint-disable-next-line no-console
    console.log(`[social:log] ${platform} | ${cfg.page_or_handle}: ${text}${link ? ' ' + link : ''}`);
    await logSend({ provider: 'log', recipient: cfg.page_or_handle, subject: text, payload, status: 'dry_run', actorId });
    return { ok: true, status: 'dry_run', provider: 'log' };
  }

  let result;
  try {
    switch (platform) {
      case 'facebook':  result = await postViaFacebook(cfg, text, link, token); break;
      case 'twitter':   result = await postViaTwitter(cfg, text, token); break;
      case 'linkedin':  result = await postViaLinkedIn(cfg, text, link, token); break;
      case 'instagram': result = await postViaInstagram(cfg, text, link, token); break;
      default: return { ok: false, status: 'failed', error: `unsupported_social_platform: ${platform}` };
    }
  } catch (e) {
    result = { ok: false, status: 'failed', error: e.message };
  }
  await logSend({ provider: platform, recipient: cfg.page_or_handle, subject: text, payload,
                  status: result.status, responseCode: result.responseCode, error: result.error, actorId });
  return { provider: platform, ...result };
}

async function broadcast({ text, link, actorId, platforms }) {
  const targets = platforms && platforms.length ? platforms : ['facebook','twitter','linkedin','instagram'];
  const results = {};
  for (const p of targets) {
    if (p === 'log') continue; // skip log in real broadcast
    try {
      results[p] = await post({ platform: p, text, link, actorId });
    } catch (e) {
      results[p] = { ok: false, status: 'failed', error: e.message };
    }
  }
  return results;
}

async function status() {
  const [rows] = await pool.query(`SELECT platform, is_enabled, page_or_handle FROM social_settings`);
  return { platforms: rows };
}

module.exports = { post, broadcast, status };
