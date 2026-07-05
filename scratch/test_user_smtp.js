const db = require('../src/db');
const OTPService = require('../src/services/OTPService');

async function testUserSmtp() {
  console.log('--- Inspecting Platform Settings for SMTP & OTP ---');
  try {
    const res = await db.query(
      "SELECT key, value FROM platform_settings WHERE key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'sms_provider', 'email_provider')"
    );
    const settings = {};
    res.rows.forEach(r => { settings[r.key] = r.value; });

    console.log('Current Email Provider:', settings.email_provider || 'not set');
    console.log('SMTP Host:', settings.smtp_host || 'EMPTY');
    console.log('SMTP Port:', settings.smtp_port || 'EMPTY');
    console.log('SMTP User:', settings.smtp_user || 'EMPTY');
    console.log('SMTP Pass:', settings.smtp_pass ? '••••••••' : 'EMPTY');
    console.log('Current SMS Provider:', settings.sms_provider || 'not set');

    if (settings.smtp_host && settings.smtp_user) {
      console.log('\nAttempting live SMTP Email test to user email...');
      const targetEmail = settings.smtp_user; // Send test to SMTP user email
      const { otp, tokenId } = await OTPService.createOTP(targetEmail, 'live_smtp_test');
      console.log(`Generated OTP (${otp}), sending to ${targetEmail}...`);

      const result = await OTPService.sendOTPEmail(targetEmail, otp, 'live_smtp_test', tokenId);
      console.log('SMTP Send Result:', JSON.stringify(result, null, 2));
    } else {
      console.log('\n[INFO] SMTP host or user is not configured yet in platform_settings.');
    }
  } catch (err) {
    console.error('Error testing SMTP:', err.message);
  } finally {
    process.exit(0);
  }
}

testUserSmtp();
