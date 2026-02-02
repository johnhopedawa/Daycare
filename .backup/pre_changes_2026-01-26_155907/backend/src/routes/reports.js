const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Financial Reports

// GET /api/reports/financial/revenue
// Revenue summary by date range
router.get('/financial/revenue', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'month' } = req.query;

    let dateFormat;
    switch (group_by) {
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'week':
        dateFormat = 'IYYY-IW';
        break;
      case 'month':
      default:
        dateFormat = 'YYYY-MM';
    }

    const result = await pool.query(
      `SELECT
        TO_CHAR(payment_date, $1) as period,
        COUNT(*) as payment_count,
        SUM(amount) as total_revenue,
        AVG(amount) as avg_payment
      FROM parent_payments
      WHERE payment_date >= COALESCE($2::date, '1900-01-01')
        AND payment_date <= COALESCE($3::date, '2100-12-31')
      GROUP BY period
      ORDER BY period DESC`,
      [dateFormat, start_date, end_date]
    );

    res.json({ revenue: result.rows });
  } catch (error) {
    console.error('Revenue report error:', error);
    res.status(500).json({ error: 'Failed to generate revenue report' });
  }
});

// GET /api/reports/financial/outstanding
// Outstanding balances by parent
router.get('/financial/outstanding', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        p.id,
        p.first_name || ' ' || p.last_name as parent_name,
        p.email,
        p.phone,
        COUNT(DISTINCT pi.id) as invoice_count,
        SUM(pi.balance_due) as total_outstanding,
        MIN(pi.due_date) as oldest_due_date,
        MAX(pi.due_date) as newest_due_date
      FROM parents p
      LEFT JOIN parent_invoices pi ON p.id = pi.parent_id
      WHERE pi.balance_due > 0 AND pi.status != 'PAID'
      GROUP BY p.id, p.first_name, p.last_name, p.email, p.phone
      ORDER BY total_outstanding DESC`
    );

    res.json({ outstanding: result.rows });
  } catch (error) {
    console.error('Outstanding balances report error:', error);
    res.status(500).json({ error: 'Failed to generate outstanding report' });
  }
});

// GET /api/reports/financial/aging
// Invoice aging report
router.get('/financial/aging', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        p.first_name || ' ' || p.last_name as parent_name,
        pi.invoice_number,
        pi.invoice_date,
        pi.due_date,
        pi.balance_due,
        CURRENT_DATE - pi.due_date as days_overdue,
        CASE
          WHEN CURRENT_DATE <= pi.due_date THEN 'Current'
          WHEN CURRENT_DATE - pi.due_date <= 30 THEN '1-30 days'
          WHEN CURRENT_DATE - pi.due_date <= 60 THEN '31-60 days'
          WHEN CURRENT_DATE - pi.due_date <= 90 THEN '61-90 days'
          ELSE '90+ days'
        END as aging_bucket
      FROM parent_invoices pi
      JOIN parents p ON pi.parent_id = p.id
      WHERE pi.balance_due > 0 AND pi.status != 'PAID'
      ORDER BY days_overdue DESC`
    );

    res.json({ aging: result.rows });
  } catch (error) {
    console.error('Aging report error:', error);
    res.status(500).json({ error: 'Failed to generate aging report' });
  }
});

// GET /api/reports/financial/payment-history
// Payment history by date range
router.get('/financial/payment-history', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const result = await pool.query(
      `SELECT
        pp.id,
        pp.payment_date,
        pp.amount,
        pp.payment_method,
        pp.transaction_reference,
        p.first_name || ' ' || p.last_name as parent_name,
        pi.invoice_number,
        u.first_name || ' ' || u.last_name as recorded_by
      FROM parent_payments pp
      JOIN parents p ON pp.parent_id = p.id
      LEFT JOIN parent_invoices pi ON pp.invoice_id = pi.id
      LEFT JOIN users u ON pp.recorded_by = u.id
      WHERE pp.payment_date >= COALESCE($1::date, '1900-01-01')
        AND pp.payment_date <= COALESCE($2::date, '2100-12-31')
      ORDER BY pp.payment_date DESC`,
      [start_date, end_date]
    );

    res.json({ payments: result.rows });
  } catch (error) {
    console.error('Payment history report error:', error);
    res.status(500).json({ error: 'Failed to generate payment history report' });
  }
});

// Enrollment Reports

// GET /api/reports/enrollment/summary
// Current enrollment summary
router.get('/enrollment/summary', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        status,
        COUNT(*) as count,
        AVG(monthly_rate) as avg_monthly_rate,
        SUM(monthly_rate) as total_monthly_revenue
      FROM children
      GROUP BY status
      ORDER BY status`
    );

    res.json({ summary: result.rows });
  } catch (error) {
    console.error('Enrollment summary error:', error);
    res.status(500).json({ error: 'Failed to generate enrollment summary' });
  }
});

// GET /api/reports/enrollment/trends
// Enrollment trends over time
router.get('/enrollment/trends', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        TO_CHAR(enrollment_start_date, 'YYYY-MM') as month,
        COUNT(*) as new_enrollments,
        status
      FROM children
      WHERE enrollment_start_date IS NOT NULL
      GROUP BY month, status
      ORDER BY month DESC
      LIMIT 12`
    );

    res.json({ trends: result.rows });
  } catch (error) {
    console.error('Enrollment trends error:', error);
    res.status(500).json({ error: 'Failed to generate enrollment trends' });
  }
});

// GET /api/reports/enrollment/waitlist
// Waitlist report
router.get('/enrollment/waitlist', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        c.id,
        c.first_name || ' ' || c.last_name as child_name,
        c.date_of_birth,
        c.waitlist_priority,
        c.created_at as waitlist_date,
        p.first_name || ' ' || p.last_name as parent_name,
        p.phone,
        p.email
      FROM children c
      LEFT JOIN parent_children pc ON c.id = pc.child_id
      LEFT JOIN parents p ON pc.parent_id = p.id
      WHERE c.status = 'WAITLIST'
      ORDER BY c.waitlist_priority ASC, c.created_at ASC`
    );

    res.json({ waitlist: result.rows });
  } catch (error) {
    console.error('Waitlist report error:', error);
    res.status(500).json({ error: 'Failed to generate waitlist report' });
  }
});

// Staffing Reports

// GET /api/reports/staffing/hours
// Hours worked by educator
router.get('/staffing/hours', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const result = await pool.query(
      `SELECT
        u.id as educator_id,
        u.first_name || ' ' || u.last_name as educator_name,
        u.hourly_rate,
        COUNT(*) as entry_count,
        SUM(te.total_hours) as total_hours,
        SUM(te.total_hours * u.hourly_rate) as total_cost,
        AVG(te.total_hours) as avg_hours_per_day
      FROM time_entries te
      JOIN users u ON te.user_id = u.id
      WHERE te.entry_date >= COALESCE($1::date, '1900-01-01')
        AND te.entry_date <= COALESCE($2::date, '2100-12-31')
        AND te.status = 'APPROVED'
      GROUP BY u.id, u.first_name, u.last_name, u.hourly_rate
      ORDER BY total_hours DESC`,
      [start_date, end_date]
    );

    res.json({ hours: result.rows });
  } catch (error) {
    console.error('Staffing hours report error:', error);
    res.status(500).json({ error: 'Failed to generate staffing hours report' });
  }
});

// GET /api/reports/staffing/payroll
// Payroll summary by pay period
router.get('/staffing/payroll', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { pay_period_id } = req.query;

    const result = await pool.query(
      `SELECT
        pp.id as pay_period_id,
        pp.start_date,
        pp.end_date,
        pp.status as period_status,
        COUNT(DISTINCT te.user_id) as educator_count,
        SUM(te.total_hours) as total_hours,
        SUM(te.total_hours * u.hourly_rate) as total_gross_pay
      FROM pay_periods pp
      LEFT JOIN time_entries te ON te.entry_date >= pp.start_date
        AND te.entry_date <= pp.end_date
        AND te.status = 'APPROVED'
      LEFT JOIN users u ON te.user_id = u.id
      WHERE pp.id = COALESCE($1::integer, pp.id)
      GROUP BY pp.id, pp.start_date, pp.end_date, pp.status
      ORDER BY pp.start_date DESC`,
      [pay_period_id]
    );

    res.json({ payroll: result.rows });
  } catch (error) {
    console.error('Payroll report error:', error);
    res.status(500).json({ error: 'Failed to generate payroll report' });
  }
});

// GET /api/reports/staffing/coverage
// Schedule coverage analysis
router.get('/staffing/coverage', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const result = await pool.query(
      `SELECT
        schedule_date,
        COUNT(*) as scheduled_educators,
        SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600) as total_scheduled_hours,
        COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) as confirmed_count,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count
      FROM schedules
      WHERE schedule_date >= COALESCE($1::date, CURRENT_DATE)
        AND schedule_date <= COALESCE($2::date, CURRENT_DATE + 30)
      GROUP BY schedule_date
      ORDER BY schedule_date ASC`,
      [start_date, end_date]
    );

    res.json({ coverage: result.rows });
  } catch (error) {
    console.error('Coverage report error:', error);
    res.status(500).json({ error: 'Failed to generate coverage report' });
  }
});

module.exports = router;
