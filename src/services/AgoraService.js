/**
 * Agora Service — Token generation for RTC and RTM
 * Uses agora-access-token v2
 */
const { RtcTokenBuilder, RtcRole, RtmTokenBuilder } = require('agora-access-token');
const db = require('../db');

async function getAgoraCredentials() {
  try {
    const res = await db.query(
      "SELECT key, value FROM platform_settings WHERE key IN ('agora_app_id', 'agora_app_certificate')"
    );
    const creds = {};
    res.rows.forEach(r => { creds[r.key] = r.value; });
    return {
      appId: process.env.AGORA_APP_ID || creds.agora_app_id || '',
      appCertificate: process.env.AGORA_APP_CERTIFICATE || creds.agora_app_certificate || '',
    };
  } catch {
    return {
      appId: process.env.AGORA_APP_ID || '',
      appCertificate: process.env.AGORA_APP_CERTIFICATE || '',
    };
  }
}

/**
 * Generate an RTC token for joining a live class channel.
 * @param {string} channelName - Agora channel name (batch's agora_channel)
 * @param {string} uid - User ID (numeric string preferred)
 * @param {string} role - 'publisher' (teacher) or 'subscriber' (student/admin)
 */
async function generateRTCToken(channelName, uid, role = 'subscriber') {
  const { appId, appCertificate } = await getAgoraCredentials();

  if (!appId || !appCertificate) {
    // Return a demo token for development (won't work in production Agora)
    console.warn('[Agora] No credentials configured. Using demo token.');
    return {
      token: `demo_rtc_token_${channelName}_${uid}_${Date.now()}`,
      appId: appId || 'demo_app_id',
      channel: channelName,
      uid,
      demo: true,
    };
  }

  const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const expiryTime = Math.floor(Date.now() / 1000) + (3 * 60 * 60); // 3 hours
  const privilegeExpireTime = expiryTime;

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    rtcRole,
    expiryTime,
    privilegeExpireTime
  );

  return { token, appId, channel: channelName, uid, demo: false };
}

/**
 * Generate an RTM token for real-time messaging (chat in live class).
 * @param {string} userId - User's unique ID
 */
async function generateRTMToken(userId) {
  const { appId, appCertificate } = await getAgoraCredentials();

  if (!appId || !appCertificate) {
    return {
      token: `demo_rtm_token_${userId}_${Date.now()}`,
      appId: appId || 'demo_app_id',
      userId,
      demo: true,
    };
  }

  const expiryTime = Math.floor(Date.now() / 1000) + (3 * 60 * 60);
  const token = RtmTokenBuilder.buildToken(appId, appCertificate, userId, expiryTime);

  return { token, appId, userId, demo: false };
}

/**
 * Generate a unique Agora channel name for a batch.
 */
function generateChannelName(batchId) {
  return `speaxsa_${batchId}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, '_');
}

module.exports = { generateRTCToken, generateRTMToken, generateChannelName };
