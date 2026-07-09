const db = require('../src/db');

async function fixBrevoUser() {
  await db.query("INSERT INTO platform_settings (key, value) VALUES ('smtp_user', 'b0d56b001@smtp-brevo.com') ON CONFLICT (key) DO UPDATE SET value = 'b0d56b001@smtp-brevo.com'");
  console.log('Updated smtp_user to b0d56b001@smtp-brevo.com');
  process.exit(0);
}

fixBrevoUser();
