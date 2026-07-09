const db = require('../db');
const nodemailer = require('nodemailer');

/**
 * Unified Email Service
 * Sends email via configured SMTP settings and logs all transactions in the email_logs table.
 */
async function sendEmail({ to, subject, html, type = 'custom' }) {
  try {
    // 1. Fetch platform & SMTP settings
    const settingsRes = await db.query(
      "SELECT key, value FROM platform_settings WHERE key IN ('smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from_email','platform_name','support_email','email_provider')"
    );
    const settings = {};
    settingsRes.rows.forEach(r => { settings[r.key] = r.value; });

    const smtpHost = settings.smtp_host;
    const smtpUser = settings.smtp_user;
    const smtpPass = settings.smtp_pass;
    let platformName = settings.platform_name || 'Speaxa';
    if (platformName.toLowerCase() === 'speaxa') {
      platformName = 'Speaxa';
    }
    const fromEmail = settings.smtp_from_email || settings.support_email || settings.smtp_user || 'no-reply@speaxa.com';

    // Format rich premium email wrapper based on type
    let finalHtml = html;
    if (!html.includes('<html') && !html.includes('<body')) {
      const primaryColor = '#0d7a6d';
      const secondaryColor = '#3CBDB0';
      const darkColor = '#0f172a';
      
      let headerGradient = 'linear-gradient(135deg, #0d7a6d, #08544b)';
      let headerIcon = '🛡️';
      let titleLabel = 'Security Verification';
      let badgeHtml = '';

      if (type === 'otp') {
        headerGradient = 'linear-gradient(135deg, #0d7a6d, #08544b)';
        headerIcon = '🔐';
        titleLabel = 'Verification Code';
        badgeHtml = `<span style="background: rgba(13, 122, 109, 0.1); color: #0d7a6d; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; font-family: sans-serif;">Secure Portal</span>`;
      } else if (type === 'advertisement' || type === 'campaign') {
        headerGradient = 'linear-gradient(135deg, #4f46e5, #3730a3)'; // Royal Indigo
        headerIcon = '📢';
        titleLabel = 'Special Announcement';
        badgeHtml = `<span style="background: rgba(79, 70, 229, 0.1); color: #4f46e5; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; font-family: sans-serif;">Community</span>`;
      } else if (type === 'notification') {
        headerGradient = 'linear-gradient(135deg, #0284c7, #075985)'; // Ocean Blue
        headerIcon = '📅';
        titleLabel = 'Class Schedule Update';
        badgeHtml = `<span style="background: rgba(2, 132, 199, 0.1); color: #0284c7; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; font-family: sans-serif;">Live Session</span>`;
      } else {
        headerGradient = 'linear-gradient(135deg, #1e293b, #0f172a)'; // Charcoal Dark
        headerIcon = '✉️';
        titleLabel = 'System Notification';
      }

      finalHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .email-container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; }
    .header { background: ${headerGradient}; padding: 35px 30px; text-align: center; color: #ffffff; position: relative; }
    .logo-container { margin-bottom: 12px; }
    .logo-badge { display: inline-block; padding: 8px 18px; background: rgba(255, 255, 255, 0.15); border-radius: 8px; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; text-decoration: none; border: 1px solid rgba(255,255,255,0.1); font-family: sans-serif; }
    .header h2 { margin: 10px 0 0 0; font-size: 18px; font-weight: 500; opacity: 0.9; letter-spacing: 0.3px; font-family: sans-serif; }
    .content-card { padding: 40px 35px; color: #334155; line-height: 1.6; font-size: 15px; }
    .content-card p { margin-top: 0; margin-bottom: 20px; color: #475569; }
    .footer { background: #f8fafc; padding: 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
    .footer p { margin: 4px 0; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo-container">
        <a class="logo-badge" href="#" style="color:#ffffff; text-decoration:none;">
          <span style="color:#ffffff;">Speaxa</span>
        </a>
      </div>
      <h2>${headerIcon} ${titleLabel}</h2>
    </div>
    <div style="padding: 20px 35px 0 35px; text-align: right;">
      ${badgeHtml}
    </div>
    <div class="content-card">
      ${html}
    </div>
    <div class="footer">
      <p style="font-weight: 600; color: #475569; font-family: sans-serif;">${platformName} Support Team</p>
      <p>If you have any questions, reply to this email or reach us at <a href="mailto:${settings.support_email || 'support@speaxa.com'}" style="color: #0d7a6d; text-decoration: none; font-weight: 500;">${settings.support_email || 'support@speaxa.com'}</a></p>
      <p style="margin-top: 15px; font-size: 11px; color: #94a3b8;">&copy; ${new Date().getFullYear()} ${platformName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
    }

    const emailProvider = settings.email_provider || 'smtp';

    // Filter placeholder keys
    const cleanHost = smtpHost && !smtpHost.includes('YOUR_') && !smtpHost.includes('CHANGE_') ? smtpHost : null;
    const cleanUser = smtpUser && !smtpUser.includes('YOUR_') && !smtpUser.includes('CHANGE_') ? smtpUser : null;

    let sent = false;
    let errorMessage = null;

    if (emailProvider.toLowerCase() === 'smtp' && cleanHost && cleanUser) {
      if (smtpPass && smtpPass.startsWith('xkeysib-')) {
        // Brevo REST API Mode
        console.log('[EmailService] Detected Brevo API Key. Sending via REST API...');
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': smtpPass,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: platformName, email: fromEmail },
            to: [{ email: to }],
            subject: subject,
            htmlContent: finalHtml
          })
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Brevo REST API failed (status ${response.status}): ${errBody}`);
        }
        sent = true;
      } else {
        // Nodemailer SMTP Mode
        const transporter = nodemailer.createTransport({
          host: cleanHost,
          port: parseInt(settings.smtp_port || '587', 10),
          secure: parseInt(settings.smtp_port || '587', 10) === 465,
          auth: { user: cleanUser, pass: smtpPass },
        });

        await transporter.sendMail({
          from: `"${platformName}" <${fromEmail}>`,
          to,
          subject,
          html: finalHtml,
        });
        sent = true;
      }
    } else {
      // Dev Console Fallback
      console.log(`========================================`);
      console.log(`[Email Console Fallback] To: ${to} | Subject: ${subject}`);
      console.log(`Body (truncated): ${html.substring(0, 300)}...`);
      console.log(`========================================`);
      sent = true;
    }

    // 2. Log successful dispatch to database
    const logId = 'mlog_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    await db.query(`
      INSERT INTO email_logs (id, recipient_email, subject, body, type, status, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [logId, to, subject, html, type, sent ? 'sent' : 'failed', errorMessage]);

    return { sent, logId };
  } catch (err) {
    console.error('[EmailService] Failed to send email:', err);
    
    // Log failure in database
    try {
      const logId = 'mlog_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      await db.query(`
        INSERT INTO email_logs (id, recipient_email, subject, body, type, status, error_message)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [logId, to, subject, html, type, 'failed', err.message]);
    } catch (dbErr) {
      console.error('[EmailService] Failed to insert failed email log:', dbErr.message);
    }

    return { sent: false, error: err.message };
  }
}

module.exports = { sendEmail };
