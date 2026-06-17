// AES-256-GCM helpers for encrypting provider credentials at rest.
// Key must come from MAIL_ENCRYPTION_KEY env var (32-byte hex / 64 chars).
// In dev with no key, uses a fixed fallback (adminSystem uses the same).
const crypto = require('crypto');

function getKey() {
  const env = process.env.MAIL_ENCRYPTION_KEY;
  if (env && /^[0-9a-fA-F]{64}$/.test(env)) return Buffer.from(env, 'hex');
  // Dev fallback: same value adminSystem.js uses. NOT for production.
  return Buffer.from('dev-only-mail-encryption-key-do-not-use-in-production'.padEnd(32, '!').slice(0, 32));
}

function encrypt(plain) {
  if (plain == null || plain === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
}

function decrypt(blob) {
  if (!blob) return null;
  const [ivHex, tagHex, ctHex] = String(blob).split(':');
  if (!ivHex || !tagHex || !ctHex) return null;
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const ct = Buffer.from(ctHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

module.exports = { encrypt, decrypt };
