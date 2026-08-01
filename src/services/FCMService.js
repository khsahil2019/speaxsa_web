require('dotenv').config();
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
    const projectId = process.env.FIREBASE_PROJECT_ID || 'speaxa-teacher';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : null;

    if (serviceAccountPath) {
      const path = require('path');
      const resolvedPath = path.isAbsolute(serviceAccountPath) 
        ? serviceAccountPath 
        : path.resolve(process.cwd(), serviceAccountPath);
      const serviceAccount = require(resolvedPath);
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount),
      });
    } else if (clientEmail && privateKey) {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      console.warn('[FCM] No Firebase Service Account configured. To send live FCM push notifications, download service account JSON from Firebase Console > Project Settings > Service Accounts and set FIREBASE_SERVICE_ACCOUNT_PATH in .env');
      return null;
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

module.exports = { 
  sendToToken, 
  sendPushNotification: sendToToken,
  sendToMultipleTokens, 
  sendToRole 
};
