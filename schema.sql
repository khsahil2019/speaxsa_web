-- ============================================================
-- SPEAXSA EDTECH PLATFORM — COMPLETE DATABASE SCHEMA
-- Matches the REST API SQL queries exactly
-- Direct import: psql -U postgres -d speaxsa -f schema.sql
-- PostgreSQL 14+
-- ============================================================

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS support_replies CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS student_feedback CASCADE;
DROP TABLE IF EXISTS monthly_reports CASCADE;
DROP TABLE IF EXISTS class_poll_responses CASCADE;
DROP TABLE IF EXISTS class_polls CASCADE;
DROP TABLE IF EXISTS student_observations CASCADE;
DROP TABLE IF EXISTS assignment_submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS recordings CASCADE;
DROP TABLE IF EXISTS class_participants CASCADE;
DROP TABLE IF EXISTS live_classes CASCADE;
DROP TABLE IF EXISTS refunds CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS batch_students CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS payouts CASCADE;
DROP TABLE IF EXISTS platform_settings CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS student_behavior_ratings CASCADE;
DROP TABLE IF EXISTS study_materials CASCADE;
DROP TABLE IF EXISTS course_modules CASCADE;
DROP TABLE IF EXISTS live_class_attendance CASCADE;
DROP TABLE IF EXISTS suggested_courses CASCADE;

-- 1. Users Table
CREATE TABLE users (
  id VARCHAR(100) PRIMARY KEY,
  email VARCHAR(200) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  role VARCHAR(20) NOT NULL,
  qualification VARCHAR(300),
  experience_years INT DEFAULT 0,
  photo_url TEXT,
  rating DECIMAL(3,2) DEFAULT 5.0,
  approval_status VARCHAR(50) DEFAULT 'approved',
  password_hash VARCHAR(255) NOT NULL,
  password_plain VARCHAR(255),
  is_disabled BOOLEAN DEFAULT false,
  board VARCHAR(50),
  learning_streak INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Courses Table
CREATE TABLE courses (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  grade VARCHAR(100),
  board VARCHAR(100),
  price DECIMAL(10,2) NOT NULL DEFAULT 499.00
);

-- 3. Batches Table
CREATE TABLE batches (
  id VARCHAR(100) PRIMARY KEY,
  course_id VARCHAR(100),
  course_title VARCHAR(255),
  teacher_name VARCHAR(255),
  teacher_id VARCHAR(100),
  start_time VARCHAR(100),
  start_date VARCHAR(100),
  days_of_week VARCHAR(255),
  capacity INT,
  seats_filled INT DEFAULT 0,
  is_upcoming BOOLEAN DEFAULT true,
  approval_status VARCHAR(50) DEFAULT 'approved',
  subject VARCHAR(100),
  schedule VARCHAR(255),
  time_slot VARCHAR(100),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Attendance Records Table
CREATE TABLE attendance_records (
  id VARCHAR(100) PRIMARY KEY,
  student_id VARCHAR(100),
  student_name VARCHAR(255),
  teacher_id VARCHAR(100),
  course_title VARCHAR(255),
  date VARCHAR(100),
  status VARCHAR(50),
  session_duration_minutes INT DEFAULT 0,
  poll_participation_count INT DEFAULT 0,
  chat_messages_count INT DEFAULT 0,
  engagement_alert_flag VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Student Behavior Ratings Table
CREATE TABLE student_behavior_ratings (
  id VARCHAR(100) PRIMARY KEY,
  student_id VARCHAR(100),
  student_name VARCHAR(255),
  teacher_id VARCHAR(100),
  date VARCHAR(100),
  feedback TEXT,
  curiosity DECIMAL(5,2) DEFAULT 0.0,
  concentration DECIMAL(5,2) DEFAULT 0.0,
  confidence DECIMAL(5,2) DEFAULT 0.0,
  communication DECIMAL(5,2) DEFAULT 0.0,
  consistency DECIMAL(5,2) DEFAULT 0.0,
  participation DECIMAL(5,2) DEFAULT 0.0,
  discipline DECIMAL(5,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Support Tickets Table
CREATE TABLE support_tickets (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100),
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  subject VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  replies TEXT[] DEFAULT '{}',
  created_at VARCHAR(100)
);

-- 7. Payouts Table
CREATE TABLE payouts (
  id VARCHAR(100) PRIMARY KEY,
  teacher_id VARCHAR(100),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'requested',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Platform Settings Table
CREATE TABLE platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL
);

-- 9. Coupons Table
CREATE TABLE coupons (
  code VARCHAR(50) PRIMARY KEY,
  discount_percent DECIMAL(5,2) NOT NULL,
  valid_until VARCHAR(100),
  is_active BOOLEAN DEFAULT true
);

-- 10. Live Classes Table
CREATE TABLE live_classes (
  id VARCHAR(100) PRIMARY KEY,
  batch_id VARCHAR(100),
  title VARCHAR(255),
  class_date VARCHAR(100),
  class_time VARCHAR(100),
  status VARCHAR(50) DEFAULT 'scheduled',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  end_reason VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Notifications Table
CREATE TABLE notifications (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255),
  message TEXT,
  target_role VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Payments Table
CREATE TABLE payments (
  id VARCHAR(100) PRIMARY KEY,
  student_id VARCHAR(100),
  student_name VARCHAR(255),
  course_title VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(100),
  billing_name VARCHAR(255),
  billing_email VARCHAR(255),
  billing_phone VARCHAR(50),
  teacher_id VARCHAR(100),
  batch_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Study Materials Table
CREATE TABLE study_materials (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255),
  description TEXT,
  course_id VARCHAR(100),
  batch_id VARCHAR(100),
  file_url TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Course Modules Table
CREATE TABLE course_modules (
  id VARCHAR(100) PRIMARY KEY,
  course_id VARCHAR(100),
  title VARCHAR(255),
  description TEXT
);

-- 15. Live Class Attendance Table
CREATE TABLE live_class_attendance (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(100),
  batch_id VARCHAR(100),
  class_id VARCHAR(100),
  join_time VARCHAR(100),
  duration INT DEFAULT 0,
  attendance_status VARCHAR(50)
);

-- 16. Suggested Courses Table
CREATE TABLE suggested_courses (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255),
  description TEXT,
  grade VARCHAR(100),
  board VARCHAR(100),
  price DECIMAL(10,2) NOT NULL,
  teacher_id VARCHAR(100),
  teacher_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
