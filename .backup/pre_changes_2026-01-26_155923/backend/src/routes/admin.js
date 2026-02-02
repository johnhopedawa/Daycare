const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

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
                 annual_sick_days, annual_vacation_days, sick_days_remaining, vacation_days_remaining,
                 carryover_enabled, date_employed, sin, ytd_gross, ytd_cpp, ytd_ei, ytd_tax, ytd_hours,
                 created_at FROM users WHERE created_by = $1`;
    const params = [req.user.id];

    if (role) {
      params.push(role);
      query += ` AND role = $${params.length}`;
    }

    query += ' ORDER BY last_name, first_name';

    const result = await pool.query(query, params);
    res.json({ users: result.rows });
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
      annualSickDays, annualVacationDays, carryoverEnabled,
      dateEmployed, sin, ytdGross, ytdCpp, ytdEi, ytdTax, ytdHours
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
    const sickDays = parseInt(annualSickDays) || 0;
    const vacationDays = parseInt(annualVacationDays) || 0;

    // Create educator
    const result = await pool.query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name, role, hourly_rate, created_by,
        annual_sick_days, annual_vacation_days, sick_days_remaining, vacation_days_remaining,
        carryover_enabled, date_employed, sin, ytd_gross, ytd_cpp, ytd_ei, ytd_tax, ytd_hours
       )
       VALUES ($1, $2, $3, $4, 'EDUCATOR', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING id, email, first_name, last_name, role, hourly_rate, is_active,
                 annual_sick_days, annual_vacation_days, sick_days_remaining, vacation_days_remaining,
                 carryover_enabled, date_employed, sin, ytd_gross, ytd_cpp, ytd_ei, ytd_tax, ytd_hours`,
      [
        email, passwordHash, firstName, lastName, hourlyRate || null, req.user.id,
        sickDays, vacationDays, sickDays, vacationDays, // Set remaining equal to annual initially
        carryoverEnabled || false,
        dateEmployed || null,
        sin || null,
        parseFloat(ytdGross) || 0,
        parseFloat(ytdCpp) || 0,
        parseFloat(ytdEi) || 0,
        parseFloat(ytdTax) || 0,
        parseFloat(ytdHours) || 0
      ]
    );

    res.json({ user: result.rows[0] });
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
      annualSickDays, annualVacationDays, sickDaysRemaining, vacationDaysRemaining,
      carryoverEnabled, dateEmployed, sin, ytdGross, ytdCpp, ytdEi, ytdTax, ytdHours
    } = req.body;

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
      params.push(hourlyRate);
      updates.push(`hourly_rate = $${params.length}`);
    }

    if (isActive !== undefined) {
      params.push(isActive);
      updates.push(`is_active = $${params.length}`);
    }

    if (annualSickDays !== undefined) {
      params.push(parseInt(annualSickDays) || 0);
      updates.push(`annual_sick_days = $${params.length}`);
    }

    if (annualVacationDays !== undefined) {
      params.push(parseInt(annualVacationDays) || 0);
      updates.push(`annual_vacation_days = $${params.length}`);
    }

    if (sickDaysRemaining !== undefined) {
      params.push(parseFloat(sickDaysRemaining) || 0);
      updates.push(`sick_days_remaining = $${params.length}`);
    }

    if (vacationDaysRemaining !== undefined) {
      params.push(parseFloat(vacationDaysRemaining) || 0);
      updates.push(`vacation_days_remaining = $${params.length}`);
    }

    if (carryoverEnabled !== undefined) {
      params.push(carryoverEnabled);
      updates.push(`carryover_enabled = $${params.length}`);
    }

    if (dateEmployed !== undefined) {
      params.push(dateEmployed || null);
      updates.push(`date_employed = $${params.length}`);
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
    const query = `
      UPDATE users
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${params.length}
      RETURNING id, email, first_name, last_name, role, hourly_rate, is_active,
                annual_sick_days, annual_vacation_days, sick_days_remaining, vacation_days_remaining,
                carryover_enabled, date_employed, sin, ytd_gross, ytd_cpp, ytd_ei, ytd_tax, ytd_hours
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

module.exports = router;
