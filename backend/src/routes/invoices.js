const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// All invoice routes require admin authentication
router.use(requireAuth, requireAdmin);

// === INVOICE MANAGEMENT ===

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const { parent_id, child_id, status, search } = req.query;

    let query = `
      SELECT pi.*,
             p.first_name as parent_first_name,
             p.last_name as parent_last_name,
             p.first_name || ' ' || p.last_name as parent_name,
             p.email as parent_email,
             c.first_name as child_first_name,
             c.last_name as child_last_name
      FROM parent_invoices pi
      LEFT JOIN parents p ON pi.parent_id = p.id
      LEFT JOIN children c ON pi.child_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (parent_id) {
      params.push(parent_id);
      query += ` AND pi.parent_id = $${params.length}`;
    }

    if (child_id) {
      params.push(child_id);
      query += ` AND pi.child_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND pi.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (pi.invoice_number ILIKE $${params.length}
                      OR p.first_name ILIKE $${params.length}
                      OR p.last_name ILIKE $${params.length})`;
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
              p.first_name as parent_first_name,
              p.last_name as parent_last_name,
              p.email as parent_email,
              p.phone as parent_phone,
              p.address_line1, p.address_line2, p.city, p.province, p.postal_code,
              c.first_name as child_first_name,
              c.last_name as child_last_name
       FROM parent_invoices pi
       LEFT JOIN parents p ON pi.parent_id = p.id
       LEFT JOIN children c ON pi.child_id = c.id
       WHERE pi.id = $1 AND pi.created_by = $2`,
      [id, req.user.id]
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

// Generate invoice number
async function generateInvoiceNumber(year, month) {
  const prefix = `INV-${year}${String(month).padStart(2, '0')}`;

  const result = await pool.query(
    `SELECT invoice_number FROM parent_invoices
     WHERE invoice_number LIKE $1
     ORDER BY invoice_number DESC
     LIMIT 1`,
    [`${prefix}%`]
  );

  if (result.rows.length === 0) {
    return `${prefix}-001`;
  }

  const lastNumber = result.rows[0].invoice_number;
  const lastSequence = parseInt(lastNumber.split('-')[2]);
  const nextSequence = lastSequence + 1;

  return `${prefix}-${String(nextSequence).padStart(3, '0')}`;
}

// Create invoice
router.post('/', async (req, res) => {
  try {
    const {
      parent_id,
      child_id,
      invoice_date,
      due_date,
      line_items, // Array of {description, quantity, rate, amount}
      tax_rate,
      tax_enabled,
      pricing_mode, // 'BASE_PLUS_TAX' or 'TOTAL_INCLUDES_TAX'
      notes,
      payment_terms
    } = req.body;

    if (!parent_id || !invoice_date || !due_date || !line_items || line_items.length === 0) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Default values
    const taxEnabledValue = tax_enabled !== undefined ? tax_enabled : true;
    const taxRateValue = tax_rate !== undefined ? tax_rate : 0.05; // 5% GST default
    const pricingModeValue = pricing_mode || 'BASE_PLUS_TAX';

    let subtotal, taxAmount, totalAmount;

    // Calculate based on pricing mode
    if (pricingModeValue === 'TOTAL_INCLUDES_TAX') {
      // User enters total including tax, we back-calculate
      totalAmount = line_items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
      if (taxEnabledValue && taxRateValue > 0) {
        subtotal = totalAmount / (1 + taxRateValue);
        taxAmount = totalAmount - subtotal;
      } else {
        subtotal = totalAmount;
        taxAmount = 0;
      }
    } else {
      // Standard: base + tax = total
      subtotal = line_items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
      taxAmount = taxEnabledValue ? (subtotal * taxRateValue) : 0;
      totalAmount = subtotal + taxAmount;
    }

    // Generate invoice number
    const invoiceDate = new Date(invoice_date);
    const invoiceNumber = await generateInvoiceNumber(
      invoiceDate.getFullYear(),
      invoiceDate.getMonth() + 1
    );

    const result = await pool.query(
      `INSERT INTO parent_invoices (
        parent_id, child_id, invoice_number, invoice_date, due_date,
        line_items, subtotal, tax_rate, tax_amount, total_amount,
        amount_paid, balance_due, status, notes, payment_terms,
        tax_enabled, pricing_mode, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        parent_id,
        child_id || null,
        invoiceNumber,
        invoice_date,
        due_date,
        JSON.stringify(line_items),
        subtotal,
        taxRateValue,
        taxAmount,
        totalAmount,
        0, // amount_paid
        totalAmount, // balance_due
        'DRAFT',
        notes || null,
        payment_terms || 'Due upon receipt',
        taxEnabledValue,
        pricingModeValue,
        req.user.id
      ]
    );

    res.json({ invoice: result.rows[0] });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Update invoice
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      parent_id,
      child_id,
      invoice_date,
      due_date,
      line_items,
      tax_rate,
      status,
      notes,
      payment_terms
    } = req.body;

    // First, get current invoice
    const currentResult = await pool.query(
      'SELECT * FROM parent_invoices WHERE id = $1 AND created_by = $2',
      [id, req.user.id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const current = currentResult.rows[0];

    // Recalculate if line_items or tax_rate changed
    let subtotal = current.subtotal;
    let taxAmount = current.tax_amount;
    let totalAmount = current.total_amount;
    let balanceDue = current.balance_due;

    if (line_items) {
      subtotal = line_items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
      const rate = tax_rate !== undefined ? tax_rate : current.tax_rate;
      taxAmount = subtotal * rate;
      totalAmount = subtotal + taxAmount;
      balanceDue = totalAmount - current.amount_paid;
    } else if (tax_rate !== undefined) {
      taxAmount = subtotal * tax_rate;
      totalAmount = subtotal + taxAmount;
      balanceDue = totalAmount - current.amount_paid;
    }

    const result = await pool.query(
      `UPDATE parent_invoices
       SET parent_id = COALESCE($1, parent_id),
           child_id = COALESCE($2, child_id),
           invoice_date = COALESCE($3, invoice_date),
           due_date = COALESCE($4, due_date),
           line_items = COALESCE($5, line_items),
           subtotal = $6,
           tax_rate = COALESCE($7, tax_rate),
           tax_amount = $8,
           total_amount = $9,
           balance_due = $10,
           status = COALESCE($11, status),
           notes = COALESCE($12, notes),
           payment_terms = COALESCE($13, payment_terms),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $14 AND created_by = $15
       RETURNING *`,
      [
        parent_id,
        child_id,
        invoice_date,
        due_date,
        line_items ? JSON.stringify(line_items) : null,
        subtotal,
        tax_rate,
        taxAmount,
        totalAmount,
        balanceDue,
        status,
        notes,
        payment_terms,
        id,
        req.user.id
      ]
    );

    res.json({ invoice: result.rows[0] });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM parent_invoices WHERE id = $1 AND created_by = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// Record payment against invoice
router.post('/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_date, payment_method, notes } = req.body;

    if (!amount || !payment_date) {
      return res.status(400).json({ error: 'Amount and payment date required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get invoice
      const invoiceResult = await client.query(
        'SELECT * FROM parent_invoices WHERE id = $1 AND created_by = $2',
        [id, req.user.id]
      );

      if (invoiceResult.rows.length === 0) {
        throw new Error('Invoice not found');
      }

      const invoice = invoiceResult.rows[0];

      // Create payment record
      const paymentResult = await client.query(
        `INSERT INTO parent_payments (
          parent_id, invoice_id, amount, payment_date, status,
          payment_method, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          invoice.parent_id,
          id,
          amount,
          payment_date,
          'PAID',
          payment_method || null,
          notes || null
        ]
      );

      // Update invoice
      const newAmountPaid = parseFloat(invoice.amount_paid) + parseFloat(amount);
      const newBalanceDue = parseFloat(invoice.total_amount) - newAmountPaid;

      let newStatus = invoice.status;
      if (newBalanceDue <= 0) {
        newStatus = 'PAID';
      } else if (newAmountPaid > 0) {
        newStatus = 'PARTIAL';
      }

      await client.query(
        `UPDATE parent_invoices
         SET amount_paid = $1,
             balance_due = $2,
             status = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [newAmountPaid, newBalanceDue, newStatus, id]
      );

      await client.query('COMMIT');
      res.json({ payment: paymentResult.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Generate PDF invoice
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT pi.*,
              p.first_name as parent_first_name,
              p.last_name as parent_last_name,
              p.email as parent_email,
              p.phone as parent_phone,
              p.address_line1, p.address_line2, p.city, p.province, p.postal_code,
              c.first_name as child_first_name,
              c.last_name as child_last_name
       FROM parent_invoices pi
       LEFT JOIN parents p ON pi.parent_id = p.id
       LEFT JOIN children c ON pi.child_id = c.id
       WHERE pi.id = $1 AND pi.created_by = $2`,
      [id, req.user.id]
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

module.exports = router;
