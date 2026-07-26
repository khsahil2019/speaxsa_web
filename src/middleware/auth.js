const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'speaxa_super_secret_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required', code: 'TOKEN_MISSING' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decodedUser) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token', code: 'TOKEN_INVALID' });
    }

    // 1. Admins and Impersonators pass through immediately
    if (decodedUser && (decodedUser.role === 'admin' || decodedUser.is_impersonating)) {
      req.user = decodedUser;
      return next();
    }

    // 2. Exclude verification paths from block checks
    const publicPaths = [
      '/api/auth/profile/send-phone-otp',
      '/api/auth/profile/verify-phone-otp',
      '/api/auth/send-mobile-otp',
      '/api/auth/verify-mobile-otp',
      '/api/auth/send-email-link',
      '/api/auth/verify-email',
      '/api/auth/verification-status',
      '/api/auth/logout',
      '/api/auth/profile'
    ];

    const isVerificationPath = publicPaths.some(p => req.originalUrl.startsWith(p));
    if (isVerificationPath) {
      req.user = decodedUser;
      return next();
    }

    try {
      const userRes = await db.query(
        'SELECT id, role, is_disabled, approval_status, phone_verified, email_verified FROM users WHERE id = $1',
        [decodedUser.id]
      );

      // If user does not exist in database (e.g. deleted by admin)
      if (userRes.rows.length === 0) {
        return res.status(401).json({
          error: 'Your account has been deleted from the system. You have been logged out.',
          code: 'ACCOUNT_DELETED'
        });
      }

      const dbUser = userRes.rows[0];

      // If account is disabled or suspended by admin
      if (dbUser.is_disabled === true || dbUser.approval_status === 'suspended' || dbUser.approval_status === 'rejected') {
        return res.status(401).json({
          error: 'Your account has been suspended or deactivated by administration. You have been logged out.',
          code: 'ACCOUNT_SUSPENDED'
        });
      }

      req.user = { ...decodedUser, ...dbUser };
      next();
    } catch (dbErr) {
      console.error('[Auth Middleware] Verification check warning:', dbErr.message);
      req.user = decodedUser;
      next();
    }
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}`,
        code: 'FORBIDDEN'
      });
    }
    next();
  };
}

function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

function requireTeacher(req, res, next) {
  return requireRole('admin', 'teacher')(req, res, next);
}

function requireStudent(req, res, next) {
  return requireRole('admin', 'student')(req, res, next);
}

function requireParent(req, res, next) {
  return requireRole('admin', 'parent')(req, res, next);
}

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireTeacher,
  requireStudent,
  requireParent,
  JWT_SECRET,
  JWT_EXPIRES_IN,
};
