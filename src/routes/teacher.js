const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authenticateToken, requireTeacher } = require('../middleware/auth');
const { sanitizeUser, generateUID } = require('../utils/security');
const { logAudit } = require('../services/AuditService');
const { updateTeacherLevel } = require('../services/teacherLevel.service');
const configService = require('../services/SystemConfigService');


// File upload for SOP and documents
const makeStorage = (subdir) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, `../../public/uploads/${subdir}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user.id}_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const sopUpload = multer({ storage: makeStorage('sop'), limits: { fileSize: 200 * 1024 * 1024 } });
const docUpload = multer({ storage: makeStorage('documents'), limits: { fileSize: 20 * 1024 * 1024 } });
const assignUpload = multer({ storage: makeStorage('assignments'), limits: { fileSize: 50 * 1024 * 1024 } });
const notesUpload = multer({ storage: makeStorage('notes'), limits: { fileSize: 50 * 1024 * 1024 } });
const plannerUpload = multer({ storage: makeStorage('planners'), limits: { fileSize: 20 * 1024 * 1024 } });

const batchStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subdir = file.fieldname === 'demo_video' ? 'demo_videos' : 'planners';
    const dir = path.join(__dirname, `../../public/uploads/${subdir}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user.id}_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const batchUpload = multer({ storage: batchStorage, limits: { fileSize: 250 * 1024 * 1024 } });


// All teacher routes require authentication
router.use(authenticateToken);

// ── Teacher Dashboard Analytics ───────────────────────────────
router.get('/analytics', async (req, res) => {
  const teacherId = req.user.id;
  try {
    const [batches, students, earnings, classes, attendance, level] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM batches WHERE teacher_id = $1 AND status = $2', [teacherId, 'active']),
      db.query('SELECT COALESCE(SUM(seats_filled),0) as total FROM batches WHERE teacher_id = $1', [teacherId]),
      db.query('SELECT * FROM teacher_wallet WHERE teacher_id = $1', [teacherId]),
      db.query("SELECT COUNT(*) as count FROM live_classes WHERE teacher_id = $1 AND status = 'scheduled'", [teacherId]),
      db.query(`
        SELECT COUNT(a.id) as total, 
               SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as present
        FROM attendance a
        JOIN batches b ON b.id = a.batch_id
        WHERE b.teacher_id = $1
      `, [teacherId]),
      db.query('SELECT teacher_level, rating FROM users WHERE id = $1', [teacherId]),
    ]);

    const attTotal = parseInt(attendance.rows[0]?.total) || 1;
    const attPresent = parseInt(attendance.rows[0]?.present) || 0;

    res.json({
      activeBatches: parseInt(batches.rows[0]?.count) || 0,
      totalStudents: parseInt(students.rows[0]?.total) || 0,
      wallet: earnings.rows[0] || { total_earnings: 0, paid_earnings: 0, pending_earnings: 0, wallet_balance: 0 },
      upcomingClasses: parseInt(classes.rows[0]?.count) || 0,
      attendanceRate: attTotal > 0 ? parseFloat(((attPresent / attTotal) * 100).toFixed(1)) : 0,
      level: level.rows[0]?.teacher_level || null,
      rating: parseFloat(level.rows[0]?.rating || 5.0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SOP Management ────────────────────────────────────────────
router.get('/sop', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM teacher_sop WHERE teacher_id = $1', [req.user.id]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload individual SOP video
const sopFields = [
  { name: 'camera_sop', col: 'camera_sop_url' },
  { name: 'lighting_sop', col: 'lighting_sop_url' },
  { name: 'audio_sop', col: 'audio_sop_url' },
  { name: 'internet_proof', col: 'internet_proof_url' },
  { name: 'demo_teaching', col: 'demo_teaching_url' },
];

sopFields.forEach(({ name, col }) => {
  router.post(`/sop/upload/${name}`, sopUpload.single(name), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const fileUrl = `/uploads/sop/${req.file.filename}`;
      await db.query(`UPDATE teacher_sop SET ${col} = $1, updated_at = NOW() WHERE teacher_id = $2`, [fileUrl, req.user.id]);
      res.json({ message: `${name} uploaded`, fileUrl });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post(`/sop/link/${name}`, async (req, res) => {
    const { link } = req.body;
    try {
      if (!link || !link.trim()) return res.status(400).json({ error: 'Link is required' });
      await db.query(`UPDATE teacher_sop SET ${col} = $1, updated_at = NOW() WHERE teacher_id = $2`, [link.trim(), req.user.id]);
      res.json({ message: `${name} link saved`, fileUrl: link.trim() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

// Update availability calendar in SOP
router.post('/sop/availability', async (req, res) => {
  const { availability } = req.body;
  try {
    let slots = availability;
    if (typeof slots === 'string') {
      try {
        slots = JSON.parse(slots);
      } catch (e) {
        // legacy plain text string
      }
    }

    if (typeof slots === 'string' && slots.trim()) {
      await db.query(
        'UPDATE teacher_sop SET availability = $1, updated_at = NOW() WHERE teacher_id = $2',
        [slots.trim(), req.user.id]
      );
      return res.json({ message: 'Availability calendar updated successfully', availability: slots.trim() });
    }

    if (!Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ error: 'Availability must be a list of one or more time slots' });
    }

    for (const slot of slots) {
      if (!slot.days || !Array.isArray(slot.days) || slot.days.length === 0) {
        return res.status(400).json({ error: 'Each slot must specify at least one day' });
      }
      if (!slot.startTime || !slot.endTime) {
        return res.status(400).json({ error: 'Each slot must specify a start and end time' });
      }
    }

    const savedStr = JSON.stringify(slots);
    await db.query(
      'UPDATE teacher_sop SET availability = $1, updated_at = NOW() WHERE teacher_id = $2',
      [savedStr, req.user.id]
    );
    res.json({ message: 'Availability calendar updated successfully', availability: slots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit SOP for review
router.post('/sop/submit', async (req, res) => {
  const { teacher_checklist } = req.body;
  try {
    const sop = await db.query('SELECT * FROM teacher_sop WHERE teacher_id = $1', [req.user.id]);
    if (!sop.rows[0]) return res.status(404).json({ error: 'SOP record not found' });

    const { camera_sop_url, lighting_sop_url, audio_sop_url, internet_proof_url, demo_teaching_url, availability } = sop.rows[0];
    
    // 1. Validate Technical SOP uploads/links
    if (!camera_sop_url || !lighting_sop_url || !audio_sop_url || !internet_proof_url || !demo_teaching_url) {
      return res.status(400).json({ error: 'All 5 technical SOP proofs (Camera, Lighting, Audio, Internet speed, Demo lecture) must be submitted before final submission.' });
    }

    // 2. Validate Availability Calendar
    if (!availability || !availability.trim()) {
      return res.status(400).json({ error: 'Your weekly teaching availability calendar description must be submitted before final submission.' });
    }

    // 3. Validate KYC Document & Profile Evidence Uploads
    const docs = await db.query('SELECT doc_type FROM teacher_documents WHERE teacher_id = $1', [req.user.id]);
    const uploadedTypes = docs.rows.map(d => d.doc_type);
    
    // KYC
    const requiredKyc = ['aadhaar', 'pan', 'resume', 'qualification'];
    const missingKyc = requiredKyc.filter(type => !uploadedTypes.includes(type));
    if (missingKyc.length > 0) {
      return res.status(400).json({ error: `Missing required KYC documents: ${missingKyc.map(m => m === 'qualification' ? 'Degree Certificate' : m.toUpperCase()).join(', ')}. All documents are mandatory.` });
    }

    // Profile Evidence
    const requiredProfileProofs = ['expertise_proof', 'language_proof', 'experience_proof'];
    const missingProfileProofs = requiredProfileProofs.filter(type => !uploadedTypes.includes(type));
    if (missingProfileProofs.length > 0) {
      const labels = {
        expertise_proof: 'Subject Expertise Proof',
        language_proof: 'Language Preference Proof',
        experience_proof: 'Experience Letter'
      };
      return res.status(400).json({ error: `Missing profile verification documents: ${missingProfileProofs.map(m => labels[m]).join(', ')}.` });
    }

    // 4. Validate Profile fields
    const userResult = await db.query('SELECT subject_expertise, languages, experience_years FROM users WHERE id = $1', [req.user.id]);
    const u = userResult.rows[0];
    if (!u.subject_expertise || !u.subject_expertise.trim()) {
      return res.status(400).json({ error: 'Please update your Subject Expertise under the Profile & Experience section.' });
    }
    if (!u.languages || !u.languages.trim()) {
      return res.status(400).json({ error: 'Please specify your Teaching Language Preference.' });
    }
    if (u.experience_years === undefined || u.experience_years === null) {
      return res.status(400).json({ error: 'Please enter your Previous Teaching Experience years.' });
    }

    await db.query(
      "UPDATE teacher_sop SET status = 'sop_pending', teacher_checklist = $2, submitted_at = NOW() WHERE teacher_id = $1",
      [req.user.id, JSON.stringify(teacher_checklist || {})]
    );
    await db.query("UPDATE users SET approval_status = 'sop_pending' WHERE id = $1", [req.user.id]);
    await logAudit(req.user.id, 'SOP_SUBMITTED', 'teacher', req.user.id, {});
    res.json({ message: 'SOP submitted successfully for admin review', status: 'sop_pending' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sign agreement after SOP is approved
router.post('/sop/sign-agreement', async (req, res) => {
  const { digital_signature } = req.body;
  try {
    if (!digital_signature || !digital_signature.trim()) {
      return res.status(400).json({ error: 'Digital signature is required (type your full name)' });
    }

    const sop = await db.query('SELECT status FROM teacher_sop WHERE teacher_id = $1', [req.user.id]);
    if (!sop.rows.length) return res.status(404).json({ error: 'SOP record not found' });
    if (sop.rows[0].status !== 'approved') {
      return res.status(400).json({ error: 'SOP must be approved by admin before signing the agreement' });
    }

    await db.query(
      `UPDATE teacher_sop 
       SET agreement_signed = true, 
           agreement_signed_at = NOW(), 
           digital_signature = $2 
       WHERE teacher_id = $1`,
      [req.user.id, digital_signature.trim()]
    );

    await db.query("UPDATE users SET approval_status = 'approved' WHERE id = $1", [req.user.id]);
    await logAudit(req.user.id, 'AGREEMENT_SIGNED', 'teacher', req.user.id, { signature: digital_signature });

    // Auto-issue SOP Verification & Compliance certificate
    const certId = `cert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await db.query(`
      INSERT INTO teacher_certificates (id, teacher_id, certificate_type, title, description, metadata)
      VALUES ($1, $2, 'sop_completed', $3, $4, $5)
      ON CONFLICT DO NOTHING
    `, [
      certId, 
      req.user.id, 
      'SOP Verification & Teaching Compliance Certificate', 
      'This certificate is awarded to acknowledge that the teacher has successfully completed the Speaxa Standard Operating Procedures (SOP) verification, technical compliance checks, and teaching standards certification.', 
      JSON.stringify({ signature: digital_signature })
    ]);

    res.json({ message: 'Agreement signed successfully. You can now start teaching!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload teacher documents
router.post('/documents/upload', docUpload.single('document'), async (req, res) => {
  const { doc_type } = req.body;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!doc_type) return res.status(400).json({ error: 'doc_type is required' });
    const fileUrl = `/uploads/documents/${req.file.filename}`;
    const id = generateUID('doc');
    await db.query(
      'INSERT INTO teacher_documents (id, teacher_id, doc_type, file_url, original_name) VALUES ($1,$2,$3,$4,$5)',
      [id, req.user.id, doc_type, fileUrl, req.file.originalname]
    );
    res.json({ message: 'Document uploaded', fileUrl, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/documents/link', async (req, res) => {
  const { doc_type, link } = req.body;
  try {
    if (!doc_type) return res.status(400).json({ error: 'doc_type is required' });
    if (!link || !link.trim()) return res.status(400).json({ error: 'link is required' });

    const id = generateUID('doc');
    // Delete any existing document of the same type for this teacher to prevent duplicates
    await db.query('DELETE FROM teacher_documents WHERE teacher_id = $1 AND doc_type = $2', [req.user.id, doc_type]);
    
    await db.query(
      'INSERT INTO teacher_documents (id, teacher_id, doc_type, file_url, original_name) VALUES ($1,$2,$3,$4,$5)',
      [id, req.user.id, doc_type, link.trim(), 'External Link']
    );
    res.json({ message: 'Document link saved', fileUrl: link.trim(), id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/documents', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM teacher_documents WHERE teacher_id = $1 ORDER BY uploaded_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Batch Management ──────────────────────────────────────────
router.get('/batches', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT b.*, c.title as course_title, c.fees as course_fees,
             COUNT(bs.student_id) as enrolled_count
      FROM batches b
      LEFT JOIN courses c ON c.id = b.course_id
      LEFT JOIN batch_students bs ON bs.batch_id = b.id AND bs.status = 'active'
      WHERE b.teacher_id = $1
      GROUP BY b.id, c.title, c.fees
      ORDER BY b.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/batches', batchUpload.fields([{ name: 'planner', maxCount: 1 }, { name: 'demo_video', maxCount: 1 }]), async (req, res) => {
  const { course_id, batch_name, subject, start_date, end_date, start_time, end_time, days_of_week, capacity, planner_desc, teaching_method, batch_instructions, demo_video_url } = req.body;
  try {
    // Check SOP approval
    const sop = await db.query("SELECT status, agreement_signed FROM teacher_sop WHERE teacher_id = $1", [req.user.id]);
    if (!sop.rows.length || sop.rows[0].status !== 'approved' || !sop.rows[0].agreement_signed) {
      return res.status(403).json({ error: 'SOP and Agreement must be approved and signed before creating batches' });
    }

    const plannerFile = req.files && req.files['planner'] ? req.files['planner'][0] : null;
    const demoVideoFile = req.files && req.files['demo_video'] ? req.files['demo_video'][0] : null;

    // Validate fields
    if (!course_id || !course_id.trim()) return res.status(400).json({ error: 'Course selection is required' });
    if (!batch_name || !batch_name.trim()) return res.status(400).json({ error: 'Batch Name is required' });
    if (!subject || !subject.trim()) return res.status(400).json({ error: 'Subject is required' });
    if (!start_date) return res.status(400).json({ error: 'Start Date is required' });
    if (!end_date) return res.status(400).json({ error: 'End Date is required' });
    if (!start_time) return res.status(400).json({ error: 'Start Time is required' });
    if (!end_time) return res.status(400).json({ error: 'End Time is required' });
    if (!capacity) return res.status(400).json({ error: 'Max Capacity is required' });
    if (!planner_desc || !planner_desc.trim()) return res.status(400).json({ error: 'Learning Schedule / Syllabus Text is required' });
    if (!teaching_method || !teaching_method.trim()) return res.status(400).json({ error: 'Way of Teaching / Way of teaching / Teaching Methodology is required' });
    if (!batch_instructions || !batch_instructions.trim()) return res.status(400).json({ error: 'Important Batch Instructions / Prerequisites are required' });
    if (!plannerFile) return res.status(400).json({ error: 'Chapter-wise Course Planner file upload is required' });

    let final_demo_video_url = '';
    if (demoVideoFile) {
      final_demo_video_url = `/uploads/demo_videos/${demoVideoFile.filename}`;
    } else if (demo_video_url && demo_video_url.trim()) {
      final_demo_video_url = demo_video_url.trim();
    } else {
      return res.status(400).json({ error: 'Batch Demo Video file or Video Link URL is required' });
    }

    // Validate capacity
    const maxCapacity = await configService.getSetting('max_batch_capacity', 30);
    const cap = parseInt(capacity) || maxCapacity;
    if (cap > maxCapacity) return res.status(400).json({ error: `Maximum batch capacity is ${maxCapacity} students` });

    // Robust parsing of days_of_week
    let days = days_of_week;
    if (typeof days === 'string') {
      try {
        days = JSON.parse(days);
      } catch (e) {
        days = days.split(',').map(d => d.trim()).filter(Boolean);
      }
    }
    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ error: 'At least one day of the week must be selected' });
    }

    // Check for overlapping batches (same teacher, overlapping time on same days)
    if (start_time && end_time && days.length > 0 && start_date && end_date) {
      const overlap = await db.query(`
        SELECT id FROM batches 
        WHERE teacher_id = $1 AND status = 'active'
          AND start_date <= $3 AND end_date >= $2
          AND start_time < $5 AND end_time > $4
          AND days_of_week && $6::text[]
      `, [req.user.id, start_date, end_date, start_time, end_time, days]);

      if (overlap.rows.length > 0) {
        return res.status(400).json({ error: 'You have an overlapping batch at this time. Please choose a different schedule.' });
      }
    }

    const id = generateUID('batch');
    const channel = `speaxa_${id}`.replace(/[^a-zA-Z0-9_]/g, '_');

    // File info
    const planner_url = `/uploads/planners/${plannerFile.filename}`;
    const planner_name = plannerFile.originalname;

    await db.query(`
      INSERT INTO batches (id, course_id, teacher_id, batch_name, subject, start_date, end_date,
        start_time, end_time, days_of_week, capacity, status, agora_channel, planner_url, planner_name, planner_desc, teaching_method, batch_instructions, demo_video_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',$12,$13,$14,$15,$16,$17,$18)
    `, [id, course_id, req.user.id, batch_name, subject, start_date, end_date,
        start_time, end_time, days, cap, channel, planner_url, planner_name, planner_desc, teaching_method, batch_instructions, final_demo_video_url]);

    await logAudit(req.user.id, 'BATCH_CREATED', 'batch', id, { batch_name, course_id, has_planner: true, has_demo_video: true });
    res.status(201).json({ message: 'Batch created successfully', batchId: id, planner_url, demo_video_url: final_demo_video_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload/Update batch planner separately
router.post('/batches/:id/planner', plannerUpload.single('planner'), async (req, res) => {
  const { id } = req.params;
  const { planner_desc } = req.body;
  try {
    // Check if batch belongs to teacher
    const batch = await db.query("SELECT id FROM batches WHERE id = $1 AND teacher_id = $2", [id, req.user.id]);
    if (!batch.rows.length) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    let query = 'UPDATE batches SET updated_at = NOW()';
    const params = [];
    let pIdx = 1;

    if (req.file) {
      query += `, planner_url = $${pIdx++}, planner_name = $${pIdx++}`;
      params.push(`/uploads/planners/${req.file.filename}`, req.file.originalname);
    }

    if (planner_desc !== undefined) {
      query += `, planner_desc = $${pIdx++}`;
      params.push(planner_desc);
    }

    query += ` WHERE id = $${pIdx}`;
    params.push(id);

    if (params.length === 1) {
      return res.status(400).json({ error: 'Please select a file to upload or write description content' });
    }

    await db.query(query, params);

    await logAudit(req.user.id, 'BATCH_PLANNER_UPDATED', 'batch', id, { has_file: !!req.file, has_desc: !!planner_desc });
    res.json({ 
      message: 'Planner updated successfully', 
      planner_url: req.file ? `/uploads/planners/${req.file.filename}` : undefined,
      planner_name: req.file ? req.file.originalname : undefined,
      planner_desc
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/batches/:id/students', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      SELECT u.id, u.name, u.email, u.photo_url, u.student_code, u.grade, u.board,
             bs.enrolled_at, bs.status as enrollment_status
      FROM batch_students bs
      JOIN users u ON u.id = bs.student_id
      WHERE bs.batch_id = $1
      ORDER BY bs.enrolled_at
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Live Classes ──────────────────────────────────────────────
router.get('/live-classes', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT lc.*, b.batch_name
      FROM live_classes lc
      LEFT JOIN batches b ON b.id = lc.batch_id
      WHERE lc.teacher_id = $1
      ORDER BY lc.created_at DESC
    `, [req.user.id]);
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

    // SOP check
    const sop = await db.query("SELECT status, agreement_signed FROM teacher_sop WHERE teacher_id = $1", [req.user.id]);
    if (!sop.rows.length || sop.rows[0].status !== 'approved' || !sop.rows[0].agreement_signed) {
      return res.status(403).json({ error: 'SOP and Agreement must be approved and signed before scheduling live classes' });
    }

    // Check for simultaneous classes
    const active = await db.query("SELECT id FROM live_classes WHERE teacher_id = $1 AND status = 'live'", [req.user.id]);
    if (active.rows.length > 0) {
      return res.status(400).json({ error: 'You already have a live class in progress' });
    }

    const batch = await db.query('SELECT * FROM batches WHERE id = $1 AND teacher_id = $2', [batchId, req.user.id]);
    if (!batch.rows.length) return res.status(404).json({ error: 'Batch not found' });

    const id = generateUID('live');
    const channel = batch.rows[0].agora_channel || `speaxa_${batchId}`;

    await db.query(`
      INSERT INTO live_classes (id, batch_id, teacher_id, title, class_date, class_time, agora_channel, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'scheduled')
    `, [id, batchId, req.user.id, title, classDate, classTime, channel]);

    await logAudit(req.user.id, 'CLASS_SCHEDULED', 'live_class', id, { title, batchId });

    // Dispatch in-app notifications and email alerts to enrolled students asynchronously
    const notificationService = require('../services/notification.service');
    notificationService.notifyClassScheduled({
      classId: id,
      batchId,
      title,
      classDate,
      classTime,
      teacherId: req.user.id
    }).catch(err => console.error('[NotificationService] notifyClassScheduled async failed:', err));

    res.status(201).json({ message: 'Class scheduled', classId: id, channel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Student Observations ──────────────────────────────────────
router.get('/observations', async (req, res) => {
  const { batchId, studentId } = req.query;
  try {
    let query = 'SELECT so.*, u.name as student_name FROM student_observations so JOIN users u ON u.id = so.student_id WHERE so.teacher_id = $1';
    const params = [req.user.id];
    let idx = 2;
    if (batchId) { query += ` AND so.batch_id = $${idx++}`; params.push(batchId); }
    if (studentId) { query += ` AND so.student_id = $${idx++}`; params.push(studentId); }
    query += ' ORDER BY so.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/observations', async (req, res) => {
  const { studentId, batchId, classId, curiosity, understanding, consistency, communication, observation_score, participation, discipline, notes } = req.body;
  try {
    if (!studentId || !batchId) return res.status(400).json({ error: 'studentId and batchId required' });
    const id = generateUID('obs');
    await db.query(`
      INSERT INTO student_observations 
        (id, student_id, teacher_id, batch_id, class_id, curiosity, understanding, consistency,
         communication, observation_score, participation, discipline, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    `, [id, studentId, req.user.id, batchId, classId || null,
        curiosity || 0, understanding || 0, consistency || 0,
        communication || 0, observation_score || 0, participation || 0, discipline || 0, notes || null]);
    res.status(201).json({ message: 'Observation saved', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Assignments ───────────────────────────────────────────────
router.get('/assignments', async (req, res) => {
  const { batchId } = req.query;
  try {
    let query = `
      SELECT a.*, COUNT(s.id) as submission_count
      FROM assignments a
      LEFT JOIN assignment_submissions s ON s.assignment_id = a.id
      WHERE a.teacher_id = $1
    `;
    const params = [req.user.id];
    if (batchId) { query += ' AND a.batch_id = $2'; params.push(batchId); }
    query += ' GROUP BY a.id ORDER BY a.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/assignments', assignUpload.single('file'), async (req, res) => {
  const { batchId, title, description, due_date, max_marks } = req.body;
  try {
    if (!batchId) return res.status(400).json({ error: 'Batch is required' });
    if (!title || !title.trim()) return res.status(400).json({ error: 'Assignment Title is required' });
    if (!description || !description.trim()) return res.status(400).json({ error: 'Description is required' });
    if (!due_date) return res.status(400).json({ error: 'Due Date is required' });
    if (!max_marks) return res.status(400).json({ error: 'Max Marks is required' });
    if (!req.file) return res.status(400).json({ error: 'File attachment upload is required' });

    const id = generateUID('asgn');
    const fileUrl = `/uploads/assignments/${req.file.filename}`;
    await db.query(`
      INSERT INTO assignments (id, batch_id, teacher_id, title, description, file_url, due_date, max_marks)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [id, batchId, req.user.id, title, description, fileUrl, due_date, parseInt(max_marks) || 100]);
    await logAudit(req.user.id, 'ASSIGNMENT_CREATED', 'assignment', id, { title, batchId });
    res.status(201).json({ message: 'Assignment created', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/assignments/:id/submissions', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*, u.name as student_name, u.photo_url
      FROM assignment_submissions s
      JOIN users u ON u.id = s.student_id
      WHERE s.assignment_id = $1
      ORDER BY s.submitted_at DESC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/assignments/submissions/:submissionId/grade', async (req, res) => {
  const { submissionId } = req.params;
  const { marks_obtained, feedback } = req.body;
  try {
    await db.query(`
      UPDATE assignment_submissions 
      SET marks_obtained = $1, feedback = $2, graded_by = $3, graded_at = NOW(), status = 'graded'
      WHERE id = $4
    `, [marks_obtained, feedback, req.user.id, submissionId]);
    await logAudit(req.user.id, 'ASSIGNMENT_GRADED', 'assignment_submission', submissionId, { marks_obtained });
    res.json({ message: 'Assignment graded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Attendance ────────────────────────────────────────────────
router.get('/attendance', async (req, res) => {
  const { batchId, classId } = req.query;
  try {
    let query = `
      SELECT a.*, u.name as student_name, u.photo_url
      FROM attendance a
      JOIN users u ON u.id = a.student_id
      JOIN batches b ON b.id = a.batch_id
      WHERE b.teacher_id = $1
    `;
    const params = [req.user.id];
    let idx = 2;
    if (batchId) { query += ` AND a.batch_id = $${idx++}`; params.push(batchId); }
    if (classId) { query += ` AND a.class_id = $${idx++}`; params.push(classId); }
    query += ' ORDER BY a.attendance_date DESC, u.name ASC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Earnings & Payouts ────────────────────────────────────────
router.get('/earnings', async (req, res) => {
  try {
    const wallet = await db.query('SELECT * FROM teacher_wallet WHERE teacher_id = $1', [req.user.id]);
    const history = await db.query(`
      SELECT tp.*, 'payout' as type FROM teacher_payouts tp
      WHERE tp.teacher_id = $1
      ORDER BY tp.requested_at DESC
    `, [req.user.id]);
    res.json({
      wallet: wallet.rows[0] || { total_earnings: 0, paid_earnings: 0, pending_earnings: 0, wallet_balance: 0 },
      history: history.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/payouts/request', async (req, res) => {
  const { amount, bank_account, upi_id } = req.body;
  try {
    const wallet = await db.query('SELECT * FROM teacher_wallet WHERE teacher_id = $1', [req.user.id]);
    const balance = parseFloat(wallet.rows[0]?.wallet_balance || 0);
    const requestAmount = parseFloat(amount);

    if (requestAmount <= 0) return res.status(400).json({ error: 'Invalid payout amount' });
    if (requestAmount > balance) return res.status(400).json({ error: `Insufficient wallet balance. Available: ₹${balance}` });

    const id = generateUID('payout');
    await db.query(`
      INSERT INTO teacher_payouts (id, teacher_id, amount, bank_account, upi_id, status)
      VALUES ($1,$2,$3,$4,$5,'requested')
    `, [id, req.user.id, requestAmount, bank_account || null, upi_id || null]);

    await logAudit(req.user.id, 'PAYOUT_REQUESTED', 'payout', id, { amount: requestAmount });
    res.status(201).json({ message: 'Payout request submitted', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Notes / Study Materials ───────────────────────────────────
router.get('/notes', async (req, res) => {
  const { batchId } = req.query;
  try {
    let query = 'SELECT * FROM study_materials WHERE teacher_id = $1';
    const params = [req.user.id];
    if (batchId) { query += ' AND batch_id = $2'; params.push(batchId); }
    query += ' ORDER BY uploaded_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notes', notesUpload.single('file'), async (req, res) => {
  const { title, description, courseId, batchId } = req.body;
  try {
    if (!title || !title.trim()) return res.status(400).json({ error: 'Material Title is required' });
    if (!description || !description.trim()) return res.status(400).json({ error: 'Description is required' });

    const fileUrl = req.file ? `/uploads/notes/${req.file.filename}` : req.body.file_url;
    if (!fileUrl || !fileUrl.trim()) return res.status(400).json({ error: 'File upload or External Web URL is required' });

    const id = generateUID('note');
    const fileType = req.file ? path.extname(req.file.originalname).substr(1) : 'link';
    await db.query(`
      INSERT INTO study_materials (id, title, description, course_id, batch_id, teacher_id, file_url, file_type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [id, title, description, courseId || null, batchId || null, req.user.id, fileUrl, fileType]);
    res.status(201).json({ message: 'Study material uploaded', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Level Info ────────────────────────────────────────────────
router.get('/level', async (req, res) => {
  try {
    const user = await db.query('SELECT teacher_level, rating, total_ratings FROM users WHERE id = $1', [req.user.id]);
    const history = await db.query('SELECT * FROM teacher_levels WHERE teacher_id = $1 ORDER BY changed_at DESC LIMIT 10', [req.user.id]);
    const { calculateTeacherScore } = require('../services/teacherLevel.service');
    const scoreData = await calculateTeacherScore(req.user.id);
    res.json({ level: user.rows[0]?.teacher_level, rating: user.rows[0]?.rating, ...scoreData, history: history.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Notifications ─────────────────────────────────────────────
router.get('/notifications', async (req, res) => {
  const teacherId = req.user.id;
  try {
    // 1. Check for active batches starting tomorrow or earlier with 0 students
    const emptyBatches = await db.query(`
      SELECT b.*, c.title AS course_title
      FROM batches b
      JOIN courses c ON c.id = b.course_id
      WHERE b.teacher_id = $1
        AND b.status = 'active'
        AND b.seats_filled = 0
        AND b.start_date <= CURRENT_DATE + INTERVAL '1 day'
    `, [teacherId]);

    for (const batch of emptyBatches.rows) {
      const notifId = `no_students_warning_${batch.id}`;
      // check if exists
      const existCheck = await db.query('SELECT 1 FROM notifications WHERE id = $1', [notifId]);
      if (existCheck.rows.length === 0) {
        await db.query(`
          INSERT INTO notifications (id, title, message, target_role, target_user, type, is_active)
          VALUES ($1, $2, $3, 'teacher', $4, 'warning', true)
        `, [
          notifId,
          'Batch Start Alert: No Students Joined',
          `No students have joined your batch "${batch.batch_name}" yet, which is starting soon (Start Date: ${new Date(batch.start_date).toLocaleDateString('en-IN')}). Please consider changing the start date or adjusting the schedule.`,
          teacherId
        ]);
      }
    }

    // 2. Fetch notifications for this teacher
    const result = await db.query(`
      SELECT * FROM notifications
      WHERE (target_role = 'teacher' OR target_role = 'all' OR target_user = $1)
        AND is_active = true
      ORDER BY created_at DESC LIMIT 50
    `, [teacherId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Course Management (Teacher) ──────────────────────────────
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
    const result = await db.query(
      'SELECT * FROM courses WHERE created_by = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/courses', async (req, res) => {
  const { title, subject, description, duration_weeks, grade, board, thumbnail_url, custom_tag,
          learning_duration, objective, learning_outcome, language_instruction, daily_class_duration, assessment_days } = req.body;
  try {
    if (!title || !title.trim()) return res.status(400).json({ error: 'Course Title is required' });
    if (!subject || !subject.trim()) return res.status(400).json({ error: 'Subject is required' });
    if (!description || !description.trim()) return res.status(400).json({ error: 'Description is required' });
    if (!duration_weeks) return res.status(400).json({ error: 'Learning Duration Weeks is required' });
    if (!grade || !grade.trim()) return res.status(400).json({ error: 'Grade is required' });
    if (!board || !board.trim()) return res.status(400).json({ error: 'Board is required' });
    if (!thumbnail_url || !thumbnail_url.trim()) return res.status(400).json({ error: 'Course Thumbnail / Banner is required' });
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, 'draft', $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *
    `, [id, title, subject, description, parseInt(duration_weeks) || 12, grade, board, thumbnail_url, req.user.id, custom_tag,
        learning_duration, objective, learning_outcome, language_instruction, daily_class_duration, assessment_days]);
    
    await logAudit(req.user.id, 'TEACHER_COURSE_CREATED', 'course', id, { title });
    res.status(201).json({ message: 'Course draft created successfully', course: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/courses/:id', async (req, res) => {
  const { id } = req.params;
  const { title, subject, description, duration_weeks, grade, board, thumbnail_url, custom_tag,
          learning_duration, objective, learning_outcome, language_instruction, daily_class_duration, assessment_days } = req.body;
  try {
    const courseCheck = await db.query('SELECT status, created_by FROM courses WHERE id = $1', [id]);
    if (!courseCheck.rows.length) return res.status(404).json({ error: 'Course not found' });
    if (courseCheck.rows[0].created_by !== req.user.id) return res.status(403).json({ error: 'Unauthorized to edit this course' });
    if (!['draft', 'rejected', 'active', 'pending_approval'].includes(courseCheck.rows[0].status)) {
      return res.status(400).json({ error: 'Only draft, rejected, active, or pending approval courses can be edited' });
    }

    if (!title || !title.trim()) return res.status(400).json({ error: 'Course Title is required' });
    if (!subject || !subject.trim()) return res.status(400).json({ error: 'Subject is required' });
    if (!description || !description.trim()) return res.status(400).json({ error: 'Description is required' });
    if (!duration_weeks) return res.status(400).json({ error: 'Learning Duration Weeks is required' });
    if (!grade || !grade.trim()) return res.status(400).json({ error: 'Grade is required' });
    if (!board || !board.trim()) return res.status(400).json({ error: 'Board is required' });
    if (!thumbnail_url || !thumbnail_url.trim()) return res.status(400).json({ error: 'Course Thumbnail / Banner is required' });
    if (!custom_tag || !custom_tag.trim()) return res.status(400).json({ error: 'Custom Badge / Tag Line is required' });
    if (!learning_duration || !learning_duration.trim()) return res.status(400).json({ error: 'Learning Duration is required' });
    if (!objective || !objective.trim()) return res.status(400).json({ error: 'Objective is required' });
    if (!learning_outcome || !learning_outcome.trim()) return res.status(400).json({ error: 'Learning Outcome is required' });
    if (!language_instruction || !language_instruction.trim()) return res.status(400).json({ error: 'Language of Instruction is required' });
    if (!daily_class_duration || !daily_class_duration.trim()) return res.status(400).json({ error: 'Daily Class Duration is required' });
    if (!assessment_days || !assessment_days.trim()) return res.status(400).json({ error: 'Assessment Days is required' });

    const result = await db.query(`
      UPDATE courses SET 
        title = $1, 
        subject = $2, 
        description = $3,
        duration_weeks = $4, 
        grade = $5, 
        board = $6,
        thumbnail_url = $7, 
        custom_tag = $8,
        learning_duration = $9,
        objective = $10,
        learning_outcome = $11,
        language_instruction = $12,
        daily_class_duration = $13,
        assessment_days = $14,
        status = 'draft',
        updated_at = NOW()
      WHERE id = $15 RETURNING *
    `, [title, subject, description, duration_weeks ? parseInt(duration_weeks) : null, grade, board, thumbnail_url, custom_tag,
        learning_duration, objective, learning_outcome, language_instruction, daily_class_duration, assessment_days, id]);
    
    await logAudit(req.user.id, 'TEACHER_COURSE_UPDATED', 'course', id, {});
    res.json({ message: 'Course updated and reset to draft', course: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/courses/:id/request-approval', async (req, res) => {
  const { id } = req.params;
  try {
    const courseCheck = await db.query('SELECT status, created_by, title FROM courses WHERE id = $1', [id]);
    if (!courseCheck.rows.length) return res.status(404).json({ error: 'Course not found' });
    if (courseCheck.rows[0].created_by !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });
    if (!['draft', 'rejected'].includes(courseCheck.rows[0].status)) {
      return res.status(400).json({ error: 'Only draft or rejected courses can be submitted for approval' });
    }

    const result = await db.query(
      "UPDATE courses SET status = 'pending_approval', updated_at = NOW() WHERE id = $1 RETURNING *",
      [id]
    );

    const notifId = `course_approval_req_${id}`;
    await db.query(`
      INSERT INTO notifications (id, title, message, target_role, type, is_active)
      VALUES ($1, $2, $3, 'admin', 'warning', true)
      ON CONFLICT (id) DO UPDATE SET is_active = true, is_read = false, created_at = NOW()
    `, [
      notifId,
      'Course Approval Requested',
      `Teacher "${req.user.name}" has requested approval for course "${courseCheck.rows[0].title}".`
    ]);

    await logAudit(req.user.id, 'TEACHER_COURSE_APPROVAL_REQUESTED', 'course', id, { title: courseCheck.rows[0].title });
    res.json({ message: 'Course submitted for admin approval', course: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`
      UPDATE notifications 
      SET is_read = true, is_active = false 
      WHERE id = $1 AND (target_user = $2 OR target_role = 'teacher' OR target_role = 'all')
    `, [id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/certificates', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM teacher_certificates WHERE teacher_id = $1 ORDER BY issued_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Referrals & Rewards Endpoints for Teachers ────────────────
// GET /teacher/wallet/statement - Fetch detailed transaction history
router.get('/wallet/statement', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT l.*, p.amount as payment_amount, u.name as referred_user_name
      FROM teacher_wallet_ledger l
      LEFT JOIN payments p ON p.id = l.payment_id
      LEFT JOIN users u ON u.id = l.referred_user_id
      WHERE l.teacher_id = $1
      ORDER BY l.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /teacher/referrals - Get referral statistics and lists of referred students & teachers
router.get('/referrals', async (req, res) => {
  try {
    const teacherId = req.user.id;

    // Fetch teacher referral code
    const userRes = await db.query('SELECT referral_code FROM users WHERE id = $1', [teacherId]);
    const referralCode = userRes.rows[0]?.referral_code || '';

    // Referred students with commission details
    const studentsRes = await db.query(`
      SELECT u.id, u.name, u.email, u.photo_url, u.created_at,
             COALESCE(SUM(l.amount), 0) as commission_earned
      FROM users u
      LEFT JOIN teacher_wallet_ledger l ON l.referred_user_id = u.id AND l.teacher_id = $1 AND l.type = 'student_referral'
      WHERE u.referred_by = $1 AND u.role = 'student'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `, [teacherId]);

    // Referred teachers with commission details
    const teachersRes = await db.query(`
      SELECT u.id, u.name, u.email, u.photo_url, u.created_at,
             COALESCE(SUM(l.amount), 0) as commission_earned
      FROM users u
      LEFT JOIN teacher_wallet_ledger l ON l.referred_user_id = u.id AND l.teacher_id = $1 AND l.type = 'teacher_referral'
      WHERE u.referred_by = $1 AND u.role = 'teacher'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `, [teacherId]);

    // Summary stats
    const statsRes = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'student_referral' THEN amount ELSE 0 END), 0) as student_earnings,
        COALESCE(SUM(CASE WHEN type = 'teacher_referral' THEN amount ELSE 0 END), 0) as teacher_earnings
      FROM teacher_wallet_ledger
      WHERE teacher_id = $1
    `, [teacherId]);

    const studentEarnings = parseFloat(statsRes.rows[0]?.student_earnings || 0);
    const teacherEarnings = parseFloat(statsRes.rows[0]?.teacher_earnings || 0);

    res.json({
      referral_code: referralCode,
      stats: {
        total_referred_students: studentsRes.rows.length,
        total_referred_teachers: teachersRes.rows.length,
        student_referral_earnings: studentEarnings,
        teacher_referral_earnings: teacherEarnings,
        total_referral_earnings: studentEarnings + teacherEarnings
      },
      referred_students: studentsRes.rows,
      referred_teachers: teachersRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /teacher/rewards - Get performance slabs progress, claimed rewards, and grooming allowance history
router.get('/rewards', async (req, res) => {
  try {
    const teacherId = req.user.id;

    // 1. Calculate cumulative revenue generated by this teacher
    const revRes = await db.query(
      "SELECT COALESCE(SUM(amount), 0) as total_rev FROM payments WHERE teacher_id = $1 AND status = 'captured'",
      [teacherId]
    );
    const cumulativeRevenue = parseFloat(revRes.rows[0].total_rev);

    // 2. Fetch claimed rewards from DB
    const claimsRes = await db.query(
      "SELECT * FROM teacher_rewards WHERE teacher_id = $1 ORDER BY target_revenue ASC",
      [teacherId]
    );
    const claims = claimsRes.rows;

    // 3. Fetch monthly grooming allowance history
    const allowancesRes = await db.query(
      "SELECT * FROM teacher_allowances WHERE teacher_id = $1 ORDER BY payment_month DESC",
      [teacherId]
    );

    // 4. Map slabs and check status from dynamic database performance slabs configuration
    const slabsRes = await db.query(
      "SELECT slab_name as name, target_revenue as target, reward_amount as reward, reward_item as item, grooming_group as group FROM performance_slabs_config ORDER BY target_revenue ASC"
    );
    const slabs = slabsRes.rows.map(row => ({
      name: row.name,
      target: parseFloat(row.target),
      reward: parseFloat(row.reward),
      item: row.item,
      group: row.group
    }));

    const mappedSlabs = slabs.map(slab => {
      const dbClaim = claims.find(c => c.slab_name === slab.name);
      let status = 'not_unlocked';
      let claimId = null;
      let achievedAt = null;

      if (dbClaim) {
        status = dbClaim.status;
        claimId = dbClaim.id;
        achievedAt = dbClaim.achieved_at;
      } else if (cumulativeRevenue >= slab.target) {
        status = 'pending_review'; // Should have been generated by payments.js verify but if not, mark pending
      }

      return {
        ...slab,
        status,
        claim_id: claimId,
        achieved_at: achievedAt
      };
    });

    const SystemConfigService = require('../services/SystemConfigService');
    const studentRefPct = await SystemConfigService.getSetting('student_referral_bonus_pct', 5.0);
    const teacherRefPct = await SystemConfigService.getSetting('teacher_referral_bonus_pct', 1.0);
    const maxCap = await SystemConfigService.getSetting('teacher_referral_max_cap', 10);

    const allowancesConfigRes = await db.query("SELECT group_name, allowance_amount FROM grooming_allowances_config");
    const allowanceMap = {};
    for (const row of allowancesConfigRes.rows) {
      allowanceMap[row.group_name] = parseFloat(row.allowance_amount);
    }

    res.json({
      cumulative_revenue: cumulativeRevenue,
      slabs: mappedSlabs,
      allowance_history: allowancesRes.rows,
      allowance_map: allowanceMap,
      settings: {
        student_referral_bonus_pct: parseFloat(studentRefPct),
        teacher_referral_bonus_pct: parseFloat(teacherRefPct),
        teacher_referral_max_cap: parseInt(maxCap)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get Teacher Connect Conversations ─────────────────────────
router.get('/connect/conversations', async (req, res) => {
  try {
    const result = await db.query(`
      WITH ranked_chats AS (
        SELECT chat.*,
               ROW_NUMBER() OVER(PARTITION BY chat.parent_id, chat.student_id ORDER BY chat.created_at DESC) as rn
        FROM parent_teacher_chats chat
        WHERE chat.teacher_id = $1
      )
      SELECT rc.parent_id, rc.student_id, rc.message as last_message, rc.created_at as last_message_at,
             parent.name as parent_name, parent.email as parent_email, parent.phone as parent_phone,
             student.name as student_name, student.student_code as student_code, student.grade as student_grade, student.board as student_board
      FROM ranked_chats rc
      JOIN users parent ON parent.id = rc.parent_id
      JOIN users student ON student.id = rc.student_id
      WHERE rc.rn = 1
      ORDER BY rc.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get Teacher Connect Chat History ──────────────────────────
router.get('/connect/messages', async (req, res) => {
  const { parentId, studentId } = req.query;
  if (!parentId || !studentId) {
    return res.status(400).json({ error: 'parentId and studentId are required' });
  }
  try {
    const messages = await db.query(`
      SELECT chat.*, 
             sender.name as sender_name, sender.role as sender_role
      FROM parent_teacher_chats chat
      JOIN users sender ON sender.id = chat.sender_id
      WHERE chat.teacher_id = $1 AND chat.parent_id = $2 AND chat.student_id = $3
      ORDER BY chat.created_at ASC
    `, [req.user.id, parentId, studentId]);
    res.json(messages.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Send Teacher Connect Message ──────────────────────────────
router.post('/connect/messages', async (req, res) => {
  const { parentId, studentId, message } = req.body;
  if (!parentId || !studentId || !message) {
    return res.status(400).json({ error: 'parentId, studentId, and message are required' });
  }
  try {
    const result = await db.query(`
      INSERT INTO parent_teacher_chats (parent_id, teacher_id, student_id, sender_id, message)
      VALUES ($1, $2, $3, $2, $4)
      RETURNING *
    `, [parentId, req.user.id, studentId, message]);

    // Also send an in-app notification to the parent
    const teacherRes = await db.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const studentRes = await db.query('SELECT name FROM users WHERE id = $1', [studentId]);
    const teacherName = teacherRes.rows[0]?.name || 'Teacher';
    const studentName = studentRes.rows[0]?.name || 'Student';

    await db.query(`
      INSERT INTO notifications (id, title, message, target_role, target_user, type, sent_by)
      VALUES ($1, $2, $3, 'parent', $4, 'info', $5)
    `, [
      'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      `New Message from ${teacherName}`,
      `Mentor ${teacherName} replied to your query regarding student ${studentName}: "${message.substring(0, 60)}${message.length > 60 ? '...' : ''}"`,
      parentId,
      req.user.id
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

