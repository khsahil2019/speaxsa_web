const db = require('../src/db');

async function fixSettings() {
  await db.query(`
    INSERT INTO platform_settings (key, value) VALUES 
      ('email_provider', 'smtp'),
      ('sms_provider', 'dev'),
      ('dev_otp_in_response', 'true')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  `);
  console.log('Updated platform_settings: email_provider = smtp, sms_provider = dev');
  process.exit(0);
}

fixSettings();
