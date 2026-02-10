const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { requireAuth, requireAdmin, requireStaff } = require('../middleware/auth');
const { getOwnerId } = require('../utils/owner');

const ABSENT_STATUSES = new Set(['ABSENT', 'SICK', 'VACATION']);

const isPresentRecord = (record) => {
  const status = String(record.status || '').toUpperCase();
  if (ABSENT_STATUSES.has(status)) {
    return false;
  }
  if (record.check_in_time || record.check_out_time) {
    return true;
  }
  return ['PRESENT', 'LATE'].includes(status);
};

const requireScheduledStaff = async (req, res, next) => {
  if (req.user?.role === 'ADMIN') {
    return next();
  }

  try {
    // Bind attendance access to the date being viewed/edited, not always server CURRENT_DATE.
    const scheduleDate =
      req.body?.attendance_date ||
      req.query?.attendance_date ||
      req.query?.date ||
      req.query?.start_date ||
      req.query?.from ||
      null;

    const result = await pool.query(
      `SELECT 1
       FROM schedules
       WHERE user_id = $1
         AND shift_date = COALESCE($2::date, CURRENT_DATE)
         AND status IN ('ACCEPTED', 'PENDING')
       LIMIT 1`,
      [req.user.id, scheduleDate]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Attendance access requires a scheduled shift on the requested date' });
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

// GET /api/attendance/children
// Get children list for attendance workflows (staff + scheduled for requested date)
router.get('/children', requireAuth, requireStaff, requireScheduledStaff, async (req, res) => {
  try {
    const { status = 'ACTIVE' } = req.query;
    const ownerId = getOwnerId(req.user);

    const result = await pool.query(
      `SELECT
         c.id,
         c.first_name,
         c.last_name,
         c.status,
         COALESCE(
           jsonb_agg(
             DISTINCT jsonb_build_object(
               'id', p.id,
               'first_name', p.first_name,
               'last_name', p.last_name,
               'is_primary_contact', pc.is_primary_contact,
               'relationship', pc.relationship
             )
           ) FILTER (WHERE p.id IS NOT NULL),
           '[]'::jsonb
         ) AS parents
       FROM children c
       LEFT JOIN parent_children pc ON pc.child_id = c.id
       LEFT JOIN parents p ON p.id = pc.parent_id
       WHERE c.created_by = $1
         AND ($2::text IS NULL OR c.status = $2)
       GROUP BY c.id
       ORDER BY c.last_name, c.first_name`,
      [ownerId, status || null]
    );

    res.json({ children: result.rows });
  } catch (error) {
    console.error('Get attendance children error:', error);
    res.status(500).json({ error: 'Failed to get children for attendance' });
  }
});

// GET /api/attendance/compliance
// Determine if scheduled staff count meets the kids-to-staff ratio for the day
router.get('/compliance', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { date, ratio_kids, ratio_staff } = req.query;
    const parsedKids = ratio_kids !== undefined ? Number.parseFloat(ratio_kids) : null;
    const parsedStaff = ratio_staff !== undefined ? Number.parseFloat(ratio_staff) : null;

    if (parsedKids !== null && (!Number.isFinite(parsedKids) || parsedKids <= 0)) {
      return res.status(400).json({ error: 'ratio_kids must be a positive number' });
    }
    if (parsedStaff !== null && (!Number.isFinite(parsedStaff) || parsedStaff <= 0)) {
      return res.status(400).json({ error: 'ratio_staff must be a positive number' });
    }

    const ratioKids = parsedKids ?? 4;
    const ratioStaff = parsedStaff ?? 1;
    const targetDate = date || null;
    const ownerId = getOwnerId(req.user);

    const attendanceResult = await pool.query(
      `SELECT a.status, a.check_in_time, a.check_out_time
       FROM attendance a
       JOIN children c ON a.child_id = c.id
       WHERE a.attendance_date = COALESCE($1::date, CURRENT_DATE)
         AND c.created_by = $2`,
      [targetDate, ownerId]
    );

    const presentCount = attendanceResult.rows.filter(isPresentRecord).length;

    const staffResult = await pool.query(
      `SELECT COUNT(DISTINCT s.user_id) as staff_scheduled
       FROM schedules s
       WHERE s.shift_date = COALESCE($1::date, CURRENT_DATE)
         AND s.status = 'ACCEPTED'
         AND s.created_by = $2`,
      [targetDate, ownerId]
    );

    const staffScheduled = Number.parseInt(staffResult.rows[0]?.staff_scheduled || 0, 10);
    const kidsPerStaff = ratioKids / ratioStaff;
    const requiredStaff = kidsPerStaff > 0 ? Math.ceil(presentCount / kidsPerStaff) : 0;

    res.json({
      date: targetDate || new Date().toISOString().split('T')[0],
      ratio: {
        kids: ratioKids,
        staff: ratioStaff,
        kids_per_staff: kidsPerStaff,
      },
      kids_present: presentCount,
      staff_scheduled: staffScheduled,
      required_staff: requiredStaff,
      in_compliance: staffScheduled >= requiredStaff,
    });
  } catch (error) {
    console.error('Attendance compliance error:', error);
    res.status(500).json({ error: 'Failed to calculate staffing compliance' });
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
