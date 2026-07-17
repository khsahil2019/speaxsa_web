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

// Public course listing (for landing page)
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
      WHERE role = 'teacher' AND approval_status = 'approved' AND is_disabled = false
      ORDER BY rating DESC, total_ratings DESC
      LIMIT 6
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public stats
router.get('/public/stats', async (req, res) => {
  try {
    const db = require('../db');
    const [students, teachers, courses, classes] = await Promise.all([
      db.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'"),
      db.query("SELECT COUNT(*) as count FROM users WHERE role = 'teacher' AND approval_status = 'approved'"),
      db.query("SELECT COUNT(*) as count FROM courses WHERE status = 'active'"),
      db.query("SELECT COUNT(*) as count FROM live_classes WHERE status = 'ended'"),
    ]);
    res.json({
      students: parseInt(students.rows[0].count),
      teachers: parseInt(teachers.rows[0].count),
      courses: parseInt(courses.rows[0].count),
      classesCompleted: parseInt(classes.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

module.exports = router;
