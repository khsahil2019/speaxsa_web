const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get filtered attendance records (highly specific admin audit tool) - protected
router.get('/', authenticateToken, async (req, res) => {
  const { studentName, teacherId, subject, date, status } = req.query;

  try {
    // Dynamic SQL Query Builder for Postgres
    let queryText = 'SELECT * FROM attendance_records WHERE 1=1';
    const params = [];
    let count = 1;

    if (req.user && req.user.role === 'student') {
      queryText += ` AND student_id = $${count}`;
      params.push(req.user.id);
      count++;
    }

    if (studentName) {
      queryText += ` AND student_name ILIKE $${count}`;
      params.push(`%${studentName}%`);
      count++;
    }
    if (teacherId) {
      queryText += ` AND teacher_id = $${count}`;
      params.push(teacherId);
      count++;
    }
    if (subject) {
      queryText += ` AND course_title ILIKE $${count}`;
      params.push(`%${subject}%`);
      count++;
    }
    if (date) {
      queryText += ` AND date = $${count}`;
      params.push(date);
      count++;
    }
    if (status) {
      queryText += ` AND status = $${count}`;
      params.push(status);
      count++;
    }

    const result = await db.query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log new attendance record - protected
router.post('/log', authenticateToken, async (req, res) => {
  const { studentId, studentName, teacherId, courseTitle, date, status, sessionDurationMinutes, pollParticipationCount, chatMessagesCount, engagementAlertFlag } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO attendance_records 
       (student_id, student_name, teacher_id, course_title, date, status, session_duration_minutes, poll_participation_count, chat_messages_count, engagement_alert_flag) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [studentId, studentName, teacherId, courseTitle, date, status, sessionDurationMinutes, pollParticipationCount, chatMessagesCount, engagementAlertFlag]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
