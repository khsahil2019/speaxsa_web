-- ============================================================
-- SPEAXA MIGRATION 001: BASE DATABASE SCHEMA
-- Incremental Migration System (Production Safe)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id                VARCHAR(100) PRIMARY KEY,
  email             VARCHAR(200) UNIQUE NOT NULL,
  phone             VARCHAR(20) NOT NULL,
  name              VARCHAR(150) NOT NULL,
  role              VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
  password_hash     VARCHAR(255) NOT NULL,
  password_plain    VARCHAR(255),
  photo_url         TEXT,
  is_disabled       BOOLEAN DEFAULT false,
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
  student_code      VARCHAR(30) UNIQUE,
  board             VARCHAR(50),
  grade             VARCHAR(50),
  learning_streak   INT DEFAULT 0,
  impersonated_by   VARCHAR(100),
  alt_email         VARCHAR(200),
  mobile_number     VARCHAR(50),
  social_links      JSONB DEFAULT '{}',
  referred_by       VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
  phone_verified    BOOLEAN DEFAULT FALSE,
  email_verified    BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_documents (
  id              VARCHAR(100) PRIMARY KEY,
  teacher_id      VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type        VARCHAR(50) NOT NULL,
  file_url        TEXT NOT NULL,
  original_name   VARCHAR(255),
  uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_sop (
  id                    VARCHAR(100) PRIMARY KEY,
  teacher_id            VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  camera_sop_url        TEXT,
  lighting_sop_url      TEXT,
  audio_sop_url         TEXT,
  internet_proof_url    TEXT,
  demo_teaching_url     TEXT,
  camera_checklist      JSONB DEFAULT '{"face_visible":false,"stable_camera":false,"eye_level":false,"proper_framing":false}',
  lighting_checklist    JSONB DEFAULT '{"proper_lighting":false,"no_backlight":false,"clear_background":false}',
  audio_checklist       JSONB DEFAULT '{"clear_voice":false,"no_noise":false}',
  internet_checklist    JSONB DEFAULT '{"stable_connection":false,"speed_proof":false}',
  teaching_checklist    JSONB DEFAULT '{"communication":false,"engagement":false,"presentation":false}',
  status                VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','sop_pending','approved','rejected','suspended','draft')),
  admin_notes           TEXT,
  reviewed_by           VARCHAR(100),
  reviewed_at           TIMESTAMPTZ,
  submitted_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  teacher_checklist     JSONB DEFAULT '{}',
  agreement_signed      BOOLEAN DEFAULT false,
  agreement_signed_at   TIMESTAMPTZ,
  digital_signature     VARCHAR(255),
  availability          TEXT,
  item_approvals        JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS teacher_levels (
  id              VARCHAR(100) PRIMARY KEY,
  teacher_id      VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level           VARCHAR(50) NOT NULL,
  previous_level  VARCHAR(50),
  changed_at      TIMESTAMPTZ DEFAULT NOW(),
  changed_by      VARCHAR(100),
  reason          TEXT
);

CREATE TABLE IF NOT EXISTS courses (
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

CREATE TABLE IF NOT EXISTS batches (
  id              VARCHAR(100) PRIMARY KEY,
  course_id       VARCHAR(100) REFERENCES courses(id) ON DELETE SET NULL,
  teacher_id      VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
  batch_name      VARCHAR(200) NOT NULL,
  subject         VARCHAR(100),
  start_date      DATE,
  end_date        DATE,
  start_time      TIME,
  end_time        TIME,
  days_of_week    TEXT[],
  meeting_link    TEXT,
  max_students    INT DEFAULT 30,
  current_students INT DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming','ongoing','completed','cancelled')),
  deletion_requested BOOLEAN DEFAULT FALSE,
  deletion_requested_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batch_students (
  id              SERIAL PRIMARY KEY,
  batch_id        VARCHAR(100) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  student_id      VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  payment_status  VARCHAR(20) DEFAULT 'completed',
  UNIQUE (batch_id, student_id)
);

CREATE TABLE IF NOT EXISTS live_classes (
  id              VARCHAR(100) PRIMARY KEY,
  batch_id        VARCHAR(100) REFERENCES batches(id) ON DELETE CASCADE,
  teacher_id      VARCHAR(100) REFERENCES users(id),
  topic           VARCHAR(200) NOT NULL,
  class_date      DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  agora_channel   VARCHAR(100),
  agora_token     TEXT,
  status          VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','completed','cancelled')),
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  deletion_requested BOOLEAN DEFAULT FALSE,
  deletion_requested_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_participants (
  id                  SERIAL PRIMARY KEY,
  class_id            VARCHAR(100) NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
  batch_id            VARCHAR(100) REFERENCES batches(id),
  user_id             VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at           TIMESTAMPTZ DEFAULT NOW(),
  left_at             TIMESTAMPTZ,
  duration_minutes    INT DEFAULT 0,
  attendance_marked   BOOLEAN DEFAULT false,
  hand_raised         BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS attendance (
  id                  VARCHAR(100) PRIMARY KEY,
  class_id            VARCHAR(100) REFERENCES live_classes(id) ON DELETE CASCADE,
  batch_id            VARCHAR(100) REFERENCES batches(id),
  student_id          VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
  status              VARCHAR(20) NOT NULL CHECK (status IN ('present','absent','late')),
  minutes_attended    INT DEFAULT 0,
  joined_time         TIMESTAMPTZ,
  left_time           TIMESTAMPTZ,
  marked_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS recordings (
  id              VARCHAR(100) PRIMARY KEY,
  class_id        VARCHAR(100) REFERENCES live_classes(id) ON DELETE CASCADE,
  batch_id        VARCHAR(100) REFERENCES batches(id),
  title           VARCHAR(200),
  recording_url   TEXT NOT NULL,
  duration_mins   INT DEFAULT 0,
  uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_polls (
  id              VARCHAR(100) PRIMARY KEY,
  class_id        VARCHAR(100) REFERENCES live_classes(id) ON DELETE CASCADE,
  teacher_id      VARCHAR(100) REFERENCES users(id),
  question        TEXT NOT NULL,
  options         JSONB NOT NULL,
  correct_option  INT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_poll_responses (
  id              SERIAL PRIMARY KEY,
  poll_id         VARCHAR(100) REFERENCES class_polls(id) ON DELETE CASCADE,
  student_id      VARCHAR(100) REFERENCES users(id),
  selected_option INT NOT NULL,
  is_correct      BOOLEAN,
  responded_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (poll_id, student_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id              VARCHAR(100) PRIMARY KEY,
  batch_id        VARCHAR(100) REFERENCES batches(id) ON DELETE CASCADE,
  teacher_id      VARCHAR(100) REFERENCES users(id),
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  attachment_url  TEXT,
  due_date        TIMESTAMPTZ NOT NULL,
  max_marks       INT DEFAULT 100,
  deletion_requested BOOLEAN DEFAULT FALSE,
  deletion_requested_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id              VARCHAR(100) PRIMARY KEY,
  assignment_id   VARCHAR(100) REFERENCES assignments(id) ON DELETE CASCADE,
  student_id      VARCHAR(100) REFERENCES users(id),
  submission_url  TEXT NOT NULL,
  notes           TEXT,
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  marks_obtained  INT,
  feedback        TEXT,
  status          VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted','evaluated','late')),
  evaluated_at    TIMESTAMPTZ,
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS student_observations (
  id              VARCHAR(100) PRIMARY KEY,
  student_id      VARCHAR(100) REFERENCES users(id),
  teacher_id      VARCHAR(100) REFERENCES users(id),
  batch_id        VARCHAR(100) REFERENCES batches(id),
  punctuality     INT CHECK (punctuality >= 1 AND punctuality <= 5),
  focus           INT CHECK (focus >= 1 AND focus <= 5),
  interaction     INT CHECK (interaction >= 1 AND interaction <= 5),
  understanding   INT CHECK (understanding >= 1 AND understanding <= 5),
  discipline      INT CHECK (discipline >= 1 AND discipline <= 5),
  homework        INT CHECK (homework >= 1 AND homework <= 5),
  retention       INT CHECK (retention >= 1 AND retention <= 5),
  general_notes   TEXT,
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_reports (
  id                    VARCHAR(100) PRIMARY KEY,
  student_id            VARCHAR(100) REFERENCES users(id),
  batch_id              VARCHAR(100) REFERENCES batches(id),
  month                 INT NOT NULL,
  year                  INT NOT NULL,
  total_classes         INT DEFAULT 0,
  classes_attended      INT DEFAULT 0,
  attendance_pct        DECIMAL(5,2) DEFAULT 0,
  avg_observation_score DECIMAL(4,2) DEFAULT 0,
  assignments_total     INT DEFAULT 0,
  assignments_submitted INT DEFAULT 0,
  teacher_comments      TEXT,
  ai_summary            TEXT,
  report_pdf_url        TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, batch_id, month, year)
);

CREATE TABLE IF NOT EXISTS payments (
  id                  VARCHAR(100) PRIMARY KEY,
  razorpay_order_id   VARCHAR(200),
  razorpay_payment_id VARCHAR(200),
  razorpay_signature  TEXT,
  student_id          VARCHAR(100) REFERENCES users(id),
  course_id           VARCHAR(100) REFERENCES courses(id),
  batch_id            VARCHAR(100) REFERENCES batches(id),
  amount              DECIMAL(10,2) NOT NULL,
  currency            VARCHAR(10) DEFAULT 'INR',
  status              VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  teacher_id          VARCHAR(100),
  gateway_payment_id  VARCHAR(200),
  billing_name        VARCHAR(255),
  billing_email       VARCHAR(255),
  billing_phone       VARCHAR(50),
  coupon_code         VARCHAR(100),
  discount_amount     DECIMAL(10,2) DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refunds (
  id                  VARCHAR(100) PRIMARY KEY,
  payment_id          VARCHAR(100) REFERENCES payments(id),
  student_id          VARCHAR(100) REFERENCES users(id),
  amount              DECIMAL(10,2) NOT NULL,
  reason              TEXT,
  razorpay_refund_id  VARCHAR(200),
  status              VARCHAR(20) DEFAULT 'processed' CHECK (status IN ('requested','processed','rejected')),
  processed_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_wallet (
  id              SERIAL PRIMARY KEY,
  teacher_id      VARCHAR(100) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_earnings  DECIMAL(10,2) DEFAULT 0,
  wallet_balance  DECIMAL(10,2) DEFAULT 0,
  balance         DECIMAL(10,2) DEFAULT 0,
  pending_payout  DECIMAL(10,2) DEFAULT 0,
  total_paid      DECIMAL(10,2) DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_slabs_config (
  id              VARCHAR(100) PRIMARY KEY,
  slab_name       VARCHAR(100) NOT NULL UNIQUE,
  target_revenue  DECIMAL(10,2) NOT NULL,
  reward_amount   DECIMAL(10,2) NOT NULL,
  reward_item     VARCHAR(255) NOT NULL,
  grooming_group  VARCHAR(100) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grooming_allowances_config (
  group_name      VARCHAR(100) PRIMARY KEY,
  allowance_amount DECIMAL(10,2) NOT NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_wallet_ledger (
  id              VARCHAR(100) PRIMARY KEY,
  teacher_id      VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount          DECIMAL(10,2) NOT NULL,
  entry_type      VARCHAR(50) NOT NULL CHECK (entry_type IN ('course_revenue', 'performance_reward', 'grooming_allowance', 'payout_withdrawal', 'adjustment')),
  description     TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_rewards (
  id              VARCHAR(100) PRIMARY KEY,
  teacher_id      VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slab_name       VARCHAR(100) NOT NULL,
  reward_amount   DECIMAL(10,2) NOT NULL,
  reward_item     VARCHAR(255) NOT NULL,
  achieved_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (teacher_id, slab_name)
);

CREATE TABLE IF NOT EXISTS teacher_allowances (
  id              VARCHAR(100) PRIMARY KEY,
  teacher_id      VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_name      VARCHAR(100) NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  month_year      VARCHAR(20) NOT NULL,
  issued_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (teacher_id, month_year)
);

CREATE TABLE IF NOT EXISTS teacher_certificates (
  id              VARCHAR(100) PRIMARY KEY,
  teacher_id      VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
  certificate_type VARCHAR(100) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  is_verified     BOOLEAN DEFAULT TRUE,
  verified_at     TIMESTAMPTZ DEFAULT NOW(),
  digital_signature VARCHAR(255),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_payouts (
  id              VARCHAR(100) PRIMARY KEY,
  teacher_id      VARCHAR(100) NOT NULL REFERENCES users(id),
  amount          DECIMAL(10,2) NOT NULL,
  status          VARCHAR(20) DEFAULT 'requested' CHECK (status IN ('requested','processing','paid','rejected')),
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  razorpay_payout_id VARCHAR(200),
  razorpay_payout_status VARCHAR(50),
  razorpay_fund_account_id VARCHAR(200),
  razorpay_contact_id VARCHAR(200),
  bank_account_name VARCHAR(255),
  bank_name       VARCHAR(255),
  bank_account_number VARCHAR(100),
  bank_ifsc_code  VARCHAR(50),
  admin_notes     TEXT,
  processed_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS parent_student_links (
  id          SERIAL PRIMARY KEY,
  parent_id   VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(30) DEFAULT 'pending',
  last_email_sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id          VARCHAR(100) PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  user_id     VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
  role_target VARCHAR(20),
  type        VARCHAR(50) DEFAULT 'general',
  is_read     BOOLEAN DEFAULT false,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fcm_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  device_type VARCHAR(50) DEFAULT 'web',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, token)
);

CREATE TABLE IF NOT EXISTS otp_tokens (
  id              SERIAL PRIMARY KEY,
  identifier      VARCHAR(200) NOT NULL,
  otp             VARCHAR(10) NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  used            BOOLEAN DEFAULT false,
  delivery_method VARCHAR(50),
  delivery_status VARCHAR(50) DEFAULT 'pending',
  delivery_error  TEXT,
  attempts        INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commission_config (
  id              SERIAL PRIMARY KEY,
  commission_type VARCHAR(50) NOT NULL UNIQUE,
  teacher_pct     DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  platform_pct    DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupons (
  code              VARCHAR(50) PRIMARY KEY,
  discount_percent  DECIMAL(5,2) NOT NULL,
  max_uses          INT DEFAULT 100,
  used_count        INT DEFAULT 0,
  valid_until       DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_materials (
  id          VARCHAR(100) PRIMARY KEY,
  title       VARCHAR(255),
  description TEXT,
  file_url    TEXT NOT NULL,
  file_type   VARCHAR(50),
  batch_id    VARCHAR(100) REFERENCES batches(id) ON DELETE CASCADE,
  course_id   VARCHAR(100) REFERENCES courses(id) ON DELETE CASCADE,
  uploaded_by VARCHAR(100) REFERENCES users(id),
  deletion_requested BOOLEAN DEFAULT FALSE,
  deletion_requested_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_modules (
  id          VARCHAR(100) PRIMARY KEY,
  course_id   VARCHAR(100) REFERENCES courses(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id          VARCHAR(100) PRIMARY KEY,
  user_id     VARCHAR(100) REFERENCES users(id),
  subject     VARCHAR(255),
  message     TEXT,
  category    VARCHAR(100),
  priority    VARCHAR(20) DEFAULT 'medium',
  status      VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  guest_name  VARCHAR(150),
  guest_email VARCHAR(200),
  guest_phone VARCHAR(20),
  guest_role  VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_replies (
  id          SERIAL PRIMARY KEY,
  ticket_id   VARCHAR(100) REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id     VARCHAR(100) REFERENCES users(id),
  message     TEXT NOT NULL,
  is_admin    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id   VARCHAR(100),
  details     JSONB DEFAULT '{}',
  ip_address  VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_ratings (
  id          SERIAL PRIMARY KEY,
  teacher_id  VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id   VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
  rating      INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS blogs (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) UNIQUE NOT NULL,
  content     TEXT NOT NULL,
  summary     TEXT,
  banner_url  TEXT,
  author      VARCHAR(100) DEFAULT 'Admin',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faqs (
  id          SERIAL PRIMARY KEY,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  category    VARCHAR(100) DEFAULT 'General',
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_gallery (
  id          SERIAL PRIMARY KEY,
  filename    VARCHAR(255) NOT NULL,
  url         TEXT NOT NULL,
  file_size   INT,
  mime_type   VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscribers (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recycle_bin (
  id VARCHAR(100) PRIMARY KEY,
  item_type VARCHAR(50) NOT NULL,
  item_id VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  requested_by VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
  requested_by_role VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'approved_deleted', 'restored')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  recipient_email VARCHAR(200) NOT NULL,
  recipient_name VARCHAR(150),
  email_type VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'sent',
  error_details TEXT,
  sent_by VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id SERIAL PRIMARY KEY,
  campaign_name VARCHAR(200) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  target_role VARCHAR(50) NOT NULL,
  recipient_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'completed',
  sent_by VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS security_audit_logs (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(100) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  user_agent TEXT,
  status VARCHAR(50) DEFAULT 'blocked',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEFAULT SEEDING (ON CONFLICT DO NOTHING)
-- ============================================================
INSERT INTO commission_config (commission_type, teacher_pct, platform_pct) VALUES
  ('standard', 50.00, 50.00),
  ('referral', 60.00, 40.00),
  ('elite',    70.00, 30.00)
ON CONFLICT (commission_type) DO NOTHING;

INSERT INTO grooming_allowances_config (group_name, allowance_amount, description) VALUES
  ('Leadership Group', 25000.00, 'HOD and Dean level teachers monthly allowance plan'),
  ('Academic Excellence Group', 10000.00, 'Professor and Senior Professor level teachers monthly allowance plan'),
  ('Teaching Excellence Group', 5000.00, 'Senior Teacher, Executive Teacher, and Lecturer level teachers monthly allowance plan'),
  ('Foundation Group', 0.00, 'Junior and Assistant level teachers allowance plan')
ON CONFLICT (group_name) DO NOTHING;

INSERT INTO performance_slabs_config (id, slab_name, target_revenue, reward_amount, reward_item, grooming_group) VALUES
  ('slab_1', 'Junior Teacher', 100000.00, 5000.00, 'Executive Kit', 'Foundation Group'),
  ('slab_2', 'Assistant Teacher', 300000.00, 25000.00, 'Tablet (25K)', 'Foundation Group'),
  ('slab_3', 'Senior Teacher', 500000.00, 40000.00, 'AC / Refrigerator (40K)', 'Teaching Excellence Group'),
  ('slab_4', 'Executive Teacher', 1000000.00, 80000.00, 'PC / Laptop (80K)', 'Teaching Excellence Group'),
  ('slab_5', 'Lecturer', 2000000.00, 150000.00, 'Bike (1.5L)', 'Teaching Excellence Group'),
  ('slab_6', 'Professor', 3500000.00, 225000.00, 'Bullet (2.25L)', 'Academic Excellence Group'),
  ('slab_7', 'Senior Professor', 5000000.00, 300000.00, 'Family Tour (3L)', 'Academic Excellence Group'),
  ('slab_8', 'HOD', 7500000.00, 400000.00, 'Car (4L)', 'Leadership Group'),
  ('slab_9', 'Dean', 10000000.00, 600000.00, 'Premium Car (6L)', 'Leadership Group')
ON CONFLICT (id) DO NOTHING;
