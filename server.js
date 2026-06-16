require('dotenv').config();
const app = require('./src/app');
const cron = require('node-cron');

const PORT = process.env.PORT || 5001;

// ── Start Server ──────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║       SPEAXA EdTech Platform — API Server v2.0.0       ║
╠══════════════════════════════════════════════════════════╣
║  Status:    Running                                      ║
║  Port:      ${String(PORT).padEnd(44)}║
║  Env:       ${String(process.env.NODE_ENV || 'development').padEnd(44)}║
║  URL:       http://localhost:${String(PORT).padEnd(33)}║
╚══════════════════════════════════════════════════════════╝
  `);
});

// ── Cron Jobs ─────────────────────────────────────────────────

// Monthly report generation — runs on the 1st of every month at 2 AM IST
cron.schedule('0 20 28-31 * *', async () => {
  // Runs last few days check for month end
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (now.getDate() !== lastDay) return;

  const reportMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  console.log(`[Cron] Generating monthly reports for ${reportMonth}...`);
  try {
    const reportService = require('./src/services/report.service');
    await reportService.generateAllMonthlyReports(reportMonth);
    console.log('[Cron] Monthly reports generated successfully');
  } catch (err) {
    console.error('[Cron] Monthly report generation failed:', err.message);
  }
}, { timezone: 'Asia/Kolkata' });

// Teacher level recalculation — runs every Sunday at 3 AM IST
cron.schedule('0 21 * * 6', async () => {
  console.log('[Cron] Recalculating teacher levels...');
  try {

    const levelService = require('./src/services/teacherLevel.service');
    await levelService.updateAllTeacherLevels();
    console.log('[Cron] Teacher levels updated');
  } catch (err) {
    console.error('[Cron] Teacher level update failed:', err.message);
  }
}, { timezone: 'Asia/Kolkata' });

// Clean expired OTPs — runs every hour
cron.schedule('0 * * * *', async () => {
  try {
    const db = require('./src/db');
    await db.query('DELETE FROM otp_tokens WHERE expires_at < NOW() OR used = true');
  } catch (err) {
    console.error('[Cron] OTP cleanup error:', err.message);
  }
});

// ── Graceful Shutdown ─────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('[Server] Server closed.');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Promise Rejection:', reason);
});

module.exports = server;
