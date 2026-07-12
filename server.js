require('dotenv').config();
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const app = require('./src/app');
app.set('trust proxy', 1);
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./src/middleware/auth');
const db = require('./src/db');

const PORT = process.env.PORT || 5001;

// ── Create HTTP server & attach Socket.io ────────────────────
const server = http.createServer(app);

const io = new SocketIO(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      `http://localhost:${PORT}`,
      'http://localhost:5001',
      'http://localhost:5002',
      'https://speaxa.com',
      'https://speaxa.in',
      'https://www.speaxa.in',
    ],
    methods: ['GET', 'POST'],
  },
});

// ── Classroom Socket.io Hub ───────────────────────────────────
// Tracks participants: { classId → { socketId → { name, role, userId } } }
const classRooms = {};

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  const user = socket.user;

  // ── Join classroom room ────────────────────────
  socket.on('join-class', ({ classId }) => {
    if (!classId) return;
    socket.join(classId);

    if (!classRooms[classId]) classRooms[classId] = {};
    classRooms[classId][socket.id] = {
      socketId: socket.id,
      name: user.name,
      role: user.role,
      userId: user.id,
    };

    // Broadcast updated participant list to everyone in room
    io.to(classId).emit('participants-update', Object.values(classRooms[classId]));

    // Notify others
    socket.to(classId).emit('user-joined', { name: user.name, role: user.role });

    console.log(`[Socket] ${user.name} (${user.role}) joined class ${classId}`);
  });

  // ── Chat message ───────────────────────────────
  socket.on('chat-message', ({ classId, text }) => {
    if (!classId || !text) return;
    io.to(classId).emit('chat-message', {
      socketId: socket.id,
      sender: user.name,
      role: user.role,
      text,
      time: Date.now(),
    });
  });

  // ── Whiteboard draw point ──────────────────────
  socket.on('board-draw', ({ classId, x, y, start }) => {
    if (!classId) return;
    socket.to(classId).emit('board-draw', { x, y, start, name: user.name });
  });

  // ── Whiteboard clear ───────────────────────────
  socket.on('board-clear', ({ classId }) => {
    if (!classId) return;
    socket.to(classId).emit('board-clear');
  });

  // ── Raise hand ────────────────────────────────
  socket.on('raise-hand', ({ classId }) => {
    if (!classId) return;
    socket.to(classId).emit('raise-hand', { name: user.name });
  });

  // ── Poll broadcast (teacher → students) ───────
  socket.on('poll-launched', ({ classId, poll }) => {
    if (!classId || !poll) return;
    socket.to(classId).emit('poll-launched', poll);
  });

  // ── WebRTC signaling relay (simulation mode) ──
  socket.on('webrtc-signal', ({ targetSocketId, signal }) => {
    io.to(targetSocketId).emit('webrtc-signal', {
      senderSocketId: socket.id,
      signal
    });
  });

  // ── Disconnect ────────────────────────────────
  socket.on('disconnect', () => {
    for (const classId of Object.keys(classRooms)) {
      if (classRooms[classId][socket.id]) {
        const leaving = classRooms[classId][socket.id];
        delete classRooms[classId][socket.id];

        // Broadcast updated participant list
        io.to(classId).emit('participants-update', Object.values(classRooms[classId]));
        socket.to(classId).emit('user-left', { name: leaving.name, role: leaving.role });

        // If the leaving user was a student, mark exit and run auto-attendance after a 10s grace period (for reloads/reconnects)
        if (leaving.role === 'student') {
          setTimeout(async () => {
            // Verify they didn't reconnect in the meantime
            const stillConnected = classRooms[classId] && 
              Object.values(classRooms[classId]).some(p => p.userId === leaving.userId);
            
            if (!stillConnected) {
              console.log(`[Socket] Student ${leaving.name} left class ${classId}. Recording exit & auto-attendance.`);
              try {
                // Find current active session
                const sessionRes = await db.query(`
                  SELECT * FROM class_participants 
                  WHERE class_id = $1 AND user_id = $2 AND exit_time IS NULL
                `, [classId, leaving.userId]);

                if (sessionRes.rows.length > 0) {
                  const s = sessionRes.rows[0];
                  const joinTime = new Date(s.join_time);
                  const exitTime = new Date();
                  const durationMins = Math.max(1, Math.round((exitTime - joinTime) / 60000));

                  // Update exit time & duration
                  await db.query(`
                    UPDATE class_participants 
                    SET exit_time = NOW(), duration_mins = $1 
                    WHERE id = $2
                  `, [durationMins, s.id]);

                  // Fetch class metadata
                  const classRes = await db.query('SELECT * FROM live_classes WHERE id = $1', [classId]);
                  const liveClass = classRes.rows[0];
                  if (liveClass) {
                    const classDuration = liveClass.duration_mins || 60;
                    const scheduledStart = liveClass.started_at ? new Date(liveClass.started_at) : joinTime;
                    const lateThreshold = 10; // minutes
                    const halfThreshold = 0.5; // 50%

                    const minutesLate = Math.max(0, Math.round((joinTime - scheduledStart) / 60000));
                    const attendancePct = classDuration > 0 ? durationMins / classDuration : 0;

                    let status = 'absent';
                    if (attendancePct >= halfThreshold) {
                      if (minutesLate > lateThreshold) status = 'late';
                      else status = 'present';
                    } else if (durationMins > 0) {
                      status = 'half';
                    }

                    // Check if attendance row already exists
                    const existingAtt = await db.query(`
                      SELECT id FROM attendance WHERE class_id = $1 AND student_id = $2
                    `, [classId, leaving.userId]);

                    if (existingAtt.rows.length > 0) {
                      await db.query(`
                        UPDATE attendance 
                        SET exit_time = NOW(), duration_mins = $1, status = $2, attendance_date = CURRENT_DATE
                        WHERE id = $3
                      `, [durationMins, status, existingAtt.rows[0].id]);
                    } else {
                      const attId = 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                      const dateStr = new Date().toISOString().split('T')[0];
                      await db.query(`
                        INSERT INTO attendance (id, class_id, batch_id, student_id, teacher_id, join_time, exit_time,
                          duration_mins, class_duration_mins, status, attendance_date)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                      `, [attId, classId, liveClass.batch_id, leaving.userId, liveClass.teacher_id,
                          joinTime, exitTime, durationMins, classDuration, status, dateStr]);
                    }
                  }
                }
              } catch (err) {
                console.error('[Socket] Auto-attendance disconnect hook error:', err.message);
              }
            }
          }, 10000); // 10s grace period for client network fluctuations / page refreshes
        }

        if (Object.keys(classRooms[classId]).length === 0) {
          delete classRooms[classId];
        }
        break;
      }
    }
    console.log(`[Socket] ${user.name} disconnected`);
  });
});

// Export io so routes can use it if needed
app.set('io', io);

// ── Start Server ──────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  // Detect local network IP for mobile device testing
  const os = require('os');
  const nets = os.networkInterfaces();
  let localIP = 'unknown';
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) { localIP = net.address; break; }
    }
    if (localIP !== 'unknown') break;
  }
  console.log(`
╔══════════════════════════════════════════════════════════╗
║       SPEAXA EdTech Platform — API Server v2.0.0       ║
╠══════════════════════════════════════════════════════════╣
║  Status:    Running                                      ║
║  Port:      ${String(PORT).padEnd(44)}║
║  Env:       ${String(process.env.NODE_ENV || 'development').padEnd(44)}║
║  Local:     http://localhost:${String(PORT).padEnd(33)}║
║  Network:   http://${localIP}:${String(PORT).padEnd(30)}║
║  Sockets:   Enabled (Socket.io classroom hub)           ║
╚══════════════════════════════════════════════════════════╝
  `);
});

// ── Cron Jobs ─────────────────────────────────────────────────

// Monthly report generation — runs on last day of month at 2 AM IST
cron.schedule('0 20 28-31 * *', async () => {
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


