// Verification script for Phase 1 logic that doesn't require a DB.
// Tests: password hashing roundtrip, JWT signing/verification,
// RBAC catalog integrity (every role's perms exist in catalog).
require('dotenv').config({ path: __dirname + '/../.env.example' });
// Force the env config to load without throwing on missing JWT secrets.
process.env.JWT_ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || 'test-access';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh';

const assert = require('assert');
const { hash, verify } = require('../src/auth/password');
const { signAccessToken, verifyAccessToken, newRefreshTokenValue, hashToken } = require('../src/auth/jwt');

(async () => {
  // 1. Password hash roundtrip
  const h = await hash('Hello123!');
  assert.ok(await verify('Hello123!', h), 'password should verify');
  assert.ok(!(await verify('Wrong', h)), 'wrong password should fail');
  console.log('  • password hash roundtrip OK');

  // 2. JWT access token
  const t = signAccessToken({ userId: 42, roleKey: 'teacher', sessionId: 'sess-1' });
  const claims = verifyAccessToken(t);
  assert.strictEqual(claims.sub, 42);
  assert.strictEqual(claims.role, 'teacher');
  assert.strictEqual(claims.typ, 'access');
  console.log('  • JWT access token sign/verify OK');

  // 3. Refresh token shape (no DB, just helper output)
  const v = newRefreshTokenValue();
  assert.strictEqual(v.length, 96);                       // 48 bytes hex
  assert.strictEqual(hashToken(v).length, 64);            // sha256 hex
  console.log('  • refresh token helpers OK');

  // 4. RBAC catalog integrity
  // Re-load the seed module's data without invoking its DB calls.
  const seedSrc = require('fs').readFileSync(__dirname + '/seed.js', 'utf8');
  const permMatches = [...seedSrc.matchAll(/key:\s*'([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)+)'/g)].map(m => m[1]);
  const uniquePerms = [...new Set(permMatches)];
  console.log(`  • parsed ${uniquePerms.length} permission keys from seed.js`);

  // Extract role-perm arrays (rough heuristic; we know the structure).
  const rolePerms = {
    admin:       'all (denoted by "*")',
    coordinator: extractPermList(seedSrc, 'coordinator:'),
    teacher:     extractPermList(seedSrc, 'teacher:'),
    student:     extractPermList(seedSrc, 'student:'),
    parent:      extractPermList(seedSrc, 'parent:'),
    accountant:  extractPermList(seedSrc, 'accountant:'),
    operator:    extractPermList(seedSrc, 'operator:'),
    alumni:      extractPermList(seedSrc, 'alumni:'),
  };
  for (const [role, list] of Object.entries(rolePerms)) {
    if (list === 'all (denoted by "*")') continue;
    const missing = list.filter(p => !uniquePerms.includes(p));
    assert.strictEqual(missing.length, 0, `Role ${role} references unknown permissions: ${missing.join(', ')}`);
  }
  console.log('  • every role→permission reference resolves in the catalog');

  // 5. Route mount: every router in server/src/routes/ has at least one handler.
  const fs = require('fs');
  const path = require('path');
  const routesDir = path.join(__dirname, '..', 'src', 'routes');
  for (const f of fs.readdirSync(routesDir)) {
    const src = fs.readFileSync(path.join(routesDir, f), 'utf8');
    assert.ok(/router\.(get|post|put|patch|delete)\(/.test(src), `routes/${f} defines no router handlers`);
  }
  console.log('  • every role router file defines handlers');

  console.log('\nVerification complete.');
})().catch(err => { console.error(err); process.exit(1); });

// Helper: extract a single-line array of permission keys between two markers.
function extractPermList(src, startMarker) {
  const i = src.indexOf(startMarker);
  if (i < 0) return [];
  const slice = src.slice(i, i + 1500);
  const m = slice.match(/\[([^\]]+)\]/);
  if (!m) return [];
  return [...m[1].matchAll(/'([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)+)'/g)].map(x => x[1]);
}
