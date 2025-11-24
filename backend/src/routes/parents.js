const express = require('express');
const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const { requireAuth, requireAdmin } = require('../middleware/auth');

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

// === PARENT PAYMENTS ===

// Get payments
router.get('/payments', async (req, res) => {
  try {
    const { status, parent_id } = req.query;

    let query = `
      SELECT pp.*, p.first_name, p.last_name, pi.invoice_number
      FROM parent_payments pp
      JOIN parents p ON pp.parent_id = p.id
      LEFT JOIN parent_invoices pi ON pp.invoice_id = pi.id
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

    query += ' ORDER BY pp.payment_date DESC, pp.id DESC';

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
    await client.query('BEGIN');

    const { parentId, invoiceId, amount, paymentDate, status, paymentMethod, notes } = req.body;

    if (!parentId || !amount || !paymentDate) {
      return res.status(400).json({ error: 'Parent ID, amount, and payment date required' });
    }

    // Create payment
    const paymentResult = await client.query(
      `INSERT INTO parent_payments
       (parent_id, invoice_id, amount, payment_date, status, payment_method, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [parentId, invoiceId || null, amount, paymentDate, status || 'COMPLETED', paymentMethod || null, notes || null]
    );

    const payment = paymentResult.rows[0];

    // If linked to invoice, update invoice amounts
    if (invoiceId) {
      await client.query(
        `UPDATE parent_invoices
         SET amount_paid = amount_paid + $1,
             balance_due = balance_due - $2,
             status = CASE
               WHEN balance_due - $3 <= 0 THEN 'PAID'
               WHEN amount_paid + $4 > 0 THEN 'PARTIALLY_PAID'
               ELSE status
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [amount, amount, amount, amount, invoiceId]
      );
    }

    await client.query('COMMIT');
    res.json({ payment });
  } catch (error) {
    await client.query('ROLLBACK');
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

    // Get payment with invoice details
    const paymentResult = await pool.query(
      `SELECT pp.*, pi.invoice_number, p.first_name, p.last_name, p.email
       FROM parent_payments pp
       LEFT JOIN parent_invoices pi ON pp.invoice_id = pi.id
       LEFT JOIN parents p ON pp.parent_id = p.id
       WHERE pp.id = $1`,
      [id]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    // Check if receipt already exists
    const existingReceipt = await pool.query(
      'SELECT receipt_number FROM payment_receipts WHERE payment_id = $1',
      [id]
    );

    let receiptNumber;
    if (existingReceipt.rows.length > 0) {
      receiptNumber = existingReceipt.rows[0].receipt_number;
    } else {
      // Generate receipt number
      const year = new Date(payment.payment_date).getFullYear();
      const month = new Date(payment.payment_date).getMonth() + 1;
      const prefix = `RCP-${year}${String(month).padStart(2, '0')}`;

      const lastReceipt = await pool.query(
        `SELECT receipt_number FROM payment_receipts
         WHERE receipt_number LIKE $1
         ORDER BY receipt_number DESC
         LIMIT 1`,
        [`${prefix}%`]
      );

      if (lastReceipt.rows.length === 0) {
        receiptNumber = `${prefix}-001`;
      } else {
        const lastNumber = lastReceipt.rows[0].receipt_number;
        const lastSequence = parseInt(lastNumber.split('-')[2]);
        receiptNumber = `${prefix}-${String(lastSequence + 1).padStart(3, '0')}`;
      }

      // Create receipt record
      await pool.query(
        `INSERT INTO payment_receipts
         (payment_id, invoice_id, receipt_number, amount, generated_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, payment.invoice_id, receiptNumber, payment.amount, req.user.id]
      );
    }

    res.json({
      receipt_number: receiptNumber,
      payment: payment
    });
  } catch (error) {
    console.error('Generate receipt error:', error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

// Update payment
router.patch('/payments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentDate, status, paymentMethod, notes } = req.body;

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
      params.push(paymentMethod);
      updates.push(`payment_method = $${params.length}`);
    }

    if (notes !== undefined) {
      params.push(notes);
      updates.push(`notes = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(id);
    const query = `
      UPDATE parent_payments
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${params.length}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ payment: result.rows[0] });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

module.exports = router;
