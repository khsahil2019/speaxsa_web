/**
 * Teacher Level Calculation Service
 * Levels: Bronze → Silver → Gold → Elite Mentor
 * Based on: Ratings, Retention Rate, Attendance Rate, Completion Rate
 */
const db = require('../db');

const LEVEL_THRESHOLDS = {
  'Elite Mentor': { minScore: 90 },
  'Gold': { minScore: 75 },
  'Silver': { minScore: 55 },
  'Bronze': { minScore: 0 },
};

async function calculateTeacherScore(teacherId) {
  try {
    // 1. Average rating (weight: 30%)
    const userRes = await db.query('SELECT rating, total_ratings FROM users WHERE id = $1', [teacherId]);
    const ratingScore = parseFloat(userRes.rows[0]?.rating || 5.0) * 20; // Max 5 * 20 = 100

    // 2. Student retention (students still active / total enrolled) (weight: 25%)
    const retentionRes = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN bs.status = 'active' THEN 1 ELSE 0 END) as active
      FROM batch_students bs
      JOIN batches b ON b.id = bs.batch_id
      WHERE b.teacher_id = $1
    `, [teacherId]);
    const retentionRow = retentionRes.rows[0];
    const total = parseInt(retentionRow.total) || 1;
    const active = parseInt(retentionRow.active) || 0;
    const retentionScore = (active / total) * 100;

    // 3. Attendance rate (students' average attendance in teacher's classes) (weight: 25%)
    const attendanceRes = await db.query(`
      SELECT 
        COUNT(a.id) as total,
        SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as present
      FROM attendance a
      JOIN batches b ON b.id = a.batch_id
      WHERE b.teacher_id = $1
    `, [teacherId]);
    const attRow = attendanceRes.rows[0];
    const attTotal = parseInt(attRow.total) || 1;
    const attPresent = parseInt(attRow.present) || 0;
    const attendanceScore = (attPresent / attTotal) * 100;

    // 4. Batch completion rate (weight: 20%)
    const batchRes = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM batches WHERE teacher_id = $1
    `, [teacherId]);
    const batchRow = batchRes.rows[0];
    const batchTotal = parseInt(batchRow.total) || 1;
    const batchCompleted = parseInt(batchRow.completed) || 0;
    const completionScore = (batchCompleted / batchTotal) * 100;

    // Weighted overall score
    const overallScore = (
      (ratingScore * 0.30) +
      (retentionScore * 0.25) +
      (attendanceScore * 0.25) +
      (completionScore * 0.20)
    );

    return {
      overallScore: Math.round(overallScore),
      components: {
        ratingScore: Math.round(ratingScore),
        retentionScore: Math.round(retentionScore),
        attendanceScore: Math.round(attendanceScore),
        completionScore: Math.round(completionScore),
      }
    };
  } catch (err) {
    console.error('[TeacherLevel] Score calculation error:', err.message);
    return { overallScore: 50, components: {} };
  }
}

function scoreTolevel(score) {
  if (score >= LEVEL_THRESHOLDS['Elite Mentor'].minScore) return 'Elite Mentor';
  if (score >= LEVEL_THRESHOLDS['Gold'].minScore) return 'Gold';
  if (score >= LEVEL_THRESHOLDS['Silver'].minScore) return 'Silver';
  return 'Bronze';
}

async function updateTeacherLevel(teacherId, changedBy = null) {
  try {
    const { overallScore, components } = await calculateTeacherScore(teacherId);
    const newLevel = scoreTolevel(overallScore);

    const currentRes = await db.query('SELECT teacher_level FROM users WHERE id = $1', [teacherId]);
    const currentLevel = currentRes.rows[0]?.teacher_level || 'Bronze';

    if (newLevel !== currentLevel) {
      await db.query('UPDATE users SET teacher_level = $1 WHERE id = $2', [newLevel, teacherId]);

      // Log the level change
      await db.query(`
        INSERT INTO teacher_levels (id, teacher_id, level, previous_level, changed_by, reason)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        `lvl_${Date.now()}`,
        teacherId,
        newLevel,
        currentLevel,
        changedBy,
        `Auto-calculated. Score: ${overallScore}`
      ]);

      console.log(`[TeacherLevel] Teacher ${teacherId}: ${currentLevel} → ${newLevel} (score: ${overallScore})`);
    }

    return { teacherId, level: newLevel, score: overallScore, components, changed: newLevel !== currentLevel };
  } catch (err) {
    console.error('[TeacherLevel] Update error:', err.message);
    throw err;
  }
}

async function updateAllTeacherLevels() {
  try {
    const res = await db.query("SELECT id FROM users WHERE role = 'teacher' AND is_disabled = false");
    const results = [];
    for (const row of res.rows) {
      const result = await updateTeacherLevel(row.id, 'system_cron');
      results.push(result);
    }
    console.log(`[TeacherLevel] Updated ${results.length} teacher levels`);
    return results;
  } catch (err) {
    console.error('[TeacherLevel] Bulk update error:', err.message);
    throw err;
  }
}

module.exports = { calculateTeacherScore, updateTeacherLevel, updateAllTeacherLevels, scoreTolevel };
