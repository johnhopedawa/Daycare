const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// === ADMIN ROUTES ===

// Get all schedules for educators created by this admin
router.get('/admin/schedules', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { from, to, user_id, status } = req.query;

    let query = `
      SELECT s.*, u.first_name, u.last_name, u.email
      FROM schedules s
      JOIN users u ON s.user_id = u.id
      WHERE s.created_by = $1
    `;
    const params = [req.user.id];

    if (from) {
      params.push(from);
      query += ` AND s.shift_date >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      query += ` AND s.shift_date <= $${params.length}`;
    }

    if (user_id) {
      params.push(user_id);
      query += ` AND s.user_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND s.status = $${params.length}`;
    }

    query += ' ORDER BY s.shift_date, s.start_time';

    const result = await pool.query(query, params);
    res.json({ schedules: result.rows });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// Create a single schedule
router.post('/admin/schedules', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, shiftDate, startTime, endTime, hours, notes } = req.body;

    if (!userId || !shiftDate || !startTime || !endTime || !hours) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify the educator belongs to this admin
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND created_by = $2',
      [userId, req.user.id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `INSERT INTO schedules (user_id, created_by, shift_date, start_time, end_time, hours, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, req.user.id, shiftDate, startTime, endTime, hours, notes || null]
    );

    res.json({ schedule: result.rows[0] });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// Create recurring schedule
router.post('/admin/schedules/recurring', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { userId, dayOfWeek, startTime, endTime, hours, startDate, endDate, notes } = req.body;

    if (!userId || dayOfWeek === undefined || !startTime || !endTime || !hours || !startDate) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify the educator belongs to this admin
    const userCheck = await client.query(
      'SELECT id FROM users WHERE id = $1 AND created_by = $2',
      [userId, req.user.id]
    );

    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Create recurrence pattern
    const recurrenceResult = await client.query(
      `INSERT INTO schedule_recurrence
       (user_id, created_by, day_of_week, start_time, end_time, hours, start_date, end_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, req.user.id, dayOfWeek, startTime, endTime, hours, startDate, endDate || null, notes || null]
    );

    const recurrenceId = recurrenceResult.rows[0].id;

    // Generate schedule instances
    const schedules = [];
    const end = endDate ? new Date(endDate) : new Date(startDate);
    end.setMonth(end.getMonth() + 3); // Default to 3 months if no end date

    let current = new Date(startDate);
    const targetDay = parseInt(dayOfWeek);

    // Find first occurrence of the target day
    while (current.getDay() !== targetDay) {
      current.setDate(current.getDate() + 1);
    }

    // Create schedules for each occurrence
    while (current <= end) {
      const shiftDate = current.toISOString().split('T')[0];

      const scheduleResult = await client.query(
        `INSERT INTO schedules
         (user_id, created_by, shift_date, start_time, end_time, hours, notes, recurrence_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [userId, req.user.id, shiftDate, startTime, endTime, hours, notes || null, recurrenceId]
      );

      schedules.push(scheduleResult.rows[0]);

      // Move to next week
      current.setDate(current.getDate() + 7);
    }

    await client.query('COMMIT');

    res.json({ recurrence: recurrenceResult.rows[0], schedules, count: schedules.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create recurring schedule error:', error);
    res.status(500).json({ error: 'Failed to create recurring schedule' });
  } finally {
    client.release();
  }
});

// Update schedule
router.patch('/admin/schedules/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { shiftDate, startTime, endTime, hours, notes, status } = req.body;

    // Verify ownership
    const check = await pool.query(
      'SELECT id FROM schedules WHERE id = $1 AND created_by = $2',
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Validate required fields
    if (!shiftDate || !startTime || !endTime || !hours) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Build update query
    let query = `
      UPDATE schedules
      SET shift_date = $1, start_time = $2, end_time = $3, hours = $4, notes = $5, updated_at = CURRENT_TIMESTAMP
    `;
    const params = [shiftDate, startTime, endTime, hours, notes || null];

    // Add status if provided
    if (status !== undefined) {
      params.push(status);
      query += `, status = $${params.length}`;
    }

    params.push(id);
    query += ` WHERE id = $${params.length} RETURNING *`;

    const result = await pool.query(query, params);

    res.json({ schedule: result.rows[0] });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Delete schedule
router.delete('/admin/schedules/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const check = await pool.query(
      'SELECT id FROM schedules WHERE id = $1 AND created_by = $2',
      [id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    await pool.query('DELETE FROM schedules WHERE id = $1', [id]);

    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

// === EDUCATOR ROUTES ===

// Get my schedules
router.get('/my-schedules', requireAuth, async (req, res) => {
  try {
    const { from, to, status } = req.query;

    let query = 'SELECT * FROM schedules WHERE user_id = $1';
    const params = [req.user.id];

    if (from) {
      params.push(from);
      query += ` AND shift_date >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      query += ` AND shift_date <= $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ' ORDER BY shift_date, start_time';

    const result = await pool.query(query, params);
    res.json({ schedules: result.rows });
  } catch (error) {
    console.error('Get my schedules error:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// Accept schedule
router.post('/my-schedules/:id/accept', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE schedules
       SET status = 'ACCEPTED', responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({ schedule: result.rows[0] });
  } catch (error) {
    console.error('Accept schedule error:', error);
    res.status(500).json({ error: 'Failed to accept schedule' });
  }
});

// Decline schedule
router.post('/my-schedules/:id/decline', requireAuth, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { reason, declineType } = req.body;

    if (!reason) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Decline reason required' });
    }

    if (!declineType || !['SICK_DAY', 'VACATION_DAY', 'UNPAID'].includes(declineType)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Valid decline type required' });
    }

    // Get schedule to know how many hours to deduct
    const schedule = await client.query(
      'SELECT * FROM schedules WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (schedule.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const hours = schedule.rows[0].hours;

    // Calculate days to deduct (8 hours = 1 day)
    const daysToDeduct = hours / 8;

    // Update schedule
    const result = await client.query(
      `UPDATE schedules
       SET status = 'DECLINED', decline_reason = $1, decline_type = $2,
           responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [reason, declineType, id, req.user.id]
    );

    // Update user's sick/vacation days
    if (declineType === 'SICK_DAY') {
      await client.query(
        'UPDATE users SET sick_days_remaining = sick_days_remaining - $1 WHERE id = $2',
        [daysToDeduct, req.user.id]
      );
    } else if (declineType === 'VACATION_DAY') {
      await client.query(
        'UPDATE users SET vacation_days_remaining = vacation_days_remaining - $1 WHERE id = $2',
        [daysToDeduct, req.user.id]
      );
    }

    // Get updated balances
    const userResult = await client.query(
      'SELECT sick_days_remaining, vacation_days_remaining FROM users WHERE id = $1',
      [req.user.id]
    );

    await client.query('COMMIT');

    res.json({
      schedule: result.rows[0],
      balances: userResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Decline schedule error:', error);
    res.status(500).json({ error: 'Failed to decline schedule' });
  } finally {
    client.release();
  }
});

// Bulk accept schedules
router.post('/my-schedules/bulk-accept', requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No schedule IDs provided' });
    }

    const result = await pool.query(
      `UPDATE schedules
       SET status = 'ACCEPTED', responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($1) AND user_id = $2
       RETURNING *`,
      [ids, req.user.id]
    );

    res.json({ schedules: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Bulk accept error:', error);
    res.status(500).json({ error: 'Failed to accept schedules' });
  }
});

// Accept schedules by date range
router.post('/my-schedules/accept-range', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates required' });
    }

    const result = await pool.query(
      `UPDATE schedules
       SET status = 'ACCEPTED', responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND shift_date >= $2 AND shift_date <= $3 AND status = 'PENDING'
       RETURNING *`,
      [req.user.id, startDate, endDate]
    );

    res.json({ schedules: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Accept range error:', error);
    res.status(500).json({ error: 'Failed to accept schedules' });
  }
});

module.exports = router;
