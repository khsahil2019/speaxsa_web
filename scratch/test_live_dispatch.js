const OTPService = require('../src/services/OTPService');

async function testLiveDispatch() {
  const emails = ['job72445@gmail.com', 'sahilkh3014@gmail.com'];

  for (const email of emails) {
    console.log(`Sending live OTP email to ${email}...`);
    const { otp, tokenId } = await OTPService.createOTP(email, 'test_live');
    const res = await OTPService.sendOTPEmail(email, otp, 'test_live', tokenId);
    console.log(`Result for ${email}:`, res);
  }

  process.exit(0);
}

testLiveDispatch();
