const PDFDocument = require('pdfkit');

/**
 * Generates an official, legally formatted Executed Teacher Governance & Deed of Affidavit PDF.
 */
function generateAgreementPDFBuffer(options) {
  const {
    teacherName = 'Educator',
    teacherEmail = '',
    signedAt = new Date(),
    digitalSignature = `SPEAXA-DIGITAL-SIG-${Date.now()}`,
    signatureImage = null
  } = options || {};

  return new Promise((resolve, reject) => {
    try {
      // Standard A4 portrait: 595.28 x 841.89 points
      const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'portrait' });
      const buffers = [];
      doc.on('data', b => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      const width = 595.28;
      const height = 841.89;

      // ── 1. PAGE BORDER & HEADER ────────────────────────────────────
      doc.rect(20, 20, width - 40, height - 40).lineWidth(1.5).strokeColor('#0d7a6d').stroke();
      doc.rect(24, 24, width - 48, height - 48).lineWidth(0.5).strokeColor('#cbd5e1').stroke();

      // Header Banner
      doc.fillColor('#0d7a6d').fontSize(22).font('Helvetica-Bold').text('S P E A X A', 0, 42, { align: 'center', characterSpacing: 3 });
      doc.fillColor('#d97706').fontSize(9).font('Helvetica-Bold').text('EDUCATION COMPLIANCE & GOVERNANCE BOARD', 0, 70, { align: 'center', characterSpacing: 1.5 });
      doc.moveTo(40, 85).lineTo(width - 40, 85).lineWidth(1).strokeColor('#0d7a6d').stroke();

      // Title
      doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('EXECUTED DEED OF OATH & LEGAL AFFIDAVIT OF UNDERTAKING', 0, 98, { align: 'center' });
      doc.fillColor('#64748b').fontSize(8.5).font('Helvetica-Oblique').text('OFFICIAL EXECUTED COPY — RETAIN FOR YOUR RECORDS', 0, 116, { align: 'center' });

      // Metadata Box
      doc.rect(40, 130, width - 80, 52).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text('EXECUTED BY:', 50, 138);
      doc.fillColor('#0d7a6d').fontSize(9.5).font('Helvetica-Bold').text(teacherName, 135, 138);

      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text('EMAIL:', 320, 138);
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica').text(teacherEmail || 'N/A', 365, 138);

      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text('DATE EXECUTED:', 50, 158);
      const dateStr = signedAt ? new Date(signedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleString('en-IN');
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica').text(dateStr, 145, 158);

      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text('DIGITAL SIG HASH:', 320, 158);
      doc.fillColor('#0d7a6d').fontSize(8).font('Helvetica-Bold').text(digitalSignature, 425, 158);

      // Preamble
      let currentY = 196;
      doc.fillColor('#1e293b').fontSize(9.5).font('Helvetica').text(
        `I, ${teacherName}, having been approved as an educator on the SPEAXA Edtech Platform, do hereby solemnly declare, depose, and state on oath under penalties of applicable laws as follows:`,
        40, currentY, { width: width - 80, lineGap: 3 }
      );

      currentY += 32;

      // Clauses
      const clauses = [
        {
          num: '1.',
          title: 'SOLE DECLARATION OF PEDAGOGY:',
          text: 'I undertake to maintain the highest standard of online lecturing. I understand that I operate as a Digital Mentor and represent the SPEAXA educational identity before students and parents.'
        },
        {
          num: '2.',
          title: 'TECHNICAL COMPLIANCE STANDARDS:',
          text: 'I declare that my hardware setup conforms to the minimum platform standards, including a stable landscape 1080p camera feed, frontal soft light illumination, a dedicated noise-canceling collar microphone, and stable broadband connectivity (>20 Mbps upload) with active mobile backup hotspots.'
        },
        {
          num: '3.',
          title: 'CLASSROOM PROTOCOL & TIMING:',
          text: 'I agree to join all scheduled classes 10-15 minutes prior to start time to test media feeds, and commit to running interactive checks, student polls, and concept recaps every 3-5 minutes.'
        },
        {
          num: '4.',
          title: 'INTEGRITY & NON-SOLICITATION AGREEMENT:',
          text: 'I solemnly undertake that I will not solicit, encourage, or direct any SPEAXA student to join private coaching, personal batches, or external platforms. I will keep all student interactions strictly limited to the official platform channels.'
        },
        {
          num: '5.',
          title: 'REVENUE COMMISSION & PAYMENT SPLITS:',
          text: 'I explicitly consent to the dynamic revenue commission framework (standard 50/50 platform-student share or custom mentor structures) and agree that payouts are processed in tranches upon validation of modules, attendance logs, and monthly grade mapping uploads.'
        }
      ];

      clauses.forEach(c => {
        doc.fillColor('#0d7a6d').fontSize(9.5).font('Helvetica-Bold').text(`${c.num} ${c.title} `, 40, currentY, { continued: true });
        doc.fillColor('#334155').fontSize(9).font('Helvetica').text(c.text, { width: width - 80, lineGap: 3 });
        currentY = doc.y + 10;
      });

      // Signature Section at Bottom
      currentY = Math.max(currentY + 10, height - 190);
      doc.moveTo(40, currentY).lineTo(width - 40, currentY).lineWidth(0.8).strokeColor('#cbd5e1').stroke();
      currentY += 12;

      // Left Column: Teacher Signature Block
      doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('EDUCATOR SIGNATURE & ATTESTATION', 40, currentY);
      
      // Render drawn signature image if provided
      if (signatureImage && signatureImage.startsWith('data:image')) {
        try {
          const base64Data = signatureImage.replace(/^data:image\/\w+;base64,/, '');
          const imgBuffer = Buffer.from(base64Data, 'base64');
          doc.image(imgBuffer, 40, currentY + 16, { fit: [160, 48] });
        } catch (imgErr) {
          doc.fillColor('#0d7a6d').fontSize(14).font('Helvetica-BoldOblique').text(teacherName, 40, currentY + 24);
        }
      } else {
        doc.fillColor('#0d7a6d').fontSize(14).font('Helvetica-BoldOblique').text(teacherName, 40, currentY + 24);
      }

      doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold').text(`Digitally Signed by: ${teacherName}`, 40, currentY + 68);
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text(`Hash: ${digitalSignature}`, 40, currentY + 80);

      // Right Column: SPEAXA Board Seal
      const rightX = width - 200;
      doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('SPEAXA COMPLIANCE BOARD', rightX, currentY);
      doc.fillColor('#0d7a6d').fontSize(10).font('Helvetica-BoldOblique').text('SPEAXA Academic Core', rightX, currentY + 20);
      doc.fillColor('#d97706').fontSize(8).font('Helvetica-Bold').text('STATUS: LEGALLY EXECUTED & VERIFIED', rightX, currentY + 36);
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text(`Timestamp: ${dateStr}`, rightX, currentY + 50);

      // Footer bar
      doc.rect(36, height - 36, width - 72, 12).fill('#f1f5f9');
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text('SPEAXA Edtech Platform — Official Executed Legal Agreement Copy', 0, height - 33, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateAgreementPDFBuffer
};
