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
      LIMIT 8
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

module.exports = router;
