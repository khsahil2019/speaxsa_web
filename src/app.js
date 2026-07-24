

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Database Self-Healing Migrations ──────────────────────────
const db = require('./db');
db.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS password_plain VARCHAR(255);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS qualification VARCHAR(255);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS subject_expertise VARCHAR(255);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS languages VARCHAR(255);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS board VARCHAR(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS grade VARCHAR(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS student_code VARCHAR(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'approved';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_level VARCHAR(50) DEFAULT NULL;
  ALTER TABLE users ALTER COLUMN teacher_level DROP DEFAULT;
  UPDATE users SET teacher_level = NULL WHERE role = 'teacher' AND (teacher_level = 'Bronze' OR teacher_level = 'Junior Teacher') AND id NOT IN (SELECT DISTINCT teacher_id FROM batches);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS total_ratings INT DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS alt_email VARCHAR(200);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(50);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS learning_streak INT DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS impersonated_by VARCHAR(100);

  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS guest_name VARCHAR(150);
  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS guest_email VARCHAR(200);
  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(20);
  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS guest_role VARCHAR(50);
  ALTER TABLE parent_student_links ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'pending';
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS teacher_checklist JSONB DEFAULT '{}';
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS agreement_signed BOOLEAN DEFAULT false;
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMPTZ;
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS digital_signature VARCHAR(255);
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS availability TEXT;
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS item_approvals JSONB DEFAULT '{}';
  ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_capacity_check;

  ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) REFERENCES users(id);
  ALTER TABLE courses ADD COLUMN IF NOT EXISTS custom_tag VARCHAR(255);
  ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;
  ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
  ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_duration VARCHAR(255);
  ALTER TABLE courses ADD COLUMN IF NOT EXISTS objective TEXT;
  ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_outcome TEXT;
  ALTER TABLE courses ADD COLUMN IF NOT EXISTS language_instruction VARCHAR(100);
  ALTER TABLE courses ADD COLUMN IF NOT EXISTS daily_class_duration VARCHAR(100);
  ALTER TABLE courses ADD COLUMN IF NOT EXISTS assessment_days VARCHAR(100);
  ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_status_check;
  ALTER TABLE courses ADD CONSTRAINT courses_status_check CHECK (status IN ('active', 'archived', 'draft', 'pending_approval', 'rejected'));
  ALTER TABLE batches ADD COLUMN IF NOT EXISTS planner_url TEXT;
  ALTER TABLE batches ADD COLUMN IF NOT EXISTS planner_name VARCHAR(255);
  ALTER TABLE batches ADD COLUMN IF NOT EXISTS planner_desc TEXT;
  ALTER TABLE batches ADD COLUMN IF NOT EXISTS teaching_method TEXT;
  ALTER TABLE batches ADD COLUMN IF NOT EXISTS batch_instructions TEXT;

  -- Drop UNIQUE constraint on users(email) to allow duplicate emails (handled programmatically by signup rules)
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

  ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL;

  CREATE TABLE IF NOT EXISTS teacher_wallet_ledger (
    id VARCHAR(100) PRIMARY KEY,
    teacher_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'course_share', 'student_referral', 'teacher_referral', 'grooming_allowance', 'slab_reward', 'withdrawal'
    description TEXT,
    payment_id VARCHAR(100) REFERENCES payments(id) ON DELETE SET NULL,
    referred_user_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    source VARCHAR(100) DEFAULT 'landing_page',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS teacher_rewards (
    id VARCHAR(100) PRIMARY KEY,
    teacher_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slab_name VARCHAR(100) NOT NULL,
    target_revenue DECIMAL(10,2) NOT NULL,
    reward_amount DECIMAL(10,2) NOT NULL,
    reward_item VARCHAR(255) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'released')),
    admin_notes TEXT,
    achieved_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by VARCHAR(100) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS teacher_allowances (
    id VARCHAR(100) PRIMARY KEY,
    teacher_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_name VARCHAR(100) NOT NULL,
    allowance_amount DECIMAL(10,2) NOT NULL,
    payment_month VARCHAR(7) NOT NULL, -- YYYY-MM
    status VARCHAR(30) DEFAULT 'paid' CHECK (status IN ('pending', 'paid')),
    paid_at TIMESTAMPTZ DEFAULT NOW()
  );

  ALTER TABLE teacher_payouts ADD COLUMN IF NOT EXISTS razorpay_payout_id VARCHAR(200);
  ALTER TABLE teacher_payouts ADD COLUMN IF NOT EXISTS razorpay_payout_status VARCHAR(50);
  ALTER TABLE teacher_payouts ADD COLUMN IF NOT EXISTS razorpay_fund_account_id VARCHAR(200);
  ALTER TABLE teacher_payouts ADD COLUMN IF NOT EXISTS razorpay_contact_id VARCHAR(200);

  CREATE TABLE IF NOT EXISTS performance_slabs_config (
    id VARCHAR(100) PRIMARY KEY,
    slab_name VARCHAR(100) NOT NULL UNIQUE,
    target_revenue DECIMAL(10,2) NOT NULL,
    reward_amount DECIMAL(10,2) NOT NULL,
    reward_item VARCHAR(255) NOT NULL,
    grooming_group VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS grooming_allowances_config (
    group_name VARCHAR(100) PRIMARY KEY,
    allowance_amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

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
  ON CONFLICT (slab_name) DO NOTHING;

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
  ('payout_pct_Dean', '90.00')
  ON CONFLICT (key) DO NOTHING;


  CREATE TABLE IF NOT EXISTS teacher_certificates (
    id VARCHAR(100) PRIMARY KEY,
    teacher_id VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
    certificate_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
  );

  -- Retroactively issue SOP Verification certificates to legacy approved teachers
  INSERT INTO teacher_certificates (id, teacher_id, certificate_type, title, description, metadata)
  SELECT 
    'cert_sop_' || u.id as id,
    u.id as teacher_id,
    'sop_completed' as certificate_type,
    'SOP Verification & Teaching Compliance Certificate' as title,
    'This certificate is awarded to acknowledge that the teacher has successfully completed the Speaxa Standard Operating Procedures (SOP) verification, technical compliance checks, and teaching standards certification.' as description,
    '{"retroactive": true}'::jsonb as metadata
  FROM users u
  JOIN teacher_sop ts ON ts.teacher_id = u.id
  WHERE u.role = 'teacher' 
    AND u.approval_status = 'approved' 
    AND ts.agreement_signed = true
    AND NOT EXISTS (
      SELECT 1 FROM teacher_certificates tc 
      WHERE tc.teacher_id = u.id AND tc.certificate_type = 'sop_completed'
    )
  ON CONFLICT (id) DO NOTHING;

  -- Retroactively issue Course Selection certificates to legacy active courses
  INSERT INTO teacher_certificates (id, teacher_id, certificate_type, title, description, metadata)
  SELECT 
    'cert_course_' || c.id as id,
    c.created_by as teacher_id,
    'course_verified' as certificate_type,
    'Course Selection & Verification Certificate' as title,
    'This certificate is awarded to acknowledge that the course "' || c.title || '" has been reviewed, approved, and verified for the Speaxa interactive live curriculum.' as description,
    json_build_object('course_id', c.id, 'course_title', c.title, 'retroactive', true)::jsonb as metadata
  FROM courses c
  WHERE c.status = 'active' 
    AND c.created_by IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM teacher_certificates tc 
      WHERE tc.teacher_id = c.created_by 
        AND tc.certificate_type = 'course_verified' 
        AND (tc.metadata->>'course_id' = c.id OR tc.title LIKE '%' || c.title || '%')
    )
  ON CONFLICT (id) DO NOTHING;


  INSERT INTO platform_settings (key, value) VALUES
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
    ('home_footer_url_safety', '/privacy.html'),
    ('privacy_policy_content', '<h3>Speaxa Privacy & Child Safety Policy</h3><p>We are committed to maintaining a safe learning environment for all students...</p>'),
    ('privacy_policy_badge', 'Legal Agreements'),
    ('privacy_policy_title', 'Privacy Policy'),
    ('privacy_policy_desc', 'How we collect, store, and process your data securely at SPEAXA.'),
    ('terms_of_service_content', '<h4 class="text-white mb-3">1. Account Security</h4><p>Portal access (Admin, Student, Teacher, Parent) requires standard password/OTP authentication credentials. You are solely responsible for preventing unauthorized login access to your account dashboards. Please notify us immediately if you suspect security compromise.</p><h4 class="text-white mb-3 mt-4">2. Interactive Code of Conduct</h4><p>Our virtual live classroom room relies on respectful interactive communication. Any student or parent found engaging in harassment, chat spamming, whiteboard vandalism, or inappropriate video streams will have their account immediately suspended or banned without refund.</p><h4 class="text-white mb-3 mt-4">3. Teacher Commitments</h4><p>Educators must submit accurate credentials and follow correct SOP video upload instructions. Live classes must start on the scheduled batch time. Auto-attendance reports calculate class durations, and payout commissions depend strictly on completing these classes.</p><h4 class="text-white mb-3 mt-4">4. Intellectual Property</h4><p>All curriculum material, live stream feeds, whiteboard drawings, course videos, and dashboard software belong exclusively to SPEAXA. Copying, recording external feeds, or reproducing material elsewhere is strictly prohibited.</p>'),
    ('terms_of_service_badge', 'Platform Policies'),
    ('terms_of_service_title', 'Terms of Service'),
    ('terms_of_service_desc', 'Please read these terms carefully before accessing the SPEAXA portals.'),
    ('sms_provider', 'msg91'),
    ('email_provider', 'smtp'),
    ('msg91_auth_key', '553058AYf7gbSf7ue6a60dfb6P1'),
    ('msg91_template_id', ''),
    ('msg91_sender_id', 'SPXSA'),
    ('twilio_account_sid', ''),
    ('twilio_auth_token', ''),
    ('twilio_from_phone', ''),
    ('fast2sms_api_key', ''),
    ('fast2sms_route', 'otp'),
    ('fast2sms_sender_id', 'SPXSA'),
    ('custom_sms_url', ''),
    ('custom_sms_method', 'GET'),
    ('custom_sms_headers', '{}'),
    ('custom_sms_body', '{}'),
    ('otp_expiry_minutes', '5'),
    ('otp_length', '6'),
    ('dev_otp_in_response', 'true'),
    ('master_otp', ''),
    ('firebase_api_key', ''),
    ('firebase_auth_domain', ''),
    ('firebase_project_id', ''),
    ('firebase_storage_bucket', ''),
    ('firebase_messaging_sender_id', ''),
    ('firebase_app_id', ''),
    ('firebase_measurement_id', '')
  ON CONFLICT (key) DO NOTHING;

  INSERT INTO platform_settings (key, value) VALUES ('msg91_auth_key', '553058AYf7gbSf7ue6a60dfb6P1')
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value WHERE platform_settings.value = '' OR platform_settings.value IS NULL;

  ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

  CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  ALTER TABLE otp_tokens ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(50);
  ALTER TABLE otp_tokens ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'pending';
  ALTER TABLE otp_tokens ADD COLUMN IF NOT EXISTS delivery_error TEXT;
  ALTER TABLE otp_tokens ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0;

  CREATE TABLE IF NOT EXISTS parent_teacher_chats (
    id SERIAL PRIMARY KEY,
    parent_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN DEFAULT false
  );
  ALTER TABLE parent_teacher_chats ADD COLUMN IF NOT EXISTS image_url TEXT;
  CREATE INDEX IF NOT EXISTS idx_pt_chats_lookup ON parent_teacher_chats (parent_id, teacher_id, student_id);

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

  CREATE TABLE IF NOT EXISTS email_campaigns (
    id VARCHAR(100) PRIMARY KEY,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    target_role VARCHAR(50) NOT NULL,
    recipient_count INT DEFAULT 0,
    sent_by VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

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

  CREATE TABLE IF NOT EXISTS faqs (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS media_gallery (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`).then(async () => {
  console.log("PostgreSQL: Database self-healing migrations verified/created.");

  // Seed blogs if empty
  try {
    const blogCount = await db.query("SELECT COUNT(*) FROM blogs");
    if (parseInt(blogCount.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO blogs (title, slug, content, summary, banner_url, author, created_at)
        VALUES 
        (
          'How to Plan Your CBSE Class 10 Revision Schedule',
          'how-to-plan-your-cbse-class-10-revision-schedule',
          '<p>Managing multiple subjects can feel overwhelming. In this post, we explain how to plan your CBSE Class 10 revision schedule effectively. Structure your daily physics and math routines for maximum retention, take regular breaks, practice previous years question papers, and ensure concept clarity over blind memorization. Our elite mentors suggest a balanced approach focusing on weak chapters first.</p>',
          'Managing multiple subjects can feel overwhelming. Learn how to structure your daily physics and math routines for maximum retention.',
          '/uploads/blog/blog_revision.png',
          'Admin',
          NOW()
        ),
        (
          'Visualizing Organic Chemistry: Tips and Tricks',
          'visualizing-organic-chemistry-tips-and-tricks',
          '<p>Organic Chemistry does not have to be about boring rote learning. Forget memorizing equations blindly. Our elite chemistry mentors share simple visual techniques to master chemical reactions. By understanding reaction mechanisms, visualizing electron shifts, and drawing structure trees, you can build an intuitive understanding of complex compounds and reactions.</p>',
          'Forget memorizing equations blindly. Our elite chemistry mentors share simple visual techniques to master chemical reactions.',
          '/uploads/blog/blog_chemistry.png',
          'Admin',
          NOW()
        ),
        (
          'The Role of Parents in Remote EdTech Success',
          'the-role-of-parents-in-remote-edtech-success',
          '<p>Online learning is highly interactive, but parental support can play a vital role. Supporting your child in online classrooms doesn''t require teaching them the subject. Instead, focus on creating a quiet, distraction-free study space, monitoring their dashboard telemetry (attendance and class participation logs), and encouraging active participation during live quizzes and group discussions.</p>',
          'Supporting your child in online classrooms doesn''t require teaching. Understand how to monitor telemetry and encourage active participation.',
          '/uploads/blog/blog_parenting.png',
          'Admin',
          NOW()
        )
      `);
      console.log("PostgreSQL: Seeded 3 default blogs.");
    }
  } catch (err) {
    console.error("PostgreSQL Blogs Seeding Error:", err.message);
  }

  // Seed FAQs if empty
  try {
    const faqCount = await db.query("SELECT COUNT(*) FROM faqs");
    if (parseInt(faqCount.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO faqs (question, answer, category, sort_order)
        VALUES 
        (
          'How do students join a live class room?',
          'Students simply login to their student dashboard, click on ''My Batches'', select the scheduled class, and click the ''Join Class'' button. It will open our custom Agora live room directly inside their browser — no external apps required!',
          'Classes',
          1
        ),
        (
          'What parameters does the parent dashboard track?',
          'The parent portal links directly to the student via code SPX-STU-XXXXXX and visualizes: Real-time attendance status (Present, Late, Half-Day, Absent), Graded assignments scores, and 7 key student observation ratings graded by teachers (Curiosity, Communication, Concept clarity, Logical reasoning, Homework completion, In-class responses, and Behavioral growth).',
          'Analytics',
          2
        ),
        (
          'How does the teacher verification process (SOP) work?',
          'Every teacher wishing to host live classes must submit their professional qualification credentials and upload 5 specific Standard Operating Procedure (SOP) training videos. The platform administrator reviews these submissions via an interactive review panel and manually approves the account before they can schedule batches.',
          'Verification',
          3
        ),
        (
          'What is the refund policy for enrollment fees?',
          'If a student is unsatisfied, they can request a refund. The administrator can verify and process the refund status directly to the Razorpay gateway through the admin portal.',
          'Billing',
          4
        )
      `);
      console.log("PostgreSQL: Seeded 4 default FAQs.");
    }
  } catch (err) {
    console.error("PostgreSQL FAQs Seeding Error:", err.message);
  }
}).catch((err) => {
  console.error("PostgreSQL Migration Warning:", err.message);
});

// ── Security Headers ──────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5001',
    'http://localhost:5002',
    'https://speaxa.com',
    'https://admin.speaxa.com',
    'https://app.speaxa.com',
    'https://speaxa.in',
    'https://admin.speaxa.in',
    'https://app.speaxa.in',
    'https://www.speaxa.in',
  ],
  credentials: true,
}));

// ── Rate Limiting ─────────────────────────────────────────────
const globalLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 10000, 
  standardHeaders: true, 
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production'
});
const authLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 5000, 
  message: { error: 'Too many auth requests. Please wait a moment.', code: 'RATE_LIMITED' },
  skip: () => process.env.NODE_ENV !== 'production'
});

// Protect sensitive authentication endpoints from abuse
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

app.use('/api', globalLimiter);

// ── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Static Files ──────────────────────────────────────────────
app.use('/logo.png', (req, res) => res.sendFile(path.join(__dirname, '../public/logo.png')));
app.use('/admin/logo.png', (req, res) => res.sendFile(path.join(__dirname, '../public/logo.png')));
app.use('/utils-formatting.js', (req, res) => res.sendFile(path.join(__dirname, '../public/utils-formatting.js')));
app.use('/utils-autosave.js', (req, res) => res.sendFile(path.join(__dirname, '../public/utils-autosave.js')));
app.use('/firebase-notifications.js', (req, res) => res.sendFile(path.join(__dirname, '../public/firebase-notifications.js')));
app.use('/firebase-messaging-sw.js', (req, res) => res.sendFile(path.join(__dirname, '../public/firebase-messaging-sw.js')));
app.use('/api-center.html', (req, res) => res.sendFile(path.join(__dirname, '../public/landing/api-center.html')));
app.use(express.static(path.join(__dirname, '../public/landing')));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));
app.use('/teacher', express.static(path.join(__dirname, '../public/teacher')));
app.use('/parent', express.static(path.join(__dirname, '../public/parent')));
app.use('/student', express.static(path.join(__dirname, '../public/student')));
app.use('/live', express.static(path.join(__dirname, '../public/live')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.get('/verify-certificate', (req, res) => res.sendFile(path.join(__dirname, '../public/landing/verify-certificate.html')));

// ── Health Check ──────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const db = require('./db');
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', version: '2.0.0', environment: process.env.NODE_ENV, db_status: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db_status: 'disconnected' });
  }
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api', routes);

// ── SPA Fallbacks ─────────────────────────────────────────────
app.get('/admin/*', (req, res) => res.sendFile(path.join(__dirname, '../public/admin/index.html')));
app.get('/teacher/*', (req, res) => res.sendFile(path.join(__dirname, '../public/teacher/index.html')));
app.get('/student/*', (req, res) => res.sendFile(path.join(__dirname, '../public/student/index.html')));
app.get('/parent/*', (req, res) => res.sendFile(path.join(__dirname, '../public/parent/index.html')));
app.get('/live/*', (req, res) => res.sendFile(path.join(__dirname, '../public/live/room.html')));

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found', code: 'ROUTE_NOT_FOUND' }));

// ── Auto Cleanup Old Chat Attachments (Older than 10 days) ──────
async function cleanupOldChatAttachments() {
  try {
    const db = require('./db');
    const oldChats = await db.query(`
      SELECT id, image_url 
      FROM parent_teacher_chats 
      WHERE image_url IS NOT NULL 
        AND image_url != '' 
        AND created_at < NOW() - INTERVAL '10 days'
    `);

    for (const chat of oldChats.rows) {
      if (chat.image_url) {
        const filePath = path.join(__dirname, '../public', chat.image_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    if (oldChats.rows.length > 0) {
      await db.query(`
        UPDATE parent_teacher_chats 
        SET image_url = NULL 
        WHERE image_url IS NOT NULL 
          AND image_url != '' 
          AND created_at < NOW() - INTERVAL '10 days'
      `);
      console.log(`Cleaned up ${oldChats.rows.length} expired chat image attachments (older than 10 days).`);
    }
  } catch (err) {
    console.warn('Chat attachment cleanup error:', err.message);
  }
}

// Run cleanup on server startup and every 24 hours
setTimeout(cleanupOldChatAttachments, 5000);
setInterval(cleanupOldChatAttachments, 24 * 60 * 60 * 1000);

module.exports = app;
