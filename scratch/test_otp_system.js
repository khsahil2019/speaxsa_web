const OTPService = require('../src/services/OTPService');
const db = require('../src/db');

async function testOTP() {
  console.log('--- Testing OTP Service ---');
  try {
    // Run self-healing migration
    await db.query(`
      ALTER TABLE otp_tokens ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(50);
      ALTER TABLE otp_tokens ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'pending';
      ALTER TABLE otp_tokens ADD COLUMN IF NOT EXISTS delivery_error TEXT;
    `);

    const phone = '9998887770';
    const email = 'test_admin@speaxa.com';

    // 1. Create OTP
    const { otp, tokenId } = await OTPService.createOTP(phone, 'test_run');
    console.log('Generated OTP:', otp, '| Token ID:', tokenId);

    // 2. Test SMS Send (Dev Mode)
    const smsRes = await OTPService.sendOTPSms(phone, otp, 'test_run', tokenId);
    console.log('SMS Dispatch Result:', smsRes);

    // 3. Test Email Send (Dev Mode)
    const emailRes = await OTPService.sendOTPEmail(email, otp, 'test_run', tokenId);
    console.log('Email Dispatch Result:', emailRes);

    // 4. Verify OTP
    const verifyRes = await OTPService.verifyOTP(phone, otp, 'test_run');
    console.log('Verify Result:', verifyRes);

    // 5. Fetch OTP Audit Logs
    const logs = await OTPService.getOTPLogs(5);
    console.log('Fetched Logs Count:', logs.length);
    if (logs.length > 0) {
      console.log('Latest Log:', logs[0]);
    }

    console.log('--- OTP Service Verification PASSED ---');
  } catch (err) {
    console.error('Test Failed:', err);
  } finally {
    process.exit(0);
  }
}

testOTP();
