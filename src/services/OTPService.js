const db = require('../db');
const { generateOTP } = require('../utils/security');
const nodemailer = require('nodemailer');
const https = require('https');
const http = require('http');
const URL = require('url').URL;

/**
 * OTP Service — generates, stores, sends, and verifies OTPs
 * with DB-backed TTL and Admin-configurable Gateway Providers (MSG91, Twilio, Fast2SMS, Custom REST API, SMTP, Dev Mode).
 */

async function getOTPConfig() {
  try {
    const res = await db.query(
      `SELECT key, value FROM platform_settings WHERE key IN (
        'sms_provider', 'email_provider',
        'msg91_auth_key', 'msg91_template_id', 'msg91_sender_id',
        'twilio_account_sid', 'twilio_auth_token', 'twilio_from_phone',
        'fast2sms_api_key', 'fast2sms_route', 'fast2sms_sender_id',
        'custom_sms_url', 'custom_sms_method', 'custom_sms_headers', 'custom_sms_body',
        'twofactor_api_key', 'twofactor_template_name',
        'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from_email', 'platform_name',
        'otp_expiry_minutes', 'otp_length', 'dev_otp_in_response', 'master_otp',
        'otp_email_subject', 'otp_email_html', 'otp_sms_template'
      )`
    );
    const config = {};
    res.rows.forEach(r => { config[r.key] = r.value; });
    return config;
  } catch (err) {
    console.error('[OTPService] Error loading config:', err.message);
    return {};
  }
}

async function createOTP(identifier, purpose = 'login') {
  const config = await getOTPConfig();
  const length = parseInt(config.otp_length || '6', 10);
  const otp = generateOTP(isNaN(length) ? 6 : length);
  const expiryMins = parseInt(config.otp_expiry_minutes || '5', 10);
  const expiresAt = new Date(Date.now() + (isNaN(expiryMins) ? 5 : expiryMins) * 60 * 1000);

  // Invalidate any existing active OTPs for this identifier + purpose
  await db.query(
    'UPDATE otp_tokens SET used = true WHERE identifier = $1 AND purpose = $2 AND used = false',
    [identifier, purpose]
  );

  const res = await db.query(
    'INSERT INTO otp_tokens (identifier, otp, purpose, expires_at, delivery_status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [identifier, otp, purpose, expiresAt, 'pending']
  );

  return { otp, expiresAt, tokenId: res.rows[0]?.id };
}

async function verifyOTP(identifier, otp, purpose = 'login') {
  const config = await getOTPConfig();

  // 1. Master OTP bypass check (for admin test/qa env if configured)
  if (config.master_otp && config.master_otp.trim() !== '' && otp === config.master_otp.trim()) {
    console.log(`[OTPService] Master OTP bypass used for ${identifier}`);
    return { valid: true, masterBypass: true };
  }

  // 2. Database OTP lookup
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

/**
 * Send SMS OTP via selected Provider
 */
async function sendOTPSms(phone, otp, purpose = 'login', tokenId = null) {
  const config = await getOTPConfig();
  const provider = (config.sms_provider || 'dev').toLowerCase();
  let formattedPhone = phone.replace(/\D/g, '');
  if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;

  let result = { sent: false, method: provider, error: null };

  try {
    if (provider === 'msg91') {
      result = await dispatchMSG91(config, formattedPhone, otp, purpose);
    } else if (provider === 'brevo' || provider === 'sendinblue') {
      result = await dispatchBrevoSMS(config, formattedPhone, otp, purpose);
    } else if (provider === 'twilio') {
      result = await dispatchTwilio(config, formattedPhone, phone, otp, purpose);
    } else if (provider === 'fast2sms') {
      result = await dispatchFast2SMS(config, formattedPhone, otp, purpose);
    } else if (provider === '2factor' || provider === 'twofactor') {
      result = await dispatch2Factor(config, formattedPhone, phone, otp, purpose);
    } else if (provider === 'custom') {
      result = await dispatchCustomGateway(config, formattedPhone, phone, otp, purpose);
    } else {
      // Dev Mode / Console
      console.log(`========================================`);
      console.log(`[OTP SMS (Dev Mode)] Provider: ${provider.toUpperCase()}`);
      console.log(`Target Phone: ${phone} (${formattedPhone}) | OTP: ${otp} | Purpose: ${purpose}`);
      console.log(`========================================`);
      result = { sent: true, method: 'dev_console', message: 'Logged to console in Dev Mode' };
    }
  } catch (err) {
    console.error(`[OTPService] SMS Dispatch Error (${provider}):`, err.message);
    result = { sent: false, method: provider, error: err.message };
  }

  // Record delivery status in database token if tokenId is available
  if (tokenId) {
    try {
      await db.query(
        'UPDATE otp_tokens SET delivery_method = $1, delivery_status = $2, delivery_error = $3 WHERE id = $4',
        [result.method, result.sent ? 'sent' : 'failed', result.error ? String(result.error) : null, tokenId]
      );
    } catch (e) {
      console.error('[OTPService] Failed to update delivery log:', e.message);
    }
  }

  return result;
}

/**
 * Send Email OTP via selected Provider (SMTP / Dev)
 */
async function sendOTPEmail(email, otp, purpose = 'login', tokenId = null) {
  const config = await getOTPConfig();
  const provider = (config.email_provider || 'smtp').toLowerCase();
  let result = { sent: false, method: provider, error: null };

  try {
    const platformName = config.platform_name || 'SPEAXA';
    const expiryMins = config.otp_expiry_minutes || '5';

    let subject = config.otp_email_subject || (
      purpose === 'forgot_password'
        ? '{PLATFORM} — Password Reset Verification Code'
        : '{PLATFORM} — Your Verification Code: {OTP}'
    );

    subject = subject
      .replace(/{PLATFORM}/g, platformName)
      .replace(/{OTP}/g, otp)
      .replace(/{PURPOSE}/g, purpose)
      .replace(/{EXPIRY}/g, expiryMins)
      .replace(/{EMAIL}/g, email);

    let htmlTemplate = config.otp_email_html || `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #0d7a6d; margin-top: 0;">{PLATFORM}</h2>
        <p style="font-size: 15px; color: #334155;">Your verification code for <strong>{PURPOSE}</strong> is:</p>
        <div style="background: #f1f5f9; padding: 18px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="letter-spacing: 8px; color: #0d7a6d; font-size: 38px; margin: 0; font-family: monospace;">{OTP}</h1>
        </div>
        <p style="font-size: 13px; color: #64748b;">This verification code is valid for {EXPIRY} minutes. Please do not share it with anyone.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <small style="color: #94a3b8; font-size: 11px;">If you did not request this code, please ignore this message.</small>
      </div>
    `;

    htmlTemplate = htmlTemplate
      .replace(/{PLATFORM}/g, platformName)
      .replace(/{OTP}/g, otp)
      .replace(/{PURPOSE}/g, purpose)
      .replace(/{EXPIRY}/g, expiryMins)
      .replace(/{EMAIL}/g, email);

    const { sendEmail } = require('./EmailService');
    const mailResult = await sendEmail({
      to: email,
      subject,
      html: htmlTemplate,
      type: 'otp'
    });

    result = { sent: mailResult.sent, method: mailResult.sent ? 'smtp' : provider, error: mailResult.error || null };
  } catch (err) {
    console.error('[OTPService] Email send failed:', err.message);
    result = { sent: false, method: provider, error: err.message };
  }

  if (tokenId) {
    try {
      await db.query(
        'UPDATE otp_tokens SET delivery_method = $1, delivery_status = $2, delivery_error = $3 WHERE id = $4',
        [result.method, result.sent ? 'sent' : 'failed', result.error ? String(result.error) : null, tokenId]
      );
    } catch (e) {
      console.error('[OTPService] Failed to update delivery log:', e.message);
    }
  }

  return result;
}

// ──────────────────────────────────────────────────────────────
// GATEWAY DISPATCH IMPLEMENTATIONS
// ──────────────────────────────────────────────────────────────

// MSG91 Provider — supports both v5 (with Template ID) and v2 Direct SMS API (real-time without Template ID requirement)
async function dispatchMSG91(config, formattedPhone, otp, purpose) {
  const authKey = config.msg91_auth_key || process.env.MSG91_AUTH_KEY || '553058AYf7gbSf7ue6a60dfb6P1';
  const templateId = config.msg91_template_id || process.env.MSG91_TEMPLATE_ID;
  const senderId = config.msg91_sender_id || process.env.MSG91_SENDER_ID || 'SPXSA';

  if (!authKey) {
    throw new Error('MSG91 Auth Key missing in settings');
  }

  let phoneStr = formattedPhone.replace(/\D/g, '');
  if (phoneStr.length === 10) phoneStr = '91' + phoneStr;

  if (templateId && templateId.trim() !== '') {
    // 1. MSG91 v5 OTP Template API
    const url = `https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=${phoneStr}&authkey=${authKey}&otp=${otp}`;

    return new Promise((resolve) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const resp = JSON.parse(data);
            if (resp.type === 'success' || resp.message === 'OTP sent successfully') {
              resolve({ sent: true, method: 'msg91_v5', response: resp });
            } else {
              resolve({ sent: false, method: 'msg91_v5', error: resp.message || JSON.stringify(resp) });
            }
          } catch {
            resolve({ sent: false, method: 'msg91_v5', error: 'Invalid JSON response from MSG91' });
          }
        });
      }).on('error', err => resolve({ sent: false, method: 'msg91_v5', error: err.message }));
    });
  } else {
    // 2. MSG91 v2 Direct SMS API (Dispatches real-time SMS to mobile numbers)
    const payload = JSON.stringify({
      sender: senderId.substring(0, 6),
      route: '4',
      country: '91',
      sms: [
        {
          message: `Your SPEAXA verification code is ${otp}. Valid for 5 minutes. Do not share it with anyone.`,
          to: [phoneStr]
        }
      ]
    });

    return new Promise((resolve) => {
      const req = https.request('https://api.msg91.com/api/v2/sendsms', {
        method: 'POST',
        headers: {
          'authkey': authKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const resp = JSON.parse(data);
            if (resp.type === 'success' || res.statusCode === 200) {
              console.log(`[MSG91 Real-time SMS] Dispatched OTP to ${phoneStr} | MsgId: ${resp.message}`);
              resolve({ sent: true, method: 'msg91_v2', response: resp });
            } else {
              resolve({ sent: false, method: 'msg91_v2', error: resp.message || JSON.stringify(resp) });
            }
          } catch {
            resolve({ sent: false, method: 'msg91_v2', error: 'Invalid JSON response from MSG91 v2' });
          }
        });
      });
      req.on('error', err => resolve({ sent: false, method: 'msg91_v2', error: err.message }));
      req.write(payload);
      req.end();
    });
  }
}

// Twilio Provider
async function dispatchTwilio(config, formattedPhone, rawPhone, otp, purpose) {
  const accountSid = config.twilio_account_sid || process.env.TWILIO_ACCOUNT_SID;
  const authToken = config.twilio_auth_token || process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = config.twilio_from_phone || process.env.TWILIO_FROM_PHONE;

  if (!accountSid || !authToken || !fromPhone) {
    throw new Error('Twilio Account SID, Auth Token, or From Phone missing in settings');
  }

  const targetPhone = rawPhone.startsWith('+') ? rawPhone : `+${formattedPhone}`;
  const bodyData = new URLSearchParams({
    To: targetPhone,
    From: fromPhone,
    Body: `Your ${config.platform_name || 'Speaxsa'} verification code is: ${otp}. Valid for 5 minutes.`
  }).toString();

  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const options = {
    hostname: 'api.twilio.com',
    path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(bodyData)
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const resp = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ sent: true, method: 'twilio', sid: resp.sid });
          } else {
            resolve({ sent: false, method: 'twilio', error: resp.message || resp.detail || JSON.stringify(resp) });
          }
        } catch {
          resolve({ sent: false, method: 'twilio', error: `HTTP ${res.statusCode}` });
        }
      });
    });
    req.on('error', err => resolve({ sent: false, method: 'twilio', error: err.message }));
    req.write(bodyData);
    req.end();
  });
}

// Fast2SMS Provider
async function dispatchFast2SMS(config, formattedPhone, otp, purpose) {
  const apiKey = config.fast2sms_api_key || process.env.FAST2SMS_API_KEY;
  const route = config.fast2sms_route || 'otp';

  if (!apiKey) {
    throw new Error('Fast2SMS API Key missing in settings');
  }

  // 10-digit number for Fast2SMS India
  const phone10 = formattedPhone.slice(-10);
  const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(apiKey)}&route=${route}&variables_values=${otp}&numbers=${phone10}`;

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const resp = JSON.parse(data);
          if (resp.return === true) {
            resolve({ sent: true, method: 'fast2sms', response: resp });
          } else {
            resolve({ sent: false, method: 'fast2sms', error: resp.message || JSON.stringify(resp) });
          }
        } catch {
          resolve({ sent: false, method: 'fast2sms', error: 'Invalid JSON response from Fast2SMS' });
        }
      });
    }).on('error', err => resolve({ sent: false, method: 'fast2sms', error: err.message }));
  });
}

// Custom REST API Gateway
async function dispatchCustomGateway(config, formattedPhone, rawPhone, otp, purpose) {
  let customUrl = config.custom_sms_url;
  if (!customUrl) {
    throw new Error('Custom SMS Gateway URL missing in settings');
  }

  const platformName = config.platform_name || 'Speaxsa';

  // Replace placeholders in URL
  customUrl = customUrl
    .replace(/{PHONE}/g, encodeURIComponent(rawPhone))
    .replace(/{FORMATTED_PHONE}/g, encodeURIComponent(formattedPhone))
    .replace(/{OTP}/g, encodeURIComponent(otp))
    .replace(/{PURPOSE}/g, encodeURIComponent(purpose))
    .replace(/{PLATFORM}/g, encodeURIComponent(platformName));

  const method = (config.custom_sms_method || 'GET').toUpperCase();
  let headers = {};
  try {
    if (config.custom_sms_headers) {
      headers = typeof config.custom_sms_headers === 'object'
        ? config.custom_sms_headers
        : JSON.parse(config.custom_sms_headers);
    }
  } catch (e) {
    console.warn('[OTPService] Failed to parse custom SMS headers JSON:', e.message);
  }

  let bodyString = '';
  if (method !== 'GET' && config.custom_sms_body) {
    let bodyTemplate = config.custom_sms_body;
    if (typeof bodyTemplate === 'object') bodyTemplate = JSON.stringify(bodyTemplate);

    bodyString = bodyTemplate
      .replace(/{PHONE}/g, rawPhone)
      .replace(/{FORMATTED_PHONE}/g, formattedPhone)
      .replace(/{OTP}/g, otp)
      .replace(/{PURPOSE}/g, purpose)
      .replace(/{PLATFORM}/g, platformName);

    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(bodyString);
  }

  const parsedUrl = new URL(customUrl);
  const httpModule = parsedUrl.protocol === 'https:' ? https : http;

  const requestOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method,
    headers
  };

  return new Promise((resolve) => {
    const req = httpModule.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ sent: true, method: 'custom_api', response: data.slice(0, 300) });
        } else {
          resolve({ sent: false, method: 'custom_api', error: `HTTP ${res.statusCode}: ${data.slice(0, 300)}` });
        }
      });
    });
    req.on('error', err => resolve({ sent: false, method: 'custom_api', error: err.message }));
    if (bodyString) req.write(bodyString);
    req.end();
  });
}

// 2Factor Provider
async function dispatch2Factor(config, formattedPhone, rawPhone, otp, purpose) {
  const apiKey = config.twofactor_api_key || process.env.TWOFACTOR_API_KEY;
  const templateName = config.twofactor_template_name || process.env.TWOFACTOR_TEMPLATE_NAME;

  if (!apiKey) {
    throw new Error('2Factor API Key missing in settings');
  }

  // Format 10-digit Indian mobile number for 2Factor API routing
  let cleanPhone = formattedPhone.replace(/\D/g, '');
  if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
    cleanPhone = cleanPhone.substring(2);
  }

  let url = `https://2factor.in/API/V1/${apiKey}/SMS/${cleanPhone}/${otp}`;
  if (templateName && templateName.trim().length > 0) {
    url += `/${encodeURIComponent(templateName.trim())}`;
  }

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const resp = JSON.parse(data);
          if (resp.Status === 'Success') {
            console.log(`[2Factor SMS] Dispatched OTP ${otp} to ${cleanPhone} | SessionID: ${resp.Details}`);
            resolve({ sent: true, method: '2factor', response: resp.Details });
          } else {
            resolve({ sent: false, method: '2factor', error: resp.Details || JSON.stringify(resp) });
          }
        } catch {
          resolve({ sent: false, method: '2factor', error: 'Invalid JSON response from 2Factor' });
        }
      });
    }).on('error', err => resolve({ sent: false, method: '2factor', error: err.message }));
  });
}

// Brevo Transactional SMS Provider
async function dispatchBrevoSMS(config, formattedPhone, otp, purpose) {
  const apiKey = config.brevo_api_key || config.smtp_pass || process.env.BREVO_API_KEY;
  if (!apiKey || !apiKey.startsWith('xkeysib-')) {
    throw new Error('Brevo API Key (prefixed with xkeysib-) is required for Brevo SMS');
  }

  let phoneStr = formattedPhone.replace(/\D/g, '');
  if (phoneStr.length === 10) phoneStr = '91' + phoneStr;

  const sender = (config.brevo_sms_sender || config.msg91_sender_id || 'Speaxa').substring(0, 11);

  try {
    const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender,
        recipient: phoneStr,
        content: `Your SPEAXA verification code is ${otp}. Valid for 5 minutes. Do not share it with anyone.`,
        type: 'transactional'
      })
    });

    const data = await response.json();
    if (response.ok) {
      return { sent: true, method: 'brevo_sms', response: data };
    } else {
      return { sent: false, method: 'brevo_sms', error: data.message || JSON.stringify(data) };
    }
  } catch (err) {
    return { sent: false, method: 'brevo_sms', error: err.message };
  }
}

/**
 * Get Recent OTP Audit Logs for Admin Panel
 */
async function getOTPLogs(limit = 50) {
  try {
    const res = await db.query(
      `SELECT id, identifier, otp, purpose, delivery_method, delivery_status, delivery_error, used, expires_at, created_at
       FROM otp_tokens
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  } catch (err) {
    console.error('[OTPService] Error fetching logs:', err.message);
    return [];
  }
}

module.exports = {
  createOTP,
  verifyOTP,
  sendOTPEmail,
  sendOTPSms,
  getOTPLogs,
  getOTPConfig
};
