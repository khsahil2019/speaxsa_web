const nodemailer = require('nodemailer');
const db = require('../src/db');

async function testFromHeader() {
  const res = await db.query(
    "SELECT key, value FROM platform_settings WHERE key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'support_email')"
  );
  const settings = {};
  res.rows.forEach(r => { settings[r.key] = r.value; });

  const transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port: parseInt(settings.smtp_port || '587', 10),
    secure: false,
    auth: { user: settings.smtp_user, pass: settings.smtp_pass },
  });

  const targetEmail = 'job72445@gmail.com';
  const fromEmail = 'sahilkh3014@gmail.com'; // Verified Brevo Sender Email

  console.log(`Sending email from "${fromEmail}" to "${targetEmail}" via Brevo...`);

  try {
    const info = await transporter.sendMail({
      from: `"SPEAXA" <${fromEmail}>`,
      to: targetEmail,
      subject: 'SPEAXA — Your Live Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #0d7a6d;">SPEAXA Platform</h2>
          <p>Your one-time password (OTP) is:</p>
          <div style="background: #f1f5f9; padding: 15px; text-align: center; border-radius: 8px;">
            <h1 style="letter-spacing: 6px; color: #0d7a6d; font-size: 36px; margin: 0;">948201</h1>
          </div>
          <p style="font-size: 12px; color: #64748b; margin-top: 15px;">Valid for 5 minutes.</p>
        </div>
      `
    });

    console.log('>>> SUCCESS! Email Accepted by Brevo! <<<');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (err) {
    console.error('Send failed:', err.message);
  }

  process.exit(0);
}

testFromHeader();
