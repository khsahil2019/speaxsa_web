

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
  ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS subject_expertise VARCHAR(255);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS languages VARCHAR(255);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_level VARCHAR(50) DEFAULT 'Bronze';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS total_ratings INT DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS alt_email VARCHAR(200);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(50);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

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
    ('home_cta_btn_teacher', 'Teach with Us')
  ON CONFLICT (key) DO NOTHING;
`).then(() => {
  console.log("PostgreSQL: Database self-healing migrations verified/created.");
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
  ],
  credentials: true,
}));

// ── Rate Limiting ─────────────────────────────────────────────
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many auth requests', code: 'RATE_LIMITED' } });

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
app.use(express.static(path.join(__dirname, '../public/landing')));
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

// ── Error Handler ─────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
