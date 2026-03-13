const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  DEFAULT_VACATION_ACCRUAL_RATE,
  applyVacationAccrualSnapshots,
  normalizeAccrualRate,
} = require('../utils/leaveAccrual');

const router = express.Router();
const EMPLOYMENT_TYPES = new Set(['FULL_TIME', 'PART_TIME']);
const PAYMENT_TYPES = new Set(['HOURLY', 'SALARY']);
const PAY_FREQUENCIES = new Set(['BI_WEEKLY', 'MONTHLY', 'SEMI_MONTHLY']);

const normalizeEmploymentType = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim().toUpperCase();
  return EMPLOYMENT_TYPES.has(normalized) ? normalized : null;
};

// All admin routes require authentication and admin role
router.use(requireAuth, requireAdmin);

// === TIME ENTRY MANAGEMENT ===

// Get all time entries (only from educators created by this admin)
router.get('/time-entries', async (req, res) => {
  try {
    const { status, from, to, user_id } = req.query;

    let query = `
      SELECT te.*, u.first_name, u.last_name, u.email
      FROM time_entries te
      JOIN users u ON te.user_id = u.id
      WHERE u.created_by = $1
    `;
    const params = [req.user.id];

    if (status) {
      params.push(status);
      query += ` AND te.status = $${params.length}`;
    }

    if (from) {
      params.push(from);
      query += ` AND te.entry_date >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      query += ` AND te.entry_date <= $${params.length}`;
    }

    if (user_id) {
      params.push(user_id);
      query += ` AND te.user_id = $${params.length}`;
    }

    query += ' ORDER BY te.entry_date DESC, te.id DESC';

    const result = await pool.query(query, params);
    res.json({ timeEntries: result.rows });
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

// Approve time entry
router.post('/time-entries/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE time_entries
       SET status = 'APPROVED',
           reviewed_by = $1,
           reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    res.json({ timeEntry: result.rows[0] });
  } catch (error) {
    console.error('Approve time entry error:', error);
    res.status(500).json({ error: 'Failed to approve time entry' });
  }
});

// Reject time entry
router.post('/time-entries/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(
      `UPDATE time_entries
       SET status = 'REJECTED',
           rejection_reason = $1,
           reviewed_by = $2,
           reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [reason || null, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    res.json({ timeEntry: result.rows[0] });
  } catch (error) {
    console.error('Reject time entry error:', error);
    res.status(500).json({ error: 'Failed to reject time entry' });
  }
});

// Batch approve
router.post('/time-entries/batch-approve', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' });
    }

    const result = await pool.query(
      `UPDATE time_entries
       SET status = 'APPROVED',
           reviewed_by = $1,
           reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($2)
       RETURNING *`,
      [req.user.id, ids]
    );

    res.json({ timeEntries: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Batch approve error:', error);
    res.status(500).json({ error: 'Failed to batch approve' });
  }
});

// === USER MANAGEMENT ===

// Get all users (only educators created by this admin)
router.get('/users', async (req, res) => {
  try {
    const { role } = req.query;

    let query = `SELECT id, email, first_name, last_name, role, hourly_rate, is_active,
                 payment_type, pay_frequency, salary_amount, date_of_birth,
                 address_line1, address_line2, city, province, postal_code,
                 annual_sick_days, annual_vacation_days, sick_days_remaining, vacation_days_remaining,
                 carryover_enabled, date_employed, employment_type,
                 vacation_accrual_enabled, vacation_accrual_rate,
                 sin, ytd_gross, ytd_cpp, ytd_ei, ytd_tax, ytd_hours,
                 created_at FROM users WHERE created_by = $1`;
    const params = [req.user.id];

    if (role) {
      params.push(role);
      query += ` AND role = $${params.length}`;
    }

    query += ' ORDER BY last_name, first_name';

    const result = await pool.query(query, params);
    const users = await applyVacationAccrualSnapshots(pool, result.rows);
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user (educator)
router.post('/users', async (req, res) => {
  try {
    const {
      email, password, firstName, lastName, hourlyRate,
      paymentType, payFrequency, salaryAmount, dateOfBirth,
      addressLine1, addressLine2, city, province, postalCode,
      annualSickDays, annualVacationDays, carryoverEnabled,
      dateEmployed, employmentType, vacationAccrualEnabled, vacationAccrualRate,
      sin, ytdGross, ytdCpp, ytdEi, ytdTax, ytdHours
    } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Parse numeric values
    const sickDays = parseFloat(annualSickDays) || 0;
    const vacationDays = parseFloat(annualVacationDays) || 0;
    const normalizedEmploymentType = normalizeEmploymentType(employmentType);
    const normalizedPaymentType = PAYMENT_TYPES.has(paymentType) ? paymentType : 'HOURLY';
    const normalizedPayFrequency = PAY_FREQUENCIES.has(payFrequency) ? payFrequency : 'BI_WEEKLY';
    const normalizedVacationAccrualEnabled = Boolean(vacationAccrualEnabled);
    const normalizedVacationAccrualRate = normalizeAccrualRate(
      vacationAccrualRate,
      DEFAULT_VACATION_ACCRUAL_RATE
    );
    const parsedHourlyRate = normalizedPaymentType === 'HOURLY'
      ? (parseFloat(hourlyRate) || 0)
      : null;
    const parsedSalaryAmount = normalizedPaymentType === 'SALARY'
      ? (parseFloat(salaryAmount) || 0)
      : null;

    if (employmentType !== undefined && normalizedEmploymentType === null) {
      return res.status(400).json({ error: 'Employment type must be FULL_TIME or PART_TIME' });
    }

    // Create educator
    const result = await pool.query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name, role, hourly_rate, payment_type, pay_frequency, salary_amount, date_of_birth, created_by,
        address_line1, address_line2, city, province, postal_code,
        annual_sick_days, annual_vacation_days, sick_days_remaining, vacation_days_remaining,
        carryover_enabled, date_employed, employment_type,
        vacation_accrual_enabled, vacation_accrual_rate,
        sin, ytd_gross, ytd_cpp, ytd_ei, ytd_tax, ytd_hours
       )
       VALUES ($1, $2, $3, $4, 'EDUCATOR', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
       RETURNING id, email, first_name, last_name, role, hourly_rate, is_active,
                 payment_type, pay_frequency, salary_amount, date_of_birth,
                 address_line1, address_line2, city, province, postal_code,
                 annual_sick_days, annual_vacation_days, sick_days_remaining, vacation_days_remaining,
                 carryover_enabled, date_employed, employment_type,
                 vacation_accrual_enabled, vacation_accrual_rate,
                 sin, ytd_gross, ytd_cpp, ytd_ei, ytd_tax, ytd_hours`,
      [
        email, passwordHash, firstName, lastName, parsedHourlyRate,
        normalizedPaymentType, normalizedPayFrequency, parsedSalaryAmount, dateOfBirth || null, req.user.id,
        addressLine1 || null,
        addressLine2 || null,
        city || null,
        province || null,
        postalCode || null,
        sickDays, vacationDays, sickDays, vacationDays, // Set remaining equal to annual initially
        carryoverEnabled || false,
        dateEmployed || null,
        normalizedEmploymentType,
        normalizedVacationAccrualEnabled,
        normalizedVacationAccrualRate,
        sin || null,
        parseFloat(ytdGross) || 0,
        parseFloat(ytdCpp) || 0,
        parseFloat(ytdEi) || 0,
        parseFloat(ytdTax) || 0,
        parseFloat(ytdHours) || 0
      ]
    );

    const user = await applyVacationAccrualSnapshots(pool, result.rows[0]);
    res.json({ user });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName, lastName, hourlyRate, isActive,
      paymentType, payFrequency, salaryAmount, dateOfBirth,
      addressLine1, addressLine2, city, province, postalCode,
      annualSickDays, annualVacationDays, sickDaysRemaining, vacationDaysRemaining,
      carryoverEnabled, dateEmployed, employmentType,
      vacationAccrualEnabled, vacationAccrualRate,
      sin, ytdGross, ytdCpp, ytdEi, ytdTax, ytdHours
    } = req.body;

    const existingUserResult = await pool.query(
      `SELECT id, vacation_accrual_enabled
       FROM users
       WHERE id = $1
         AND created_by = $2`,
      [id, req.user.id]
    );

    if (existingUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentVacationAccrualEnabled = Boolean(existingUserResult.rows[0].vacation_accrual_enabled);
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

    if (hourlyRate !== undefined) {
      params.push(hourlyRate === '' ? null : hourlyRate);
      updates.push(`hourly_rate = $${params.length}`);
    }

    if (paymentType !== undefined) {
      if (!PAYMENT_TYPES.has(paymentType)) {
        return res.status(400).json({ error: 'Invalid payment type' });
      }
      params.push(paymentType);
      updates.push(`payment_type = $${params.length}`);
    }

    if (payFrequency !== undefined) {
      if (!PAY_FREQUENCIES.has(payFrequency)) {
        return res.status(400).json({ error: 'Invalid pay frequency' });
      }
      params.push(payFrequency);
      updates.push(`pay_frequency = $${params.length}`);
    }

    if (salaryAmount !== undefined) {
      params.push(salaryAmount === '' ? null : (parseFloat(salaryAmount) || 0));
      updates.push(`salary_amount = $${params.length}`);
    }

    if (dateOfBirth !== undefined) {
      params.push(dateOfBirth || null);
      updates.push(`date_of_birth = $${params.length}`);
    }

    if (isActive !== undefined) {
      params.push(isActive);
      updates.push(`is_active = $${params.length}`);
    }

    if (addressLine1 !== undefined) {
      params.push(addressLine1 || null);
      updates.push(`address_line1 = $${params.length}`);
    }

    if (addressLine2 !== undefined) {
      params.push(addressLine2 || null);
      updates.push(`address_line2 = $${params.length}`);
    }

    if (city !== undefined) {
      params.push(city || null);
      updates.push(`city = $${params.length}`);
    }

    if (province !== undefined) {
      params.push(province || null);
      updates.push(`province = $${params.length}`);
    }

    if (postalCode !== undefined) {
      params.push(postalCode || null);
      updates.push(`postal_code = $${params.length}`);
    }

    if (annualSickDays !== undefined) {
      params.push(parseFloat(annualSickDays) || 0);
      updates.push(`annual_sick_days = $${params.length}`);
    }

    if (annualVacationDays !== undefined) {
      params.push(parseFloat(annualVacationDays) || 0);
      updates.push(`annual_vacation_days = $${params.length}`);
    }

    if (sickDaysRemaining !== undefined) {
      params.push(parseFloat(sickDaysRemaining) || 0);
      updates.push(`sick_days_remaining = $${params.length}`);
    }

    if (vacationDaysRemaining !== undefined) {
      const effectiveVacationAccrualEnabled = vacationAccrualEnabled !== undefined
        ? Boolean(vacationAccrualEnabled)
        : currentVacationAccrualEnabled;

      if (!effectiveVacationAccrualEnabled) {
        params.push(parseFloat(vacationDaysRemaining) || 0);
        updates.push(`vacation_days_remaining = $${params.length}`);
      }
    }

    if (carryoverEnabled !== undefined) {
      params.push(carryoverEnabled);
      updates.push(`carryover_enabled = $${params.length}`);
    }

    if (dateEmployed !== undefined) {
      params.push(dateEmployed || null);
      updates.push(`date_employed = $${params.length}`);
    }

    if (employmentType !== undefined) {
      const normalizedEmploymentType = normalizeEmploymentType(employmentType);
      if (normalizedEmploymentType === null) {
        return res.status(400).json({ error: 'Employment type must be FULL_TIME or PART_TIME' });
      }
      params.push(normalizedEmploymentType);
      updates.push(`employment_type = $${params.length}`);
    }

    if (vacationAccrualEnabled !== undefined) {
      params.push(Boolean(vacationAccrualEnabled));
      updates.push(`vacation_accrual_enabled = $${params.length}`);
    }

    if (vacationAccrualRate !== undefined) {
      params.push(normalizeAccrualRate(vacationAccrualRate, DEFAULT_VACATION_ACCRUAL_RATE));
      updates.push(`vacation_accrual_rate = $${params.length}`);
    }

    if (sin !== undefined) {
      params.push(sin || null);
      updates.push(`sin = $${params.length}`);
    }

    if (ytdGross !== undefined) {
      params.push(parseFloat(ytdGross) || 0);
      updates.push(`ytd_gross = $${params.length}`);
    }

    if (ytdCpp !== undefined) {
      params.push(parseFloat(ytdCpp) || 0);
      updates.push(`ytd_cpp = $${params.length}`);
    }

    if (ytdEi !== undefined) {
      params.push(parseFloat(ytdEi) || 0);
      updates.push(`ytd_ei = $${params.length}`);
    }

    if (ytdTax !== undefined) {
      params.push(parseFloat(ytdTax) || 0);
      updates.push(`ytd_tax = $${params.length}`);
    }

    if (ytdHours !== undefined) {
      params.push(parseFloat(ytdHours) || 0);
      updates.push(`ytd_hours = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(id);
    params.push(req.user.id);
    const query = `
      UPDATE users
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${params.length - 1}
        AND created_by = $${params.length}
      RETURNING id, email, first_name, last_name, role, hourly_rate, is_active,
                payment_type, pay_frequency, salary_amount, date_of_birth,
                address_line1, address_line2, city, province, postal_code,
                annual_sick_days, annual_vacation_days, sick_days_remaining, vacation_days_remaining,
                carryover_enabled, date_employed, employment_type,
                vacation_accrual_enabled, vacation_accrual_rate,
                sin, ytd_gross, ytd_cpp, ytd_ei, ytd_tax, ytd_hours
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await applyVacationAccrualSnapshots(pool, result.rows[0]);
    res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

module.exports = router;
