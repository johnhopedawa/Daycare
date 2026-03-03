const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { getOwnerId } = require('../utils/owner');

const router = express.Router();

const ALLOWED_LOG_TYPES = new Set(['NAP', 'PEE', 'POO']);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const normalizeText = (value) => {
  const text = String(value || '').trim();
  return text.length > 0 ? text : null;
};

const parseOptionalChildId = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return Number.NaN;
  }
  return parsed;
};

const resolveRequestedDate = (req) => (
  req.query?.date ||
  req.body?.log_date ||
  req.body?.date ||
  null
);

const ensureEducatorScheduled = async ({ userId, targetDate }) => {
  const scheduleCheck = await pool.query(
    `SELECT 1
     FROM schedules
     WHERE user_id = $1
       AND shift_date = COALESCE($2::date, CURRENT_DATE)
       AND status IN ('ACCEPTED', 'PENDING')
     LIMIT 1`,
    [userId, targetDate]
  );
  return scheduleCheck.rows.length > 0;
};

router.get('/', requireAuth, async (req, res) => {
  try {
    const targetDate = resolveRequestedDate(req);
    const childId = parseOptionalChildId(req.query.child_id);
    if (Number.isNaN(childId)) {
      return res.status(400).json({ error: 'Invalid child_id' });
    }

    let query;
    let params;

    if (req.user.role === 'PARENT') {
      if (!req.parent) {
        return res.status(403).json({ error: 'Parent access required' });
      }

      const accessibleChildren = await pool.query(
        `SELECT c.id
         FROM children c
         JOIN parent_children pc ON pc.child_id = c.id
         WHERE pc.parent_id = $1
           AND ($2::int IS NULL OR c.id = $2)`,
        [req.parent.id, childId]
      );

      const childIds = accessibleChildren.rows.map((row) => row.id);
      if (childIds.length === 0) {
        return res.json({ logs: [] });
      }

      query = `
        SELECT
          cl.*,
          c.first_name || ' ' || c.last_name AS child_name,
          u.first_name AS created_by_first_name,
          u.last_name AS created_by_last_name
        FROM care_logs cl
        JOIN children c ON c.id = cl.child_id
        JOIN users u ON u.id = cl.created_by
        WHERE cl.log_date = COALESCE($1::date, CURRENT_DATE)
          AND cl.child_id = ANY($2::int[])
        ORDER BY cl.occurred_at DESC NULLS LAST, cl.created_at DESC
      `;
      params = [targetDate, childIds];
    } else if (['ADMIN', 'EDUCATOR'].includes(req.user.role)) {
      if (req.user.role === 'EDUCATOR') {
        const isScheduled = await ensureEducatorScheduled({
          userId: req.user.id,
          targetDate,
        });
        if (!isScheduled) {
          return res.status(403).json({ error: 'Daily care logs require a scheduled shift on the requested date' });
        }
      }

      const ownerId = getOwnerId(req.user);
      query = `
        SELECT
          cl.*,
          c.first_name || ' ' || c.last_name AS child_name,
          u.first_name AS created_by_first_name,
          u.last_name AS created_by_last_name
        FROM care_logs cl
        JOIN children c ON c.id = cl.child_id
        JOIN users u ON u.id = cl.created_by
        WHERE cl.log_date = COALESCE($1::date, CURRENT_DATE)
          AND cl.owner_id = $2
          AND ($3::int IS NULL OR cl.child_id = $3)
        ORDER BY cl.occurred_at DESC NULLS LAST, cl.created_at DESC
      `;
      params = [targetDate, ownerId, childId];
    } else {
      return res.status(403).json({ error: 'Unauthorized role' });
    }

    const result = await pool.query(query, params);
    return res.json({ logs: result.rows });
  } catch (error) {
    console.error('Get care logs error:', error);
    return res.status(500).json({ error: 'Failed to fetch care logs' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const childId = Number.parseInt(req.body.child_id, 10);
    const targetDate = resolveRequestedDate(req);
    const occurredAt = normalizeText(req.body.occurred_at);
    const notes = normalizeText(req.body.notes);
    const logType = String(req.body.log_type || '').trim().toUpperCase();

    if (!Number.isInteger(childId) || childId <= 0) {
      return res.status(400).json({ error: 'Valid child_id is required' });
    }
    if (!ALLOWED_LOG_TYPES.has(logType)) {
      return res.status(400).json({ error: 'log_type must be one of NAP, PEE, POO' });
    }
    if (occurredAt && !TIME_PATTERN.test(occurredAt)) {
      return res.status(400).json({ error: 'occurred_at must be in HH:MM or HH:MM:SS format' });
    }

    let ownerId;

    if (req.user.role === 'PARENT') {
      return res.status(403).json({ error: 'Parents can view daily care logs but cannot create entries' });
    } else if (['ADMIN', 'EDUCATOR'].includes(req.user.role)) {
      if (req.user.role === 'EDUCATOR') {
        const isScheduled = await ensureEducatorScheduled({
          userId: req.user.id,
          targetDate,
        });
        if (!isScheduled) {
          return res.status(403).json({ error: 'Daily care logs require a scheduled shift on the requested date' });
        }
      }

      ownerId = getOwnerId(req.user);

      const childCheck = await pool.query(
        `SELECT id
         FROM children
         WHERE id = $1
           AND created_by = $2
         LIMIT 1`,
        [childId, ownerId]
      );

      if (childCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Child not found' });
      }
    } else {
      return res.status(403).json({ error: 'Unauthorized role' });
    }

    const result = await pool.query(
      `INSERT INTO care_logs (
         owner_id,
         child_id,
         log_date,
         log_type,
         occurred_at,
         notes,
         created_by
       )
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5::time, $6, $7)
       RETURNING *`,
      [ownerId, childId, targetDate, logType, occurredAt, notes, req.user.id]
    );

    return res.status(201).json({ log: result.rows[0] });
  } catch (error) {
    console.error('Create care log error:', error);
    return res.status(500).json({ error: 'Failed to create care log entry' });
  }
});

module.exports = router;
