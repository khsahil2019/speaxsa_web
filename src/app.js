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

  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS guest_name VARCHAR(150);
  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS guest_email VARCHAR(200);
  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(20);
  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS guest_role VARCHAR(50);
  ALTER TABLE parent_student_links ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'pending';
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS teacher_checklist JSONB DEFAULT '{}';
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS agreement_signed BOOLEAN DEFAULT false;
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMPTZ;
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS digital_signature VARCHAR(255);

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
app.use('/api/auth', authLimiter);
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
