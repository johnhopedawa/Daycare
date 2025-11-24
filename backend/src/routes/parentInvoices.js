const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Get all invoices for parent
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT pi.*,
             c.first_name as child_first_name,
             c.last_name as child_last_name
      FROM parent_invoices pi
      LEFT JOIN children c ON pi.child_id = c.id
      WHERE pi.parent_id = $1
    `;
    const params = [req.parent.id];

    if (status) {
      params.push(status);
      query += ` AND pi.status = $${params.length}`;
    }

    query += ' ORDER BY pi.invoice_date DESC, pi.invoice_number DESC';

    const result = await pool.query(query, params);
    res.json({ invoices: result.rows });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get single invoice
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT pi.*,
              c.first_name as child_first_name,
              c.last_name as child_last_name
       FROM parent_invoices pi
       LEFT JOIN children c ON pi.child_id = c.id
       WHERE pi.id = $1 AND pi.parent_id = $2`,
      [id, req.parent.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Get payments for this invoice
    const paymentsResult = await pool.query(
      `SELECT * FROM parent_payments
       WHERE invoice_id = $1
       ORDER BY payment_date DESC`,
      [id]
    );

    res.json({
      invoice: result.rows[0],
      payments: paymentsResult.rows
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Download invoice PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT pi.*, p.first_name as parent_first_name, p.last_name as parent_last_name,
              p.email as parent_email, p.phone as parent_phone,
              p.address_line1, p.address_line2, p.city, p.province, p.postal_code,
              c.first_name as child_first_name, c.last_name as child_last_name
       FROM parent_invoices pi
       LEFT JOIN parents p ON pi.parent_id = p.id
       LEFT JOIN children c ON pi.child_id = c.id
       WHERE pi.id = $1 AND pi.parent_id = $2`,
      [id, req.parent.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = result.rows[0];
    const lineItems = invoice.line_items;

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoice_number}.pdf"`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('INVOICE', { align: 'right' });
    doc.moveDown();

    // Invoice details
    doc.fontSize(10);
    doc.text(`Invoice #: ${invoice.invoice_number}`, { align: 'right' });
    doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, { align: 'right' });
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();

    // Bill to
    doc.fontSize(12).text('Bill To:', 50, doc.y);
    doc.fontSize(10);
    doc.text(`${invoice.parent_first_name} ${invoice.parent_last_name}`);
    if (invoice.address_line1) {
      doc.text(invoice.address_line1);
      if (invoice.address_line2) doc.text(invoice.address_line2);
      doc.text(`${invoice.city}, ${invoice.province} ${invoice.postal_code}`);
    }
    if (invoice.parent_email) doc.text(`Email: ${invoice.parent_email}`);
    if (invoice.parent_phone) doc.text(`Phone: ${invoice.parent_phone}`);
    doc.moveDown(2);

    // Line items table
    const tableTop = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Description', 50, tableTop);
    doc.text('Qty', 300, tableTop, { width: 50, align: 'right' });
    doc.text('Rate', 370, tableTop, { width: 70, align: 'right' });
    doc.text('Amount', 460, tableTop, { width: 90, align: 'right' });

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 25;
    doc.font('Helvetica');

    lineItems.forEach(item => {
      doc.text(item.description, 50, y, { width: 240 });
      doc.text(item.quantity.toString(), 300, y, { width: 50, align: 'right' });
      doc.text(`$${parseFloat(item.rate).toFixed(2)}`, 370, y, { width: 70, align: 'right' });
      doc.text(`$${parseFloat(item.amount).toFixed(2)}`, 460, y, { width: 90, align: 'right' });
      y += 25;
    });

    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 15;

    // Totals
    doc.text('Subtotal:', 370, y, { width: 70, align: 'right' });
    doc.text(`$${parseFloat(invoice.subtotal).toFixed(2)}`, 460, y, { width: 90, align: 'right' });
    y += 20;

    if (invoice.tax_amount > 0) {
      const taxPercent = (parseFloat(invoice.tax_rate) * 100).toFixed(2);
      doc.text(`Tax (${taxPercent}%):`, 370, y, { width: 70, align: 'right' });
      doc.text(`$${parseFloat(invoice.tax_amount).toFixed(2)}`, 460, y, { width: 90, align: 'right' });
      y += 20;
    }

    doc.font('Helvetica-Bold');
    doc.text('Total:', 370, y, { width: 70, align: 'right' });
    doc.text(`$${parseFloat(invoice.total_amount).toFixed(2)}`, 460, y, { width: 90, align: 'right' });
    y += 20;

    if (invoice.amount_paid > 0) {
      doc.font('Helvetica');
      doc.text('Amount Paid:', 370, y, { width: 70, align: 'right' });
      doc.text(`$${parseFloat(invoice.amount_paid).toFixed(2)}`, 460, y, { width: 90, align: 'right' });
      y += 20;

      doc.font('Helvetica-Bold');
      doc.text('Balance Due:', 370, y, { width: 70, align: 'right' });
      doc.text(`$${parseFloat(invoice.balance_due).toFixed(2)}`, 460, y, { width: 90, align: 'right' });
    }

    // Payment terms and notes
    if (invoice.payment_terms || invoice.notes) {
      doc.moveDown(2);
      doc.font('Helvetica');
      if (invoice.payment_terms) {
        doc.fontSize(10).text(`Payment Terms: ${invoice.payment_terms}`);
      }
      if (invoice.notes) {
        doc.moveDown();
        doc.text(`Notes: ${invoice.notes}`);
      }
    }

    doc.end();
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Get payment history
router.get('/payments/history', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pp.*, pi.invoice_number
       FROM parent_payments pp
       LEFT JOIN parent_invoices pi ON pp.invoice_id = pi.id
       WHERE pp.parent_id = $1
       ORDER BY pp.payment_date DESC`,
      [req.parent.id]
    );

    res.json({ payments: result.rows });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

module.exports = router;
