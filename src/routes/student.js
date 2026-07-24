const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sanitizeUser, generateUID } = require('../utils/security');
const { logAudit } = require('../services/AuditService');
const { sendEmail } = require('../services/EmailService');

router.use(authenticateToken);

// File upload for assignment submissions
const submissionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../public/uploads/submissions');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `sub_${req.user.id}_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const submissionUpload = multer({ storage: submissionStorage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── Browse Courses ────────────────────────────────────────────
router.get('/courses', async (req, res) => {
  const { grade, board, subject } = req.query;
  try {
    let query = `
      SELECT c.*, 
             COUNT(DISTINCT b.id) as batch_count,
             COUNT(DISTINCT bs.student_id) as enrolled_students
      FROM courses c
      LEFT JOIN batches b ON b.course_id = c.id AND b.status = 'active'
      LEFT JOIN batch_students bs ON bs.batch_id = b.id
      WHERE c.status = 'active'
    `;
    const params = [];
    let idx = 1;
    if (grade) { query += ` AND c.grade = $${idx++}`; params.push(grade); }
    if (board) { query += ` AND c.board = $${idx++}`; params.push(board); }
    if (subject) { query += ` AND c.subject ILIKE $${idx++}`; params.push(`%${subject}%`); }
    query += ' GROUP BY c.id ORDER BY c.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Browse Batches ────────────────────────────────────────────
router.get('/batches', async (req, res) => {
  const { courseId } = req.query;
  try {
    let query = `
      SELECT b.*, c.title as course_title, c.fees, u.name as teacher_name, u.photo_url as teacher_photo,
             u.teacher_level, u.rating as teacher_rating,
             u.qualification as teacher_qualification, u.experience_years as teacher_experience,
             u.subject_expertise as teacher_expertise, u.bio as teacher_bio,
             (b.capacity - b.seats_filled) as available_seats
      FROM batches b
      LEFT JOIN courses c ON c.id = b.course_id
      LEFT JOIN users u ON u.id = b.teacher_id
      WHERE b.status = 'active' AND b.seats_filled < b.capacity
    `;
    const params = [];
    if (courseId) { query += ' AND b.course_id = $1'; params.push(courseId); }
    query += ' ORDER BY b.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── My Enrolled Batches ───────────────────────────────────────
router.get('/my-batches', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT b.*, c.title as course_title, c.fees, u.name as teacher_name, u.photo_url as teacher_photo,
             u.teacher_level, u.rating as teacher_rating, bs.enrolled_at
      FROM batch_students bs
      JOIN batches b ON b.id = bs.batch_id
      LEFT JOIN courses c ON c.id = b.course_id
      LEFT JOIN users u ON u.id = b.teacher_id
      WHERE bs.student_id = $1 AND bs.status = 'active'
      ORDER BY bs.enrolled_at DESC
    `, [req.user.id]);
    console.log(`[my-batches] user=${req.user.id} returned ${result.rows.length} batches:`, result.rows.map(r => r.batch_name));
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch study materials/notes for batch
router.get('/batches/:batchId/notes', async (req, res) => {
  const { batchId } = req.params;
  try {
    const result = await db.query(
      "SELECT * FROM study_materials WHERE batch_id = $1 ORDER BY uploaded_at DESC",
      [batchId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch live classes schedule for batch
router.get('/batches/:batchId/live-classes', async (req, res) => {
  const { batchId } = req.params;
  try {
    const result = await db.query(`
      SELECT lc.*, u.name as teacher_name
      FROM live_classes lc
      LEFT JOIN users u ON u.id = lc.teacher_id
      WHERE lc.batch_id = $1 AND lc.status IN ('scheduled', 'live', 'ended')
      ORDER BY lc.class_date DESC, lc.class_time DESC
    `, [batchId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function sendPaymentReceiptEmail({ studentEmail, studentName, courseTitle, batchName, amountPaid, originalFees, discountAmount, couponCode, paymentId, date }) {
  if (!studentEmail) return;
  const formattedDate = new Date(date || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let couponLineHtml = '';
  if (couponCode && discountAmount > 0) {
    couponLineHtml = `
      <tr style="border-bottom: 1px dashed #e2e8f0;">
        <td style="padding: 10px 0; color: #16a34a; font-size: 14px;">Coupon Discount (${couponCode})</td>
        <td style="padding: 10px 0; text-align: right; color: #16a34a; font-weight: 700; font-size: 14px;">-₹${parseFloat(discountAmount).toLocaleString('en-IN')}</td>
      </tr>
    `;
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #334155;">
      <h3 style="color: #0f172a; margin-top: 0; font-size: 20px;">Payment Receipt & Enrollment Confirmation</h3>
      <p style="color: #475569; font-size: 14px; margin-bottom: 24px;">
        Hi <strong>${studentName || 'Student'}</strong>,<br>
        Thank you for your payment! Your enrollment in <strong>${batchName || courseTitle}</strong> has been successfully confirmed.
      </p>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 12px;">Transaction Details</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Transaction ID</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 600; font-size: 13px; font-family: monospace;">${paymentId}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Date & Time</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 500; font-size: 13px;">${formattedDate}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Course Enrolled</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 600; font-size: 13px;">${courseTitle}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Batch Name</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 600; font-size: 13px;">${batchName}</td>
          </tr>
        </table>

        <div style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; margin-top: 20px; margin-bottom: 8px;">Payment Summary</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Course Fee</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 600; font-size: 14px;">₹${parseFloat(originalFees || amountPaid).toLocaleString('en-IN')}</td>
          </tr>
          ${couponLineHtml}
          <tr>
            <td style="padding: 12px 0 0 0; color: #0f172a; font-weight: 800; font-size: 16px;">Total Amount Paid</td>
            <td style="padding: 12px 0 0 0; text-align: right; color: #0d7a6d; font-weight: 800; font-size: 18px;">₹${parseFloat(amountPaid).toLocaleString('en-IN')}</td>
          </tr>
        </table>
      </div>

      <div style="background: rgba(13, 122, 109, 0.05); border: 1px solid rgba(13, 122, 109, 0.2); border-radius: 10px; padding: 14px; text-align: center; font-size: 13px; color: #0d7a6d;">
        🚀 You can now access your live classes, study notes, and assignments directly from your <strong>Student Dashboard</strong>!
      </div>
    </div>
  `;

  return sendEmail({
    to: studentEmail,
    subject: `Payment Receipt: Enrolled in ${batchName} (${paymentId})`,
    html,
    type: 'notification',
    headerTitle: 'Official Payment Receipt',
    badgeLabel: 'SPEAXA Billing'
  });
}

// ── Enroll in Batch (after payment) ──────────────────────────
router.post('/batches/:batchId/enroll', async (req, res) => {
  const { batchId } = req.params;
  const { paymentId, couponCode } = req.body;
  try {
    // Check already enrolled
    const existing = await db.query(
      'SELECT id FROM batch_students WHERE batch_id = $1 AND student_id = $2',
      [batchId, req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'You are already enrolled in this batch' });
    }

    // Check capacity & fetch batch/course info
    const batchRes = await db.query(`
      SELECT b.*, c.title as course_title, c.fees as course_fees
      FROM batches b
      LEFT JOIN courses c ON c.id = b.course_id
      WHERE b.id = $1 AND b.status = $2
    `, [batchId, 'active']);

    if (!batchRes.rows.length) return res.status(404).json({ error: 'Batch not found or inactive' });
    const batchObj = batchRes.rows[0];

    if (batchObj.seats_filled >= batchObj.capacity) {
      return res.status(400).json({ error: 'This batch is full' });
    }

    const originalFees = parseFloat(batchObj.course_fees || 0);
    let discountAmount = 0;
    let amountPaid = originalFees;

    // Handle coupon usage if applied
    if (couponCode && couponCode.trim()) {
      const codeUpper = couponCode.trim().toUpperCase();
      const cpRes = await db.query(
        "SELECT * FROM coupons WHERE code = $1 AND is_active = true AND (valid_until IS NULL OR valid_until > NOW()) AND used_count < max_uses",
        [codeUpper]
      );
      if (cpRes.rows.length > 0) {
        const cp = cpRes.rows[0];
        discountAmount = (originalFees * parseFloat(cp.discount_percent)) / 100;
        amountPaid = Math.max(0, originalFees - discountAmount);
        await db.query('UPDATE coupons SET used_count = used_count + 1 WHERE code = $1', [codeUpper]);
      }
    }

    const pId = paymentId || `pay_mock_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    // Enroll in batch_students table
    await db.query(
      'INSERT INTO batch_students (batch_id, student_id, payment_id, status) VALUES ($1,$2,$3,$4)',
      [batchId, req.user.id, pId, 'active']
    );
    await db.query('UPDATE batches SET seats_filled = seats_filled + 1 WHERE id = $1', [batchId]);

    // Insert payment row into payments ledger
    await db.query(`
      INSERT INTO payments (id, student_id, batch_id, course_id, amount, status, payment_method, gateway_payment_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `, [pId, req.user.id, batchId, batchObj.course_id || null, amountPaid, 'captured', 'upi', pId]);

    await logAudit(req.user.id, 'BATCH_ENROLLED', 'batch', batchId, { paymentId: pId, couponCode });

    // Send Payment Receipt Email Asynchronously to Student's Email ID
    sendPaymentReceiptEmail({
      studentEmail: req.user.email,
      studentName: req.user.name,
      courseTitle: batchObj.course_title || 'EdTech Course',
      batchName: batchObj.batch_name || 'Batch',
      amountPaid,
      originalFees,
      discountAmount,
      couponCode: couponCode ? couponCode.trim().toUpperCase() : null,
      paymentId: pId,
      date: new Date()
    }).catch(e => console.error('[Enrollment Receipt Email Error]:', e.message));

    res.json({ message: 'Enrolled successfully in batch! Payment receipt sent to your email.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Attendance ────────────────────────────────────────────────
router.get('/attendance', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*, lc.title as class_title, b.batch_name
      FROM attendance a
      LEFT JOIN live_classes lc ON lc.id = a.class_id
      LEFT JOIN batches b ON b.id = a.batch_id
      WHERE a.student_id = $1
      ORDER BY a.attendance_date DESC
    `, [req.user.id]);

    // Stats
    const total = result.rows.length;
    const present = result.rows.filter(r => ['present', 'late'].includes(r.status)).length;
    const attendancePct = total > 0 ? Math.round((present / total) * 100) : 0;

    res.json({ records: result.rows, stats: { total, present, attendancePct } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Assignments ───────────────────────────────────────────────
router.get('/assignments', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*, b.batch_name, 
             s.id as submission_id, s.marks_obtained, s.feedback, s.status as submission_status, s.submitted_at
      FROM assignments a
      JOIN batch_students bs ON bs.batch_id = a.batch_id AND bs.student_id = $1
      JOIN batches b ON b.id = a.batch_id
      LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_id = $1
      WHERE a.status = 'active'
      ORDER BY a.due_date ASC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/assignments/:assignmentId/submit', submissionUpload.single('file'), async (req, res) => {
  const { assignmentId } = req.params;
  const { notes } = req.body;
  try {
    // Check already submitted
    const existing = await db.query(
      'SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2',
      [assignmentId, req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'You have already submitted this assignment' });
    }

    const fileUrl = req.file ? `/uploads/submissions/${req.file.filename}` : null;
    const id = generateUID('sub');
    const asgn = await db.query('SELECT due_date FROM assignments WHERE id = $1', [assignmentId]);
    const isLate = asgn.rows[0]?.due_date && new Date() > new Date(asgn.rows[0].due_date);

    await db.query(`
      INSERT INTO assignment_submissions (id, assignment_id, student_id, file_url, notes, status)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [id, assignmentId, req.user.id, fileUrl, notes, isLate ? 'late' : 'submitted']);

    await logAudit(req.user.id, 'ASSIGNMENT_SUBMITTED', 'assignment', assignmentId, { isLate });

    // Trigger email notification for teacher
    const { notifyAssignmentSubmitted } = require('../services/notification.service');
    notifyAssignmentSubmitted({
      assignmentId,
      studentId: req.user.id,
      studentName: req.user.name,
      fileUrl
    }).catch(err => console.error('[StudentRoute] notifyAssignmentSubmitted error:', err));

    res.status(201).json({ message: isLate ? 'Submitted (late)' : 'Assignment submitted', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Recordings ────────────────────────────────────────────────
router.get('/recordings', async (req, res) => {
  const { batchId } = req.query;
  try {
    // Only show recordings for batches the student is enrolled in
    let query = `
      SELECT r.*, b.batch_name, lc.title as class_title, lc.class_date
      FROM recordings r
      JOIN live_classes lc ON lc.id = r.class_id
      JOIN batches b ON b.id = r.batch_id
      JOIN batch_students bs ON bs.batch_id = r.batch_id AND bs.student_id = $1
      WHERE r.is_available = true
    `;
    const params = [req.user.id];
    if (batchId) { query += ' AND r.batch_id = $2'; params.push(batchId); }
    query += ' ORDER BY r.recorded_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reports ───────────────────────────────────────────────────
router.get('/reports', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT mr.*, b.batch_name, u.name as teacher_name
      FROM monthly_reports mr
      LEFT JOIN batches b ON b.id = mr.batch_id
      LEFT JOIN users u ON u.id = mr.teacher_id
      WHERE mr.student_id = $1
      ORDER BY mr.report_month DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Notifications ─────────────────────────────────────────────
router.get('/notifications', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM notifications
      WHERE (target_role = 'student' OR target_role = 'all' OR target_user = $1)
        AND is_active = true
      ORDER BY created_at DESC LIMIT 100
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/notifications/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM notifications WHERE id = $1 AND (target_user = $2 OR target_user IS NULL)', [id, req.user.id]);
    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── My Profile / Code ─────────────────────────────────────────
router.get('/profile', async (req, res) => {
  try {
    const user = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!user.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(sanitizeUser(user.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Parent Access Requests ────────────────────────────────────
router.get('/parent-requests', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT psl.id as link_id, psl.status, psl.linked_at, 
             u.name as parent_name, u.email as parent_email
      FROM parent_student_links psl
      JOIN users u ON u.id = psl.parent_id
      WHERE psl.student_id = $1
      ORDER BY psl.linked_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/parent-requests/:linkId/approve', async (req, res) => {
  const { linkId } = req.params;
  try {
    const result = await db.query(
      "UPDATE parent_student_links SET status = 'approved' WHERE id = $1 AND student_id = $2 RETURNING *",
      [linkId, req.user.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Connection request not found' });
    }
    await logAudit(req.user.id, 'PARENT_LINK_APPROVED', 'parent_student_links', linkId, { parent_id: result.rows[0].parent_id });
    res.json({ message: 'Parent access request approved successfully', link: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/parent-requests/:linkId/reject', async (req, res) => {
  const { linkId } = req.params;
  try {
    // Check current connection status
    const checkRes = await db.query(
      "SELECT status FROM parent_student_links WHERE id = $1 AND student_id = $2",
      [linkId, req.user.id]
    );
    if (!checkRes.rows.length) {
      return res.status(404).json({ error: 'Connection request not found' });
    }
    if (checkRes.rows[0].status === 'approved') {
      return res.status(400).json({ error: 'Once parent access is approved, it cannot be revoked by the student. Only an administrator can revert this.' });
    }

    const result = await db.query(
      "UPDATE parent_student_links SET status = 'rejected' WHERE id = $1 AND student_id = $2 RETURNING *",
      [linkId, req.user.id]
    );
    await logAudit(req.user.id, 'PARENT_LINK_REJECTED', 'parent_student_links', linkId, { parent_id: result.rows[0].parent_id });
    res.json({ message: 'Parent access request rejected successfully', link: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
