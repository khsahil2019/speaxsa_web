const db = require('../db');
const nodemailer = require('nodemailer');

/**
 * Notification Service
 * Dispatches notifications and emails to enrolled batch students when live classes are scheduled.
 */
async function notifyClassScheduled({ classId, batchId, title, classDate, classTime, teacherId }) {
  try {
    // 1. Fetch all students enrolled in the batch
    const students = await db.query(`
      SELECT u.id, u.name, u.email
      FROM batch_students bs
      JOIN users u ON u.id = bs.student_id
      WHERE bs.batch_id = $1 AND bs.status = 'active'
    `, [batchId]);

    if (students.rows.length === 0) {
      console.log(`[NotificationService] No active student enrollments found in batch ${batchId}. Skipping notifications.`);
      return;
    }

    // 2. Fetch platform & SMTP settings
    const settingsRes = await db.query(
      "SELECT key, value FROM platform_settings WHERE key IN ('smtp_host','smtp_port','smtp_user','smtp_pass','platform_name')"
    );
    const settings = {};
    settingsRes.rows.forEach(r => { settings[r.key] = r.value; });
    const platformName = settings.platform_name || 'SPEAXA';

    // 3. Fetch batch details for context
    const batchRes = await db.query("SELECT batch_name FROM batches WHERE id = $1", [batchId]);
    const batchName = batchRes.rows[0]?.batch_name || 'Your Batch';

    console.log(`[NotificationService] Notifying ${students.rows.length} students for scheduled class in "${batchName}"`);

    // Direct Agora Live Room Join URL
    const liveLink = `http://localhost:5002/live/room.html?classId=${classId}`;

    // Format display Date & Time values
    const fmtDateStr = new Date(classDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    
    // Convert 24-hour time to 12-hour AM/PM
    const timeParts = classTime.split(':');
    let displayTime = classTime;
    if (timeParts.length >= 2) {
      const hrs = parseInt(timeParts[0]);
      const ampm = hrs >= 12 ? 'PM' : 'AM';
      const dispHrs = hrs % 12 || 12;
      displayTime = `${dispHrs}:${timeParts[1]} ${ampm}`;
    }

    for (const student of students.rows) {
      const notifId = `notif_sched_${classId}_${student.id}`;

      // A. Insert In-App Database Notification
      await db.query(`
        INSERT INTO notifications (id, title, message, target_role, target_user, type, is_active, sent_by)
        VALUES ($1, $2, $3, 'student', $4, 'class_start', true, $5)
        ON CONFLICT (id) DO NOTHING
      `, [
        notifId,
        'New Live Class Scheduled',
        `A new live class "${title}" has been scheduled for batch "${batchName}" on ${fmtDateStr} at ${displayTime}.`,
        student.id,
        teacherId
      ]);

      // B. Send Email Notification
      const { sendEmail } = require('./EmailService');
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
          <div style="text-align: center; border-bottom: 2px solid #3CBDB0; padding-bottom: 20px; margin-bottom: 25px;">
            <h2 style="color: #3CBDB0; margin: 0; font-size: 24px; font-family: 'Outfit', sans-serif;">${platformName} Live Classroom</h2>
          </div>
          <p style="font-size: 16px; color: #334155;">Hello <strong>${student.name}</strong>,</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">
            A new live interactive session has been scheduled for your batch <strong>${batchName}</strong>. Please find the details below and make sure to join on time.
          </p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #cbd5e1;">
            <h3 style="margin-top: 0; color: #0f172a; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Class Details</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; width: 120px; font-weight: 500;">Topic / Lesson:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Date:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${fmtDateStr}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">Start Time:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${displayTime}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 35px 0;">
            <a href="${liveLink}" target="_blank" style="background: linear-gradient(135deg, #3CBDB0, #00A693); color: white; padding: 14px 35px; font-weight: bold; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(60, 189, 176, 0.2); display: inline-block; font-size: 15px;">
              Join Live Classroom
            </a>
          </div>

          <p style="font-size: 12px; color: #64748b; line-height: 1.5; background: #fffbeb; border: 1px solid #fef3c7; padding: 12px; border-radius: 8px;">
            <strong>Important Note:</strong> The "Join Live" classroom button will become active in your portal once the teacher launches the session. Use the button above to join directly, or locate the class in your student portal under <strong>My Batches</strong> -> <strong>Live Classes Schedule</strong>.
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
            You received this email because you are enrolled in a batch on ${platformName}.<br/>
            © 2026 ${platformName} EdTech. All rights reserved.
          </p>
        </div>
      `;

      await sendEmail({
        to: student.email,
        subject: `New Live Class Scheduled: ${title}`,
        html: htmlBody,
        type: 'notification'
      });
    }
  } catch (err) {
    console.error('[NotificationService] notifyClassScheduled failed error:', err.message);
  }
}

/**
 * Helper to fetch all approved linked parent accounts for a given student ID.
 */
async function getLinkedParentsForStudent(studentId) {
  try {
    const res = await db.query(`
      SELECT u.id, u.name, u.email
      FROM parent_student_links psl
      JOIN users u ON u.id = psl.parent_id
      WHERE psl.student_id = $1 AND psl.status = 'approved'
    `, [studentId]);
    return res.rows || [];
  } catch (err) {
    console.error('[NotificationService] Error fetching linked parents:', err.message);
    return [];
  }
}

/**
 * 1. Notify student & linked parents when a NEW ASSIGNMENT is posted by a teacher.
 */
async function notifyNewAssignment({ batchId, title, description, dueDate, maxMarks, fileUrl, teacherName }) {
  try {
    const { sendEmail } = require('./EmailService');

    // Fetch batch & course title
    const batchRes = await db.query(`
      SELECT b.batch_name, c.title as course_title
      FROM batches b
      LEFT JOIN courses c ON c.id = b.course_id
      WHERE b.id = $1
    `, [batchId]);
    const batchName = batchRes.rows[0]?.batch_name || 'Batch';
    const courseTitle = batchRes.rows[0]?.course_title || 'Course';

    // Fetch active students enrolled in batch
    const studentsRes = await db.query(`
      SELECT u.id, u.name, u.email
      FROM batch_students bs
      JOIN users u ON u.id = bs.student_id
      WHERE bs.batch_id = $1 AND bs.status = 'active'
    `, [batchId]);

    const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'As specified';

    for (const student of studentsRes.rows) {
      // In-app notification for student
      await db.query(`
        INSERT INTO notifications (id, title, message, target_role, target_user, type, is_active)
        VALUES ($1, $2, $3, 'student', $4, 'assignment', true)
        ON CONFLICT DO NOTHING
      `, [
        `notif_asgn_${Date.now()}_${student.id}`,
        'New Assignment Assigned',
        `New assignment "${title}" is due on ${formattedDueDate}. Max Marks: ${maxMarks}.`,
        student.id
      ]);

      // Student Email
      const studentHtml = `
        <p style="font-size: 16px; color: #334155;">Hello <strong>${student.name}</strong>,</p>
        <p style="font-size: 15px; color: #475569; line-height: 1.6;">
          Your educator <strong>${teacherName || 'Teacher'}</strong> has posted a new academic assignment for your batch <strong>${batchName}</strong> (${courseTitle}).
        </p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #cbd5e1;">
          <h3 style="margin-top: 0; color: #0d7a6d; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Assignment Details</h3>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Title:</strong> ${title}</p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Due Date:</strong> ${formattedDueDate}</p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Max Marks:</strong> ${maxMarks}</p>
          <p style="margin: 8px 0; font-size: 14px; white-space: pre-wrap;"><strong>Instructions:</strong> ${description || 'N/A'}</p>
          ${fileUrl ? `<p style="margin-top: 12px;"><a href="${fileUrl}" style="color: #0d7a6d; font-weight: bold;">📎 Download Teacher Attachment</a></p>` : ''}
        </div>
        <p style="font-size: 14px; color: #64748b;">Log in to your Student Portal to upload your submission before the due date.</p>
      `;

      await sendEmail({
        to: student.email,
        subject: `New Assignment Posted: ${title}`,
        html: studentHtml,
        type: 'notification'
      });

      // Linked Parent Emails
      const parents = await getLinkedParentsForStudent(student.id);
      for (const parent of parents) {
        // In-app notification for parent
        await db.query(`
          INSERT INTO notifications (id, title, message, target_role, target_user, type, is_active)
          VALUES ($1, $2, $3, 'parent', $4, 'assignment', true)
          ON CONFLICT DO NOTHING
        `, [
          `notif_pasgn_${Date.now()}_${parent.id}`,
          `New Assignment for ${student.name}`,
          `New assignment "${title}" assigned to ${student.name} (Due: ${formattedDueDate}).`,
          parent.id
        ]);

        const parentHtml = `
          <p style="font-size: 16px; color: #334155;">Dear <strong>${parent.name}</strong>,</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">
            A new academic assignment has been assigned to your child <strong>${student.name}</strong> in batch <strong>${batchName}</strong> (${courseTitle}) by educator <strong>${teacherName || 'Teacher'}</strong>.
          </p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #cbd5e1;">
            <h3 style="margin-top: 0; color: #0d7a6d; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Assignment Summary</h3>
            <p style="margin: 8px 0; font-size: 14px;"><strong>Student:</strong> ${student.name}</p>
            <p style="margin: 8px 0; font-size: 14px;"><strong>Assignment:</strong> ${title}</p>
            <p style="margin: 8px 0; font-size: 14px;"><strong>Due Date:</strong> ${formattedDueDate}</p>
            <p style="margin: 8px 0; font-size: 14px;"><strong>Max Marks:</strong> ${maxMarks}</p>
            <p style="margin: 8px 0; font-size: 14px; white-space: pre-wrap;"><strong>Instructions:</strong> ${description || 'N/A'}</p>
          </div>
          <p style="font-size: 14px; color: #64748b;">You can track assignment submission status directly from your Parent Portal dashboard.</p>
        `;

        await sendEmail({
          to: parent.email,
          subject: `New Assignment Assigned to ${student.name}: ${title}`,
          html: parentHtml,
          type: 'notification'
        });
      }
    }
  } catch (err) {
    console.error('[NotificationService] notifyNewAssignment error:', err.message);
  }
}

/**
 * 2. Notify teacher when a student SUBMITS an assignment.
 */
async function notifyAssignmentSubmitted({ assignmentId, studentId, studentName, batchId, fileUrl }) {
  try {
    const { sendEmail } = require('./EmailService');

    const asgnRes = await db.query(`
      SELECT a.title, a.teacher_id, u.email as teacher_email, u.name as teacher_name, b.batch_name
      FROM assignments a
      JOIN users u ON u.id = a.teacher_id
      JOIN batches b ON b.id = a.batch_id
      WHERE a.id = $1
    `, [assignmentId]);

    if (!asgnRes.rows.length) return;
    const { title, teacher_email, teacher_name, teacher_id, batch_name } = asgnRes.rows[0];

    // In-app notification for teacher
    await db.query(`
      INSERT INTO notifications (id, title, message, target_role, target_user, type, is_active)
      VALUES ($1, $2, $3, 'teacher', $4, 'submission', true)
      ON CONFLICT DO NOTHING
    `, [
      `notif_sub_${Date.now()}_${teacher_id}`,
      'Assignment Submission Received',
      `Student ${studentName} submitted assignment "${title}" for batch "${batch_name}".`,
      teacher_id
    ]);

    const teacherHtml = `
      <p style="font-size: 16px; color: #334155;">Dear <strong>${teacher_name}</strong>,</p>
      <p style="font-size: 15px; color: #475569; line-height: 1.6;">
        Student <strong>${studentName}</strong> has submitted their work for assignment <strong>${title}</strong> (Batch: ${batch_name}).
      </p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #cbd5e1;">
        <p style="margin: 8px 0; font-size: 14px;"><strong>Student:</strong> ${studentName}</p>
        <p style="margin: 8px 0; font-size: 14px;"><strong>Assignment:</strong> ${title}</p>
        <p style="margin: 8px 0; font-size: 14px;"><strong>Submitted At:</strong> ${new Date().toLocaleString('en-IN')}</p>
        ${fileUrl ? `<p style="margin-top: 12px;"><a href="${fileUrl}" style="color: #0d7a6d; font-weight: bold;">📎 View Submission File</a></p>` : ''}
      </div>
      <p style="font-size: 14px; color: #64748b;">Log in to your Teacher Portal under Assignments to evaluate and grade this submission.</p>
    `;

    await sendEmail({
      to: teacher_email,
      subject: `Assignment Submission Received from ${studentName}: ${title}`,
      html: teacherHtml,
      type: 'notification'
    });
  } catch (err) {
    console.error('[NotificationService] notifyAssignmentSubmitted error:', err.message);
  }
}

/**
 * 3. Notify student & linked parents when an assignment is GRADED by the teacher.
 */
async function notifyAssignmentGraded({ submissionId, marksObtained, feedback, teacherId }) {
  try {
    const { sendEmail } = require('./EmailService');

    const subRes = await db.query(`
      SELECT s.student_id, u.name as student_name, u.email as student_email,
             a.title as assignment_title, a.max_marks, b.batch_name,
             t.name as teacher_name
      FROM assignment_submissions s
      JOIN users u ON u.id = s.student_id
      JOIN assignments a ON a.id = s.assignment_id
      JOIN batches b ON b.id = a.batch_id
      LEFT JOIN users t ON t.id = $2
      WHERE s.id = $1
    `, [submissionId, teacherId]);

    if (!subRes.rows.length) return;
    const { student_id, student_name, student_email, assignment_title, max_marks, batch_name, teacher_name } = subRes.rows[0];

    // In-app notification for student
    await db.query(`
      INSERT INTO notifications (id, title, message, target_role, target_user, type, is_active)
      VALUES ($1, $2, $3, 'student', $4, 'grade', true)
      ON CONFLICT DO NOTHING
    `, [
      `notif_grd_${Date.now()}_${student_id}`,
      'Assignment Graded',
      `Your assignment "${assignment_title}" has been graded: ${marksObtained}/${max_marks} marks.`,
      student_id
    ]);

    // Student Email
    const studentHtml = `
      <p style="font-size: 16px; color: #334155;">Hello <strong>${student_name}</strong>,</p>
      <p style="font-size: 15px; color: #475569; line-height: 1.6;">
        Your educator <strong>${teacher_name || 'Teacher'}</strong> has evaluated your assignment <strong>${assignment_title}</strong> (Batch: ${batch_name}).
      </p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #cbd5e1;">
        <h3 style="margin-top: 0; color: #0d7a6d; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Evaluation Summary</h3>
        <p style="margin: 8px 0; font-size: 16px;"><strong>Marks Obtained:</strong> <span style="color: #0d7a6d; font-weight: bold;">${marksObtained} / ${max_marks}</span></p>
        <p style="margin: 8px 0; font-size: 14px; white-space: pre-wrap;"><strong>Educator Feedback:</strong> ${feedback || 'Good effort! Keep learning.'}</p>
      </div>
    `;

    await sendEmail({
      to: student_email,
      subject: `Assignment Evaluated: ${assignment_title} (${marksObtained}/${max_marks})`,
      html: studentHtml,
      type: 'notification'
    });

    // Linked Parent Emails
    const parents = await getLinkedParentsForStudent(student_id);
    for (const parent of parents) {
      // In-app notification for parent
      await db.query(`
        INSERT INTO notifications (id, title, message, target_role, target_user, type, is_active)
        VALUES ($1, $2, $3, 'parent', $4, 'grade', true)
        ON CONFLICT DO NOTHING
      `, [
        `notif_pgrd_${Date.now()}_${parent.id}`,
        `Assignment Grade for ${student_name}`,
        `${student_name}'s assignment "${assignment_title}" was graded: ${marksObtained}/${max_marks} marks.`,
        parent.id
      ]);

      const parentHtml = `
        <p style="font-size: 16px; color: #334155;">Dear <strong>${parent.name}</strong>,</p>
        <p style="font-size: 15px; color: #475569; line-height: 1.6;">
          Educator <strong>${teacher_name || 'Teacher'}</strong> has published the evaluation result for <strong>${student_name}</strong>'s assignment <strong>${assignment_title}</strong> (Batch: ${batch_name}).
        </p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #cbd5e1;">
          <h3 style="margin-top: 0; color: #0d7a6d; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Grade & Performance Report</h3>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Student Name:</strong> ${student_name}</p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Assignment:</strong> ${assignment_title}</p>
          <p style="margin: 8px 0; font-size: 16px;"><strong>Marks Obtained:</strong> <span style="color: #0d7a6d; font-weight: bold;">${marksObtained} / ${max_marks}</span></p>
          <p style="margin: 8px 0; font-size: 14px; white-space: pre-wrap;"><strong>Teacher Remarks:</strong> ${feedback || 'Good effort!'}</p>
        </div>
      `;

      await sendEmail({
        to: parent.email,
        subject: `Assignment Grade Report for ${student_name}: ${assignment_title}`,
        html: parentHtml,
        type: 'notification'
      });
    }
  } catch (err) {
    console.error('[NotificationService] notifyAssignmentGraded error:', err.message);
  }
}

/**
 * 4. Notify student & linked parents with LIVE CLASS ATTENDANCE report (including time attended).
 */
async function notifyAttendanceReport({ studentId, classId, classTitle, status, durationMinutes, totalDurationMinutes }) {
  try {
    const { sendEmail } = require('./EmailService');

    const stuRes = await db.query('SELECT name, email FROM users WHERE id = $1', [studentId]);
    if (!stuRes.rows.length) return;
    const student = stuRes.rows[0];

    const classRes = await db.query(`
      SELECT lc.title, lc.class_date, b.batch_name, t.name as teacher_name
      FROM live_classes lc
      JOIN batches b ON b.id = lc.batch_id
      LEFT JOIN users t ON t.id = lc.teacher_id
      WHERE lc.id = $1
    `, [classId]);

    const titleStr = classTitle || classRes.rows[0]?.title || 'Live Class Session';
    const batchName = classRes.rows[0]?.batch_name || 'Batch';
    const teacherName = classRes.rows[0]?.teacher_name || 'Educator';
    const classDateStr = classRes.rows[0]?.class_date ? new Date(classRes.rows[0].class_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today';

    const statusUpper = (status || 'absent').toUpperCase();
    const statusColor = statusUpper === 'PRESENT' ? '#10b981' : (statusUpper === 'LATE' ? '#f59e0b' : '#ef4444');

    // Student Email
    const studentHtml = `
      <p style="font-size: 16px; color: #334155;">Hello <strong>${student.name}</strong>,</p>
      <p style="font-size: 15px; color: #475569; line-height: 1.6;">
        Here is your live session attendance summary for <strong>${titleStr}</strong> (Batch: ${batchName}).
      </p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #cbd5e1;">
        <h3 style="margin-top: 0; color: #0d7a6d; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Attendance Breakdown</h3>
        <p style="margin: 8px 0; font-size: 14px;"><strong>Session:</strong> ${titleStr}</p>
        <p style="margin: 8px 0; font-size: 14px;"><strong>Date:</strong> ${classDateStr}</p>
        <p style="margin: 8px 0; font-size: 14px;"><strong>Educator:</strong> ${teacherName}</p>
        <p style="margin: 8px 0; font-size: 15px;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusUpper}</span></p>
        <p style="margin: 8px 0; font-size: 14px;"><strong>Time Attended:</strong> <strong>${durationMinutes || 0} minutes</strong> out of ${totalDurationMinutes || 60} minutes total duration</p>
      </div>
    `;

    await sendEmail({
      to: student.email,
      subject: `Live Class Attendance Summary: ${titleStr}`,
      html: studentHtml,
      type: 'notification'
    });

    // Linked Parent Emails
    const parents = await getLinkedParentsForStudent(studentId);
    for (const parent of parents) {
      const parentHtml = `
        <p style="font-size: 16px; color: #334155;">Dear <strong>${parent.name}</strong>,</p>
        <p style="font-size: 15px; color: #475569; line-height: 1.6;">
          Here is the live class attendance and participation log for your child <strong>${student.name}</strong> in batch <strong>${batchName}</strong>.
        </p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #cbd5e1;">
          <h3 style="margin-top: 0; color: #0d7a6d; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Attendance & Participation Report</h3>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Student Name:</strong> ${student.name}</p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Session Title:</strong> ${titleStr}</p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Date:</strong> ${classDateStr}</p>
          <p style="margin: 8px 0; font-size: 15px;"><strong>Attendance Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusUpper}</span></p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Active Time Attended:</strong> <strong>${durationMinutes || 0} minutes</strong> out of ${totalDurationMinutes || 60} minutes class duration</p>
        </div>
        <p style="font-size: 14px; color: #64748b;">You can view comprehensive attendance metrics anytime on your Parent Portal dashboard.</p>
      `;

      await sendEmail({
        to: parent.email,
        subject: `Live Class Attendance Report for ${student.name}: ${titleStr}`,
        html: parentHtml,
        type: 'notification'
      });
    }
  } catch (err) {
    console.error('[NotificationService] notifyAttendanceReport error:', err.message);
  }
}

/**
 * 5. Notify student & linked parents when a PERFORMANCE OBSERVATION is submitted by a teacher.
 */
async function notifyObservationCreated({ studentId, teacherName, observationScore, notes, curiosity, understanding, consistency, communication, participation, discipline }) {
  try {
    const { sendEmail } = require('./EmailService');

    const stuRes = await db.query('SELECT name, email FROM users WHERE id = $1', [studentId]);
    if (!stuRes.rows.length) return;
    const student = stuRes.rows[0];

    // In-app notification for student
    await db.query(`
      INSERT INTO notifications (id, title, message, target_role, target_user, type, is_active)
      VALUES ($1, $2, $3, 'student', $4, 'observation', true)
      ON CONFLICT DO NOTHING
    `, [
      `notif_obs_${Date.now()}_${studentId}`,
      'New Performance Observation',
      `Teacher ${teacherName} published a performance observation report (Score: ${observationScore}/100).`,
      studentId
    ]);

    // Student Email
    const studentHtml = `
      <p style="font-size: 16px; color: #334155;">Hello <strong>${student.name}</strong>,</p>
      <p style="font-size: 15px; color: #475569; line-height: 1.6;">
        Your educator <strong>${teacherName || 'Teacher'}</strong> has submitted a new performance observation report for your learning journey.
      </p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #cbd5e1;">
        <h3 style="margin-top: 0; color: #0d7a6d; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Performance Report Overview</h3>
        <p style="margin: 8px 0; font-size: 16px;"><strong>Overall Observation Score:</strong> <span style="color: #0d7a6d; font-weight: bold;">${observationScore} / 100</span></p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px;">
          <tr style="background: #edf2f7;"><td style="padding: 6px 10px;">Curiosity & Questions</td><td style="padding: 6px 10px; font-weight: bold;">${curiosity || 0} / 5</td></tr>
          <tr><td style="padding: 6px 10px;">Concept Understanding</td><td style="padding: 6px 10px; font-weight: bold;">${understanding || 0} / 5</td></tr>
          <tr style="background: #edf2f7;"><td style="padding: 6px 10px;">Consistency & Homework</td><td style="padding: 6px 10px; font-weight: bold;">${consistency || 0} / 5</td></tr>
          <tr><td style="padding: 6px 10px;">Communication Skills</td><td style="padding: 6px 10px; font-weight: bold;">${communication || 0} / 5</td></tr>
          <tr style="background: #edf2f7;"><td style="padding: 6px 10px;">Classroom Participation</td><td style="padding: 6px 10px; font-weight: bold;">${participation || 0} / 5</td></tr>
          <tr><td style="padding: 6px 10px;">Behavior & Discipline</td><td style="padding: 6px 10px; font-weight: bold;">${discipline || 0} / 5</td></tr>
        </table>
        <p style="margin: 8px 0; font-size: 14px; white-space: pre-wrap;"><strong>Teacher Remarks:</strong> ${notes || 'Keep up the good progress!'}</p>
      </div>
    `;

    await sendEmail({
      to: student.email,
      subject: `Performance Feedback from Educator ${teacherName}`,
      html: studentHtml,
      type: 'notification'
    });

    // Linked Parent Emails
    const parents = await getLinkedParentsForStudent(studentId);
    for (const parent of parents) {
      // In-app notification for parent
      await db.query(`
        INSERT INTO notifications (id, title, message, target_role, target_user, type, is_active)
        VALUES ($1, $2, $3, 'parent', $4, 'observation', true)
        ON CONFLICT DO NOTHING
      `, [
        `notif_pobs_${Date.now()}_${parent.id}`,
        `Performance Observation for ${student.name}`,
        `Teacher ${teacherName} published a performance observation report for ${student.name} (Score: ${observationScore}/100).`,
        parent.id
      ]);

      const parentHtml = `
        <p style="font-size: 16px; color: #334155;">Dear <strong>${parent.name}</strong>,</p>
        <p style="font-size: 15px; color: #475569; line-height: 1.6;">
          Educator <strong>${teacherName || 'Teacher'}</strong> has recorded a detailed performance observation report for your child <strong>${student.name}</strong>.
        </p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #cbd5e1;">
          <h3 style="margin-top: 0; color: #0d7a6d; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Child Growth & Observation Matrix</h3>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Student Name:</strong> ${student.name}</p>
          <p style="margin: 8px 0; font-size: 16px;"><strong>Overall Observation Index:</strong> <span style="color: #0d7a6d; font-weight: bold;">${observationScore} / 100</span></p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px;">
            <tr style="background: #edf2f7;"><td style="padding: 6px 10px;">Curiosity & Questions</td><td style="padding: 6px 10px; font-weight: bold;">${curiosity || 0} / 5</td></tr>
            <tr><td style="padding: 6px 10px;">Concept Understanding</td><td style="padding: 6px 10px; font-weight: bold;">${understanding || 0} / 5</td></tr>
            <tr style="background: #edf2f7;"><td style="padding: 6px 10px;">Consistency & Homework</td><td style="padding: 6px 10px; font-weight: bold;">${consistency || 0} / 5</td></tr>
            <tr><td style="padding: 6px 10px;">Communication Skills</td><td style="padding: 6px 10px; font-weight: bold;">${communication || 0} / 5</td></tr>
            <tr style="background: #edf2f7;"><td style="padding: 6px 10px;">Classroom Participation</td><td style="padding: 6px 10px; font-weight: bold;">${participation || 0} / 5</td></tr>
            <tr><td style="padding: 6px 10px;">Behavior & Discipline</td><td style="padding: 6px 10px; font-weight: bold;">${discipline || 0} / 5</td></tr>
          </table>
          <p style="margin: 8px 0; font-size: 14px; white-space: pre-wrap;"><strong>Teacher Remarks:</strong> ${notes || 'Keep supporting their learning journey!'}</p>
        </div>
        <p style="font-size: 14px; color: #64748b;">You can review historical observation telemetry logs on your Parent Portal dashboard.</p>
      `;

      await sendEmail({
        to: parent.email,
        subject: `Performance Observation Report for ${student.name}`,
        html: parentHtml,
        type: 'notification'
      });
    }
  } catch (err) {
    console.error('[NotificationService] notifyObservationCreated error:', err.message);
  }
}

module.exports = {
  notifyClassScheduled,
  notifyNewAssignment,
  notifyAssignmentSubmitted,
  notifyAssignmentGraded,
  notifyAttendanceReport,
  notifyObservationCreated
};
