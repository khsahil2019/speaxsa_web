/**
 * Monthly Report Generation Service
 * Auto-generates student performance reports via cron job
 */
const db = require('../db');

/**
 * Determine improvement trend based on current vs previous month scores.
 */
function calculateTrend(current, previous) {
  if (!previous) return 'stable';
  const diff = current - previous;
  if (diff >= 5) return 'improving';
  if (diff <= -5) return 'declining';
  return 'stable';
}

/**
 * Determine overall grade from composite score.
 */
function scoreToGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

/**
 * Generate a monthly report for a single student in a specific batch.
 */
async function generateStudentReport(studentId, batchId, reportMonth) {
  try {
    // 1. Attendance percentage
    const attRes = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END) as present
      FROM attendance
      WHERE student_id = $1 AND batch_id = $2
        AND TO_CHAR(attendance_date, 'YYYY-MM') = $3
    `, [studentId, batchId, reportMonth]);
    
    const attTotal = parseInt(attRes.rows[0]?.total) || 0;
    const attPresent = parseInt(attRes.rows[0]?.present) || 0;
    const attendancePct = attTotal > 0 ? (attPresent / attTotal) * 100 : 0;

    // 2. Assignment completion rate
    const asgRes = await db.query(`
      SELECT 
        COUNT(a.id) as total_assignments,
        COUNT(s.id) as submitted
      FROM assignments a
      LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_id = $1
      WHERE a.batch_id = $2
        AND TO_CHAR(a.created_at, 'YYYY-MM') = $3
    `, [studentId, batchId, reportMonth]);
    
    const asgTotal = parseInt(asgRes.rows[0]?.total_assignments) || 0;
    const asgSubmitted = parseInt(asgRes.rows[0]?.submitted) || 0;
    const assignmentCompletion = asgTotal > 0 ? (asgSubmitted / asgTotal) * 100 : 100;

    // 3. Average observation scores
    const obsRes = await db.query(`
      SELECT 
        AVG(curiosity) as avg_curiosity,
        AVG(understanding) as avg_understanding,
        AVG(consistency) as avg_consistency,
        AVG(communication) as avg_communication,
        AVG(observation_score) as avg_observation,
        AVG(participation) as avg_participation,
        AVG(discipline) as avg_discipline
      FROM student_observations
      WHERE student_id = $1 AND batch_id = $2
        AND TO_CHAR(observation_date, 'YYYY-MM') = $3
    `, [studentId, batchId, reportMonth]);

    const obs = obsRes.rows[0] || {};
    const curiosityScore = parseFloat(obs.avg_curiosity || 0);
    const communicationGrowth = parseFloat(obs.avg_communication || 0);
    const avgObservationScore = parseFloat(obs.avg_observation || 0);

    // 4. Interaction score (polls participated + chat messages via attendance)
    const interactionRes = await db.query(`
      SELECT 
        AVG(a.duration_mins) as avg_duration,
        a.class_duration_mins
      FROM attendance a
      WHERE a.student_id = $1 AND a.batch_id = $2
        AND TO_CHAR(a.attendance_date, 'YYYY-MM') = $3
      GROUP BY a.class_duration_mins
    `, [studentId, batchId, reportMonth]);
    
    const avgDuration = parseFloat(interactionRes.rows[0]?.avg_duration || 0);
    const classDuration = parseFloat(interactionRes.rows[0]?.class_duration_mins || 60);
    const interactionScore = Math.min(100, (avgDuration / classDuration) * 100);

    // 5. Composite score for grade
    const compositeScore = (
      (attendancePct * 0.25) +
      (assignmentCompletion * 0.25) +
      (avgObservationScore * 0.25) +
      (interactionScore * 0.25)
    );

    // 6. Check previous month for trend
    const prevMonth = new Date(`${reportMonth}-01`);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStr = prevMonth.toISOString().substr(0, 7);

    const prevRes = await db.query(
      'SELECT avg_observation_score FROM monthly_reports WHERE student_id = $1 AND batch_id = $2 AND report_month = $3',
      [studentId, batchId, prevMonthStr]
    );
    const prevScore = prevRes.rows[0]?.avg_observation_score;
    const trend = calculateTrend(avgObservationScore, prevScore);

    // 7. Get teacher for this batch
    const batchRes = await db.query('SELECT teacher_id FROM batches WHERE id = $1', [batchId]);
    const teacherId = batchRes.rows[0]?.teacher_id;

    // 8. Upsert the monthly report
    const reportId = `report_${studentId}_${batchId}_${reportMonth}`.replace(/[^a-zA-Z0-9_]/g, '_');
    
    await db.query(`
      INSERT INTO monthly_reports (
        id, student_id, batch_id, teacher_id, report_month,
        attendance_pct, interaction_score, curiosity_score,
        assignment_completion, communication_growth, avg_observation_score,
        improvement_trend, overall_grade
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (student_id, batch_id, report_month)
      DO UPDATE SET
        attendance_pct = EXCLUDED.attendance_pct,
        interaction_score = EXCLUDED.interaction_score,
        curiosity_score = EXCLUDED.curiosity_score,
        assignment_completion = EXCLUDED.assignment_completion,
        communication_growth = EXCLUDED.communication_growth,
        avg_observation_score = EXCLUDED.avg_observation_score,
        improvement_trend = EXCLUDED.improvement_trend,
        overall_grade = EXCLUDED.overall_grade,
        generated_at = NOW()
    `, [
      reportId, studentId, batchId, teacherId, reportMonth,
      attendancePct.toFixed(2), interactionScore.toFixed(2), curiosityScore.toFixed(2),
      assignmentCompletion.toFixed(2), communicationGrowth.toFixed(2), avgObservationScore.toFixed(2),
      trend, scoreToGrade(compositeScore)
    ]);

    return {
      studentId, batchId, reportMonth,
      attendancePct, interactionScore, curiosityScore,
      assignmentCompletion, communicationGrowth, avgObservationScore,
      improvementTrend: trend, overallGrade: scoreToGrade(compositeScore),
    };
  } catch (err) {
    console.error(`[Report] Error generating report for ${studentId}/${batchId}:`, err.message);
    throw err;
  }
}

/**
 * Generate reports for all active students in all batches for a given month.
 */
async function generateAllMonthlyReports(reportMonth) {
  if (!reportMonth) {
    const now = new Date();
    reportMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  console.log(`[Report] Generating monthly reports for ${reportMonth}...`);

  try {
    const studentsRes = await db.query(`
      SELECT DISTINCT bs.student_id, bs.batch_id
      FROM batch_students bs
      JOIN batches b ON b.id = bs.batch_id
      WHERE bs.status = 'active' AND b.status = 'active'
    `);

    const results = [];
    for (const row of studentsRes.rows) {
      try {
        const report = await generateStudentReport(row.student_id, row.batch_id, reportMonth);
        results.push({ success: true, ...report });
      } catch (err) {
        results.push({ success: false, studentId: row.student_id, batchId: row.batch_id, error: err.message });
      }
    }

    console.log(`[Report] Generated ${results.filter(r => r.success).length}/${results.length} reports`);
    return results;
  } catch (err) {
    console.error('[Report] Bulk generation error:', err.message);
    throw err;
  }
}

module.exports = { generateStudentReport, generateAllMonthlyReports, scoreToGrade };
