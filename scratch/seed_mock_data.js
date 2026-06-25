const db = require('../src/db');
const bcrypt = require('bcryptjs');

async function seedData() {
  console.log("=== STARTING FULL DATABASE MOCK DATA SEEDER ===\n");

  try {
    const passwordHash = await bcrypt.hash('123456', 10);
    console.log("✓ Password hash generated (123456).");

    // Clean tables in correct order of dependency via CASCADE
    console.log("Cleaning dynamic tables via CASCADE...");
    await db.query(`TRUNCATE TABLE users, coupons, otp_tokens CASCADE`);
    console.log("✓ Dynamic tables cleaned.\n");

    // 1. Seed Users (Admins, Teachers, Parents, Students)
    console.log("Seeding user accounts...");
    const usersToInsert = [
      // Admins
      {
        id: 'admin_001',
        email: 'admin@speaxa.com',
        phone: '9000000000',
        name: 'Super Admin',
        role: 'admin',
        password_plain: '123456'
      },
      
      // Teachers
      {
        id: 'teacher_sahil',
        email: 'sahil@speaxa.com',
        phone: '9876543210',
        name: 'Sahil Khan',
        role: 'teacher',
        password_plain: '123456',
        teacher_level: 'Professor',
        qualification: 'PhD in Quantum Physics',
        experience_years: 10,
        subject_expertise: 'Physics',
        languages: 'English, Hindi',
        address: 'Sector 62, Noida, UP',
        bio: 'PhD in Advanced Physics and Quantum Mechanics. Passionate about teaching class 10 and prep students.',
        rating: 4.90,
        total_ratings: 25,
        referral_code: 'REF_SAHIL'
      },
      {
        id: 'teacher_priya',
        email: 'priya@speaxa.com',
        phone: '9876543211',
        name: 'Priya Sharma',
        role: 'teacher',
        password_plain: '123456',
        teacher_level: 'Senior Teacher',
        qualification: 'MSc in Mathematics',
        experience_years: 6,
        subject_expertise: 'Mathematics',
        languages: 'English, Hindi, Punjabi',
        address: 'Vasant Kunj, New Delhi',
        bio: 'MSc in Mathematics. Specializes in making Geometry and Algebra intuitive for middle-school children.',
        rating: 4.70,
        total_ratings: 18,
        referral_code: 'REF_PRIYA'
      },
      {
        id: 'teacher_rahul',
        email: 'rahul@speaxa.com',
        phone: '9876543212',
        name: 'Rahul Verma',
        role: 'teacher',
        password_plain: '123456',
        teacher_level: 'Junior Teacher',
        qualification: 'BA in English Literature',
        experience_years: 2,
        subject_expertise: 'English',
        languages: 'English, Kannada',
        address: 'Indiranagar, Bangalore, Karnataka',
        bio: 'BA in English Literature. Focused on speech development, phonetics, and grammar foundations.',
        rating: 4.50,
        total_ratings: 5,
        referral_code: 'REF_RAHUL'
      },
      {
        id: 'teacher_neha',
        email: 'neha@speaxa.com',
        phone: '9876543213',
        name: 'Neha Gupta',
        role: 'teacher',
        password_plain: '123456',
        teacher_level: 'Assistant Teacher',
        qualification: 'MSc in Chemistry',
        experience_years: 4,
        subject_expertise: 'Chemistry',
        languages: 'English, Marathi',
        address: 'Kothrud, Pune, Maharashtra',
        bio: 'MSc in Chemistry. Organic chemistry specialist with modern pedagogical approach.',
        rating: 4.60,
        total_ratings: 12,
        referral_code: 'REF_NEHA'
      },

      // Parents
      {
        id: 'parent_rajesh',
        email: 'rajesh@speaxa.com',
        phone: '9898980001',
        name: 'Rajesh Kumar',
        role: 'parent',
        password_plain: '123456',
        address: 'Sector 15, Noida, UP',
        bio: 'Parent of Rohan and Sneha.'
      },
      {
        id: 'parent_sunita',
        email: 'sunita@speaxa.com',
        phone: '9898980002',
        name: 'Sunita Sharma',
        role: 'parent',
        password_plain: '123456',
        address: 'DLF Phase 3, Gurgaon, Haryana',
        bio: 'Parent of Ananya.'
      },

      // Students
      {
        id: 'student_rohan',
        email: 'rohan@speaxa.com',
        phone: '9990003333',
        name: 'Rohan Rajesh',
        role: 'student',
        password_plain: '123456',
        student_code: 'STU8001',
        board: 'CBSE',
        grade: '8',
        learning_streak: 5,
        address: 'Sector 15, Noida, UP',
        bio: 'Class 8 student who loves algebra and chess.'
      },
      {
        id: 'student_sneha',
        email: 'sneha@speaxa.com',
        phone: '9990003334',
        name: 'Sneha Kumar',
        role: 'student',
        password_plain: '123456',
        student_code: 'STU8002',
        board: 'CBSE',
        grade: '8',
        learning_streak: 4,
        address: 'Sector 15, Noida, UP',
        bio: 'Class 8 student keen on reading and vocabulary.'
      },
      {
        id: 'student_ananya',
        email: 'ananya@speaxa.com',
        phone: '9990004444',
        name: 'Ananya Sunita',
        role: 'student',
        password_plain: '123456',
        student_code: 'STU10001',
        board: 'ICSE',
        grade: '10',
        learning_streak: 12,
        address: 'DLF Phase 3, Gurgaon, Haryana',
        bio: 'Class 10 science-stream aspirant.'
      },
      {
        id: 'student_amit',
        email: 'amit@speaxa.com',
        phone: '9990005555',
        name: 'Amit Kumar',
        role: 'student',
        password_plain: '123456',
        student_code: 'STU9001',
        board: 'CBSE',
        grade: '9',
        learning_streak: 8,
        address: 'Janakpuri, New Delhi',
        bio: 'Class 9 student interested in speech writing and debate.'
      }
    ];

    for (const u of usersToInsert) {
      await db.query(`
        INSERT INTO users (
          id, email, phone, name, role, password_hash, password_plain,
          approval_status, teacher_level, qualification, experience_years,
          subject_expertise, languages, address, bio, rating, total_ratings,
          referral_code, student_code, board, grade, learning_streak
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      `, [
        u.id, u.email, u.phone, u.name, u.role, passwordHash, u.password_plain,
        u.approval_status || 'approved', u.teacher_level || null, u.qualification || null, u.experience_years || 0,
        u.subject_expertise || null, u.languages || null, u.address || null, u.bio || null, u.rating || 5.0, u.total_ratings || 0,
        u.referral_code || null, u.student_code || null, u.board || null, u.grade || null, u.learning_streak || 0
      ]);
    }
    console.log("✓ User accounts seeded.");

    // 2. Link Parents to Students
    await db.query(`
      INSERT INTO parent_student_links (parent_id, student_id, status)
      VALUES 
      ('parent_rajesh', 'student_rohan', 'active'),
      ('parent_rajesh', 'student_sneha', 'active'),
      ('parent_sunita', 'student_ananya', 'active')
    `);
    console.log("✓ Parent-Student links established.");

    // 3. Seed Coupons
    await db.query(`
      INSERT INTO coupons (code, discount_percent, max_uses, used_count, valid_until, is_active)
      VALUES
      ('WELCOME10', 10.00, 500, 50, NOW() + interval '1 year', true),
      ('SPEAXA50', 50.00, 100, 5, NOW() + interval '1 year', true),
      ('FESTIVE25', 25.00, 200, 12, NOW() + interval '1 month', true)
    `);
    console.log("✓ Coupons seeded.");

    // 4. Seed Courses
    await db.query(`
      INSERT INTO courses (id, title, subject, description, duration_weeks, grade, board, fees, thumbnail_url, status, created_by)
      VALUES 
      ('course_physics_10', 'Class 10 Physics: Electromagnetism & Optics', 'Physics', 'Complete study of light, mirrors, electricity and electromagnetism with step-by-step problem sets.', 12, '10', 'CBSE', 5999.00, '/uploads/physics_course.jpg', 'active', 'admin_001'),
      ('course_math_8', 'Class 8 Mathematics: Foundations of Algebra', 'Mathematics', 'Introduction to variables, equations, exponents, and solid numerical geometry definitions.', 12, '8', 'CBSE', 4999.00, '/uploads/math_course.jpg', 'active', 'admin_001'),
      ('course_english_9', 'Class 9 Communicative English', 'English', 'Boost spoken confidence, report writing, essay composition, and advanced structural grammar.', 12, '9', 'CBSE', 2999.00, '/uploads/english_course.jpg', 'active', 'admin_001'),
      ('course_chemistry_10', 'Class 10 Chemistry: Organic Chemistry', 'Chemistry', 'Study of carbon compounds, nomenclature, properties and reaction mechanisms.', 12, '10', 'ICSE', 5499.00, '/uploads/chemistry_course.jpg', 'active', 'admin_001')
    `);
    console.log("✓ Courses seeded.");

    // 5. Seed Course Modules
    await db.query(`
      INSERT INTO course_modules (id, course_id, title, description)
      VALUES
      ('mod_phys_1', 'course_physics_10', 'Reflection of Light', 'Laws of reflection, spherical mirrors, mirror formula and linear magnification.'),
      ('mod_phys_2', 'course_physics_10', 'Refraction of Light', 'Laws of refraction, refractive index, refraction by spherical lenses.'),
      ('mod_math_1', 'course_math_8', 'Linear Equations in One Variable', 'Solving linear equations, applications and word problems.'),
      ('mod_math_2', 'course_math_8', 'Understanding Quadrilaterals', 'Introduction to polygons, angles sum property, and classification of quadrilaterals.'),
      ('mod_eng_1', 'course_english_9', 'Tenses and Speech', 'Present, past, future tenses and conversion from active to passive voice.'),
      ('mod_eng_2', 'course_english_9', 'Formal Essay Writing', 'Structure of descriptive, narrative, and argumentative essays with template guidelines.')
    `);
    console.log("✓ Course modules/sections seeded.");

    // 6. Seed Batches
    await db.query(`
      INSERT INTO batches (id, course_id, teacher_id, batch_name, subject, start_date, end_date, start_time, end_time, days_of_week, capacity, seats_filled, status, agora_channel)
      VALUES
      ('batch_physics_a', 'course_physics_10', 'teacher_sahil', 'Physics Elite Evening Batch', 'Physics', CURRENT_DATE - 15, CURRENT_DATE + 75, '18:00:00', '19:00:00', $1, 20, 1, 'active', 'batch_physics_a_channel'),
      ('batch_math_a', 'course_math_8', 'teacher_priya', 'Math Champions Morning', 'Mathematics', CURRENT_DATE - 10, CURRENT_DATE + 80, '08:00:00', '09:00:00', $2, 20, 2, 'active', 'batch_math_a_channel'),
      ('batch_english_a', 'course_english_9', 'teacher_rahul', 'English Grammar Foundation', 'English', CURRENT_DATE - 5, CURRENT_DATE + 85, '10:00:00', '11:00:00', $3, 20, 1, 'active', 'batch_english_a_channel'),
      ('batch_chem_a', 'course_chemistry_10', 'teacher_neha', 'Chemistry Organic Wonders', 'Chemistry', CURRENT_DATE + 5, CURRENT_DATE + 95, '16:00:00', '17:00:00', $4, 20, 0, 'active', 'batch_chem_a_channel')
    `, [
      ['Monday', 'Wednesday', 'Friday'],
      ['Tuesday', 'Thursday'],
      ['Saturday', 'Sunday'],
      ['Monday', 'Thursday']
    ]);
    console.log("✓ Batches seeded.");

    // 7. Seed Payments
    await db.query(`
      INSERT INTO payments (id, razorpay_order_id, razorpay_payment_id, student_id, batch_id, course_id, teacher_id, amount, platform_share, teacher_share, commission_type, coupon_code, discount_amount, status, payment_method, billing_name, billing_email, billing_phone, referral_teacher_id, created_at)
      VALUES
      ('pay_001', 'order_phy_101', 'pay_phy_101_rec', 'student_ananya', 'batch_physics_a', 'course_physics_10', 'teacher_sahil', 5399.10, 1199.80, 4199.30, 'standard', 'WELCOME10', 599.90, 'captured', 'upi', 'Ananya Sunita', 'ananya@speaxa.com', '9990004444', null, NOW() - interval '10 days'),
      ('pay_002', 'order_mat_201', 'pay_mat_201_rec', 'student_rohan', 'batch_math_a', 'course_math_8', 'teacher_priya', 4999.00, 1999.60, 2999.40, 'standard', null, 0.00, 'captured', 'card', 'Rohan Rajesh', 'rohan@speaxa.com', '9990003333', null, NOW() - interval '5 days'),
      ('pay_003', 'order_mat_202', 'pay_mat_202_rec', 'student_sneha', 'batch_math_a', 'course_math_8', 'teacher_priya', 4749.05, 249.95, 4499.10, 'referral', null, 249.95, 'captured', 'upi', 'Sneha Kumar', 'sneha@speaxa.com', '9990003334', 'teacher_sahil', NOW() - interval '3 days'),
      ('pay_004', 'order_eng_301', 'pay_eng_301_rec', 'student_amit', 'batch_english_a', 'course_english_9', 'teacher_rahul', 2999.00, 1499.50, 1499.50, 'standard', null, 0.00, 'captured', 'netbanking', 'Amit Kumar', 'amit@speaxa.com', '9990005555', null, NOW() - interval '2 days')
    `);
    console.log("✓ Transaction payments seeded.");

    // 8. Seed Refunds
    await db.query(`
      INSERT INTO refunds (id, payment_id, student_id, razorpay_refund_id, amount, reason, status, requested_at, processed_at, processed_by)
      VALUES
      ('ref_001', 'pay_004', 'student_amit', 'rfnd_dummy_123', 500.00, 'Accidental double payment query resolved. Refunding adjustment.', 'processed', NOW() - interval '2 days', NOW() - interval '1 day', 'admin_001')
    `);
    console.log("✓ Refunds seeded.");

    // 9. Seed Student Enrollments
    await db.query(`
      INSERT INTO batch_students (batch_id, student_id, payment_id, status)
      VALUES
      ('batch_physics_a', 'student_ananya', 'pay_001', 'active'),
      ('batch_math_a', 'student_rohan', 'pay_002', 'active'),
      ('batch_math_a', 'student_sneha', 'pay_003', 'active'),
      ('batch_english_a', 'student_amit', 'pay_004', 'active')
    `);
    console.log("✓ Student batch enrollments established.");

    // 10. Seed Teacher Wallets
    await db.query(`
      INSERT INTO teacher_wallet (teacher_id, total_earnings, paid_earnings, pending_earnings, wallet_balance)
      VALUES
      ('teacher_sahil', 9449.20, 5000.00, 4449.20, 4449.20),
      ('teacher_priya', 7498.50, 0.00, 7498.50, 7498.50),
      ('teacher_rahul', 1499.50, 0.00, 1499.50, 1499.50),
      ('teacher_neha', 0.00, 0.00, 0.00, 0.00)
    `);
    console.log("✓ Teacher wallets seeded.");

    // 11. Seed Teacher Wallet Ledgers
    await db.query(`
      INSERT INTO teacher_wallet_ledger (id, teacher_id, amount, type, description, payment_id, referred_user_id, created_at)
      VALUES
      ('tx_s_1', 'teacher_sahil', 4199.30, 'course_share', 'Course fee share from student Ananya Sunita', 'pay_001', null, NOW() - interval '10 days'),
      ('tx_s_2', 'teacher_sahil', 249.90, 'student_referral', 'Student referral bonus for Sneha Kumar', 'pay_003', 'student_sneha', NOW() - interval '3 days'),
      ('tx_s_3', 'teacher_sahil', 5000.00, 'slab_reward', 'Junior Teacher Slab Milestone Reward approved by Admin', null, null, NOW() - interval '4 days'),
      ('tx_s_4', 'teacher_sahil', -5000.00, 'payout_debit', 'Payout withdrawal bank transfer', null, null, NOW() - interval '2 days'),
      
      ('tx_p_1', 'teacher_priya', 2999.40, 'course_share', 'Course fee share from student Rohan Rajesh', 'pay_002', null, NOW() - interval '5 days'),
      ('tx_p_2', 'teacher_priya', 4499.10, 'course_share', 'Course fee share from student Sneha Kumar', 'pay_003', null, NOW() - interval '3 days'),
      
      ('tx_r_1', 'teacher_rahul', 1499.50, 'course_share', 'Course fee share from student Amit Kumar', 'pay_004', null, NOW() - interval '2 days')
    `);
    console.log("✓ Teacher wallet ledger histories seeded.");

    // 12. Seed Payouts
    await db.query(`
      INSERT INTO teacher_payouts (id, teacher_id, amount, bank_account, upi_id, status, admin_notes, requested_at, reviewed_at, paid_at, processed_by, razorpay_payout_id)
      VALUES
      ('payout_s_1', 'teacher_sahil', 5000.00, 'Bank: HDFC | A/C: 50100222333444 | IFSC: HDFC0000123', null, 'paid', 'First payout withdrawal request.', NOW() - interval '3 days', NOW() - interval '2 days', NOW() - interval '2 days', 'admin_001', 'pout_dummy_001'),
      ('payout_s_2', 'teacher_sahil', 5000.00, 'Bank: HDFC | A/C: 50100222333444 | IFSC: HDFC0000123', null, 'requested', null, NOW() - interval '1 day', null, null, null, null),
      ('payout_p_1', 'teacher_priya', 3000.00, null, 'priya@okicici', 'under_review', 'Awaiting compliance doc review.', NOW() - interval '1 day', null, null, null, null)
    `);
    console.log("✓ Teacher payout transfers seeded.");

    // 13. Seed Milestone Rewards
    await db.query(`
      INSERT INTO teacher_rewards (id, teacher_id, slab_name, target_revenue, reward_amount, reward_item, status, admin_notes, achieved_at, processed_at, processed_by)
      VALUES
      ('rew_s_1', 'teacher_sahil', 'Junior Teacher', 100000.00, 5000.00, 'Executive Kit', 'approved', 'Verified and dispatched Executive kit.', NOW() - interval '15 days', NOW() - interval '14 days', 'admin_001'),
      ('rew_s_2', 'teacher_sahil', 'Assistant Teacher', 300000.00, 25000.00, 'Tablet (25K)', 'pending_review', null, NOW() - interval '1 day', null, null)
    `);
    console.log("✓ Teacher level milestone rewards claims seeded.");

    // 14. Seed Grooming Allowances
    await db.query(`
      INSERT INTO teacher_allowances (id, teacher_id, group_name, allowance_amount, payment_month, status, paid_at)
      VALUES
      ('allow_s_1', 'teacher_sahil', 'Academic Excellence Group', 10000.00, '2026-05', 'paid', NOW() - interval '20 days'),
      ('allow_s_2', 'teacher_sahil', 'Academic Excellence Group', 10000.00, '2026-06', 'pending', null),
      ('allow_p_1', 'teacher_priya', 'Teaching Excellence Group', 5000.00, '2026-06', 'paid', NOW() - interval '1 day')
    `);
    console.log("✓ Teacher monthly grooming allowances statement logs seeded.");

    // 15. Seed Documents
    await db.query(`
      INSERT INTO teacher_documents (id, teacher_id, doc_type, file_url, original_name)
      VALUES
      ('doc_s_1', 'teacher_sahil', 'aadhaar', '/uploads/aadhaar_sahil.jpg', 'sahil_aadhaar_front.jpg'),
      ('doc_s_2', 'teacher_sahil', 'pan', '/uploads/pan_sahil.jpg', 'sahil_pan.jpg'),
      ('doc_p_1', 'teacher_priya', 'aadhaar', '/uploads/aadhaar_priya.jpg', 'priya_aadhaar_full.jpg'),
      ('doc_p_2', 'teacher_priya', 'resume', '/uploads/resume_priya.pdf', 'priya_cv.pdf')
    `);
    console.log("✓ Teacher documents database records seeded.");

    // 16. Seed SOP Compliance
    await db.query(`
      INSERT INTO teacher_sop (
        id, teacher_id, camera_sop_url, lighting_sop_url, audio_sop_url, internet_proof_url, demo_teaching_url,
        camera_checklist, lighting_checklist, audio_checklist, internet_checklist, teaching_checklist,
        status, admin_notes, reviewed_by, reviewed_at, teacher_checklist, agreement_signed, agreement_signed_at, digital_signature
      ) VALUES (
        'sop_sahil', 'teacher_sahil', '/uploads/cam_s.jpg', '/uploads/light_s.jpg', '/uploads/audio_s.mp3', '/uploads/speed_s.jpg', '/uploads/demo_s.mp4',
        '{"face_visible":true,"stable_camera":true,"eye_level":true,"proper_framing":true}', 
        '{"proper_lighting":true,"no_backlight":true,"clear_background":true}',
        '{"clear_voice":true,"no_noise":true}',
        '{"stable_connection":true,"speed_proof":true}',
        '{"communication":true,"engagement":true,"presentation":true}',
        'approved', 'All teaching setups verified. High speed fiber link.', 'admin_001', NOW() - interval '20 days',
        '{"read_guidelines":true}', true, NOW() - interval '20 days', 'Sahil Khan'
      ), (
        'sop_priya', 'teacher_priya', '/uploads/cam_p.jpg', '/uploads/light_p.jpg', '/uploads/audio_p.mp3', '/uploads/speed_p.jpg', '/uploads/demo_p.mp4',
        '{"face_visible":true,"stable_camera":true,"eye_level":true,"proper_framing":true}', 
        '{"proper_lighting":true,"no_backlight":true,"clear_background":true}',
        '{"clear_voice":true,"no_noise":true}',
        '{"stable_connection":true,"speed_proof":true}',
        '{"communication":true,"engagement":true,"presentation":true}',
        'approved', 'Verified and compliant.', 'admin_001', NOW() - interval '15 days',
        '{"read_guidelines":true}', true, NOW() - interval '15 days', 'Priya Sharma'
      ), (
        'sop_rahul', 'teacher_rahul', '/uploads/cam_r.jpg', '/uploads/light_r.jpg', null, null, null,
        '{"face_visible":false,"stable_camera":false,"eye_level":false,"proper_framing":false}', 
        '{"proper_lighting":false,"no_backlight":false,"clear_background":false}',
        '{"clear_voice":false,"no_noise":false}',
        '{"stable_connection":false,"speed_proof":false}',
        '{"communication":false,"engagement":false,"presentation":false}',
        'sop_pending', 'SOP media pending upload.', null, null,
        '{}', false, null, null
      )
    `);
    console.log("✓ Teacher SOP setups and audit checklist reviews seeded.");

    // 17. Seed Teacher Level History
    await db.query(`
      INSERT INTO teacher_levels (id, teacher_id, level, previous_level, changed_by, reason)
      VALUES
      ('lvl_s1', 'teacher_sahil', 'Junior Teacher', 'Bronze', 'admin_001', 'Initial onboarding verification approved'),
      ('lvl_s2', 'teacher_sahil', 'Professor', 'Junior Teacher', 'admin_001', 'Manual profile upgrade to match verified institutional experience'),
      ('lvl_p1', 'teacher_priya', 'Senior Teacher', 'Bronze', 'admin_001', 'Onboarding verified')
    `);
    console.log("✓ Teacher level configuration and upgrade history logs seeded.");

    // 18. Seed Live Classes
    await db.query(`
      INSERT INTO live_classes (id, batch_id, teacher_id, title, class_date, class_time, agora_channel, status, started_at, ended_at, duration_mins, recording_url)
      VALUES
      ('live_class_s1', 'batch_physics_a', 'teacher_sahil', 'Reflection Laws and Ray Diagrams', CURRENT_DATE - 2, '18:00:00', 'batch_physics_a_channel', 'ended', NOW() - interval '2 days' - interval '1 hour', NOW() - interval '2 days', 60, 'https://www.w3schools.com/html/mov_bbb.mp4'),
      ('live_class_s2', 'batch_physics_a', 'teacher_sahil', 'Refraction through Prism and Glass Slab', CURRENT_DATE + 1, '18:00:00', 'batch_physics_a_channel', 'scheduled', null, null, 0, null),
      ('live_class_p1', 'batch_math_a', 'teacher_priya', 'Linear Equations Intro', CURRENT_DATE - 3, '08:00:00', 'batch_math_a_channel', 'ended', NOW() - interval '3 days' - interval '1 hour', NOW() - interval '3 days', 60, 'https://www.w3schools.com/html/mov_bbb.mp4'),
      ('live_class_p2', 'batch_math_a', 'teacher_priya', 'Linear Equations Exercise 1.1 & 1.2', CURRENT_DATE + 1, '08:00:00', 'batch_math_a_channel', 'scheduled', null, null, 0, null)
    `);
    console.log("✓ Live classes sessions list seeded.");

    // 19. Seed Live Class Participants
    await db.query(`
      INSERT INTO class_participants (class_id, batch_id, user_id, role, join_time, exit_time, duration_mins)
      VALUES
      ('live_class_s1', 'batch_physics_a', 'teacher_sahil', 'teacher', NOW() - interval '2 days' - interval '1 hour', NOW() - interval '2 days', 60),
      ('live_class_s1', 'batch_physics_a', 'student_ananya', 'student', NOW() - interval '2 days' - interval '58 minutes', NOW() - interval '2 days', 58),
      ('live_class_p1', 'batch_math_a', 'teacher_priya', 'teacher', NOW() - interval '3 days' - interval '1 hour', NOW() - interval '3 days', 60),
      ('live_class_p1', 'batch_math_a', 'student_rohan', 'student', NOW() - interval '3 days' - interval '55 minutes', NOW() - interval '3 days', 55),
      ('live_class_p1', 'batch_math_a', 'student_sneha', 'student', NOW() - interval '3 days' - interval '60 minutes', NOW() - interval '3 days', 60)
    `);
    console.log("✓ Live classes attendees join/exit participant log seeded.");

    // 20. Seed Student Attendance
    await db.query(`
      INSERT INTO attendance (id, class_id, batch_id, student_id, teacher_id, join_time, exit_time, duration_mins, class_duration_mins, status, attendance_date)
      VALUES
      ('att_s1_ananya', 'live_class_s1', 'batch_physics_a', 'student_ananya', 'teacher_sahil', NOW() - interval '2 days' - interval '58 minutes', NOW() - interval '2 days', 58, 60, 'present', CURRENT_DATE - 2),
      ('att_p1_rohan', 'live_class_p1', 'batch_math_a', 'student_rohan', 'teacher_priya', NOW() - interval '3 days' - interval '55 minutes', NOW() - interval '3 days', 55, 60, 'present', CURRENT_DATE - 3),
      ('att_p1_sneha', 'live_class_p1', 'batch_math_a', 'student_sneha', 'teacher_priya', NOW() - interval '3 days' - interval '60 minutes', NOW() - interval '3 days', 60, 60, 'present', CURRENT_DATE - 3)
    `);
    console.log("✓ Student attendance metrics seeded.");

    // 21. Seed Class Recordings
    await db.query(`
      INSERT INTO recordings (id, class_id, batch_id, title, recording_url, duration_mins, file_size_mb, thumbnail_url, is_available)
      VALUES
      ('rec_s1', 'live_class_s1', 'batch_physics_a', 'Reflection Laws and Ray Diagrams - Class Recording', 'https://www.w3schools.com/html/mov_bbb.mp4', 60, 220.4, '/uploads/physics_thumb.jpg', true),
      ('rec_p1', 'live_class_p1', 'batch_math_a', 'Linear Equations Intro - Class Recording', 'https://www.w3schools.com/html/mov_bbb.mp4', 60, 198.5, '/uploads/math_thumb.jpg', true)
    `);
    console.log("✓ Playback recordings library seeded.");

    // 22. Seed Class Polls
    await db.query(`
      INSERT INTO class_polls (id, class_id, teacher_id, question, options, correct_option, is_active)
      VALUES
      ('poll_s1', 'live_class_s1', 'teacher_sahil', 'A light ray falls normally on a plane mirror. The angle of reflection is:', '["0 degrees", "90 degrees", "45 degrees", "180 degrees"]', 0, false),
      ('poll_p1', 'live_class_p1', 'teacher_priya', 'Solve for y: 3y - 7 = 8', '["y = 5", "y = 3", "y = 15", "y = 1"]', 0, false)
    `);
    console.log("✓ Live class MCQs polls seeded.");

    // 23. Seed Class Poll Responses
    await db.query(`
      INSERT INTO class_poll_responses (poll_id, student_id, selected_option)
      VALUES
      ('poll_s1', 'student_ananya', 0),
      ('poll_p1', 'student_rohan', 0),
      ('poll_p1', 'student_sneha', 1)
    `);
    console.log("✓ MCQ poll responses seeded.");

    // 24. Seed Assignments
    await db.query(`
      INSERT INTO assignments (id, batch_id, teacher_id, title, description, file_url, due_date, max_marks, status)
      VALUES
      ('assign_s1', 'batch_physics_a', 'teacher_sahil', 'Optics Chapter 1 Ray Diagram Drawings', 'Draw ray diagrams for concave and convex mirrors when object is at C, F, Infinity.', '/uploads/optics_assign_1.pdf', NOW() + interval '5 days', 50, 'active'),
      ('assign_p1', 'batch_math_a', 'teacher_priya', 'Linear Equations Exercise 1.1 Worksheet', 'Submit solved answers for Q1 to Q15 in PDF format.', '/uploads/math_equations_assign.pdf', NOW() + interval '3 days', 100, 'active')
    `);
    console.log("✓ Assignments sheets seeded.");

    // 25. Seed Assignment Submissions
    await db.query(`
      INSERT INTO assignment_submissions (id, assignment_id, student_id, file_url, notes, submitted_at, marks_obtained, feedback, graded_by, graded_at, status)
      VALUES
      ('sub_s1_ananya', 'assign_s1', 'student_ananya', '/uploads/ananya_optics_sol.pdf', 'Here is my assignment sir.', NOW() - interval '1 day', null, null, null, null, 'submitted'),
      ('sub_p1_rohan', 'assign_p1', 'student_rohan', '/uploads/rohan_math_sol.pdf', 'Attached solved worksheet.', NOW() - interval '2 days', 95, 'Brilliant presentation, all answers are correct.', 'teacher_priya', NOW() - interval '1 day', 'graded')
    `);
    console.log("✓ Student assignment uploads and grades logs seeded.");

    // 26. Seed Teacher Analytics Observations
    await db.query(`
      INSERT INTO student_observations (id, student_id, teacher_id, batch_id, class_id, observation_date, curiosity, understanding, consistency, communication, observation_score, participation, discipline, notes)
      VALUES
      ('obs_s1', 'student_ananya', 'teacher_sahil', 'batch_physics_a', 'live_class_s1', CURRENT_DATE - 2, 90.0, 88.0, 95.0, 90.0, 91.0, 90.0, 95.0, 'Ananya is brilliant. She was the first to answer the class poll and showed keen interest in refractive index.'),
      ('obs_p1', 'student_rohan', 'teacher_priya', 'batch_math_a', 'live_class_p1', CURRENT_DATE - 3, 85.0, 80.0, 88.0, 82.0, 83.0, 85.0, 88.0, 'Rohan participated actively and solved problems on the virtual board.')
    `);
    console.log("✓ Teacher analytics observations seeded.");

    // 27. Seed Monthly Performance Reports
    await db.query(`
      INSERT INTO monthly_reports (id, student_id, batch_id, teacher_id, report_month, attendance_pct, interaction_score, curiosity_score, assignment_completion, communication_growth, avg_observation_score, weak_topics, strong_topics, improvement_trend, overall_grade, teacher_remarks)
      VALUES
      ('rep_rohan_may', 'student_rohan', 'batch_math_a', 'teacher_priya', '2026-05', 95.00, 85.00, 80.00, 100.00, 82.00, 84.40, ARRAY['Word problems on linear equations'], ARRAY['Solving basic algebraic expressions'], 'improving', 'A', 'Rohan shows great interest in math. Word problems require slightly more practice.'),
      ('rep_ananya_may', 'student_ananya', 'batch_physics_a', 'teacher_sahil', '2026-05', 100.00, 92.00, 90.00, 100.00, 88.00, 90.00, ARRAY['Light refraction mathematics'], ARRAY['Concave mirror ray diagrams'], 'stable', 'A+', 'Outstanding student. Conceptual clarity is top notch.')
    `);
    console.log("✓ Monthly progress reports generated.");

    // 28. Seed In-App Notifications
    await db.query(`
      INSERT INTO notifications (id, title, message, target_role, target_user, type, is_read, is_active, sent_by)
      VALUES
      ('notif_1', 'Agora Server Upgraded', 'Agora live stream servers have been upgraded to support full HD 1080p.', 'all', null, 'info', false, true, 'admin_001'),
      ('notif_2', 'Payout Disbursed', 'Your payout request for ₹5,000 has been successfully processed.', 'teacher', 'teacher_sahil', 'success', false, true, 'admin_001'),
      ('notif_3', 'Homework Due Tomorrow', 'Your math worksheet submission is due in 24 hours.', 'student', 'student_rohan', 'warning', false, true, null)
    `);
    console.log("✓ Dashboard system alerts and in-app notifications seeded.");

    // 29. Seed OTP, FCM & Refresh Tokens
    await db.query(`
      INSERT INTO otp_tokens (identifier, otp, purpose, expires_at, used)
      VALUES
      ('rohan@speaxa.com', '1234', 'login', NOW() + interval '10 minutes', false)
    `);
    await db.query(`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES
      ('student_rohan', 'dummy_refresh_token_rohan_123', NOW() + interval '7 days')
    `);
    await db.query(`
      INSERT INTO fcm_tokens (user_id, token, device_type)
      VALUES
      ('student_rohan', 'dummy_fcm_token_rohan_abc', 'web')
    `);
    console.log("✓ Session and authentication tokens seeded.");

    // 30. Seed Study Materials
    await db.query(`
      INSERT INTO study_materials (id, title, description, course_id, batch_id, teacher_id, file_url, file_type)
      VALUES
      ('mat_s1', 'Concave Mirror ray diagrams study card', 'Printable summary sheet of all object placements.', 'course_physics_10', 'batch_physics_a', 'teacher_sahil', '/uploads/mirror_study_card.pdf', 'pdf'),
      ('mat_p1', 'Formulas for Linear Equations', 'All variables shifting and signs inversion guidelines.', 'course_math_8', 'batch_math_a', 'teacher_priya', '/uploads/linear_equations_formulas.pdf', 'pdf')
    `);
    console.log("✓ Reference study materials PDFs seeded.");

    // 31. Seed Support Tickets & Replies
    await db.query(`
      INSERT INTO support_tickets (id, user_id, subject, description, status, priority)
      VALUES
      ('tick_001', 'teacher_sahil', 'Agora token generation timed out', 'During my live session class yesterday, I faced a token expired error code.', 'resolved', 'high'),
      ('tick_002', 'parent_rajesh', 'Rohan spelling mistake in profile name', 'Could you please edit Rohan Rajesh to Rohan Kumar?', 'open', 'normal')
    `);
    await db.query(`
      INSERT INTO support_replies (ticket_id, user_id, message)
      VALUES
      ('tick_001', 'admin_001', 'Hello Sahil, we have checked the token TTL settings and increased it to 24 hours. The problem should not recur.')
    `);
    console.log("✓ Helpdesk support tickets and administrator replies seeded.");

    // 32. Seed Audit Trail Logs
    await db.query(`
      INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, target_type, target_id, target_name, details, ip_address, user_agent)
      VALUES
      ('admin_001', 'Super Admin', 'admin', 'TEACHER_LEVEL_CHANGED', 'user', 'teacher_sahil', 'Sahil Khan', '{"new_level": "Professor", "previous_level": "Bronze", "reason": "Manual override for verified institutional experience"}', '127.0.0.1', 'Mozilla/5.0'),
      ('teacher_priya', 'Priya Sharma', 'teacher', 'BATCH_CREATED', 'batch', 'batch_math_a', 'Math Champions Morning', '{"course_id": "course_math_8"}', '127.0.0.1', 'Mozilla/5.0')
    `);
    console.log("✓ System operational logs and audit trail seeded.");

    // 33. Seed Teacher Certificates
    await db.query(`
      INSERT INTO teacher_certificates (id, teacher_id, certificate_type, title, description, metadata)
      VALUES
      ('cert_s1', 'teacher_sahil', 'SOP_COMPLIANCE', 'SOP setup compliance verified', 'This certificate acknowledges that teacher Sahil Khan has successfully set up audio, video, lighting and demo class under SPEAXA standards.', '{"approved_by": "admin_001"}'),
      ('cert_p1', 'teacher_priya', 'SOP_COMPLIANCE', 'SOP setup compliance verified', 'This certificate acknowledges that teacher Priya Sharma has successfully set up audio, video, lighting and demo class under SPEAXA standards.', '{"approved_by": "admin_001"}')
    `);
    console.log("✓ Teacher SOP milestone compliance certificates seeded.");

    console.log("\n🎉 ALL PANELS AND MODULE DATA SEEDED SUCCESSFULLY! 🎉");

  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    process.exit(0);
  }
}

seedData();
