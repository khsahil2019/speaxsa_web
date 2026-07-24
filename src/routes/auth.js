const express = require('express');
const crypto = require('crypto');
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
    const cleanPhone = phone.replace(/^\+91/, '').replace(/^91/, '').trim();
    const formattedPhone = phone.startsWith('+') ? phone : '+91' + cleanPhone;

    if (role === 'teacher') {
      const emailCheck = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(alt_email) = LOWER($1)', [email]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'This email address is already registered.' });
      }
      const phoneCheck = await db.query('SELECT id FROM users WHERE phone = $1 OR mobile_number = $1 OR phone = $2 OR mobile_number = $2', [formattedPhone, cleanPhone]);
      if (phoneCheck.rows.length > 0) {
        return res.status(400).json({ error: 'This mobile number is already registered.' });
      }
    } else if (role === 'student') {
      // Check if email or phone is linked to a non-student account (teacher or parent)
      const nonStudentEmail = await db.query("SELECT id, role FROM users WHERE (LOWER(email) = LOWER($1) OR LOWER(alt_email) = LOWER($1)) AND role != 'student'", [email]);
      if (nonStudentEmail.rows.length > 0) {
        return res.status(400).json({ error: `This email belongs to a ${nonStudentEmail.rows[0].role} account and cannot be shared.` });
      }
      const nonStudentPhone = await db.query("SELECT id, role FROM users WHERE (phone = $1 OR mobile_number = $1 OR phone = $2 OR mobile_number = $2) AND role != 'student'", [formattedPhone, cleanPhone]);
      if (nonStudentPhone.rows.length > 0) {
        return res.status(400).json({ error: `This mobile number belongs to a ${nonStudentPhone.rows[0].role} account and cannot be shared.` });
      }

      // Check student limits (max 2 student accounts per email, and max 2 student accounts per phone)
      const emailCountRes = await db.query("SELECT COUNT(*) as count FROM users WHERE (LOWER(email) = LOWER($1) OR LOWER(alt_email) = LOWER($1)) AND role = 'student'", [email]);
      if (parseInt(emailCountRes.rows[0].count || 0) >= 2) {
        return res.status(400).json({ error: 'This email is already linked to the maximum limit of 2 student accounts.' });
      }
      const phoneCountRes = await db.query("SELECT COUNT(*) as count FROM users WHERE (phone = $1 OR mobile_number = $1 OR phone = $2 OR mobile_number = $2) AND role = 'student'", [formattedPhone, cleanPhone]);
      if (parseInt(phoneCountRes.rows[0].count || 0) >= 2) {
        return res.status(400).json({ error: 'This mobile number is already linked to the maximum limit of 2 student accounts.' });
      }
    } else {
      // Default checks for parents or other roles
      const emailCheck = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(alt_email) = LOWER($1)', [email]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'This email address is already registered.' });
      }
      const phoneCheck = await db.query('SELECT id FROM users WHERE phone = $1 OR mobile_number = $1 OR phone = $2 OR mobile_number = $2', [formattedPhone, cleanPhone]);
      if (phoneCheck.rows.length > 0) {
        return res.status(400).json({ error: 'This mobile number is already registered.' });
      }
    }

    // Registration OTP Verification (Managed via Admin Settings - Email Only)
    const requireOtp = await SystemConfigService.getSetting('require_registration_otp', true);
    const requireOtpBool = String(requireOtp) === 'true' || requireOtp === true;

    let { otp, emailOtp } = req.body;
    const verificationOtp = emailOtp || otp;

    if (requireOtpBool) {
      if (!verificationOtp) {
        const { otp: smsOtpVal, tokenId: smsTokenId } = await createOTP(phone, 'verify_mobile');
        
        try {
          await sendOTPSms(phone, smsOtpVal, 'verify_mobile', smsTokenId);
        } catch (smsErr) {
          console.error('[Auth] Failed to send registration SMS OTP:', smsErr.message);
        }

        const devOtpSetting = await SystemConfigService.getSetting('dev_otp_in_response', 'false');
        const showDevOtp = String(devOtpSetting) === 'true';

        return res.status(200).json({
          status: 'otp_sent',
          message: `Verification SMS code sent to mobile number ${phone}. Please enter it below.`,
          phone: phone,
          ...(showDevOtp && { otp: smsOtpVal })
        });
      } else {
        // Verify mobile SMS OTP
        const mobileVerification = await verifyOTP(phone, verificationOtp, 'verify_mobile');
        let mobileValid = mobileVerification.valid;
        if (!mobileValid) {
          const emailFallback = await verifyOTP(email, verificationOtp, 'register_email');
          if (emailFallback.valid) mobileValid = true;
        }
        if (!mobileValid) {
          return res.status(400).json({ error: 'Invalid or expired SMS OTP code. Please enter the 6 digits sent to your phone.' });
        }
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
      teacherLevel = null;
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

    const isVerifiedOnInit = requireOtpBool ? true : false;

    await db.query(`
      INSERT INTO users (id, email, phone, name, role, password_hash, password_plain, photo_url,
        approval_status, teacher_level, qualification, experience_years, subject_expertise,
        languages, address, board, grade, student_code, referral_code, alt_email, mobile_number, social_links, referred_by, phone_verified, email_verified)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
    `, [
      id, email, phone, name, role, passwordHash, password, photoUrl,
      approvalStatus, teacherLevel, qualification || null, experience_years || 0,
      subject_expertise || null, languages || null, address || null, board || null,
      grade || null, studentCode, referralCode, alt_email || null, mobile_number || null,
      typeof social_links === 'object' ? JSON.stringify(social_links) : (social_links || '{}'),
      referredById, isVerifiedOnInit, false
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

    const userRow = (await db.query('SELECT * FROM users WHERE id = $1', [id])).rows[0];
    await logAudit(id, 'REGISTER', 'user', id, { role, email });

    let firebaseCustomToken = null;
    try {
      const fbAdmin = require('../services/FirebaseService').getFirebaseAdmin();
      firebaseCustomToken = await fbAdmin.auth().createCustomToken(userRow.id);
    } catch (fbErr) {
      console.error('[Auth Register] Failed to create Firebase custom token:', fbErr.message);
    }

    let token = null;
    if (isVerifiedOnInit) {
      token = jwt.sign(
        { id: userRow.id, email: userRow.email, name: userRow.name, role: userRow.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
    }

    return res.status(201).json({
      message: isVerifiedOnInit ? 'Registration successful. Account verified.' : 'Registration successful. Verification required.',
      status: isVerifiedOnInit ? 'verified' : 'verification_pending',
      step: isVerifiedOnInit ? 'completed' : 'mobile',
      token,
      email: userRow.email,
      phone: userRow.phone,
      firebaseCustomToken,
      user: sanitizeUser(userRow),
    });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email/Phone and password are required' });
    }

    const identifier = email.trim();
    const isEmailInput = identifier.includes('@');
    let queryText = isEmailInput
      ? 'SELECT * FROM users WHERE LOWER(email) = LOWER($1)'
      : 'SELECT * FROM users WHERE phone = $1 OR mobile_number = $1';
    const queryParams = [identifier];

    if (role) {
      queryText += ' AND role = $2';
      queryParams.push(role);
    }

    const result = await db.query(queryText, queryParams);
    if (result.rows.length === 0) {
      const errMsg = role === 'student' 
        ? 'This email/phone is not registered with us as a student'
        : (role ? `User not found with this email/phone registered as a ${role}` : 'User not found with this email/phone');
      return res.status(404).json({ error: errMsg });
    }

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

    // Enforce Email Verification for non-admin accounts except parents entering panel
    if (user.role !== 'admin' && user.role !== 'parent') {
      if (!user.email_verified) {
        try {
          await sendEmailVerificationLink(user.id, req);
        } catch (e) {
          console.error('[Auth Login] Failed to auto-send email verification link:', e.message);
        }

        return res.status(403).json({
          error: 'Please verify your email address before logging in. A verification link has been sent to your email inbox.',
          status: 'email_not_verified',
          email: user.email
        });
      }
    }

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
    
    const result = await db.query(query, [input.trim()]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: isEmail ? 'User not found with this email' : 'User not found with this phone number' });
    }
    const user = result.rows[0];

    const targetPhone = phone || user.phone;
    const targetEmail = email || user.email;

    if (purpose === 'verify_mobile') {
      const { otp, tokenId } = await createOTP(targetPhone, 'verify_mobile');
      await createOTP(targetEmail, 'verify_mobile');
      
      const sentInfo = await sendOTPSms(targetPhone, otp, 'verify_mobile', tokenId);
      const devOtpSetting = await SystemConfigService.getSetting('dev_otp_in_response', 'false');
      const showDevOtp = String(devOtpSetting) === 'true';

      return res.json({
        message: `Verification OTP sent to mobile number ${targetPhone} via MSG91`,
        method: sentInfo.method,
        phone: targetPhone,
        ...(showDevOtp && { otp }),
      });
    }

    const { otp, tokenId } = await createOTP(input, purpose);
    let sentInfo;
    if (isEmail) {
      sentInfo = await sendOTPEmail(user.email, otp, purpose, tokenId);
    } else {
      sentInfo = await sendOTPSms(user.phone, otp, purpose, tokenId);
    }

    const devOtpSetting = await SystemConfigService.getSetting('dev_otp_in_response', 'false');
    const showDevOtp = String(devOtpSetting) === 'true';

    res.json({
      message: `OTP sent to ${input}`,
      method: sentInfo.method,
      ...(showDevOtp && { otp }),
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

    const isEmail = input.includes('@');

    let verification = await verifyOTP(input.trim(), otp.trim(), purpose);
    if (!verification.valid && isEmail) {
      const uRes = await db.query('SELECT phone FROM users WHERE LOWER(email) = LOWER($1)', [input.trim()]);
      if (uRes.rows.length > 0 && uRes.rows[0].phone) {
        verification = await verifyOTP(uRes.rows[0].phone, otp.trim(), purpose);
      }
    }

    if (!verification.valid) {
      return res.status(400).json({ error: verification.error || 'Invalid or expired OTP code' });
    }

    let query, params;
    if (isEmail) {
      query = 'SELECT * FROM users WHERE LOWER(email) = LOWER($1)';
      params = [input.trim()];
    } else {
      const digits = input.replace(/\D/g, '');
      const clean10 = digits.length >= 10 ? digits.slice(-10) : digits;
      const formatted = '+91' + clean10;
      query = 'SELECT * FROM users WHERE phone = $1 OR mobile_number = $1 OR phone = $2 OR mobile_number = $2 OR phone = $3 OR mobile_number = $3';
      params = [input.trim(), clean10, formatted];
    }
      
    const result = await db.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User account not found for verification.' });
    const user = result.rows[0];

    if (purpose === 'verify_mobile' || purpose === 'register_email' || purpose === 'register') {
      await db.query('UPDATE users SET phone_verified = true, updated_at = NOW() WHERE id = $1', [user.id]);

      try {
        await sendEmailVerificationLink(user.id, req);
      } catch (eErr) {
        console.error('[Auth Verify OTP] Email link trigger error:', eErr.message);
      }

      const updatedRes = await db.query('SELECT * FROM users WHERE id = $1', [user.id]);
      const updatedUser = updatedRes.rows[0];

      const token = jwt.sign(
        { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, role: updatedUser.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.json({
        message: 'Mobile number verified successfully!',
        status: 'verified',
        token,
        user: sanitizeUser(updatedUser),
        email: updatedUser.email,
        phone: updatedUser.phone,
        phone_verified: true,
        email_verified: false
      });
    }

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

    const { otp, tokenId } = await createOTP(input, 'forgot_password');
    if (isEmail) {
      await sendOTPEmail(user.email, otp, 'forgot_password', tokenId);
    } else {
      await sendOTPSms(user.phone, otp, 'forgot_password', tokenId);
    }

    const devOtpSetting = await SystemConfigService.getSetting('dev_otp_in_response', 'true');
    const showDevOtp = String(devOtpSetting) === 'true';

    res.json({
      message: 'Password reset OTP sent successfully',
      ...(showDevOtp && { otp }),
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
  const email = req.body.email;

  try {
    const currentUserRes = await db.query('SELECT phone, email, phone_verified, email_verified FROM users WHERE id = $1', [req.user.id]);
    if (currentUserRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const currentUser = currentUserRes.rows[0];

    const updates = [];
    const values = [];
    let idx = 1;

    let phoneChanged = false;
    let emailChanged = false;

    // Check phone change
    if (phone !== undefined && phone !== currentUser.phone) {
      // Validate uniqueness
      const phoneCheck = await db.query('SELECT id FROM users WHERE phone = $1 AND id != $2', [phone, req.user.id]);
      if (phoneCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Phone number already registered by another user' });
      }
      phoneChanged = true;
      updates.push(`phone_verified = FALSE`);
    }

    // Check email change
    if (email !== undefined && email.toLowerCase() !== currentUser.email.toLowerCase()) {
      // Validate uniqueness
      const emailCheck = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2', [email, req.user.id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already registered by another user' });
      }
      emailChanged = true;
      updates.push(`email = $${idx++}`);
      values.push(email.toLowerCase());
      updates.push(`email_verified = FALSE`);
    }

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

    if (updates.length === 1 && !phoneChanged && !emailChanged) return res.status(400).json({ error: 'No fields to update' });

    values.push(req.user.id);
    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    const updatedUser = result.rows[0];

    // Trigger verification resets
    if (phoneChanged) {
      try {
        const { otp: phoneOtp, tokenId: phoneTokenId } = await createOTP(phone, 'verify_mobile');
        await sendOTPSms(phone, phoneOtp, 'verify_mobile', phoneTokenId);
      } catch (smsErr) {
        console.error('[Auth Profile Update] Failed to auto-send mobile OTP:', smsErr.message);
      }
    }

    if (emailChanged) {
      try {
        await sendEmailVerificationLink(updatedUser.id, req);
      } catch (emailErr) {
        console.error('[Auth Profile Update] Failed to auto-send email link:', emailErr.message);
      }
    }

    res.json({ 
      message: 'Profile updated successfully', 
      user: sanitizeUser(updatedUser),
      phoneChanged,
      emailChanged
    });
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

// ── POST /api/auth/profile/send-phone-otp ───────────────────
router.post('/profile/send-phone-otp', authenticateToken, async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });
  try {
    const { otp, tokenId } = await createOTP(phone, 'verify_phone');
    const sentInfo = await sendOTPSms(phone, otp, 'verify_phone', tokenId);
    
    const devOtpSetting = await SystemConfigService.getSetting('dev_otp_in_response', 'true');
    const showDevOtp = String(devOtpSetting) === 'true';

    res.json({
      message: `Verification code sent to ${phone}`,
      method: sentInfo.method,
      ...(showDevOtp && { otp }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/profile/verify-phone-otp ─────────────────
router.post('/profile/verify-phone-otp', authenticateToken, async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone number and OTP are required' });
  try {
    const { valid, error } = await verifyOTP(phone, otp, 'verify_phone');
    if (!valid) return res.status(400).json({ error });

    await db.query('UPDATE users SET phone = $1, updated_at = NOW() WHERE id = $2', [phone, req.user.id]);
    res.json({ message: 'Mobile number verified and updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to send email verification link
async function sendEmailVerificationLink(userId, req) {
  const userRes = await db.query('SELECT id, email, name FROM users WHERE id = $1', [userId]);
  if (userRes.rows.length === 0) return;
  const user = userRes.rows[0];

  const token = crypto.randomBytes(32).toString('hex');
  
  const configRes = await db.query("SELECT value FROM platform_settings WHERE key = 'email_link_expiry_minutes'");
  const expiryMins = parseInt(configRes.rows[0]?.value || '30', 10);
  const expiresAt = new Date(Date.now() + expiryMins * 60 * 1000);

  // Invalidate previous active links
  await db.query('UPDATE email_verification_tokens SET used = true WHERE user_id = $1 AND used = false', [userId]);

  await db.query(
    'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const baseUrl = `${protocol}://${host}`;
  const verificationLink = `${baseUrl}/api/auth/verify-email?token=${token}`;

  const { sendEmail } = require('../services/EmailService');
  await sendEmail({
    to: user.email,
    subject: 'Verify your Speaxa Email Address',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your Email Address — SPEAXA</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#1e293b;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9; padding:40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px -5px rgba(0,0,0,0.08); border:1px solid #e2e8f0;">
          <tr>
            <td style="background-color:#0d7a6d; padding:32px 40px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:26px; font-weight:800; letter-spacing:1px;">
                SPEAXA
              </h1>
              <p style="margin:6px 0 0 0; color:#b4e5df; font-size:13px; font-weight:500;">
                Empowering Next-Gen Education
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 30px 40px;">
              <h2 style="margin:0 0 16px 0; color:#0f172a; font-size:20px; font-weight:700;">
                Verify Your Email Address
              </h2>
              <p style="margin:0 0 16px 0; color:#334155; font-size:15px; line-height:1.6;">
                Hello <strong>${user.name}</strong>,
              </p>
              <p style="margin:0 0 24px 0; color:#475569; font-size:15px; line-height:1.6;">
                Thank you for joining <strong>SPEAXA</strong>! To complete your profile and enable official email notifications, please confirm your email address by clicking the button below.
              </p>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:28px 0;">
                <tr>
                  <td align="center">
                    <a href="${verificationLink}" target="_blank" style="background-color:#0d7a6d; color:#ffffff; text-decoration:none; padding:15px 36px; border-radius:10px; font-weight:700; font-size:16px; display:inline-block; box-shadow:0 4px 12px rgba(13,122,109,0.25);">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#fffbe0; border-left:4px solid #f59e0b; border-radius:6px; margin:24px 0;">
                <tr>
                  <td style="padding:14px 18px; font-size:13px; color:#78350f; line-height:1.5;">
                    ⏳ <strong>Notice:</strong> This verification link is valid for <strong>${expiryMins} minutes</strong>. If the link expires, you can request a new link anytime from your profile/dashboard.
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0 0; color:#64748b; font-size:13px; line-height:1.5;">
                If you did not create an account on SPEAXA, no further action is required.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc; padding:24px 40px; border-top:1px solid #e2e8f0; font-size:12px; color:#64748b; line-height:1.6;">
              <p style="margin:0 0 8px 0; font-weight:600; color:#475569;">Having trouble with the button?</p>
              <p style="margin:0 0 12px 0; word-break:break-all; color:#0d7a6d;">
                <a href="${verificationLink}" style="color:#0d7a6d; text-decoration:underline;">${verificationLink}</a>
              </p>
              <hr style="border:none; border-top:1px solid #e2e8f0; margin:16px 0;">
              <p style="margin:0; text-align:center; color:#94a3b8; font-size:11px;">
                &copy; ${new Date().getFullYear()} SPEAXA EdTech Platform. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    type: 'otp'
  });
}

// ── GET /api/auth/verification-status ───────────────────────
router.get('/verification-status', async (req, res) => {
  const { identifier } = req.query;
  if (!identifier) return res.status(400).json({ error: 'identifier is required' });

  try {
    const cleanIdent = identifier.trim();
    const isEmail = cleanIdent.includes('@');
    let userRes;
    if (isEmail) {
      userRes = await db.query(
        'SELECT id, email, phone, phone_verified, email_verified, name, role FROM users WHERE LOWER(email) = LOWER($1)',
        [cleanIdent]
      );
    } else {
      const digits = cleanIdent.replace(/\D/g, '');
      const clean10 = digits.length >= 10 ? digits.slice(-10) : digits;
      const formatted = '+91' + clean10;
      userRes = await db.query(
        'SELECT id, email, phone, phone_verified, email_verified, name, role FROM users WHERE phone = $1 OR mobile_number = $1 OR phone = $2 OR mobile_number = $2 OR phone = $3 OR mobile_number = $3',
        [cleanIdent, clean10, formatted]
      );
    }

    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userRes.rows[0];

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      phone_verified: !!user.phone_verified,
      email_verified: !!user.email_verified,
      role: user.role
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/send-mobile-otp ──────────────────────────
router.post('/send-mobile-otp', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'Email or phone identifier is required' });

  try {
    const userRes = await db.query(
      'SELECT id, phone, email, phone_verified FROM users WHERE LOWER(email) = LOWER($1) OR phone = $1',
      [identifier.trim()]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    // Rate-limit resend request check: No more than 1 request per 60 seconds
    const lastTokenRes = await db.query(
      `SELECT created_at FROM otp_tokens 
       WHERE identifier = $1 AND purpose = 'verify_mobile' 
       ORDER BY created_at DESC LIMIT 1`,
      [user.phone]
    );

    if (lastTokenRes.rows.length > 0) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(lastTokenRes.rows[0].created_at).getTime()) / 1000);
      if (elapsedSeconds < 60) {
        return res.status(429).json({ 
          error: `Please wait ${60 - elapsedSeconds} seconds before requesting a new OTP.` 
        });
      }
    }

    const { otp, tokenId } = await createOTP(user.phone, 'verify_mobile');
    const sentInfo = await sendOTPSms(user.phone, otp, 'verify_mobile', tokenId);

    const devOtpSetting = await SystemConfigService.getSetting('dev_otp_in_response', 'true');
    const showDevOtp = String(devOtpSetting) === 'true';

    res.json({
      message: `Verification code sent to your mobile number (${user.phone.slice(0, 3)}***${user.phone.slice(-3)})`,
      method: sentInfo.method,
      ...(showDevOtp && { otp })
    });
  } catch (err) {
    console.error('[Auth] Send mobile OTP error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Helper to check master OTP setting
async function checkMasterOtp(otp) {
  const configRes = await db.query("SELECT value FROM platform_settings WHERE key = 'master_otp'");
  const masterOtp = configRes.rows[0]?.value;
  return masterOtp && masterOtp.trim() !== '' && otp === masterOtp.trim();
}

// ── POST /api/auth/verify-mobile-otp ────────────────────────
router.post('/verify-mobile-otp', async (req, res) => {
  const { identifier, otp } = req.body;
  if (!identifier || !otp) {
    return res.status(400).json({ error: 'Email/phone identifier and OTP are required' });
  }

  try {
    const cleanIdent = identifier.trim();
    const isEmail = cleanIdent.includes('@');
    let userRes;
    if (isEmail) {
      userRes = await db.query(
        'SELECT id, phone, email, phone_verified FROM users WHERE LOWER(email) = LOWER($1)',
        [cleanIdent]
      );
    } else {
      const digits = cleanIdent.replace(/\D/g, '');
      const clean10 = digits.length >= 10 ? digits.slice(-10) : digits;
      const formatted = '+91' + clean10;
      userRes = await db.query(
        'SELECT id, phone, email, phone_verified FROM users WHERE phone = $1 OR mobile_number = $1 OR phone = $2 OR mobile_number = $2 OR phone = $3 OR mobile_number = $3',
        [cleanIdent, clean10, formatted]
      );
    }

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    const digits = (user.phone || cleanIdent).replace(/\D/g, '');
    const clean10 = digits.length >= 10 ? digits.slice(-10) : digits;
    const phoneTargets = Array.from(new Set([cleanIdent, user.phone, clean10, '+91' + clean10, '91' + clean10]));

    const otpRes = await db.query(
      `SELECT * FROM otp_tokens 
       WHERE identifier = ANY($1) AND purpose = 'verify_mobile' AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phoneTargets]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new code.' });
    }

    const otpToken = otpRes.rows[0];

    const newAttempts = (otpToken.attempts || 0) + 1;
    await db.query('UPDATE otp_tokens SET attempts = $1 WHERE id = $2', [newAttempts, otpToken.id]);

    if (newAttempts > 5) {
      await db.query('UPDATE otp_tokens SET used = true WHERE id = $1', [otpToken.id]);
      return res.status(400).json({ error: 'Too many invalid attempts. This OTP has been invalidated. Please request a new one.' });
    }

    const isMaster = await checkMasterOtp(otp);
    if (otpToken.otp !== otp && !isMaster) {
      return res.status(400).json({ error: `Invalid verification code. (Attempts remaining: ${5 - newAttempts})` });
    }

    await db.query('BEGIN');
    await db.query('UPDATE otp_tokens SET used = true WHERE id = $1', [otpToken.id]);
    await db.query('UPDATE users SET phone_verified = true, updated_at = NOW() WHERE id = $1', [user.id]);
    await db.query('COMMIT');

    // Automatically send email verification link
    try {
      await sendEmailVerificationLink(user.id, req);
    } catch (e) {
      console.error('[Auth Verify Mobile] Failed to dispatch email link:', e.message);
    }

    res.json({
      message: 'Mobile number verified successfully. A verification link has been sent to your email.',
      step: 'email',
      email: user.email,
      phone: user.phone
    });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('[Auth] Verify mobile OTP error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/send-email-link ──────────────────────────
router.post('/send-email-link', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'Email or phone identifier is required' });

  try {
    const userRes = await db.query(
      'SELECT id, phone, email, phone_verified FROM users WHERE LOWER(email) = LOWER($1) OR phone = $1',
      [identifier.trim()]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    // Rate-limit check: No more than 1 link request per 60 seconds
    const lastTokenRes = await db.query(
      `SELECT created_at FROM email_verification_tokens 
       WHERE user_id = $1 
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );

    if (lastTokenRes.rows.length > 0) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(lastTokenRes.rows[0].created_at).getTime()) / 1000);
      if (elapsedSeconds < 60) {
        return res.status(429).json({ 
          error: `Please wait ${60 - elapsedSeconds} seconds before requesting a new verification email.` 
        });
      }
    }

    await sendEmailVerificationLink(user.id, req);

    res.json({
      message: `Verification link sent successfully to your email address (${user.email})`
    });
  } catch (err) {
    console.error('[Auth] Send email link error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auth/verify-email ──────────────────────────────
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2 style="color: #ef4444;">Verification Link Missing</h2>
        <p>The email verification link is invalid or malformed.</p>
        <a href="/verify.html" style="color: #0d7a6d; text-decoration: none; font-weight: 600;">Go to Verification Center</a>
      </div>
    `);
  }

  try {
    const tokenRes = await db.query(
      'SELECT * FROM email_verification_tokens WHERE token = $1 AND used = false AND expires_at > NOW()',
      [token]
    );

    if (tokenRes.rows.length === 0) {
      return res.status(400).send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #ef4444;">Verification Link Expired or Already Used</h2>
          <p>This verification link is invalid, expired, or has already been used.</p>
          <p>Please log in to your account and request a new verification email.</p>
          <a href="/verify.html" style="color: #0d7a6d; text-decoration: none; font-weight: 600;">Go to Verification Center</a>
        </div>
      `);
    }

    const { user_id, id: tokenId } = tokenRes.rows[0];

    await db.query('BEGIN');
    await db.query('UPDATE email_verification_tokens SET used = true WHERE id = $1', [tokenId]);
    await db.query('UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1', [user_id]);
    await db.query('COMMIT');

    res.send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px; max-width: 500px; margin: 50px auto; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <h2 style="color: #0d7a6d;">✓ Email Verified Successfully</h2>
        <p>Thank you! Your email address has been verified.</p>
        <p>You can now proceed to log in to the Speaxa portal.</p>
        <div style="margin-top: 30px;">
          <a href="/verify.html?verified=true" style="background-color: #0d7a6d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Proceed to Dashboard</a>
        </div>
      </div>
    `);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('[Auth] Verify email error:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

// ── GET /api/auth/firebase-config ───────────────────────────
router.get('/firebase-config', async (req, res) => {
  try {
    const keys = [
      'firebase_api_key',
      'firebase_auth_domain',
      'firebase_project_id',
      'firebase_storage_bucket',
      'firebase_messaging_sender_id',
      'firebase_app_id',
      'firebase_measurement_id'
    ];
    const settingsRes = await db.query('SELECT key, value FROM platform_settings WHERE key = ANY($1)', [keys]);
    
    const config = {};
    settingsRes.rows.forEach(r => {
      config[r.key] = r.value || '';
    });

    res.json({
      apiKey: config.firebase_api_key || process.env.FIREBASE_API_KEY || '',
      authDomain: config.firebase_auth_domain || process.env.FIREBASE_AUTH_DOMAIN || '',
      projectId: config.firebase_project_id || process.env.FIREBASE_PROJECT_ID || '',
      storageBucket: config.firebase_storage_bucket || process.env.FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: config.firebase_messaging_sender_id || process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: config.firebase_app_id || process.env.FIREBASE_APP_ID || '',
      measurementId: config.firebase_measurement_id || process.env.FIREBASE_MEASUREMENT_ID || ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/firebase-verify-phone ────────────────────
router.post('/firebase-verify-phone', async (req, res) => {
  const { idToken, identifier } = req.body;
  if (!idToken || !identifier) {
    return res.status(400).json({ error: 'idToken and identifier are required' });
  }

  try {
    const userRes = await db.query(
      'SELECT id, phone, email_verified FROM users WHERE LOWER(email) = LOWER($1) OR phone = $1',
      [identifier.trim()]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userRes.rows[0];

    const fbAdmin = require('../services/FirebaseService').getFirebaseAdmin();
    const decodedToken = await fbAdmin.auth().verifyIdToken(idToken);
    
    const fbPhoneNumber = decodedToken.phone_number;
    if (!fbPhoneNumber) {
      return res.status(400).json({ error: 'Provided ID token does not contain a verified phone number' });
    }

    const cleanFbPhone = fbPhoneNumber.replace(/\D/g, '');
    const cleanLocalPhone = user.phone.replace(/\D/g, '');

    if (!cleanFbPhone.endsWith(cleanLocalPhone)) {
      return res.status(400).json({
        error: `Phone number mismatch. Firebase phone: ${fbPhoneNumber}, registered phone: ${user.phone}`
      });
    }

    await db.query('UPDATE users SET phone_verified = TRUE WHERE id = $1', [user.id]);

    res.json({
      message: 'Mobile number verified successfully',
      email_verified: !!user.email_verified
    });
  } catch (err) {
    console.error('[Firebase Verify Phone] Error:', err);
    res.status(401).json({ error: 'Failed to verify mobile token: ' + err.message });
  }
});

// ── POST /api/auth/firebase-verify-email ────────────────────
router.post('/firebase-verify-email', async (req, res) => {
  const { idToken, identifier } = req.body;
  if (!idToken || !identifier) {
    return res.status(400).json({ error: 'idToken and identifier are required' });
  }

  try {
    const userRes = await db.query(
      'SELECT id, email, phone_verified FROM users WHERE LOWER(email) = LOWER($1) OR phone = $1',
      [identifier.trim()]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userRes.rows[0];

    const fbAdmin = require('../services/FirebaseService').getFirebaseAdmin();
    const decodedToken = await fbAdmin.auth().verifyIdToken(idToken);

    if (decodedToken.email && decodedToken.email.toLowerCase() !== user.email.toLowerCase()) {
      return res.status(400).json({ error: 'Email address mismatch' });
    }

    if (!decodedToken.email_verified) {
      return res.status(400).json({ error: 'Email has not been verified yet in Firebase' });
    }

    await db.query('UPDATE users SET email_verified = TRUE WHERE id = $1', [user.id]);

    res.json({
      message: 'Email address verified successfully'
    });
  } catch (err) {
    console.error('[Firebase Verify Email] Error:', err);
    res.status(401).json({ error: 'Failed to verify email token: ' + err.message });
  }
});

module.exports = router;
