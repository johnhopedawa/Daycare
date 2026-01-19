const express = require('express');
const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { ensureReceipt } = require('../services/receiptService');
const { applyCreditPayment } = require('../services/creditService');
const { queueNotification } = require('../utils/notifications');

const router = express.Router();

// All routes require admin
router.use(requireAuth, requireAdmin);

// === PARENT MANAGEMENT ===

// Create family (parent(s) + child)
router.post('/create-family', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      parent1FirstName,
      parent1LastName,
      parent1Email,
      parent1Phone,
      parent2FirstName,
      parent2LastName,
      parent2Email,
      parent2Phone,
      childFirstName,
      childLastName,
      childDob,
      notes
    } = req.body;

    // Validate required fields
    if (!parent1FirstName || !parent1LastName || !parent1Email || !childFirstName || !childLastName || !childDob) {
      return res.status(400).json({ error: 'Parent 1 and child information are required' });
    }

    // Generate default password from child DOB (MMYYYY format)
    const dob = new Date(childDob);
    const month = String(dob.getMonth() + 1).padStart(2, '0');
    const year = dob.getFullYear();
    const defaultPassword = `${month}${year}`;

    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const passwords = [];
    const parentIds = [];

    // Create Parent 1
    // Check if email already exists
    const existingUser1 = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [parent1Email]
    );

    if (existingUser1.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Email ${parent1Email} already in use` });
    }

    const userResult1 = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, 'PARENT', true)
       RETURNING id`,
      [parent1Email, passwordHash, parent1FirstName, parent1LastName]
    );

    const userId1 = userResult1.rows[0].id;

    const parentResult1 = await client.query(
      `INSERT INTO parents (first_name, last_name, email, phone, notes, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [parent1FirstName, parent1LastName, parent1Email, parent1Phone || null, notes || null, userId1]
    );

    parentIds.push(parentResult1.rows[0].id);
    passwords.push({ email: parent1Email, password: defaultPassword });

    // Create Parent 2 (optional)
    if (parent2FirstName && parent2LastName && parent2Email) {
      // Check if email already exists
      const existingUser2 = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [parent2Email]
      );

      if (existingUser2.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Email ${parent2Email} already in use` });
      }

      const userResult2 = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
         VALUES ($1, $2, $3, $4, 'PARENT', true)
         RETURNING id`,
        [parent2Email, passwordHash, parent2FirstName, parent2LastName]
      );

      const userId2 = userResult2.rows[0].id;

      const parentResult2 = await client.query(
        `INSERT INTO parents (first_name, last_name, email, phone, notes, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [parent2FirstName, parent2LastName, parent2Email, parent2Phone || null, notes || null, userId2]
      );

      parentIds.push(parentResult2.rows[0].id);
      passwords.push({ email: parent2Email, password: defaultPassword });
    }

    // Create Child
    const childResult = await client.query(
      `INSERT INTO children (
        first_name, last_name, date_of_birth, enrollment_start_date,
        status, billing_cycle, created_by
      ) VALUES ($1, $2, $3, CURRENT_DATE, 'ACTIVE', 'MONTHLY', $4)
      RETURNING *`,
      [childFirstName, childLastName, childDob, req.user.id]
    );

    const child = childResult.rows[0];

    // Link parents to child
    for (let i = 0; i < parentIds.length; i++) {
      const isPrimary = i === 0; // First parent is primary
      await client.query(
        `INSERT INTO parent_children (
          parent_id, child_id, relationship, is_primary_contact,
          can_pickup, has_billing_responsibility
        ) VALUES ($1, $2, 'Parent', $3, true, $4)`,
        [parentIds[i], child.id, isPrimary, isPrimary]
      );
    }

    await client.query('COMMIT');
    res.json({
      message: 'Family created successfully',
      passwords: passwords,
      child: child
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create family error:', error);
    res.status(500).json({ error: 'Failed to create family' });
  } finally {
    client.release();
  }
});

// Get parent directory with children and status
router.get('/directory', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.first_name,
        p.last_name,
        p.email,
        p.phone,
        p.address_line1,
        p.address_line2,
        p.city,
        p.province,
        p.postal_code,
        p.notes,
        p.is_active,
        p.created_at,
        u.id as user_id,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', c.id,
              'first_name', c.first_name,
              'last_name', c.last_name,
              'status', c.status,
              'is_primary_contact', pc.is_primary_contact,
              'has_billing_responsibility', pc.has_billing_responsibility
            )
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) as children,
        COUNT(DISTINCT CASE WHEN pi.status IN ('SENT', 'OVERDUE') THEN pi.id END) as unpaid_invoices,
        COALESCE(SUM(CASE WHEN pi.status IN ('SENT', 'OVERDUE') THEN pi.balance_due ELSE 0 END), 0) as total_outstanding
      FROM parents p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN parent_children pc ON p.id = pc.parent_id
      LEFT JOIN children c ON pc.child_id = c.id
      LEFT JOIN parent_invoices pi ON p.id = pi.parent_id AND pi.status IN ('SENT', 'OVERDUE')
      GROUP BY p.id, u.id
      ORDER BY p.last_name, p.first_name
    `);

    res.json({
      parents: result.rows,
      totalCount: result.rows.length
    });
  } catch (error) {
    console.error('Get parent directory error:', error);
    res.status(500).json({ error: 'Failed to fetch parent directory' });
  }
});

// Get all parents
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM parents
      ORDER BY last_name, first_name
    `);

    res.json({ parents: result.rows });
  } catch (error) {
    console.error('Get parents error:', error);
    res.status(500).json({ error: 'Failed to fetch parents' });
  }
});

// Create parent (with user account)
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { firstName, lastName, email, phone, childNames, notes, childDob } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    // Check if email already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Generate default password from child DOB (MMYYYY format)
    // If no childDob provided, use a default temporary password
    let defaultPassword = 'temp123';
    if (childDob) {
      const dob = new Date(childDob);
      const month = String(dob.getMonth() + 1).padStart(2, '0');
      const year = dob.getFullYear();
      defaultPassword = `${month}${year}`;
    }

    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // Create user account for parent
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, 'PARENT', true)
       RETURNING id`,
      [email, passwordHash, firstName, lastName]
    );

    const userId = userResult.rows[0].id;

    // Create parent record linked to user
    const parentResult = await client.query(
      `INSERT INTO parents (first_name, last_name, email, phone, child_names, notes, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [firstName, lastName, email, phone || null, childNames || null, notes || null, userId]
    );

    await client.query('COMMIT');
    res.json({
      parent: parentResult.rows[0],
      message: `Parent account created. Default password: ${defaultPassword}`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create parent error:', error);
    res.status(500).json({ error: 'Failed to create parent' });
  } finally {
    client.release();
  }
});

// Update parent
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, notes, isActive } = req.body;

    const updates = [];
    const params = [];

    if (firstName !== undefined) {
      params.push(firstName);
      updates.push(`first_name = $${params.length}`);
    }

    if (lastName !== undefined) {
      params.push(lastName);
      updates.push(`last_name = $${params.length}`);
    }

    if (email !== undefined) {
      params.push(email);
      updates.push(`email = $${params.length}`);
    }

    if (phone !== undefined) {
      params.push(phone);
      updates.push(`phone = $${params.length}`);
    }

    if (notes !== undefined) {
      params.push(notes);
      updates.push(`notes = $${params.length}`);
    }

    if (isActive !== undefined) {
      params.push(isActive);
      updates.push(`is_active = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(id);
    const query = `
      UPDATE parents
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${params.length}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    res.json({ parent: result.rows[0] });
  } catch (error) {
    console.error('Update parent error:', error);
    res.status(500).json({ error: 'Failed to update parent' });
  }
});

// Send password reset link to parent
router.post('/:id/password-reset', async (req, res) => {
  try {
    const { id } = req.params;

    const parentResult = await pool.query(
      'SELECT id, first_name, last_name, email, user_id FROM parents WHERE id = $1',
      [id]
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    const parent = parentResult.rows[0];
    if (!parent.user_id || !parent.email) {
      return res.status(400).json({ error: 'Parent does not have login access' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      'UPDATE parent_password_resets SET used = true WHERE parent_id = $1 AND used = false',
      [parent.id]
    );

    await pool.query(
      `INSERT INTO parent_password_resets
       (parent_id, reset_token, expires_at)
       VALUES ($1, $2, $3)`,
      [parent.id, resetToken, expiresAt]
    );

    const origin = req.get('origin') || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${origin}/parent/reset-password?token=${resetToken}`;

    try {
      await queueNotification({
        type: 'EMAIL',
        recipientType: 'PARENT',
        recipientId: parent.id,
        email: parent.email,
        phone: null,
        subject: 'Password Reset Request',
        message: `Hello ${parent.first_name} ${parent.last_name},\n\nA password reset was requested for your account. Use the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in 24 hours. If you did not request this, you can ignore this message.\n`
      });
    } catch (error) {
      console.error('Queue reset notification error:', error);
    }

    res.json({ message: 'Password reset link generated', reset_url: resetUrl });
  } catch (error) {
    console.error('Send password reset error:', error);
    res.status(500).json({ error: 'Failed to generate password reset link' });
  }
});

// === PARENT PAYMENTS ===

const createCredit = async (client, { parentId, paymentId, invoiceId, amount, memo, userId }) => {
  if (amount <= 0) return;

  await client.query(
    `INSERT INTO parent_credits
     (parent_id, payment_id, invoice_id, amount, credit_type, memo, created_by)
     VALUES ($1, $2, $3, $4, 'EARNED', $5, $6)`,
    [parentId, paymentId, invoiceId || null, amount, memo, userId || null]
  );

  await client.query(
    'UPDATE parents SET credit_balance = credit_balance + $1 WHERE id = $2',
    [amount, parentId]
  );
};

const applyPaidPayment = async (client, { parentId, invoiceId, amount, paymentId, userId }) => {
  const paymentAmount = parseFloat(amount);

  if (!invoiceId) {
    await createCredit(client, {
      parentId,
      paymentId,
      invoiceId: null,
      amount: paymentAmount,
      memo: 'Unapplied payment',
      userId
    });
    return;
  }

  const invoiceResult = await client.query(
    'SELECT * FROM parent_invoices WHERE id = $1 FOR UPDATE',
    [invoiceId]
  );

  if (invoiceResult.rows.length === 0) {
    const error = new Error('Invoice not found');
    error.statusCode = 404;
    throw error;
  }

  const invoice = invoiceResult.rows[0];
  if (parseInt(invoice.parent_id, 10) !== parseInt(parentId, 10)) {
    const error = new Error('Invoice parent mismatch');
    error.statusCode = 400;
    throw error;
  }

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
    [newAmountPaid, newBalanceDue, newStatus, invoice.id]
  );

  if (overpayment > 0) {
    await createCredit(client, {
      parentId,
      paymentId,
      invoiceId: invoice.id,
      amount: overpayment,
      memo: 'Overpayment',
      userId
    });
  }
};

// Get payments
router.get('/payments', async (req, res) => {
  try {
    const { status, parent_id } = req.query;

    let query = `
      SELECT pp.*, p.first_name, p.last_name,
             COALESCE(
               NULLIF(
                 STRING_AGG(DISTINCT (c.first_name || ' ' || c.last_name), ', '),
                 ''
               ),
               p.child_names
             ) AS child_names,
             pi.invoice_number,
             pr.receipt_number
      FROM parent_payments pp
      JOIN parents p ON pp.parent_id = p.id
      LEFT JOIN parent_invoices pi ON pp.invoice_id = pi.id
      LEFT JOIN payment_receipts pr ON pr.payment_id = pp.id
      LEFT JOIN parent_children pc ON p.id = pc.parent_id
      LEFT JOIN children c ON pc.child_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND pp.status = $${params.length}`;
    }

    if (parent_id) {
      params.push(parent_id);
      query += ` AND pp.parent_id = $${params.length}`;
    }

    query += `
      GROUP BY pp.id, p.id, pi.id, pr.receipt_number
      ORDER BY pp.payment_date DESC, pp.id DESC
    `;

    const result = await pool.query(query, params);
    res.json({ payments: result.rows });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Create payment (with optional invoice link)
router.post('/payments', async (req, res) => {
  const client = await pool.connect();
  try {
    const { parentId, invoiceId, amount, paymentDate, status, paymentMethod, notes } = req.body;

    const paymentAmount = parseFloat(amount);

    if (!parentId || !paymentAmount || !paymentDate) {
      return res.status(400).json({ error: 'Parent ID, amount, and payment date required' });
    }

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than 0' });
    }

    await client.query('BEGIN');

    const normalizedStatus = status === 'PENDING' ? 'PENDING' : 'PAID';
    const normalizedPaymentMethod = paymentMethod ? String(paymentMethod).trim() : null;
    const isCreditPayment = normalizedPaymentMethod
      && normalizedPaymentMethod.toLowerCase() === 'credit';
    const linkedInvoiceId = invoiceId || null;

    if (isCreditPayment && !linkedInvoiceId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Credit payments must be linked to an invoice' });
    }

    if (linkedInvoiceId) {
      const invoiceCheck = await client.query(
        'SELECT id, parent_id FROM parent_invoices WHERE id = $1',
        [linkedInvoiceId]
      );

      if (invoiceCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (parseInt(invoiceCheck.rows[0].parent_id, 10) !== parseInt(parentId, 10)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invoice does not belong to parent' });
      }
    }

    // Create payment
    const paymentResult = await client.query(
      `INSERT INTO parent_payments
       (parent_id, invoice_id, amount, payment_date, status, payment_method, notes, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        parentId,
        linkedInvoiceId,
        paymentAmount,
        paymentDate,
        normalizedStatus,
        normalizedPaymentMethod,
        notes || null,
        req.user.id
      ]
    );

    const payment = paymentResult.rows[0];

    if (normalizedStatus === 'PAID') {
      if (isCreditPayment) {
        await applyCreditPayment(client, {
          parentId,
          invoiceId: linkedInvoiceId,
          amount: paymentAmount,
          paymentId: payment.id,
          userId: req.user.id
        });
      } else {
        await applyPaidPayment(client, {
          parentId,
          invoiceId: linkedInvoiceId,
          amount: paymentAmount,
          paymentId: payment.id,
          userId: req.user.id
        });
      }
    }

    await client.query('COMMIT');
    res.json({ payment });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  } finally {
    client.release();
  }
});

// Generate receipt for payment
router.post('/payments/:id/receipt', async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await ensureReceipt(id, req.user.id);
    if (!receipt) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const paymentResult = await pool.query(
      'SELECT * FROM parent_payments WHERE id = $1',
      [id]
    );

    res.json({
      receipt_number: receipt.receipt_number,
      payment: paymentResult.rows[0]
    });
  } catch (error) {
    console.error('Generate receipt error:', error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

// Update payment
router.patch('/payments/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { amount, paymentDate, status, paymentMethod, notes } = req.body;

    await client.query('BEGIN');

    const existingResult = await client.query(
      'SELECT * FROM parent_payments WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment not found' });
    }

    const existing = existingResult.rows[0];
    const nextStatus = status || existing.status;
    const effectivePaymentMethod = paymentMethod !== undefined
      ? String(paymentMethod).trim()
      : existing.payment_method;
    const isCreditPayment = effectivePaymentMethod
      && effectivePaymentMethod.toLowerCase() === 'credit';

    if (status && !['PENDING', 'PAID'].includes(status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Payment amount must be greater than 0' });
      }
    }

    if (existing.status === 'PAID' && status && status !== 'PAID') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Paid payments cannot be set back to pending' });
    }

    if (existing.status === 'PAID' && paymentMethod !== undefined) {
      const normalizedExistingMethod = existing.payment_method
        ? String(existing.payment_method).trim()
        : '';
      if (normalizedExistingMethod !== effectivePaymentMethod) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Paid payment method cannot be changed' });
      }
    }

    if (isCreditPayment && !existing.invoice_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Credit payments must be linked to an invoice' });
    }

    if (amount !== undefined && nextStatus === 'PAID' && parseFloat(amount) !== parseFloat(existing.amount)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Update paid amounts via a new payment or adjustment' });
    }

    const updates = [];
    const params = [];

    if (amount !== undefined) {
      params.push(amount);
      updates.push(`amount = $${params.length}`);
    }

    if (paymentDate !== undefined) {
      params.push(paymentDate);
      updates.push(`payment_date = $${params.length}`);
    }

    if (status !== undefined) {
      params.push(status);
      updates.push(`status = $${params.length}`);
    }

    if (paymentMethod !== undefined) {
      params.push(effectivePaymentMethod);
      updates.push(`payment_method = $${params.length}`);
    }

    if (notes !== undefined) {
      params.push(notes);
      updates.push(`notes = $${params.length}`);
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(id);
    const query = `
      UPDATE parent_payments
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${params.length}
      RETURNING *
    `;

    const result = await client.query(query, params);

    if (existing.status !== 'PAID' && nextStatus === 'PAID') {
      if (isCreditPayment) {
        await applyCreditPayment(client, {
          parentId: existing.parent_id,
          invoiceId: existing.invoice_id,
          amount: existing.amount,
          paymentId: existing.id,
          userId: req.user.id
        });
      } else {
        await applyPaidPayment(client, {
          parentId: existing.parent_id,
          invoiceId: existing.invoice_id,
          amount: existing.amount,
          paymentId: existing.id,
          userId: req.user.id
        });
      }
    }

    await client.query('COMMIT');
    res.json({ payment: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  } finally {
    client.release();
  }
});

module.exports = router;
