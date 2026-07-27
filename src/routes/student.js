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
const SystemConfigService = require('../services/SystemConfigService');

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
const submissionUpload = multer({ storage: submissionStorage });

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

// Fetch comprehensive batch details, syllabus, materials, assignments & live classes
router.get('/batches/:batchId/details', async (req, res) => {
  const { batchId } = req.params;
  try {
    const batchRes = await db.query(`
      SELECT b.*, c.title as course_title, c.description as course_description, c.fees as course_fees,
             u.name as teacher_name, u.email as teacher_email, u.photo_url as teacher_photo,
             u.teacher_level, u.rating as teacher_rating
      FROM batches b
      LEFT JOIN courses c ON c.id = b.course_id
      LEFT JOIN users u ON u.id = b.teacher_id
      WHERE b.id = $1
    `, [batchId]);

    if (!batchRes.rows.length) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const batch = batchRes.rows[0];

    // Fetch study materials / notes
    const materialsRes = await db.query(
      `SELECT * FROM study_materials WHERE batch_id = $1 ORDER BY uploaded_at DESC`,
      [batchId]
    );

    // Fetch assignments
    const assignmentsRes = await db.query(
      `SELECT * FROM assignments WHERE batch_id = $1 ORDER BY created_at DESC`,
      [batchId]
    );

    // Fetch live classes schedule
    const liveClassesRes = await db.query(`
      SELECT lc.*, u.name as teacher_name
      FROM live_classes lc
      LEFT JOIN users u ON u.id = lc.teacher_id
      WHERE lc.batch_id = $1
      ORDER BY lc.class_date DESC, lc.class_time DESC
    `, [batchId]);

    res.json({
      batch,
      materials: materialsRes.rows,
      assignments: assignmentsRes.rows,
      liveClasses: liveClassesRes.rows
    });
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

// ── GET /api/student/payments ─────────────────────────────────
router.get('/payments', async (req, res) => {
  try {
    // Queries payments table with fallback reconciliation from batch_students
    let result;
    try {
      result = await db.query(`
        SELECT 
          COALESCE(p.id, bs.payment_id, 'pay_spx_' || SUBSTRING(MD5(bs.batch_id || bs.student_id), 1, 10)) as id,
          COALESCE(p.amount, c.fees, 0) as amount,
          COALESCE(c.fees, p.amount, 0) as original_fees,
          COALESCE(p.coupon_code, '') as coupon_code,
          COALESCE(p.discount_amount, 0) as discount_amount,
          COALESCE(p.status, 'completed') as status,
          COALESCE(p.created_at, NOW()) as created_at,
          c.title as course_title,
          b.batch_name,
          u.name as teacher_name
        FROM batch_students bs
        JOIN batches b ON b.id = bs.batch_id
        LEFT JOIN courses c ON c.id = b.course_id
        LEFT JOIN users u ON u.id = COALESCE(b.teacher_id, c.created_by)
        LEFT JOIN payments p ON p.student_id = bs.student_id AND p.batch_id = bs.batch_id
        WHERE bs.student_id = $1
        ORDER BY created_at DESC
      `, [req.user.id]);
    } catch (sqlErr) {
      console.warn('[Student Payments] Fallback to direct payments table:', sqlErr.message);
      result = await db.query(`
        SELECT p.*, COALESCE(c.fees, p.amount, 0) as original_fees, c.title as course_title, b.batch_name, u.name as teacher_name
        FROM payments p
        LEFT JOIN courses c ON c.id = p.course_id
        LEFT JOIN batches b ON b.id = p.batch_id
        LEFT JOIN users u ON u.id = p.teacher_id
        WHERE p.student_id = $1
        ORDER BY p.created_at DESC
      `, [req.user.id]);
    }

    res.json(result.rows || []);
  } catch (err) {
    console.error('[Student Payments Error]:', err);
    res.json([]);
  }
});

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

    // Check capacity & fetch batch/course info (supports active & upcoming batches)
    const batchRes = await db.query(`
      SELECT b.*, c.title as course_title, c.fees as course_fees, c.created_by as course_created_by
      FROM batches b
      LEFT JOIN courses c ON c.id = b.course_id
      WHERE b.id = $1 AND COALESCE(b.status, 'active') NOT IN ('cancelled', 'inactive')
    `, [batchId]);

    if (!batchRes.rows.length) return res.status(404).json({ error: 'Batch not found or inactive' });
    const batchObj = batchRes.rows[0];

    const capacity = parseInt(batchObj.capacity || 30);
    const seatsFilled = parseInt(batchObj.seats_filled || 0);

    if (seatsFilled >= capacity) {
      return res.status(400).json({ error: 'This batch is full' });
    }

    const originalFees = parseFloat(batchObj.course_fees || batchObj.fees || 0);
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

    const pId = paymentId || `pay_spx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const teacherId = batchObj.teacher_id || batchObj.course_created_by;

    // 1. Enroll in batch_students table
    await db.query(
      'INSERT INTO batch_students (batch_id, student_id, payment_id, status) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
      [batchId, req.user.id, pId, 'active']
    );
    await db.query('UPDATE batches SET seats_filled = seats_filled + 1 WHERE id = $1', [batchId]);

    // 2. Insert payment row into payments ledger WITH coupon and teacher_id!
    try {
      await db.query(`
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS teacher_id VARCHAR(100);
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS course_id VARCHAR(100);
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS batch_id VARCHAR(100);
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'upi';
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_payment_id VARCHAR(255);
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed';
      `);
    } catch (sErr) {}

    let paymentSaved = false;
    try {
      await db.query(`
        INSERT INTO payments (id, student_id, teacher_id, batch_id, course_id, amount, status, payment_method, gateway_payment_id, coupon_code, discount_amount)
        VALUES ($1, $2, $3, $4, $5, $6, 'captured', 'upi', $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, [pId, req.user.id, teacherId || null, batchId, batchObj.course_id || null, amountPaid, pId, couponCode ? couponCode.trim().toUpperCase() : null, discountAmount]);
      paymentSaved = true;
    } catch (pErr) {
      console.warn('[Payments Table Insert Primary Fallback]:', pErr.message);
      try {
        await db.query(`
          INSERT INTO payments (id, student_id, batch_id, amount, status)
          VALUES ($1, $2, $3, $4, 'captured')
          ON CONFLICT (id) DO NOTHING
        `, [pId, req.user.id, batchId, amountPaid]);
        paymentSaved = true;
      } catch (pErr2) {
        console.error('[Payments Table Insert Fallback Failed]:', pErr2.message);
      }
    }

    // 3. REFLECT IN TEACHER WALLET & LEDGER IMMEDIATELY!
    if (teacherId) {
      // Calculate dynamic payout share based on teacher level (50% to 90%)
      const teacherUser = await db.query('SELECT teacher_level FROM users WHERE id = $1', [teacherId]);
      const level = teacherUser.rows[0]?.teacher_level || 'Trainee Teacher';
      const levelKey = `payout_pct_${level.replace(/\s+/g, '_')}`;
      const payoutPct = parseFloat(await SystemConfigService.getSetting(levelKey, 50.0));
      const teacherShare = (amountPaid * payoutPct) / 100;

      await db.query(`
        INSERT INTO teacher_wallet (teacher_id, wallet_balance, total_earnings, pending_earnings)
        VALUES ($1, $2, $2, 0)
        ON CONFLICT (teacher_id) DO UPDATE 
        SET wallet_balance = COALESCE(teacher_wallet.wallet_balance, 0) + $2,
            total_earnings = COALESCE(teacher_wallet.total_earnings, 0) + $2,
            updated_at = NOW()
      `, [teacherId, teacherShare]);

      const ledgerId = `tx_course_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const validPaymentIdForLedger = paymentSaved ? pId : null;

      try {
        await db.query(`
          INSERT INTO teacher_wallet_ledger (id, teacher_id, amount, type, description, payment_id)
          VALUES ($1, $2, $3, 'course_share', $4, $5)
        `, [
          ledgerId,
          teacherId,
          teacherShare,
          `Course sale share (${payoutPct}%): ${batchObj.course_title || 'Course'} (${batchObj.batch_name || 'Batch'}) - Student: ${req.user.name}`,
          validPaymentIdForLedger
        ]);
      } catch (lErr) {
        console.warn('[Ledger Insert Fallback without payment_id]:', lErr.message);
        await db.query(`
          INSERT INTO teacher_wallet_ledger (id, teacher_id, amount, type, description)
          VALUES ($1, $2, $3, 'course_share', $4)
        `, [
          ledgerId,
          teacherId,
          teacherShare,
          `Course sale share (${payoutPct}%): ${batchObj.course_title || 'Course'} (${batchObj.batch_name || 'Batch'}) - Student: ${req.user.name}`
        ]);
      }
      console.log(`[Student Enroll] Credited ₹${teacherShare} (${payoutPct}%) to teacher ${teacherId} wallet for course ${batchObj.course_title}`);

      // Handle Student Referral Bonus if student was referred by a teacher/user
      const studentUser = await db.query('SELECT referred_by FROM users WHERE id = $1', [req.user.id]);
      if (studentUser.rows[0]?.referred_by) {
        const referrerId = studentUser.rows[0].referred_by;
        const refBonusPct = parseFloat(await SystemConfigService.getSetting('student_referral_bonus_pct', 5.0));
        const refBonus = (amountPaid * refBonusPct) / 100;

        if (refBonus > 0) {
          await db.query(`
            INSERT INTO teacher_wallet (teacher_id, wallet_balance, total_earnings)
            VALUES ($1, $2, $2)
            ON CONFLICT (teacher_id) DO UPDATE 
            SET wallet_balance = COALESCE(teacher_wallet.wallet_balance, 0) + $2,
                total_earnings = COALESCE(teacher_wallet.total_earnings, 0) + $2,
                updated_at = NOW()
          `, [referrerId, refBonus]);

          try {
            await db.query(`
              INSERT INTO teacher_wallet_ledger (id, teacher_id, amount, type, description, payment_id, referred_user_id)
              VALUES ($1, $2, $3, 'student_referral', $4, $5, $6)
            `, [
              `tx_sref_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              referrerId,
              refBonus,
              `Student Referral Bonus (${refBonusPct}%): ${req.user.name} enrolled in ${batchObj.course_title}`,
              validPaymentIdForLedger,
              req.user.id
            ]);
          } catch (rErr) {
            console.warn('[Referral Ledger Insert Fallback without payment_id]:', rErr.message);
            await db.query(`
              INSERT INTO teacher_wallet_ledger (id, teacher_id, amount, type, description, referred_user_id)
              VALUES ($1, $2, $3, 'student_referral', $4, $5)
            `, [
              `tx_sref_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              referrerId,
              refBonus,
              `Student Referral Bonus (${refBonusPct}%): ${req.user.name} enrolled in ${batchObj.course_title}`,
              req.user.id
            ]);
          }
        }
      }
    }

    await logAudit(req.user.id, 'BATCH_ENROLLED', 'batch', batchId, { paymentId: pId, couponCode, amountPaid });

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

    res.json({ message: 'Enrolled successfully in batch! Payment receipt sent to your email and credited to teacher wallet.' });
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
    
    const unreadCountRes = await db.query(`
      SELECT COUNT(*) FROM notifications
      WHERE (target_role = 'student' OR target_role = 'all' OR target_user = $1)
        AND is_active = true AND (is_read IS NOT TRUE)
    `, [req.user.id]);

    res.json({
      notifications: result.rows,
      unread_count: parseInt(unreadCountRes.rows[0].count) || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE notifications SET is_read = true WHERE id = $1', [id]);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notifications/read-all', async (req, res) => {
  try {
    await db.query(`
      UPDATE notifications SET is_read = true
      WHERE (target_role = 'student' OR target_role = 'all' OR target_user = $1)
        AND is_active = true
    `, [req.user.id]);
    res.json({ message: 'All notifications marked as read' });
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
