// Eagle Eyes Training - PDF Certificate Generator
// Uses jsPDF library (loaded via CDN in completion.html)

var CertificateGenerator = {
  generate: function(userName) {
    if (!userName || !userName.trim()) {
      alert('Please enter your name to generate the certificate.');
      return;
    }

    userName = userName.trim();

    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF library failed to load. Please check your internet connection and refresh the page.');
      return;
    }

    try {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    var w = 297;
    var h = 210;

    // Background
    doc.setFillColor(33, 35, 37);
    doc.rect(0, 0, w, h, 'F');

    // Border
    doc.setDrawColor(30, 144, 255);
    doc.setLineWidth(2);
    doc.rect(10, 10, w - 20, h - 20);

    // Inner border
    doc.setDrawColor(255, 215, 0);
    doc.setLineWidth(0.5);
    doc.rect(14, 14, w - 28, h - 28);

    // Corner accents
    this.drawCornerAccent(doc, 14, 14, 1, 1);
    this.drawCornerAccent(doc, w - 14, 14, -1, 1);
    this.drawCornerAccent(doc, 14, h - 14, 1, -1);
    this.drawCornerAccent(doc, w - 14, h - 14, -1, -1);

    // Eagle Eyes logo
    if (typeof EAGLE_EYES_LOGO !== 'undefined') {
      var logoW = 70;
      var logoH = logoW * (192 / 1057);
      doc.addImage(EAGLE_EYES_LOGO, 'PNG', w / 2 - logoW / 2, 20, logoW, logoH);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 144, 255);
      doc.text('EAGLE EYES', w / 2, 35, { align: 'center' });
    }

    doc.setFontSize(10);
    doc.setTextColor(255, 215, 0);
    doc.text('SEARCH & RESCUE TECHNOLOGY', w / 2, 42, { align: 'center' });

    // Divider line
    doc.setDrawColor(30, 144, 255);
    doc.setLineWidth(0.3);
    doc.line(w / 2 - 60, 48, w / 2 + 60, 48);

    // Certificate title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(255, 255, 255);
    doc.text('Certificate of Completion', w / 2, 65, { align: 'center' });

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(180, 180, 180);
    doc.text('This is to certify that', w / 2, 80, { align: 'center' });

    // Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(255, 215, 0);
    doc.text(userName, w / 2, 95, { align: 'center' });

    // Name underline
    var nameWidth = doc.getTextWidth(userName);
    doc.setDrawColor(255, 215, 0);
    doc.setLineWidth(0.5);
    doc.line(w / 2 - nameWidth / 2 - 5, 98, w / 2 + nameWidth / 2 + 5, 98);

    // Completion text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(180, 180, 180);
    doc.text('has successfully completed all modules of the', w / 2, 110, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('Eagle Eyes Pilot SAR Training Program', w / 2, 122, { align: 'center' });

    // Modules completed
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('8 Modules \u2022 Getting Started \u2022 Core Interface \u2022 Detection System \u2022 Camera Control', w / 2, 135, { align: 'center' });
    doc.text('Mapping & CalTopo \u2022 Broadcasting \u2022 Flight Missions \u2022 Advanced Features', w / 2, 141, { align: 'center' });

    // Divider
    doc.setDrawColor(30, 144, 255);
    doc.setLineWidth(0.3);
    doc.line(w / 2 - 60, 149, w / 2 + 60, 149);

    // Date and certificate ID
    var today = new Date();
    var dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    var certId = 'EE-' + today.getFullYear() + '-' + this.generateId();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(180, 180, 180);
    doc.text('Date of Completion', w / 2 - 50, 160, { align: 'center' });
    doc.text('Certificate ID', w / 2 + 50, 160, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(dateStr, w / 2 - 50, 168, { align: 'center' });
    doc.text(certId, w / 2 + 50, 168, { align: 'center' });

    // Footer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('eagleeyessearch.com', w / 2, h - 20, { align: 'center' });

    // Save
    doc.save('Eagle_Eyes_Certificate_' + userName.replace(/\s+/g, '_') + '.pdf');

    // Store completion
    try {
      localStorage.setItem('certificateGenerated', JSON.stringify({
        name: userName,
        date: dateStr,
        certId: certId
      }));
    } catch(e) {}

    } catch(err) {
      console.error('Certificate generation error:', err);
      alert('Error generating certificate: ' + err.message);
    }
  },

  drawCornerAccent: function(doc, x, y, dx, dy) {
    doc.setDrawColor(255, 215, 0);
    doc.setLineWidth(1);
    doc.line(x, y, x + (15 * dx), y);
    doc.line(x, y, x, y + (15 * dy));
  },

  generateId: function() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var id = '';
    for (var i = 0; i < 8; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }
};
