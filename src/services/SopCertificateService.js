const db = require('../db');
const { sendEmail } = require('./EmailService');
const { generateCertificatePDFBuffer } = require('./CertificatePDFService');
const crypto = require('crypto');

/**
 * Issues SOP Verification & Teaching Compliance Certificate to a teacher,
 * stores it in the teacher_certificates table, and emails a PDF copy as an attachment.
 */
async function issueSopCertificateAndNotify(teacherId, adminId = 'system') {
  try {
    const userRes = await db.query('SELECT name, email FROM users WHERE id = $1', [teacherId]);
    if (!userRes.rows.length || !userRes.rows[0].email) {
      console.warn(`[SopCertificateService] Teacher user ${teacherId} not found or has no email.`);
      return;
    }

    const teacher = userRes.rows[0];
    const certId = `cert_sop_${teacherId}`;
    const sigHash = crypto.createHash('md5').update(`cert_sop_${teacherId}_${Date.now()}`).digest('hex').substring(0, 16).toUpperCase();
    const digitalSignature = `SPEAXA-DIGITAL-SIG-${sigHash}`;
    const certTitle = 'SOP Verification & Teaching Compliance Certificate';
    const certDesc = 'This certificate is awarded to acknowledge that the teacher has successfully completed the Speaxa Standard Operating Procedures (SOP) verification, technical compliance checks, and teaching standards certification.';

    // 1. Insert or update teacher_certificates record
    await db.query(`
      INSERT INTO teacher_certificates (id, teacher_id, certificate_type, title, description, is_verified, verified_at, verified_by, digital_signature)
      VALUES ($1, $2, 'sop_completed', $3, $4, true, NOW(), $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        is_verified = true,
        verified_at = NOW(),
        verified_by = EXCLUDED.verified_by,
        digital_signature = COALESCE(teacher_certificates.digital_signature, EXCLUDED.digital_signature)
    `, [certId, teacherId, certTitle, certDesc, adminId, digitalSignature]);

    // 2. Create in-app notification
    await db.query(`
      INSERT INTO notifications (id, title, message, target_role, target_user, type, is_active)
      VALUES ($1, $2, $3, 'teacher', $4, 'success', true)
      ON CONFLICT DO NOTHING
    `, [
      `notif_sop_cert_${teacherId}_${Date.now()}`,
      'SOP Approved & Certificate Issued!',
      `Congratulations ${teacher.name}! Your SOP verification is approved. Your official PDF certificate has been sent to your email and added to your portal.`,
      teacherId
    ]);

    // 3. Generate PDF Certificate Buffer
    const pdfBuffer = await generateCertificatePDFBuffer({
      recipientName: teacher.name || 'Valued Educator',
      title: certTitle,
      description: certDesc,
      certificateId: certId,
      issuedAt: new Date(),
      certificateType: 'sop_completed'
    });

    // 4. Dispatch Email Notification with Attached PDF Certificate
    await sendEmail({
      to: teacher.email,
      subject: '🎓 SPEAXA — SOP Verification & Profile Approved! (Certificate Attached)',
      type: 'notification',
      headerTitle: 'SOP Verification Approved',
      badgeLabel: 'Official Certification',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #334155; line-height: 1.6;">
          <h2 style="color: #0d7a6d; margin-top: 0;">Congratulations ${teacher.name}!</h2>
          <p>Your <strong>SOP Verification & Profile Onboarding</strong> has been reviewed and <strong style="color: #10b981;">APPROVED</strong> by the SPEAXA Admin team!</p>
          
          <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h4 style="color: #166534; margin: 0 0 8px 0; font-size: 16px;">📜 Official SOP Verification Certificate Attached</h4>
            <p style="color: #15803d; margin: 0 0 12px 0; font-size: 14px;">Your official <strong>SOP Verification & Teaching Compliance Certificate</strong> PDF is attached directly to this email.</p>
            <div style="font-size: 13px; color: #166534; font-family: monospace; background: #ffffff; padding: 10px 14px; border-radius: 8px; border: 1px solid #bbf7d0;">
              <div>Credential ID: <strong>${certId}</strong></div>
              <div>Digital Signature: <strong>${digitalSignature}</strong></div>
            </div>
          </div>

          <p>You can also view, print, or download your official certificate anytime directly from your <strong>Teacher Dashboard → My Certificates</strong> section.</p>

          <p style="margin-top: 25px;">Please log in to your Teacher Dashboard to sign your educator agreement and start scheduling live batches.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://speaxa.in/teacher" style="background: #0d7a6d; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Open Teacher Dashboard →</a>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `SPEAXA_SOP_Verification_Certificate_${(teacher.name || 'Teacher').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    console.log(`[SopCertificateService] SOP Certificate issued & emailed to teacher ${teacherId} (${teacher.email})`);
    return { certId, digitalSignature };
  } catch (err) {
    console.error(`[SopCertificateService Error]:`, err.message);
  }
}

module.exports = {
  issueSopCertificateAndNotify
};
