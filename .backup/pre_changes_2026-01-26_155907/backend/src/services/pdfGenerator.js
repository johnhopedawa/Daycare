const PDFDocument = require('pdfkit');

function generatePaystub(payout, user, payPeriod) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('PAYSTUB', { align: 'center' });
      doc.moveDown();

      // Employer info
      doc.fontSize(12).text('Daycare Management System', { align: 'center' });
      doc.fontSize(10).text('sistersdomain.com', { align: 'center' });
      doc.moveDown(2);

      // Employee info
      doc.fontSize(14).text('Employee Information', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Name: ${user.first_name} ${user.last_name}`);
      doc.text(`Email: ${user.email}`);
      doc.moveDown();

      // Pay period info
      doc.fontSize(14).text('Pay Period Information', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Period: ${payPeriod.name}`);
      doc.text(`Start Date: ${new Date(payPeriod.start_date).toLocaleDateString()}`);
      doc.text(`End Date: ${new Date(payPeriod.end_date).toLocaleDateString()}`);
      doc.moveDown();

      // Earnings
      doc.fontSize(14).text('Earnings', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Hours Worked: ${payout.total_hours}`);
      doc.text(`Hourly Rate: $${parseFloat(payout.hourly_rate).toFixed(2)}`);
      doc.text(`Gross Pay: $${parseFloat(payout.gross_amount).toFixed(2)}`);
      doc.moveDown();

      // Deductions
      doc.fontSize(14).text('Deductions', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Total Deductions: $${parseFloat(payout.deductions).toFixed(2)}`);
      doc.text('(Tax withholdings and other deductions would appear here)');
      doc.moveDown();

      // Net pay
      doc.fontSize(16).fillColor('green');
      doc.text(`NET PAY: $${parseFloat(payout.net_amount).toFixed(2)}`, { underline: true });
      doc.fillColor('black');
      doc.moveDown(2);

      // Footer
      doc.fontSize(8);
      doc.text('This is an official paystub. Please retain for your records.', { align: 'center' });
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function generateReceipt(payment, parent) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('PAYMENT RECEIPT', { align: 'center' });
      doc.moveDown();

      // School info
      doc.fontSize(12).text('Daycare Management System', { align: 'center' });
      doc.fontSize(10).text('sistersdomain.com', { align: 'center' });
      doc.moveDown(2);

      // Receipt number
      doc.fontSize(12);
      doc.text(`Receipt #: ${payment.receipt_number || payment.id}`, { align: 'right' });
      doc.text(`Date: ${new Date(payment.payment_date).toLocaleDateString()}`, { align: 'right' });
      doc.moveDown();

      // Parent info
      doc.fontSize(14).text('Received From:', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Name: ${parent.first_name} ${parent.last_name}`);
      if (parent.email) doc.text(`Email: ${parent.email}`);
      if (parent.phone) doc.text(`Phone: ${parent.phone}`);
      if (parent.child_names) doc.text(`Child(ren): ${parent.child_names}`);
      doc.moveDown();

      // Payment details
      doc.fontSize(14).text('Payment Details', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Amount: $${parseFloat(payment.amount).toFixed(2)}`);
      if (payment.payment_method) doc.text(`Payment Method: ${payment.payment_method}`);
      if (payment.notes) doc.text(`Notes: ${payment.notes}`);
      doc.moveDown();

      // Total
      doc.fontSize(16).fillColor('blue');
      doc.text(`TOTAL PAID: $${parseFloat(payment.amount).toFixed(2)}`, { underline: true });
      doc.fillColor('black');
      doc.moveDown(2);

      // Footer
      doc.fontSize(8);
      doc.text('Thank you for your payment!', { align: 'center' });
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generatePaystub, generateReceipt };
