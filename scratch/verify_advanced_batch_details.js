const base = "http://localhost:5002/api";

async function run() {
  console.log("=== Integration Verification of Unified Course Creation and Advanced Batch Details ===");
  try {
    const timestamp = Date.now();
    const testEmail = `teacher_adv_${timestamp}@speaxa.com`;
    
    // 1. Register test teacher
    console.log("1. Registering test teacher...");
    const regRes = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Advanced Teacher',
        email: testEmail,
        phone: '9876543210',
        password: 'Password@123',
        role: 'teacher',
        alt_email: 'alt_adv@speaxa.com',
        mobile_number: '+91 88888 88888',
        social_links: { linkedin: 'https://linkedin.com/in/adv' },
        qualification: 'PhD Education',
        subject_expertise: 'Mathematics',
        experience_years: 10,
        languages: 'English'
      })
    });
    
    if (!regRes.ok) {
      const errText = await regRes.text();
      throw new Error(`Registration failed: ${errText}`);
    }
    const regData = await regRes.json();
    const teacherToken = regData.token;
    const teacherId = regData.user.id;
    console.log(`Teacher registered. ID: ${teacherId}`);

    // Set teacher to approved directly in database
    const db = require('/Users/sahilkhan/FlutterDev/speaxsa_web/src/db');
    await db.query("UPDATE users SET approval_status = 'approved' WHERE id = $1", [teacherId]);
    await db.query("DELETE FROM teacher_sop WHERE teacher_id = $1", [teacherId]);
    await db.query("INSERT INTO teacher_sop (id, teacher_id, status, agreement_signed) VALUES ($1, $2, 'approved', true)", [`sop_${teacherId}`, teacherId]);
    console.log("SOP approved in DB.");

    // 2. Create course draft without duration_weeks to check defaulting behavior
    console.log("2. Creating course draft as teacher (omitting duration_weeks)...");
    const courseRes = await fetch(`${base}/teacher/courses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${teacherToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Advanced Calculus',
        subject: 'Mathematics',
        description: 'A deep dive into integration and limits.',
        grade: 'Class 12',
        board: 'CBSE',
        learning_duration: '12 Weeks / 36 Hours', // Single learning duration text
        objective: 'To understand derivatives and integration.',
        learning_outcome: 'Students will solve advanced integration problems.',
        language_instruction: 'English',
        daily_class_duration: '90 Minutes',
        assessment_days: 'Sundays'
      })
    });

    if (!courseRes.ok) {
      const errText = await courseRes.text();
      throw new Error(`Course creation failed: ${errText}`);
    }
    const courseData = await courseRes.json();
    const courseId = courseData.course.id;
    console.log(`Course draft created. ID: ${courseId}`);

    // Verify duration_weeks defaulted on backend
    const checkCourse = await db.query("SELECT duration_weeks, learning_duration FROM courses WHERE id = $1", [courseId]);
    console.log(`- Defaulted duration_weeks in DB: ${checkCourse.rows[0].duration_weeks}`);
    if (checkCourse.rows[0].duration_weeks !== 12) {
      throw new Error("Defaulting duration_weeks to 12 failed!");
    }

    // Set course to active directly in DB to allow batch creation
    await db.query("UPDATE courses SET status = 'active', fees = 999.00 WHERE id = $1", [courseId]);
    console.log("Course set to active in DB.");

    // 3. Create batch with teaching_method and batch_instructions
    console.log("3. Creating batch with custom methodology & prerequisites...");
    const daysList = ["Monday", "Thursday"];
    const formData = new FormData();
    formData.append('course_id', courseId);
    formData.append('batch_name', 'Calculus Beta Batch');
    formData.append('subject', 'Mathematics');
    formData.append('start_date', '2026-08-01');
    formData.append('end_date', '2026-11-30');
    formData.append('start_time', '18:00:00');
    formData.append('end_time', '19:30:00');
    formData.append('days_of_week', JSON.stringify(daysList));
    formData.append('capacity', '15');
    formData.append('planner_desc', 'Syllabus modules listing...');
    formData.append('teaching_method', 'I teach using interactive digital whiteboard illustrations, weekly quizzes, and post-class revision sheets.');
    formData.append('batch_instructions', 'Prerequisites: Must understand Class 11 coordinate geometry. Bring a graphing calculator.');

    const createRes = await fetch(`${base}/teacher/batches`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` },
      body: formData
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Batch creation failed: ${errText}`);
    }
    const createData = await createRes.json();
    const batchId = createData.batchId;
    console.log(`Batch created successfully! ID: ${batchId}`);

    // 4. Fetch public course batches and verify teaching method & instructions are present
    console.log("4. Querying public course batches endpoint to check custom fields...");
    const publicRes = await fetch(`${base}/public/courses/${courseId}/batches`);
    if (!publicRes.ok) {
      throw new Error("Failed to fetch public course batches");
    }
    const publicBatches = await publicRes.json();
    const batch = publicBatches.find(b => b.id === batchId);
    if (!batch) {
      throw new Error("Created batch not found in public list");
    }

    console.log(`Verified batch details in public payload:`);
    console.log(`- Teaching Style & Methodology: ${batch.teaching_method}`);
    console.log(`- Prerequisites / Instructions: ${batch.batch_instructions}`);

    if (batch.teaching_method !== 'I teach using interactive digital whiteboard illustrations, weekly quizzes, and post-class revision sheets.') {
      throw new Error("Teaching methodology mismatch in response!");
    }
    if (batch.batch_instructions !== 'Prerequisites: Must understand Class 11 coordinate geometry. Bring a graphing calculator.') {
      throw new Error("Batch instructions mismatch in response!");
    }
    console.log("Public values verified successfully!");

    // Clean up
    console.log("Cleaning up database entries...");
    await db.query("DELETE FROM batches WHERE id = $1", [batchId]);
    await db.query("DELETE FROM courses WHERE id = $1", [courseId]);
    await db.query("DELETE FROM notifications WHERE target_user = $1", [teacherId]);
    await db.query("DELETE FROM audit_logs WHERE actor_id = $1", [teacherId]);
    await db.query("DELETE FROM teacher_sop WHERE teacher_id = $1", [teacherId]);
    await db.query("DELETE FROM teacher_wallet WHERE teacher_id = $1", [teacherId]);
    await db.query("DELETE FROM users WHERE id = $1", [teacherId]);
    console.log("Clean up successful!");

    console.log("\n=== ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  }
}

run();
