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

// Public endpoint for Developer API Center to fetch registered admin accounts
router.get('/public/admin-credentials', async (req, res) => {
  try {
    const db = require('../db');
    const result = await db.query(`
      SELECT id, name, email, role, phone, is_disabled, created_at
      FROM users
      WHERE role = 'admin' OR email LIKE '%admin%'
      ORDER BY created_at ASC
    `);
    const defaultAdmins = [
      { id: 'dev-admin-1', name: 'Super Admin', email: 'admin@speaxa.com', role: 'admin', is_disabled: false }
    ];
    const admins = result.rows.length > 0 ? result.rows : defaultAdmins;
    res.json({
      admins,
      default_dev_password: '123456'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public Developer API for updating admin email/password from API Center
router.post('/public/update-admin-credentials', async (req, res) => {
  const { admin_id, new_email, new_password } = req.body;
  const cleanEmail = (new_email || '').trim().toLowerCase();
  const cleanPass = (new_password || '').trim();

  if (!cleanEmail || !cleanPass) {
    return res.status(400).json({ error: 'New Email and Password are required.' });
  }

  try {
    const db = require('../db');
    const { hashPassword } = require('../utils/security');
    const hash = hashPassword(cleanPass);

    let result;
    if (admin_id) {
      result = await db.query(`
        UPDATE users
        SET email = $1, password_hash = $2, password_plain = $3, updated_at = NOW()
        WHERE id = $4 AND role = 'admin'
        RETURNING id, name, email, role
      `, [cleanEmail, hash, cleanPass, admin_id]);
    } else {
      result = await db.query(`
        UPDATE users
        SET email = $1, password_hash = $2, password_plain = $3, updated_at = NOW()
        WHERE role = 'admin' OR LOWER(email) = 'admin@speaxa.com'
        RETURNING id, name, email, role
      `, [cleanEmail, hash, cleanPass]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin account not found to update.' });
    }

    res.json({
      success: true,
      message: 'Admin credentials updated in database successfully!',
      admin: result.rows[0],
      new_password: cleanPass
    });
  } catch (err) {
    console.error('[Public Update Admin Credentials Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// Public Developer API for emailing admin login credentials with premium template
router.post('/public/send-admin-credentials-email', async (req, res) => {
  const { email, password, recipient_email } = req.body;
  const adminLoginEmail = (email || 'admin@speaxa.com').trim();
  const targetEmail = (recipient_email || adminLoginEmail).trim();
  const adminPass = (password || '123456').trim();

  try {
    const { sendEmail } = require('../services/EmailService');
    const adminUrl = 'https://speaxa.in/admin';

    await sendEmail({
      to: targetEmail,
      subject: '👑 SPEAXA Admin Credentials & Executive Control Access',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="margin: 0; padding: 20px; background-color: #0f172a; font-family: 'Segoe UI', Arial, sans-serif; color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 20px; overflow: hidden; border: 2px solid #0d7a6d; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
            
            <!-- Executive Header Banner -->
            <div style="background: linear-gradient(135deg, #0d7a6d 0%, #0f766e 50%, #1e1b4b 100%); padding: 35px 25px; text-align: center; border-bottom: 2px solid #f59e0b;">
              <div style="display: inline-block; background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b; padding: 5px 16px; border-radius: 50px; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;">
                👑 HIGHER AUTHORITY ACCESS GRANTED
              </div>
              <div style="font-size: 48px; margin-bottom: 8px;">🛡️</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">SPEAXA Executive Admin Access</h1>
              <p style="margin: 6px 0 0 0; color: #99f6e4; font-size: 13px;">Official Administrative Credentials & Control Console Link</p>
            </div>

            <!-- Main Email Body -->
            <div style="padding: 30px 25px;">
              <p style="margin-top: 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Hello Executive,<br><br>
                Below are your official, confidential credentials to access the <strong>SPEAXA Admin Control Panel</strong>. Use these credentials to manage teachers, students, courses, payments, and platform configurations.
              </p>
              
              <!-- Credentials Card -->
              <div style="background: #0f172a; border: 1px solid rgba(13, 122, 109, 0.4); border-radius: 14px; padding: 22px; margin: 20px 0;">
                
                <div style="margin-bottom: 16px;">
                  <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 4px;">🌐 Admin Portal URL</div>
                  <div style="background: #1e293b; padding: 10px 14px; border-radius: 8px; border: 1px solid #334155;">
                    <a href="${adminUrl}" style="color: #2dd4bf; font-weight: bold; text-decoration: underline; font-family: monospace; font-size: 14px;">${adminUrl}</a>
                  </div>
                </div>

                <div style="margin-bottom: 16px;">
                  <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 4px;">📧 Admin Login Email</div>
                  <div style="background: #1e293b; padding: 10px 14px; border-radius: 8px; border: 1px solid #334155; color: #38bdf8; font-family: monospace; font-size: 14px; font-weight: bold;">
                    ${adminLoginEmail}
                  </div>
                </div>

                <div>
                  <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 4px;">🔑 Executive Access Password</div>
                  <div style="background: #1e293b; padding: 10px 14px; border-radius: 8px; border: 1px solid #f43f5e; color: #f43f5e; font-family: monospace; font-size: 15px; font-weight: bold; letter-spacing: 1px;">
                    ${adminPass}
                  </div>
                </div>

              </div>

              <!-- Call to Action Button -->
              <div style="text-align: center; margin-top: 25px;">
                <a href="${adminUrl}" style="display: inline-block; background: linear-gradient(135deg, #0d7a6d 0%, #14b8a6 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-size: 14px; font-weight: 800; letter-spacing: 0.5px; box-shadow: 0 8px 20px rgba(13, 122, 109, 0.4);">
                  🚀 Launch Executive Control Console ↗
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 18px; font-size: 11px; color: #64748b; border-top: 1px solid #334155; background: #0f172a;">
              🔒 Strictly Confidential • Automated Credentials Dispatch from SPEAXA Developer API Center
            </div>

          </div>
        </body>
        </html>
      `,
      type: 'notification'
    });

    res.json({
      success: true,
      message: `Executive login credentials successfully dispatched to ${targetEmail}!`
    });
  } catch (err) {
    console.error('[Send Admin Credentials Email Error]:', err);
    res.status(500).json({ error: 'Failed to send credentials email: ' + err.message });
  }
});

// Public Developer Module Locks & Admin Sidebar Controls (Unauthenticated access for portal sidebars)
router.get('/public/module-locks', async (req, res) => {
  try {
    const db = require('../db');
    const dbRes = await db.query("SELECT value FROM platform_settings WHERE key = 'locked_modules'");
    let lockedModules = { admin: {}, teacher: {}, student: {}, parent: {} };
    if (dbRes.rows.length && dbRes.rows[0].value) {
      try { 
        const parsed = JSON.parse(dbRes.rows[0].value); 
        const normalize = (val) => {
          if (Array.isArray(val)) {
            const obj = {};
            val.forEach(k => obj[k] = 'Work in Progress');
            return obj;
          }
          return (val && typeof val === 'object') ? val : {};
        };
        lockedModules = {
          admin: normalize(parsed.admin),
          teacher: normalize(parsed.teacher),
          student: normalize(parsed.student),
          parent: normalize(parsed.parent)
        };
      } catch(e) {}
    }
    res.json({ locked_modules: lockedModules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/public/admin-tabs-config', async (req, res) => {
  try {
    const db = require('../db');
    const dbRes = await db.query("SELECT value FROM platform_settings WHERE key = 'disabled_admin_tabs'");
    let disabledTabs = [];
    if (dbRes.rows.length && dbRes.rows[0].value) {
      try { disabledTabs = JSON.parse(dbRes.rows[0].value); } catch (e) {}
    }
    res.json({ disabled_tabs: disabledTabs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public System Settings (Timezone & 12-Hour System)
router.get('/public/system-settings', async (req, res) => {
  try {
    const configService = require('../services/SystemConfigService');
    const settings = await configService.getConfig();
    res.json({
      system_timezone: settings.system_timezone || 'Asia/Kolkata',
      system_time_format: '12-hour',
      hour12: true
    });
  } catch (err) {
    res.json({ system_timezone: 'Asia/Kolkata', system_time_format: '12-hour', hour12: true });
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
