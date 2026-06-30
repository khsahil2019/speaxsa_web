const db = require('../src/db');

async function run() {
  try {
    console.log("Checking and adding demo_video_url column to batches table...");
    await db.query(`
      ALTER TABLE batches ADD COLUMN IF NOT EXISTS demo_video_url TEXT;
    `);
    console.log("✓ Success! Column demo_video_url added (or already existed).");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    db.pool.end();
  }
}

run();
