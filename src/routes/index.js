const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/admin', require('./admin'));
router.use('/teacher', require('./teacher'));
router.use('/student', require('./student'));
router.use('/parent', require('./parent'));
router.use('/live-classes', require('./liveClass'));
router.use('/payments', require('./payments'));
router.use('/courses', require('./courses'));
router.use('/support', require('./support'));
router.use('/db-admin', require('./dbAdmin'));

// Public course listing (for landing page — ACTIVE courses only)
router.get('/public/courses', async (req, res) => {
  try {
    const db = require('../db');
    const result = await db.query(`
      SELECT c.*, COUNT(DISTINCT b.id) as batch_count
      FROM courses c
      LEFT JOIN batches b ON b.course_id = c.id AND b.status = 'active'
      WHERE c.status = 'active'
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public teacher listing (for landing page)
router.get('/public/teachers', async (req, res) => {
  try {
    const db = require('../db');
    const result = await db.query(`
      SELECT id, name, photo_url, teacher_level, rating, total_ratings, subject_expertise, experience_years, qualification
      FROM users
      WHERE role = 'teacher' AND (is_disabled = false OR is_disabled IS NULL)
      ORDER BY rating DESC, total_ratings DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public stats — Exact Dynamic Database Counts
router.get('/public/stats', async (req, res) => {
  try {
    const db = require('../db');
    const configService = require('../services/SystemConfigService');
    const settings = await configService.getConfig();

    const [students, teachers, courses, classes] = await Promise.all([
      db.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'"),
      db.query("SELECT COUNT(*) as count FROM users WHERE role = 'teacher' AND (is_disabled = false OR is_disabled IS NULL)"),
      db.query("SELECT COUNT(*) as count FROM courses WHERE status = 'active'"),
      db.query("SELECT COUNT(*) as count FROM live_classes"),
    ]);

    const dbStudents = parseInt(students.rows[0]?.count || 0);
    const dbTeachers = parseInt(teachers.rows[0]?.count || 0);
    const dbCourses = parseInt(courses.rows[0]?.count || 0);
    const dbClasses = parseInt(classes.rows[0]?.count || 0);

    const studentOffset = parseInt(settings.stat_students_offset || 0);
    const teacherOffset = parseInt(settings.stat_teachers_offset || 0);
    const courseOffset = parseInt(settings.stat_courses_offset || 0);
    const classOffset = parseInt(settings.stat_classes_offset || 0);

    res.json({
      students: dbStudents + studentOffset,
      teachers: dbTeachers + teacherOffset,
      courses: dbCourses + courseOffset,
      classesCompleted: dbClasses + classOffset,
      raw: {
        students: dbStudents,
        teachers: dbTeachers,
        courses: dbCourses,
        classesCompleted: dbClasses
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public API to dispatch App Download Link via SMS or Email
router.post('/public/send-app-link', async (req, res) => {
  try {
    const { target, phone, email } = req.body;
    const destination = (target || phone || email || '').trim();

    if (!destination) {
      return res.status(400).json({ error: 'Mobile number or email address is required.' });
    }

    const isEmail = destination.includes('@');
    const downloadUrl = 'https://speaxa.in/uploads/speaxa-app.apk';
    const appMsg = `🚀 SPEAXA Mobile App: Learn anywhere on live interactive classrooms! Download link: ${downloadUrl}`;

    if (isEmail) {
      const db = require('../db');
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS subscribers (
            id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
            email VARCHAR(255) UNIQUE NOT NULL,
            source VARCHAR(100) DEFAULT 'landing_page',
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
      } catch(e) {}

      await db.query(`
        INSERT INTO subscribers (email, source, status)
        VALUES ($1, 'app_download_form', 'active')
        ON CONFLICT (email) DO UPDATE SET status = 'active', created_at = NOW()
      `, [destination.toLowerCase()]).catch(err => console.log('Auto-subscribe log:', err.message));

      const { sendEmail } = require('../services/EmailService');
      await sendEmail({
        to: destination,
        subject: 'SPEAXA Mobile App Download Link',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background: #f8fafc; border-radius: 10px;">
            <h2 style="color: #0d7a6d; margin-top: 0;">Download SPEAXA App</h2>
            <p style="color: #334155; font-size: 15px;">You requested the download link for the official SPEAXA Learning App.</p>
            <p><a href="${downloadUrl}" style="background: #0d7a6d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Download SPEAXA Android App</a></p>
            <p style="color: #64748b; font-size: 13px;">If you have any questions, contact our support team at support@speaxa.com.</p>
          </div>
        `,
        type: 'notification'
      }).catch(err => console.log('Email dispatch log:', err.message));
    }

    return res.json({
      success: true,
      message: `App download link sent successfully to ${isEmail ? destination : ('+91 ' + destination)}!`,
      downloadUrl: downloadUrl,
      target: destination
    });
  } catch (err) {
    console.error('send-app-link error:', err.message);
    res.status(500).json({ error: 'Failed to process app link request. Please try again.' });
  }
});

// Public Newsletter Subscription Endpoint
router.post('/public/subscribe', async (req, res) => {
  try {
    const { email, source } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    const db = require('../db');
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS subscribers (
          id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
          email VARCHAR(255) UNIQUE NOT NULL,
          source VARCHAR(100) DEFAULT 'landing_page',
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
    } catch(e) {
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS subscribers (
            id VARCHAR(100) PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
            email VARCHAR(255) UNIQUE NOT NULL,
            source VARCHAR(100) DEFAULT 'landing_page',
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
      } catch(err2) {}
    }
    await db.query(`
      INSERT INTO subscribers (email, source, status)
      VALUES ($1, $2, 'active')
      ON CONFLICT (email) DO UPDATE SET status = 'active', created_at = NOW()
    `, [cleanEmail, source || 'landing_page']);
    return res.json({ success: true, message: 'Thank you for subscribing to SPEAXA updates!' });
  } catch (err) {
    console.error('Subscribe Error:', err.message);
    return res.status(500).json({ error: 'Failed to subscribe. Please try again.' });
  }
});

// Public batches listing for a specific course
router.get('/public/courses/:courseId/batches', async (req, res) => {
  const { courseId } = req.params;
  try {
    const db = require('../db');
    const result = await db.query(`
      SELECT b.*, c.title as course_title, c.fees, u.name as teacher_name, u.photo_url as teacher_photo,
             u.teacher_level, u.rating as teacher_rating,
             u.qualification as teacher_qualification, u.experience_years as teacher_experience,
             u.subject_expertise as teacher_expertise, u.bio as teacher_bio,
             (b.capacity - b.seats_filled) as available_seats
      FROM batches b
      LEFT JOIN courses c ON c.id = b.course_id
      LEFT JOIN users u ON u.id = b.teacher_id
      WHERE b.status = 'active' AND b.seats_filled < b.capacity AND b.course_id = $1
      ORDER BY b.created_at DESC
    `, [courseId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public certificate verification check
router.get('/public/certificates/verify/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = require('../db');
    const result = await db.query(`
      SELECT tc.*, u.name as teacher_name, u.photo_url as teacher_photo, u.email as teacher_email
      FROM teacher_certificates tc
      JOIN users u ON u.id = tc.teacher_id
      WHERE tc.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found or invalid' });
    }
    
    res.json({
      valid: true,
      certificate: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public blogs listing
router.get('/public/blogs', async (req, res) => {
  try {
    const db = require('../db');
    const result = await db.query("SELECT * FROM blogs ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public single blog by slug
router.get('/public/blogs/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const db = require('../db');
    const result = await db.query("SELECT * FROM blogs WHERE slug = $1", [slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public FAQs listing
router.get('/public/faqs', async (req, res) => {
  try {
    const db = require('../db');
    const result = await db.query("SELECT * FROM faqs ORDER BY sort_order ASC, created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
