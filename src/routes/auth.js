const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, JWT_SECRET, JWT_EXPIRES_IN } = require('../middleware/auth');
const { hashPassword, verifyPassword, generateUID, generateStudentCode, generateTeacherReferralCode, sanitizeUser } = require('../utils/security');
const { createOTP, verifyOTP, sendOTPEmail, sendOTPSms } = require('../services/OTPService');
const { logAudit } = require('../services/AuditService');
const SystemConfigService = require('../services/SystemConfigService');

// ── POST /api/auth/register ──────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, phone, role, password, qualification, board, grade, experience_years, subject_expertise, languages, address, alt_email, mobile_number, social_links, referred_by_code } = req.body;

  try {
    if (!name || !email || !phone || !role || !password) {
      return res.status(400).json({ error: 'name, email, phone, role, and password are required' });
    }
    if (!['teacher', 'student', 'parent'].includes(role)) {
      return res.status(400).json({ error: 'Role must be teacher, student, or parent' });
    }

    // Role-based Email and Phone uniqueness validation
    if (role === 'teacher') {
      const emailCheck = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      const phoneCheck = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
      if (phoneCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Mobile number already registered' });
      }
    } else if (role === 'student') {
      // Check if email or phone is linked to a non-student account (teacher or parent)
      const nonStudentEmail = await db.query("SELECT id, role FROM users WHERE LOWER(email) = LOWER($1) AND role != 'student'", [email]);
      if (nonStudentEmail.rows.length > 0) {
        return res.status(400).json({ error: `This email belongs to a ${nonStudentEmail.rows[0].role} account and cannot be shared.` });
      }
      const nonStudentPhone = await db.query("SELECT id, role FROM users WHERE phone = $1 AND role != 'student'", [phone]);
      if (nonStudentPhone.rows.length > 0) {
        return res.status(400).json({ error: `This mobile number belongs to a ${nonStudentPhone.rows[0].role} account and cannot be shared.` });
      }

      // Check student limits (max 2 student accounts per email, and max 2 student accounts per phone)
      const emailCountRes = await db.query("SELECT COUNT(*) as count FROM users WHERE LOWER(email) = LOWER($1) AND role = 'student'", [email]);
      if (parseInt(emailCountRes.rows[0].count || 0) >= 2) {
        return res.status(400).json({ error: 'This email is already linked to the maximum limit of 2 student accounts.' });
      }
      const phoneCountRes = await db.query("SELECT COUNT(*) as count FROM users WHERE phone = $1 AND role = 'student'", [phone]);
      if (parseInt(phoneCountRes.rows[0].count || 0) >= 2) {
        return res.status(400).json({ error: 'This mobile number is already linked to the maximum limit of 2 student accounts.' });
      }
    } else {
      // Default checks for parents or other roles
      const emailCheck = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      const phoneCheck = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
      if (phoneCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Mobile number already registered' });
      }
    }

    const id = generateUID(role.substr(0, 3));
    const passwordHash = hashPassword(password);
    const photoUrl = null;

    let approvalStatus = 'approved';
    let teacherLevel = null;
    let studentCode = null;
    let referralCode = null;

    if (role === 'teacher') {
      approvalStatus = 'pending';
      teacherLevel = 'Bronze';
      referralCode = generateTeacherReferralCode(name);
    }

    // Process referral code if provided
    let referredById = null;
    if (referred_by_code) {
      const referrer = await db.query("SELECT id, role FROM users WHERE referral_code = $1", [referred_by_code.trim()]);
      if (referrer.rows.length > 0) {
        const refUser = referrer.rows[0];
        if (refUser.role === 'teacher') {
          if (role === 'teacher') {
            // Verify capacity cap (maximum from settings per referring teacher)
            const countCheck = await db.query(
              "SELECT COUNT(*) as count FROM users WHERE referred_by = $1 AND role = 'teacher'",
              [refUser.id]
            );
            const currentCount = parseInt(countCheck.rows[0].count || 0);
            const maxCap = parseInt(await SystemConfigService.getSetting('teacher_referral_max_cap', 10));
            if (currentCount < maxCap) {
              referredById = refUser.id;
            } else {
              console.log(`[Referral Signup] Referrer ${refUser.id} has already reached capacity limit (${maxCap}). Link skipped.`);
            }
          } else {
            referredById = refUser.id;
          }
        }
      }
    }

    if (role === 'student') {
      // Generate unique student code
      const countRes = await db.query("SELECT COUNT(*) as cnt FROM users WHERE role = 'student'");
      const count = parseInt(countRes.rows[0].cnt) + 1;
      studentCode = generateStudentCode(count);
    }

    await db.query(`
      INSERT INTO users (id, email, phone, name, role, password_hash, password_plain, photo_url,
        approval_status, teacher_level, qualification, experience_years, subject_expertise,
        languages, address, board, grade, student_code, referral_code, alt_email, mobile_number, social_links, referred_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
    `, [
      id, email, phone, name, role, passwordHash, password, photoUrl,
      approvalStatus, teacherLevel, qualification || null, experience_years || 0,
      subject_expertise || null, languages || null, address || null, board || null,
      grade || null, studentCode, referralCode, alt_email || null, mobile_number || null,
      typeof social_links === 'object' ? JSON.stringify(social_links) : (social_links || '{}'),
      referredById
    ]);

    // Create teacher SOP entry if teacher
    if (role === 'teacher') {
      await db.query(
        'INSERT INTO teacher_sop (id, teacher_id, status) VALUES ($1, $2, $3)',
        [`sop_${id}`, id, 'pending']
      );
    }

    // Create teacher wallet if teacher
    if (role === 'teacher') {
      await db.query(
        'INSERT INTO teacher_wallet (teacher_id) VALUES ($1) ON CONFLICT (teacher_id) DO NOTHING', [id]
      );
    }

    const token = jwt.sign({ id, email, name, phone, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const userRow = (await db.query('SELECT * FROM users WHERE id = $1', [id])).rows[0];
    
    await logAudit(id, 'REGISTER', 'user', id, { role, email });

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: sanitizeUser(userRow),
    });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found with this email' });

    let user = null;
    for (const row of result.rows) {
      if (verifyPassword(password, row.password_hash)) {
        user = row;
        break;
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    if (user.is_disabled) return res.status(403).json({ error: 'Account disabled. Contact admin.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    await logAudit(user.id, 'LOGIN', 'user', user.id, { method: 'email_password' }, { ip: req.ip });

    return res.json({ message: 'Login successful', token, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/send-otp ───────────────────────────────────
router.post('/send-otp', async (req, res) => {
  const { email, phone, identifier, purpose = 'login' } = req.body;
  const input = email || phone || identifier;
  try {
    if (!input) return res.status(400).json({ error: 'Email or phone identifier is required' });

    const isEmail = input.includes('@');
    let query = isEmail 
      ? 'SELECT id, name, email, phone FROM users WHERE LOWER(email) = LOWER($1)' 
      : 'SELECT id, name, email, phone FROM users WHERE phone = $1';
    
    const result = await db.query(query, [input]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: isEmail ? 'User not found with this email' : 'User not found with this phone number' });
    }
    const user = result.rows[0];

    const { otp } = await createOTP(input, purpose);
    let sentInfo;
    if (isEmail) {
      sentInfo = await sendOTPEmail(user.email, otp, purpose);
    } else {
      sentInfo = await sendOTPSms(user.phone, otp, purpose);
    }

    res.json({
      message: `OTP sent to ${input}`,
      method: sentInfo.method,
      // Only return OTP in development for testing
      ...(process.env.NODE_ENV !== 'production' && { otp }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  const { email, phone, identifier, otp, purpose = 'login' } = req.body;
  const input = email || phone || identifier;
  try {
    if (!input || !otp) return res.status(400).json({ error: 'Identifier and OTP are required' });

    const { valid, error } = await verifyOTP(input, otp, purpose);
    if (!valid) return res.status(400).json({ error });

    const isEmail = input.includes('@');
    let query = isEmail 
      ? 'SELECT * FROM users WHERE LOWER(email) = LOWER($1)' 
      : 'SELECT * FROM users WHERE phone = $1';
      
    const result = await db.query(query, [input]);
    const activeUsers = result.rows.filter(u => !u.is_disabled);
    if (activeUsers.length === 0) {
      return res.status(404).json({ error: result.rows.length > 0 ? 'Account disabled' : 'User not found' });
    }
    const user = activeUsers[0];

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    await logAudit(user.id, 'LOGIN_OTP', 'user', user.id, { method: 'otp' }, { ip: req.ip });

    return res.json({ message: 'OTP verified. Login successful.', token, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email, phone, identifier } = req.body;
  const input = email || phone || identifier;
  try {
    if (!input) return res.status(400).json({ error: 'Identifier is required' });

    const isEmail = input.includes('@');
    let query = isEmail 
      ? 'SELECT id, name, email, phone FROM users WHERE LOWER(email) = LOWER($1)' 
      : 'SELECT id, name, email, phone FROM users WHERE phone = $1';

    const result = await db.query(query, [input]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No account found with this identifier' });
    }
    const user = result.rows[0];

    const { otp } = await createOTP(input, 'forgot_password');
    if (isEmail) {
      await sendOTPEmail(user.email, otp, 'forgot_password');
    } else {
      await sendOTPSms(user.phone, otp, 'forgot_password');
    }

    res.json({
      message: 'Password reset OTP sent successfully',
      ...(process.env.NODE_ENV !== 'production' && { otp }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { email, phone, identifier, otp, newPassword } = req.body;
  const input = email || phone || identifier;
  try {
    if (!input || !otp || !newPassword) {
      return res.status(400).json({ error: 'identifier, otp, and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const { valid, error } = await verifyOTP(input, otp, 'forgot_password');
    if (!valid) return res.status(400).json({ error });

    const hash = hashPassword(newPassword);
    
    const isEmail = input.includes('@');
    let query = isEmail 
      ? 'UPDATE users SET password_hash = $1, password_plain = $2 WHERE LOWER(email) = LOWER($3)' 
      : 'UPDATE users SET password_hash = $1, password_plain = $2 WHERE phone = $3';

    await db.query(query, [hash, newPassword, input]);

    res.json({ message: 'Password reset successful. You can now login.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/change-password (authenticated) ───────────
router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }

    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    if (!verifyPassword(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hash = hashPassword(newPassword);
    await db.query(
      'UPDATE users SET password_hash = $1, password_plain = $2 WHERE id = $3',
      [hash, newPassword, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auth/profile ─────────────────────────────────────
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(sanitizeUser(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/auth/profile ─────────────────────────────────────
router.put('/profile', authenticateToken, async (req, res) => {
  const { name, phone, qualification, board, grade, address, subject_expertise, languages, bio, photo_url, experience_years, alt_email, mobile_number, social_links } = req.body;
  try {
    const updates = [];
    const values = [];
    let idx = 1;

    const fields = { name, phone, qualification, board, grade, address, subject_expertise, languages, bio, photo_url, experience_years, alt_email, mobile_number };
    
    if (social_links !== undefined) {
      fields.social_links = typeof social_links === 'object' ? JSON.stringify(social_links) : social_links;
    }

    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) {
        updates.push(`${key} = $${idx++}`);
        values.push(val);
      }
    }
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) return res.status(400).json({ error: 'No fields to update' });

    values.push(req.user.id);
    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    res.json({ message: 'Profile updated', user: sanitizeUser(result.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/upload-avatar ──────────────────────────────
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../public/uploads/avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `avatar_${req.user.id}_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const avatarUpload = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/upload-avatar', authenticateToken, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const photoUrl = `/uploads/avatars/${req.file.filename}`;
    const result = await db.query('UPDATE users SET photo_url = $1 WHERE id = $2 RETURNING *', [photoUrl, req.user.id]);
    res.json({ message: 'Avatar uploaded', photoUrl, user: sanitizeUser(result.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/fcm-token ──────────────────────────────────
router.post('/fcm-token', authenticateToken, async (req, res) => {
  const { token, device_type = 'web' } = req.body;
  try {
    if (!token) return res.status(400).json({ error: 'token is required' });
    await db.query(`
      INSERT INTO fcm_tokens (user_id, token, device_type, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, token) DO UPDATE SET updated_at = NOW()
    `, [req.user.id, token, device_type]);
    res.json({ message: 'FCM token registered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await logAudit(req.user.id, 'LOGOUT', 'user', req.user.id, {}, { ip: req.ip });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
