const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require admin
router.use(requireAuth, requireAdmin);

// Get all pay periods
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pp.*,
             u.first_name as closed_by_first_name,
             u.last_name as closed_by_last_name
      FROM pay_periods pp
      LEFT JOIN users u ON pp.closed_by = u.id
      ORDER BY pp.start_date ASC, pp.end_date ASC
    `);

    res.json({ payPeriods: result.rows });
  } catch (error) {
    console.error('Get pay periods error:', error);
    res.status(500).json({ error: 'Failed to fetch pay periods' });
  }
});

// Create pay period
router.post('/', async (req, res) => {
  try {
    const { name, startDate, endDate, frequency } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: 'Name, start date, and end date required' });
    }

    // Check for overlapping periods
    const overlap = await pool.query(
      `SELECT id FROM pay_periods
       WHERE (start_date <= $2 AND end_date >= $1)
          OR (start_date <= $1 AND end_date >= $2)`,
      [startDate, endDate]
    );

    if (overlap.rows.length > 0) {
      return res.status(400).json({ error: 'Pay period overlaps with existing period' });
    }

    const result = await pool.query(
      `INSERT INTO pay_periods (name, start_date, end_date, frequency)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, startDate, endDate, frequency || null]
    );

    res.json({ payPeriod: result.rows[0] });
  } catch (error) {
    console.error('Create pay period error:', error);
    res.status(500).json({ error: 'Failed to create pay period' });
  }
});

// Auto-generate pay periods for next 6 months
router.post('/generate', async (req, res) => {
  try {
    const { frequency, startDate } = req.body;

    if (!frequency || !startDate) {
      return res.status(400).json({ error: 'Frequency and start date required' });
    }

    if (!['BI_WEEKLY', 'MONTHLY', 'SEMI_MONTHLY'].includes(frequency)) {
      return res.status(400).json({ error: 'Invalid frequency' });
    }

    const periods = [];
    let currentStart = new Date(startDate);
    const endLimit = new Date(currentStart);
    endLimit.setMonth(endLimit.getMonth() + 6);

    while (currentStart < endLimit) {
      let currentEnd = new Date(currentStart);
      let periodName = '';

      switch (frequency) {
        case 'BI_WEEKLY':
          currentEnd.setDate(currentEnd.getDate() + 13); // 14 days total (start + 13)
          periodName = `${currentStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${currentEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
          break;

        case 'MONTHLY':
          currentEnd = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0); // Last day of month
          periodName = currentStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          break;

        case 'SEMI_MONTHLY':
          if (currentStart.getDate() === 1) {
            currentEnd = new Date(currentStart.getFullYear(), currentStart.getMonth(), 15);
            periodName = `${currentStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (1st Half)`;
          } else {
            currentEnd = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0);
            periodName = `${currentStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (2nd Half)`;
          }
          break;
      }

      // Check for overlap before inserting
      const overlap = await pool.query(
        `SELECT id FROM pay_periods
         WHERE (start_date <= $2 AND end_date >= $1)
            OR (start_date <= $1 AND end_date >= $2)`,
        [currentStart.toISOString().split('T')[0], currentEnd.toISOString().split('T')[0]]
      );

      if (overlap.rows.length === 0) {
        const result = await pool.query(
          `INSERT INTO pay_periods (name, start_date, end_date, frequency)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [periodName, currentStart.toISOString().split('T')[0], currentEnd.toISOString().split('T')[0], frequency]
        );
        periods.push(result.rows[0]);
      }

      // Move to next period
      switch (frequency) {
        case 'BI_WEEKLY':
          currentStart.setDate(currentStart.getDate() + 14);
          break;
        case 'MONTHLY':
          currentStart = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 1);
          break;
        case 'SEMI_MONTHLY':
          if (currentStart.getDate() === 1) {
            currentStart.setDate(16);
          } else {
            currentStart = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 1);
          }
          break;
      }
    }

    res.json({
      message: `Generated ${periods.length} pay periods`,
      periods
    });
  } catch (error) {
    console.error('Generate pay periods error:', error);
    res.status(500).json({ error: 'Failed to generate pay periods' });
  }
});

// Get preview for period closing
router.get('/:id/close-preview', async (req, res) => {
  try {
    const { id } = req.params;

    const periodResult = await pool.query(
      'SELECT * FROM pay_periods WHERE id = $1',
      [id]
    );

    if (periodResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pay period not found' });
    }

    const period = periodResult.rows[0];

    // Get matching employees based on frequency
    let frequencyFilter = '';
    if (period.frequency) {
      frequencyFilter = `AND u.pay_frequency = '${period.frequency}'`;
    }

    // Get hourly employees with time entries
    const hourlyResult = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.hourly_rate,
              COALESCE(SUM(te.total_hours), 0) as total_hours
       FROM users u
       LEFT JOIN time_entries te ON u.id = te.user_id
         AND te.entry_date >= $1 AND te.entry_date <= $2
         AND te.status = 'APPROVED'
       WHERE u.is_active = true
         AND u.payment_type = 'HOURLY'
         ${frequencyFilter}
       GROUP BY u.id, u.first_name, u.last_name, u.hourly_rate`,
      [period.start_date, period.end_date]
    );

    // Get salaried employees
    const salariedResult = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.salary_amount
       FROM users u
       WHERE u.is_active = true
         AND u.payment_type = 'SALARY'
         ${frequencyFilter}`,
      []
    );

    const preview = {
      period: period,
      hourly_employees: hourlyResult.rows.map(emp => ({
        ...emp,
        gross_amount: parseFloat(emp.total_hours) * parseFloat(emp.hourly_rate || 0)
      })),
      salaried_employees: salariedResult.rows.map(emp => ({
        ...emp,
        gross_amount: parseFloat(emp.salary_amount || 0)
      })),
      total_count: hourlyResult.rows.length + salariedResult.rows.length
    };

    res.json(preview);
  } catch (error) {
    console.error('Close preview error:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// Close pay period
router.post('/:id/close', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Get pay period
    const periodResult = await client.query(
      'SELECT * FROM pay_periods WHERE id = $1',
      [id]
    );

    if (periodResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pay period not found' });
    }

    const period = periodResult.rows[0];

    if (period.status === 'CLOSED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Pay period already closed' });
    }

    // Get matching employees based on frequency
    let frequencyFilter = '';
    if (period.frequency) {
      frequencyFilter = `AND pay_frequency = '${period.frequency}'`;
    }

    // Process hourly employees
    const hourlyEntries = await client.query(
      `SELECT u.id as user_id, u.hourly_rate, COALESCE(SUM(te.total_hours), 0) as total_hours
       FROM users u
       LEFT JOIN time_entries te ON u.id = te.user_id
         AND te.entry_date >= $1 AND te.entry_date <= $2
         AND te.status = 'APPROVED'
       WHERE u.is_active = true
         AND u.payment_type = 'HOURLY'
         ${frequencyFilter}
       GROUP BY u.id, u.hourly_rate`,
      [period.start_date, period.end_date]
    );

    for (const entry of hourlyEntries.rows) {
      const hourlyRate = parseFloat(entry.hourly_rate || 0);
      const totalHours = parseFloat(entry.total_hours);
      const grossAmount = totalHours * hourlyRate;
      const deductions = 0;
      const netAmount = grossAmount - deductions;

      await client.query(
        `INSERT INTO payouts
         (pay_period_id, user_id, total_hours, hourly_rate, gross_amount, deductions, net_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, entry.user_id, totalHours, hourlyRate, grossAmount, deductions, netAmount]
      );
    }

    // Process salaried employees
    const salariedEmployees = await client.query(
      `SELECT id as user_id, salary_amount
       FROM users
       WHERE is_active = true
         AND payment_type = 'SALARY'
         ${frequencyFilter}`,
      []
    );

    for (const emp of salariedEmployees.rows) {
      const grossAmount = parseFloat(emp.salary_amount || 0);
      const deductions = 0;
      const netAmount = grossAmount - deductions;

      await client.query(
        `INSERT INTO payouts
         (pay_period_id, user_id, total_hours, hourly_rate, gross_amount, deductions, net_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, emp.user_id, 0, 0, grossAmount, deductions, netAmount]
      );
    }

    // Close the pay period
    await client.query(
      `UPDATE pay_periods
       SET status = 'CLOSED', closed_at = CURRENT_TIMESTAMP, closed_by = $1
       WHERE id = $2`,
      [req.user.id, id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Pay period closed successfully',
      payouts_created: hourlyEntries.rows.length + salariedEmployees.rows.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Close pay period error:', error);
    res.status(500).json({ error: 'Failed to close pay period' });
  } finally {
    client.release();
  }
});

// Get payouts for a pay period
router.get('/:id/payouts', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.*, u.first_name, u.last_name, u.email
       FROM payouts p
       JOIN users u ON p.user_id = u.id
       WHERE p.pay_period_id = $1
       ORDER BY u.last_name, u.first_name`,
      [id]
    );

    res.json({ payouts: result.rows });
  } catch (error) {
    console.error('Get payouts error:', error);
    res.status(500).json({ error: 'Failed to fetch payouts' });
  }
});

module.exports = router;
