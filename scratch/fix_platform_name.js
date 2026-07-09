const db = require('../src/db');

async function fixPlatformName() {
  await db.query("UPDATE platform_settings SET value = 'SPEAXA' WHERE key = 'platform_name'");
  console.log("Updated platform_name to 'SPEAXA'");
  process.exit(0);
}

fixPlatformName();
