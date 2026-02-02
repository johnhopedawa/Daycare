const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { requireAuth, requireAdmin, requireStaff } = require('../middleware/auth');
const { getOwnerId } = require('../utils/owner');

const requireScheduledStaff = async (req, res, next) => {
  if (req.user?.role === 'ADMIN') {
    return next();
  }

  try {
    const result = await pool.query(
      `SELECT 1
       FROM schedules
       WHERE user_id = $1
         AND shift_date = CURRENT_DATE
         AND status IN ('ACCEPTED', 'PENDING')
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Attendance access requires a scheduled shift today' });
    }

    return next();
  } catch (error) {
    console.error('Attendance schedule check error:', error);
    return res.status(500).json({ error: 'Failed to validate attendance access' });
  }
};

// GET /api/attendance
// Get attendance records with filters
router.get('/', requireAuth, requireStaff, requireScheduledStaff, async (req, res) => {
  try {
    const { child_id, start_date, end_date, status } = req.query;

    let query = `
      SELECT
        a.*,
        c.first_name || ' ' || c.last_name as child_name,
        u1.first_name || ' ' || u1.last_name as checked_in_by_name,
        u2.first_name || ' ' || u2.last_name as checked_out_by_name
      FROM attendance a
      JOIN children c ON a.child_id = c.id
      LEFT JOIN users u1 ON a.checked_in_by = u1.id
      LEFT JOIN users u2 ON a.checked_out_by = u2.id
      WHERE c.created_by = $1
    `;
    const ownerId = getOwnerId(req.user);
    const params = [ownerId];
    let paramCount = 2;

    if (child_id) {
      query += ` AND a.child_id = $${paramCount}`;
      params.push(child_id);
      paramCount++;
    }

    if (start_date) {
      query += ` AND a.attendance_date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND a.attendance_date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    if (status) {
      query += ` AND a.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY a.attendance_date DESC, a.check_in_time DESC`;

    const result = await pool.query(query, params);
    res.json({ attendance: result.rows });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to get attendance records' });
  }
});

// GET /api/attendance/today
// Get today's attendance
router.get('/today', requireAuth, requireStaff, requireScheduledStaff, async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const result = await pool.query(
      `SELECT
        a.*,
        c.first_name || ' ' || c.last_name as child_name,
        c.status as enrollment_status
      FROM attendance a
      JOIN children c ON a.child_id = c.id
      WHERE a.attendance_date = CURRENT_DATE
        AND c.created_by = $1
      ORDER BY a.check_in_time DESC NULLS LAST`,
      [ownerId]
    );

    res.json({ attendance: result.rows });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ error: 'Failed to get today\'s attendance' });
  }
});

// POST /api/attendance/check-in
// Check in a child (supports custom attendance_date for historical entries)
router.post('/check-in', requireAuth, requireStaff, requireScheduledStaff, async (req, res) => {
  try {
    const { child_id, parent_name, notes, check_in_time, attendance_date } = req.body;
    const checkInTime = check_in_time || new Date().toTimeString().split(' ')[0];
    const attendanceDate = attendance_date || null; // null will use CURRENT_DATE in SQL

    const ownerId = getOwnerId(req.user);
    const childCheck = await pool.query(
      'SELECT id FROM children WHERE id = $1 AND created_by = $2',
      [child_id, ownerId]
    );

    if (childCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Check if attendance record exists for the specified date
    const existing = await pool.query(
      'SELECT id FROM attendance WHERE child_id = $1 AND attendance_date = COALESCE($2::date, CURRENT_DATE)',
      [child_id, attendanceDate]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing record
      result = await pool.query(
        `UPDATE attendance
         SET check_in_time = $1,
             checked_in_by = $2,
             parent_dropped_off = $3,
             notes = COALESCE($4, notes),
             status = 'PRESENT',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [checkInTime, req.user.id, parent_name, notes, existing.rows[0].id]
      );
    } else {
      // Create new record
      result = await pool.query(
        `INSERT INTO attendance
         (child_id, attendance_date, check_in_time, checked_in_by, parent_dropped_off, notes, status)
         VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5, $6, 'PRESENT')
         RETURNING *`,
        [child_id, attendanceDate, checkInTime, req.user.id, parent_name, notes]
      );
    }

    res.json({ attendance: result.rows[0] });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to check in child' });
  }
});

// POST /api/attendance/check-out
// Check out a child (supports custom attendance_date for historical entries)
router.post('/check-out', requireAuth, requireStaff, requireScheduledStaff, async (req, res) => {
  try {
    const { child_id, parent_name, notes, check_out_time, attendance_date } = req.body;
    const checkOutTime = check_out_time || new Date().toTimeString().split(' ')[0];
    const attendanceDate = attendance_date || null; // null will use CURRENT_DATE in SQL

    const ownerId = getOwnerId(req.user);
    const childCheck = await pool.query(
      'SELECT id FROM children WHERE id = $1 AND created_by = $2',
      [child_id, ownerId]
    );

    if (childCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const result = await pool.query(
      `UPDATE attendance
       SET check_out_time = $1,
           checked_out_by = $2,
           parent_picked_up = $3,
           notes = COALESCE($4, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE child_id = $5 AND attendance_date = COALESCE($6::date, CURRENT_DATE)
       RETURNING *`,
      [checkOutTime, req.user.id, parent_name, notes, child_id, attendanceDate]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No check-in record found for the specified date' });
    }

    res.json({ attendance: result.rows[0] });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Failed to check out child' });
  }
});

// POST /api/attendance/mark-absent
// Mark a child as absent (or SICK/VACATION)
router.post('/mark-absent', requireAuth, requireStaff, requireScheduledStaff, async (req, res) => {
  try {
    const { child_id, attendance_date, status, notes } = req.body;
    const attendanceDate = attendance_date || null; // null will use CURRENT_DATE in SQL

    const ownerId = getOwnerId(req.user);
    const childCheck = await pool.query(
      'SELECT id FROM children WHERE id = $1 AND created_by = $2',
      [child_id, ownerId]
    );

    if (childCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const result = await pool.query(
      `INSERT INTO attendance
       (child_id, attendance_date, status, notes, checked_in_by)
       VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5)
       ON CONFLICT (child_id, attendance_date)
       DO UPDATE SET status = $3, notes = $4, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [child_id, attendanceDate, status || 'ABSENT', notes, req.user.id]
    );

    res.json({ attendance: result.rows[0] });
  } catch (error) {
    console.error('Mark absent error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// GET /api/attendance/report
// Get attendance report for date range
router.get('/report', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const result = await pool.query(
      `SELECT
        c.id as child_id,
        c.first_name || ' ' || c.last_name as child_name,
        COUNT(*) as total_days,
        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) as present_days,
        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) as absent_days,
        COUNT(CASE WHEN a.status = 'SICK' THEN 1 END) as sick_days,
        COUNT(CASE WHEN a.status = 'VACATION' THEN 1 END) as vacation_days,
        ROUND(COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as attendance_rate
      FROM children c
      LEFT JOIN attendance a ON c.id = a.child_id
        AND a.attendance_date >= COALESCE($1::date, CURRENT_DATE - 30)
        AND a.attendance_date <= COALESCE($2::date, CURRENT_DATE)
      WHERE c.status = 'ACTIVE'
        AND c.created_by = $3
      GROUP BY c.id, c.first_name, c.last_name
      ORDER BY child_name`,
      [start_date, end_date, req.user.id]
    );

    res.json({ report: result.rows });
  } catch (error) {
    console.error('Attendance report error:', error);
    res.status(500).json({ error: 'Failed to generate attendance report' });
  }
});

module.exports = router;
