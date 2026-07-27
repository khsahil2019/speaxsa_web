require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

async function runMigrations() {
  console.log('====================================');
  console.log(' SPEAXA Production Database Migrator');
  console.log('====================================');

  try {
    // 1. Ensure tracking table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[INFO] Migration tracking table "schema_migrations" verified.');

    // 2. Fetch already executed migrations
    const executedRes = await db.query('SELECT name FROM schema_migrations');
    const executedSet = new Set(executedRes.rows.map(r => r.name));

    // 3. Read migration files from database/migrations/
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('[INFO] No migration files found in database/migrations/.');
      console.log('====================================');
      return;
    }

    let appliedCount = 0;

    for (const file of files) {
      if (executedSet.has(file)) {
        console.log(`[SKIP] ${file} (already applied)`);
        continue;
      }

      console.log(`[APPLYING] ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Run migration inside transaction
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[SUCCESS] ${file} applied successfully.`);
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[ERROR] Migration ${file} failed! Rolling back changes.`);
        console.error(err);
        throw err;
      } finally {
        client.release();
      }
    }

    console.log('====================================');
    if (appliedCount > 0) {
      console.log(`✅ Success: ${appliedCount} new migration(s) applied. All existing data intact.`);
    } else {
      console.log('✨ All migrations up to date. Existing production data intact.');
    }
    console.log('====================================');
  } catch (err) {
    console.error('❌ Migration process aborted:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations().then(() => {
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
}

module.exports = runMigrations;
