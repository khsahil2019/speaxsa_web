const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

function hashPassword(plain) {
  return bcrypt.hashSync(plain, SALT_ROUNDS);
}

const crypto = require('crypto');

function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  // 1. Try bcrypt if it looks like a bcrypt hash
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    try {
      return bcrypt.compareSync(plain, hash);
    } catch (e) {
      // Fall through
    }
  }
  
  // 2. Try SHA-256 fallback
  try {
    const sha = crypto.createHash('sha256').update(plain).digest('hex');
    if (sha === hash) return true;
  } catch (e) {
    // Fall through
  }

  // 3. Try plain text fallback
  return plain === hash;
}

function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

function generateUID(prefix = 'user') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function generateStudentCode(sequence) {
  const padded = String(sequence).padStart(6, '0');
  return `SPX-STU-1${padded}`;
}

function generateTeacherReferralCode(name) {
  const clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase().substr(0, 4);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SPX-${clean}-${random}`;
}

function sanitizeUser(user) {
  if (!user) return null;
  const safe = { ...user };
  delete safe.password_hash;
  return safe;
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateOTP,
  generateUID,
  generateStudentCode,
  generateTeacherReferralCode,
  sanitizeUser,
};
