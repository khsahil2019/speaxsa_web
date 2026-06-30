const jwt = require('jsonwebtoken');
require('dotenv').config();

const API = 'http://localhost:5002/api';
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_TO_A_RANDOM_256BIT_STRING_AT_LEAST_32_CHARS';

async function test() {
  console.log("Starting validation testing script...");

  const db = require('../src/db');
  let teacherId = 'tch_test';
  
  try {
    const teacherQuery = await db.query("SELECT id FROM users WHERE role = 'teacher' LIMIT 1");
    if (teacherQuery.rows.length > 0) {
      teacherId = teacherQuery.rows[0].id;
    }
  } catch (dbErr) {
    console.warn("DB query failed, using fallback teacherId:", dbErr.message);
  }
  console.log("Using teacherId:", teacherId);

  try {
    await db.query("DELETE FROM teacher_sop WHERE teacher_id = $1", [teacherId]);
    await db.query(`
      INSERT INTO teacher_sop (id, teacher_id, status, agreement_signed)
      VALUES ($1, $2, 'approved', true)
    `, [`sop_${Date.now()}`, teacherId]);
  } catch (sopErr) {
    console.warn("Upserting SOP failed:", sopErr.message);
  }

  const token = jwt.sign(
    { id: teacherId, role: 'teacher', email: 'teacher@speaxa.com' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log("Testing POST /teacher/batches with empty payload...");
  try {
    const res = await fetch(`${API}/teacher/batches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    const status = res.status;
    const body = await res.json();
    console.log("Response Status:", status);
    console.log("Response Body:", body);
    if (status === 400 && body.error) {
      console.log("✓ Success! Empty payload validation works correctly.");
    } else {
      console.log("✗ Failed! Expected 400 with validation error.");
    }
  } catch (err) {
    console.error("Fetch failed (is server running?):", err.message);
  }

  db.pool.end();
}

test();
