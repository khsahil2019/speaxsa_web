/**
 * System Config Service — Reads/writes platform_settings table
 */
const db = require('../db');

let cache = null;
let cacheExpiry = null;
const CACHE_TTL = 60 * 1000; // 1 minute

async function getConfig() {
  if (cache && cacheExpiry && Date.now() < cacheExpiry) {
    return cache;
  }

  // 1. Default environment fallbacks from process.env
  const envDefaults = {
    // SMTP & Email
    smtp_host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
    smtp_port: process.env.SMTP_PORT || '587',
    smtp_user: process.env.SMTP_USER || '',
    smtp_pass: process.env.SMTP_PASS || '',
    smtp_from_email: process.env.EMAIL_FROM || 'noreply@speaxa.com',
    support_email: process.env.EMAIL_FROM || 'support@speaxa.com',

    // Agora Video Calling
    agora_app_id: process.env.AGORA_APP_ID || '',
    agora_app_certificate: process.env.AGORA_APP_CERTIFICATE || '',
    agora_customer_key: process.env.AGORA_CUSTOMER_KEY || '',
    agora_customer_secret: process.env.AGORA_CUSTOMER_SECRET || '',

    // Razorpay Payments
    razorpay_key_id: process.env.RAZORPAY_KEY_ID || '',
    razorpay_key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    razorpay_webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET || '',

    // MSG91 / SMS OTP
    msg91_auth_key: process.env.MSG91_AUTH_KEY || '',
    msg91_sender_id: process.env.MSG91_SENDER_ID || 'SPXSA',
    msg91_template_id: process.env.MSG91_TEMPLATE_ID || '',

    // Google OAuth 2.0
    google_client_id: process.env.GOOGLE_CLIENT_ID || '',
    google_client_secret: process.env.GOOGLE_CLIENT_SECRET || '',

    // AWS S3 Storage
    s3_bucket: process.env.S3_BUCKET || '',
    s3_region: process.env.S3_REGION || '',
    s3_access_key: process.env.S3_ACCESS_KEY || '',
    s3_secret_key: process.env.S3_SECRET_KEY || '',
    cdn_base_url: process.env.CDN_BASE_URL || ''
  };

  // 2. Fetch overrides from database platform_settings table
  const settings = { ...envDefaults };
  try {
    const res = await db.query('SELECT key, value FROM platform_settings');
    for (const row of res.rows) {
      if (row.value !== null && row.value !== undefined && row.value !== '') {
        try {
          settings[row.key] = JSON.parse(row.value);
        } catch {
          settings[row.key] = row.value;
        }
      }
    }
  } catch (err) {
    console.error('SystemConfigService db fetch error:', err.message);
  }

  cache = settings;
  cacheExpiry = Date.now() + CACHE_TTL;
  return settings;
}

async function updateConfig(key, value) {
  const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
  await db.query(
    `INSERT INTO platform_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, strValue]
  );
  cache = null; // Invalidate cache
}

async function getSetting(key, defaultValue = null) {
  const config = await getConfig();
  return config[key] ?? defaultValue;
}

module.exports = { getConfig, updateConfig, getSetting };
