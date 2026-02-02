const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireParent } = require('../middleware/auth');
const { generatePdfToken } = require('../utils/jwt');
const { generateReceipt, generateInvoice } = require('../services/pdfGenerator');
const { getDaycareSettings } = require('../services/settingsService');
const { ensureReceipt, getReceiptData } = require('../services/receiptService');

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
  contact_email: settings.contact_email || process.env.DAYCARE_CONTACT_EMAIL,
  signature_name:
    settings.signature_name ||
    process.env.DAYCARE_SIGNATURE_NAME ||
    settings.contact_name ||
    process.env.DAYCARE_CONTACT_NAME,
  signature_image: settings.signature_image,
  signature_mode: settings.signature_mode
});

// All routes require authentication
router.use(requireAuth, requireParent);

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

// Get signed invoice link (parent)
router.post('/:id/pdf-link', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id FROM parent_invoices WHERE id = $1 AND parent_id = $2`,
      [id, req.parent.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const token = generatePdfToken({
      type: 'invoice',
      invoiceId: id,
      role: 'PARENT',
      parentId: req.parent.id
    });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({ url: `${baseUrl}/api/invoices/pdf-open?token=${token}` });
  } catch (error) {
    console.error('Generate parent invoice link error:', error);
    res.status(500).json({ error: 'Failed to generate invoice link' });
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
    const childName = [invoice.child_first_name, invoice.child_last_name].filter(Boolean).join(' ').trim();
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
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Download receipt PDF for a payment
router.get('/payments/:id/receipt-pdf', async (req, res) => {
  try {
    if (!req.parent) {
      return res.status(403).json({ error: 'Parent access required' });
    }

    const { id } = req.params;

    let data = await getReceiptData(id, { parentId: req.parent.id });
    if (!data) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (!data.receipt_number) {
      await ensureReceipt(id, req.user.id);
      data = await getReceiptData(id, { parentId: req.parent.id });
    }

    const payment = {
      id: data.id,
      receipt_number: data.receipt_number,
      amount: data.amount,
      payment_date: data.payment_date,
      payment_method: data.payment_method,
      notes: data.notes,
      status: data.status,
      invoice_id: data.invoice_id
    };

    const parent = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      child_names: data.child_names,
      address_line1: data.address_line1,
      address_line2: data.address_line2,
      city: data.city,
      province: data.province,
      postal_code: data.postal_code
    };

    let lineItems = data.line_items;
    if (typeof lineItems === 'string') {
      try {
        lineItems = JSON.parse(lineItems);
      } catch (error) {
        lineItems = [];
      }
    }
    if (!Array.isArray(lineItems)) {
      lineItems = [];
    }

    const invoice = data.invoice_number
      ? {
          invoice_number: data.invoice_number,
          invoice_date: data.invoice_date,
          line_items: lineItems,
          subtotal: data.subtotal,
          tax_rate: data.tax_rate,
          tax_amount: data.tax_amount,
          total_amount: data.total_amount,
          amount_paid: data.amount_paid,
          balance_due: data.balance_due,
          status: data.invoice_status,
          payment_terms: data.payment_terms,
          notes: data.invoice_notes,
          child_name: [data.invoice_child_first_name, data.invoice_child_last_name]
            .filter(Boolean)
            .join(' ')
            .trim()
        }
      : null;

    const settings = await getDaycareSettings(pool);
    const daycare = buildDaycareProfile(settings);

    const childName = data.child_names || `${data.first_name} ${data.last_name}`.trim();
    const filename = `Receipt_${formatYearMonth(data.payment_date)}_${sanitizeFileNamePart(childName)}.pdf`;

    const pdfBuffer = await generateReceipt(payment, parent, {
      invoice,
      settings,
      daycare
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Get receipt PDF error:', error);
    res.status(500).json({ error: 'Failed to generate receipt PDF' });
  }
});

// Get payment history
router.get('/payments/history', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pp.*, pi.invoice_number, pr.receipt_number
       FROM parent_payments pp
       LEFT JOIN parent_invoices pi ON pp.invoice_id = pi.id
       LEFT JOIN payment_receipts pr ON pr.payment_id = pp.id
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
