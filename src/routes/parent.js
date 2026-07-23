const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sanitizeUser } = require('../utils/security');

router.use(authenticateToken);

// ── Link Child ────────────────────────────────────────────────
const verifyChildLink = async (req, res, next) => {
  const { studentId } = req.params;
  try {
    const link = await db.query(
      'SELECT id, status FROM parent_student_links WHERE parent_id = $1 AND student_id = $2',
      [req.user.id, studentId]
    );
    if (!link.rows.length) {
      return res.status(403).json({ error: 'Access denied. Not linked to this student.' });
    }
    if (link.rows[0].status !== 'approved') {
      return res.status(403).json({ error: `Access denied. Request status is: ${link.rows[0].status}` });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.post('/link-child', async (req, res) => {
  const { student_code } = req.body;
  try {
    if (!student_code) return res.status(400).json({ error: 'student_code is required' });

    const studentRes = await db.query(
      "SELECT id, name, email FROM users WHERE (UPPER(student_code) = $1 OR UPPER(email) = $1 OR id = $2) AND role = 'student'",
      [student_code.toUpperCase(), student_code]
    );
    if (!studentRes.rows.length) {
      return res.status(404).json({ error: 'No student found with this code. Please check and try again.' });
    }

    const student = studentRes.rows[0];

    // Check already linked
    const existing = await db.query(
      'SELECT id, status FROM parent_student_links WHERE parent_id = $1 AND student_id = $2',
      [req.user.id, student.id]
    );
    if (existing.rows.length > 0) {
      const link = existing.rows[0];
      if (link.status === 'approved') {
        return res.status(400).json({ error: 'This child is already linked to your account' });
      } else if (link.status === 'pending') {
        return res.status(400).json({ error: 'A link request is already pending child approval' });
      } else if (link.status === 'rejected') {
        await db.query(
          "UPDATE parent_student_links SET status = 'pending', linked_at = NOW() WHERE id = $1",
          [link.id]
        );
        return res.json({ message: `Link request sent again. Pending child "${student.name}" approval.`, student });
      }
    }

    await db.query(
      "INSERT INTO parent_student_links (parent_id, student_id, status) VALUES ($1,$2,'pending')",
      [req.user.id, student.id]
    );

    res.json({ message: `Link request sent successfully. Pending child "${student.name}" approval.`, student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get Linked Children ───────────────────────────────────────
router.get('/children', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.name, u.email, u.photo_url, u.student_code, u.grade, u.board, u.learning_streak, psl.status, psl.id as link_id
      FROM parent_student_links psl
      JOIN users u ON u.id = psl.student_id
      WHERE psl.parent_id = $1
      ORDER BY psl.linked_at
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Child Dashboard Overview ──────────────────────────────────
router.get('/children/:studentId/overview', verifyChildLink, async (req, res) => {
  const { studentId } = req.params;
  try {
    const [student, attendance, assignments, reports, observations] = await Promise.all([
      db.query('SELECT * FROM users WHERE id = $1', [studentId]),
      db.query(`
        SELECT COUNT(*) as total, 
               SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END) as present
        FROM attendance WHERE student_id = $1
      `, [studentId]),
      db.query(`
        SELECT COUNT(a.id) as total, COUNT(s.id) as submitted
        FROM assignments a
        JOIN batch_students bs ON bs.batch_id = a.batch_id AND bs.student_id = $1
        LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_id = $1
      `, [studentId]),
      db.query(
        'SELECT * FROM monthly_reports WHERE student_id = $1 ORDER BY report_month DESC LIMIT 3',
        [studentId]
      ),
      db.query(
        'SELECT AVG(curiosity) as curiosity, AVG(understanding) as understanding, AVG(consistency) as consistency, AVG(communication) as communication, AVG(participation) as participation, AVG(discipline) as discipline FROM student_observations WHERE student_id = $1',
        [studentId]
      ),
    ]);

    const attTotal = parseInt(attendance.rows[0]?.total) || 1;
    const attPresent = parseInt(attendance.rows[0]?.present) || 0;

    res.json({
      student: sanitizeUser(student.rows[0]),
      attendancePct: Math.round((attPresent / attTotal) * 100),
      assignmentCompletion: assignments.rows[0],
      recentReports: reports.rows,
      averageObservations: observations.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Child Attendance ──────────────────────────────────────────
router.get('/children/:studentId/attendance', verifyChildLink, async (req, res) => {
  const { studentId } = req.params;
  try {
    const result = await db.query(`
      SELECT a.*, lc.title as class_title, b.batch_name
      FROM attendance a
      LEFT JOIN live_classes lc ON lc.id = a.class_id
      LEFT JOIN batches b ON b.id = a.batch_id
      WHERE a.student_id = $1
      ORDER BY a.attendance_date DESC
    `, [studentId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Child Assignments ─────────────────────────────────────────
router.get('/children/:studentId/assignments', verifyChildLink, async (req, res) => {
  const { studentId } = req.params;
  try {
    const result = await db.query(`
      SELECT a.*, b.batch_name,
             s.marks_obtained, s.feedback, s.status as submission_status, s.submitted_at
      FROM assignments a
      JOIN batch_students bs ON bs.batch_id = a.batch_id AND bs.student_id = $1
      JOIN batches b ON b.id = a.batch_id
      LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_id = $1
      ORDER BY a.due_date
    `, [studentId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Child Monthly Reports ─────────────────────────────────────
router.get('/children/:studentId/reports', verifyChildLink, async (req, res) => {
  const { studentId } = req.params;
  try {
    const result = await db.query(`
      SELECT mr.*, b.batch_name, u.name as teacher_name
      FROM monthly_reports mr
      LEFT JOIN batches b ON b.id = mr.batch_id
      LEFT JOIN users u ON u.id = mr.teacher_id
      WHERE mr.student_id = $1
      ORDER BY mr.report_month DESC
    `, [studentId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Child Teacher Feedback / Observations ─────────────────────
router.get('/children/:studentId/observations', verifyChildLink, async (req, res) => {
  const { studentId } = req.params;
  try {
    const result = await db.query(`
      SELECT DISTINCT ON (b.teacher_id)
        so.id,
        $1 AS student_id,
        b.teacher_id,
        u.name AS teacher_name,
        b.id AS batch_id,
        b.batch_name,
        so.curiosity,
        so.understanding,
        so.consistency,
        so.communication,
        so.participation,
        so.discipline,
        so.observation_date
      FROM batch_students bs
      JOIN batches b ON b.id = bs.batch_id
      JOIN users u ON u.id = b.teacher_id
      LEFT JOIN student_observations so ON so.student_id = bs.student_id 
                                       AND so.teacher_id = b.teacher_id 
                                       AND so.batch_id = b.id
      WHERE bs.student_id = $1
      ORDER BY b.teacher_id, so.observation_date DESC
    `, [studentId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Notifications for Parent ──────────────────────────────────
router.get('/notifications', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM notifications
      WHERE (target_role = 'parent' OR target_role = 'all' OR target_user = $1)
        AND is_active = true
      ORDER BY created_at DESC LIMIT 20
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get Parent Unread Message Count ───────────────────────────
router.get('/unread-count', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT COUNT(*) as count 
      FROM parent_teacher_chats 
      WHERE parent_id = $1 AND sender_id != $1 AND is_read = false
    `, [req.user.id]);
    res.json({ unread: parseInt(result.rows[0]?.count || '0', 10) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get Enrolled / Available Teachers for Student with Unread Message Counts ──
router.get('/teachers', async (req, res) => {
  const { studentId } = req.query;
  if (!studentId) {
    return res.status(400).json({ error: 'studentId is required' });
  }
  try {
    // Verify student link
    const link = await db.query(
      'SELECT id FROM parent_student_links WHERE parent_id = $1 AND student_id = $2 AND status = \'approved\'',
      [req.user.id, studentId]
    );
    if (!link.rows.length) {
      return res.status(403).json({ error: 'Access denied. You are not linked to this student.' });
    }

    const teachersRes = await db.query(`
      SELECT DISTINCT ON (u.id) 
             u.id as teacher_id, u.name as teacher_name, u.photo_url, u.email as teacher_email,
             COALESCE(b.name, 'Educator') as batch_name, COALESCE(c.title, 'Subject Mentor') as course_title,
             (SELECT COUNT(*) FROM parent_teacher_chats 
              WHERE parent_id = $1 AND teacher_id = u.id AND student_id = $2 AND sender_id != $1 AND is_read = false) as unread_count,
             (SELECT MAX(created_at) FROM parent_teacher_chats 
              WHERE parent_id = $1 AND teacher_id = u.id AND student_id = $2) as last_chat_at,
             (SELECT message FROM parent_teacher_chats 
              WHERE parent_id = $1 AND teacher_id = u.id AND student_id = $2 ORDER BY created_at DESC LIMIT 1) as last_message,
             (SELECT sender_id FROM parent_teacher_chats 
              WHERE parent_id = $1 AND teacher_id = u.id AND student_id = $2 ORDER BY created_at DESC LIMIT 1) as last_sender_id
      FROM users u
      LEFT JOIN batches b ON b.teacher_id = u.id
      LEFT JOIN courses c ON c.id = b.course_id
      WHERE u.role = 'teacher' AND (u.is_active IS NULL OR u.is_active = true)
      ORDER BY u.id, unread_count DESC, last_chat_at DESC NULLS LAST, u.name ASC
    `, [req.user.id, studentId]);

    res.json(teachersRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get Teacher Connect Messages ──────────────────────────────
router.get('/connect/messages', async (req, res) => {
  const { teacherId, studentId } = req.query;
  if (!teacherId || !studentId) {
    return res.status(400).json({ error: 'teacherId and studentId are required' });
  }
  try {
    // Verify student link
    const link = await db.query(
      'SELECT id FROM parent_student_links WHERE parent_id = $1 AND student_id = $2 AND status = \'approved\'',
      [req.user.id, studentId]
    );
    if (!link.rows.length) {
      return res.status(403).json({ error: 'Access denied. You are not linked to this student.' });
    }

    // Mark incoming messages as read
    await db.query(`
      UPDATE parent_teacher_chats 
      SET is_read = true 
      WHERE parent_id = $1 AND teacher_id = $2 AND student_id = $3 AND sender_id != $1
    `, [req.user.id, teacherId, studentId]);

    const messages = await db.query(`
      SELECT chat.*, 
             sender.name as sender_name, sender.role as sender_role
      FROM parent_teacher_chats chat
      JOIN users sender ON sender.id = chat.sender_id
      WHERE chat.parent_id = $1 AND chat.teacher_id = $2 AND chat.student_id = $3
      ORDER BY chat.created_at ASC
    `, [req.user.id, teacherId, studentId]);

    res.json(messages.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function isProhibitedContactContent(text) {
  if (!text) return false;
  const digitsOnly = text.replace(/\D/g, '');
  if (digitsOnly.length >= 10) return true;
  const phonePattern = /(?:\+?\d{1,4}[-.\s]*)?\(?\d{2,5}\)?[-.\s]*\d{3,5}[-.\s]*\d{3,5}/;
  if (phonePattern.test(text)) return true;
  const emailPattern = /[a-zA-Z0-9._%+-]+(?:\s*@\s*|\s*\[at\]\s*|\s*\(at\)\s*|\s+at\s+)[a-zA-Z0-9.-]+(?:\s*\.\s*|\s*\[dot\]\s*|\s*\(dot\)\s*|\s+dot\s+)[a-zA-Z]{2,}/i;
  if (emailPattern.test(text)) return true;
  const socialPattern = /(?:whatsapp|insta|instagram|facebook|fb|telegram|tg|snapchat|linkedin|twitter|x\.com|wa\.me|t\.me|connect on|add me|call me|message me|ping me|reach me|handle is|my id|my number|contact no|mobile no)[\s:]*@?[\w.-]+/i;
  if (socialPattern.test(text)) return true;
  const urlPattern = /(?:https?:\/\/|www\.)[^\s]+/i;
  if (urlPattern.test(text)) return true;
  return false;
}

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const chatUploadDir = path.join(__dirname, '../../public/uploads/chat_attachments');
if (!fs.existsSync(chatUploadDir)) {
  fs.mkdirSync(chatUploadDir, { recursive: true });
}

const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, chatUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `chat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}${ext}`);
  }
});

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, WEBP) up to 5 MB are allowed.'));
    }
  }
});

// ── Send Teacher Connect Message ──────────────────────────────
router.post('/connect/messages', chatUpload.single('image'), async (req, res) => {
  const { teacherId, studentId, message } = req.body;
  const imageUrl = req.file ? `/uploads/chat_attachments/${req.file.filename}` : null;
  const chatMsg = (message || '').trim() || (imageUrl ? '📷 Sent an image attachment' : '');

  if (!teacherId || !studentId || (!chatMsg && !imageUrl)) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'teacherId, studentId, and message or image are required' });
  }

  if (isProhibitedContactContent(chatMsg)) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({
      error: 'For safety & privacy, sharing phone numbers, email IDs, or social media handles is strictly prohibited. Messages must remain focused on student progress only.'
    });
  }
  try {
    // Verify student link
    const link = await db.query(
      'SELECT id FROM parent_student_links WHERE parent_id = $1 AND student_id = $2 AND status = \'approved\'',
      [req.user.id, studentId]
    );
    if (!link.rows.length) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Access denied. You are not linked to this student.' });
    }

    const result = await db.query(`
      INSERT INTO parent_teacher_chats (parent_id, teacher_id, student_id, sender_id, message, image_url)
      VALUES ($1, $2, $3, $1, $4, $5)
      RETURNING *
    `, [req.user.id, teacherId, studentId, chatMsg, imageUrl]);

    // Also send an in-app notification to the teacher
    const parentRes = await db.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const studentRes = await db.query('SELECT name FROM users WHERE id = $1', [studentId]);
    const parentName = parentRes.rows[0]?.name || 'Parent';
    const studentName = studentRes.rows[0]?.name || 'Student';

    await db.query(`
      INSERT INTO notifications (id, title, message, target_role, target_user, type, sent_by)
      VALUES ($1, $2, $3, 'teacher', $4, 'info', $5)
    `, [
      'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      `New Message from parent ${parentName}`,
      `Parent ${parentName} sent a message regarding student ${studentName}: "${message.substring(0, 60)}${message.length > 60 ? '...' : ''}"`,
      teacherId,
      req.user.id
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get Parent's Rating for Teacher ───────────────────────────
router.get('/connect/ratings', async (req, res) => {
  const { teacherId, studentId } = req.query;
  if (!teacherId || !studentId) {
    return res.status(400).json({ error: 'teacherId and studentId are required' });
  }
  try {
    const result = await db.query(`
      SELECT * FROM teacher_ratings 
      WHERE parent_id = $1 AND teacher_id = $2 AND student_id = $3
    `, [req.user.id, teacherId, studentId]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Submit/Update Teacher Rating ──────────────────────────────
router.post('/connect/ratings', async (req, res) => {
  const { teacherId, studentId, rating, feedback } = req.body;
  if (!teacherId || !studentId || !rating) {
    return res.status(400).json({ error: 'teacherId, studentId, and rating are required' });
  }
  const ratingInt = parseInt(rating);
  if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
  }
  try {
    // Verify student link
    const link = await db.query(
      'SELECT id FROM parent_student_links WHERE parent_id = $1 AND student_id = $2 AND status = \'approved\'',
      [req.user.id, studentId]
    );
    if (!link.rows.length) {
      return res.status(403).json({ error: 'Access denied. You are not linked to this student.' });
    }

    // Upsert rating
    await db.query(`
      INSERT INTO teacher_ratings (teacher_id, parent_id, student_id, rating, feedback)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (teacher_id, parent_id, student_id)
      DO UPDATE SET rating = $4, feedback = $5, created_at = NOW()
    `, [teacherId, req.user.id, studentId, ratingInt, feedback || null]);

    // Recalculate teacher aggregate rating & count
    await db.query(`
      UPDATE users 
      SET rating = COALESCE((SELECT ROUND(AVG(rating), 2) FROM teacher_ratings WHERE teacher_id = $1), 5.0),
          total_ratings = (SELECT COUNT(*) FROM teacher_ratings WHERE teacher_id = $1)
      WHERE id = $1
    `, [teacherId]);

    // Trigger level update trigger
    try {
      const levelService = require('../services/teacherLevel.service');
      await levelService.updateTeacherLevel(teacherId);
    } catch (lvlErr) {
      console.error('[ParentRating] Level update trigger failed:', lvlErr.message);
    }

    res.json({ message: 'Rating submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
