-- ============================================================
-- SPEAXSA EDTECH PLATFORM — COMPLETE PRODUCTION DATABASE SCHEMA
-- PostgreSQL 14+
-- Run: psql -U postgres -d speaxsa -f schema.sql
-- ============================================================

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS monthly_reports CASCADE;
DROP TABLE IF EXISTS student_observations CASCADE;
DROP TABLE IF EXISTS assignment_submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS class_poll_responses CASCADE;
DROP TABLE IF EXISTS class_polls CASCADE;
DROP TABLE IF EXISTS class_participants CASCADE;
DROP TABLE IF EXISTS recordings CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS live_classes CASCADE;
DROP TABLE IF EXISTS batch_students CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS teacher_payouts CASCADE;
DROP TABLE IF EXISTS teacher_wallet CASCADE;
DROP TABLE IF EXISTS refunds CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS teacher_sop CASCADE;
DROP TABLE IF EXISTS teacher_documents CASCADE;
DROP TABLE IF EXISTS teacher_levels CASCADE;
DROP TABLE IF EXISTS parent_student_links CASCADE;
DROP TABLE IF EXISTS otp_tokens CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS fcm_tokens CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS commission_config CASCADE;
DROP TABLE IF EXISTS platform_settings CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS support_replies CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS study_materials CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- 1. USERS TABLE (All roles: admin, teacher, student, parent)
-- ============================================================
CREATE TABLE users (
  id                VARCHAR(100) PRIMARY KEY,
  email             VARCHAR(200) UNIQUE NOT NULL,
  phone             VARCHAR(20) NOT NULL,
  name              VARCHAR(150) NOT NULL,
  role              VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
  password_hash     VARCHAR(255) NOT NULL,
  password_plain    VARCHAR(255),  -- Stored for admin credential reset feature
  photo_url         TEXT,
  is_disabled       BOOLEAN DEFAULT false,
  -- Teacher specific
  approval_status   VARCHAR(50) DEFAULT 'approved',
  teacher_level     VARCHAR(50) DEFAULT 'Bronze',
  qualification     TEXT,
  experience_years  INT DEFAULT 0,
  subject_expertise TEXT,
  languages         TEXT,
  address           TEXT,
  bio               TEXT,
  rating            DECIMAL(3,2) DEFAULT 5.0,
  total_ratings     INT DEFAULT 0,
  referral_code     VARCHAR(20) UNIQUE,
  -- Student specific
  student_code      VARCHAR(30) UNIQUE,
  board             VARCHAR(50),
  grade             VARCHAR(50),
  learning_streak   INT DEFAULT 0,
  -- Admin impersonation tracking
  impersonated_by   VARCHAR(100),
  -- Timestamps
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TEACHER DOCUMENTS
-- ============================================================
CREATE TABLE teacher_documents (
  id              VARCHAR(100) PRIMARY KEY,
  teacher_id      VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type        VARCHAR(50) NOT NULL, -- aadhaar, pan, resume, qualification, profile_photo
  file_url        TEXT NOT NULL,
  original_name   VARCHAR(255),
  uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. TEACHER SOP GOVERNANCE
-- Status: pending, sop_pending, approved, rejected, suspended, draft
-- ============================================================
CREATE TABLE teacher_sop (
  id                    VARCHAR(100) PRIMARY KEY,
  teacher_id            VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Video uploads
  camera_sop_url        TEXT,
  lighting_sop_url      TEXT,
  audio_sop_url         TEXT,
  internet_proof_url    TEXT,
  demo_teaching_url     TEXT,
  -- Admin review checklist (stored as JSONB)
  camera_checklist      JSONB DEFAULT '{"face_visible":false,"stable_camera":false,"eye_level":false,"proper_framing":false}',
  lighting_checklist    JSONB DEFAULT '{"proper_lighting":false,"no_backlight":false,"clear_background":false}',
  audio_checklist       JSONB DEFAULT '{"clear_voice":false,"no_noise":false}',
  internet_checklist    JSONB DEFAULT '{"stable_connection":false,"speed_proof":false}',
  teaching_checklist    JSONB DEFAULT '{"communication":false,"engagement":false,"presentation":false}',
  -- Status
  status                VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','sop_pending','approved','rejected','suspended','draft')),
  admin_notes           TEXT,
  reviewed_by           VARCHAR(100),
  reviewed_at           TIMESTAMPTZ,
  submitted_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. TEACHER LEVEL HISTORY
-- ============================================================
CREATE TABLE teacher_levels (
  id              VARCHAR(100) PRIMARY KEY,
  teacher_id      VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level           VARCHAR(50) NOT NULL, -- Bronze, Silver, Gold, Elite Mentor
  previous_level  VARCHAR(50),
  changed_at      TIMESTAMPTZ DEFAULT NOW(),
  changed_by      VARCHAR(100),
  reason          TEXT
);

-- ============================================================
-- 5. COURSES (Admin-only creation)
-- ============================================================
CREATE TABLE courses (
  id              VARCHAR(100) PRIMARY KEY,
  title           VARCHAR(200) NOT NULL,
  subject         VARCHAR(100),
  description     TEXT,
  duration_weeks  INT DEFAULT 12,
  grade           VARCHAR(100),
  board           VARCHAR(100),
  fees            DECIMAL(10,2) NOT NULL DEFAULT 999.00,
  thumbnail_url   TEXT,
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','archived','draft')),
  created_by      VARCHAR(100) REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. BATCHES (Teacher-created, max 30 students)
-- ============================================================
CREATE TABLE batches (
  id              VARCHAR(100) PRIMARY KEY,
  course_id       VARCHAR(100) REFERENCES courses(id) ON DELETE SET NULL,
  teacher_id      VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
  batch_name      VARCHAR(200) NOT NULL,
  subject         VARCHAR(100),
  start_date      DATE,
  end_date        DATE,
  start_time      TIME,
  end_time        TIME,
  days_of_week    TEXT[], -- ['Monday','Wednesday','Friday']
  capacity        INT DEFAULT 30 CHECK (capacity <= 30),
  seats_filled    INT DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','cancelled','completed')),
  agora_channel   VARCHAR(200), -- auto-generated unique channel name
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. BATCH STUDENTS (Enrollment junction)
-- ============================================================
CREATE TABLE batch_students (
  id              SERIAL PRIMARY KEY,
  batch_id        VARCHAR(100) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  student_id      VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id      VARCHAR(100),
  enrolled_at     TIMESTAMPTZ DEFAULT NOW(),
  status          VARCHAR(20) DEFAULT 'active', -- active, dropped
  UNIQUE(batch_id, student_id)
);

-- ============================================================
-- 8. LIVE CLASSES
-- ============================================================
CREATE TABLE live_classes (
  id              VARCHAR(100) PRIMARY KEY,
  batch_id        VARCHAR(100) REFERENCES batches(id) ON DELETE CASCADE,
  teacher_id      VARCHAR(100) REFERENCES users(id),
  title           VARCHAR(255),
  class_date      DATE,
  class_time      TIME,
  agora_channel   VARCHAR(200) NOT NULL,
  agora_token     TEXT,
  status          VARCHAR(30) DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended','cancelled')),
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  duration_mins   INT DEFAULT 0,
  end_reason      VARCHAR(100),
  recording_url   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. CLASS PARTICIPANTS (Auto-attendance tracking)
-- ============================================================
CREATE TABLE class_participants (
  id                  SERIAL PRIMARY KEY,
  class_id            VARCHAR(100) NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
  batch_id            VARCHAR(100) REFERENCES batches(id),
  user_id             VARCHAR(100) NOT NULL REFERENCES users(id),
  role                VARCHAR(20) DEFAULT 'student', -- student, teacher, admin
  join_time           TIMESTAMPTZ DEFAULT NOW(),
  exit_time           TIMESTAMPTZ,
  duration_mins       INT DEFAULT 0,
  UNIQUE(class_id, user_id)
);

-- ============================================================
-- 10. ATTENDANCE (Auto-computed per class)
-- ============================================================
CREATE TABLE attendance (
  id                  VARCHAR(100) PRIMARY KEY,
  class_id            VARCHAR(100) REFERENCES live_classes(id) ON DELETE CASCADE,
  batch_id            VARCHAR(100) REFERENCES batches(id),
  student_id          VARCHAR(100) REFERENCES users(id),
  teacher_id          VARCHAR(100) REFERENCES users(id),
  join_time           TIMESTAMPTZ,
  exit_time           TIMESTAMPTZ,
  duration_mins       INT DEFAULT 0,
  class_duration_mins INT DEFAULT 60,
  status              VARCHAR(30) DEFAULT 'absent' CHECK (status IN ('present','late','half','absent')),
  attendance_date     DATE DEFAULT CURRENT_DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. RECORDINGS
-- ============================================================
CREATE TABLE recordings (
  id              VARCHAR(100) PRIMARY KEY,
  class_id        VARCHAR(100) REFERENCES live_classes(id) ON DELETE CASCADE,
  batch_id        VARCHAR(100) REFERENCES batches(id),
  title           VARCHAR(255),
  recording_url   TEXT NOT NULL,
  duration_mins   INT DEFAULT 0,
  file_size_mb    DECIMAL(10,2),
  thumbnail_url   TEXT,
  is_available    BOOLEAN DEFAULT true,
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. CLASS POLLS
-- ============================================================
CREATE TABLE class_polls (
  id              VARCHAR(100) PRIMARY KEY,
  class_id        VARCHAR(100) REFERENCES live_classes(id) ON DELETE CASCADE,
  teacher_id      VARCHAR(100) REFERENCES users(id),
  question        TEXT NOT NULL,
  options         JSONB NOT NULL, -- ["Option A", "Option B", "Option C"]
  correct_option  INT, -- index of correct answer (0-based)
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE class_poll_responses (
  id              SERIAL PRIMARY KEY,
  poll_id         VARCHAR(100) REFERENCES class_polls(id) ON DELETE CASCADE,
  student_id      VARCHAR(100) REFERENCES users(id),
  selected_option INT NOT NULL,
  responded_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, student_id)
);

-- ============================================================
-- 13. ASSIGNMENTS
-- ============================================================
CREATE TABLE assignments (
  id              VARCHAR(100) PRIMARY KEY,
  batch_id        VARCHAR(100) REFERENCES batches(id) ON DELETE CASCADE,
  teacher_id      VARCHAR(100) REFERENCES users(id),
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  file_url        TEXT, -- PDF or attachment
  due_date        TIMESTAMPTZ,
  max_marks       INT DEFAULT 100,
  status          VARCHAR(20) DEFAULT 'active', -- active, closed
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assignment_submissions (
  id              VARCHAR(100) PRIMARY KEY,
  assignment_id   VARCHAR(100) REFERENCES assignments(id) ON DELETE CASCADE,
  student_id      VARCHAR(100) REFERENCES users(id),
  file_url        TEXT,
  notes           TEXT,
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  marks_obtained  INT,
  feedback        TEXT,
  graded_by       VARCHAR(100) REFERENCES users(id),
  graded_at       TIMESTAMPTZ,
  status          VARCHAR(20) DEFAULT 'submitted', -- submitted, graded, late
  UNIQUE(assignment_id, student_id)
);

-- ============================================================
-- 14. STUDENT OBSERVATIONS (7-metric analytics)
-- ============================================================
CREATE TABLE student_observations (
  id              VARCHAR(100) PRIMARY KEY,
  student_id      VARCHAR(100) REFERENCES users(id),
  teacher_id      VARCHAR(100) REFERENCES users(id),
  batch_id        VARCHAR(100) REFERENCES batches(id),
  class_id        VARCHAR(100) REFERENCES live_classes(id),
  observation_date DATE DEFAULT CURRENT_DATE,
  curiosity        DECIMAL(5,2) DEFAULT 0 CHECK (curiosity BETWEEN 0 AND 100),
  understanding    DECIMAL(5,2) DEFAULT 0 CHECK (understanding BETWEEN 0 AND 100),
  consistency      DECIMAL(5,2) DEFAULT 0 CHECK (consistency BETWEEN 0 AND 100),
  communication    DECIMAL(5,2) DEFAULT 0 CHECK (communication BETWEEN 0 AND 100),
  observation_score DECIMAL(5,2) DEFAULT 0 CHECK (observation_score BETWEEN 0 AND 100),
  participation    DECIMAL(5,2) DEFAULT 0 CHECK (participation BETWEEN 0 AND 100),
  discipline       DECIMAL(5,2) DEFAULT 0 CHECK (discipline BETWEEN 0 AND 100),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. MONTHLY PERFORMANCE REPORTS
-- ============================================================
CREATE TABLE monthly_reports (
  id                    VARCHAR(100) PRIMARY KEY,
  student_id            VARCHAR(100) REFERENCES users(id),
  batch_id              VARCHAR(100) REFERENCES batches(id),
  teacher_id            VARCHAR(100) REFERENCES users(id),
  report_month          VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  -- Metrics
  attendance_pct        DECIMAL(5,2) DEFAULT 0,
  interaction_score     DECIMAL(5,2) DEFAULT 0,
  curiosity_score       DECIMAL(5,2) DEFAULT 0,
  assignment_completion DECIMAL(5,2) DEFAULT 0,
  communication_growth  DECIMAL(5,2) DEFAULT 0,
  avg_observation_score DECIMAL(5,2) DEFAULT 0,
  weak_topics           TEXT[],
  strong_topics         TEXT[],
  improvement_trend     VARCHAR(20) DEFAULT 'stable', -- improving, stable, declining
  overall_grade         VARCHAR(5), -- A+, A, B+, B, C, D
  teacher_remarks       TEXT,
  generated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, batch_id, report_month)
);

-- ============================================================
-- 16. PAYMENTS (Razorpay)
-- ============================================================
CREATE TABLE payments (
  id                  VARCHAR(100) PRIMARY KEY,
  razorpay_order_id   VARCHAR(200),
  razorpay_payment_id VARCHAR(200),
  student_id          VARCHAR(100) REFERENCES users(id),
  batch_id            VARCHAR(100) REFERENCES batches(id),
  course_id           VARCHAR(100) REFERENCES courses(id),
  teacher_id          VARCHAR(100) REFERENCES users(id),
  amount              DECIMAL(10,2) NOT NULL,
  platform_share      DECIMAL(10,2) DEFAULT 0,
  teacher_share       DECIMAL(10,2) DEFAULT 0,
  commission_type     VARCHAR(30) DEFAULT 'standard', -- standard, referral, elite
  coupon_code         VARCHAR(50),
  discount_amount     DECIMAL(10,2) DEFAULT 0,
  status              VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','captured','failed','refunded')),
  payment_method      VARCHAR(50),
  billing_name        VARCHAR(200),
  billing_email       VARCHAR(200),
  billing_phone       VARCHAR(20),
  referral_teacher_id VARCHAR(100) REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 17. REFUNDS
-- ============================================================
CREATE TABLE refunds (
  id                  VARCHAR(100) PRIMARY KEY,
  payment_id          VARCHAR(100) REFERENCES payments(id),
  student_id          VARCHAR(100) REFERENCES users(id),
  razorpay_refund_id  VARCHAR(200),
  amount              DECIMAL(10,2) NOT NULL,
  reason              TEXT,
  status              VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','processed','failed')),
  requested_at        TIMESTAMPTZ DEFAULT NOW(),
  processed_at        TIMESTAMPTZ,
  processed_by        VARCHAR(100) REFERENCES users(id)
);

-- ============================================================
-- 18. TEACHER WALLET
-- ============================================================
CREATE TABLE teacher_wallet (
  id              SERIAL PRIMARY KEY,
  teacher_id      VARCHAR(100) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_earnings  DECIMAL(10,2) DEFAULT 0,
  paid_earnings   DECIMAL(10,2) DEFAULT 0,
  pending_earnings DECIMAL(10,2) DEFAULT 0,
  wallet_balance  DECIMAL(10,2) DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 19. TEACHER PAYOUTS
-- ============================================================
CREATE TABLE teacher_payouts (
  id              VARCHAR(100) PRIMARY KEY,
  teacher_id      VARCHAR(100) NOT NULL REFERENCES users(id),
  amount          DECIMAL(10,2) NOT NULL,
  bank_account    VARCHAR(200),
  upi_id          VARCHAR(200),
  status          VARCHAR(30) DEFAULT 'requested' CHECK (status IN ('requested','under_review','approved','rejected','paid')),
  admin_notes     TEXT,
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  processed_by    VARCHAR(100) REFERENCES users(id)
);

-- ============================================================
-- 20. PARENT-STUDENT LINKS
-- ============================================================
CREATE TABLE parent_student_links (
  id          SERIAL PRIMARY KEY,
  parent_id   VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- ============================================================
-- 21. NOTIFICATIONS (FCM + in-app)
-- ============================================================
CREATE TABLE notifications (
  id          VARCHAR(100) PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  target_role VARCHAR(50) DEFAULT 'all', -- all, teacher, student, parent, admin
  target_user VARCHAR(100) REFERENCES users(id), -- specific user (null = broadcast)
  type        VARCHAR(50) DEFAULT 'info', -- info, success, warning, class_start, payout, assignment
  is_read     BOOLEAN DEFAULT false,
  is_active   BOOLEAN DEFAULT true,
  sent_by     VARCHAR(100) REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 22. FCM DEVICE TOKENS
-- ============================================================
CREATE TABLE fcm_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  device_type VARCHAR(30) DEFAULT 'web', -- web, android, ios
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- ============================================================
-- 23. OTP TOKENS (With TTL)
-- ============================================================
CREATE TABLE otp_tokens (
  id          SERIAL PRIMARY KEY,
  identifier  VARCHAR(200) NOT NULL, -- email or phone
  otp         VARCHAR(10) NOT NULL,
  purpose     VARCHAR(50) DEFAULT 'login', -- login, forgot_password
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 24. REFRESH TOKENS
-- ============================================================
CREATE TABLE refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 25. COMMISSION CONFIG (Admin-configurable)
-- ============================================================
CREATE TABLE commission_config (
  id              SERIAL PRIMARY KEY,
  commission_type VARCHAR(50) NOT NULL UNIQUE, -- standard, referral, elite
  teacher_pct     DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  platform_pct    DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  description     TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 26. PLATFORM SETTINGS
-- ============================================================
CREATE TABLE platform_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 27. COUPONS
-- ============================================================
CREATE TABLE coupons (
  code              VARCHAR(50) PRIMARY KEY,
  discount_percent  DECIMAL(5,2) NOT NULL,
  max_uses          INT DEFAULT 100,
  used_count        INT DEFAULT 0,
  valid_until       TIMESTAMPTZ,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 28. STUDY MATERIALS
-- ============================================================
CREATE TABLE study_materials (
  id          VARCHAR(100) PRIMARY KEY,
  title       VARCHAR(255),
  description TEXT,
  course_id   VARCHAR(100) REFERENCES courses(id) ON DELETE SET NULL,
  batch_id    VARCHAR(100) REFERENCES batches(id) ON DELETE SET NULL,
  teacher_id  VARCHAR(100) REFERENCES users(id),
  file_url    TEXT,
  file_type   VARCHAR(50), -- pdf, video, image, link
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 28b. COURSE MODULES / SECTIONS
-- ============================================================
CREATE TABLE course_modules (
  id          VARCHAR(100) PRIMARY KEY,
  course_id   VARCHAR(100) REFERENCES courses(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT
);

-- ============================================================
-- 29. SUPPORT TICKETS
-- ============================================================
CREATE TABLE support_tickets (
  id          VARCHAR(100) PRIMARY KEY,
  user_id     VARCHAR(100) REFERENCES users(id),
  subject     VARCHAR(255),
  description TEXT,
  status      VARCHAR(30) DEFAULT 'open', -- open, in_progress, resolved, closed
  priority    VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE support_replies (
  id          SERIAL PRIMARY KEY,
  ticket_id   VARCHAR(100) REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id     VARCHAR(100) REFERENCES users(id),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 30. AUDIT LOGS (All critical actions)
-- ============================================================
CREATE TABLE audit_logs (
  id          SERIAL PRIMARY KEY,
  actor_id    VARCHAR(100) REFERENCES users(id),
  actor_name  VARCHAR(150),
  actor_role  VARCHAR(30),
  action      VARCHAR(100) NOT NULL, -- LOGIN, LOGOUT, SOP_APPROVED, BATCH_CREATED, etc.
  target_type VARCHAR(50), -- user, teacher, batch, class, payout, etc.
  target_id   VARCHAR(100),
  target_name VARCHAR(150),
  details     JSONB,
  ip_address  VARCHAR(50),
  user_agent  TEXT,
  impersonated_by VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_student_code ON users(student_code);
CREATE INDEX idx_batches_teacher ON batches(teacher_id);
CREATE INDEX idx_batches_course ON batches(course_id);
CREATE INDEX idx_batch_students_batch ON batch_students(batch_id);
CREATE INDEX idx_batch_students_student ON batch_students(student_id);
CREATE INDEX idx_live_classes_batch ON live_classes(batch_id);
CREATE INDEX idx_live_classes_status ON live_classes(status);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_class ON attendance(class_id);
CREATE INDEX idx_assignments_batch ON assignments(batch_id);
CREATE INDEX idx_notifications_target ON notifications(target_role, target_user);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_teacher_payouts_teacher ON teacher_payouts(teacher_id);
CREATE INDEX idx_otp_tokens_identifier ON otp_tokens(identifier);
CREATE INDEX idx_teacher_sop_teacher ON teacher_sop(teacher_id);
CREATE INDEX idx_course_modules_course ON course_modules(course_id);

