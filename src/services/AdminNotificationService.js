const db = require('../db');

function generateUID(prefix = 'notif') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Dispatches a system notification to all admin users and logs it in PostgreSQL.
 * @param {Object} params
 * @param {string} params.title - Short notification title
 * @param {string} params.message - Detailed notification description
 * @param {string} [params.type] - Notification type: 'info' | 'success' | 'warning' | 'danger'
 * @param {string} [params.sentBy] - Optional user ID who triggered event
 */
async function sendAdminNotification({ title, message, type = 'info', sentBy = 'system' }) {
  try {
    const notifId = generateUID('notif_adm');
    
    // Insert admin notification record
    await db.query(`
      INSERT INTO notifications (id, title, message, target_role, type, sent_by, is_active, is_read, created_at)
      VALUES ($1, $2, $3, 'admin', $4, $5, true, false, NOW())
    `, [notifId, title, message, type, sentBy]);

    console.log(`[AdminNotificationService] Sent notification: "${title}"`);
  } catch (err) {
    console.error('[AdminNotificationService] Error sending admin notification:', err.message);
  }
}

module.exports = { sendAdminNotification };
