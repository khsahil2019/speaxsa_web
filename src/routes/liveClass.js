const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generateUID } = require('../utils/security');
const { generateRTCToken, generateRTMToken } = require('../services/AgoraService');
const { logAudit } = require('../services/AuditService');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

router.use(authenticateToken);

// ── Class Info (for local simulation UI) ─────────────────────
router.get('/:classId/info', async (req, res) => {
  const { classId } = req.params;
  try {
    const result = await db.query(`
      SELECT lc.id, lc.title, lc.class_date, lc.class_time, lc.status,
             u.name as teacher_name, u.photo_url as teacher_photo,
             b.batch_name
      FROM live_classes lc
      LEFT JOIN users u ON u.id = lc.teacher_id
      LEFT JOIN batches b ON b.id = lc.batch_id
      WHERE lc.id = $1
    `, [classId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Class not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Generate Agora Token ──────────────────────────────────────
router.post('/token', async (req, res) => {
  const { classId, role } = req.body; // role: 'publisher' or 'subscriber'
  try {
    const classRes = await db.query('SELECT * FROM live_classes WHERE id = $1', [classId]);
    if (!classRes.rows.length) return res.status(404).json({ error: 'Class not found' });
    const liveClass = classRes.rows[0];

    const uid = Math.floor(Math.random() * 100000);
    const agoraRole = req.user.role === 'teacher' ? 'publisher' : (role || 'subscriber');

    const [rtc, rtm] = await Promise.all([
      generateRTCToken(liveClass.agora_channel, uid, agoraRole),
      generateRTMToken(req.user.id),
    ]);

    res.json({ rtc, rtm, channel: liveClass.agora_channel, uid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start Class (Teacher) ─────────────────────────────────────
router.post('/:classId/start', async (req, res) => {
  const { classId } = req.params;
  try {
    // Verify teacher SOP
    if (req.user.role === 'teacher') {
      const sop = await db.query("SELECT status, agreement_signed FROM teacher_sop WHERE teacher_id = $1", [req.user.id]);
      if (!sop.rows.length || sop.rows[0].status !== 'approved' || !sop.rows[0].agreement_signed) {
        return res.status(403).json({ error: 'SOP not approved or Digital Agreement not signed. Cannot start live class.' });
      }

      // Check no simultaneous classes (excluding the current class)
      const active = await db.query("SELECT id FROM live_classes WHERE teacher_id = $1 AND status = 'live' AND id != $2", [req.user.id, classId]);
      if (active.rows.length > 0) {
        return res.status(400).json({ error: 'You already have a live class in progress' });
      }
    }

    const classRes = await db.query('SELECT * FROM live_classes WHERE id = $1', [classId]);
    if (!classRes.rows.length) return res.status(404).json({ error: 'Class not found' });

    await db.query(
      "UPDATE live_classes SET status = 'live', started_at = NOW() WHERE id = $1",
      [classId]
    );

    // Generate teacher token
    const uid = Math.floor(Math.random() * 100000);
    const rtc = await generateRTCToken(classRes.rows[0].agora_channel, uid, 'publisher');
    const rtm = await generateRTMToken(req.user.id);

    await logAudit(req.user.id, 'CLASS_STARTED', 'live_class', classId, { channel: classRes.rows[0].agora_channel });

    res.json({ message: 'Class started', rtc, rtm, channel: classRes.rows[0].agora_channel, uid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Join Class (Student/Admin) ────────────────────────────────
router.post('/:classId/join', async (req, res) => {
  const { classId } = req.params;
  try {
    const classRes = await db.query('SELECT * FROM live_classes WHERE id = $1', [classId]);
    if (!classRes.rows.length) return res.status(404).json({ error: 'Class not found' });

    const liveClass = classRes.rows[0];
    if (liveClass.status !== 'live' && liveClass.status !== 'scheduled') {
      return res.status(400).json({ error: 'Class is not currently live or scheduled' });
    }

    // Check student is enrolled in this batch
    if (req.user.role === 'student') {
      const enrolled = await db.query(
        'SELECT id FROM batch_students WHERE batch_id = $1 AND student_id = $2 AND status = $3',
        [liveClass.batch_id, req.user.id, 'active']
      );
      if (!enrolled.rows.length) {
        return res.status(403).json({ error: 'You are not enrolled in this batch' });
      }

      // Check no simultaneous class joining
      const alreadyInClass = await db.query(`
        SELECT cp.id FROM class_participants cp
        JOIN live_classes lc ON lc.id = cp.class_id
        WHERE cp.user_id = $1 AND lc.status = 'live' AND cp.exit_time IS NULL AND cp.class_id != $2
      `, [req.user.id, classId]);
      if (alreadyInClass.rows.length > 0) {
        return res.status(400).json({ error: 'You are already in another live class' });
      }
    }

    const uid = Math.floor(Math.random() * 100000);
    const rtc = await generateRTCToken(liveClass.agora_channel, uid, 'subscriber');
    const rtm = await generateRTMToken(req.user.id);

    // Record join time
    await db.query(`
      INSERT INTO class_participants (class_id, batch_id, user_id, role, join_time)
      VALUES ($1,$2,$3,$4,NOW())
      ON CONFLICT (class_id, user_id) DO UPDATE SET join_time = NOW(), exit_time = NULL
    `, [classId, liveClass.batch_id, req.user.id, req.user.role]);

    await logAudit(req.user.id, 'CLASS_JOINED', 'live_class', classId, {});

    res.json({ message: 'Joined class', rtc, rtm, channel: liveClass.agora_channel, uid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Leave Class ───────────────────────────────────────────────
router.post('/:classId/leave', async (req, res) => {
  const { classId } = req.params;
  try {
    const participant = await db.query(`
      UPDATE class_participants SET exit_time = NOW() 
      WHERE class_id = $1 AND user_id = $2 AND exit_time IS NULL
      RETURNING *
    `, [classId, req.user.id]);

    if (participant.rows.length > 0) {
      const p = participant.rows[0];
      const joinTime = new Date(p.join_time);
      const exitTime = new Date();
      const durationMins = Math.round((exitTime - joinTime) / 60000);

      await db.query('UPDATE class_participants SET duration_mins = $1 WHERE id = $2', [durationMins, p.id]);

      // Auto-mark attendance if student
      if (req.user.role === 'student') {
        await markAutoAttendance(classId, req.user.id, p.join_time, exitTime, durationMins);
      }
    }

    res.json({ message: 'Left class' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── End Class (Teacher/Admin) ─────────────────────────────────
router.post('/:classId/end', async (req, res) => {
  const { classId } = req.params;
  try {
    const classRes = await db.query('SELECT * FROM live_classes WHERE id = $1', [classId]);
    if (!classRes.rows.length) return res.status(404).json({ error: 'Class not found' });
    const liveClass = classRes.rows[0];

    // Only teacher of the class or admin can end
    if (req.user.role === 'teacher' && liveClass.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only end your own classes' });
    }

    const startedAt = liveClass.started_at ? new Date(liveClass.started_at) : new Date();
    const now = new Date();
    const durationMins = isNaN(startedAt.getTime()) ? 0 : Math.round((now - startedAt) / 60000);

    await db.query(`
      UPDATE live_classes SET status = 'ended', ended_at = NOW(), duration_mins = $1
      WHERE id = $2
    `, [durationMins, classId]);

    // Auto-mark attendance for all participants who haven't left
    const participants = await db.query(`
      SELECT * FROM class_participants WHERE class_id = $1 AND exit_time IS NULL AND role = 'student'
    `, [classId]);

    for (const p of participants.rows) {
      const joinTime = new Date(p.join_time);
      const pDurationMins = Math.round((now - joinTime) / 60000);
      await db.query('UPDATE class_participants SET exit_time = NOW(), duration_mins = $1 WHERE id = $2', [pDurationMins, p.id]);
      await markAutoAttendance(classId, p.user_id, p.join_time, now, pDurationMins, durationMins);
    }

    // Save recording stub (class recording)
    const recordingUrl = req.body.recording_url || 'https://download.agora.io/demo/test/agora-recording-demo.mp4';
    const recId = generateUID('rec');
    await db.query(`
      INSERT INTO recordings (id, class_id, batch_id, title, recording_url, duration_mins)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [recId, classId, liveClass.batch_id, liveClass.title, recordingUrl, durationMins]);

    await logAudit(req.user.id, 'CLASS_ENDED', 'live_class', classId, { durationMins });
    res.json({ message: 'Class ended', durationMins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Auto Attendance Helper ────────────────────────────────────
async function markAutoAttendance(classId, studentId, joinTime, exitTime, durationMins, classDurationMins = 60) {
  try {
    // Get class details for duration
    const classRes = await db.query('SELECT * FROM live_classes WHERE id = $1', [classId]);
    const liveClass = classRes.rows[0];
    if (!liveClass) return;

    const classDuration = classDurationMins || liveClass.duration_mins || 60;
    const scheduledStart = liveClass.started_at ? new Date(liveClass.started_at) : new Date(joinTime);
    const lateThreshold = 10; // minutes
    const halfThreshold = 0.5; // 50% of class duration

    const minutesLate = Math.max(0, Math.round((new Date(joinTime) - scheduledStart) / 60000));
    const attendancePct = classDuration > 0 ? durationMins / classDuration : 0;

    let status = 'absent';
    if (attendancePct >= halfThreshold) {
      if (minutesLate > lateThreshold) status = 'late';
      else status = 'present';
    } else if (durationMins > 0) {
      status = 'half';
    }

    const attId = generateUID('att');
    await db.query(`
      INSERT INTO attendance (id, class_id, batch_id, student_id, teacher_id, join_time, exit_time,
        duration_mins, class_duration_mins, status, attendance_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT DO NOTHING
    `, [attId, classId, liveClass.batch_id, studentId, liveClass.teacher_id,
        joinTime, exitTime, durationMins, classDuration, status, new Date().toISOString().split('T')[0]]);
  } catch (err) {
    console.error('[LiveClass] Auto-attendance error:', err.message);
  }
}

// ── Polls ─────────────────────────────────────────────────────
router.post('/:classId/polls', async (req, res) => {
  const { classId } = req.params;
  const { question, options, correct_option } = req.body;
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only teachers can create polls' });
    }
    const id = generateUID('poll');
    await db.query(`
      INSERT INTO class_polls (id, class_id, teacher_id, question, options, correct_option)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [id, classId, req.user.id, question, JSON.stringify(options), correct_option]);
    res.status(201).json({ message: 'Poll created', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:classId/polls', async (req, res) => {
  const { classId } = req.params;
  try {
    const result = await db.query('SELECT * FROM class_polls WHERE class_id = $1 AND is_active = true ORDER BY created_at DESC', [classId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/polls/:pollId/respond', async (req, res) => {
  const { pollId } = req.params;
  const { selected_option } = req.body;
  try {
    await db.query(`
      INSERT INTO class_poll_responses (poll_id, student_id, selected_option)
      VALUES ($1,$2,$3)
      ON CONFLICT (poll_id, student_id) DO UPDATE SET selected_option = $3, responded_at = NOW()
    `, [pollId, req.user.id, selected_option]);
    res.json({ message: 'Response recorded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Current Live Classes ──────────────────────────────────────
router.get('/active', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT lc.*, b.batch_name, u.name as teacher_name
      FROM live_classes lc
      LEFT JOIN batches b ON b.id = lc.batch_id
      LEFT JOIN users u ON u.id = lc.teacher_id
      WHERE lc.status = 'live'
      ORDER BY lc.started_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
