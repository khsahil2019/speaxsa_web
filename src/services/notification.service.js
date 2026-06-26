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

    // 4. Create Nodemailer transporter if settings configured and not placeholder values
    let transporter = null;
    const smtpHost = settings.smtp_host;
    const smtpUser = settings.smtp_user;
    const smtpPass = settings.smtp_pass;
    
    // Filter placeholder keys
    const cleanHost = smtpHost && !smtpHost.includes('YOUR_') && !smtpHost.includes('CHANGE_') ? smtpHost : null;
    const cleanUser = smtpUser && !smtpUser.includes('YOUR_') && !smtpUser.includes('CHANGE_') ? smtpUser : null;

    if (cleanHost && cleanUser) {
      transporter = nodemailer.createTransport({
        host: cleanHost,
        port: parseInt(settings.smtp_port || '587'),
        secure: parseInt(settings.smtp_port || '587') === 465,
        auth: { user: cleanUser, pass: smtpPass },
      });
    }

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
      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"${platformName}" <${cleanUser}>`,
            to: student.email,
            subject: `New Live Class Scheduled: ${title}`,
            html: `
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
            `
          });
          console.log(`[NotificationService] Email notification successfully dispatched to ${student.email}`);
        } catch (emailErr) {
          console.error(`[NotificationService] Failed to send email to ${student.email}:`, emailErr.message);
        }
      } else {
        console.log(`========================================`);
        console.log(`[FCM/SMTP Console Fallback] Email notice details:`);
        console.log(`To: ${student.email} (${student.name})`);
        console.log(`Topic: ${title}`);
        console.log(`Time: ${fmtDateStr} at ${displayTime}`);
        console.log(`Agora Join Link: ${liveLink}`);
        console.log(`========================================`);
      }
    }
  } catch (err) {
    console.error('[NotificationService] notifyClassScheduled failed error:', err.message);
  }
}

module.exports = { notifyClassScheduled };
