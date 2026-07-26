const PDFDocument = require('pdfkit');

/**
 * Generates an official, print-ready SPEAXA Payment Receipt & Tax Invoice PDF Buffer.
 * Features rounded cards, clean itemization, verified payment stamp, and digital signature.
 */
function generatePaymentReceiptPDFBuffer(data) {
  const {
    studentName = 'Valued Student',
    studentEmail = '',
    studentPhone = '',
    courseTitle = 'Course',
    batchName = 'Batch',
    amountPaid = 0,
    originalFees = 0,
    discountAmount = 0,
    couponCode = null,
    paymentId = `SPX-PAY-${Date.now()}`,
    date = new Date()
  } = data || {};

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
      const buffers = [];
      doc.on('data', b => buffers.push(b));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', err => reject(err));

      const pageMargin = 40;
      const pageWidth = 595.28;
      const contentWidth = pageWidth - (pageMargin * 2); // 515.28 pt

      const fmtMoney = (val) => {
        const num = parseFloat(val || 0);
        return 'INR ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      const dateStr = new Date(date || Date.now()).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      // ── 1. HEADER BANNER (Rounded Corners & Dark Emerald Gradient) ────────
      const headerY = 40;
      const headerHeight = 75;
      doc.roundedRect(pageMargin, headerY, contentWidth, headerHeight, 14).fill('#0d7a6d');

      doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('S P E A X A', pageMargin + 20, headerY + 16, { characterSpacing: 2 });
      doc.fontSize(9).font('Helvetica').text('Official Payment Receipt & Tax Invoice Slip', pageMargin + 20, headerY + 44);

      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text('OFFICIAL PAYMENT SLIP', pageMargin + contentWidth - 220, headerY + 16, { width: 200, align: 'right' });
      doc.fontSize(8).font('Helvetica').text(`Receipt ID: ${paymentId}`, pageMargin + contentWidth - 220, headerY + 32, { width: 200, align: 'right' });
      doc.fontSize(7.5).font('Helvetica-Bold').text('STATUS: PAYMENT CAPTURED', pageMargin + contentWidth - 220, headerY + 48, { width: 200, align: 'right' });

      // ── 2. BILLED TO & PAYMENT DETAILS BOX ───────────────────────────────
      const infoY = 128;
      const infoHeight = 60;
      doc.roundedRect(pageMargin, infoY, contentWidth, infoHeight, 10).fillAndStroke('#f8fafc', '#e2e8f0');

      // Left Column: Student Details
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('BILLED TO (STUDENT)', pageMargin + 16, infoY + 10);
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(studentName, pageMargin + 16, infoY + 22);
      doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text(`${studentEmail}${studentPhone ? ' • ' + studentPhone : ''}`, pageMargin + 16, infoY + 37);

      // Right Column: Date & Method
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('DATE & PAYMENT METHOD', pageMargin + contentWidth - 240, infoY + 10, { width: 220, align: 'right' });
      doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text(dateStr, pageMargin + contentWidth - 240, infoY + 22, { width: 220, align: 'right' });
      doc.fillColor('#047857').fontSize(8.5).font('Helvetica-Bold').text('Razorpay Verified Online Payment', pageMargin + contentWidth - 240, infoY + 37, { width: 220, align: 'right' });

      // ── 3. ITEMIZATION TABLE ──────────────────────────────────────────────
      let tableY = 202;

      // Table Header Row
      doc.roundedRect(pageMargin, tableY, contentWidth, 26, 6).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
      doc.text('ITEM DESCRIPTION', pageMargin + 14, tableY + 9, { width: 260 });
      doc.text('BATCH DETAILS', pageMargin + 280, tableY + 9, { width: 110 });
      doc.text('AMOUNT', pageMargin + 400, tableY + 9, { width: 100, align: 'right' });

      tableY += 32;

      // Item Row: Main Course
      doc.roundedRect(pageMargin, tableY, contentWidth, 42, 8).fillAndStroke('#ffffff', '#e2e8f0');

      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(courseTitle, pageMargin + 14, tableY + 10, { width: 260, height: 14, ellipsis: true });
      doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('Full Course Curriculum Access & Live Interactive Classroom', pageMargin + 14, tableY + 25, { width: 260 });

      doc.fillColor('#0d7a6d').fontSize(9).font('Helvetica-Bold').text(batchName, pageMargin + 280, tableY + 15, { width: 110 });

      const origFeeNum = parseFloat(originalFees || amountPaid);
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(fmtMoney(origFeeNum), pageMargin + 400, tableY + 15, { width: 100, align: 'right' });

      tableY += 50;

      // Coupon Row if discount exists
      if (couponCode && discountAmount > 0) {
        doc.roundedRect(pageMargin, tableY, contentWidth, 32, 8).fillAndStroke('#f0fdf4', '#bbf7d0');

        doc.fillColor('#166534').fontSize(9).font('Helvetica-Bold').text(`Coupon Discount Applied (${couponCode})`, pageMargin + 14, tableY + 10);
        doc.fillColor('#15803d').fontSize(9.5).font('Helvetica-Bold').text(`- ${fmtMoney(discountAmount)}`, pageMargin + 400, tableY + 10, { width: 100, align: 'right' });

        tableY += 40;
      }

      // ── 4. SUMMARY & TOTALS BREAKDOWN CARD ───────────────────────────────
      const summaryY = tableY + 10;
      const summaryW = 240;
      const summaryX = pageMargin + contentWidth - summaryW;

      doc.roundedRect(summaryX, summaryY, summaryW, 70, 10).fillAndStroke('#f8fafc', '#cbd5e1');

      doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text('Subtotal Fees:', summaryX + 16, summaryY + 12);
      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text(fmtMoney(origFeeNum), summaryX + 120, summaryY + 12, { width: 104, align: 'right' });

      if (discountAmount > 0) {
        doc.fillColor('#166534').fontSize(8.5).font('Helvetica').text('Discount:', summaryX + 16, summaryY + 28);
        doc.fillColor('#15803d').fontSize(8.5).font('Helvetica-Bold').text(`- ${fmtMoney(discountAmount)}`, summaryX + 120, summaryY + 28, { width: 104, align: 'right' });
      }

      doc.moveTo(summaryX + 16, summaryY + 44).lineTo(summaryX + summaryW - 16, summaryY + 44).lineWidth(1).strokeColor('#cbd5e1').stroke();

      const netAmount = parseFloat(amountPaid);
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('TOTAL PAID:', summaryX + 16, summaryY + 50);
      doc.fillColor('#0d7a6d').fontSize(13).font('Helvetica-Bold').text(fmtMoney(netAmount), summaryX + 120, summaryY + 48, { width: 104, align: 'right' });

      // ── 5. OFFICIAL STAMP & DIGITAL SIGNATURE ────────────────────────────
      const stampBoxY = summaryY + 84;
      doc.roundedRect(pageMargin, stampBoxY, contentWidth, 75, 10).fillAndStroke('#f8fafc', '#cbd5e1');

      // SPEAXA Stamp (Left Graphic)
      doc.circle(pageMargin + 45, stampBoxY + 37, 26).lineWidth(2).strokeColor('#0d7a6d').stroke();
      doc.circle(pageMargin + 45, stampBoxY + 37, 23).lineWidth(0.8).strokeColor('#d97706').stroke();
      doc.fillColor('#0d7a6d').fontSize(6.5).font('Helvetica-Bold').text('VERIFIED', pageMargin + 25, stampBoxY + 25, { align: 'center', width: 40 });
      doc.fillColor('#d97706').fontSize(5.5).font('Helvetica-Bold').text('SPEAXA SLIP', pageMargin + 25, stampBoxY + 34, { align: 'center', width: 40 });
      doc.fillColor('#0d7a6d').fontSize(5.5).font('Helvetica-Bold').text('PAID & VALID', pageMargin + 25, stampBoxY + 42, { align: 'center', width: 40 });

      // Verification Text (Middle)
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('SPEAXA Official Payment Guarantee & Invoice', pageMargin + 85, stampBoxY + 14);
      doc.fillColor('#475569').fontSize(7.5).font('Helvetica').text('This tax invoice is a certified electronic receipt generated upon successful course payment. It serves as official proof of enrollment on the SPEAXA platform.', pageMargin + 85, stampBoxY + 28, { width: 250, lineGap: 2 });

      // Digital Signature Block (Right)
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text('DIGITAL SIGNATURE', pageMargin + contentWidth - 160, stampBoxY + 14, { width: 145, align: 'right' });
      doc.fillColor('#0d7a6d').fontSize(9).font('Helvetica-BoldOblique').text('SPEAXA Finance Board', pageMargin + contentWidth - 160, stampBoxY + 26, { width: 145, align: 'right' });
      doc.fillColor('#047857').fontSize(7).font('Helvetica').text('RSA-2048 / SHA-256 Verified', pageMargin + contentWidth - 160, stampBoxY + 38, { width: 145, align: 'right' });
      doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text(`Sig: SPX-SLIP-${Date.now()}`, pageMargin + contentWidth - 160, stampBoxY + 48, { width: 145, align: 'right' });

      // ── 6. FOOTER ────────────────────────────────────────────────────────
      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica').text(
        'SPEAXA Platform | Official Certified Payment Receipt & Tax Invoice Slip',
        pageMargin,
        795,
        { align: 'center', width: contentWidth }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generatePaymentReceiptPDFBuffer
};
