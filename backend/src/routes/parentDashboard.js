const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication (middleware will attach req.parent for PARENT users)
router.use(requireAuth);

// Get parent dashboard summary
router.get('/dashboard', async (req, res) => {
  try {
    const parentId = req.parent.id;

    // Get children count
    const childrenResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM parent_children
       WHERE parent_id = $1`,
      [parentId]
    );

    // Get outstanding balance
    const balanceResult = await pool.query(
      `SELECT COALESCE(SUM(balance_due), 0) as outstanding_balance
       FROM parent_invoices
       WHERE parent_id = $1
       AND status IN ('SENT', 'PARTIAL', 'OVERDUE')`,
      [parentId]
    );

    // Get upcoming invoices (due in next 30 days)
    const upcomingResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM parent_invoices
       WHERE parent_id = $1
       AND status IN ('SENT', 'PARTIAL')
       AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`,
      [parentId]
    );

    // Get recent invoices (last 5)
    const recentInvoicesResult = await pool.query(
      `SELECT pi.*,
              c.first_name as child_first_name,
              c.last_name as child_last_name
       FROM parent_invoices pi
       LEFT JOIN children c ON pi.child_id = c.id
       WHERE pi.parent_id = $1
       ORDER BY pi.invoice_date DESC
       LIMIT 5`,
      [parentId]
    );

    // Get unread messages count
    const unreadMessagesResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM messages
       WHERE to_parent_id = $1
       AND parent_read = false`,
      [parentId]
    );

    res.json({
      children_count: parseInt(childrenResult.rows[0].count),
      outstanding_balance: parseFloat(balanceResult.rows[0].outstanding_balance),
      upcoming_invoices_count: parseInt(upcomingResult.rows[0].count),
      recent_invoices: recentInvoicesResult.rows,
      unread_messages_count: parseInt(unreadMessagesResult.rows[0].count)
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get parent's children
router.get('/children', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,
              pc.relationship,
              pc.is_primary_contact,
              pc.can_pickup,
              pc.has_billing_responsibility
       FROM children c
       JOIN parent_children pc ON c.id = pc.child_id
       WHERE pc.parent_id = $1
       ORDER BY c.last_name, c.first_name`,
      [req.parent.id]
    );

    res.json({ children: result.rows });
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

// Get single child details
router.get('/children/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify parent has access to this child
    const accessCheck = await pool.query(
      'SELECT 1 FROM parent_children WHERE parent_id = $1 AND child_id = $2',
      [req.parent.id, id]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Get child details
    const result = await pool.query(
      `SELECT c.*,
              pc.relationship,
              pc.is_primary_contact,
              pc.can_pickup,
              pc.has_billing_responsibility
       FROM children c
       JOIN parent_children pc ON c.id = pc.child_id
       WHERE c.id = $1 AND pc.parent_id = $2`,
      [id, req.parent.id]
    );

    res.json({ child: result.rows[0] });
  } catch (error) {
    console.error('Get child error:', error);
    res.status(500).json({ error: 'Failed to fetch child' });
  }
});

module.exports = router;
