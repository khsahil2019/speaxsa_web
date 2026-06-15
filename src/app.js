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
  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS guest_name VARCHAR(150);
  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS guest_email VARCHAR(200);
  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(20);
  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS guest_role VARCHAR(50);
  ALTER TABLE parent_student_links ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'pending';
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS teacher_checklist JSONB DEFAULT '{}';
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS agreement_signed BOOLEAN DEFAULT false;
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMPTZ;
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS digital_signature VARCHAR(255);
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
    'https://speaxsa.com',
    'https://admin.speaxsa.com',
    'https://app.speaxsa.com',
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
