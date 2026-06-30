const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const { hashPassword, sanitizeUser } = require('../utils/security');
const { logAudit } = require('../services/AuditService');
const configService = require('../services/SystemConfigService');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const { JWT_SECRET, JWT_EXPIRES_IN } = require('../middleware/auth');

// ── Admin Login ───────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { verifyPassword } = require('../utils/security');
    const result = await db.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND role = 'admin'", [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid admin credentials' });

    const user = result.rows[0];
    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    await logAudit(user.id, 'ADMIN_LOGIN', 'user', user.id, {}, { ip: req.ip });

    return res.json({ message: 'Admin login successful', token, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/settings/public', async (req, res) => {
  try {
    const settings = await configService.getConfig();
    const publicSettings = {
      logo_text: settings.logo_text || 'SPEAXA',
      logo_url: settings.logo_url || '/admin/logo.png',
      announcement: settings.announcement || 'Welcome to SPEAXA!',
      ad_banners: settings.ad_banners || [],
      platform_name: settings.platform_name || 'SPEAXA',
      support_email: settings.support_email || 'support@speaxa.com',
      support_phone: settings.support_phone || '+91 9999 999 999',
      support_hours: settings.support_hours || 'Mon–Sat: 8 AM – 8 PM IST',
      max_batch_capacity: settings.max_batch_capacity || 30,
    };
    for (const [key, value] of Object.entries(settings)) {
      if (key.startsWith('home_')) {
        publicSettings[key] = value;
      }
    }
    return res.json(publicSettings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Auth Middleware (all routes below require admin JWT) ─
router.use((req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Admin token required' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired admin token' });
    if (!decoded || decoded.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    req.user = decoded;
    next();
  });
});

// ── Platform Settings ─────────────────────────────────────────
router.get('/settings', async (req, res) => {
  try {
    const settings = await configService.getConfig();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await configService.updateConfig(key, value);
    }
    await logAudit(req.user.id, 'SETTINGS_UPDATED', 'platform', 'settings', { keys: Object.keys(settings) });
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Dashboard Stats ───────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const [teachers, students, parents, courses, batches, liveClasses, revenue, payouts] = await Promise.all([
      db.query("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'"),
      db.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'"),
      db.query("SELECT COUNT(*) as count FROM users WHERE role = 'parent'"),
      db.query("SELECT COUNT(*) as count FROM courses WHERE status = 'active'"),
      db.query("SELECT COUNT(*) as count FROM batches WHERE status = 'active'"),
      db.query("SELECT COUNT(*) as count FROM live_classes WHERE status = 'live'"),
      db.query("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status = 'captured'"),
      db.query("SELECT COALESCE(SUM(amount),0) as total FROM teacher_payouts WHERE status = 'requested'"),
    ]);

    res.json({
      totalTeachers: parseInt(teachers.rows[0].count),
      totalStudents: parseInt(students.rows[0].count),
      totalParents: parseInt(parents.rows[0].count),
      totalCourses: parseInt(courses.rows[0].count),
      activeBatches: parseInt(batches.rows[0].count),
      runningClasses: parseInt(liveClasses.rows[0].count),
      totalRevenue: parseFloat(revenue.rows[0].total),
      pendingPayouts: parseFloat(payouts.rows[0].total),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Teacher Management ────────────────────────────────────────
router.get('/teachers', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE role = 'teacher' ORDER BY created_at DESC");
    res.json(result.rows.map(sanitizeUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/teachers/:id', async (req, res) => {
  try {
    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    const sopRes = await db.query('SELECT * FROM teacher_sop WHERE teacher_id = $1', [req.params.id]);
    const docsRes = await db.query('SELECT * FROM teacher_documents WHERE teacher_id = $1', [req.params.id]);
    const walletRes = await db.query('SELECT * FROM teacher_wallet WHERE teacher_id = $1', [req.params.id]);
    
    if (!userRes.rows[0]) return res.status(404).json({ error: 'Teacher not found' });
    res.json({
      teacher: sanitizeUser(userRes.rows[0]),
      sop: sopRes.rows[0] || null,
      documents: docsRes.rows,
      wallet: walletRes.rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/teachers/:id/wallet/statement - Fetch statement history for a teacher
router.get('/teachers/:id/wallet/statement', async (req, res) => {
  const { id } = req.params;
  try {
    const statementRes = await db.query(`
      SELECT l.*, p.amount as payment_amount, u.name as referred_user_name
      FROM teacher_wallet_ledger l
      LEFT JOIN payments p ON p.id = l.payment_id
      LEFT JOIN users u ON u.id = l.referred_user_id
      WHERE l.teacher_id = $1
      ORDER BY l.created_at DESC
    `, [id]);

    const breakdownRes = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'course_share' THEN amount ELSE 0 END), 0) as course_share,
        COALESCE(SUM(CASE WHEN type = 'student_referral' THEN amount ELSE 0 END), 0) as student_referral,
        COALESCE(SUM(CASE WHEN type = 'teacher_referral' THEN amount ELSE 0 END), 0) as teacher_referral,
        COALESCE(SUM(CASE WHEN type = 'grooming_allowance' THEN amount ELSE 0 END), 0) as grooming_allowance,
        COALESCE(SUM(CASE WHEN type = 'slab_reward' THEN amount ELSE 0 END), 0) as slab_reward,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) as withdrawal
      FROM teacher_wallet_ledger
      WHERE teacher_id = $1
    `, [id]);

    res.json({
      statement: statementRes.rows,
      breakdown: breakdownRes.rows[0] || {}
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/teachers/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE users SET approval_status = 'agreement_pending' WHERE id = $1 AND role = 'teacher'", [id]);
    await db.query("UPDATE teacher_sop SET status = 'approved', reviewed_by = $2, reviewed_at = NOW() WHERE teacher_id = $1", [id, req.user.id]);
    await logAudit(req.user.id, 'TEACHER_APPROVED', 'teacher', id, {});
    res.json({ message: 'Teacher SOP approved. Waiting for agreement signature.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/teachers/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    await db.query("UPDATE users SET approval_status = 'rejected' WHERE id = $1 AND role = 'teacher'", [id]);
    await db.query("UPDATE teacher_sop SET status = 'rejected', admin_notes = $2, reviewed_by = $3, reviewed_at = NOW() WHERE teacher_id = $1", [id, reason, req.user.id]);
    await logAudit(req.user.id, 'TEACHER_REJECTED', 'teacher', id, { reason });
    res.json({ message: 'Teacher rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/teachers/:id/suspend', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    await db.query("UPDATE users SET approval_status = 'suspended', is_disabled = true WHERE id = $1", [id]);
    await logAudit(req.user.id, 'TEACHER_SUSPENDED', 'teacher', id, { reason });
    res.json({ message: 'Teacher suspended' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/teachers/:id/unsuspend', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE users SET approval_status = 'approved', is_disabled = false WHERE id = $1", [id]);
    await logAudit(req.user.id, 'TEACHER_UNSUSPENDED', 'teacher', id);
    res.json({ message: 'Teacher unsuspended successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SOP Review ────────────────────────────────────────────────
router.get('/sop', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT ts.*, u.name as teacher_name, u.email as teacher_email, u.photo_url
      FROM teacher_sop ts
      JOIN users u ON u.id = ts.teacher_id
      ORDER BY ts.submitted_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sop/:teacherId/approve', async (req, res) => {
  const { teacherId } = req.params;
  const { camera_checklist, lighting_checklist, audio_checklist, internet_checklist, teaching_checklist } = req.body || {};
  try {
    const allItems = [
      'aadhaar', 'pan', 'resume', 'qualification',
      'experience_proof', 'expertise_proof', 'language_proof',
      'subject_expertise', 'languages', 'experience_years', 'availability',
      'camera_sop', 'lighting_sop', 'audio_sop', 'internet_proof', 'demo_teaching'
    ];
    let approvals = {};
    const nowStr = new Date().toISOString();
    for (const itemKey of allItems) {
      approvals[itemKey] = { status: 'approved', notes: '', updatedAt: nowStr };
    }

    const defaultCamera = camera_checklist || {"face_visible":true,"stable_camera":true,"eye_level":true,"proper_framing":true};
    const defaultLighting = lighting_checklist || {"proper_lighting":true,"no_backlight":true,"clear_background":true};
    const defaultAudio = audio_checklist || {"clear_voice":true,"no_noise":true};
    const defaultInternet = internet_checklist || {"stable_connection":true,"speed_proof":true};
    const defaultTeaching = teaching_checklist || {"communication":true,"engagement":true,"presentation":true};

    await db.query(`
      UPDATE teacher_sop SET 
        status = 'approved',
        item_approvals = $2,
        camera_checklist = $3,
        lighting_checklist = $4,
        audio_checklist = $5,
        internet_checklist = $6,
        teaching_checklist = $7,
        reviewed_by = $8,
        reviewed_at = NOW()
      WHERE teacher_id = $1
    `, [teacherId, 
        JSON.stringify(approvals),
        JSON.stringify(defaultCamera),
        JSON.stringify(defaultLighting),
        JSON.stringify(defaultAudio),
        JSON.stringify(defaultInternet),
        JSON.stringify(defaultTeaching),
        req.user.id]);

    await db.query("UPDATE users SET approval_status = 'agreement_pending' WHERE id = $1", [teacherId]);
    await logAudit(req.user.id, 'SOP_APPROVED', 'teacher', teacherId, { note: 'Auto Approved Full' });
    res.json({ message: 'SOP approved. Waiting for teacher to sign agreement.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sop/:teacherId/item-approval', async (req, res) => {
  const { teacherId } = req.params;
  const { item, status, notes } = req.body;
  try {
    if (!item || !status) return res.status(400).json({ error: 'item and status are required' });
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get existing item approvals
    const result = await db.query('SELECT item_approvals FROM teacher_sop WHERE teacher_id = $1', [teacherId]);
    if (!result.rows.length) return res.status(404).json({ error: 'SOP record not found' });

    let approvals = result.rows[0].item_approvals || {};
    approvals[item] = { status, notes: notes || '', updatedAt: new Date().toISOString() };

    // Update item_approvals JSONB
    await db.query(
      'UPDATE teacher_sop SET item_approvals = $2, updated_at = NOW() WHERE teacher_id = $1',
      [teacherId, JSON.stringify(approvals)]
    );

    // Check if everything is approved to auto-advance the teacher status
    const allItems = [
      'aadhaar', 'pan', 'resume', 'qualification',
      'experience_proof', 'expertise_proof', 'language_proof',
      'subject_expertise', 'languages', 'experience_years', 'availability',
      'camera_sop', 'lighting_sop', 'audio_sop', 'internet_proof', 'demo_teaching'
    ];

    let allApproved = true;
    for (const itemKey of allItems) {
      if (!approvals[itemKey] || approvals[itemKey].status !== 'approved') {
        allApproved = false;
        break;
      }
    }

    let hasAnyRejected = false;
    for (const itemKey of allItems) {
      if (approvals[itemKey] && approvals[itemKey].status === 'rejected') {
        hasAnyRejected = true;
        break;
      }
    }

    if (allApproved) {
      await db.query(
        "UPDATE teacher_sop SET status = 'approved', reviewed_by = $2, reviewed_at = NOW() WHERE teacher_id = $1",
        [teacherId, req.user.id]
      );
      await db.query("UPDATE users SET approval_status = 'agreement_pending' WHERE id = $1", [teacherId]);
      await logAudit(req.user.id, 'SOP_APPROVED', 'teacher', teacherId, { note: 'All items granularly approved' });
      return res.json({ message: 'Item updated. All items are now approved. Teacher account status set to agreement pending.', itemStatus: status, overallStatus: 'approved' });
    } else if (hasAnyRejected) {
      await db.query(
        "UPDATE teacher_sop SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW() WHERE teacher_id = $1",
        [teacherId, req.user.id]
      );
      await db.query("UPDATE users SET approval_status = 'rejected' WHERE id = $1", [teacherId]);
      await logAudit(req.user.id, 'SOP_REJECTED', 'teacher', teacherId, { note: `Item ${item} rejected` });
      return res.json({ message: `Item ${item} marked as rejected. Overall status set to rejected.`, itemStatus: status, overallStatus: 'rejected' });
    } else {
      await db.query(
        "UPDATE teacher_sop SET status = 'sop_pending', reviewed_by = $2, reviewed_at = NOW() WHERE teacher_id = $1",
        [teacherId, req.user.id]
      );
      await db.query("UPDATE users SET approval_status = 'sop_pending' WHERE id = $1", [teacherId]);
      return res.json({ message: `Item ${item} updated to ${status}.`, itemStatus: status, overallStatus: 'sop_pending' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sop/:teacherId/reject', async (req, res) => {
  const { teacherId } = req.params;
  const { admin_notes } = req.body;
  try {
    await db.query(`
      UPDATE teacher_sop SET status = 'rejected', admin_notes = $2, reviewed_by = $3, reviewed_at = NOW()
      WHERE teacher_id = $1
    `, [teacherId, admin_notes, req.user.id]);
    await db.query("UPDATE users SET approval_status = 'rejected' WHERE id = $1", [teacherId]);
    await logAudit(req.user.id, 'SOP_REJECTED', 'teacher', teacherId, { admin_notes });
    res.json({ message: 'SOP rejected. Teacher notified.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sop/:teacherId/deapprove', async (req, res) => {
  const { teacherId } = req.params;
  const { notes } = req.body;
  try {
    await db.query(`
      UPDATE teacher_sop 
      SET status = 'sop_pending', 
          admin_notes = $2, 
          reviewed_by = $3, 
          reviewed_at = NOW(),
          agreement_signed = false,
          agreement_signed_at = NULL,
          digital_signature = NULL
      WHERE teacher_id = $1
    `, [teacherId, notes || 'deApproved by admin', req.user.id]);
    
    await db.query("UPDATE users SET approval_status = 'sop_pending' WHERE id = $1", [teacherId]);
    await logAudit(req.user.id, 'SOP_DEAPPROVED', 'teacher', teacherId, { notes });
    res.json({ message: 'Teacher deApproved successfully. Onboarding status set back to pending review.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Teacher Level Management ──────────────────────────────────
router.post('/teachers/:id/set-level', async (req, res) => {
  const { id } = req.params;
  const { level } = req.body;
  const validLevels = [
    'Junior Teacher', 'Assistant Teacher', 'Senior Teacher', 'Executive Teacher',
    'Lecturer', 'Professor', 'Senior Professor', 'HOD', 'Dean'
  ];
  try {
    if (!validLevels.includes(level)) return res.status(400).json({ error: 'Invalid level' });
    const current = await db.query('SELECT teacher_level FROM users WHERE id = $1', [id]);
    const previousLevel = current.rows[0]?.teacher_level;
    await db.query('UPDATE users SET teacher_level = $1 WHERE id = $2', [level, id]);
    await db.query(`
      INSERT INTO teacher_levels (id, teacher_id, level, previous_level, changed_by, reason)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [`lvl_${Date.now()}`, id, level, previousLevel, req.user.id, 'Manual admin override']);
    
    // Auto-issue milestone certificate for level change
    const certId = `cert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await db.query(`
      INSERT INTO teacher_certificates (id, teacher_id, certificate_type, title, description, metadata)
      VALUES ($1, $2, 'level_milestone', $3, $4, $5)
    `, [
      certId, 
      id, 
      `Speaxa ${level} Milestone Certificate`, 
      `This certificate is awarded to acknowledge that the teacher has achieved the prestigious "${level}" status on the Speaxa platform, demonstrating outstanding pedagogy, platform engagement, and course completion success.`, 
      JSON.stringify({ level, previous_level: previousLevel })
    ]);

    await logAudit(req.user.id, 'TEACHER_LEVEL_CHANGED', 'teacher', id, { level, previousLevel });
    res.json({ message: `Teacher level set to ${level}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Student Management ────────────────────────────────────────
router.get('/students', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE role = 'student' ORDER BY created_at DESC");
    res.json(result.rows.map(sanitizeUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/students/:id/report', async (req, res) => {
  try {
    const reports = await db.query(
      'SELECT * FROM monthly_reports WHERE student_id = $1 ORDER BY report_month DESC',
      [req.params.id]
    );
    const attendance = await db.query(
      'SELECT * FROM attendance WHERE student_id = $1 ORDER BY attendance_date DESC LIMIT 30',
      [req.params.id]
    );
    res.json({ reports: reports.rows, attendance: attendance.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Parent Management ─────────────────────────────────────────
router.get('/parents', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE role = 'parent' ORDER BY created_at DESC");
    res.json(result.rows.map(sanitizeUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all parent-student connection links for review/management
router.get('/parent-links', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT psl.*, 
             p.name as parent_name, p.email as parent_email,
             s.name as student_name, s.email as student_email
      FROM parent_student_links psl
      JOIN users p ON p.id = psl.parent_id
      JOIN users s ON s.id = psl.student_id
      ORDER BY psl.linked_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin reverts or deletes parent access
router.post('/parent-links/:linkId/revert', async (req, res) => {
  const { linkId } = req.params;
  try {
    const result = await db.query(
      "UPDATE parent_student_links SET status = 'rejected' WHERE id = $1 RETURNING *",
      [linkId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Connection request not found' });
    }
    await logAudit(req.user.id, 'PARENT_LINK_REVERTED_BY_ADMIN', 'parent_student_links', linkId, { parent_id: result.rows[0].parent_id, student_id: result.rows[0].student_id });
    res.json({ message: 'Parent access request reverted successfully', link: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── User Management (Generic) ─────────────────────────────────
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, qualification, board, grade, password_plain } = req.body;
  try {
    const updates = [], values = [];
    let idx = 1;
    const fields = { name, email, phone, qualification, board, grade };
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) { updates.push(`${key} = $${idx++}`); values.push(val); }
    }
    if (password_plain) {
      updates.push(`password_hash = $${idx++}`); values.push(hashPassword(password_plain));
      updates.push(`password_plain = $${idx++}`); values.push(password_plain);
    }
    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    const result = await db.query(`UPDATE users SET ${updates.join(',')} WHERE id = $${idx} RETURNING *`, values);
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    await logAudit(req.user.id, 'USER_UPDATED', 'user', id, { fields: Object.keys(fields) });
    res.json({ message: 'User updated', user: sanitizeUser(result.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/toggle-status', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('UPDATE users SET is_disabled = NOT is_disabled WHERE id = $1 RETURNING *', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    const action = result.rows[0].is_disabled ? 'USER_DISABLED' : 'USER_ENABLED';
    await logAudit(req.user.id, action, 'user', id, {});
    res.json({ message: `User ${result.rows[0].is_disabled ? 'disabled' : 'enabled'}`, user: sanitizeUser(result.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/reset-credentials', async (req, res) => {
  const { id } = req.params;
  const { email, password } = req.body;
  try {
    const updates = [], values = [];
    let idx = 1;
    if (email) { updates.push(`email = $${idx++}`); values.push(email); }
    if (password) {
      updates.push(`password_hash = $${idx++}`); values.push(hashPassword(password));
      updates.push(`password_plain = $${idx++}`); values.push(password);
    }
    if (!updates.length) return res.status(400).json({ error: 'No credentials to reset' });
    values.push(id);
    await db.query(`UPDATE users SET ${updates.join(',')} WHERE id = $${idx}`, values);
    await logAudit(req.user.id, 'CREDENTIALS_RESET', 'user', id, { email: !!email, password: !!password });
    res.json({ message: 'Credentials updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Impersonation ───────────────────────────────────────
router.post('/impersonate/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    const target = result.rows[0];

    const impersonationToken = jwt.sign(
      { id: target.id, email: target.email, name: target.name, role: target.role, impersonatedBy: req.user.id },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    await logAudit(req.user.id, 'ADMIN_IMPERSONATION', 'user', userId, { target_role: target.role, target_name: target.name });
    res.json({ message: `Impersonating ${target.name}`, token: impersonationToken, user: sanitizeUser(target) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Course Management ─────────────────────────────────────────
const courseThumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../public/uploads/courses');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `course_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const courseThumbnailUpload = multer({ storage: courseThumbnailStorage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/courses/upload-thumbnail', courseThumbnailUpload.single('thumbnail'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const thumbnailUrl = `/uploads/courses/${req.file.filename}`;
    res.json({ message: 'Thumbnail uploaded', thumbnailUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/courses', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, 
             u.name as teacher_name, 
             u.email as teacher_email, 
             u.photo_url as teacher_photo, 
             u.teacher_level, 
             u.rating as teacher_rating, 
             u.qualification as teacher_qualification, 
             u.experience_years as teacher_experience,
             u.bio as teacher_bio
      FROM courses c
      LEFT JOIN users u ON u.id = c.created_by
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/courses/:id/toggle-verified', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      UPDATE courses 
      SET is_verified = NOT COALESCE(is_verified, TRUE), updated_at = NOW()
      WHERE id = $1 
      RETURNING *
    `, [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Course not found' });
    await logAudit(req.user.id, 'COURSE_VERIFIED_TOGGLED', 'course', id, { is_verified: result.rows[0].is_verified });
    res.json({ message: 'Course verification status updated', course: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/courses/:id/toggle-featured', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      UPDATE courses 
      SET is_featured = NOT COALESCE(is_featured, FALSE), updated_at = NOW()
      WHERE id = $1 
      RETURNING *
    `, [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Course not found' });
    await logAudit(req.user.id, 'COURSE_FEATURED_TOGGLED', 'course', id, { is_featured: result.rows[0].is_featured });
    res.json({ message: 'Course featured status updated', course: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/courses', async (req, res) => {
  const { title, subject, description, duration_weeks, grade, board, fees, thumbnail_url, custom_tag,
          learning_duration, objective, learning_outcome, language_instruction, daily_class_duration, assessment_days } = req.body;
  try {
    if (!title || !title.trim()) return res.status(400).json({ error: 'Course Title is required' });
    if (!subject || !subject.trim()) return res.status(400).json({ error: 'Subject is required' });
    if (!description || !description.trim()) return res.status(400).json({ error: 'Description is required' });
    if (!duration_weeks) return res.status(400).json({ error: 'Learning Duration Weeks is required' });
    if (!grade || !grade.trim()) return res.status(400).json({ error: 'Grade is required' });
    if (!board || !board.trim()) return res.status(400).json({ error: 'Board is required' });
    if (fees === undefined || fees === null || isNaN(parseFloat(fees))) return res.status(400).json({ error: 'Course Fee is required and must be a valid number' });
    if (!thumbnail_url || !thumbnail_url.trim()) return res.status(400).json({ error: 'Course Banner / Thumbnail is required' });
    if (!custom_tag || !custom_tag.trim()) return res.status(400).json({ error: 'Custom Badge / Tag Line is required' });
    if (!learning_duration || !learning_duration.trim()) return res.status(400).json({ error: 'Learning Duration is required' });
    if (!objective || !objective.trim()) return res.status(400).json({ error: 'Objective is required' });
    if (!learning_outcome || !learning_outcome.trim()) return res.status(400).json({ error: 'Learning Outcome is required' });
    if (!language_instruction || !language_instruction.trim()) return res.status(400).json({ error: 'Language of Instruction is required' });
    if (!daily_class_duration || !daily_class_duration.trim()) return res.status(400).json({ error: 'Daily Class Duration is required' });
    if (!assessment_days || !assessment_days.trim()) return res.status(400).json({ error: 'Assessment Days is required' });

    const id = `course_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO courses (id, title, subject, description, duration_weeks, grade, board, fees, thumbnail_url, status, created_by, custom_tag,
        learning_duration, objective, learning_outcome, language_instruction, daily_class_duration, assessment_days)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *
    `, [id, title, subject, description, duration_weeks || 12, grade, board, parseFloat(fees), thumbnail_url, req.user.id, custom_tag,
        learning_duration, objective, learning_outcome, language_instruction, daily_class_duration, assessment_days]);
    await logAudit(req.user.id, 'COURSE_CREATED', 'course', id, { title });
    res.status(201).json({ message: 'Course created successfully', course: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/courses/:id', async (req, res) => {
  const { id } = req.params;
  const { title, subject, description, duration_weeks, grade, board, fees, thumbnail_url, status, custom_tag,
          learning_duration, objective, learning_outcome, language_instruction, daily_class_duration, assessment_days } = req.body;
  try {
    if (!title || !title.trim()) return res.status(400).json({ error: 'Course Title is required' });
    if (!subject || !subject.trim()) return res.status(400).json({ error: 'Subject is required' });
    if (!description || !description.trim()) return res.status(400).json({ error: 'Description is required' });
    if (!duration_weeks) return res.status(400).json({ error: 'Learning Duration Weeks is required' });
    if (!grade || !grade.trim()) return res.status(400).json({ error: 'Grade is required' });
    if (!board || !board.trim()) return res.status(400).json({ error: 'Board is required' });
    if (fees === undefined || fees === null || isNaN(parseFloat(fees))) return res.status(400).json({ error: 'Course Fee is required' });
    if (!thumbnail_url || !thumbnail_url.trim()) return res.status(400).json({ error: 'Course Banner / Thumbnail is required' });
    if (!custom_tag || !custom_tag.trim()) return res.status(400).json({ error: 'Custom Badge / Tag Line is required' });
    if (!learning_duration || !learning_duration.trim()) return res.status(400).json({ error: 'Learning Duration is required' });
    if (!objective || !objective.trim()) return res.status(400).json({ error: 'Objective is required' });
    if (!learning_outcome || !learning_outcome.trim()) return res.status(400).json({ error: 'Learning Outcome is required' });
    if (!language_instruction || !language_instruction.trim()) return res.status(400).json({ error: 'Language of Instruction is required' });
    if (!daily_class_duration || !daily_class_duration.trim()) return res.status(400).json({ error: 'Daily Class Duration is required' });
    if (!assessment_days || !assessment_days.trim()) return res.status(400).json({ error: 'Assessment Days is required' });

    const result = await db.query(`
      UPDATE courses SET title=$2, subject=$3, description=$4,
        duration_weeks=$5, grade=$6, board=$7,
        fees=$8, thumbnail_url=$9, status=COALESCE($10,status), custom_tag=$11,
        learning_duration=$12, objective=$13, learning_outcome=$14,
        language_instruction=$15, daily_class_duration=$16, assessment_days=$17,
        updated_at=NOW()
      WHERE id = $1 RETURNING *
    `, [id, title, subject, description, duration_weeks, grade, board, fees, thumbnail_url, status, custom_tag,
        learning_duration, objective, learning_outcome, language_instruction, daily_class_duration, assessment_days]);
    if (!result.rows.length) return res.status(404).json({ error: 'Course not found' });
    await logAudit(req.user.id, 'COURSE_UPDATED', 'course', id, {});
    res.json({ message: 'Course updated', course: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/courses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE courses SET status = 'archived' WHERE id = $1", [id]);
    await logAudit(req.user.id, 'COURSE_ARCHIVED', 'course', id, {});
    res.json({ message: 'Course archived' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Batch Management ──────────────────────────────────────────
router.get('/batches', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT b.*, c.title as course_title, u.name as teacher_name
      FROM batches b
      LEFT JOIN courses c ON c.id = b.course_id
      LEFT JOIN users u ON u.id = b.teacher_id
      ORDER BY b.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/batches/:id/toggle', async (req, res) => {
  const { id } = req.params;
  try {
    const current = await db.query('SELECT status FROM batches WHERE id = $1', [id]);
    const newStatus = current.rows[0]?.status === 'active' ? 'inactive' : 'active';
    await db.query('UPDATE batches SET status = $1 WHERE id = $2', [newStatus, id]);
    await logAudit(req.user.id, 'BATCH_STATUS_TOGGLED', 'batch', id, { newStatus });
    res.json({ message: `Batch ${newStatus}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/batches/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    await db.query("UPDATE batches SET status = 'cancelled' WHERE id = $1", [id]);
    await logAudit(req.user.id, 'BATCH_CANCELLED', 'batch', id, { reason });
    res.json({ message: 'Batch cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Live Class Management ─────────────────────────────────────
router.get('/live-classes', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT lc.*, b.batch_name, u.name as teacher_name
      FROM live_classes lc
      LEFT JOIN batches b ON b.id = lc.batch_id
      LEFT JOIN users u ON u.id = lc.teacher_id
      ORDER BY lc.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/live-classes', async (req, res) => {
  const { batchId, title, classDate, classTime, clientDateTime } = req.body;
  try {
    // Validate future date/time (timezone aware via clientDateTime if provided)
    const scheduledDateTime = clientDateTime ? new Date(clientDateTime) : new Date(`${classDate}T${classTime}`);
    if (isNaN(scheduledDateTime.getTime())) {
      return res.status(400).json({ error: 'Invalid class date or time format' });
    }
    if (scheduledDateTime <= new Date()) {
      return res.status(400).json({ error: 'Class date and time must be scheduled in the future' });
    }

    const id = `live_${Date.now()}`;
    const batch = await db.query('SELECT * FROM batches WHERE id = $1', [batchId]);
    if (!batch.rows.length) return res.status(404).json({ error: 'Batch not found' });
    const channel = batch.rows[0].agora_channel || `speaxa_${batchId}`;

    await db.query(`
      INSERT INTO live_classes (id, batch_id, teacher_id, title, class_date, class_time, agora_channel, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'scheduled')
    `, [id, batchId, batch.rows[0].teacher_id, title, classDate, classTime, channel]);

    await logAudit(req.user.id, 'CLASS_SCHEDULED', 'live_class', id, { title, batchId });

    // Dispatch in-app notifications and email alerts to enrolled students asynchronously
    const notificationService = require('../services/notification.service');
    notificationService.notifyClassScheduled({
      classId: id,
      batchId,
      title,
      classDate,
      classTime,
      teacherId: batch.rows[0].teacher_id || req.user.id
    }).catch(err => console.error('[NotificationService] notifyClassScheduled async failed for admin:', err));

    res.status(201).json({ message: 'Live class scheduled', classId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/live-classes/:id/end', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`
      UPDATE live_classes SET status = 'ended', ended_at = NOW(), end_reason = 'admin_force_end'
      WHERE id = $1
    `, [id]);
    await logAudit(req.user.id, 'CLASS_ENDED_BY_ADMIN', 'live_class', id, {});
    res.json({ message: 'Class ended by admin' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/live-classes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE live_classes SET status = 'cancelled' WHERE id = $1", [id]);
    await logAudit(req.user.id, 'CLASS_CANCELLED', 'live_class', id, {});
    res.json({ message: 'Live class cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Payment Management ────────────────────────────────────────
router.get('/payments', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, u.name as student_name, b.batch_name, c.title as course_title
      FROM payments p
      LEFT JOIN users u ON u.id = p.student_id
      LEFT JOIN batches b ON b.id = p.batch_id
      LEFT JOIN courses c ON c.id = p.course_id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/refunds', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT r.*, u.name as student_name, p.amount as payment_amount
      FROM refunds r
      LEFT JOIN users u ON u.id = r.student_id
      LEFT JOIN payments p ON p.id = r.payment_id
      ORDER BY r.requested_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/refunds/:id/process', async (req, res) => {
  const { id } = req.params;
  const { action, notes } = req.body; // 'approve' or 'reject'
  try {
    const status = action === 'approve' ? 'processed' : 'failed';
    await db.query('UPDATE refunds SET status = $1, processed_at = NOW(), processed_by = $2 WHERE id = $3', [status, req.user.id, id]);
    await logAudit(req.user.id, `REFUND_${status.toUpperCase()}`, 'refund', id, { notes });
    res.json({ message: `Refund ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Payout Management ─────────────────────────────────────────
router.get('/payouts', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT tp.*, u.name as teacher_name, u.email as teacher_email, tw.wallet_balance
      FROM teacher_payouts tp
      LEFT JOIN users u ON u.id = tp.teacher_id
      LEFT JOIN teacher_wallet tw ON tw.teacher_id = tp.teacher_id
      ORDER BY tp.requested_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/payouts/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE teacher_payouts SET status = 'approved', reviewed_at = NOW(), processed_by = $1 WHERE id = $2", [req.user.id, id]);
    await logAudit(req.user.id, 'PAYOUT_APPROVED', 'payout', id, {});
    res.json({ message: 'Payout approved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/payouts/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { admin_notes } = req.body;
  try {
    await db.query("UPDATE teacher_payouts SET status = 'rejected', admin_notes = $2, reviewed_at = NOW(), processed_by = $3 WHERE id = $1", [id, admin_notes, req.user.id]);
    await logAudit(req.user.id, 'PAYOUT_REJECTED', 'payout', id, { admin_notes });
    res.json({ message: 'Payout rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/payouts/:id/mark-paid', async (req, res) => {
  const { id } = req.params;
  try {
    const payout = await db.query('SELECT * FROM teacher_payouts WHERE id = $1', [id]);
    if (!payout.rows.length) return res.status(404).json({ error: 'Payout not found' });
    const p = payout.rows[0];

    await db.query("UPDATE teacher_payouts SET status = 'paid', paid_at = NOW(), processed_by = $1 WHERE id = $2", [req.user.id, id]);

    // Update teacher wallet
    await db.query(`
      UPDATE teacher_wallet SET
        paid_earnings = paid_earnings + $1,
        pending_earnings = GREATEST(0, pending_earnings - $1),
        wallet_balance = GREATEST(0, wallet_balance - $1)
      WHERE teacher_id = $2
    `, [p.amount, p.teacher_id]);

    await logAudit(req.user.id, 'PAYOUT_PAID', 'payout', id, { amount: p.amount, teacher_id: p.teacher_id });
    res.json({ message: 'Payout marked as paid' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Notifications ─────────────────────────────────────────────
router.get('/notifications', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notifications', async (req, res) => {
  const { title, message, target_role, target_user, type = 'info' } = req.body;
  try {
    if (!title || !message) return res.status(400).json({ error: 'title and message required' });
    const id = `notif_${Date.now()}`;

    await db.query(`
      INSERT INTO notifications (id, title, message, target_role, target_user, type, sent_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `, [id, title, message, target_role || 'all', target_user || null, type, req.user.id]);

    // Send FCM push notification
    const FCMService = require('../services/FCMService');
    if (target_user) {
      const tokenRes = await db.query('SELECT token FROM fcm_tokens WHERE user_id = $1', [target_user]);
      for (const t of tokenRes.rows) await FCMService.sendToToken(t.token, title, message);
    } else {
      await FCMService.sendToRole(target_role || 'all', title, message, { type });
    }

    res.status(201).json({ message: 'Notification sent', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Coupons ───────────────────────────────────────────────────
router.get('/coupons', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/coupons', async (req, res) => {
  const { code, discount_percent, max_uses, valid_until } = req.body;
  try {
    await db.query(`
      INSERT INTO coupons (code, discount_percent, max_uses, valid_until)
      VALUES ($1,$2,$3,$4)
    `, [code.toUpperCase(), discount_percent, max_uses || 100, valid_until || null]);
    res.status(201).json({ message: 'Coupon created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/coupons/:code/toggle', async (req, res) => {
  const { code } = req.params;
  try {
    await db.query('UPDATE coupons SET is_active = NOT is_active WHERE code = $1', [code]);
    res.json({ message: 'Coupon toggled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/coupons/:code', async (req, res) => {
  const { code } = req.params;
  try {
    await db.query('DELETE FROM coupons WHERE code = $1', [code]);
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Audit Logs ────────────────────────────────────────────────
router.get('/audit-logs', async (req, res) => {
  const { page = 1, limit = 50, action, role } = req.query;
  try {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = 'SELECT * FROM audit_logs';
    const conditions = [], params = [];
    let idx = 1;

    if (action) { conditions.push(`action ILIKE $${idx++}`); params.push(`%${action}%`); }
    if (role) { conditions.push(`actor_role = $${idx++}`); params.push(role); }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    params.push(parseInt(limit), offset);

    const result = await db.query(query, params);
    const countRes = await db.query(`SELECT COUNT(*) FROM audit_logs${conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''}`, params.slice(0, -2));

    res.json({
      logs: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Message user ──────────────────────────────────────────────
router.post('/users/:id/message', async (req, res) => {
  const { id } = req.params;
  const { subject, body } = req.body;
  try {
    console.log(`[Admin] Message to user ${id}: ${subject}`);
    res.json({ message: 'Message sent successfully', sentTo: id, subject });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Revenue Analytics ──────────────────────────────────────────
router.get('/revenue', async (req, res) => {
  try {
    const monthly = await db.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month,
             SUM(amount) as revenue,
             COUNT(*) as transactions
      FROM payments WHERE status = 'captured'
      GROUP BY month ORDER BY month DESC LIMIT 12
    `);
    const topTeachers = await db.query(`
      SELECT u.name, u.teacher_level, SUM(p.teacher_share) as earnings
      FROM payments p JOIN users u ON u.id = p.teacher_id
      WHERE p.status = 'captured'
      GROUP BY u.id ORDER BY earnings DESC LIMIT 5
    `);
    res.json({ monthly: monthly.rows, topTeachers: topTeachers.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Course Approval and Rejection Endpoints ──────────────────
router.post('/courses/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { fees } = req.body;
  try {
    const courseRes = await db.query(
      'SELECT c.title, c.created_by, u.email, u.name FROM courses c LEFT JOIN users u ON u.id = c.created_by WHERE c.id = $1',
      [id]
    );
    if (!courseRes.rows.length) return res.status(404).json({ error: 'Course not found' });
    const course = courseRes.rows[0];

    await db.query("UPDATE courses SET status = 'active', fees = COALESCE($2, fees) WHERE id = $1", [id, fees !== undefined ? parseFloat(fees) : null]);
    await logAudit(req.user.id, 'COURSE_APPROVED', 'course', id, { title: course.title });

    if (course.created_by) {
      // Auto-issue verification certificate
      const certId = `cert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await db.query(`
        INSERT INTO teacher_certificates (id, teacher_id, certificate_type, title, description, metadata)
        VALUES ($1, $2, 'course_verified', $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [
        certId, 
        course.created_by, 
        'Course Selection & Verification Certificate', 
        `This certificate is awarded to acknowledge that the course "${course.title}" has been reviewed, approved, and verified for the Speaxa interactive live curriculum.`, 
        JSON.stringify({ course_id: id, course_title: course.title })
      ]);
    }

    if (course.created_by) {
      await db.query(`
        INSERT INTO notifications (id, title, message, target_role, target_user, type, is_active)
        VALUES ($1, $2, $3, 'teacher', $4, 'success', true)
      `, [`notif_approve_${id}_${Date.now()}`, 'Course Approved!', `Your course "${course.title}" has been approved by the Admin and is now live.`, course.created_by]);
    }

    if (course.email) {
      try {
        const settingsRes = await db.query(
          "SELECT key, value FROM platform_settings WHERE key IN ('smtp_host','smtp_port','smtp_user','smtp_pass','platform_name')"
        );
        const settings = {};
        settingsRes.rows.forEach(r => { settings[r.key] = r.value; });

        if (settings.smtp_host && settings.smtp_user) {
          const nodemailer = require('nodemailer');
          const transporter = nodemailer.createTransport({
            host: settings.smtp_host,
            port: parseInt(settings.smtp_port || '587'),
            secure: parseInt(settings.smtp_port || '587') === 465,
            auth: { user: settings.smtp_user, pass: settings.smtp_pass },
          });

          const platformName = settings.platform_name || 'Speaxa';
          await transporter.sendMail({
            from: `"${platformName}" <${settings.smtp_user}>`,
            to: course.email,
            subject: `Course Approved: ${course.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #3CBDB0;">${platformName}</h2>
                <p>Hello <strong>${course.name}</strong>,</p>
                <p>We are excited to inform you that your course <strong>"${course.title}"</strong> has been approved by the Admin and is now published live on the platform!</p>
                <p>You can check the course status and start managing study batches in your teacher dashboard.</p>
                <br>
                <small style="color: #999;">This is an automated notification. Please do not reply directly to this email.</small>
              </div>
            `
          });
          console.log(`[Admin Approval Email] Sent to teacher ${course.email} for course "${course.title}"`);
        } else {
          console.log(`[Admin Approval Email Fallback] Email: ${course.email} | Message: Course "${course.title}" approved.`);
        }
      } catch (mailErr) {
        console.error('[Admin Approval Email Error]:', mailErr.message);
      }
    }

    res.json({ message: 'Course approved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/courses/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const courseRes = await db.query(
      'SELECT c.title, c.created_by, u.email, u.name FROM courses c LEFT JOIN users u ON u.id = c.created_by WHERE c.id = $1',
      [id]
    );
    if (!courseRes.rows.length) return res.status(404).json({ error: 'Course not found' });
    const course = courseRes.rows[0];

    await db.query("UPDATE courses SET status = 'rejected' WHERE id = $1", [id]);
    await logAudit(req.user.id, 'COURSE_REJECTED', 'course', id, { reason });

    if (course.created_by) {
      await db.query(`
        INSERT INTO notifications (id, title, message, target_role, target_user, type, is_active)
        VALUES ($1, $2, $3, 'teacher', $4, 'warning', true)
      `, [`notif_reject_${id}_${Date.now()}`, 'Course Rejected', `Your course "${course.title}" was not approved. Reason: ${reason || 'Does not meet platform guidelines'}.`, course.created_by]);
    }

    if (course.email) {
      try {
        const settingsRes = await db.query(
          "SELECT key, value FROM platform_settings WHERE key IN ('smtp_host','smtp_port','smtp_user','smtp_pass','platform_name')"
        );
        const settings = {};
        settingsRes.rows.forEach(r => { settings[r.key] = r.value; });

        if (settings.smtp_host && settings.smtp_user) {
          const nodemailer = require('nodemailer');
          const transporter = nodemailer.createTransport({
            host: settings.smtp_host,
            port: parseInt(settings.smtp_port || '587'),
            secure: parseInt(settings.smtp_port || '587') === 465,
            auth: { user: settings.smtp_user, pass: settings.smtp_pass },
          });

          const platformName = settings.platform_name || 'Speaxa';
          await transporter.sendMail({
            from: `"${platformName}" <${settings.smtp_user}>`,
            to: course.email,
            subject: `Course Status Update: ${course.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #EF4444;">${platformName} Update</h2>
                <p>Hello <strong>${course.name}</strong>,</p>
                <p>Your course <strong>"${course.title}"</strong> has been reviewed. Unfortunately, it does not meet our guidelines at this time and has been rejected.</p>
                <div style="background: #FEE2E2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <strong>Reason for Rejection:</strong><br>
                  ${reason || 'Does not meet platform guidelines.'}
                </div>
                <p>You can modify the course in your dashboard and re-submit it for approval.</p>
                <br>
                <small style="color: #999;">This is an automated notification. Please do not reply directly to this email.</small>
              </div>
            `
          });
          console.log(`[Admin Rejection Email] Sent to teacher ${course.email} for course "${course.title}"`);
        } else {
          console.log(`[Admin Rejection Email Fallback] Email: ${course.email} | Reason: ${reason}`);
        }
      } catch (mailErr) {
        console.error('[Admin Rejection Email Error]:', mailErr.message);
      }
    }

    res.json({ message: 'Course rejected successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unarchive Course
router.post('/courses/:id/unarchive', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("UPDATE courses SET status = 'active', updated_at = NOW() WHERE id = $1 RETURNING *", [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Course not found' });
    await logAudit(req.user.id, 'COURSE_UNARCHIVED', 'course', id, {});
    res.json({ message: 'Course restored successfully', course: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get teacher certificates
router.get('/teachers/:id/certificates', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM teacher_certificates WHERE teacher_id = $1 ORDER BY issued_at DESC', [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Issue manual certificate
router.post('/teachers/:id/certificates', async (req, res) => {
  const { id } = req.params;
  const { title, description, certificate_type = 'custom' } = req.body;
  try {
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    const certId = `cert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const result = await db.query(`
      INSERT INTO teacher_certificates (id, teacher_id, certificate_type, title, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [certId, id, certificate_type, title, description]);
    await logAudit(req.user.id, 'CERTIFICATE_ISSUED', 'teacher', id, { title, type: certificate_type });
    res.status(201).json({ message: 'Certificate issued successfully', certificate: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Revoke/Delete certificate
router.delete('/certificates/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM teacher_certificates WHERE id = $1 RETURNING *', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Certificate not found' });
    await logAudit(req.user.id, 'CERTIFICATE_REVOKED', 'teacher', result.rows[0].teacher_id, { title: result.rows[0].title });
    res.json({ message: 'Certificate revoked successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit/Update certificate (Update title, description, and issued_at date)
router.put('/certificates/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, issued_at } = req.body;
  try {
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    const result = await db.query(`
      UPDATE teacher_certificates 
      SET title = $2, 
          description = $3, 
          issued_at = COALESCE($4, issued_at)
      WHERE id = $1 
      RETURNING *
    `, [id, title, description, issued_at || null]);
    
    if (!result.rows.length) return res.status(404).json({ error: 'Certificate not found' });
    await logAudit(req.user.id, 'CERTIFICATE_UPDATED', 'teacher', result.rows[0].teacher_id, { title });
    res.json({ message: 'Certificate updated successfully', certificate: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Rewards & Allowances endpoints ────────────────────────────
// GET /admin/rewards/pending - List all pending rewards
router.get('/rewards/pending', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT tr.*, u.name as teacher_name, u.email as teacher_email
      FROM teacher_rewards tr
      JOIN users u ON u.id = tr.teacher_id
      WHERE tr.status = 'pending_review'
      ORDER BY tr.achieved_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/rewards/:id/approve - Approve slab reward and credit teacher wallet
router.post('/rewards/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const rewardRes = await db.query('SELECT * FROM teacher_rewards WHERE id = $1', [id]);
    if (!rewardRes.rows.length) return res.status(404).json({ error: 'Reward record not found' });
    const reward = rewardRes.rows[0];

    if (reward.status !== 'pending_review') {
      return res.status(400).json({ error: `Reward claim is already ${reward.status}` });
    }

    // Update status to approved
    await db.query(`
      UPDATE teacher_rewards 
      SET status = 'approved', processed_at = NOW(), processed_by = $2
      WHERE id = $1
    `, [id, req.user.id]);

    // Credit teacher's wallet
    await db.query(`
      INSERT INTO teacher_wallet (teacher_id, total_earnings, pending_earnings, wallet_balance)
      VALUES ($1, $2, $2, $2)
      ON CONFLICT (teacher_id) DO UPDATE SET
        total_earnings = teacher_wallet.total_earnings + $2,
        pending_earnings = teacher_wallet.pending_earnings + $2,
        wallet_balance = teacher_wallet.wallet_balance + $2
    `, [reward.teacher_id, reward.reward_amount]);

    // Log to ledger
    const txId = `tx_rwd_${id}`;
    await db.query(`
      INSERT INTO teacher_wallet_ledger (id, teacher_id, amount, type, description)
      VALUES ($1, $2, $3, 'slab_reward', $4)
      ON CONFLICT (id) DO NOTHING
    `, [
      txId,
      reward.teacher_id,
      reward.reward_amount,
      `Performance slab reward approved: ${reward.slab_name} (Slab Target: ₹${reward.target_revenue}). Reward Item: ${reward.reward_item}`
    ]);

    await logAudit(req.user.id, 'REWARD_SLAB_APPROVED', 'teacher', reward.teacher_id, {
      reward_id: id,
      slab_name: reward.slab_name,
      amount: reward.reward_amount
    });

    res.json({ message: 'Performance reward approved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/rewards/:id/reject - Reject slab reward
router.post('/rewards/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { admin_notes } = req.body;
  try {
    const rewardRes = await db.query('SELECT * FROM teacher_rewards WHERE id = $1', [id]);
    if (!rewardRes.rows.length) return res.status(404).json({ error: 'Reward record not found' });
    const reward = rewardRes.rows[0];

    if (reward.status !== 'pending_review') {
      return res.status(400).json({ error: `Reward claim is already ${reward.status}` });
    }

    await db.query(`
      UPDATE teacher_rewards 
      SET status = 'rejected', admin_notes = $2, processed_at = NOW(), processed_by = $3
      WHERE id = $1
    `, [id, admin_notes || 'Does not meet criteria', req.user.id]);

    await logAudit(req.user.id, 'REWARD_SLAB_REJECTED', 'teacher', reward.teacher_id, {
      reward_id: id,
      slab_name: reward.slab_name,
      reason: admin_notes
    });

    res.json({ message: 'Performance reward claim rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/config/slabs - List slabs
router.get('/config/slabs', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM performance_slabs_config ORDER BY target_revenue ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/config/slabs - Create slab
router.post('/config/slabs', async (req, res) => {
  const { id, slab_name, target_revenue, reward_amount, reward_item, grooming_group } = req.body;
  try {
    if (!slab_name || target_revenue === undefined || reward_amount === undefined || !reward_item || !grooming_group) {
      return res.status(400).json({ error: 'slab_name, target_revenue, reward_amount, reward_item, and grooming_group are required' });
    }
    const newId = id || `slab_${Date.now()}`;
    await db.query(`
      INSERT INTO performance_slabs_config (id, slab_name, target_revenue, reward_amount, reward_item, grooming_group, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `, [newId, slab_name, target_revenue, reward_amount, reward_item, grooming_group]);
    res.status(201).json({ message: 'Slab configuration created successfully', id: newId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /admin/config/slabs/:id - Update slab
router.put('/config/slabs/:id', async (req, res) => {
  const { id } = req.params;
  const { slab_name, target_revenue, reward_amount, reward_item, grooming_group } = req.body;
  try {
    if (!slab_name || target_revenue === undefined || reward_amount === undefined || !reward_item || !grooming_group) {
      return res.status(400).json({ error: 'slab_name, target_revenue, reward_amount, reward_item, and grooming_group are required' });
    }
    const result = await db.query(`
      UPDATE performance_slabs_config
      SET slab_name = $1, target_revenue = $2, reward_amount = $3, reward_item = $4, grooming_group = $5, updated_at = NOW()
      WHERE id = $6
    `, [slab_name, target_revenue, reward_amount, reward_item, grooming_group, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Slab configuration not found' });
    }
    res.json({ message: 'Slab configuration updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/config/slabs/:id - Delete slab
router.delete('/config/slabs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM performance_slabs_config WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Slab configuration not found' });
    }
    res.json({ message: 'Slab configuration deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/config/allowances - List allowance groups
router.get('/config/allowances', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM grooming_allowances_config ORDER BY allowance_amount DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/config/allowances - Create or update allowance group
router.post('/config/allowances', async (req, res) => {
  const { group_name, allowance_amount, description } = req.body;
  try {
    if (!group_name || allowance_amount === undefined) {
      return res.status(400).json({ error: 'group_name and allowance_amount are required' });
    }
    await db.query(`
      INSERT INTO grooming_allowances_config (group_name, allowance_amount, description, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (group_name) DO UPDATE SET allowance_amount = $2, description = $3, updated_at = NOW()
    `, [group_name, allowance_amount, description || '']);
    res.json({ message: 'Grooming allowance configuration saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/config/allowances/:group_name - Delete allowance group
router.delete('/config/allowances/:group_name', async (req, res) => {
  const { group_name } = req.params;
  try {
    const result = await db.query('DELETE FROM grooming_allowances_config WHERE group_name = $1', [group_name]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Grooming allowance configuration not found' });
    }
    res.json({ message: 'Grooming allowance configuration deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/allowances/generate - Trigger monthly grooming allowances
router.post('/allowances/generate', async (req, res) => {
  const { payment_month } = req.body; // format: 'YYYY-MM'
  try {
    if (!payment_month || !/^\d{4}-\d{2}$/.test(payment_month)) {
      return res.status(400).json({ error: 'Valid payment_month in YYYY-MM format is required' });
    }

    // Check if already generated
    const existCheck = await db.query('SELECT 1 FROM teacher_allowances WHERE payment_month = $1 LIMIT 1', [payment_month]);
    if (existCheck.rows.length > 0) {
      return res.status(400).json({ error: `Grooming allowances for month ${payment_month} have already been generated` });
    }

    // Query highest approved slab for each teacher
    const teachersSlabQuery = await db.query(`
      SELECT DISTINCT ON (teacher_id) teacher_id, slab_name, target_revenue
      FROM teacher_rewards
      WHERE status = 'approved'
      ORDER BY teacher_id, target_revenue DESC
    `);

    const generated = [];

    for (const row of teachersSlabQuery.rows) {
      const teacherId = row.teacher_id;
      const slabName = row.slab_name;

      // Query grooming group for this slab from performance_slabs_config
      const slabConfigRes = await db.query(
        "SELECT grooming_group FROM performance_slabs_config WHERE slab_name = $1",
        [slabName]
      );
      let groupName = 'Foundation Group';
      if (slabConfigRes.rows.length > 0) {
        groupName = slabConfigRes.rows[0].grooming_group;
      }

      // Query monthly allowance amount for this grooming group from grooming_allowances_config
      const allowanceConfigRes = await db.query(
        "SELECT allowance_amount FROM grooming_allowances_config WHERE group_name = $1",
        [groupName]
      );
      let amount = 0.00;
      if (allowanceConfigRes.rows.length > 0) {
        amount = parseFloat(allowanceConfigRes.rows[0].allowance_amount);
      }

      const id = `alw_${payment_month.replace('-', '')}_${teacherId}`;

      await db.query(`
        INSERT INTO teacher_allowances (id, teacher_id, group_name, allowance_amount, payment_month, status)
        VALUES ($1, $2, $3, $4, $5, 'paid')
        ON CONFLICT (id) DO NOTHING
      `, [id, teacherId, groupName, amount, payment_month]);

      if (amount > 0) {
        // Credit to teacher wallet
        await db.query(`
          INSERT INTO teacher_wallet (teacher_id, total_earnings, pending_earnings, wallet_balance)
          VALUES ($1, $2, $2, $2)
          ON CONFLICT (teacher_id) DO UPDATE SET
            total_earnings = teacher_wallet.total_earnings + $2,
            pending_earnings = teacher_wallet.pending_earnings + $2,
            wallet_balance = teacher_wallet.wallet_balance + $2
        `, [teacherId, amount]);

        // Log transaction to ledger
        const txId = `tx_alw_${id}`;
        await db.query(`
          INSERT INTO teacher_wallet_ledger (id, teacher_id, amount, type, description)
          VALUES ($1, $2, $3, 'grooming_allowance', $4)
          ON CONFLICT (id) DO NOTHING
        `, [
          txId,
          teacherId,
          amount,
          `Monthly Grooming Allowance generated for ${payment_month} (Group: ${groupName})`
        ]);
      }

      generated.push({
        teacher_id: teacherId,
        group_name: groupName,
        allowance_amount: amount,
        payment_month
      });
    }

    await logAudit(req.user.id, 'ALLOWANCES_GENERATED', 'platform', payment_month, { count: generated.length });

    res.json({ message: `Grooming allowances for ${payment_month} generated successfully`, generated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/payouts/:id/pay-razorpay - Trigger Razorpay Payout executing payout programmatically
router.post('/payouts/:id/pay-razorpay', async (req, res) => {
  const { id } = req.params;
  try {
    const payoutQuery = await db.query('SELECT * FROM teacher_payouts WHERE id = $1', [id]);
    if (!payoutQuery.rows.length) return res.status(404).json({ error: 'Payout request not found' });
    const p = payoutQuery.rows[0];

    if (p.status === 'paid') {
      return res.status(400).json({ error: 'Payout has already been paid' });
    }

    const { executePayout } = require('../services/RazorpayPayoutService');
    const result = await executePayout(id);

    await logAudit(req.user.id, 'PAYOUT_PAID_RAZORPAY', 'payout', id, {
      razorpay_payout_id: result.razorpayPayoutId,
      status: result.status
    });

    res.json({
      message: 'Payout processed successfully via Razorpay X API',
      razorpay_payout_id: result.razorpayPayoutId,
      status: result.status
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
