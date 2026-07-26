const PDFDocument = require('pdfkit');
const db = require('../db');
const { sendEmail } = require('./EmailService');

async function generateAndEmailPollReport(classId) {
  try {
    const classRes = await db.query(`
      SELECT lc.*, u.name as teacher_name, u.email as teacher_email, b.name as batch_name
      FROM live_classes lc
      JOIN users u ON u.id = lc.teacher_id
      LEFT JOIN batches b ON b.id = lc.batch_id
      WHERE lc.id = $1
    `, [classId]);

    if (!classRes.rows.length) return;
    const liveClass = classRes.rows[0];

    // Fetch all polls for this class
    const pollsRes = await db.query(`
      SELECT * FROM class_polls WHERE class_id = $1 ORDER BY created_at ASC
    `, [classId]);

    if (!pollsRes.rows.length) {
      console.log(`[PollReportPDF] No polls created for class ${classId}. Skipping PDF email.`);
      return;
    }

    // Build PDF Document
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers = [];

    doc.on('data', b => buffers.push(b));

    // Header Branding
    doc.fillColor('#0d7a6d').fontSize(20).font('Helvetica-Bold').text('SPEAXA LIVE CLASSROOM POLL REPORT', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('#475569').fontSize(11).font('Helvetica').text(`Class Title: ${liveClass.title}`, { align: 'center' });
    doc.text(`Educator: ${liveClass.teacher_name} (${liveClass.teacher_email})`, { align: 'center' });
    doc.text(`Batch: ${liveClass.batch_name || 'N/A'} | Date: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });
    doc.moveDown(1);
    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    // Render Each Poll Summary
    for (let i = 0; i < pollsRes.rows.length; i++) {
      const poll = pollsRes.rows[i];
      const options = typeof poll.options === 'string' ? JSON.parse(poll.options) : (poll.options || []);
      const correctIdx = parseInt(poll.correct_option || 0);

      const respRes = await db.query(`
        SELECT pr.*, u.name as student_name, u.email as student_email
        FROM class_poll_responses pr
        JOIN users u ON u.id = pr.student_id
        WHERE pr.poll_id = $1
        ORDER BY pr.responded_at ASC
      `, [poll.id]);

      const responses = respRes.rows;
      const totalVotes = responses.length;

      doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text(`Poll #${i + 1}: ${poll.question}`);
      doc.moveDown(0.3);

      // Option breakdown
      options.forEach((optText, optIdx) => {
        const votesForOpt = responses.filter(r => parseInt(r.selected_option) === optIdx).length;
        const pct = totalVotes > 0 ? Math.round((votesForOpt / totalVotes) * 100) : 0;
        const isCorrect = optIdx === correctIdx;
        const prefix = isCorrect ? '[CORRECT] ' : '';
        doc.fillColor(isCorrect ? '#166534' : '#334155').fontSize(10).font(isCorrect ? 'Helvetica-Bold' : 'Helvetica')
          .text(`  • Option ${optIdx + 1}: ${prefix}${optText} — ${votesForOpt} votes (${pct}%)`);
      });

      doc.moveDown(0.5);
      doc.fillColor('#64748b').fontSize(9).font('Helvetica-Oblique').text(`Total Student Submissions: ${totalVotes}`);
      doc.moveDown(1);
    }

    doc.end();

    await new Promise(resolve => doc.on('end', resolve));
    const pdfBuffer = Buffer.concat(buffers);

    // Email PDF Attachment to Teacher
    if (liveClass.teacher_email) {
      await sendEmail({
        to: liveClass.teacher_email,
        subject: `📊 Poll Response Report: ${liveClass.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0d7a6d; margin-top: 0;">Live Classroom Poll Report</h2>
            <p>Dear <strong>${liveClass.teacher_name}</strong>,</p>
            <p>Your live classroom session <strong>"${liveClass.title}"</strong> has concluded. Attached is the compiled <strong>Poll Response Report PDF</strong> detailing all student answers and performance metrics for your class.</p>
            <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b;">SPEAXA Educational Intelligence System &bull; Live Analytics</p>
          </div>
        `,
        attachments: [
          {
            filename: `Poll_Report_${liveClass.id}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });
      console.log(`[PollReportPDF] Successfully emailed poll PDF report to ${liveClass.teacher_email}`);
    }
  } catch (err) {
    console.error('[PollReportPDF] Error generating or emailing poll PDF:', err);
  }
}

module.exports = { generateAndEmailPollReport };
