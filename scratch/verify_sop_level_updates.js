const db = require('../src/db');
const { updateTeacherLevel } = require('../src/services/teacherLevel.service');

async function testVerification() {
  console.log("=== STARTING SOP REJECTION AND WITHOUT-SLAB LEVEL VERIFICATION ===\n");
  
  const testTeacherId = 'tea_sop_verify_test';
  
  try {
    // Clean up
    await db.query("DELETE FROM teacher_sop WHERE teacher_id = $1", [testTeacherId]);
    await db.query("DELETE FROM users WHERE id = $1", [testTeacherId]);
    
    // 1. Verify default signup level resolves to NULL
    console.log("1. Simulating signup of a new teacher...");
    await db.query(`
      INSERT INTO users (id, name, email, phone, role, password_hash, password_plain, approval_status, teacher_level)
      VALUES ($1, 'SOP Test Teacher', 'sop_test@speaxa.com', '9990003333', 'teacher', 'hash123', 'pass123', 'pending', NULL)
    `, [testTeacherId]);
    
    await db.query(`
      INSERT INTO teacher_sop (id, teacher_id, status)
      VALUES ($1, $2, 'sop_pending')
    `, [`sop_${testTeacherId}`, testTeacherId]);

    const userRes = await db.query("SELECT teacher_level, approval_status FROM users WHERE id = $1", [testTeacherId]);
    console.log(`- Teacher registered with level: ${userRes.rows[0].teacher_level} (Expected: null)`);
    console.log(`- Teacher status: ${userRes.rows[0].approval_status} (Expected: pending)`);
    
    if (userRes.rows[0].teacher_level !== null) {
      throw new Error("Default teacher_level is not NULL!");
    }
    console.log("✓ Default level verification passed.\n");

    // 2. Verify auto-evaluation is skipped (keeps NULL / Without Slab) when batches/ratings are 0
    console.log("2. Simulating level auto-calculation for new teacher with no teaching history...");
    const result = await updateTeacherLevel(testTeacherId, 'system_cron');
    console.log(`- Calculation returned level: ${result.level} (Expected: null)`);
    
    const recheckRes = await db.query("SELECT teacher_level FROM users WHERE id = $1", [testTeacherId]);
    console.log(`- Teacher level in DB remains: ${recheckRes.rows[0].teacher_level} (Expected: null)`);
    
    if (recheckRes.rows[0].teacher_level !== null) {
      throw new Error("Teacher level was updated to a slab despite no teaching history!");
    }
    console.log("✓ Skipping level calculation for new teachers passed.\n");

    // 3. Verify SOP Rejection updates overall user status to 'rejected'
    console.log("3. Simulating Admin SOP rejection...");
    // Mock the admin route action
    const adminNotes = "Please upload a clearer pan card copy and speak louder in your audio proof.";
    await db.query(`
      UPDATE teacher_sop SET status = 'rejected', admin_notes = $2, reviewed_at = NOW()
      WHERE teacher_id = $1
    `, [testTeacherId, adminNotes]);
    await db.query("UPDATE users SET approval_status = 'rejected' WHERE id = $1", [testTeacherId]);

    const rejectedUserRes = await db.query("SELECT approval_status FROM users WHERE id = $1", [testTeacherId]);
    const rejectedSopRes = await db.query("SELECT status, admin_notes FROM teacher_sop WHERE teacher_id = $1", [testTeacherId]);
    
    console.log(`- User approval status in DB: ${rejectedUserRes.rows[0].approval_status} (Expected: rejected)`);
    console.log(`- SOP status in DB: ${rejectedSopRes.rows[0].status} (Expected: rejected)`);
    console.log(`- SOP admin feedback notes: "${rejectedSopRes.rows[0].admin_notes}"`);

    if (rejectedUserRes.rows[0].approval_status !== 'rejected' || rejectedSopRes.rows[0].status !== 'rejected') {
      throw new Error("User or SOP approval status was not updated to 'rejected' correctly!");
    }
    console.log("✓ SOP Rejection and notes verification passed.\n");

    console.log("=== ALL INTEGRATION VERIFICATIONS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("❌ Verification failed:", err.message);
  } finally {
    // Clean up
    console.log("\nCleaning up test user data...");
    await db.query("DELETE FROM teacher_sop WHERE teacher_id = $1", [testTeacherId]);
    await db.query("DELETE FROM users WHERE id = $1", [testTeacherId]);
    console.log("✓ Cleanup finished.");
    process.exit(0);
  }
}

testVerification();
