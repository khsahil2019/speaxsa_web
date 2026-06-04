const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get all active study batches
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM batches');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new batch
router.post('/create', authenticateToken, async (req, res) => {
  const { id, courseId, courseTitle, teacherName, startTime, startDate, daysOfWeek, capacity } = req.body;
  try {
    const isTeacher = req.user.role === 'teacher';
    const approvalStatus = isTeacher ? 'pending' : 'approved';
    const cleanTeacherName = isTeacher ? req.user.name : (teacherName || 'Dr. Ananya Sharma');

    const result = await db.query(
      `INSERT INTO batches (id, course_id, course_title, teacher_name, start_time, start_date, days_of_week, capacity, seats_filled, is_upcoming, approval_status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10) RETURNING *`,
      [id, courseId, courseTitle, cleanTeacherName, startTime, startDate, daysOfWeek, capacity, !isTeacher, approvalStatus]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Book/Enroll student into batch
router.post('/book', authenticateToken, async (req, res) => {
  const { batchId } = req.body;
  try {
    const batchCheck = await db.query('SELECT seats_filled, capacity FROM batches WHERE id = $1', [batchId]);
    if (batchCheck.rows.length === 0) {
      return res.status(404).json({ error: "Batch not found" });
    }
    const { seats_filled, capacity } = batchCheck.rows[0];
    if (seats_filled >= capacity) {
      return res.status(400).json({ error: "Batch is fully booked" });
    }

    const result = await db.query(
      'UPDATE batches SET seats_filled = seats_filled + 1 WHERE id = $1 RETURNING *',
      [batchId]
    );
    res.json({ message: "Successfully enrolled in batch", batch: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
