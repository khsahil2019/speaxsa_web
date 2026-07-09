const nodemailer = require('nodemailer');
const db = require('../src/db');

async function debugSmtp() {
  const res = await db.query(
    "SELECT key, value FROM platform_settings WHERE key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass')"
  );
  const settings = {};
  res.rows.forEach(r => { settings[r.key] = r.value; });

  console.log('Host:', settings.smtp_host);
  console.log('Port:', settings.smtp_port);
  console.log('User:', settings.smtp_user);
  console.log('Pass Length:', settings.smtp_pass ? settings.smtp_pass.length : 0);

  const portsToTest = [
    { port: 587, secure: false },
    { port: 465, secure: true },
    { port: 2525, secure: false }
  ];

  for (const item of portsToTest) {
    console.log(`\nTesting ${settings.smtp_host}:${item.port} (secure=${item.secure})...`);
    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: item.port,
      secure: item.secure,
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_pass,
      },
      debug: true,
      logger: true
    });

    try {
      await transporter.verify();
      console.log(`>>> SUCCESS on port ${item.port}! SMTP Connection verified! <<<`);
    } catch (err) {
      console.error(`FAILED on port ${item.port}:`, err.message);
    }
  }

  process.exit(0);
}

debugSmtp();
