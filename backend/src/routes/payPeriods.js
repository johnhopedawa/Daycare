const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require admin
router.use(requireAuth, requireAdmin);

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundCurrency = (value) => Math.round((safeNumber(value) + Number.EPSILON) * 100) / 100;

const calculatePayoutFromProfile = ({ paymentType, hourlyRate, salaryAmount, totalHours, deductions }) => {
  const normalizedPaymentType = paymentType === 'SALARY' ? 'SALARY' : 'HOURLY';
  const normalizedHours = safeNumber(totalHours, 0);
  const normalizedDeductions = roundCurrency(deductions);

  if (normalizedPaymentType === 'SALARY') {
    const grossAmount = roundCurrency(salaryAmount);
    return {
      paymentType: normalizedPaymentType,
      totalHours: normalizedHours,
      hourlyRate: 0,
      grossAmount,
      deductions: normalizedDeductions,
      netAmount: roundCurrency(grossAmount - normalizedDeductions),
    };
  }

  const normalizedHourlyRate = roundCurrency(hourlyRate);
  const grossAmount = roundCurrency(normalizedHours * normalizedHourlyRate);
  return {
    paymentType: normalizedPaymentType,
    totalHours: normalizedHours,
    hourlyRate: normalizedHourlyRate,
    grossAmount,
    deductions: normalizedDeductions,
    netAmount: roundCurrency(grossAmount - normalizedDeductions),
  };
};

const matchesPeriodFrequency = (period, educator) => {
  if (!period.frequency) {
    return true;
  }

  return educator.pay_frequency === period.frequency;
};

const getEligibleEducatorsForPeriod = async (db, adminId, period) => {
  const result = await db.query(
    `SELECT id, first_name, last_name, payment_type, pay_frequency, hourly_rate, salary_amount
     FROM users
     WHERE is_active = true
       AND role = 'EDUCATOR'
       AND created_by = $1`,
    [adminId]
  );

  return result.rows
    .filter((educator) => matchesPeriodFrequency(period, educator))
    .map((educator) => ({
      id: educator.id,
      first_name: educator.first_name,
      last_name: educator.last_name,
      payment_type: educator.payment_type === 'SALARY' ? 'SALARY' : 'HOURLY',
      pay_frequency: educator.pay_frequency,
      hourly_rate: safeNumber(educator.hourly_rate),
      salary_amount: safeNumber(educator.salary_amount),
    }));
};

const getScheduleTotalsForPeriod = async (db, adminId, period, educatorIds) => {
  if (!educatorIds.length) {
    return [];
  }

  const result = await db.query(
    `SELECT s.user_id,
            COALESCE(SUM(s.hours), 0) AS total_hours,
            COUNT(*)::int AS scheduled_shifts
     FROM schedules s
     JOIN users u ON u.id = s.user_id
     WHERE s.created_by = $1
       AND u.role = 'EDUCATOR'
       AND s.shift_date >= $2
       AND s.shift_date <= $3
       AND s.status <> 'DECLINED'
       AND s.user_id = ANY($4)
     GROUP BY s.user_id`,
    [adminId, period.start_date, period.end_date, educatorIds]
  );

  return result.rows.map((row) => ({
    user_id: row.user_id,
    total_hours: safeNumber(row.total_hours),
    scheduled_shifts: safeNumber(row.scheduled_shifts),
  }));
};

const buildPeriodCompensationPreview = (educators, scheduleTotals) => {
  const scheduleTotalsByUser = new Map(
    scheduleTotals.map((row) => [row.user_id, row])
  );

  const hourlyEmployees = [];
  const salariedEmployees = [];

  educators.forEach((educator) => {
    if (educator.payment_type === 'SALARY') {
      const grossAmount = roundCurrency(educator.salary_amount);
      salariedEmployees.push({
        id: educator.id,
        first_name: educator.first_name,
        last_name: educator.last_name,
        salary_amount: educator.salary_amount,
        gross_amount: grossAmount,
        deductions: 0,
        net_amount: grossAmount,
      });
      return;
    }

    const scheduleSummary = scheduleTotalsByUser.get(educator.id);
    const totalHours = roundCurrency(scheduleSummary?.total_hours || 0);
    const grossAmount = roundCurrency(totalHours * educator.hourly_rate);

    hourlyEmployees.push({
      id: educator.id,
      first_name: educator.first_name,
      last_name: educator.last_name,
      hourly_rate: educator.hourly_rate,
      total_hours: totalHours,
      scheduled_shifts: safeNumber(scheduleSummary?.scheduled_shifts),
      gross_amount: grossAmount,
      deductions: 0,
      net_amount: grossAmount,
    });
  });

  return { hourlyEmployees, salariedEmployees };
};

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

    if (result.rows.length === 0) {
      return res.json({ payPeriods: [] });
    }

    const periods = result.rows;
    const periodIds = periods.map((period) => period.id);
    const overallStart = periods[0].start_date;
    const overallEnd = periods[periods.length - 1].end_date;

    const [educatorsResult, schedulesResult, timeEntriesResult, payoutsResult] = await Promise.all([
      pool.query(
        `SELECT id, payment_type, pay_frequency, hourly_rate, salary_amount
         FROM users
         WHERE is_active = true
           AND role = 'EDUCATOR'
           AND created_by = $1`,
        [req.user.id]
      ),
      pool.query(
        `SELECT s.user_id, s.shift_date, s.hours, s.status
         FROM schedules s
         JOIN users u ON u.id = s.user_id
         WHERE s.created_by = $1
           AND u.role = 'EDUCATOR'
           AND s.shift_date >= $2
           AND s.shift_date <= $3
           AND s.status <> 'DECLINED'`,
        [req.user.id, overallStart, overallEnd]
      ),
      pool.query(
        `SELECT te.user_id, te.entry_date, te.total_hours
         FROM time_entries te
         JOIN users u ON u.id = te.user_id
         WHERE u.role = 'EDUCATOR'
           AND u.created_by = $1
           AND te.entry_date >= $2
           AND te.entry_date <= $3
           AND te.status = 'APPROVED'`,
        [req.user.id, overallStart, overallEnd]
      ),
      pool.query(
        `SELECT p.pay_period_id, p.user_id, p.total_hours, p.gross_amount, p.deductions, p.net_amount
         FROM payouts p
         JOIN users u ON u.id = p.user_id
         WHERE p.pay_period_id = ANY($1)
           AND u.role = 'EDUCATOR'
           AND u.created_by = $2`,
        [periodIds, req.user.id]
      ),
    ]);

    const educators = educatorsResult.rows.map((educator) => ({
      id: educator.id,
      payment_type: educator.payment_type,
      pay_frequency: educator.pay_frequency,
      hourly_rate: safeNumber(educator.hourly_rate),
      salary_amount: safeNumber(educator.salary_amount),
    }));

    const payPeriods = periods.map((period) => {
      const periodSchedules = schedulesResult.rows.filter((schedule) =>
        schedule.shift_date >= period.start_date && schedule.shift_date <= period.end_date
      );
      const periodEntries = timeEntriesResult.rows.filter((entry) =>
        entry.entry_date >= period.start_date && entry.entry_date <= period.end_date
      );
      const periodPayouts = payoutsResult.rows.filter((payout) => payout.pay_period_id === period.id);
      const eligibleEducators = educators.filter((educator) => matchesPeriodFrequency(period, educator));

      if (period.status === 'OPEN') {
        const scheduleTotalsByUser = new Map();
        let scheduledShifts = 0;

        periodSchedules.forEach((schedule) => {
          const educator = eligibleEducators.find((candidate) => candidate.id === schedule.user_id);
          if (!educator) {
            return;
          }

          scheduleTotalsByUser.set(
            schedule.user_id,
            safeNumber(scheduleTotalsByUser.get(schedule.user_id)) + safeNumber(schedule.hours)
          );
          scheduledShifts += 1;
        });

        let totalHours = 0;
        let totalAmount = 0;
        let employeeCount = 0;

        eligibleEducators.forEach((educator) => {
          if (educator.payment_type === 'SALARY') {
            employeeCount += 1;
            totalAmount += safeNumber(educator.salary_amount);
            return;
          }

          const scheduledHours = safeNumber(scheduleTotalsByUser.get(educator.id));
          if (scheduledHours <= 0) {
            return;
          }

          employeeCount += 1;
          totalHours += scheduledHours;
          totalAmount += scheduledHours * safeNumber(educator.hourly_rate);
        });

        return {
          ...period,
          total_amount: roundCurrency(totalAmount),
          employee_count: employeeCount,
          total_hours: roundCurrency(totalHours),
          approved_entries: periodEntries.length,
          scheduled_shifts: scheduledShifts,
        };
      }

      const closedEmployeeIds = new Set(periodPayouts.map((payout) => payout.user_id));
      const totalHours = periodPayouts.reduce((sum, payout) => sum + safeNumber(payout.total_hours), 0);
      const totalAmount = periodPayouts.reduce((sum, payout) => sum + safeNumber(payout.gross_amount), 0);

      return {
        ...period,
        total_amount: roundCurrency(totalAmount),
        employee_count: closedEmployeeIds.size,
        total_hours: roundCurrency(totalHours),
        approved_entries: periodEntries.length,
        scheduled_shifts: 0,
      };
    });

    res.json({ payPeriods });
  } catch (error) {
    console.error('Get pay periods error:', error);
    res.status(500).json({ error: 'Failed to fetch pay periods' });
  }
});

// Create pay period
router.post('/', async (req, res) => {
  try {
    const { name, startDate, endDate, payDate, frequency } = req.body;

    if (!name || !startDate || !endDate || !payDate) {
      return res.status(400).json({ error: 'Name, start date, end date, and pay date required' });
    }

    if (payDate < endDate) {
      return res.status(400).json({ error: 'Pay date cannot be earlier than the end date' });
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
      `INSERT INTO pay_periods (name, start_date, end_date, pay_date, frequency)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, startDate, endDate, payDate, frequency || null]
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
          `INSERT INTO pay_periods (name, start_date, end_date, pay_date, frequency)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            periodName,
            currentStart.toISOString().split('T')[0],
            currentEnd.toISOString().split('T')[0],
            currentEnd.toISOString().split('T')[0],
            frequency
          ]
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

// Delete pay period
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;

    const periodResult = await client.query(
      'SELECT * FROM pay_periods WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (periodResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pay period not found' });
    }

    await client.query(
      'DELETE FROM pay_periods WHERE id = $1',
      [id]
    );

    await client.query('COMMIT');

    res.json({ message: 'Pay period deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete pay period error:', error);
    res.status(500).json({ error: 'Failed to delete pay period' });
  } finally {
    client.release();
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
    const educators = await getEligibleEducatorsForPeriod(pool, req.user.id, period);
    const scheduleTotals = await getScheduleTotalsForPeriod(
      pool,
      req.user.id,
      period,
      educators.map((educator) => educator.id)
    );
    const { hourlyEmployees, salariedEmployees } = buildPeriodCompensationPreview(educators, scheduleTotals);

    const preview = {
      period: period,
      hourly_employees: hourlyEmployees,
      salaried_employees: salariedEmployees,
      total_count: hourlyEmployees.length + salariedEmployees.length
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

    const educators = await getEligibleEducatorsForPeriod(client, req.user.id, period);
    const scheduleTotals = await getScheduleTotalsForPeriod(
      client,
      req.user.id,
      period,
      educators.map((educator) => educator.id)
    );
    const { hourlyEmployees, salariedEmployees } = buildPeriodCompensationPreview(educators, scheduleTotals);

    for (const entry of hourlyEmployees) {
      const hourlyRate = roundCurrency(entry.hourly_rate);
      const totalHours = roundCurrency(entry.total_hours);
      const grossAmount = roundCurrency(entry.gross_amount);
      const deductions = 0;
      const netAmount = roundCurrency(entry.net_amount);

      await client.query(
        `INSERT INTO payouts
         (pay_period_id, user_id, total_hours, hourly_rate, gross_amount, deductions, net_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, entry.id, totalHours, hourlyRate, grossAmount, deductions, netAmount]
      );
    }

    for (const emp of salariedEmployees) {
      const grossAmount = roundCurrency(emp.gross_amount);
      const deductions = 0;
      const netAmount = roundCurrency(emp.net_amount);

      await client.query(
        `INSERT INTO payouts
         (pay_period_id, user_id, total_hours, hourly_rate, gross_amount, deductions, net_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, emp.id, 0, 0, grossAmount, deductions, netAmount]
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
      payouts_created: hourlyEmployees.length + salariedEmployees.length
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
      `SELECT p.*, u.first_name, u.last_name, u.email,
              u.payment_type, u.hourly_rate AS profile_hourly_rate,
              u.salary_amount AS profile_salary_amount, u.employment_type
             , ps.id AS paystub_id, ps.stub_number, ps.generated_at AS paystub_generated_at
       FROM payouts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN paystubs ps ON ps.payout_id = p.id
       WHERE p.pay_period_id = $1
         AND u.role = 'EDUCATOR'
         AND u.created_by = $2
       ORDER BY u.last_name, u.first_name`,
      [id, req.user.id]
    );

    res.json({ payouts: result.rows });
  } catch (error) {
    console.error('Get payouts error:', error);
    res.status(500).json({ error: 'Failed to fetch payouts' });
  }
});

// Update payout values for a closed pay period
router.patch('/payouts/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { totalHours } = req.body;

    if (totalHours === undefined) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Total hours is required' });
    }

    const parsedHours = Number(totalHours);
    if (!Number.isFinite(parsedHours) || parsedHours < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Total hours must be a non-negative number' });
    }

    const payoutResult = await client.query(
      `SELECT p.*, pp.status AS pay_period_status,
              u.first_name, u.last_name, u.email, u.payment_type,
              u.hourly_rate AS profile_hourly_rate,
              u.salary_amount AS profile_salary_amount,
              u.employment_type
       FROM payouts p
       JOIN pay_periods pp ON pp.id = p.pay_period_id
       JOIN users u ON u.id = p.user_id
       WHERE p.id = $1
       FOR UPDATE`,
      [id]
    );

    if (payoutResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payout not found' });
    }

    const payout = payoutResult.rows[0];

    if (payout.pay_period_status !== 'CLOSED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Only payouts from closed pay periods can be edited' });
    }

    const recalculated = calculatePayoutFromProfile({
      paymentType: payout.payment_type,
      hourlyRate: payout.profile_hourly_rate,
      salaryAmount: payout.profile_salary_amount,
      totalHours: parsedHours,
      deductions: payout.deductions,
    });

    const updateResult = await client.query(
      `UPDATE payouts
       SET total_hours = $1,
           hourly_rate = $2,
           gross_amount = $3,
           deductions = $4,
           net_amount = $5
       WHERE id = $6
       RETURNING *`,
      [
        recalculated.totalHours,
        recalculated.hourlyRate,
        recalculated.grossAmount,
        recalculated.deductions,
        recalculated.netAmount,
        id,
      ]
    );

    const paystubResult = await client.query(
      `SELECT id AS paystub_id, stub_number, generated_at AS paystub_generated_at
       FROM paystubs
       WHERE payout_id = $1
       LIMIT 1`,
      [id]
    );

    await client.query('COMMIT');

    res.json({
      payout: {
        ...updateResult.rows[0],
        first_name: payout.first_name,
        last_name: payout.last_name,
        email: payout.email,
        payment_type: payout.payment_type,
        profile_hourly_rate: payout.profile_hourly_rate,
        profile_salary_amount: payout.profile_salary_amount,
        employment_type: payout.employment_type,
        paystub_id: paystubResult.rows[0]?.paystub_id || null,
        stub_number: paystubResult.rows[0]?.stub_number || null,
        paystub_generated_at: paystubResult.rows[0]?.paystub_generated_at || null,
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update payout error:', error);
    res.status(500).json({ error: 'Failed to update payout' });
  } finally {
    client.release();
  }
});

module.exports = router;
