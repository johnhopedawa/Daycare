const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/billing/templates
// Get all billing templates
router.get('/templates', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        bt.*,
        p.first_name || ' ' || p.last_name as parent_name,
        c.first_name || ' ' || c.last_name as child_name
      FROM billing_templates bt
      JOIN parents p ON bt.parent_id = p.id
      LEFT JOIN children c ON bt.child_id = c.id
      ORDER BY bt.is_active DESC, bt.next_invoice_date ASC`
    );

    res.json({ templates: result.rows });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get billing templates' });
  }
});

// POST /api/billing/templates
// Create a billing template
router.post('/templates', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      parent_id,
      child_id,
      template_name,
      frequency,
      line_items,
      subtotal,
      tax_rate,
      next_invoice_date
    } = req.body;

    const result = await pool.query(
      `INSERT INTO billing_templates
       (parent_id, child_id, template_name, frequency, line_items, subtotal, tax_rate, next_invoice_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [parent_id, child_id, template_name, frequency, JSON.stringify(line_items), subtotal, tax_rate || 0.13, next_invoice_date, req.user.id]
    );

    res.json({ template: result.rows[0] });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create billing template' });
  }
});

// PATCH /api/billing/templates/:id
// Update a billing template
router.patch('/templates/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      template_name,
      frequency,
      line_items,
      subtotal,
      tax_rate,
      is_active,
      next_invoice_date
    } = req.body;

    const result = await pool.query(
      `UPDATE billing_templates
       SET template_name = COALESCE($1, template_name),
           frequency = COALESCE($2, frequency),
           line_items = COALESCE($3, line_items),
           subtotal = COALESCE($4, subtotal),
           tax_rate = COALESCE($5, tax_rate),
           is_active = COALESCE($6, is_active),
           next_invoice_date = COALESCE($7, next_invoice_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [template_name, frequency, line_items ? JSON.stringify(line_items) : null, subtotal, tax_rate, is_active, next_invoice_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template: result.rows[0] });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update billing template' });
  }
});

// POST /api/billing/generate-invoices
// Generate invoices from active templates
router.post('/generate-invoices', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get templates due for invoice generation
    const templates = await client.query(
      `SELECT * FROM billing_templates
       WHERE is_active = true
         AND next_invoice_date <= CURRENT_DATE
       ORDER BY next_invoice_date ASC`
    );

    const generated = [];

    for (const template of templates.rows) {
      // Calculate amounts
      const tax_amount = (parseFloat(template.subtotal) * parseFloat(template.tax_rate)).toFixed(2);
      const total_amount = (parseFloat(template.subtotal) + parseFloat(tax_amount)).toFixed(2);

      // Generate invoice number
      const invoiceNumberResult = await client.query(
        `SELECT COUNT(*) as count FROM parent_invoices WHERE invoice_date >= DATE_TRUNC('month', CURRENT_DATE)`
      );
      const invoiceCount = parseInt(invoiceNumberResult.rows[0].count) + 1;
      const invoiceNumber = `INV-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(invoiceCount).padStart(3, '0')}`;

      // Create invoice
      const invoice = await client.query(
        `INSERT INTO parent_invoices
         (parent_id, child_id, invoice_number, invoice_date, due_date, line_items,
          subtotal, tax_rate, tax_amount, total_amount, balance_due, status, created_by)
         VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + 15, $4, $5, $6, $7, $8, $9, 'SENT', $10)
         RETURNING *`,
        [
          template.parent_id,
          template.child_id,
          invoiceNumber,
          template.line_items,
          template.subtotal,
          template.tax_rate,
          tax_amount,
          total_amount,
          total_amount,
          req.user.id
        ]
      );

      // Calculate next invoice date based on frequency
      let nextDate = new Date(template.next_invoice_date);
      switch (template.frequency) {
        case 'WEEKLY':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'BI_WEEKLY':
          nextDate.setDate(nextDate.getDate() + 14);
          break;
        case 'MONTHLY':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'QUARTERLY':
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case 'ANNUAL':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }

      // Update template
      await client.query(
        `UPDATE billing_templates
         SET next_invoice_date = $1,
             last_generated_date = CURRENT_DATE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [nextDate.toISOString().split('T')[0], template.id]
      );

      generated.push(invoice.rows[0]);
    }

    await client.query('COMMIT');
    res.json({ generated_count: generated.length, invoices: generated });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Generate invoices error:', error);
    res.status(500).json({ error: 'Failed to generate invoices' });
  } finally {
    client.release();
  }
});

// DELETE /api/billing/templates/:id
// Delete a billing template
router.delete('/templates/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM billing_templates WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

module.exports = router;
