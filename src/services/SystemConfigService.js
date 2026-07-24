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

    // Agora Video Calling (4 Keys)
    agora_app_id: process.env.AGORA_APP_ID || '147cbdec021f414bb7d0a94f18994c64',
    agora_app_certificate: process.env.AGORA_APP_CERTIFICATE || '3dddf9beac1d42aabff762b511f24fbd',
    agora_customer_id: process.env.AGORA_CUSTOMER_ID || '',
    agora_customer_secret: process.env.AGORA_CUSTOMER_SECRET || '',

    // Razorpay Payments
    razorpay_key_id: process.env.RAZORPAY_KEY_ID || '',
    razorpay_key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    razorpay_webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET || '',

    // MSG91 / SMS OTP
    msg91_auth_key: process.env.MSG91_AUTH_KEY || '',
    msg91_sender_id: process.env.MSG91_SENDER_ID || 'SPXSA',
    msg91_template_id: process.env.MSG91_TEMPLATE_ID || '',

    // 2Factor SMS Gateway
    sms_provider: process.env.SMS_PROVIDER || '2factor',
    twofactor_api_key: process.env.TWOFACTOR_API_KEY || process.env['2FACTOR_API_KEY'] || 'dbbe0896-85e9-11f1-908b-0200cd936042',
    '2factor_api_key': process.env.TWOFACTOR_API_KEY || process.env['2FACTOR_API_KEY'] || 'dbbe0896-85e9-11f1-908b-0200cd936042',
    twofactor_template_name: process.env.TWOFACTOR_TEMPLATE_NAME || '',
    '2factor_template_name': process.env.TWOFACTOR_TEMPLATE_NAME || '',

    // Google OAuth 2.0
    google_client_id: process.env.GOOGLE_CLIENT_ID || '',
    google_client_secret: process.env.GOOGLE_CLIENT_SECRET || '',

    // AWS S3 Storage
    s3_bucket: process.env.S3_BUCKET || '',
    s3_region: process.env.S3_REGION || '',
    s3_access_key: process.env.S3_ACCESS_KEY || '',
    s3_secret_key: process.env.S3_SECRET_KEY || '',
    cdn_base_url: process.env.CDN_BASE_URL || '',

    // Landing & Footer Customizations
    home_footer_desc: "Speaxa is India's leading live interactive EdTech platform, empowering students with live classrooms, expert mentors, and performance reports.",
    home_footer_toll_free: "1800-120-456-456",
    home_footer_phone: "+91 9999 999 999",
    home_footer_email: "support@speaxa.com",
    home_footer_play_store_url: "https://play.google.com/store/apps/details?id=com.speaxa",
    home_footer_app_store_url: "https://apps.apple.com/app/speaxa",
    home_footer_instagram: "https://instagram.com/speaxa",
    home_footer_facebook: "https://facebook.com/speaxa",
    home_footer_youtube: "https://youtube.com/speaxa",
    home_footer_twitter: "https://twitter.com/speaxa"
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
