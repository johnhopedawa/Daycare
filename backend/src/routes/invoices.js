const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { generatePdfToken, verifyToken } = require('../utils/jwt');
const { getDaycareSettings } = require('../services/settingsService');
const { applyCreditPayment } = require('../services/creditService');
const { generateInvoice } = require('../services/pdfGenerator');

const router = express.Router();

const sanitizeFileNamePart = (value) => {
  if (!value) return 'Unknown';
  const cleaned = String(value)
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'Unknown';
};

const formatYearMonth = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'UnknownDate';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const buildDaycareProfile = (settings) => ({
  name:
    settings.daycare_name ||
    settings.name ||
    process.env.DAYCARE_NAME ||
    'Daycare Management System',
  address_line1: settings.address_line1 || process.env.DAYCARE_ADDRESS_LINE1,
  address_line2: settings.address_line2 || process.env.DAYCARE_ADDRESS_LINE2,
  city: settings.city || process.env.DAYCARE_CITY,
  province: settings.province || process.env.DAYCARE_PROVINCE,
  postal_code: settings.postal_code || process.env.DAYCARE_POSTAL_CODE,
  phone1: settings.phone1 || process.env.DAYCARE_PHONE1,
  phone2: settings.phone2 || process.env.DAYCARE_PHONE2,
  contact_name: settings.contact_name || process.env.DAYCARE_CONTACT_NAME,
  contact_phone: settings.contact_phone || process.env.DAYCARE_CONTACT_PHONE,
  contact_email: settings.contact_email || process.env.DAYCARE_CONTACT_EMAIL
});

const getInvoiceForAdmin = async (id, userId) => {
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
    [id, userId]
  );

  return result.rows[0] || null;
};

const getInvoiceForParent = async (id, parentId) => {
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
     WHERE pi.id = $1 AND pi.parent_id = $2`,
    [id, parentId]
  );

  return result.rows[0] || null;
};

const renderInvoicePdf = async (res, invoice) => {
  const childName = [invoice.child_first_name, invoice.child_last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  const parentName = `${invoice.parent_first_name || ''} ${invoice.parent_last_name || ''}`.trim();
  const namePart = childName || parentName || 'Unknown';
  const filename = `Invoice_${formatYearMonth(invoice.invoice_date)}_${sanitizeFileNamePart(namePart)}.pdf`;

  let lineItems = invoice.line_items;
  if (typeof lineItems === 'string') {
    try {
      lineItems = JSON.parse(lineItems);
    } catch (error) {
      lineItems = [];
    }
  }

  const parent = {
    first_name: invoice.parent_first_name,
    last_name: invoice.parent_last_name,
    email: invoice.parent_email,
    phone: invoice.parent_phone,
    address_line1: invoice.address_line1,
    address_line2: invoice.address_line2,
    city: invoice.city,
    province: invoice.province,
    postal_code: invoice.postal_code
  };

  const invoiceContext = {
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    line_items: lineItems,
    subtotal: invoice.subtotal,
    tax_rate: invoice.tax_rate,
    tax_amount: invoice.tax_amount,
    total_amount: invoice.total_amount,
    amount_paid: invoice.amount_paid,
    balance_due: invoice.balance_due,
    status: invoice.status,
    payment_terms: invoice.payment_terms,
    notes: invoice.notes,
    child_name: childName
  };

  const settings = await getDaycareSettings(pool);
  const daycare = buildDaycareProfile(settings);

  const pdfBuffer = await generateInvoice(invoiceContext, parent, { settings, daycare });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.send(pdfBuffer);
};

router.get('/pdf-open', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }

    const payload = verifyToken(token);
    if (!payload || payload.type !== 'invoice') {
      return res.status(403).json({ error: 'Invalid token' });
    }

    let invoice = null;
    if (payload.role === 'ADMIN' && payload.userId) {
      invoice = await getInvoiceForAdmin(payload.invoiceId, payload.userId);
    } else if (payload.role === 'PARENT' && payload.parentId) {
      invoice = await getInvoiceForParent(payload.invoiceId, payload.parentId);
    }

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await renderInvoicePdf(res, invoice);
  } catch (error) {
    console.error('Open invoice PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

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
             p.family_name as family_name,
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
      pricing_mode, // 'BASE_PLUS_TAX' or 'TOTAL_INCLUDES_TAX'
      notes,
      payment_terms
    } = req.body;

    if (!parent_id || !invoice_date || !due_date || !line_items || line_items.length === 0) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const settings = await getDaycareSettings(pool);
    const taxEnabledValue = settings.tax_enabled;
    const taxRateValue = parseFloat(settings.tax_rate);
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
      status,
      notes,
      payment_terms
    } = req.body;

    if (status) {
      if (['PAID', 'PARTIAL'].includes(status)) {
        return res.status(400).json({ error: 'Use payment records to mark invoices as paid or partial' });
      }
      const allowedStatuses = ['DRAFT', 'SENT', 'OVERDUE'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status update' });
      }
    }

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
      const rate = current.tax_rate;
      taxAmount = subtotal * rate;
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
           tax_rate = $7,
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
        current.tax_rate,
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
    const paymentAmount = parseFloat(amount);
    const normalizedPaymentMethod = payment_method ? String(payment_method).trim() : null;
    const isCreditPayment = normalizedPaymentMethod
      && normalizedPaymentMethod.toLowerCase() === 'credit';

    if (!paymentAmount || !payment_date) {
      return res.status(400).json({ error: 'Amount and payment date required' });
    }

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than 0' });
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
          payment_method, notes, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          invoice.parent_id,
          id,
          paymentAmount,
          payment_date,
          'PAID',
          normalizedPaymentMethod,
          notes || null,
          req.user.id
        ]
      );

      if (isCreditPayment) {
        await applyCreditPayment(client, {
          parentId: invoice.parent_id,
          invoiceId: id,
          amount: paymentAmount,
          paymentId: paymentResult.rows[0].id,
          userId: req.user.id
        });
      } else {
        const balanceDue = parseFloat(invoice.balance_due);
        const applyAmount = Math.min(paymentAmount, balanceDue);
        const overpayment = paymentAmount - applyAmount;

        const newAmountPaid = parseFloat(invoice.amount_paid) + applyAmount;
        const newBalanceDue = Math.max(parseFloat(invoice.total_amount) - newAmountPaid, 0);

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

        if (overpayment > 0) {
          await client.query(
            `INSERT INTO parent_credits
             (parent_id, payment_id, invoice_id, amount, credit_type, memo, created_by)
             VALUES ($1, $2, $3, $4, 'EARNED', $5, $6)`,
            [invoice.parent_id, paymentResult.rows[0].id, id, overpayment, 'Overpayment', req.user.id]
          );

          await client.query(
            'UPDATE parents SET credit_balance = credit_balance + $1 WHERE id = $2',
            [overpayment, invoice.parent_id]
          );
        }
      }

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
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Get signed invoice link (admin)
router.post('/:id/pdf-link', async (req, res) => {
  try {
    const { id } = req.params;
    const token = generatePdfToken({
      type: 'invoice',
      invoiceId: id,
      role: req.user.role,
      userId: req.user.id
    });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({ url: `${baseUrl}/api/invoices/pdf-open?token=${token}` });
  } catch (error) {
    console.error('Generate invoice link error:', error);
    res.status(500).json({ error: 'Failed to generate invoice link' });
  }
});

// Generate PDF invoice
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await getInvoiceForAdmin(id, req.user.id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await renderInvoicePdf(res, invoice);
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;
