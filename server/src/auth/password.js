// Password hashing helpers. Uses bcryptjs (pure JS) for zero-build simplicity.
const bcrypt = require('bcryptjs');

const ROUNDS = 10;

async function hash(plain) {
  return bcrypt.hash(plain, ROUNDS);
}

async function verify(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

module.exports = { hash, verify };
