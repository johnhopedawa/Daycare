const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  DEFAULT_VACATION_ACCRUAL_RATE,
  getVacationAccrualHours,
  isVacationAccrualEnabled,
  normalizeAccrualRate,
} = require('../utils/leaveAccrual');

const router = express.Router();

// All routes require admin
router.use(requireAuth, requireAdmin);

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundCurrency = (value) => Math.round((safeNumber(value) + Number.EPSILON) * 100) / 100;

const PAYSTUB_COMPONENTS = [
  { name: 'regular', hoursKey: 'regular_hours', rateKey: 'regular_rate', currentKey: 'regular_pay_current' },
  { name: 'sick', hoursKey: 'sick_hours', rateKey: 'sick_rate', currentKey: 'sick_pay_current' },
  { name: 'vacation', hoursKey: 'vacation_hours', rateKey: 'vacation_rate', currentKey: 'vacation_pay_current' },
  { name: 'stat', hoursKey: 'stat_hours', rateKey: 'stat_rate', currentKey: 'stat_pay_current' },
  { name: 'bonus', hoursKey: 'bonus_hours', rateKey: 'bonus_rate', currentKey: 'bonus_pay_current' },
  { name: 'retro', hoursKey: 'retro_hours', rateKey: 'retro_rate', currentKey: 'retro_payment_current' },
];

const isFullTimeEmployment = (employmentType) => (
  String(employmentType || '').toUpperCase() === 'FULL_TIME'
);

const isPartTimeEmployment = (employmentType) => (
  String(employmentType || '').toUpperCase() === 'PART_TIME'
);

const getDefaultPaystubRate = ({ lineItem, baseHourlyRate, employmentType }) => {
  const normalizedRate = roundCurrency(baseHourlyRate);

  switch (lineItem) {
    case 'regular':
    case 'sick':
    case 'vacation':
      return normalizedRate;
    default:
      return 0;
  }
};

const getVacationAccrualBreakdown = ({
  paymentType,
  hourlyRate,
  employmentType,
  vacationAccrualEnabled,
  vacationAccrualRate,
  workedHours,
  payoutVacationAccrual,
}) => {
  const normalizedPaymentType = paymentType === 'SALARY' ? 'SALARY' : 'HOURLY';
  const normalizedHourlyRate = roundCurrency(hourlyRate);
  const accrualEnabled = isVacationAccrualEnabled({
    vacation_accrual_enabled: vacationAccrualEnabled,
  });
  const accrualRate = normalizeAccrualRate(
    vacationAccrualRate,
    DEFAULT_VACATION_ACCRUAL_RATE
  );
  const accruedHours = accrualEnabled
    ? getVacationAccrualHours({ workedHours, accrualRate })
    : 0;
  const payoutAutomatically = accrualEnabled && isPartTimeEmployment(employmentType);
  const payoutAllowed = normalizedPaymentType === 'HOURLY' && (
    payoutAutomatically || (isFullTimeEmployment(employmentType) && Boolean(payoutVacationAccrual))
  );
  const payoutHours = payoutAllowed ? accruedHours : 0;
  const payoutRate = payoutHours > 0 ? normalizedHourlyRate : normalizedHourlyRate;
  const payoutCurrent = roundCurrency(payoutHours * payoutRate);

  return {
    accrualEnabled,
    accrualRate,
    accruedHours,
    payoutAutomatically,
    payoutAllowed,
    payoutHours,
    payoutRate,
    payoutCurrent,
  };
};

const getDefaultBreakdown = ({
  paymentType,
  hourlyRate,
  salaryAmount,
  totalHours,
  grossAmount,
  employmentType,
  vacationHours = null,
  vacationRate = null,
  vacationCurrent = null,
}) => {
  const baseHourlyRate = roundCurrency(hourlyRate);
  const resolvedVacationHours = roundCurrency(
    safeNumber(vacationHours, 0)
  );
  const resolvedVacationRate = roundCurrency(
    safeNumber(vacationRate, getDefaultPaystubRate({ lineItem: 'vacation', baseHourlyRate, employmentType }))
  );
  const resolvedVacationCurrent = roundCurrency(
    safeNumber(vacationCurrent, resolvedVacationHours * resolvedVacationRate)
  );

  return {
    regular_hours: roundCurrency(totalHours),
    regular_rate: getDefaultPaystubRate({ lineItem: 'regular', baseHourlyRate, employmentType }),
    regular_pay_current: roundCurrency(
      paymentType === 'SALARY'
        ? safeNumber(salaryAmount, grossAmount)
        : safeNumber(totalHours) * getDefaultPaystubRate({ lineItem: 'regular', baseHourlyRate, employmentType })
    ),
    sick_hours: 0,
    sick_rate: getDefaultPaystubRate({ lineItem: 'sick', baseHourlyRate, employmentType }),
    sick_pay_current: 0,
    vacation_hours: resolvedVacationHours,
    vacation_rate: resolvedVacationRate,
    vacation_pay_current: resolvedVacationCurrent,
    stat_hours: 0,
    stat_rate: 0,
    stat_pay_current: 0,
    bonus_hours: 0,
    bonus_rate: 0,
    bonus_pay_current: 0,
    retro_hours: 0,
    retro_rate: 0,
    retro_payment_current: 0,
  };
};

const getBreakdownFromRecord = (record, options = {}) => {
  const defaults = getDefaultBreakdown({
    paymentType: record.payment_type,
    hourlyRate: safeNumber(
      options.defaultHourlyRate,
      record.regular_rate ?? record.hourly_rate ?? record.profile_hourly_rate
    ),
    salaryAmount: safeNumber(options.salaryAmount, record.profile_salary_amount),
    totalHours: safeNumber(record.total_hours),
    grossAmount: safeNumber(record.gross_amount),
    employmentType: options.employmentType ?? record.employment_type,
  });

  return PAYSTUB_COMPONENTS.reduce((accumulator, component) => {
    accumulator[component.hoursKey] = roundCurrency(
      safeNumber(record[component.hoursKey], defaults[component.hoursKey])
    );
    accumulator[component.rateKey] = roundCurrency(
      safeNumber(record[component.rateKey], defaults[component.rateKey])
    );
    accumulator[component.currentKey] = roundCurrency(
      safeNumber(record[component.currentKey], defaults[component.currentKey])
    );
    return accumulator;
  }, {});
};

const calculatePayoutFromBreakdown = ({
  paymentType,
  salaryAmount,
  deductions,
  breakdown,
  defaultRegularRate,
}) => {
  const normalizedPaymentType = paymentType === 'SALARY' ? 'SALARY' : 'HOURLY';
  const normalizedDeductions = roundCurrency(deductions);
  const storedBreakdown = {};
  let totalHours = 0;
  let grossAmount = 0;

  PAYSTUB_COMPONENTS.forEach((component) => {
    const hours = roundCurrency(safeNumber(breakdown[component.hoursKey], 0));
    const rateFallback = component.name === 'regular' ? safeNumber(defaultRegularRate) : 0;
    const rate = roundCurrency(safeNumber(breakdown[component.rateKey], rateFallback));
    let current = roundCurrency(hours * rate);

    if (normalizedPaymentType === 'SALARY' && component.name === 'regular' && current === 0) {
      current = roundCurrency(safeNumber(breakdown[component.currentKey], salaryAmount));
    }

    storedBreakdown[component.hoursKey] = hours;
    storedBreakdown[component.rateKey] = rate;
    storedBreakdown[component.currentKey] = current;
    totalHours += hours;
    grossAmount += current;
  });

  if (normalizedPaymentType === 'SALARY' && grossAmount === 0) {
    storedBreakdown.regular_pay_current = roundCurrency(salaryAmount);
    grossAmount = storedBreakdown.regular_pay_current;
  }

  const roundedGross = roundCurrency(grossAmount);
  const roundedHours = roundCurrency(totalHours);
  return {
    paymentType: normalizedPaymentType,
    totalHours: roundedHours,
    hourlyRate: roundCurrency(storedBreakdown.regular_rate),
    grossAmount: roundedGross,
    deductions: normalizedDeductions,
    netAmount: roundCurrency(roundedGross - normalizedDeductions),
    breakdown: storedBreakdown,
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
    `SELECT id, first_name, last_name, email, payment_type, pay_frequency, hourly_rate, salary_amount, employment_type,
            vacation_accrual_enabled, vacation_accrual_rate
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
      email: educator.email,
      payment_type: educator.payment_type === 'SALARY' ? 'SALARY' : 'HOURLY',
      pay_frequency: educator.pay_frequency,
      hourly_rate: safeNumber(educator.hourly_rate),
      salary_amount: safeNumber(educator.salary_amount),
      employment_type: educator.employment_type,
      vacation_accrual_enabled: Boolean(educator.vacation_accrual_enabled),
      vacation_accrual_rate: normalizeAccrualRate(
        educator.vacation_accrual_rate,
        DEFAULT_VACATION_ACCRUAL_RATE
      ),
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

const buildPeriodCompensationPreview = (educators, scheduleTotals, overridesByUserId = new Map()) => {
  const scheduleTotalsByUser = new Map(
    scheduleTotals.map((row) => [row.user_id, row])
  );

  const hourlyEmployees = [];
  const salariedEmployees = [];

  educators.forEach((educator) => {
    const override = overridesByUserId.get(educator.id) || null;
    const workedHours = roundCurrency(safeNumber(scheduleTotalsByUser.get(educator.id)?.total_hours));
    const vacationAccrual = getVacationAccrualBreakdown({
      paymentType: educator.payment_type,
      hourlyRate: educator.hourly_rate,
      employmentType: educator.employment_type,
      vacationAccrualEnabled: educator.vacation_accrual_enabled,
      vacationAccrualRate: educator.vacation_accrual_rate,
      workedHours,
      payoutVacationAccrual: Boolean(override?.payoutVacationAccrual),
    });

    if (educator.payment_type === 'SALARY') {
      const defaultBreakdown = getDefaultBreakdown({
        paymentType: educator.payment_type,
        hourlyRate: educator.hourly_rate,
        salaryAmount: educator.salary_amount,
        totalHours: 0,
        grossAmount: educator.salary_amount,
        employmentType: educator.employment_type,
      });
      const payoutBreakdown = {
        ...defaultBreakdown,
        ...(override?.breakdown || {}),
      };
      const recalculated = calculatePayoutFromBreakdown({
        paymentType: educator.payment_type,
        salaryAmount: educator.salary_amount,
        deductions: 0,
        breakdown: payoutBreakdown,
        defaultRegularRate: educator.hourly_rate,
      });

      salariedEmployees.push({
        id: educator.id,
        first_name: educator.first_name,
        last_name: educator.last_name,
        email: educator.email,
        payment_type: educator.payment_type,
        employment_type: educator.employment_type,
        profile_hourly_rate: educator.hourly_rate,
        profile_salary_amount: educator.salary_amount,
        vacation_accrual_enabled: educator.vacation_accrual_enabled,
        vacation_accrual_rate: educator.vacation_accrual_rate,
        accrued_vacation_hours: vacationAccrual.accruedHours,
        vacation_payout_available_hours: isFullTimeEmployment(educator.employment_type)
          ? vacationAccrual.accruedHours
          : 0,
        vacation_payout_auto: vacationAccrual.payoutAutomatically,
        payoutVacationAccrual: Boolean(override?.payoutVacationAccrual),
        salary_amount: educator.salary_amount,
        total_hours: recalculated.totalHours,
        hourly_rate: recalculated.hourlyRate,
        gross_amount: recalculated.grossAmount,
        deductions: recalculated.deductions,
        net_amount: recalculated.netAmount,
        ...recalculated.breakdown,
      });
      return;
    }

    const scheduleSummary = scheduleTotalsByUser.get(educator.id);
    const totalHours = roundCurrency(scheduleSummary?.total_hours || 0);
    const regularGrossAmount = roundCurrency(totalHours * educator.hourly_rate);
    const defaultBreakdown = getDefaultBreakdown({
      paymentType: educator.payment_type,
      hourlyRate: educator.hourly_rate,
      salaryAmount: 0,
      totalHours,
      grossAmount: regularGrossAmount,
      employmentType: educator.employment_type,
      vacationHours: vacationAccrual.payoutHours,
      vacationRate: vacationAccrual.payoutRate,
      vacationCurrent: vacationAccrual.payoutCurrent,
    });
    const payoutBreakdown = {
      ...defaultBreakdown,
      ...(override?.breakdown || {}),
    };

    if (vacationAccrual.accrualEnabled) {
      payoutBreakdown.vacation_hours = vacationAccrual.payoutHours;
      payoutBreakdown.vacation_rate = vacationAccrual.payoutRate;
      payoutBreakdown.vacation_pay_current = vacationAccrual.payoutCurrent;
    }

    const recalculated = calculatePayoutFromBreakdown({
      paymentType: educator.payment_type,
      salaryAmount: educator.salary_amount,
      deductions: 0,
      breakdown: payoutBreakdown,
      defaultRegularRate: educator.hourly_rate,
    });

    hourlyEmployees.push({
      id: educator.id,
      first_name: educator.first_name,
      last_name: educator.last_name,
      email: educator.email,
      payment_type: educator.payment_type,
      employment_type: educator.employment_type,
      profile_hourly_rate: educator.hourly_rate,
      profile_salary_amount: educator.salary_amount,
      vacation_accrual_enabled: educator.vacation_accrual_enabled,
      vacation_accrual_rate: educator.vacation_accrual_rate,
      accrued_vacation_hours: vacationAccrual.accruedHours,
      vacation_payout_available_hours: isFullTimeEmployment(educator.employment_type)
        ? vacationAccrual.accruedHours
          : 0,
      vacation_payout_auto: vacationAccrual.payoutAutomatically,
      payoutVacationAccrual: Boolean(override?.payoutVacationAccrual),
      hourly_rate: recalculated.hourlyRate,
      total_hours: recalculated.totalHours,
      scheduled_shifts: safeNumber(scheduleSummary?.scheduled_shifts),
      gross_amount: recalculated.grossAmount,
      deductions: recalculated.deductions,
      net_amount: recalculated.netAmount,
      ...recalculated.breakdown,
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
        `SELECT id, payment_type, pay_frequency, hourly_rate, salary_amount, employment_type,
                vacation_accrual_enabled, vacation_accrual_rate
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
      employment_type: educator.employment_type,
      vacation_accrual_enabled: Boolean(educator.vacation_accrual_enabled),
      vacation_accrual_rate: normalizeAccrualRate(
        educator.vacation_accrual_rate,
        DEFAULT_VACATION_ACCRUAL_RATE
      ),
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
          const vacationAccrual = getVacationAccrualBreakdown({
            paymentType: educator.payment_type,
            hourlyRate: educator.hourly_rate,
            employmentType: educator.employment_type,
            vacationAccrualEnabled: educator.vacation_accrual_enabled,
            vacationAccrualRate: educator.vacation_accrual_rate,
            workedHours: scheduledHours,
            payoutVacationAccrual: false,
          });
          totalAmount += vacationAccrual.payoutCurrent;
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
    const payoutOverrides = Array.isArray(req.body?.payoutOverrides) ? req.body.payoutOverrides : [];

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
    const educatorIds = new Set(educators.map((educator) => educator.id));
    const overridesByUserId = new Map();

    for (const override of payoutOverrides) {
      const userId = Number(override?.userId);
      if (!Number.isFinite(userId) || !educatorIds.has(userId)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid payout override target' });
      }

      const breakdown = {};
      let isValid = true;
      PAYSTUB_COMPONENTS.forEach((component) => {
        if (!isValid) {
          return;
        }

        const hoursValue = override?.breakdown?.[component.hoursKey];
        const rateValue = override?.breakdown?.[component.rateKey];
        if (hoursValue === undefined || rateValue === undefined) {
          isValid = false;
          return;
        }

        const parsedHours = Number(hoursValue);
        const parsedRate = Number(rateValue);
        if (!Number.isFinite(parsedHours) || parsedHours < 0 || !Number.isFinite(parsedRate) || parsedRate < 0) {
          isValid = false;
          return;
        }

        breakdown[component.hoursKey] = parsedHours;
        breakdown[component.rateKey] = parsedRate;
        breakdown[component.currentKey] = safeNumber(override?.breakdown?.[component.currentKey]);
      });

      if (!isValid) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Each pre-close paystub edit must include non-negative hours and rate values' });
      }

      overridesByUserId.set(userId, {
        breakdown,
        payoutVacationAccrual: Boolean(override?.payoutVacationAccrual),
      });
    }

    const scheduleTotals = await getScheduleTotalsForPeriod(
      client,
      req.user.id,
      period,
      educators.map((educator) => educator.id)
    );
    const { hourlyEmployees, salariedEmployees } = buildPeriodCompensationPreview(educators, scheduleTotals, overridesByUserId);

    for (const entry of hourlyEmployees) {
      await client.query(
        `INSERT INTO payouts
         (pay_period_id, user_id, total_hours, hourly_rate, gross_amount, deductions, net_amount,
         regular_hours, regular_rate, regular_pay_current,
         sick_hours, sick_rate, sick_pay_current,
         vacation_hours, vacation_rate, vacation_pay_current,
         stat_hours, stat_rate, stat_pay_current,
         bonus_hours, bonus_rate, bonus_pay_current,
         retro_hours, retro_rate, retro_payment_current)
         VALUES ($1, $2, $3, $4, $5, $6, $7,
                 $8, $9, $10,
                 $11, $12, $13,
                 $14, $15, $16,
                 $17, $18, $19,
                 $20, $21, $22,
                 $23, $24, $25)`,
        [
          id,
          entry.id,
          entry.total_hours,
          entry.hourly_rate,
          entry.gross_amount,
          entry.deductions,
          entry.net_amount,
          entry.regular_hours,
          entry.regular_rate,
          entry.regular_pay_current,
          entry.sick_hours,
          entry.sick_rate,
          entry.sick_pay_current,
          entry.vacation_hours,
          entry.vacation_rate,
          entry.vacation_pay_current,
          entry.stat_hours,
          entry.stat_rate,
          entry.stat_pay_current,
          entry.bonus_hours,
          entry.bonus_rate,
          entry.bonus_pay_current,
          entry.retro_hours,
          entry.retro_rate,
          entry.retro_payment_current,
        ]
      );
    }

    for (const emp of salariedEmployees) {
      await client.query(
        `INSERT INTO payouts
         (pay_period_id, user_id, total_hours, hourly_rate, gross_amount, deductions, net_amount,
         regular_hours, regular_rate, regular_pay_current,
         sick_hours, sick_rate, sick_pay_current,
         vacation_hours, vacation_rate, vacation_pay_current,
         stat_hours, stat_rate, stat_pay_current,
         bonus_hours, bonus_rate, bonus_pay_current,
         retro_hours, retro_rate, retro_payment_current)
         VALUES ($1, $2, $3, $4, $5, $6, $7,
                 $8, $9, $10,
                 $11, $12, $13,
                 $14, $15, $16,
                 $17, $18, $19,
                 $20, $21, $22,
                 $23, $24, $25)`,
        [
          id,
          emp.id,
          emp.total_hours,
          emp.hourly_rate,
          emp.gross_amount,
          emp.deductions,
          emp.net_amount,
          emp.regular_hours,
          emp.regular_rate,
          emp.regular_pay_current,
          emp.sick_hours,
          emp.sick_rate,
          emp.sick_pay_current,
          emp.vacation_hours,
          emp.vacation_rate,
          emp.vacation_pay_current,
          emp.stat_hours,
          emp.stat_rate,
          emp.stat_pay_current,
          emp.bonus_hours,
          emp.bonus_rate,
          emp.bonus_pay_current,
          emp.retro_hours,
          emp.retro_rate,
          emp.retro_payment_current,
        ]
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
              u.salary_amount AS profile_salary_amount, u.employment_type,
              u.vacation_accrual_enabled, u.vacation_accrual_rate
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
    const { totalHours, breakdown, payoutVacationAccrual } = req.body;

    const payoutResult = await client.query(
      `SELECT p.*, pp.status AS pay_period_status,
              u.first_name, u.last_name, u.email, u.payment_type,
              u.hourly_rate AS profile_hourly_rate,
              u.salary_amount AS profile_salary_amount,
              u.employment_type,
              u.vacation_accrual_enabled, u.vacation_accrual_rate
       FROM payouts p
       JOIN pay_periods pp ON pp.id = p.pay_period_id
       JOIN users u ON u.id = p.user_id
       WHERE p.id = $1
         AND u.created_by = $2
       FOR UPDATE`,
      [id, req.user.id]
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

    let normalizedBreakdown;
    if (breakdown && typeof breakdown === 'object') {
      normalizedBreakdown = {};
      let breakdownIsValid = true;

      PAYSTUB_COMPONENTS.forEach((component) => {
        if (!breakdownIsValid) {
          return;
        }

        const hoursValue = breakdown[component.hoursKey];
        const rateValue = breakdown[component.rateKey];

        if (hoursValue === undefined || rateValue === undefined) {
          breakdownIsValid = false;
          return;
        }

        const parsedHours = Number(hoursValue);
        const parsedRate = Number(rateValue);
        if (!Number.isFinite(parsedHours) || parsedHours < 0 || !Number.isFinite(parsedRate) || parsedRate < 0) {
          breakdownIsValid = false;
          return;
        }

        normalizedBreakdown[component.hoursKey] = parsedHours;
        normalizedBreakdown[component.rateKey] = parsedRate;
        normalizedBreakdown[component.currentKey] = safeNumber(breakdown[component.currentKey]);
      });

      if (!breakdownIsValid) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Each paystub line must include non-negative hours and rate values' });
      }
    } else {
      if (totalHours === undefined) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Paystub breakdown is required' });
      }

      const parsedHours = Number(totalHours);
      if (!Number.isFinite(parsedHours) || parsedHours < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Total hours must be a non-negative number' });
      }

      normalizedBreakdown = getDefaultBreakdown({
        paymentType: payout.payment_type,
        hourlyRate: safeNumber(payout.profile_hourly_rate, payout.hourly_rate),
        salaryAmount: safeNumber(payout.profile_salary_amount),
        totalHours: parsedHours,
        grossAmount: parsedHours * safeNumber(payout.profile_hourly_rate, payout.hourly_rate),
        employmentType: payout.employment_type,
      });
    }

    const payoutProfileBreakdown = {
      ...getBreakdownFromRecord(payout, {
        defaultHourlyRate: payout.profile_hourly_rate,
        salaryAmount: payout.profile_salary_amount,
        employmentType: payout.employment_type,
      }),
      ...normalizedBreakdown,
    };
    const vacationAccrual = getVacationAccrualBreakdown({
      paymentType: payout.payment_type,
      hourlyRate: safeNumber(payout.profile_hourly_rate, payout.hourly_rate),
      employmentType: payout.employment_type,
      vacationAccrualEnabled: payout.vacation_accrual_enabled,
      vacationAccrualRate: payout.vacation_accrual_rate,
      workedHours: safeNumber(payoutProfileBreakdown.regular_hours),
      payoutVacationAccrual,
    });

    if (vacationAccrual.accrualEnabled) {
      payoutProfileBreakdown.vacation_hours = vacationAccrual.payoutHours;
      payoutProfileBreakdown.vacation_rate = vacationAccrual.payoutRate;
      payoutProfileBreakdown.vacation_pay_current = vacationAccrual.payoutCurrent;
    }

    const recalculated = calculatePayoutFromBreakdown({
      paymentType: payout.payment_type,
      salaryAmount: payout.profile_salary_amount,
      deductions: payout.deductions,
      breakdown: payoutProfileBreakdown,
      defaultRegularRate: payout.profile_hourly_rate,
    });

    const updateResult = await client.query(
      `UPDATE payouts
       SET total_hours = $1,
           hourly_rate = $2,
           gross_amount = $3,
           deductions = $4,
           net_amount = $5,
           regular_hours = $6,
           regular_rate = $7,
           regular_pay_current = $8,
           sick_hours = $9,
           sick_rate = $10,
           sick_pay_current = $11,
           vacation_hours = $12,
           vacation_rate = $13,
           vacation_pay_current = $14,
           stat_hours = $15,
           stat_rate = $16,
           stat_pay_current = $17,
           bonus_hours = $18,
           bonus_rate = $19,
           bonus_pay_current = $20,
           retro_hours = $21,
           retro_rate = $22,
           retro_payment_current = $23
       WHERE id = $24
       RETURNING *`,
      [
        recalculated.totalHours,
        recalculated.hourlyRate,
        recalculated.grossAmount,
        recalculated.deductions,
        recalculated.netAmount,
        recalculated.breakdown.regular_hours,
        recalculated.breakdown.regular_rate,
        recalculated.breakdown.regular_pay_current,
        recalculated.breakdown.sick_hours,
        recalculated.breakdown.sick_rate,
        recalculated.breakdown.sick_pay_current,
        recalculated.breakdown.vacation_hours,
        recalculated.breakdown.vacation_rate,
        recalculated.breakdown.vacation_pay_current,
        recalculated.breakdown.stat_hours,
        recalculated.breakdown.stat_rate,
        recalculated.breakdown.stat_pay_current,
        recalculated.breakdown.bonus_hours,
        recalculated.breakdown.bonus_rate,
        recalculated.breakdown.bonus_pay_current,
        recalculated.breakdown.retro_hours,
        recalculated.breakdown.retro_rate,
        recalculated.breakdown.retro_payment_current,
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
        vacation_accrual_enabled: payout.vacation_accrual_enabled,
        vacation_accrual_rate: payout.vacation_accrual_rate,
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
