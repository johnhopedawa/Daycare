const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get my time entries
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const { from, to, status } = req.query;

    let query = 'SELECT * FROM time_entries WHERE user_id = $1';
    const params = [req.user.id];

    if (from) {
      params.push(from);
      query += ` AND entry_date >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      query += ` AND entry_date <= $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ' ORDER BY entry_date DESC, id DESC';

    const result = await pool.query(query, params);
    res.json({ timeEntries: result.rows });
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

// Create time entry
router.post('/', requireAuth, async (req, res) => {
  try {
    const { entryDate, startTime, endTime, totalHours, notes } = req.body;

    if (!entryDate || !totalHours) {
      return res.status(400).json({ error: 'Entry date and total hours required' });
    }

    // Check if pay period is closed for this date
    const periodCheck = await pool.query(
      `SELECT id FROM pay_periods
       WHERE start_date <= $1 AND end_date >= $1 AND status = 'CLOSED'`,
      [entryDate]
    );

    if (periodCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot add entries to a closed pay period' });
    }

    const result = await pool.query(
      `INSERT INTO time_entries
       (user_id, entry_date, start_time, end_time, total_hours, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, entryDate, startTime || null, endTime || null, totalHours, notes || null]
    );

    res.json({ timeEntry: result.rows[0] });
  } catch (error) {
    console.error('Create time entry error:', error);
    res.status(500).json({ error: 'Failed to create time entry' });
  }
});

// Update time entry
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { entryDate, startTime, endTime, totalHours, notes } = req.body;

    // Check ownership and status
    const existing = await pool.query(
      'SELECT * FROM time_entries WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    if (existing.rows[0].status !== 'PENDING') {
      return res.status(400).json({ error: 'Cannot edit approved or rejected entries' });
    }

    // Check if pay period is closed
    const periodCheck = await pool.query(
      `SELECT id FROM pay_periods
       WHERE start_date <= $1 AND end_date >= $1 AND status = 'CLOSED'`,
      [entryDate || existing.rows[0].entry_date]
    );

    if (periodCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot edit entries in a closed pay period' });
    }

    const result = await pool.query(
      `UPDATE time_entries
       SET entry_date = $1, start_time = $2, end_time = $3,
           total_hours = $4, notes = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        entryDate || existing.rows[0].entry_date,
        startTime !== undefined ? startTime : existing.rows[0].start_time,
        endTime !== undefined ? endTime : existing.rows[0].end_time,
        totalHours || existing.rows[0].total_hours,
        notes !== undefined ? notes : existing.rows[0].notes,
        id,
        req.user.id
      ]
    );

    res.json({ timeEntry: result.rows[0] });
  } catch (error) {
    console.error('Update time entry error:', error);
    res.status(500).json({ error: 'Failed to update time entry' });
  }
});

// Delete time entry
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership and status
    const existing = await pool.query(
      'SELECT * FROM time_entries WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    if (existing.rows[0].status !== 'PENDING') {
      return res.status(400).json({ error: 'Cannot delete approved or rejected entries' });
    }

    // Check if pay period is closed
    const periodCheck = await pool.query(
      `SELECT id FROM pay_periods
       WHERE start_date <= $1 AND end_date >= $1 AND status = 'CLOSED'`,
      [existing.rows[0].entry_date]
    );

    if (periodCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete entries in a closed pay period' });
    }

    await pool.query(
      'DELETE FROM time_entries WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    res.json({ message: 'Time entry deleted' });
  } catch (error) {
    console.error('Delete time entry error:', error);
    res.status(500).json({ error: 'Failed to delete time entry' });
  }
});

module.exports = router;
