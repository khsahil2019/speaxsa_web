const db = require('../db');

async function calculateAttendance(liveClassId) {
  try {
    console.log(`[ATTENDANCE ENGINE] Calculating attendance for class: ${liveClassId}`);
    if (db.isMockActive()) {
      // In-memory simulation: auto-generate present/late status for mock students
      const mockClass = db.mockDb.live_classes.find(c => c.id === liveClassId) || { batch_id: 'b_1' };
      const studentId = 'stud_1';
      const student = db.mockDb.users.find(u => u.id === studentId);
      
      if (student) {
        const hasAttendance = db.mockDb.live_class_attendance.find(a => a.class_id === liveClassId && a.student_id === studentId);
        if (!hasAttendance) {
          db.mockDb.live_class_attendance.push({
            id: db.mockDb.live_class_attendance.length + 1,
            student_id: studentId,
            batch_id: mockClass.batch_id,
            class_id: liveClassId,
            join_time: new Date().toISOString(),
            duration: 90,
            attendance_status: 'present'
          });
        }
      }
      return { success: true, message: "Attendance calculated in mock mode." };
    }
    
    // Postgres implementation
    // 1. Fetch live class details
    const classRes = await db.query('SELECT * FROM live_classes WHERE id = $1', [liveClassId]);
    if (classRes.rows.length === 0) return;
    const liveClass = classRes.rows[0];
    const { batch_id, started_at } = liveClass;

    // 2. Fetch all students enrolled in this batch
    const studentsRes = await db.query('SELECT student_id FROM batch_students WHERE batch_id = $1 AND status = $2', [batch_id, 'active']);
    const enrolledStudents = studentsRes.rows;

    for (const student of enrolledStudents) {
      const studentId = student.student_id;

      // 3. Fetch participant session details
      const participantRes = await db.query(
        'SELECT * FROM class_participants WHERE live_class_id = $1 AND student_id = $2',
        [liveClassId, studentId]
      );

      let status = 'absent';
      let joinTime = null;
      let exitTime = null;
      let durationMinutes = 0;
      let joinDelayMinutes = 0;

      if (participantRes.rows.length > 0) {
        const participant = participantRes.rows[0];
        joinTime = participant.join_time;
        exitTime = participant.exit_time || new Date();
        durationMinutes = participant.duration_minutes || Math.round((new Date(exitTime) - new Date(joinTime)) / 60000);
        joinDelayMinutes = Math.round((new Date(joinTime) - new Date(started_at)) / 60000);

        if (joinDelayMinutes <= 10 && durationMinutes >= 45) {
          status = 'present';
        } else if (joinDelayMinutes <= 30 && durationMinutes >= 30) {
          status = 'late';
        } else if (durationMinutes > 0 && durationMinutes < 45) {
          status = 'half_present';
        } else {
          status = 'absent';
        }
      }

      // 4. Upsert attendance record
      await db.query(
        `INSERT INTO attendance (live_class_id, batch_id, student_id, join_time, exit_time, duration_minutes, join_delay_minutes, status, calculated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (live_class_id, student_id)
         DO UPDATE SET join_time = EXCLUDED.join_time, exit_time = EXCLUDED.exit_time, duration_minutes = EXCLUDED.duration_minutes, join_delay_minutes = EXCLUDED.join_delay_minutes, status = EXCLUDED.status, calculated_at = NOW()`,
        [liveClassId, batch_id, studentId, joinTime, exitTime, durationMinutes, joinDelayMinutes, status]
      );
    }
    console.log(`[ATTENDANCE ENGINE] Completed attendance calculations for class: ${liveClassId}`);
  } catch (error) {
    console.error(`Error calculating attendance for class ${liveClassId}:`, error);
    throw error;
  }
}

module.exports = { calculateAttendance };
