-- ============================================================
-- SPEAXA EDTECH PLATFORM — COMPLETE PRODUCTION DATABASE SCHEMA
-- PostgreSQL 14+
-- Run: psql -U postgres -d speaxa -f schema.sql
-- ============================================================

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS email_campaigns CASCADE;
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS parent_teacher_chats CASCADE;
DROP TABLE IF EXISTS email_verification_tokens CASCADE;
DROP TABLE IF EXISTS recycle_bin CASCADE;
DROP TABLE IF EXISTS teacher_wallet_ledger CASCADE;
DROP TABLE IF EXISTS teacher_rewards CASCADE;
DROP TABLE IF EXISTS teacher_allowances CASCADE;
DROP TABLE IF EXISTS teacher_certificates CASCADE;
DROP TABLE IF EXISTS performance_slabs_config CASCADE;
DROP TABLE IF EXISTS grooming_allowances_config CASCADE;
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
DROP TABLE IF EXISTS course_modules CASCADE;
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
  teacher_level     VARCHAR(50) DEFAULT NULL,
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
  -- Additional fields added dynamically
  alt_email         VARCHAR(200),
  mobile_number     VARCHAR(50),
  social_links      JSONB DEFAULT '{}',
  referred_by       VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
  phone_verified    BOOLEAN DEFAULT FALSE,
  email_verified    BOOLEAN DEFAULT FALSE,
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
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  -- Teacher compliance checklists and digital signature agreement
  teacher_checklist     JSONB DEFAULT '{}',
  agreement_signed      BOOLEAN DEFAULT false,
  agreement_signed_at   TIMESTAMPTZ,
  digital_signature     VARCHAR(255),
  availability          TEXT,
  item_approvals        JSONB DEFAULT '{}'
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
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','archived','draft','pending_approval','rejected')),
  created_by      VARCHAR(100) REFERENCES users(id),
  custom_tag      VARCHAR(255),
  is_verified     BOOLEAN DEFAULT TRUE,
  is_featured     BOOLEAN DEFAULT FALSE,
  learning_duration VARCHAR(255),
  objective       TEXT,
  learning_outcome TEXT,
  language_instruction VARCHAR(100),
  daily_class_duration VARCHAR(100),
  assessment_days  VARCHAR(100),
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
  capacity        INT DEFAULT 30, -- Capacity check constraint dropped dynamically in app.js
  seats_filled    INT DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','cancelled','completed')),
  agora_channel   VARCHAR(200), -- auto-generated unique channel name
  planner_url     TEXT,
  planner_name    VARCHAR(255),
  planner_desc    TEXT,
  teaching_method TEXT,
  batch_instructions TEXT,
  is_free_demo    BOOLEAN DEFAULT false,
  demo_video_url  TEXT,
  deletion_requested BOOLEAN DEFAULT false,
  deletion_requested_at TIMESTAMPTZ,
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
  is_free_demo    BOOLEAN DEFAULT false,
  deletion_requested BOOLEAN DEFAULT false,
  deletion_requested_at TIMESTAMPTZ,
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
  deletion_requested BOOLEAN DEFAULT false,
  deletion_requested_at TIMESTAMPTZ,
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
-- 18a. PERFORMANCE SLABS CONFIG
-- ============================================================
CREATE TABLE performance_slabs_config (
  id              VARCHAR(100) PRIMARY KEY,
  slab_name       VARCHAR(100) NOT NULL UNIQUE,
  target_revenue  DECIMAL(10,2) NOT NULL,
  reward_amount   DECIMAL(10,2) NOT NULL,
  reward_item     VARCHAR(255) NOT NULL,
  grooming_group  VARCHAR(100) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18b. GROOMING ALLOWANCES CONFIG
-- ============================================================
CREATE TABLE grooming_allowances_config (
  group_name      VARCHAR(100) PRIMARY KEY,
  allowance_amount DECIMAL(10,2) NOT NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18c. TEACHER WALLET LEDGER
-- ============================================================
CREATE TABLE teacher_wallet_ledger (
  id              VARCHAR(100) PRIMARY KEY,
  teacher_id      VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount          DECIMAL(10,2) NOT NULL,
  type            VARCHAR(50) NOT NULL, -- course_share, student_referral, teacher_referral, grooming_allowance, slab_reward, withdrawal
  description     TEXT,
  payment_id      VARCHAR(100) REFERENCES payments(id) ON DELETE SET NULL,
  referred_user_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18d. TEACHER REWARDS
-- ============================================================
CREATE TABLE teacher_rewards (
  id              VARCHAR(100) PRIMARY KEY,
  teacher_id      VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slab_name       VARCHAR(100) NOT NULL,
  target_revenue  DECIMAL(10,2) NOT NULL,
  reward_amount   DECIMAL(10,2) NOT NULL,
  reward_item     VARCHAR(255) NOT NULL,
  status          VARCHAR(30) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'released')),
  admin_notes     TEXT,
  achieved_at     TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  processed_by    VARCHAR(100) REFERENCES users(id)
);

-- ============================================================
-- 18e. TEACHER ALLOWANCES
-- ============================================================
CREATE TABLE teacher_allowances (
  id              VARCHAR(100) PRIMARY KEY,
  teacher_id      VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_name      VARCHAR(100) NOT NULL,
  allowance_amount DECIMAL(10,2) NOT NULL,
  payment_month   VARCHAR(7) NOT NULL, -- YYYY-MM
  status          VARCHAR(30) DEFAULT 'paid' CHECK (status IN ('pending', 'paid')),
  paid_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18f. TEACHER CERTIFICATES
-- ============================================================
CREATE TABLE teacher_certificates (
  id              VARCHAR(100) PRIMARY KEY,
  teacher_id      VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
  certificate_type VARCHAR(100) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  issued_at       TIMESTAMPTZ DEFAULT NOW(),
  metadata        JSONB DEFAULT '{}'
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
  processed_by    VARCHAR(100) REFERENCES users(id),
  razorpay_payout_id VARCHAR(200),
  razorpay_payout_status VARCHAR(50),
  razorpay_fund_account_id VARCHAR(200),
  razorpay_contact_id VARCHAR(200)
);

-- ============================================================
-- 20. PARENT-STUDENT LINKS
-- ============================================================
CREATE TABLE parent_student_links (
  id          SERIAL PRIMARY KEY,
  parent_id   VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_at   TIMESTAMPTZ DEFAULT NOW(),
  status      VARCHAR(30) DEFAULT 'pending',
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
  id              SERIAL PRIMARY KEY,
  identifier      VARCHAR(200) NOT NULL, -- email or phone
  otp             VARCHAR(10) NOT NULL,
  purpose         VARCHAR(50) DEFAULT 'login', -- login, forgot_password
  expires_at      TIMESTAMPTZ NOT NULL,
  used            BOOLEAN DEFAULT false,
  delivery_method VARCHAR(50),
  delivery_status VARCHAR(50) DEFAULT 'pending',
  delivery_error  TEXT,
  attempts        INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
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
  deletion_requested BOOLEAN DEFAULT false,
  deletion_requested_at TIMESTAMPTZ,
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
  guest_name  VARCHAR(150),
  guest_email VARCHAR(200),
  guest_phone VARCHAR(20),
  guest_role  VARCHAR(50),
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


-- ============================================================
-- INITIAL PLATFORM SETTINGS SEED DATA
-- ============================================================
INSERT INTO platform_settings (key, value) VALUES
  ('student_referral_bonus_pct', '5.00'),
  ('teacher_referral_bonus_pct', '1.00'),
  ('teacher_referral_max_cap', '10'),
  ('default_teacher_share_pct', '50.00'),
  ('referral_teacher_share_pct', '50.00'),
  ('payout_pct_Junior_Teacher', '50.00'),
  ('payout_pct_Assistant_Teacher', '55.00'),
  ('payout_pct_Senior_Teacher', '60.00'),
  ('payout_pct_Executive_Teacher', '65.00'),
  ('payout_pct_Lecturer', '70.00'),
  ('payout_pct_Professor', '75.00'),
  ('payout_pct_Senior_Professor', '80.00'),
  ('payout_pct_HOD', '85.00'),
  ('payout_pct_Dean', '90.00'),
  ('home_hero_badge', 'Speaxa is Launching Soon – Stay Tuned!'),
  ('home_hero_title', 'Learn From<br><span class="gradient-text">Expert Teachers</span><br>In Real-Time'),
  ('home_hero_desc', 'Join live interactive classes, get personalized attention, and track your child''s growth with SPEAXA''s AI-powered learning management system.'),
  ('home_hero_cta_primary', 'Browse Courses'),
  ('home_hero_cta_secondary', 'How It Works'),
  ('home_steps_title', 'Start Learning in <span class="gradient-text">3 Easy Steps</span>'),
  ('home_step1_title', 'Register Free'),
  ('home_step1_desc', 'Create your student account in under 2 minutes. No credit card required to browse courses.'),
  ('home_step2_title', 'Choose a Batch'),
  ('home_step2_desc', 'Browse courses, compare teachers, and enroll in the batch that matches your schedule and grade.'),
  ('home_step3_title', 'Learn Live'),
  ('home_step3_desc', 'Join live interactive classes, submit assignments, and track your growth with detailed monthly reports.'),
  ('home_courses_badge', 'Explore'),
  ('home_courses_title', 'Featured <span class="gradient-text">Courses</span>'),
  ('home_teachers_badge', 'Our Faculty'),
  ('home_teachers_title', 'Learn from <span class="gradient-text">Top Teachers</span>'),
  ('home_teachers_desc', 'All teachers are SOP-verified and background-checked for quality assurance.'),
  ('home_features_badge', 'Why SPEAXA'),
  ('home_features_title', 'Everything You Need to <span class="gradient-text">Excel</span>'),
  ('home_cta_title', 'Ready to Start Your Learning Journey?'),
  ('home_cta_desc', 'Join 10,000+ students who are already excelling with SPEAXA''s live classes.'),
  ('home_cta_btn_student', 'Join as Student'),
  ('home_cta_btn_teacher', 'Teach with Us'),
  ('home_footer_desc', 'Speaxa is India''s leading live interactive EdTech platform, empowering students with live classrooms, expert mentors, and performance reports.'),
  ('home_footer_toll_free', '1800-120-456-456'),
  ('home_footer_phone', '+91 9999 999 999 (9 AM - 9:30 PM)'),
  ('home_footer_email', 'support@speaxa.com'),
  ('home_footer_instagram', 'https://instagram.com/speaxa'),
  ('home_footer_facebook', 'https://facebook.com/speaxa'),
  ('home_footer_youtube', 'https://youtube.com/speaxa'),
  ('home_footer_twitter', 'https://twitter.com/speaxa'),
  ('home_footer_play_store_url', 'https://play.google.com/store/apps/details?id=com.speaxa'),
  ('home_footer_app_store_url', 'https://apps.apple.com/app/speaxa'),
  ('home_footer_url_about', '/about.html'),
  ('home_footer_url_contact', '/contact.html'),
  ('home_footer_url_blog', '/blog.html'),
  ('home_footer_url_results', '/success-stories.html'),
  ('home_footer_url_safety', '/privacy.html')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- 35. TEACHER RATINGS & REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS teacher_ratings (
  id SERIAL PRIMARY KEY,
  teacher_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, parent_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_teacher_ratings_lookup ON teacher_ratings (teacher_id);

-- ============================================================
-- 36. BLOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS blogs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  banner_url TEXT,
  author VARCHAR(100) DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 37. FAQS
-- ============================================================
CREATE TABLE IF NOT EXISTS faqs (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'General',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 38. MEDIA GALLERY
-- ============================================================
CREATE TABLE IF NOT EXISTS media_gallery (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  file_size INT,
  mime_type VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 39. NEWSLETTER SUBSCRIBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscribers (
  id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email VARCHAR(255) UNIQUE NOT NULL,
  source VARCHAR(100) DEFAULT 'landing_page',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 40. RECYCLE BIN / ADMIN RESTORE SYSTEM
-- ============================================================
CREATE TABLE IF NOT EXISTS recycle_bin (
  id                  VARCHAR(100) PRIMARY KEY,
  item_type           VARCHAR(50) NOT NULL, -- batch, assignment, live_class, study_material
  item_id             VARCHAR(100) NOT NULL,
  item_name           VARCHAR(255) NOT NULL,
  requested_by        VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
  requested_by_role   VARCHAR(50) DEFAULT 'teacher',
  metadata            JSONB DEFAULT '{}',
  status              VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'approved_deleted', 'restored')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  processed_at        TIMESTAMPTZ,
  processed_by        VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_recycle_bin_status ON recycle_bin (status);

-- ============================================================
-- 41. EMAIL VERIFICATION TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 42. PARENT TEACHER CHATS
-- ============================================================
CREATE TABLE IF NOT EXISTS parent_teacher_chats (
  id SERIAL PRIMARY KEY,
  parent_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_pt_chats_lookup ON parent_teacher_chats (parent_id, teacher_id, student_id);

-- ============================================================
-- 43. EMAIL LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS email_logs (
  id VARCHAR(100) PRIMARY KEY,
  recipient_email VARCHAR(200) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(30) DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 44. EMAIL CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS email_campaigns (
  id VARCHAR(100) PRIMARY KEY,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  target_role VARCHAR(50) NOT NULL,
  recipient_count INT DEFAULT 0,
  sent_by VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

