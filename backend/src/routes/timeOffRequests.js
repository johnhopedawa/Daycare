const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireAdmin, requireStaff } = require('../middleware/auth');
const { createAppNotification } = require('../utils/appNotifications');

const router = express.Router();

router.use(requireAuth);

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split('T')[0];
};

const calculateDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff + 1 : 0;
};

const getHoursToDeduct = (request) => {
  if (request.hours !== null && request.hours !== undefined) {
    const parsed = parseFloat(request.hours);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return calculateDays(request.start_date, request.end_date) * 8;
};

// Staff: create request
router.post('/', requireStaff, async (req, res) => {
  try {
    const { startDate, endDate, requestType, reason, hours } = req.body;
    const normalizedStart = parseDate(startDate);
    const normalizedEnd = parseDate(endDate);

    if (!normalizedStart || !normalizedEnd) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }
    if (normalizedStart > normalizedEnd) {
      return res.status(400).json({ error: 'Start date cannot be after end date' });
    }

    let normalizedHours = null;
    if (hours !== undefined && hours !== null && hours !== '') {
      normalizedHours = parseFloat(hours);
      if (!Number.isFinite(normalizedHours) || normalizedHours <= 0) {
        return res.status(400).json({ error: 'Hours must be a positive number' });
      }
      if (normalizedStart !== normalizedEnd) {
        return res.status(400).json({ error: 'Hourly requests must be a single date' });
      }
    }
    const type = String(requestType || '').toUpperCase();
    if (!['SICK', 'VACATION', 'UNPAID'].includes(type)) {
      return res.status(400).json({ error: 'Invalid request type' });
    }

    const result = await pool.query(
      `INSERT INTO time_off_requests
       (user_id, start_date, end_date, request_type, reason, hours)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, normalizedStart, normalizedEnd, type, reason || null, normalizedHours]
    );

    await createAppNotification({
      recipientId: req.user.created_by || req.user.id,
      type: 'TIME_OFF_REQUEST',
      title: 'New time-off request',
      message: `${req.user.first_name || 'Staff'} requested ${type.toLowerCase()} from ${normalizedStart} to ${normalizedEnd}.`,
      actionUrl: '/scheduling',
      metadata: { request_id: result.rows[0].id, type, start_date: normalizedStart, end_date: normalizedEnd }
    });

    res.json({ request: result.rows[0] });
  } catch (error) {
    console.error('Create time off request error:', error);
    res.status(500).json({ error: 'Failed to create time off request' });
  }
});

// Staff: list my requests
router.get('/mine', requireStaff, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM time_off_requests
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Get time off requests error:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Admin: list all requests
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const params = [req.user.id];
    let query = `
      SELECT r.*, u.first_name, u.last_name, u.email
      FROM time_off_requests r
      JOIN users u ON r.user_id = u.id
      WHERE u.created_by = $1 OR u.id = $1
    `;

    if (status) {
      params.push(status.toUpperCase());
      query += ` AND r.status = $${params.length}`;
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Get time off requests error:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Admin: approve request
router.post('/:id/approve', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    const existing = await client.query(
      `SELECT r.*, u.first_name, u.last_name
       FROM time_off_requests r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = existing.rows[0];
    if (request.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Request already processed' });
    }

    const hoursToDeduct = getHoursToDeduct(request);
    if (request.request_type === 'SICK') {
      await client.query(
        'UPDATE users SET sick_days_remaining = sick_days_remaining - $1 WHERE id = $2',
        [hoursToDeduct, request.user_id]
      );
    }
    if (request.request_type === 'VACATION') {
      await client.query(
        'UPDATE users SET vacation_days_remaining = vacation_days_remaining - $1 WHERE id = $2',
        [hoursToDeduct, request.user_id]
      );
    }

    const result = await client.query(
      `UPDATE time_off_requests
       SET status = 'APPROVED',
           reviewed_by = $1,
           reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [req.user.id, id]
    );

    await client.query('COMMIT');

    await createAppNotification({
      recipientId: request.user_id,
      type: 'TIME_OFF_APPROVED',
      title: 'Time-off approved',
      message: `Your ${request.request_type.toLowerCase()} request (${request.start_date} to ${request.end_date}) was approved.`,
      actionUrl: '/educator/my-schedule',
      metadata: { request_id: request.id }
    });

    res.json({ request: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve time off request error:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  } finally {
    client.release();
  }
});

// Admin: reject request
router.post('/:id/reject', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(
      `UPDATE time_off_requests
       SET status = 'REJECTED',
           reviewed_by = $1,
           reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP,
           reason = COALESCE($2, reason)
       WHERE id = $3
       RETURNING *`,
      [req.user.id, reason || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    await createAppNotification({
      recipientId: result.rows[0].user_id,
      type: 'TIME_OFF_REJECTED',
      title: 'Time-off rejected',
      message: `Your ${result.rows[0].request_type.toLowerCase()} request was rejected.`,
      actionUrl: '/educator/my-schedule',
      metadata: { request_id: result.rows[0].id }
    });

    res.json({ request: result.rows[0] });
  } catch (error) {
    console.error('Reject time off request error:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// Staff: cancel my pending request
router.delete('/:id', requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM time_off_requests
       WHERE id = $1 AND user_id = $2 AND status = 'PENDING'
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found or cannot be cancelled' });
    }

    res.json({ message: 'Request cancelled' });
  } catch (error) {
    console.error('Cancel time off request error:', error);
    res.status(500).json({ error: 'Failed to cancel request' });
  }
});

module.exports = router;
