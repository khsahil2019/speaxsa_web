/**
 * Firebase Cloud Messaging (FCM) Service
 * Sends push notifications to users via Firebase Admin SDK
 */
let admin = null;

function initFirebase() {
  if (admin) return admin;
  try {
    const firebaseAdmin = require('firebase-admin');
    if (firebaseAdmin.apps.length > 0) {
      admin = firebaseAdmin;
      return admin;
    }

    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (serviceAccountPath) {
      const serviceAccount = require(serviceAccountPath);
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount),
      });
    } else {
      // Try default credentials (Cloud environment)
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.applicationDefault(),
      });
    }
    admin = firebaseAdmin;
    return admin;
  } catch (err) {
    console.warn('[FCM] Firebase init failed:', err.message);
    return null;
  }
}

/**
 * Send a push notification to a specific FCM token.
 */
async function sendToToken(token, title, body, data = {}) {
  const firebase = initFirebase();
  if (!firebase) {
    console.log(`[FCM FALLBACK] Token: ${token} | Title: ${title} | Body: ${body}`);
    return { success: true, method: 'console_fallback' };
  }

  try {
    const message = {
      token,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      webpush: {
        notification: { icon: '/admin/logo.png', badge: '/admin/logo.png' },
      },
    };

    const response = await firebase.messaging().send(message);
    return { success: true, messageId: response };
  } catch (err) {
    console.error('[FCM] Send failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send notification to multiple tokens (batch send).
 */
async function sendToMultipleTokens(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) return { success: false, error: 'No tokens' };

  const firebase = initFirebase();
  if (!firebase) {
    console.log(`[FCM FALLBACK] ${tokens.length} recipients | Title: ${title}`);
    return { success: true, method: 'console_fallback', count: tokens.length };
  }

  try {
    const message = {
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    };

    const response = await firebase.messaging().sendEachForMulticast({
      tokens,
      ...message,
    });

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (err) {
    console.error('[FCM] Multi-send failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send notification to all users of a given role by fetching their FCM tokens from DB.
 */
async function sendToRole(role, title, body, data = {}) {
  try {
    const db = require('../db');
    let query, params;
    if (role === 'all') {
      query = 'SELECT DISTINCT token FROM fcm_tokens';
      params = [];
    } else {
      query = `SELECT ft.token FROM fcm_tokens ft 
               JOIN users u ON u.id = ft.user_id 
               WHERE u.role = $1 AND u.is_disabled = false`;
      params = [role];
    }
    const res = await db.query(query, params);
    const tokens = res.rows.map(r => r.token);
    if (tokens.length === 0) return { success: true, count: 0, message: 'No tokens found' };
    return await sendToMultipleTokens(tokens, title, body, data);
  } catch (err) {
    console.error('[FCM] sendToRole failed:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendToToken, sendToMultipleTokens, sendToRole };
