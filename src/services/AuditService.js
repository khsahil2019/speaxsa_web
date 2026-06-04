const db = require('../db');

/**
 * Central audit log writer for all critical platform actions.
 */
async function logAudit(actorId, action, targetType, targetId, details = {}, extras = {}) {
  try {
    const actor = actorId ? await db.query(
      'SELECT name, role FROM users WHERE id = $1', [actorId]
    ) : { rows: [{ name: 'System', role: 'system' }] };

    const actorRow = actor.rows[0] || { name: 'Unknown', role: 'unknown' };

    await db.query(`
      INSERT INTO audit_logs 
        (actor_id, actor_name, actor_role, action, target_type, target_id, target_name, details, ip_address, user_agent, impersonated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      actorId || null,
      actorRow.name,
      actorRow.role,
      action,
      targetType || null,
      targetId || null,
      details.target_name || null,
      JSON.stringify(details),
      extras.ip || null,
      extras.userAgent || null,
      extras.impersonatedBy || null,
    ]);
  } catch (err) {
    console.error('[AuditLog] Failed to write audit log:', err.message);
  }
}

/**
 * Express middleware factory for audit logging.
 * Usage: router.post('/endpoint', auditMiddleware('ACTION_NAME', 'target_type'), handler)
 */
function auditMiddleware(action, targetType = 'api') {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      // Only log on success (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        logAudit(
          req.user.id,
          action,
          targetType,
          req.params.id || req.body.id || null,
          { body: req.body, response: data },
          {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            impersonatedBy: req.user.impersonatedBy || null,
          }
        ).catch(() => {});
      }
      return originalJson(data);
    };
    next();
  };
}

module.exports = { logAudit, auditMiddleware };
