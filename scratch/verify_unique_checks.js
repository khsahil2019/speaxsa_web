const db = require('../src/db');

const base = "http://localhost:5002/api";

async function verify() {
  console.log("=== STARTING REGISTRATION & LOGIN UNIQUENESS VERIFICATION ===");
  const createdUserIds = [];

  try {
    // ── 1. STUDENT REGISTRATION CHECKS ────────────────────────────────
    console.log("\n--- Testing Student Registrations ---");
    
    // Register Student 1
    console.log("Registering Student 1 (sharedstudent@example.com / 9988776611)...");
    const resS1 = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student One',
        email: 'sharedstudent@example.com',
        phone: '9988776611',
        password: 'studentpass1',
        role: 'student',
        grade: 'Class 10',
        board: 'CBSE'
      })
    });
    console.log(`Student 1 status: ${resS1.status}`);
    const dataS1 = await resS1.json();
    if (resS1.status !== 201) {
      throw new Error(`Failed to register Student 1: ${JSON.stringify(dataS1)}`);
    }
    createdUserIds.push(dataS1.user.id);
    console.log(`✓ Student 1 registered: ${dataS1.user.id}`);

    // Register Student 2 (same email/phone)
    console.log("Registering Student 2 (sharedstudent@example.com / 9988776611)...");
    const resS2 = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student Two',
        email: 'sharedstudent@example.com',
        phone: '9988776611',
        password: 'studentpass2',
        role: 'student',
        grade: 'Class 11',
        board: 'ICSE'
      })
    });
    console.log(`Student 2 status: ${resS2.status}`);
    const dataS2 = await resS2.json();
    if (resS2.status !== 201) {
      throw new Error(`Failed to register Student 2: ${JSON.stringify(dataS2)}`);
    }
    createdUserIds.push(dataS2.user.id);
    console.log(`✓ Student 2 registered: ${dataS2.user.id}`);

    // Register Student 3 (same email/phone, limit is 2)
    console.log("Registering Student 3 (sharedstudent@example.com / 9988776611) - Should fail...");
    const resS3 = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student Three',
        email: 'sharedstudent@example.com',
        phone: '9988776611',
        password: 'studentpass3',
        role: 'student',
        grade: 'Class 9',
        board: 'CBSE'
      })
    });
    console.log(`Student 3 status: ${resS3.status}`);
    const dataS3 = await resS3.json();
    if (resS3.status === 201) {
      createdUserIds.push(dataS3.user.id);
      throw new Error(`Expected Student 3 registration to fail, but it succeeded: ${dataS3.user.id}`);
    }
    console.log(`✓ Student 3 registration correctly blocked: ${dataS3.error}`);


    // ── 2. LOGIN CHECKS WITH SHARED EMAIL ────────────────────────────
    console.log("\n--- Testing Shared Email Logins ---");

    // Login for Student 1
    console.log("Logging in as Student 1...");
    const resLoginS1 = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sharedstudent@example.com', password: 'studentpass1' })
    });
    const dataLoginS1 = await resLoginS1.json();
    if (resLoginS1.status !== 200 || dataLoginS1.user.id !== dataS1.user.id) {
      throw new Error(`Student 1 login failed or resolved to wrong account: ${JSON.stringify(dataLoginS1)}`);
    }
    console.log("✓ Student 1 logged in successfully and matched correct profile!");

    // Login for Student 2
    console.log("Logging in as Student 2...");
    const resLoginS2 = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sharedstudent@example.com', password: 'studentpass2' })
    });
    const dataLoginS2 = await resLoginS2.json();
    if (resLoginS2.status !== 200 || dataLoginS2.user.id !== dataS2.user.id) {
      throw new Error(`Student 2 login failed or resolved to wrong account: ${JSON.stringify(dataLoginS2)}`);
    }
    console.log("✓ Student 2 logged in successfully and matched correct profile!");

    // Login with invalid password
    console.log("Logging in with wrong password - Should fail...");
    const resLoginFail = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sharedstudent@example.com', password: 'wrongpassword' })
    });
    console.log(`Wrong password status: ${resLoginFail.status}`);
    if (resLoginFail.status === 200) {
      throw new Error("Login succeeded with invalid password.");
    }
    console.log("✓ Login attempt with wrong password blocked correctly.");


    // ── 3. TEACHER REGISTRATION CHECKS (STRICT UNIQUENESS) ─────────────
    console.log("\n--- Testing Teacher Registrations ---");

    // Register unique teacher
    console.log("Registering Teacher 1 (teacher1@example.com / 9988776655)...");
    const resT1 = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Teacher One',
        email: 'teacher1@example.com',
        phone: '9988776655',
        password: 'teacherpass1',
        role: 'teacher'
      })
    });
    console.log(`Teacher 1 status: ${resT1.status}`);
    const dataT1 = await resT1.json();
    if (resT1.status !== 201) {
      throw new Error(`Failed to register Teacher 1: ${JSON.stringify(dataT1)}`);
    }
    createdUserIds.push(dataT1.user.id);
    console.log(`✓ Teacher 1 registered: ${dataT1.user.id}`);

    // Register duplicate email teacher
    console.log("Registering Teacher 2 with duplicate email (teacher1@example.com / 9988776644) - Should fail...");
    const resT2 = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Teacher Two',
        email: 'teacher1@example.com',
        phone: '9988776644',
        password: 'teacherpass2',
        role: 'teacher'
      })
    });
    console.log(`Teacher 2 status: ${resT2.status}`);
    const dataT2 = await resT2.json();
    if (resT2.status === 201) {
      createdUserIds.push(dataT2.user.id);
      throw new Error(`Expected Teacher 2 registration to fail, but it succeeded.`);
    }
    console.log(`✓ Teacher 2 registration blocked correctly: ${dataT2.error}`);

    // Register duplicate phone teacher
    console.log("Registering Teacher 3 with duplicate phone (teacher3@example.com / 9988776655) - Should fail...");
    const resT3 = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Teacher Three',
        email: 'teacher3@example.com',
        phone: '9988776655',
        password: 'teacherpass3',
        role: 'teacher'
      })
    });
    console.log(`Teacher 3 status: ${resT3.status}`);
    const dataT3 = await resT3.json();
    if (resT3.status === 201) {
      createdUserIds.push(dataT3.user.id);
      throw new Error(`Expected Teacher 3 registration to fail, but it succeeded.`);
    }
    console.log(`✓ Teacher 3 registration blocked correctly: ${dataT3.error}`);


    // ── 4. PARENT REGISTRATION CHECKS (STRICT UNIQUENESS) ─────────────
    console.log("\n--- Testing Parent Registrations ---");

    // Register unique parent
    console.log("Registering Parent 1 (parent1@example.com / 9988776622)...");
    const resP1 = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Parent One',
        email: 'parent1@example.com',
        phone: '9988776622',
        password: 'parentpass1',
        role: 'parent'
      })
    });
    console.log(`Parent 1 status: ${resP1.status}`);
    const dataP1 = await resP1.json();
    if (resP1.status !== 201) {
      throw new Error(`Failed to register Parent 1: ${JSON.stringify(dataP1)}`);
    }
    createdUserIds.push(dataP1.user.id);
    console.log(`✓ Parent 1 registered: ${dataP1.user.id}`);

    // Register duplicate email parent
    console.log("Registering Parent 2 with duplicate email (parent1@example.com / 9988776633) - Should fail...");
    const resP2 = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Parent Two',
        email: 'parent1@example.com',
        phone: '9988776633',
        password: 'parentpass2',
        role: 'parent'
      })
    });
    console.log(`Parent 2 status: ${resP2.status}`);
    const dataP2 = await resP2.json();
    if (resP2.status === 201) {
      createdUserIds.push(dataP2.user.id);
      throw new Error(`Expected Parent 2 registration to fail, but it succeeded.`);
    }
    console.log(`✓ Parent 2 registration blocked correctly: ${dataP2.error}`);

    // Register duplicate phone parent
    console.log("Registering Parent 3 with duplicate phone (parent3@example.com / 9988776622) - Should fail...");
    const resP3 = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Parent Three',
        email: 'parent3@example.com',
        phone: '9988776622',
        password: 'parentpass3',
        role: 'parent'
      })
    });
    console.log(`Parent 3 status: ${resP3.status}`);
    const dataP3 = await resP3.json();
    if (resP3.status === 201) {
      createdUserIds.push(dataP3.user.id);
      throw new Error(`Expected Parent 3 registration to fail, but it succeeded.`);
    }
    console.log(`✓ Parent 3 registration blocked correctly: ${dataP3.error}`);

    console.log("\n🎉 ALL FUNCTIONAL TESTS COMPLETED SUCCESSFULLY! 🎉");

  } catch (err) {
    console.error("\n❌ VERIFICATION TEST ENCOUNTERED AN ERROR:", err.message);
  } finally {
    // Clean up created records
    if (createdUserIds.length > 0) {
      console.log("\nCleaning up test records from database...");
      try {
        // Delete audit logs first
        await db.query("DELETE FROM audit_logs WHERE actor_id = ANY($1) OR target_id = ANY($1)", [createdUserIds]);
        // Delete sop entries first if created
        await db.query("DELETE FROM teacher_sop WHERE teacher_id = ANY($1)", [createdUserIds]);
        // Delete wallets if created
        await db.query("DELETE FROM teacher_wallet WHERE teacher_id = ANY($1)", [createdUserIds]);
        // Delete users
        await db.query("DELETE FROM users WHERE id = ANY($1)", [createdUserIds]);
        console.log(`✓ Cleaned up ${createdUserIds.length} test user records.`);
      } catch (cleanupErr) {
        console.error("Error during database cleanup:", cleanupErr.message);
      }
    }
    db.pool.end();
  }
}

verify();
