const nodemailer = require('nodemailer');
const db = require('../src/db');

async function testGmail() {
  const res = await db.query(
    "SELECT key, value FROM platform_settings WHERE key IN ('smtp_user', 'smtp_pass')"
  );
  const settings = {};
  res.rows.forEach(r => { settings[r.key] = r.value; });

  console.log('Testing smtp.gmail.com:587 with user:', settings.smtp_user);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: settings.smtp_user,
      pass: settings.smtp_pass,
    }
  });

  try {
    await transporter.verify();
    console.log('>>> GMAIL SMTP SUCCESS! Connection verified! <<<');
  } catch (err) {
    console.error('GMAIL SMTP FAILED:', err.message);
  }

  process.exit(0);
}

testGmail();
