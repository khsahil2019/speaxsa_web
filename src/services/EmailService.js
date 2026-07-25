const db = require('../db');
const nodemailer = require('nodemailer');
const configService = require('./SystemConfigService');

/**
 * Unified Email Service
 * Sends email via configured SMTP settings and logs all transactions in the email_logs table.
 */
async function sendEmail(options) {
  const { to, subject, html, type = 'custom', headerTitle, badgeLabel } = options || {};
  try {
    // 1. Fetch platform & SMTP settings via SystemConfigService
    const settings = await configService.getConfig();

    const smtpHost = settings.smtp_host || process.env.SMTP_HOST;
    const smtpUser = settings.smtp_user || process.env.SMTP_USER;
    const smtpPass = settings.smtp_pass || process.env.SMTP_PASS;
    const smtpPort = settings.smtp_port || process.env.SMTP_PORT || '587';
    const emailProvider = (settings.email_provider || process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();

    const brevoApiKey = (settings.brevo_api_key && settings.brevo_api_key.trim().startsWith('xkeysib-')) ? settings.brevo_api_key.trim()
      : (settings.smtp_pass && settings.smtp_pass.trim().startsWith('xkeysib-')) ? settings.smtp_pass.trim()
        : (process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim().startsWith('xkeysib-')) ? process.env.BREVO_API_KEY.trim()
          : (process.env.SMTP_PASS && process.env.SMTP_PASS.trim().startsWith('xkeysib-')) ? process.env.SMTP_PASS.trim()
            : null;

    let platformName = settings.platform_name || 'Speaxa';
    if (platformName.toLowerCase() === 'speaxa') {
      platformName = 'Speaxa';
    }
    const fromEmail = settings.smtp_from_email || settings.support_email || smtpUser || process.env.EMAIL_FROM || 'no-reply@speaxa.in';

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

      const { headerTitle, badgeLabel } = options || {};
      if (type === 'otp') {
        headerGradient = 'linear-gradient(135deg, #0d7a6d, #08544b)';
        headerIcon = '🔐';
        titleLabel = headerTitle || 'Verification Code';
        badgeHtml = `<span style="background: rgba(13, 122, 109, 0.1); color: #0d7a6d; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; font-family: sans-serif;">${badgeLabel || 'Secure Portal'}</span>`;
      } else if (type === 'verification') {
        headerGradient = 'linear-gradient(135deg, #0d7a6d, #08544b)';
        headerIcon = '✉️';
        titleLabel = headerTitle || 'Email Verification Link';
        badgeHtml = `<span style="background: rgba(13, 122, 109, 0.1); color: #0d7a6d; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; font-family: sans-serif;">${badgeLabel || 'Email Verification'}</span>`;
      } else if (type === 'advertisement' || type === 'campaign') {
        headerGradient = 'linear-gradient(135deg, #0d7a6d 0%, #0f766e 50%, #042f2e 100%)'; // SPEAXA Emerald
        headerIcon = '📢';
        titleLabel = headerTitle || 'Special Announcement';
        badgeHtml = `<span style="background: rgba(13, 122, 109, 0.12); color: #0d7a6d; border: 1px solid rgba(13, 122, 109, 0.25); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; font-family: sans-serif;">${badgeLabel || 'SPEAXA Special Offer'}</span>`;
      } else if (type === 'notification') {
        headerGradient = 'linear-gradient(135deg, #0284c7, #075985)'; // Ocean Blue
        headerIcon = '🔔';
        titleLabel = headerTitle || (subject ? subject : 'Official Update');
        badgeHtml = `<span style="background: rgba(2, 132, 199, 0.1); color: #0284c7; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; font-family: sans-serif;">${badgeLabel || 'Official Notification'}</span>`;
      } else {
        headerGradient = 'linear-gradient(135deg, #1e293b, #0f172a)'; // Charcoal Dark
        headerIcon = '✉️';
        titleLabel = headerTitle || (subject ? subject : 'System Notification');
        badgeHtml = `<span style="background: rgba(255, 255, 255, 0.1); color: #cbd5e1; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; font-family: sans-serif;">${badgeLabel || 'Speaxa System'}</span>`;
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
      <p>If you have any questions, reply to this email or reach us at <a href="mailto:${settings.support_email || 'support@speaxa.in'}" style="color: #0d7a6d; text-decoration: none; font-weight: 500;">${settings.support_email || 'support@speaxa.in'}</a></p>
      <p style="margin-top: 15px; font-size: 11px; color: #94a3b8;">&copy; ${new Date().getFullYear()} ${platformName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
    }

    // Filter placeholder keys
    const cleanHost = smtpHost && !smtpHost.includes('YOUR_') && !smtpHost.includes('CHANGE_') ? smtpHost.trim() : null;
    const cleanUser = smtpUser && !smtpUser.includes('YOUR_') && !smtpUser.includes('CHANGE_') ? smtpUser.trim() : null;
    const cleanPass = smtpPass && !smtpPass.includes('YOUR_') && !smtpPass.includes('CHANGE_') ? smtpPass.trim() : null;
    const hasValidSmtp = cleanHost && cleanUser && cleanPass;

    let sent = false;
    let errorMessage = null;

    if (emailProvider === 'dev') {
      // Dev Console Fallback
      console.log(`========================================`);
      console.log(`[Email Console Fallback] To: ${to} | Subject: ${subject}`);
      console.log(`Body (truncated): ${html.substring(0, 300)}...`);
      console.log(`========================================`);
      sent = true;
    } else if (emailProvider === 'brevo' || (brevoApiKey && (!hasValidSmtp || cleanHost.includes('brevo')))) {
      // Brevo REST API Mode for xkeysib- API Keys
      console.log(`[EmailService] Sending email to ${to} via Brevo REST API...`);
      const senderEmail = process.env.BREVO_SENDER_EMAIL || (fromEmail && fromEmail.includes('@') && !fromEmail.includes('no-reply@speaxa.in') ? fromEmail : 'speaxaindia@gmail.com');
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: `${platformName}`, email: senderEmail },
          to: [{ email: to }],
          subject: subject,
          htmlContent: finalHtml,
          headers: {
            'X-Mailin-Tag': 'SpeaxaVerification',
            'X-Auto-Response-Suppress': 'OOF, AutoReply',
            'List-Unsubscribe': `<mailto:${senderEmail}?subject=Unsubscribe>`
          }
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`[EmailService] Brevo API error (status ${response.status}):`, errBody);
        throw new Error(`Brevo REST API failed (status ${response.status}): ${errBody}`);
      }
      sent = true;
    } else if (hasValidSmtp) {
      // Nodemailer SMTP Mode
      try {
        console.log(`[EmailService] Sending email to ${to} via SMTP server (${cleanHost}:${smtpPort})...`);
        const transporter = nodemailer.createTransport({
          host: cleanHost,
          port: parseInt(smtpPort, 10),
          secure: parseInt(smtpPort, 10) === 465,
          auth: { user: cleanUser, pass: cleanPass },
          tls: {
            rejectUnauthorized: false
          }
        });

        await transporter.sendMail({
          from: `"${platformName}" <${fromEmail}>`,
          to,
          subject,
          html: finalHtml,
        });
        sent = true;
      } catch (smtpErr) {
        console.warn(`[EmailService] Nodemailer SMTP failed (${smtpErr.message}).`);
        if (brevoApiKey) {
          console.log(`[EmailService] Falling back to Brevo REST API...`);
          const senderEmail = process.env.BREVO_SENDER_EMAIL || (fromEmail && fromEmail.includes('@') && !fromEmail.includes('no-reply@speaxa.in') ? fromEmail : 'speaxaindia@gmail.com');
          const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'api-key': brevoApiKey,
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              sender: { name: `${platformName}`, email: senderEmail },
              to: [{ email: to }],
              subject: subject,
              htmlContent: finalHtml
            })
          });

          if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`SMTP failed (${smtpErr.message}) & Brevo Fallback failed (status ${response.status}): ${errBody}`);
          }
          sent = true;
        } else {
          throw smtpErr;
        }
      }
    } else if (brevoApiKey) {
      // Brevo REST API Fallback
      console.log(`[EmailService] Sending email to ${to} via Brevo REST API fallback...`);
      const senderEmail = process.env.BREVO_SENDER_EMAIL || (fromEmail && fromEmail.includes('@') && !fromEmail.includes('no-reply@speaxa.in') ? fromEmail : 'speaxaindia@gmail.com');
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: `${platformName}`, email: senderEmail },
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
      // Local / Dev Fallback mode when no production SMTP credentials are configured
      console.log(`========================================`);
      console.log(`[Email Local/Dev Fallback] To: ${to} | Subject: ${subject}`);
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

    let loggedError = err.message;
    if (loggedError.includes('525 5.7.1') || loggedError.toLowerCase().includes('unauthorized ip')) {
      loggedError += ' | TIP: Your Brevo account settings block SMTP connections from this server\'s IP. Go to Brevo Settings > Security > Authorized IPs to whitelist this IP or disable restrictions. Alternatively, generate a Brevo API Key (prefixed with xkeysib-) and set it as SMTP Password to bypass SMTP entirely via HTTP REST API.';
    }

    // Log failure in database
    try {
      const logId = 'mlog_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      await db.query(`
        INSERT INTO email_logs (id, recipient_email, subject, body, type, status, error_message)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [logId, to, subject, html, type, 'failed', loggedError]);
    } catch (dbErr) {
      console.error('[EmailService] Failed to insert failed email log:', dbErr.message);
    }

    if (options && options.throwOnError) {
      throw new Error(loggedError);
    }

    return { sent: false, error: loggedError };
  }
}

async function sendPaymentReceiptEmail({ studentEmail, studentName, courseTitle, batchName, amountPaid, originalFees, discountAmount, couponCode, paymentId, date }) {
  if (!studentEmail) return;
  const formattedDate = new Date(date || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let couponLineHtml = '';
  if (couponCode && discountAmount > 0) {
    couponLineHtml = `
      <tr style="border-bottom: 1px dashed #e2e8f0;">
        <td style="padding: 10px 0; color: #16a34a; font-size: 14px;">Coupon Discount (${couponCode})</td>
        <td style="padding: 10px 0; text-align: right; color: #16a34a; font-weight: 700; font-size: 14px;">-₹${parseFloat(discountAmount).toLocaleString('en-IN')}</td>
      </tr>
    `;
  }

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 540px; margin: 0 auto; color: #334155;">
      <h3 style="color: #0f172a; margin-top: 0; font-size: 20px; font-weight: 700;">Official Payment Receipt & Enrollment Confirmation</h3>
      <p style="color: #475569; font-size: 14px; margin-bottom: 24px; line-height: 1.5;">
        Hi <strong>${studentName || 'Student'}</strong>,<br>
        Thank you for your purchase! Your payment for <strong>${courseTitle} (${batchName})</strong> has been successfully processed and verified.
      </p>

      <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.8px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">TRANSACTION DETAILS</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Transaction Receipt ID</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 700; font-family: monospace;">${paymentId}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Date & Time</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 500;">${formattedDate}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Course Title</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 600;">${courseTitle}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Batch Name</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 600;">${batchName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Payment Status</td>
            <td style="padding: 8px 0; text-align: right; color: #059669; font-weight: 700;">✔ COMPLETED & VERIFIED</td>
          </tr>
        </table>

        <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.8px; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">PAYMENT BREAKDOWN</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;">Course Standard Fee</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 600;">₹${parseFloat(originalFees || amountPaid).toLocaleString('en-IN')}</td>
          </tr>
          ${couponLineHtml}
          <tr>
            <td style="padding: 12px 0 0 0; color: #0f172a; font-weight: 800; font-size: 15px;">Total Amount Paid</td>
            <td style="padding: 12px 0 0 0; text-align: right; color: #0d7a6d; font-weight: 800; font-size: 18px;">₹${parseFloat(amountPaid).toLocaleString('en-IN')}</td>
          </tr>
        </table>
      </div>

      <div style="background: rgba(13, 122, 109, 0.08); border: 1px solid rgba(13, 122, 109, 0.25); border-radius: 10px; padding: 14px; text-align: center; font-size: 13px; color: #0d7a6d; font-weight: 600;">
        🎓 Access live classes, study materials, and assignments directly from your <strong>SPEAXA Student Dashboard</strong>!
      </div>
    </div>
  `;

  return sendEmail({
    to: studentEmail,
    subject: `SPEAXA Payment Receipt: Enrolled in ${batchName} (${paymentId})`,
    html,
    type: 'notification',
    headerTitle: 'Official Payment Receipt',
    badgeLabel: 'SPEAXA Billing'
  });
}

module.exports = { sendEmail, sendPaymentReceiptEmail };
