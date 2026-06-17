// Migration runner. Reads *.sql files in /server/migrations alphabetically
// and executes each. Creates the database first if missing.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config');

(async () => {
  // 1) Connect without a database to create it if missing.
  const bootstrap = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
  });
  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await bootstrap.end();
  console.log(`  • ensured database \`${config.db.database}\` exists`);

  // 2) Connect to the database and run migrations.
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true,
  });

  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    process.stdout.write(`  • applying ${file} ... `);
    await conn.query(sql);
    process.stdout.write('ok\n');
  }
  await conn.end();
  console.log('Migrations complete.');
})().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
