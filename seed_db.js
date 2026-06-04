const db = require('./src/db');

async function seed() {
  console.log('Starting Speaxsa database seeding...');
  try {
    // Truncate tables first
    await db.query('TRUNCATE TABLE suggested_courses CASCADE');
    await db.query('TRUNCATE TABLE live_class_attendance CASCADE');
    await db.query('TRUNCATE TABLE course_modules CASCADE');
    await db.query('TRUNCATE TABLE study_materials CASCADE');
    await db.query('TRUNCATE TABLE payments CASCADE');
    await db.query('TRUNCATE TABLE notifications CASCADE');
    await db.query('TRUNCATE TABLE live_classes CASCADE');
    await db.query('TRUNCATE TABLE coupons CASCADE');
    await db.query('TRUNCATE TABLE platform_settings CASCADE');
    await db.query('TRUNCATE TABLE payouts CASCADE');
    await db.query('TRUNCATE TABLE support_tickets CASCADE');
    await db.query('TRUNCATE TABLE student_behavior_ratings CASCADE');
    await db.query('TRUNCATE TABLE attendance_records CASCADE');
    await db.query('TRUNCATE TABLE batches CASCADE');
    await db.query('TRUNCATE TABLE courses CASCADE');
    await db.query('TRUNCATE TABLE users CASCADE');

    console.log('Tables truncated successfully.');

    // 1. Insert Users
    const passwordHash = '3bd546abbb1369e3d5e38db529c5f3000e7703ed3be72bc5979bc5a710c9eca3'; // speaxsa123
    const adminPasswordHash = 'c6901878f0b181c00f68d374465aa5ff114e9e048a1d7cf9cc1a9675276686e0'; // 123456 (admin password hash in database)

    await db.query(`
      INSERT INTO users (id, email, name, phone, role, qualification, experience_years, photo_url, rating, approval_status, password_hash, password_plain, learning_streak, board) VALUES
      ('teach_1', 'ananya@speaxsa.com', 'Dr. Ananya Sharma', '+91 99999 88888', 'teacher', 'PhD in Physics', 12, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya', 4.90, 'approved', $1, 'speaxsa123', 0, NULL),
      ('teach_pending', 'sanjay@speaxsa.com', 'Sanjay Dutta', '+91 91111 22222', 'teacher', 'M.Sc. Mathematics, B.Ed.', 6, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sanjay', 0.00, 'pending', $1, 'speaxsa123', 0, NULL),
      ('stud_1', 'rahul@gmail.com', 'Rahul Kumar', '+91 98765 43210', 'student', 'Class 10', 0, 'https://api.dicebear.com/7.x/adventurer/svg?seed=Rahul', 5.00, 'approved', $1, 'speaxsa123', 5, 'CBSE'),
      ('parent_1', 'anil@gmail.com', 'Anil Kumar (Rahul''s Father)', '+91 88888 77777', 'parent', 'Guardian', 0, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anil', 5.00, 'approved', $1, 'speaxsa123', 0, NULL),
      ('admin_1', 'admin@speaxsa.com', 'Platform Admin', '+91 77777 66666', 'admin', 'System Engineer', 5, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', 5.00, 'approved', $2, '123456', 0, NULL)
    `, [passwordHash, adminPasswordHash]);

    console.log('Users seeded.');

    // 2. Insert Courses
    await db.query(`
      INSERT INTO courses (id, title, description, grade, board, price) VALUES
      ('c_1', 'Class 10 Physics: Electromagnetism & Light', 'Learn complete electromagnetic wave behavior and optical lenses.', 'Class 10', 'CBSE', 499.00),
      ('c_2', 'Class 12 Chemistry: Organic Reactions', 'Master mechanisms of ether synthesis and benzene structures.', 'Class 12', 'CBSE', 699.00),
      ('c_3', 'Class 10 Mathematics: Trigonometry', 'Master complex trigonometric equations, height & distance calculations.', 'Class 10', 'CBSE', 399.00)
    `);

    console.log('Courses seeded.');

    // 3. Insert Batches
    await db.query(`
      INSERT INTO batches (id, course_id, course_title, teacher_name, teacher_id, start_time, start_date, days_of_week, capacity, seats_filled, is_upcoming, approval_status, subject, schedule, time_slot, active) VALUES
      ('b_1', 'c_1', 'Class 10 Physics: Electromagnetism & Light', 'Dr. Ananya Sharma', 'teach_1', '06:00 PM - 07:30 PM', 'June 10, 2026', 'Mon, Wed, Fri', 40, 2, true, 'approved', 'Physics', 'Mon, Wed, Fri', '06:00 PM - 07:30 PM', true),
      ('b_2', 'c_2', 'Class 12 Chemistry: Organic Reactions', 'Dr. Ananya Sharma', 'teach_1', '04:00 PM - 05:30 PM', 'June 11, 2026', 'Tue, Thu, Sat', 40, 0, true, 'approved', 'Chemistry', 'Tue, Thu, Sat', '04:00 PM - 05:30 PM', true),
      ('b_3', 'c_3', 'Class 10 Mathematics: Trigonometry', 'Dr. Ananya Sharma', 'teach_1', '05:00 PM - 06:30 PM', 'June 12, 2026', 'Mon, Wed, Fri', 30, 0, true, 'approved', 'Mathematics', 'Mon, Wed, Fri', '05:00 PM - 06:30 PM', true)
    `);

    console.log('Batches seeded.');

    // 4. Insert Attendance Records
    await db.query(`
      INSERT INTO attendance_records (id, student_id, student_name, teacher_id, course_title, date, status, session_duration_minutes, poll_participation_count, chat_messages_count, engagement_alert_flag) VALUES
      ('a_1', 'stud_1', 'Rahul Kumar', 'teach_1', 'Class 10 Physics: Electromagnetism & Light', 'May 19, 2026', 'present', 92, 5, 12, NULL),
      ('a_2', 'stud_1', 'Rahul Kumar', 'teach_1', 'Class 10 Physics: Electromagnetism & Light', 'May 17, 2026', 'absent', 0, 0, 0, 'Absent'),
      ('a_3', 'stud_1', 'Rahul Kumar', 'teach_1', 'Class 10 Physics: Electromagnetism & Light', 'May 15, 2026', 'lateJoin', 75, 2, 6, NULL)
    `);

    // 5. Insert Student Behavior Ratings
    await db.query(`
      INSERT INTO student_behavior_ratings (id, student_id, student_name, teacher_id, date, feedback, curiosity, concentration, confidence, communication, consistency, participation, discipline) VALUES
      ('r_1', 'stud_1', 'Rahul Kumar', 'teach_1', 'May 19, 2026', 'Rahul is highly inquisitive but loses focus during late slides.', 8.50, 6.00, 8.00, 7.50, 7.00, 8.00, 9.00)
    `);

    // 6. Insert Platform Settings
    const adBannersJson = JSON.stringify([
      {
        title: "JEE/NEET Olympiad Batch",
        description: "Ace Physics & Math Olympiads with top IIT mentors. 30% discount this week!",
        image_url: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800",
        link: "/enrollment"
      },
      {
        title: "Organic Chemistry Masterclass",
        description: "Join Dr. Ananya Sharma this Sunday at 10 AM to master organic reaction mechanisms.",
        image_url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800",
        link: "/enrollment"
      }
    ]);

    await db.query(`
      INSERT INTO platform_settings (key, value) VALUES
      ('logo_text', 'Speaxsa'),
      ('logo_url', '/admin/logo.png'),
      ('announcement', 'Welcome to the Speaxsa Administrator Portal!'),
      ('razorpay_key_id', 'demo_key_id'),
      ('razorpay_key_secret', 'demo_key_secret'),
      ('agora_app_id', 'demo_agora_app_id'),
      ('agora_app_certificate', 'demo_agora_app_certificate'),
      ('ad_banners', $1)
    `, [adBannersJson]);

    console.log('Settings seeded.');

    // 7. Insert Notifications
    await db.query(`
      INSERT INTO notifications (id, title, message, target_role, is_active) VALUES
      ('notif_1', 'Summer Schedule Update', 'Starting next month, all batches will begin 30 minutes earlier.', 'all', true),
      ('notif_2', 'Physics Practice Sheet Uploaded', 'Electromagnetism Lecture Slides are uploaded in Study Materials.', 'student', true)
    `);

    // 8. Insert Payments
    await db.query(`
      INSERT INTO payments (id, student_id, student_name, course_title, amount, status, teacher_id, batch_id) VALUES
      ('pay_1', 'stud_1', 'Rahul Kumar', 'Class 10 Physics: Electromagnetism & Light', 499.00, 'Success', 'teach_1', 'b_1')
    `);

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
