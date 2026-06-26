const base = "http://localhost:5002/api";
const db = require('/Users/sahilkhan/FlutterDev/speaxsa_web/src/db');

async function getAuthToken(email, password) {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.token;
}

async function run() {
  console.log("=== Integration Verification of Live Class Scheduling & Endpoints ===");
  let testClassId = null;
  try {
    // 2. Find teacher's active batch enrolled by Rohan
    console.log("2. Querying database for Rohan's batch enrollments...");
    const studentQuery = await db.query(`
      SELECT bs.batch_id, b.batch_name, b.teacher_id, b.start_time
      FROM batch_students bs
      JOIN batches b ON b.id = bs.batch_id
      JOIN users u ON u.id = bs.student_id
      WHERE u.email = 'rohan@speaxa.com' AND bs.status = 'active'
      LIMIT 1
    `);

    if (studentQuery.rows.length === 0) {
      throw new Error("No active batch enrollment found for Rohan");
    }

    const { batch_id: batchId, batch_name: batchName, teacher_id: teacherId, start_time: startTime } = studentQuery.rows[0];
    console.log(`✓ Found batch. ID: ${batchId}, Name: ${batchName}, Teacher ID: ${teacherId}, Start Time: ${startTime}`);

    // Get the correct teacher email
    const teacherUserQuery = await db.query("SELECT email FROM users WHERE id = $1", [teacherId]);
    if (teacherUserQuery.rows.length === 0) {
      throw new Error(`Teacher user with ID ${teacherId} not found`);
    }
    const teacherEmail = teacherUserQuery.rows[0].email;
    console.log(`✓ Found teacher email: ${teacherEmail}`);

    console.log("1. Logging in as correct teacher and student...");
    const teacherToken = await getAuthToken(teacherEmail, '123456');
    const studentToken = await getAuthToken('rohan@speaxa.com', '123456');
    console.log("✓ Logged in successfully.");

    // Set teacher SOP to approved and agreement signed to allow scheduling
    await db.query("DELETE FROM teacher_sop WHERE teacher_id = $1", [teacherId]);
    await db.query(`
      INSERT INTO teacher_sop (id, teacher_id, status, agreement_signed)
      VALUES ($1, $2, 'approved', true)
    `, [`sop_${teacherId}`, teacherId]);

    // Delete any active classes for teacher to prevent simultaneous class checks
    await db.query("UPDATE live_classes SET status = 'ended' WHERE teacher_id = $1 AND status = 'live'", [teacherId]);

    // 3. Test Scheduling a class in the PAST (should fail)
    console.log("3a. Attempting to schedule a live class in the past (2025-06-26)...");
    const pastDate = '2025-06-26';
    const pastTime = '12:00:00';
    const pastRes = await fetch(`${base}/teacher/live-classes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${teacherToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        batchId,
        title: "Past Class Test",
        classDate: pastDate,
        classTime: pastTime
      })
    });

    console.log(`  - Past schedule response status: ${pastRes.status}`);
    if (pastRes.status !== 400) {
      throw new Error(`Expected status 400 for past scheduling, got ${pastRes.status}`);
    }
    const pastErr = await pastRes.json();
    console.log(`  - Error message received: ${pastErr.error}`);
    if (!pastErr.error.includes("future")) {
      throw new Error(`Unexpected error message: ${pastErr.error}`);
    }
    console.log("✓ Correctly rejected scheduling in the past!");

    // 3b. Schedule a class in the FUTURE (should succeed)
    console.log("3b. Scheduling live class in the future (2027-06-26)...");
    const classDate = '2027-06-26';
    const classTime = '10:00:00';
    const classTitle = "Test Integration Lecture: Coulomb's Law";

    const scheduleRes = await fetch(`${base}/teacher/live-classes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${teacherToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        batchId,
        title: classTitle,
        classDate,
        classTime
      })
    });

    if (!scheduleRes.ok) {
      throw new Error(`Scheduling failed: ${await scheduleRes.text()}`);
    }

    const scheduleData = await scheduleRes.json();
    testClassId = scheduleData.classId;
    console.log(`✓ Class scheduled successfully in future. ID: ${testClassId}`);

    // 4. Retrieve live classes list as student
    console.log("4. Fetching batch live classes list as student...");
    const listRes = await fetch(`${base}/student/batches/${batchId}/live-classes`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });

    if (!listRes.ok) {
      throw new Error(`Fetching live classes failed: ${await listRes.text()}`);
    }

    const liveClasses = await listRes.json();
    console.log(`✓ Retrieved ${liveClasses.length} live classes for batch.`);
    const classItem = liveClasses.find(c => c.id === testClassId);

    if (!classItem) {
      throw new Error(`Scheduled class with ID ${testClassId} not found in student list`);
    }

    console.log("✓ Verified class details in student payload:");
    console.log(`  - Title: ${classItem.title}`);
    console.log(`  - Date: ${classItem.class_date.split('T')[0]}`);
    console.log(`  - Time: ${classItem.class_time}`);
    console.log(`  - Status: ${classItem.status}`);

    if (classItem.title !== classTitle) {
      throw new Error("Class title mismatch!");
    }
    if (classItem.status !== 'scheduled') {
      throw new Error("Expected class status to be 'scheduled'");
    }

    // 5. Verify database notification was created for Rohan
    console.log("5. Querying database for Rohan's class schedule notification...");
    // Find student user id
    const studentUser = await db.query("SELECT id FROM users WHERE email = 'rohan@speaxa.com'");
    const studentId = studentUser.rows[0].id;
    
    const notifCheck = await db.query(`
      SELECT * FROM notifications 
      WHERE target_user = $1 AND title = 'New Live Class Scheduled' AND message LIKE $2
    `, [studentId, `%${classTitle}%`]);

    if (notifCheck.rows.length === 0) {
      throw new Error("In-app notification row was not created in database!");
    }
    console.log(`✓ Notification verified in DB. Message: "${notifCheck.rows[0].message}"`);

    // Clean up
    console.log("6. Cleaning up scheduled class & notifications database entries...");
    await db.query("DELETE FROM notifications WHERE target_user = $1 AND title = 'New Live Class Scheduled'", [studentId]);
    await db.query("DELETE FROM live_classes WHERE id = $1", [testClassId]);
    console.log("✓ Cleanup completed.");

    console.log("\n=== ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("Verification failed:", err);
    if (testClassId) {
      await db.query("DELETE FROM live_classes WHERE id = $1", [testClassId]);
    }
    process.exit(1);
  }
}

run();
