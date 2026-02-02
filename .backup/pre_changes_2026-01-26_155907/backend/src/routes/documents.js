const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { generatePaystub, generateReceipt } = require('../services/pdfGenerator');
const { generatePayrollSummary } = require('../services/excelGenerator');
const { generatePdfToken, verifyToken } = require('../utils/jwt');
const { getReceiptData, ensureReceipt } = require('../services/receiptService');

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
    notes: data.notes
  };

  const parent = {
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone,
    child_names: data.child_names
  };

  const childName = data.child_names || `${data.first_name} ${data.last_name}`.trim();
  const filename = `Receipt_${formatYearMonth(data.payment_date)}_${sanitizeFileNamePart(childName)}.pdf`;

  return { payment, parent, filename };
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
              u.first_name, u.last_name, u.email
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
      net_amount: data.net_amount
    };

    const user = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email
    };

    const payPeriod = {
      name: data.name,
      start_date: data.start_date,
      end_date: data.end_date
    };

    const pdfBuffer = await generatePaystub(payout, user, payPeriod);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=paystub-${data.stub_number}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Get paystub PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
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

    const pdfBuffer = await generateReceipt(context.payment, context.parent);

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

    const pdfBuffer = await generateReceipt(context.payment, context.parent);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${context.filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Open receipt PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;
