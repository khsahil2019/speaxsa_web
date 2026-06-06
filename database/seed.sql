-- ============================================================
-- SPEAXSA PLATFORM — SEED DATA
-- Run AFTER schema.sql
-- ============================================================

-- Commission config defaults
INSERT INTO commission_config (commission_type, teacher_pct, platform_pct, description) VALUES
  ('standard', 50.00, 50.00, 'Standard student enrollment - 50/50 split'),
  ('referral', 70.00, 30.00, 'Teacher-referred student - teacher gets 70%'),
  ('elite', 75.00, 25.00, 'Elite Mentor custom rate - 75% teacher share')
ON CONFLICT (commission_type) DO NOTHING;

-- Platform settings defaults
INSERT INTO platform_settings (key, value) VALUES
  ('logo_text', 'SPEAXSA'),
  ('logo_url', '/admin/logo.png'),
  ('announcement', 'Welcome to SPEAXSA — Empowering Education Through Technology'),
  ('platform_name', 'SPEAXSA EdTech'),
  ('support_email', 'support@speaxsa.com'),
  ('support_phone', '+91 9999999999'),
  ('razorpay_key_id', ''),
  ('razorpay_key_secret', ''),
  ('agora_app_id', ''),
  ('agora_app_certificate', ''),
  ('firebase_key', ''),
  ('smtp_host', ''),
  ('smtp_port', '587'),
  ('smtp_user', ''),
  ('smtp_pass', ''),
  ('otp_expiry_minutes', '5'),
  ('class_late_threshold_mins', '10'),
  ('class_half_threshold_pct', '50'),
  ('max_batch_capacity', '30'),
  ('ad_banners', '[]')
ON CONFLICT (key) DO NOTHING;

-- Demo coupon
INSERT INTO coupons (code, discount_percent, max_uses, valid_until, is_active) VALUES
  ('SPEAXSA10', 10.00, 500, NOW() + INTERVAL '1 year', true),
  ('LAUNCH50', 50.00, 100, NOW() + INTERVAL '30 days', true)
ON CONFLICT (code) DO NOTHING;

-- Admin user (password: 123456)
-- bcrypt hash of '123456'
INSERT INTO users (id, email, phone, name, role, password_hash, password_plain, photo_url, approval_status, is_disabled)
VALUES (
  'admin_001',
  'admin@speaxsa.com',
  '9000000000',
  'Super Admin',
  'admin',
  '$2a$12$AB3q4alQr7oh4YxUO8TOBOWME1JxfQf0Sl80KkSm2RSw0dysOEfVS',
  '123456',
  '/uploads/profiles/admin_super.png',
  'approved',
  false
) ON CONFLICT (id) DO NOTHING;

-- Demo teacher
INSERT INTO users (id, email, phone, name, role, password_hash, password_plain, photo_url, approval_status, qualification, experience_years, subject_expertise, languages, teacher_level)
VALUES (
  'teacher_001',
  'teacher@speaxsa.com',
  '9111111111',
  'Dr. Priya Sharma',
  'teacher',
  '$2a$12$N28NyI1eVxhcu5A9q10bteZexI25I4cPKCDkVgoWBasxRPrhiP3Ji',
  'Admin@123',
  '/uploads/profiles/teacher_priya.png',
  'approved',
  'M.Sc. Physics, B.Ed.',
  8,
  'Physics, Mathematics',
  'English, Hindi',
  'Gold'
) ON CONFLICT (id) DO NOTHING;

-- Teacher SOP (approved)
INSERT INTO teacher_sop (id, teacher_id, status, camera_checklist, lighting_checklist, audio_checklist, internet_checklist, teaching_checklist)
VALUES (
  'sop_teacher_001',
  'teacher_001',
  'approved',
  '{"face_visible":true,"stable_camera":true,"eye_level":true,"proper_framing":true}',
  '{"proper_lighting":true,"no_backlight":true,"clear_background":true}',
  '{"clear_voice":true,"no_noise":true}',
  '{"stable_connection":true,"speed_proof":true}',
  '{"communication":true,"engagement":true,"presentation":true}'
) ON CONFLICT (id) DO NOTHING;

-- Teacher wallet
INSERT INTO teacher_wallet (teacher_id, total_earnings, paid_earnings, pending_earnings, wallet_balance)
VALUES ('teacher_001', 45000.00, 30000.00, 15000.00, 15000.00)
ON CONFLICT (teacher_id) DO NOTHING;

-- Demo student
INSERT INTO users (id, email, phone, name, role, password_hash, password_plain, photo_url, approval_status, student_code, board, grade, learning_streak)
VALUES (
  'student_001',
  'student@speaxsa.com',
  '9222222222',
  'Rahul Verma',
  'student',
  '$2a$12$N28NyI1eVxhcu5A9q10bteZexI25I4cPKCDkVgoWBasxRPrhiP3Ji',
  'Admin@123',
  '/uploads/profiles/student_rahul.png',
  'approved',
  'SPX-STU-100001',
  'CBSE',
  'Class 10',
  14
) ON CONFLICT (id) DO NOTHING;

-- Demo parent
INSERT INTO users (id, email, phone, name, role, password_hash, password_plain, photo_url, approval_status)
VALUES (
  'parent_001',
  'parent@speaxsa.com',
  '9333333333',
  'Suresh Verma',
  'parent',
  '$2a$12$N28NyI1eVxhcu5A9q10bteZexI25I4cPKCDkVgoWBasxRPrhiP3Ji',
  'Admin@123',
  '/uploads/profiles/parent_suresh.png',
  'approved'
) ON CONFLICT (id) DO NOTHING;

-- Link parent to student
INSERT INTO parent_student_links (parent_id, student_id)
VALUES ('parent_001', 'student_001')
ON CONFLICT (parent_id, student_id) DO NOTHING;

-- Demo course
INSERT INTO courses (id, title, subject, description, duration_weeks, grade, board, fees, status, created_by, thumbnail_url)
VALUES
  ('course_001', 'Class 10 Physics Mastery', 'Physics', 'Complete CBSE Class 10 Physics covering all chapters with live demonstrations and problem solving.', 24, 'Class 10', 'CBSE', 1999.00, 'active', 'admin_001', '/uploads/courses/course_physics.png'),
  ('course_002', 'Class 10 Mathematics Excellence', 'Mathematics', 'Comprehensive Class 10 Maths covering algebra, geometry, trigonometry and statistics.', 24, 'Class 10', 'CBSE', 1999.00, 'active', 'admin_001', '/uploads/courses/course_math.png'),
  ('course_003', 'Class 11 Chemistry Foundation', 'Chemistry', 'Strong foundation in Class 11 Chemistry - Physical, Organic and Inorganic chemistry.', 32, 'Class 11', 'CBSE', 2499.00, 'active', 'admin_001', '/uploads/courses/course_chemistry.png'),
  ('course_004', 'Class 12 Biology Board Prep', 'Biology', 'Targeted Class 12 Biology preparation with emphasis on board exam patterns.', 24, 'Class 12', 'CBSE', 2999.00, 'active', 'admin_001', '/uploads/courses/course_biology.png')
ON CONFLICT (id) DO UPDATE SET thumbnail_url = EXCLUDED.thumbnail_url;

-- Demo batch
INSERT INTO batches (id, course_id, teacher_id, batch_name, subject, start_date, end_date, start_time, end_time, days_of_week, capacity, seats_filled, status, agora_channel)
VALUES (
  'batch_001',
  'course_001',
  'teacher_001',
  'Physics A - Morning Batch',
  'Physics',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '6 months',
  '09:00:00',
  '10:00:00',
  ARRAY['Monday','Wednesday','Friday'],
  30,
  1,
  'active',
  'speaxsa_batch_001'
) ON CONFLICT (id) DO NOTHING;

-- Enroll demo student
INSERT INTO batch_students (batch_id, student_id, status)
VALUES ('batch_001', 'student_001', 'active')
ON CONFLICT (batch_id, student_id) DO NOTHING;

-- Demo assignment
INSERT INTO assignments (id, batch_id, teacher_id, title, description, due_date, max_marks)
VALUES (
  'asgn_001',
  'batch_001',
  'teacher_001',
  'Chapter 1: Electric Charges and Fields',
  'Solve problems from NCERT Exercise 1.1 to 1.10. Show all working steps.',
  NOW() + INTERVAL '7 days',
  100
) ON CONFLICT (id) DO NOTHING;

-- Demo notification
INSERT INTO notifications (id, title, message, target_role, type, is_active)
VALUES
  ('notif_001', 'Welcome to SPEAXSA!', 'Your learning journey starts here. Explore courses and join your first live class today.', 'student', 'info', true),
  ('notif_002', 'SOP Reminder', 'Please complete your SOP video uploads to start teaching.', 'teacher', 'warning', true)
ON CONFLICT (id) DO NOTHING;

-- Demo course modules
INSERT INTO course_modules (id, course_id, title, description) VALUES
  ('mod_1', 'course_001', 'Chapter 1: Electric Charges and Fields', 'Introduction to electric charges, Coulomb\'s Law, and electric fields.'),
  ('mod_2', 'course_001', 'Chapter 2: Electrostatic Potential and Capacitance', 'Electrostatic potential, work done, potential energy, and capacitors.'),
  ('mod_3', 'course_001', 'Chapter 3: Current Electricity', 'Ohm\'s Law, electrical resistivity, conductivity, and Kirchhoff\'s rules.'),
  ('mod_4', 'course_002', 'Chapter 1: Real Numbers', 'Fundamental Theorem of Arithmetic, irrational numbers, and rational representations.'),
  ('mod_5', 'course_002', 'Chapter 2: Polynomials', 'Geometrical meaning of zeroes, relationship between coefficients and zeroes.'),
  ('mod_6', 'course_002', 'Chapter 3: Pair of Linear Equations', 'Graphical and algebraic methods of solving linear systems.'),
  ('mod_7', 'course_003', 'Chapter 1: Basic Concepts of Chemistry', 'General introduction, laws of chemical combination, and stoichiometry.'),
  ('mod_8', 'course_003', 'Chapter 2: Structure of Atom', 'Bohr\'s model, dual nature of matter, Heisenberg uncertainty principle, and quantum numbers.'),
  ('mod_9', 'course_004', 'Chapter 1: Sexual Reproduction in Flowering Plants', 'Flower structure, development of male and female gametophytes, pollination, and fertilization.'),
  ('mod_10', 'course_004', 'Chapter 2: Human Reproduction', 'Male and female reproductive systems, microscopic anatomy, gametogenesis, and menstrual cycle.')
ON CONFLICT (id) DO NOTHING;

-- Demo audit log entry
INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, target_type, target_id, details)
VALUES (
  'admin_001',
  'Super Admin',
  'admin',
  'PLATFORM_INITIALIZED',
  'platform',
  'speaxsa_001',
  '{"version": "1.0.0", "note": "Platform seed data loaded successfully"}'
);
