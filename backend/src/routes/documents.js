const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { generatePaystub, generateReceipt } = require('../services/pdfGenerator');
const { generatePayrollSummary } = require('../services/excelGenerator');
const { generatePdfToken, verifyToken } = require('../utils/jwt');
const { getReceiptData, ensureReceipt } = require('../services/receiptService');
const { getDaycareSettings } = require('../services/settingsService');

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

const buildReceiptContext = async (id, options = {}) => {
  const { generatedBy, parentId } = options;

  if (generatedBy) {
    await ensureReceipt(id, generatedBy);
  }

  const data = await getReceiptData(id, { parentId });

  if (!data) {
    return null;
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
  const daycare = {
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
  };

  const childName = data.child_names || `${data.first_name} ${data.last_name}`.trim();
  const filename = `Receipt_${formatYearMonth(data.payment_date)}_${sanitizeFileNamePart(childName)}.pdf`;

  return { payment, parent, invoice, settings, daycare, filename };
};

const buildDaycareContext = async () => {
  const settings = await getDaycareSettings(pool);
  return {
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
  };
};

// === PAYSTUBS ===

// Generate paystub for a payout (admin)
router.post('/payouts/:id/generate-paystub', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if paystub already exists
    const existing = await pool.query(
      'SELECT id FROM paystubs WHERE payout_id = $1',
      [id]
    );

    if (existing.rows.length > 0) {
      return res.json({ message: 'Paystub already exists', paystubId: existing.rows[0].id });
    }

    // Get payout info
    const payoutResult = await pool.query(
      'SELECT * FROM payouts WHERE id = $1',
      [id]
    );

    if (payoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    // Generate stub number
    const stubNumber = `STUB-${Date.now()}-${id}`;

    // Create paystub record
    await pool.query(
      `INSERT INTO paystubs (payout_id, user_id, pay_period_id, stub_number)
       VALUES ($1, $2, $3, $4)`,
      [id, payoutResult.rows[0].user_id, payoutResult.rows[0].pay_period_id, stubNumber]
    );

    res.json({ message: 'Paystub generated successfully' });
  } catch (error) {
    console.error('Generate paystub error:', error);
    res.status(500).json({ error: 'Failed to generate paystub' });
  }
});

// Get paystub PDF
router.get('/paystubs/:id/pdf', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get paystub with related data
    const result = await pool.query(
      `SELECT ps.*, po.*, pp.name, pp.start_date, pp.end_date,
              u.first_name, u.last_name, u.email,
              u.address_line1, u.address_line2, u.city, u.province, u.postal_code,
              u.ytd_gross, u.ytd_cpp, u.ytd_ei, u.ytd_tax, u.ytd_hours,
              u.annual_sick_days, u.annual_vacation_days,
              u.sick_days_remaining, u.vacation_days_remaining,
              po.created_at AS payout_created_at
       FROM paystubs ps
       JOIN payouts po ON ps.payout_id = po.id
       JOIN pay_periods pp ON ps.pay_period_id = pp.id
       JOIN users u ON ps.user_id = u.id
       WHERE ps.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paystub not found' });
    }

    const data = result.rows[0];

    // Check authorization (admin or own paystub)
    if (req.user.role !== 'ADMIN' && req.user.id !== data.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const payout = {
      total_hours: data.total_hours,
      hourly_rate: data.hourly_rate,
      gross_amount: data.gross_amount,
      deductions: data.deductions,
      net_amount: data.net_amount,
      payout_created_at: data.payout_created_at
    };

    const user = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      address_line1: data.address_line1,
      address_line2: data.address_line2,
      city: data.city,
      province: data.province,
      postal_code: data.postal_code,
      ytd_gross: data.ytd_gross,
      ytd_cpp: data.ytd_cpp,
      ytd_ei: data.ytd_ei,
      ytd_tax: data.ytd_tax,
      ytd_hours: data.ytd_hours,
      annual_sick_days: data.annual_sick_days,
      annual_vacation_days: data.annual_vacation_days,
      sick_days_remaining: data.sick_days_remaining,
      vacation_days_remaining: data.vacation_days_remaining
    };

    const payPeriod = {
      name: data.name,
      start_date: data.start_date,
      end_date: data.end_date
    };

    const daycare = await buildDaycareContext();

    const pdfBuffer = await generatePaystub(payout, user, payPeriod, { daycare });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=paystub-${data.stub_number}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Get paystub PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Generate a sample paystub (today) using YTD values
router.get('/paystubs/sample', requireAuth, async (req, res) => {
  try {
    const requestedId = req.query.user_id ? Number(req.query.user_id) : null;
    const targetUserId = req.user.role === 'ADMIN' && requestedId ? requestedId : req.user.id;

    if (!Number.isFinite(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const userResult = await pool.query(
      `SELECT id, first_name, last_name, email,
              address_line1, address_line2, city, province, postal_code,
              ytd_gross, ytd_cpp, ytd_ei, ytd_tax, ytd_hours,
              annual_sick_days, annual_vacation_days,
              sick_days_remaining, vacation_days_remaining
       FROM users
       WHERE id = $1`,
      [targetUserId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user.role !== 'ADMIN' && targetUserId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = userResult.rows[0];
    const today = new Date();
    const todayIso = today.toISOString().split('T')[0];

    const payout = {
      total_hours: 0,
      hourly_rate: 0,
      gross_amount: 0,
      deductions: 0,
      net_amount: 0,
      payout_created_at: todayIso,
    };

    const payPeriod = {
      name: 'Sample (Today)',
      start_date: todayIso,
      end_date: todayIso,
    };

    const daycare = await buildDaycareContext();
    const pdfBuffer = await generatePaystub(payout, user, payPeriod, { daycare });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=paystub-sample.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate sample paystub error:', error);
    res.status(500).json({ error: 'Failed to generate sample paystub' });
  }
});

// Get my paystubs (educator)
router.get('/paystubs/mine', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ps.*, pp.name as period_name, pp.start_date, pp.end_date,
              po.net_amount
       FROM paystubs ps
       JOIN pay_periods pp ON ps.pay_period_id = pp.id
       JOIN payouts po ON ps.payout_id = po.id
       WHERE ps.user_id = $1
       ORDER BY pp.start_date DESC`,
      [req.user.id]
    );

    res.json({ paystubs: result.rows });
  } catch (error) {
    console.error('Get my paystubs error:', error);
    res.status(500).json({ error: 'Failed to fetch paystubs' });
  }
});

// Get all paystubs (admin)
router.get('/paystubs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user_id, pay_period_id } = req.query;

    let query = `
      SELECT ps.*, pp.name as period_name, pp.start_date, pp.end_date,
             u.first_name, u.last_name, u.email, po.net_amount
      FROM paystubs ps
      JOIN pay_periods pp ON ps.pay_period_id = pp.id
      JOIN users u ON ps.user_id = u.id
      JOIN payouts po ON ps.payout_id = po.id
      WHERE 1=1
    `;
    const params = [];

    if (user_id) {
      params.push(user_id);
      query += ` AND ps.user_id = $${params.length}`;
    }

    if (pay_period_id) {
      params.push(pay_period_id);
      query += ` AND ps.pay_period_id = $${params.length}`;
    }

    query += ' ORDER BY pp.start_date DESC, u.last_name, u.first_name';

    const result = await pool.query(query, params);
    res.json({ paystubs: result.rows });
  } catch (error) {
    console.error('Get paystubs error:', error);
    res.status(500).json({ error: 'Failed to fetch paystubs' });
  }
});

// === PAYROLL EXPORT ===

// Export pay period to Excel
router.get('/pay-periods/:id/export-excel', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get pay period
    const periodResult = await pool.query(
      'SELECT * FROM pay_periods WHERE id = $1',
      [id]
    );

    if (periodResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pay period not found' });
    }

    // Get payouts
    const payoutsResult = await pool.query(
      `SELECT po.*, u.first_name, u.last_name, u.email
       FROM payouts po
       JOIN users u ON po.user_id = u.id
       WHERE po.pay_period_id = $1
       ORDER BY u.last_name, u.first_name`,
      [id]
    );

    const workbook = await generatePayrollSummary(periodResult.rows[0], payoutsResult.rows);
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=payroll-${periodResult.rows[0].name}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({ error: 'Failed to export to Excel' });
  }
});

// === PARENT RECEIPTS ===

// Get signed receipt link (admin)
router.post('/parent-payments/:id/receipt-link', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const token = generatePdfToken({
      type: 'receipt',
      paymentId: id,
      role: req.user.role,
      userId: req.user.id
    });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({ url: `${baseUrl}/api/documents/receipt-open?token=${token}` });
  } catch (error) {
    console.error('Generate receipt link error:', error);
    res.status(500).json({ error: 'Failed to generate receipt link' });
  }
});

// Generate receipt for a payment
router.post('/parent-payments/:id/generate-receipt', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await ensureReceipt(id, req.user.id);

    if (!receipt) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ message: 'Receipt generated', receiptNumber: receipt.receipt_number });
  } catch (error) {
    console.error('Generate receipt error:', error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

// Get receipt PDF
router.get('/parent-payments/:id/receipt-pdf', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const context = await buildReceiptContext(id, { generatedBy: req.user.id });
    if (!context) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const pdfBuffer = await generateReceipt(context.payment, context.parent, {
      invoice: context.invoice,
      settings: context.settings,
      daycare: context.daycare
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${context.filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Get receipt PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Open receipt PDF using signed token
router.get('/receipt-open', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }

    const payload = verifyToken(token);
    if (!payload || payload.type !== 'receipt' || payload.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Invalid token' });
    }

    const context = await buildReceiptContext(payload.paymentId, { generatedBy: payload.userId });
    if (!context) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const pdfBuffer = await generateReceipt(context.payment, context.parent, {
      invoice: context.invoice,
      settings: context.settings,
      daycare: context.daycare
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${context.filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Open receipt PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;
