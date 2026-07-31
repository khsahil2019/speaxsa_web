const PDFDocument = require('pdfkit');
const db = require('../db');
const { sendEmail } = require('./EmailService');

async function generateAndEmailPollReport(classId) {
  try {
    console.log(`[PollReportPDF] Starting PDF report generation for classId: ${classId}`);
    
    // Fetch live class details and teacher information
    const classRes = await db.query(`
      SELECT lc.*, 
             COALESCE(u1.name, u2.name, 'Educator') as teacher_name, 
             COALESCE(u1.email, u1.alt_email, u2.email, u2.alt_email) as teacher_email, 
             COALESCE(b.name, b.batch_name) as batch_name
      FROM live_classes lc
      LEFT JOIN batches b ON b.id = lc.batch_id
      LEFT JOIN users u1 ON (u1.id = lc.teacher_id OR LOWER(u1.email) = LOWER(lc.teacher_id))
      LEFT JOIN users u2 ON (u2.id = b.teacher_id OR LOWER(u2.email) = LOWER(b.teacher_id))
      WHERE lc.id = $1
    `, [classId]);

    if (!classRes.rows.length) {
      console.warn(`[PollReportPDF] Class ${classId} not found in database.`);
      return;
    }
    const liveClass = classRes.rows[0];
    
    // Fallback: If email not found in JOIN, search by teacher_id directly
    let targetEmail = liveClass.teacher_email;
    if (!targetEmail || !targetEmail.includes('@')) {
      if (liveClass.teacher_id && liveClass.teacher_id.includes('@')) {
        targetEmail = liveClass.teacher_id;
      } else if (liveClass.teacher_id) {
        const uRes = await db.query("SELECT email, alt_email FROM users WHERE id = $1", [liveClass.teacher_id]);
        if (uRes.rows.length > 0) {
          targetEmail = uRes.rows[0].email || uRes.rows[0].alt_email;
        }
      }
    }

    if (!targetEmail || !targetEmail.includes('@')) {
      console.warn(`[PollReportPDF] Valid teacher email not found for class ${classId}. Teacher ID: ${liveClass.teacher_id}`);
      return;
    }

    // Fetch all polls for this class
    const pollsRes = await db.query(`
      SELECT * FROM class_polls WHERE class_id = $1 OR class_id = $2 ORDER BY created_at ASC
    `, [classId, String(classId)]);

    const polls = pollsRes.rows;
    console.log(`[PollReportPDF] Found ${polls.length} poll(s) for class ${classId}. Sending report to: ${targetEmail}`);

    // Build PDF Document
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers = [];

    doc.on('data', b => buffers.push(b));

    // Header Branding
    doc.fillColor('#0d7a6d').fontSize(20).font('Helvetica-Bold').text('SPEAXA LIVE CLASSROOM POLL REPORT', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('#475569').fontSize(11).font('Helvetica').text(`Class Title: ${liveClass.title}`, { align: 'center' });
    doc.text(`Educator: ${liveClass.teacher_name || 'Educator'} (${targetEmail})`, { align: 'center' });
    doc.text(`Batch: ${liveClass.batch_name || 'N/A'} | Date: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });
    doc.moveDown(1);
    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    let htmlPollSummary = '';

    if (polls.length === 0) {
      doc.fillColor('#334155').fontSize(12).font('Helvetica-Bold').text('Class Poll Summary', { align: 'left' });
      doc.moveDown(0.5);
      doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('No interactive live polls were launched during this class session.');
      doc.moveDown(1);
      htmlPollSummary = `<p style="color: #64748b; font-style: italic;">No interactive polls were launched during this class session.</p>`;
    } else {
      // Render Each Poll Summary
      for (let i = 0; i < polls.length; i++) {
        const poll = polls[i];
        let options = [];
        try {
          options = typeof poll.options === 'string' ? JSON.parse(poll.options) : (poll.options || []);
        } catch (e) {
          options = [];
        }
        const correctIdx = parseInt(poll.correct_option || 0);

        const respRes = await db.query(`
          SELECT pr.*, u.name as student_name, u.email as student_email
          FROM class_poll_responses pr
          LEFT JOIN users u ON u.id = pr.student_id
          WHERE pr.poll_id = $1
          ORDER BY pr.responded_at ASC
        `, [poll.id]);

        const responses = respRes.rows;
        const totalVotes = responses.length;

        doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text(`Poll #${i + 1}: ${poll.question}`);
        doc.moveDown(0.3);

        let optionsHtmlList = '';

        options.forEach((optText, optIdx) => {
          const votesForOpt = responses.filter(r => parseInt(r.selected_option) === optIdx).length;
          const pct = totalVotes > 0 ? Math.round((votesForOpt / totalVotes) * 100) : 0;
          const isCorrect = optIdx === correctIdx;
          const prefix = isCorrect ? '[CORRECT ANSWER] ' : '';
          doc.fillColor(isCorrect ? '#166534' : '#334155').fontSize(10).font(isCorrect ? 'Helvetica-Bold' : 'Helvetica')
            .text(`  • Option ${optIdx + 1}: ${prefix}${optText} — ${votesForOpt} votes (${pct}%)`);

          optionsHtmlList += `<li style="margin-bottom: 4px; color: ${isCorrect ? '#166534' : '#334155'}; font-weight: ${isCorrect ? 'bold' : 'normal'};">
            ${isCorrect ? '✅ ' : ''}Option ${optIdx + 1}: ${optText} &mdash; <strong>${votesForOpt} votes (${pct}%)</strong>
          </li>`;
        });

        doc.moveDown(0.5);
        doc.fillColor('#64748b').fontSize(9).font('Helvetica-Oblique').text(`Total Student Submissions: ${totalVotes}`);
        doc.moveDown(1);

        htmlPollSummary += `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #0f172a;">Poll #${i + 1}: ${poll.question}</h3>
            <ul style="padding-left: 20px; margin: 0 0 10px 0;">
              ${optionsHtmlList}
            </ul>
            <span style="font-size: 12px; color: #64748b;">Total Student Submissions: <strong>${totalVotes}</strong></span>
          </div>
        `;
      }
    }

    doc.end();

    await new Promise(resolve => doc.on('end', resolve));
    const pdfBuffer = Buffer.concat(buffers);

    // Email PDF Attachment + HTML Summary to Teacher
    await sendEmail({
      to: targetEmail,
      subject: `📊 Live Class Poll Response Report: ${liveClass.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #0d7a6d; margin-top: 0;">SPEAXA Live Class Poll Report</h2>
          <p>Dear <strong>${liveClass.teacher_name || 'Educator'}</strong>,</p>
          <p>Your live classroom session <strong>"${liveClass.title}"</strong> has concluded. Here is the summary of live poll responses from your class session:</p>
          
          ${htmlPollSummary}

          <p>Attached is the full <strong>Poll Response Report PDF</strong> for your records.</p>
          <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 24px 0;" />
          <p style="font-size: 12px; color: #64748b; margin: 0;">SPEAXA Educational Intelligence System &bull; Live Analytics Service</p>
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
    console.log(`[PollReportPDF] Successfully emailed poll PDF report to ${targetEmail}`);
  } catch (err) {
    console.error('[PollReportPDF] Error generating or emailing poll PDF:', err);
  }
}

module.exports = { generateAndEmailPollReport };
