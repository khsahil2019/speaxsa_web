-- ============================================================
-- SPEAXSA DATABASE SEED DATA (Matches API expectations)
-- Import: PGPASSWORD="YOUR_PASSWORD" psql -U speaxsa_user -h localhost -d speaxsa -f seed.sql
-- ============================================================

-- Clean up any existing records
TRUNCATE TABLE suggested_courses CASCADE;
TRUNCATE TABLE live_class_attendance CASCADE;
TRUNCATE TABLE course_modules CASCADE;
TRUNCATE TABLE study_materials CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE live_classes CASCADE;
TRUNCATE TABLE coupons CASCADE;
TRUNCATE TABLE platform_settings CASCADE;
TRUNCATE TABLE payouts CASCADE;
TRUNCATE TABLE support_tickets CASCADE;
TRUNCATE TABLE student_behavior_ratings CASCADE;
TRUNCATE TABLE attendance_records CASCADE;
TRUNCATE TABLE batches CASCADE;
TRUNCATE TABLE courses CASCADE;
TRUNCATE TABLE users CASCADE;

-- 1. Insert Users (Password is 'speaxsa123' hashed with Speaxsa salt)
INSERT INTO users (id, email, name, phone, role, qualification, experience_years, photo_url, rating, approval_status, password_hash) VALUES
  ('teach_1', 'ananya@Speaxsa.com', 'Dr. Ananya Sharma', '+91 99999 88888', 'teacher', 'PhD in Physics', 12, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya', 4.90, 'approved', '3bd546abbb1369e3d5e38db529c5f3000e7703ed3be72bc5979bc5a710c9eca3'),
  ('teach_pending', 'sanjay@Speaxsa.com', 'Sanjay Dutta', '+91 91111 22222', 'teacher', 'M.Sc. Mathematics, B.Ed.', 6, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sanjay', 0.00, 'pending', '3bd546abbb1369e3d5e38db529c5f3000e7703ed3be72bc5979bc5a710c9eca3'),
  ('stud_1', 'rahul@gmail.com', 'Rahul Kumar', '+91 98765 43210', 'student', 'Class 10 Student', 0, 'https://api.dicebear.com/7.x/adventurer/svg?seed=Rahul', 5.00, 'approved', '3bd546abbb1369e3d5e38db529c5f3000e7703ed3be72bc5979bc5a710c9eca3'),
  ('parent_1', 'anil@gmail.com', 'Anil Kumar (Rahul''s Father)', '+91 88888 77777', 'parent', 'Guardian', 0, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anil', 5.00, 'approved', '3bd546abbb1369e3d5e38db529c5f3000e7703ed3be72bc5979bc5a710c9eca3'),
  ('admin_1', 'admin@Speaxsa.com', 'Platform Admin', '+91 77777 66666', 'admin', 'System Engineer', 5, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', 5.00, 'approved', '3bd546abbb1369e3d5e38db529c5f3000e7703ed3be72bc5979bc5a710c9eca3');

-- 2. Insert Courses
INSERT INTO courses (id, title, description, grade, board, price) VALUES
  ('c_1', 'Class 10 Physics: Electromagnetism & Light', 'Learn complete electromagnetic wave behavior and optical lenses.', 'Class 10', 'CBSE', 499.00),
  ('c_2', 'Class 12 Chemistry: Organic Reactions', 'Master mechanisms of ether synthesis and benzene structures.', 'Class 12', 'CBSE', 699.00);

-- 3. Insert Batches
INSERT INTO batches (id, course_id, course_title, teacher_name, teacher_id, start_time, start_date, days_of_week, capacity, seats_filled, is_upcoming, approval_status, subject, schedule, time_slot, active) VALUES
  ('b_1', 'c_1', 'Class 10 Physics: Electromagnetism & Light', 'Dr. Ananya Sharma', 'teach_1', '06:00 PM - 07:30 PM', 'May 25, 2026', 'Mon, Wed, Fri', 40, 28, true, 'approved', 'Physics', 'Mon, Wed, Fri', '06:00 PM - 07:30 PM', true),
  ('b_2', 'c_2', 'Class 12 Chemistry: Organic Reactions', 'Dr. Ananya Sharma', 'teach_1', '04:00 PM - 05:30 PM', 'May 26, 2026', 'Tue, Thu, Sat', 40, 12, true, 'approved', 'Chemistry', 'Tue, Thu, Sat', '04:00 PM - 05:30 PM', true);

-- 4. Insert Attendance Records
INSERT INTO attendance_records (id, student_id, student_name, teacher_id, course_title, date, status, session_duration_minutes, poll_participation_count, chat_messages_count, engagement_alert_flag) VALUES
  ('a_1', 'stud_1', 'Rahul Kumar', 'teach_1', 'Class 10 Physics: Electromagnetism & Light', 'May 19, 2026', 'present', 92, 5, 12, NULL),
  ('a_2', 'stud_1', 'Rahul Kumar', 'teach_1', 'Class 10 Physics: Electromagnetism & Light', 'May 17, 2026', 'absent', 0, 0, 0, 'Absent'),
  ('a_3', 'stud_1', 'Rahul Kumar', 'teach_1', 'Class 10 Physics: Electromagnetism & Light', 'May 15, 2026', 'lateJoin', 75, 2, 6, NULL);

-- 5. Insert Student Behavior Ratings
INSERT INTO student_behavior_ratings (id, student_id, student_name, teacher_id, date, feedback, curiosity, concentration, confidence, communication, consistency, participation, discipline) VALUES
  ('r_1', 'stud_1', 'Rahul Kumar', 'teach_1', 'May 19, 2026', 'Rahul is highly inquisitive but loses focus during late slides.', 8.50, 6.00, 8.00, 7.50, 7.00, 8.00, 9.00);

-- 6. Insert Support Tickets
INSERT INTO support_tickets (id, user_id, user_name, user_role, subject, description, status, replies, created_at) VALUES
  ('t_1', 'stud_1', 'Rahul Kumar', 'student', 'Video frame drop in B1 stream', 'I am experiencing frame drops and lag on the Delhi-2 CDN server route.', 'Pending', '{}'::text[], 'May 20, 2026');

-- 7. Insert Payouts
INSERT INTO payouts (id, teacher_id, amount, status, created_at) VALUES
  ('pay_out_1', 'teach_1', 15000.00, 'Success', NOW() - INTERVAL '5 days'),
  ('pay_out_2', 'teach_1', 12000.00, 'Success', NOW() - INTERVAL '15 days');

-- 8. Insert Platform Settings
INSERT INTO platform_settings (key, value) VALUES
  ('logo_text', 'Speaxsa'),
  ('logo_url', '/admin/logo.png'),
  ('announcement', 'Welcome to the Speaxsa Administrator Portal!'),
  ('razorpay_key_id', 'demo_key_id'),
  ('razorpay_key_secret', 'demo_key_secret'),
  ('agora_app_id', 'demo_agora_app_id'),
  ('agora_app_certificate', 'demo_agora_app_certificate'),
  ('ad_banners', '[{"title": "JEE/NEET Olympiad Batch", "description": "Ace Physics & Math Olympiads with top IIT mentors. 30% discount this week!", "image_url": "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800", "link": "/enrollment"}, {"title": "Organic Chemistry Masterclass", "description": "Join Dr. Ananya Sharma this Sunday at 10 AM to master organic reaction mechanisms.", "image_url": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800", "link": "/enrollment"}]');

-- 9. Insert Coupons
INSERT INTO coupons (code, discount_percent, valid_until, is_active) VALUES
  ('SPEAXSA50', 50.00, '2026-12-31', true),
  ('WELCOME10', 10.00, '2026-06-30', true);

-- 10. Insert Live Classes
INSERT INTO live_classes (id, batch_id, title, class_date, class_time, status) VALUES
  ('live_1', 'b_1', 'Introduction to Electromagnetism', '2026-05-25', '06:00 PM', 'scheduled'),
  ('live_2', 'b_2', 'Mastering Alkene Reactions', '2026-05-26', '04:00 PM', 'scheduled');

-- 11. Insert Notifications
INSERT INTO notifications (id, title, message, target_role, is_active) VALUES
  ('notif_1', 'Summer Schedule Update', 'Starting next month, all batches will begin 30 minutes earlier.', 'all', true);

-- 12. Insert Payments
INSERT INTO payments (id, student_id, student_name, course_title, amount, status, created_at) VALUES
  ('pay_1', 'stud_1', 'Rahul Kumar', 'Class 10 Physics: Electromagnetism & Light', 499.00, 'Success', NOW() - INTERVAL '3 days');

-- 13. Insert Study Materials
INSERT INTO study_materials (id, title, description, course_id, batch_id, file_url) VALUES
  ('doc_1', 'Electromagnetism Lecture Slides', 'Comprehensive slide deck for Class 10 Physics.', 'c_1', 'b_1', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');

-- 14. Insert Course Modules
INSERT INTO course_modules (id, course_id, title, description) VALUES
  ('mod_1', 'c_1', 'Chapter 1: Magnetic Fields', 'Introduction to magnetic forces, fields, and flux lines.'),
  ('mod_2', 'c_1', 'Chapter 2: Induction', 'Faraday''s Law, Lenz''s Law, and basic generators.');
