const pool = require('../db/pool');

const getReceiptData = async (paymentId, options = {}) => {
  const { parentId, client } = options;
  const runner = client || pool;
  const params = [paymentId];
  let whereClause = 'pp.id = $1';

  if (parentId) {
    params.push(parentId);
    whereClause += ` AND pp.parent_id = $${params.length}`;
  }

  const result = await runner.query(
    `SELECT pp.*, pr.receipt_number,
            p.first_name, p.last_name, p.email, p.phone,
            COALESCE(
              NULLIF(
                STRING_AGG(DISTINCT (c.first_name || ' ' || c.last_name), ', '),
                ''
              ),
              p.child_names
            ) AS child_names
     FROM parent_payments pp
     JOIN parents p ON pp.parent_id = p.id
     LEFT JOIN payment_receipts pr ON pr.payment_id = pp.id
     LEFT JOIN parent_children pc ON p.id = pc.parent_id
     LEFT JOIN children c ON pc.child_id = c.id
     WHERE ${whereClause}
     GROUP BY pp.id, p.id, pr.receipt_number`,
    params
  );

  return result.rows[0] || null;
};

const ensureReceipt = async (paymentId, generatedBy, options = {}) => {
  const { client } = options;
  const runner = client || pool;

  const existing = await runner.query(
    'SELECT * FROM payment_receipts WHERE payment_id = $1',
    [paymentId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const paymentResult = await runner.query(
    'SELECT id, invoice_id, amount, payment_date FROM parent_payments WHERE id = $1',
    [paymentId]
  );

  if (paymentResult.rows.length === 0) {
    return null;
  }

  const payment = paymentResult.rows[0];
  const paymentDate = new Date(payment.payment_date);
  const year = paymentDate.getFullYear();
  const month = paymentDate.getMonth() + 1;
  const prefix = `RCP-${year}${String(month).padStart(2, '0')}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const lastReceipt = await runner.query(
      `SELECT receipt_number FROM payment_receipts
       WHERE receipt_number LIKE $1
       ORDER BY receipt_number DESC
       LIMIT 1`,
      [`${prefix}%`]
    );

    let receiptNumber;
    if (lastReceipt.rows.length === 0) {
      receiptNumber = `${prefix}-001`;
    } else {
      const lastNumber = lastReceipt.rows[0].receipt_number;
      const lastSequence = parseInt(lastNumber.split('-')[2], 10);
      receiptNumber = `${prefix}-${String(lastSequence + 1).padStart(3, '0')}`;
    }

    try {
      const insertResult = await runner.query(
        `INSERT INTO payment_receipts
         (payment_id, invoice_id, receipt_number, amount, generated_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [paymentId, payment.invoice_id, receiptNumber, payment.amount, generatedBy || null]
      );

      return insertResult.rows[0];
    } catch (error) {
      if (error.code !== '23505' || attempt === 2) {
        throw error;
      }
    }
  }

  return null;
};

module.exports = { getReceiptData, ensureReceipt };
