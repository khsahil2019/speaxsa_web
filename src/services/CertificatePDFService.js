const PDFDocument = require('pdfkit');

/**
 * Generates an ultra-luxurious, framing-ready official SPEAXA Certificate PDF (A4 Landscape).
 */
function generateCertificatePDFBuffer(options) {
  const {
    recipientName = 'Valued Member',
    title = 'Certificate of Excellence',
    description = 'In recognition of outstanding academic rigor, pedagogy, and professional performance on the SPEAXA platform.',
    certificateId = `SPX-CERT-${Date.now()}`,
    issuedAt = new Date(),
    certificateType = 'excellence_certificate'
  } = options || {};

  return new Promise((resolve, reject) => {
    try {
      // Landscape A4 size: 841.89 x 595.28 points
      const doc = new PDFDocument({ margin: 25, size: 'A4', layout: 'landscape' });
      const buffers = [];
      doc.on('data', b => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      const width = 841.89;
      const height = 595.28;

      // ── 1. BACKGROUND & DECORATIVE BORDERS ─────────────────────────
      // Background subtle tint
      doc.rect(15, 15, width - 30, height - 30).fill('#fbfcfd');

      // Outer Gold Frame
      doc.rect(25, 25, width - 50, height - 50).lineWidth(3.5).strokeColor('#d97706').stroke();
      // Inner Emerald Frame
      doc.rect(32, 32, width - 64, height - 64).lineWidth(1.5).strokeColor('#0d7a6d').stroke();
      // Thin Accent Border
      doc.rect(36, 36, width - 72, height - 72).lineWidth(0.5).strokeColor('#cbd5e1').stroke();

      // Four Decorative Corner Brackets (Gold & Emerald)
      const drawCorner = (x, y, rotX, rotY) => {
        doc.rect(x, y, 22, 22).fill('#0d7a6d');
        doc.rect(x + rotX * 3, y + rotY * 3, 16, 16).fill('#d97706');
      };
      drawCorner(25, 25, 1, 1);
      drawCorner(width - 47, 25, -1, 1);
      drawCorner(25, height - 47, 1, -1);
      drawCorner(width - 47, height - 47, -1, -1);

      // ── 2. HEADER BRANDING & EMBLEM ──────────────────────────────────
      doc.fillColor('#0d7a6d').fontSize(30).font('Helvetica-Bold').text('S P E A X A', 0, 58, { align: 'center', characterSpacing: 4 });
      doc.fillColor('#d97706').fontSize(10).font('Helvetica-Bold').text('ACADEMIC & PROFESSIONAL EXCELLENCE CORE', 0, 96, { align: 'center', characterSpacing: 2 });

      // Small Divider Line
      doc.moveTo(width / 2 - 80, 115).lineTo(width / 2 + 80, 115).lineWidth(1).strokeColor('#d97706').stroke();

      // ── 3. CERTIFICATE PRESENTATION TITLE ───────────────────────────
      doc.fillColor('#0f172a').fontSize(22).font('Helvetica-Bold').text('OFFICIAL CERTIFICATE', 0, 132, { align: 'center', characterSpacing: 1.5 });
      doc.fillColor('#64748b').fontSize(11).font('Helvetica-Oblique').text('THIS CERTIFICATE IS PROUDLY PRESENTED TO', 0, 164, { align: 'center' });

      // ── 4. RECIPIENT NAME ───────────────────────────────────────────
      doc.fillColor('#0d7a6d').fontSize(34).font('Helvetica-Bold').text(recipientName, 0, 196, { align: 'center' });
      
      // Decorative Underline under name
      doc.moveTo(width / 2 - 180, 242).lineTo(width / 2 + 180, 242).lineWidth(2).strokeColor('#d97706').stroke();

      // ── 5. AWARD TITLE & CITATION ────────────────────────────────────
      doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text(title, 0, 260, { align: 'center' });

      doc.fillColor('#334155').fontSize(11).font('Helvetica').text(description, 110, 294, {
        align: 'center',
        width: width - 220,
        lineGap: 5
      });

      // ── 6. FOOTER SECTION: DATE, OFFICIAL SEAL & SIGNATURE ──────────
      const bottomY = 430;

      // Left Column: Date & Certificate ID
      doc.fillColor('#64748b').fontSize(8.5).font('Helvetica-Bold').text('DATE OF ISSUANCE', 95, bottomY);
      const dateStr = issuedAt ? new Date(issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(dateStr, 95, bottomY + 14);
      doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(`Cert ID: ${certificateId}`, 95, bottomY + 28);

      // Center Column: Gold Seal Badge
      const sealX = width / 2;
      const sealY = bottomY + 10;
      doc.circle(sealX, sealY, 32).fillAndStroke('#fffbebe6', '#d97706');
      doc.circle(sealX, sealY, 28).lineWidth(1).strokeColor('#0d7a6d').stroke();
      doc.fillColor('#b45309').fontSize(7.5).font('Helvetica-Bold').text('OFFICIAL SEAL', sealX - 35, sealY - 14, { align: 'center', width: 70 });
      doc.fillColor('#78350f').fontSize(6.5).font('Helvetica').text('VERIFIED & CERTIFIED', sealX - 35, sealY - 2, { align: 'center', width: 70 });
      doc.fillColor('#0d7a6d').fontSize(7).font('Helvetica-Bold').text('SPEAXA CORE', sealX - 35, sealY + 10, { align: 'center', width: 70 });

      // Right Column: Authorized Signatory
      doc.fillColor('#64748b').fontSize(8.5).font('Helvetica-Bold').text('AUTHORIZED SIGNATORY', width - 255, bottomY, { align: 'right', width: 160 });
      doc.fillColor('#0d7a6d').fontSize(11).font('Helvetica-BoldOblique').text('SPEAXA Core Academic Board', width - 255, bottomY + 14, { align: 'right', width: 160 });
      doc.fillColor('#047857').fontSize(7.5).font('Helvetica').text('Digitally Encrypted & Certified', width - 255, bottomY + 28, { align: 'right', width: 160 });

      // Bottom Bar: Verification URL
      doc.rect(36, height - 48, width - 72, 12).fill('#f1f5f9');
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text(`Official Certificate Verification URL: https://speaxa.in/verify-certificate.html?id=${encodeURIComponent(certificateId)}`, 0, height - 45, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateCertificatePDFBuffer
};
