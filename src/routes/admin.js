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
  const { camera_checklist, lighting_checklist, audio_checklist, internet_checklist, teaching_checklist } = req.body;
  try {
    await db.query(`
      UPDATE teacher_sop SET 
        status = 'approved',
        camera_checklist = $2,
        lighting_checklist = $3,
        audio_checklist = $4,
        internet_checklist = $5,
        teaching_checklist = $6,
        reviewed_by = $7,
        reviewed_at = NOW()
      WHERE teacher_id = $1
    `, [teacherId, 
        JSON.stringify(camera_checklist), JSON.stringify(lighting_checklist),
        JSON.stringify(audio_checklist), JSON.stringify(internet_checklist),
        JSON.stringify(teaching_checklist), req.user.id]);

    await db.query("UPDATE users SET approval_status = 'agreement_pending' WHERE id = $1", [teacherId]);
    await logAudit(req.user.id, 'SOP_APPROVED', 'teacher', teacherId, {});
    res.json({ message: 'SOP approved. Waiting for teacher to sign agreement.' });
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
    await logAudit(req.user.id, 'SOP_REJECTED', 'teacher', teacherId, { admin_notes });
    res.json({ message: 'SOP rejected. Teacher notified.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Teacher Level Management ──────────────────────────────────
router.post('/teachers/:id/set-level', async (req, res) => {
  const { id } = req.params;
  const { level } = req.body;
  const validLevels = ['Bronze', 'Silver', 'Gold', 'Elite Mentor'];
  try {
    if (!validLevels.includes(level)) return res.status(400).json({ error: 'Invalid level' });
    const current = await db.query('SELECT teacher_level FROM users WHERE id = $1', [id]);
    const previousLevel = current.rows[0]?.teacher_level;
    await db.query('UPDATE users SET teacher_level = $1 WHERE id = $2', [level, id]);
    await db.query(`
      INSERT INTO teacher_levels (id, teacher_id, level, previous_level, changed_by, reason)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [`lvl_${Date.now()}`, id, level, previousLevel, req.user.id, 'Manual admin override']);
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
    const result = await db.query('SELECT * FROM courses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/courses', async (req, res) => {
  const { title, subject, description, duration_weeks, grade, board, fees, thumbnail_url } = req.body;
  try {
    if (!title || !fees) return res.status(400).json({ error: 'title and fees are required' });
    const id = `course_${Date.now()}`;
    const result = await db.query(`
      INSERT INTO courses (id, title, subject, description, duration_weeks, grade, board, fees, thumbnail_url, status, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10) RETURNING *
    `, [id, title, subject, description, duration_weeks || 12, grade, board, parseFloat(fees), thumbnail_url, req.user.id]);
    await logAudit(req.user.id, 'COURSE_CREATED', 'course', id, { title });
    res.status(201).json({ message: 'Course created', course: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/courses/:id', async (req, res) => {
  const { id } = req.params;
  const { title, subject, description, duration_weeks, grade, board, fees, thumbnail_url, status } = req.body;
  try {
    const result = await db.query(`
      UPDATE courses SET title=COALESCE($2,title), subject=COALESCE($3,subject), description=COALESCE($4,description),
        duration_weeks=COALESCE($5,duration_weeks), grade=COALESCE($6,grade), board=COALESCE($7,board),
        fees=COALESCE($8,fees), thumbnail_url=COALESCE($9,thumbnail_url), status=COALESCE($10,status), updated_at=NOW()
      WHERE id = $1 RETURNING *
    `, [id, title, subject, description, duration_weeks, grade, board, fees, thumbnail_url, status]);
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
  const { batchId, title, classDate, classTime } = req.body;
  try {
    const id = `live_${Date.now()}`;
    const batch = await db.query('SELECT * FROM batches WHERE id = $1', [batchId]);
    if (!batch.rows.length) return res.status(404).json({ error: 'Batch not found' });
    const channel = batch.rows[0].agora_channel || `speaxa_${batchId}`;

    await db.query(`
      INSERT INTO live_classes (id, batch_id, teacher_id, title, class_date, class_time, agora_channel, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'scheduled')
    `, [id, batchId, batch.rows[0].teacher_id, title, classDate, classTime, channel]);

    await logAudit(req.user.id, 'CLASS_SCHEDULED', 'live_class', id, { title, batchId });
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

// ── Commission Config ─────────────────────────────────────────
router.get('/commission', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM commission_config ORDER BY commission_type');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/commission/:type', async (req, res) => {
  const { type } = req.params;
  const { teacher_pct, platform_pct } = req.body;
  try {
    if (parseFloat(teacher_pct) + parseFloat(platform_pct) !== 100) {
      return res.status(400).json({ error: 'teacher_pct + platform_pct must equal 100' });
    }
    await db.query(`
      UPDATE commission_config SET teacher_pct = $1, platform_pct = $2, updated_at = NOW()
      WHERE commission_type = $3
    `, [teacher_pct, platform_pct, type]);
    await logAudit(req.user.id, 'COMMISSION_UPDATED', 'platform', type, { teacher_pct, platform_pct });
    res.json({ message: 'Commission config updated' });
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

module.exports = router;
