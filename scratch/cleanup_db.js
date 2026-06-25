const db = require('../src/db');

async function cleanup() {
  try {
    const res = await db.query("SELECT id FROM users WHERE email LIKE '%@example.com'");
    const ids = res.rows.map(r => r.id);
    if (ids.length > 0) {
      console.log(`Found ${ids.length} lingering test users. Cleaning up...`);
      await db.query("DELETE FROM audit_logs WHERE actor_id = ANY($1) OR target_id = ANY($1)", [ids]);
      await db.query("DELETE FROM teacher_sop WHERE teacher_id = ANY($1)", [ids]);
      await db.query("DELETE FROM teacher_wallet WHERE teacher_id = ANY($1)", [ids]);
      await db.query("DELETE FROM users WHERE id = ANY($1)", [ids]);
      console.log("✓ Lingering test users cleaned up successfully.");
    } else {
      console.log("No lingering test users found.");
    }
  } catch (err) {
    console.error("Cleanup error:", err.message);
  } finally {
    db.pool.end();
  }
}

cleanup();
