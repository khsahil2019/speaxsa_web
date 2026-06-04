const db = require('../db');
const { generateOTP } = require('../utils/security');
const nodemailer = require('nodemailer');

/**
 * OTP Service — generates, stores, sends, and verifies OTPs
 * with DB-backed TTL (5 min by default).
 */

async function getOTPExpiry() {
  try {
    const res = await db.query("SELECT value FROM platform_settings WHERE key = 'otp_expiry_minutes'");
    return parseInt(res.rows[0]?.value || '5');
  } catch {
    return 5;
  }
}

async function createOTP(identifier, purpose = 'login') {
  const otp = generateOTP(6);
  const expiryMins = await getOTPExpiry();
  const expiresAt = new Date(Date.now() + expiryMins * 60 * 1000);

  // Invalidate any existing OTPs for this identifier + purpose
  await db.query(
    'UPDATE otp_tokens SET used = true WHERE identifier = $1 AND purpose = $2 AND used = false',
    [identifier, purpose]
  );

  await db.query(
    'INSERT INTO otp_tokens (identifier, otp, purpose, expires_at) VALUES ($1, $2, $3, $4)',
    [identifier, otp, purpose, expiresAt]
  );

  return { otp, expiresAt };
}

async function verifyOTP(identifier, otp, purpose = 'login') {
  const result = await db.query(
    `SELECT * FROM otp_tokens 
     WHERE identifier = $1 AND otp = $2 AND purpose = $3 
       AND used = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [identifier, otp, purpose]
  );

  if (result.rows.length === 0) {
    return { valid: false, error: 'Invalid or expired OTP' };
  }

  // Mark as used
  await db.query('UPDATE otp_tokens SET used = true WHERE id = $1', [result.rows[0].id]);
  return { valid: true };
}

async function sendOTPEmail(email, otp, purpose = 'login') {
  try {
    const settingsRes = await db.query(
      "SELECT key, value FROM platform_settings WHERE key IN ('smtp_host','smtp_port','smtp_user','smtp_pass','platform_name')"
    );
    const settings = {};
    settingsRes.rows.forEach(r => { settings[r.key] = r.value; });

    if (!settings.smtp_host || !settings.smtp_user) {
      // Log to console as fallback
      console.log(`========================================`);
      console.log(`[OTP Email] Email: ${email} | OTP: ${otp} | Purpose: ${purpose}`);
      console.log(`========================================`);
      return { sent: true, method: 'console' };
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: parseInt(settings.smtp_port || '587'),
      secure: parseInt(settings.smtp_port || '587') === 465,
      auth: { user: settings.smtp_user, pass: settings.smtp_pass },
    });

    const platformName = settings.platform_name || 'SPEAXSA';
    const subject = purpose === 'forgot_password' ? `${platformName} — Password Reset OTP` : `${platformName} — Your Login OTP`;

    await transporter.sendMail({
      from: `"${platformName}" <${settings.smtp_user}>`,
      to: email,
      subject,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
          <h2 style="color:#3CBDB0;">${platformName}</h2>
          <p>Your one-time password (OTP) is:</p>
          <div style="background:#f4f4f4;padding:20px;text-align:center;border-radius:8px;margin:20px 0;">
            <h1 style="letter-spacing:8px;color:#3CBDB0;font-size:36px;">${otp}</h1>
          </div>
          <p>This OTP is valid for 5 minutes. Do not share it with anyone.</p>
          <small style="color:#999;">If you didn't request this, please ignore this email.</small>
        </div>
      `,
    });

    return { sent: true, method: 'email' };
  } catch (err) {
    console.error('[OTPService] Email send failed:', err.message);
    console.log(`[OTP FALLBACK Email] Email: ${email} | OTP: ${otp}`);
    return { sent: true, method: 'console_fallback' };
  }
}

const https = require('https');

async function sendOTPSms(phone, otp, purpose = 'login') {
  try {
    const settingsRes = await db.query(
      "SELECT key, value FROM platform_settings WHERE key IN ('msg91_auth_key', 'msg91_template_id', 'msg91_sender_id', 'platform_name')"
    );
    const settings = {};
    settingsRes.rows.forEach(r => { settings[r.key] = r.value; });

    const authKey = settings.msg91_auth_key || process.env.MSG91_AUTH_KEY;
    const templateId = settings.msg91_template_id || process.env.MSG91_TEMPLATE_ID;
    const senderId = settings.msg91_sender_id || process.env.MSG91_SENDER_ID || 'SPXSA';

    if (!authKey || !templateId) {
      console.log(`========================================`);
      console.log(`[OTP SMS] Phone: ${phone} | OTP: ${otp} | Purpose: ${purpose}`);
      console.log(`========================================`);
      return { sent: true, method: 'console' };
    }

    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }

    const url = `https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=${formattedPhone}&authkey=${authKey}&otp=${otp}`;

    return new Promise((resolve) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.type === 'success') {
              console.log(`[OTPService] MSG91 SMS sent to ${formattedPhone} successfully`);
              resolve({ sent: true, method: 'sms' });
            } else {
              console.warn('[OTPService] MSG91 returned error:', response);
              resolve({ sent: true, method: 'console_fallback', error: response });
            }
          } catch {
            resolve({ sent: true, method: 'console_fallback' });
          }
        });
      }).on('error', (err) => {
        console.error('[OTPService] MSG91 request error:', err.message);
        resolve({ sent: true, method: 'console_fallback' });
      });
    });
  } catch (err) {
    console.error('[OTPService] SMS send failed:', err.message);
    console.log(`[OTP FALLBACK SMS] Phone: ${phone} | OTP: ${otp}`);
    return { sent: true, method: 'console_fallback' };
  }
}

module.exports = { createOTP, verifyOTP, sendOTPEmail, sendOTPSms };
