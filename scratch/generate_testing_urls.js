const db = require('../src/db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../src/middleware/auth');
const { generateUID } = require('../src/utils/security');

async function run() {
  try {
    // 1. Get teacher
    const teachers = await db.query("SELECT * FROM users WHERE role = 'teacher' AND approval_status = 'approved' LIMIT 1");
    if (!teachers.rows.length) {
      console.error('No approved teacher found. Please register/approve one first.');
      process.exit(1);
    }
    const teacher = teachers.rows[0];

    // 2. Ensure teacher has SOP approved and digital agreement signed
    const existingSop = await db.query("SELECT * FROM teacher_sop WHERE teacher_id = $1", [teacher.id]);
    if (existingSop.rows.length) {
      await db.query("UPDATE teacher_sop SET status = 'approved', agreement_signed = true WHERE teacher_id = $1", [teacher.id]);
    } else {
      await db.query(`
        INSERT INTO teacher_sop (id, teacher_id, status, agreement_signed)
        VALUES ($1, $2, 'approved', true)
      `, [`sop_${teacher.id}`, teacher.id]);
    }

    // 3. Get student
    const students = await db.query("SELECT * FROM users WHERE role = 'student' LIMIT 1");
    if (!students.rows.length) {
      console.error('No student found. Please register one first.');
      process.exit(1);
    }
    const student = students.rows[0];

    // 4. Get or create a batch
    let batch;
    const batches = await db.query("SELECT * FROM batches LIMIT 1");
    if (batches.rows.length) {
      batch = batches.rows[0];
    } else {
      // Create course & batch
      const courseId = generateUID('crs');
      await db.query("INSERT INTO courses (id, title, status) VALUES ($1, 'Test Course', 'active')", [courseId]);
      const batchId = generateUID('btc');
      await db.query("INSERT INTO batches (id, course_id, teacher_id, batch_name, capacity, status) VALUES ($1, $2, $3, 'Test Batch', 10, 'active')", [batchId, courseId, teacher.id]);
      batch = (await db.query("SELECT * FROM batches LIMIT 1")).rows[0];
    }

    // 5. Enroll student in the batch (id is serial, omit it)
    await db.query(`
      INSERT INTO batch_students (batch_id, student_id, status)
      VALUES ($1, $2, 'active')
      ON CONFLICT DO NOTHING
    `, [batch.id, student.id]);

    // 6. Create live class
    const classId = `live_test_${Date.now()}`;
    await db.query(`
      INSERT INTO live_classes (id, batch_id, teacher_id, title, status, agora_channel)
      VALUES ($1, $2, $3, 'WebRTC Test Session', 'scheduled', $4)
    `, [classId, batch.id, teacher.id, `chan_${classId}`]);

    // 7. Generate JWT Tokens
    const teacherToken = jwt.sign(
      { id: teacher.id, email: teacher.email, name: teacher.name, role: 'teacher' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const studentToken = jwt.sign(
      { id: student.id, email: student.email, name: student.name, role: 'student' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const teacherUserParam = encodeURIComponent(JSON.stringify({ id: teacher.id, name: teacher.name, role: 'teacher' }));
    const studentUserParam = encodeURIComponent(JSON.stringify({ id: student.id, name: student.name, role: 'student' }));

    console.log('\n==================================================');
    console.log('CLASSROOM TEST LINKS GENERATED SUCCESSFULLY');
    console.log('==================================================\n');
    console.log('Teacher URL:');
    console.log(`http://localhost:5002/live/room.html?classId=${classId}&token=${teacherToken}&user=${teacherUserParam}`);
    console.log('\nStudent URL:');
    console.log(`http://localhost:5002/live/room.html?classId=${classId}&token=${studentToken}&user=${studentUserParam}`);
    console.log('\n==================================================\n');

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
