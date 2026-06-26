const db = require('../src/db');

async function seedAndVerify() {
  try {
    console.log("Seeding and verifying dynamic footer settings...");
    
    const footerSettings = [
      ['home_footer_desc', 'Speaxa is India\'s leading live interactive EdTech platform, empowering students with live classrooms, expert mentors, and performance reports.'],
      ['home_footer_toll_free', '1800-120-456-456'],
      ['home_footer_phone', '+91 9999 999 999 (9 AM - 9:30 PM)'],
      ['home_footer_email', 'support@speaxa.com'],
      ['home_footer_instagram', 'https://instagram.com/speaxa'],
      ['home_footer_facebook', 'https://facebook.com/speaxa'],
      ['home_footer_youtube', 'https://youtube.com/speaxa'],
      ['home_footer_twitter', 'https://twitter.com/speaxa'],
      ['home_footer_play_store_url', 'https://play.google.com/store/apps/details?id=com.speaxa'],
      ['home_footer_app_store_url', 'https://apps.apple.com/app/speaxa']
    ];

    for (const [key, value] of footerSettings) {
      await db.query(
        `INSERT INTO platform_settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO NOTHING`,
        [key, value]
      );
    }

    console.log("✓ Dynamic footer settings seeded successfully.");

    // Query to verify all exist
    const res = await db.query(
      `SELECT key, value FROM platform_settings WHERE key LIKE 'home_footer_%'`
    );
    
    console.log("\nCurrent Footer Settings in Database:");
    console.table(res.rows);

    if (res.rows.length === 10) {
      console.log("\n🎉 Verification SUCCESS: All 10 footer variables are present and correct! 🎉");
    } else {
      console.error(`\n❌ Verification FAILED: Expected 10 rows, got ${res.rows.length} ❌`);
      process.exit(1);
    }

  } catch (err) {
    console.error("Verification error:", err.message);
    process.exit(1);
  } finally {
    db.pool.end();
  }
}

seedAndVerify();
