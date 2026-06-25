const db = require('../src/db');
const SystemConfigService = require('../src/services/SystemConfigService');

async function runVerification() {
  console.log("=== STARTING 9-LEVEL TEACHER PAYOUT SYSTEM VERIFICATION ===\n");
  
  const tempTeacherJuniorId = 'tea_test_level_junior';
  const tempTeacherProfId = 'tea_test_level_prof';

  try {
    // 1. Save original settings
    const origJunior = await SystemConfigService.getSetting('payout_pct_Junior_Teacher', '50.00');
    const origProf = await SystemConfigService.getSetting('payout_pct_Professor', '75.00');
    console.log(`Original settings - Junior Teacher: ${origJunior}%, Professor: ${origProf}%`);

    // 2. Configure level-wise direct payout shares
    console.log("Updating level payout percentages in settings...");
    await SystemConfigService.updateConfig('payout_pct_Junior_Teacher', '55.00');
    await SystemConfigService.updateConfig('payout_pct_Professor', '78.00');

    // Verify settings updated
    const newJunior = await SystemConfigService.getSetting('payout_pct_Junior_Teacher');
    const newProf = await SystemConfigService.getSetting('payout_pct_Professor');
    console.log(`New configuration - Junior Teacher: ${newJunior}%, Professor: ${newProf}%`);

    if (parseFloat(newJunior) !== 55.0 || parseFloat(newProf) !== 78.0) {
      throw new Error("Failed to update settings in platform_settings.");
    }
    console.log("✓ Settings updated successfully.\n");

    // 3. Create test users with different levels
    console.log("Inserting temporary test teacher accounts...");
    
    // Clean up if there are leftover accounts
    await db.query("DELETE FROM users WHERE id IN ($1, $2)", [tempTeacherJuniorId, tempTeacherProfId]);

    // Insert Junior Teacher
    await db.query(`
      INSERT INTO users (id, name, email, phone, role, password_hash, password_plain, approval_status, teacher_level)
      VALUES ($1, 'Test Teacher Junior', 'test_junior@speaxa.com', '9990001111', 'teacher', 'hash123', 'pass123', 'approved', 'Junior Teacher')
    `, [tempTeacherJuniorId]);

    // Insert Professor
    await db.query(`
      INSERT INTO users (id, name, email, phone, role, password_hash, password_plain, approval_status, teacher_level)
      VALUES ($1, 'Test Teacher Professor', 'test_prof@speaxa.com', '9990002222', 'teacher', 'hash123', 'pass123', 'approved', 'Professor')
    `, [tempTeacherProfId]);

    console.log("✓ Test teacher accounts inserted.\n");

    // 4. Test calculation for Junior Teacher
    console.log("Calculating course split for Junior Teacher (55%)...");
    const amount = 1000.00; // Rs. 1000
    
    // Simulate query in payments.js
    const juniorTeacherRes = await db.query("SELECT teacher_level FROM users WHERE id = $1", [tempTeacherJuniorId]);
    const juniorLevel = juniorTeacherRes.rows[0]?.teacher_level || 'Junior Teacher';
    const juniorLevelKey = `payout_pct_${juniorLevel.replace(' ', '_')}`;
    
    const juniorPct = parseFloat(await SystemConfigService.getSetting(juniorLevelKey, 50.0));
    const juniorTeacherShare = (amount * juniorPct) / 100;
    const juniorPlatformShare = amount - juniorTeacherShare;
    
    console.log(`Junior Teacher: Level: ${juniorLevel}, Key: ${juniorLevelKey}, Pct: ${juniorPct}%`);
    console.log(`Calculation for Rs.${amount}: Teacher Share: Rs.${juniorTeacherShare}, Platform Share: Rs.${juniorPlatformShare}`);
    
    if (juniorTeacherShare !== 550.0 || juniorPlatformShare !== 450.0) {
      throw new Error(`Invalid split for Junior Teacher. Expected 550/450, got ${juniorTeacherShare}/${juniorPlatformShare}`);
    }
    console.log("✓ Junior Teacher calculation verified successfully!\n");

    // 5. Test calculation for Professor
    console.log("Calculating course split for Professor (78%)...");
    
    const profTeacherRes = await db.query("SELECT teacher_level FROM users WHERE id = $1", [tempTeacherProfId]);
    const profLevel = profTeacherRes.rows[0]?.teacher_level || 'Professor';
    const profLevelKey = `payout_pct_${profLevel.replace(' ', '_')}`;
    
    const profPct = parseFloat(await SystemConfigService.getSetting(profLevelKey, 75.0));
    const profTeacherShare = (amount * profPct) / 100;
    const profPlatformShare = amount - profTeacherShare;
    
    console.log(`Professor teacher: Level: ${profLevel}, Key: ${profLevelKey}, Pct: ${profPct}%`);
    console.log(`Calculation for Rs.${amount}: Teacher Share: Rs.${profTeacherShare}, Platform Share: Rs.${profPlatformShare}`);
    
    if (profTeacherShare !== 780.0 || profPlatformShare !== 220.0) {
      throw new Error(`Invalid split for Professor. Expected 780/220, got ${profTeacherShare}/${profPlatformShare}`);
    }
    console.log("✓ Professor calculation verified successfully!\n");

    // 6. Restore original configuration
    console.log("Restoring original configuration...");
    await SystemConfigService.updateConfig('payout_pct_Junior_Teacher', origJunior);
    await SystemConfigService.updateConfig('payout_pct_Professor', origProf);
    console.log("✓ Original settings restored successfully.");

  } catch (err) {
    console.error("❌ Verification failed:", err);
  } finally {
    // 7. Clean up test users
    console.log("\nCleaning up test user accounts...");
    await db.query("DELETE FROM users WHERE id IN ($1, $2)", [tempTeacherJuniorId, tempTeacherProfId]);
    console.log("✓ Cleanup finished.");
    process.exit(0);
  }
}

runVerification();
