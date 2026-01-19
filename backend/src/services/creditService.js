const pool = require('../db/pool');

const applyCreditPayment = async (client, { parentId, invoiceId, amount, paymentId, userId }) => {
  const runner = client || pool;
  const creditAmount = parseFloat(amount);

  if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
    const error = new Error('Credit amount must be greater than 0');
    error.statusCode = 400;
    throw error;
  }

  const parentResult = await runner.query(
    'SELECT credit_balance FROM parents WHERE id = $1 FOR UPDATE',
    [parentId]
  );

  if (parentResult.rows.length === 0) {
    const error = new Error('Parent not found');
    error.statusCode = 404;
    throw error;
  }

  const creditBalance = parseFloat(parentResult.rows[0].credit_balance || 0);
  if (creditBalance < creditAmount) {
    const error = new Error('Insufficient credit balance');
    error.statusCode = 400;
    throw error;
  }

  const invoiceResult = await runner.query(
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
  if (creditAmount > balanceDue) {
    const error = new Error('Credit amount exceeds invoice balance');
    error.statusCode = 400;
    throw error;
  }

  const newAmountPaid = parseFloat(invoice.amount_paid) + creditAmount;
  const newBalanceDue = Math.max(parseFloat(invoice.total_amount) - newAmountPaid, 0);
  const newStatus = newBalanceDue <= 0 ? 'PAID' : 'PARTIAL';

  await runner.query(
    `UPDATE parent_invoices
     SET amount_paid = $1,
         balance_due = $2,
         status = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [newAmountPaid, newBalanceDue, newStatus, invoice.id]
  );

  await runner.query(
    `INSERT INTO parent_credits
     (parent_id, payment_id, invoice_id, amount, credit_type, memo, created_by)
     VALUES ($1, $2, $3, $4, 'APPLIED', $5, $6)`,
    [parentId, paymentId || null, invoice.id, creditAmount, 'Applied credit', userId || null]
  );

  await runner.query(
    'UPDATE parents SET credit_balance = credit_balance - $1 WHERE id = $2',
    [creditAmount, parentId]
  );
};

module.exports = { applyCreditPayment };
