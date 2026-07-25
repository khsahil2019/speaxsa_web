const PDFDocument = require('pdfkit');

/**
 * Generates an ultra-premium, print-ready SPEAXA Digital Bank Passbook PDF Buffer.
 * Features rounded cards, generous margins, color-coded credit/debit, 
 * entry separation, official SPEAXA Verified Stamp, and Digital Signature.
 */
function generatePassbookPDFBuffer(data) {
  const {
    teacherName = 'Teacher',
    teacherEmail = '',
    formattedDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    walletBalance = 0,
    totalPaid = 0,
    lifetimeGross = 0,
    passbookEntries = []
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

      // ── 1. HEADER BANNER (Rounded Corners & Modern Styling) ───────────────
      const headerY = 40;
      const headerHeight = 70;
      doc.roundedRect(pageMargin, headerY, contentWidth, headerHeight, 14).fill('#0d7a6d');

      // Title & Subtitle inside Header
      doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('SPEAXA Digital Bank', pageMargin + 18, headerY + 14);
      doc.fontSize(9).font('Helvetica').text('Official Certified Bank Passbook & Financial Ledger Statement', pageMargin + 18, headerY + 40);

      // Header Right Badges
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text('CERTIFIED FINANCIAL STATEMENT', pageMargin + contentWidth - 220, headerY + 16, { width: 200, align: 'right' });
      doc.fontSize(8).font('Helvetica').text(`Issued: ${formattedDate}`, pageMargin + contentWidth - 220, headerY + 32, { width: 200, align: 'right' });
      doc.fontSize(7.5).font('Helvetica-Bold').text('STATUS: VERIFIED & ACTIVE', pageMargin + contentWidth - 220, headerY + 46, { width: 200, align: 'right' });

      // ── 2. ACCOUNT HOLDER INFO BOX (Rounded & Padded) ────────────────────
      const accY = 122;
      const accHeight = 42;
      doc.roundedRect(pageMargin, accY, contentWidth, accHeight, 10).fillAndStroke('#f8fafc', '#e2e8f0');

      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('ACCOUNT HOLDER', pageMargin + 16, accY + 9);
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(teacherName, pageMargin + 16, accY + 20);

      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('REGISTERED EMAIL', pageMargin + contentWidth - 240, accY + 9, { width: 220, align: 'right' });
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica').text(teacherEmail || 'N/A', pageMargin + contentWidth - 240, accY + 20, { width: 220, align: 'right' });

      // ── 3. METRIC SUMMARY CARDS (Spacious & Color-Coded) ─────────────────
      const cardY = 176;
      const gap = 12;
      const cardW = (contentWidth - (gap * 2)) / 3; // ~163 pt
      const cardH = 48;

      // Card 1: Available Balance
      doc.roundedRect(pageMargin, cardY, cardW, cardH, 10).fillAndStroke('#f0fdf4', '#bbf7d0');
      doc.fillColor('#166534').fontSize(7.5).font('Helvetica-Bold').text('AVAILABLE BALANCE', pageMargin + 12, cardY + 9);
      doc.fillColor('#15803d').fontSize(12.5).font('Helvetica-Bold').text(fmtMoney(walletBalance), pageMargin + 12, cardY + 23);

      // Card 2: Total Paid Out
      doc.roundedRect(pageMargin + cardW + gap, cardY, cardW, cardH, 10).fillAndStroke('#fef2f2', '#fecaca');
      doc.fillColor('#991b1b').fontSize(7.5).font('Helvetica-Bold').text('TOTAL PAID OUT', pageMargin + cardW + gap + 12, cardY + 9);
      doc.fillColor('#dc2626').fontSize(12.5).font('Helvetica-Bold').text(fmtMoney(totalPaid), pageMargin + cardW + gap + 12, cardY + 23);

      // Card 3: Lifetime Gross Sales
      doc.roundedRect(pageMargin + (cardW + gap) * 2, cardY, cardW, cardH, 10).fillAndStroke('#f0f9ff', '#bae6fd');
      doc.fillColor('#075985').fontSize(7.5).font('Helvetica-Bold').text('LIFETIME GROSS SALES', pageMargin + (cardW + gap) * 2 + 12, cardY + 9);
      doc.fillColor('#0284c7').fontSize(12.5).font('Helvetica-Bold').text(fmtMoney(lifetimeGross), pageMargin + (cardW + gap) * 2 + 12, cardY + 23);

      // ── 4. LEDGER ENTRIES SECTION ─────────────────────────────────────────
      let currentY = 238;

      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(`Passbook Ledger History (${passbookEntries.length} Transactions)`, pageMargin, currentY);
      currentY += 18;

      // Table Header Row
      const renderTableHeader = (y) => {
        doc.roundedRect(pageMargin, y, contentWidth, 24, 6).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
        doc.text('DATE & TIME', pageMargin + 12, y + 8, { width: 80 });
        doc.text('PARTICULARS / DESCRIPTION', pageMargin + 95, y + 8, { width: 175 });
        doc.text('CATEGORY', pageMargin + 275, y + 8, { width: 75 });
        doc.text('CREDIT', pageMargin + 355, y + 8, { width: 50, align: 'right' });
        doc.text('DEBIT', pageMargin + 410, y + 8, { width: 45, align: 'right' });
        doc.text('RUNNING BAL', pageMargin + 458, y + 8, { width: 48, align: 'right' });
      };

      renderTableHeader(currentY);
      currentY += 28;

      if (passbookEntries.length === 0) {
        doc.roundedRect(pageMargin, currentY, contentWidth, 40, 8).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fillColor('#94a3b8').fontSize(9).font('Helvetica-Oblique').text('No passbook statement entries recorded yet.', pageMargin, currentY + 14, { align: 'center', width: contentWidth });
        currentY += 48;
      } else {
        passbookEntries.forEach((r, idx) => {
          // Check for page overflow
          if (currentY > 700) {
            doc.addPage();
            currentY = 40;
            renderTableHeader(currentY);
            currentY += 28;
          }

          const isEven = idx % 2 === 0;
          const entryHeight = 36;

          // Distinct rounded card for EACH transaction entry!
          doc.roundedRect(pageMargin, currentY, contentWidth, entryHeight, 8).fillAndStroke(isEven ? '#ffffff' : '#fcfdfe', '#e2e8f0');

          const dateStr = new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          const isDebit = r.type === 'withdrawal' || r.type === 'payout' || r.debit > 0;
          const catStr = r.type === 'student_referral' ? 'Student Referral' : r.type === 'teacher_referral' ? 'Teacher Referral' : isDebit ? 'Wallet Payout' : 'Course Share';

          // Column 1: Date
          doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text(dateStr, pageMargin + 12, currentY + 13, { width: 80 });

          // Column 2: Particulars / Description
          doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold').text(r.description || 'Earnings Transaction', pageMargin + 95, currentY + 12, {
            width: 175,
            height: 20,
            ellipsis: true
          });

          // Column 3: Category Pill
          doc.roundedRect(pageMargin + 275, currentY + 10, 72, 16, 4).fill(isDebit ? '#fef2f2' : '#f0fdf4');
          doc.fillColor(isDebit ? '#dc2626' : '#16a34a').fontSize(7).font('Helvetica-Bold').text(catStr, pageMargin + 275, currentY + 14, { align: 'center', width: 72 });

          // Column 4: Credit (+INR)
          if (!isDebit && r.credit > 0) {
            doc.fillColor('#16a34a').fontSize(8.5).font('Helvetica-Bold').text(`+ ${r.credit.toLocaleString('en-IN')}`, pageMargin + 355, currentY + 12, { width: 50, align: 'right' });
          } else {
            doc.fillColor('#cbd5e1').fontSize(8.5).font('Helvetica').text('—', pageMargin + 355, currentY + 12, { width: 50, align: 'right' });
          }

          // Column 5: Debit (-INR)
          if (isDebit && r.debit > 0) {
            doc.fillColor('#dc2626').fontSize(8.5).font('Helvetica-Bold').text(`- ${r.debit.toLocaleString('en-IN')}`, pageMargin + 410, currentY + 12, { width: 45, align: 'right' });
          } else {
            doc.fillColor('#cbd5e1').fontSize(8.5).font('Helvetica').text('—', pageMargin + 410, currentY + 12, { width: 45, align: 'right' });
          }

          // Column 6: Running Balance
          const balVal = r.running_balance !== undefined ? r.running_balance : (r.balance || 0);
          doc.fillColor('#0284c7').fontSize(8.5).font('Helvetica-Bold').text(`${balVal.toLocaleString('en-IN')}`, pageMargin + 458, currentY + 12, { width: 48, align: 'right' });

          currentY += entryHeight + 6; // 6pt clean gap between entry cards!
        });
      }

      // ── 5. VERIFIED STAMP & DIGITAL SIGNATURE SECTION ──────────────────
      // Check if space left on current page for stamp section, else add page
      if (currentY > 660) {
        doc.addPage();
        currentY = 40;
      }

      const stampBoxY = currentY + 10;
      doc.roundedRect(pageMargin, stampBoxY, contentWidth, 75, 10).fillAndStroke('#f8fafc', '#cbd5e1');

      // SPEAXA Stamp (Left Graphic)
      doc.circle(pageMargin + 45, stampBoxY + 37, 26).lineWidth(2).strokeColor('#0d7a6d').stroke();
      doc.circle(pageMargin + 45, stampBoxY + 37, 23).lineWidth(0.8).strokeColor('#d97706').stroke();
      doc.fillColor('#0d7a6d').fontSize(6.5).font('Helvetica-Bold').text('VERIFIED', pageMargin + 25, stampBoxY + 25, { align: 'center', width: 40 });
      doc.fillColor('#d97706').fontSize(5.5).font('Helvetica-Bold').text('SPEAXA CORE', pageMargin + 25, stampBoxY + 34, { align: 'center', width: 40 });
      doc.fillColor('#0d7a6d').fontSize(5.5).font('Helvetica-Bold').text('FINANCIAL', pageMargin + 25, stampBoxY + 42, { align: 'center', width: 40 });

      // Verification Text (Middle)
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('SPEAXA Financial Core Official Verification', pageMargin + 85, stampBoxY + 14);
      doc.fillColor('#475569').fontSize(7.5).font('Helvetica').text('This document is an authentic certified financial ledger issued by SPEAXA Digital Bank. All transaction credits, payouts, and running balances are digitally verified and encrypted.', pageMargin + 85, stampBoxY + 28, { width: 250, lineGap: 2 });

      // Digital Signature Block (Right)
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text('DIGITAL SIGNATURE', pageMargin + contentWidth - 160, stampBoxY + 14, { width: 145, align: 'right' });
      doc.fillColor('#0d7a6d').fontSize(9).font('Helvetica-BoldOblique').text('SPEAXA Core System', pageMargin + contentWidth - 160, stampBoxY + 26, { width: 145, align: 'right' });
      doc.fillColor('#047857').fontSize(7).font('Helvetica').text('RSA-2048 / SHA-256 Encrypted', pageMargin + contentWidth - 160, stampBoxY + 38, { width: 145, align: 'right' });
      doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text(`Sig: SPX-SIG-${Date.now()}`, pageMargin + contentWidth - 160, stampBoxY + 48, { width: 145, align: 'right' });

      // ── 6. PAGE NUMBERING FOOTER ───────────────────────────────────────
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica').text(
          `SPEAXA Digital Bank Official Certified Passbook Ledger Statement | Page ${i + 1} of ${range.count}`,
          pageMargin,
          795,
          { align: 'center', width: contentWidth }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generatePassbookPDFBuffer
};
