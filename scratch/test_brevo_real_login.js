const db = require('../src/db');
const OTPService = require('../src/services/OTPService');

async function testRealBrevoLogin() {
  console.log('--- Updating SMTP User to Brevo Login: b0d56b001@smtp-brevo.com ---');
  await db.query("UPDATE platform_settings SET value = 'b0d56b001@smtp-brevo.com' WHERE key = 'smtp_user'");

  const res = await db.query(
    "SELECT key, value FROM platform_settings WHERE key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass')"
  );
  const settings = {};
  res.rows.forEach(r => { settings[r.key] = r.value; });

  console.log('Host:', settings.smtp_host);
  console.log('Port:', settings.smtp_port);
  console.log('User:', settings.smtp_user);
  console.log('Pass Length:', settings.smtp_pass ? settings.smtp_pass.length : 0);

  const { otp, tokenId } = await OTPService.createOTP('job72445@gmail.com', 'live_brevo_test');
  console.log('Sending test email to job72445@gmail.com with OTP:', otp);

  const result = await OTPService.sendOTPEmail('job72445@gmail.com', otp, 'live_brevo_test', tokenId);
  console.log('DISPATCH RESULT:', JSON.stringify(result, null, 2));

  process.exit(0);
}

testRealBrevoLogin();
