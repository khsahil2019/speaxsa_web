const express = require('express');
const router = express.Router();
const db = require('../db');

// Fetch courses
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM courses');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add course
router.post('/add', async (req, res) => {
  const { id, title, description, grade, board, price } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO courses (id, title, description, grade, board, price) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, title, description, grade, board, price]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enroll a student in a course/batch and process payment
router.post('/enroll', async (req, res) => {
  const { studentId, teacherId, batchId, amount, paymentMethod, billingName, billingEmail, billingPhone } = req.body;
  try {
    const enrollmentId = `pay_${Date.now()}`;
    const parsedAmount = parseFloat(amount);

    await db.query(
      `INSERT INTO payments (id, student_id, teacher_id, batch_id, amount, payment_method, billing_name, billing_email, billing_phone, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [enrollmentId, studentId, teacherId, batchId, parsedAmount, paymentMethod, billingName, billingEmail, billingPhone, 'Success']
    );
    await db.query('UPDATE batches SET seats_filled = seats_filled + 1 WHERE id = $1', [batchId]);

    res.status(201).json({
      message: "Enrollment and payment processed successfully",
      enrollmentId,
      paymentRecord: {
        id: enrollmentId,
        student_id: studentId,
        teacher_id: teacherId,
        batch_id: batchId,
        amount: parsedAmount,
        payment_method: paymentMethod,
        billing_name: billingName,
        billing_email: billingEmail,
        billing_phone: billingPhone,
        status: 'Success'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch active notifications
router.get('/notifications', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
