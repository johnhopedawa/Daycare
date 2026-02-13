const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireParent } = require('../middleware/auth');
const { expandEventsForRange } = require('../utils/eventRecurrence');

const router = express.Router();

router.use(requireAuth, requireParent);

// Parent portal should only hide internal items, not specific entry types.
const PARENT_HIDDEN_AUDIENCES = ['STAFF', 'PRIVATE'];
const ALLOWED_RSVP_STATUSES = new Set(['GOING', 'NOT_GOING']);
const isMissingRsvpTableError = (error) => (
  error?.code === '42P01' && /event_rsvps/i.test(String(error?.message || ''))
);

const loadOwnerIdsForParent = async ({ parentId, userCreatedBy }) => {
  const ownerIds = new Set();

  // Canonical ownership source: the parent's linked children.
  const childOwners = await pool.query(
    `SELECT DISTINCT c.created_by
     FROM parent_children pc
     JOIN children c ON pc.child_id = c.id
     WHERE pc.parent_id = $1
       AND c.created_by IS NOT NULL`,
    [parentId]
  );
  childOwners.rows.forEach((row) => ownerIds.add(row.created_by));

  // Fallback: parent user may still carry owner linkage.
  if (userCreatedBy) {
    ownerIds.add(userCreatedBy);
  }

  // Fallback: invoice metadata may carry owner linkage for older records.
  const invoiceOwners = await pool.query(
    `SELECT DISTINCT created_by
     FROM parent_invoices
     WHERE parent_id = $1
       AND created_by IS NOT NULL`,
    [parentId]
  );
  invoiceOwners.rows.forEach((row) => ownerIds.add(row.created_by));

  // Single-tenant fallback when legacy data is missing linkage.
  if (ownerIds.size === 0) {
    const adminOwners = await pool.query(
      `SELECT id
       FROM users
       WHERE role = 'ADMIN' AND is_active = true
       ORDER BY id ASC`
    );
    if (adminOwners.rows.length === 1) {
      ownerIds.add(adminOwners.rows[0].id);
    }
  }

  return Array.from(ownerIds);
};

router.get('/', async (req, res) => {
  try {
    const ownerIds = await loadOwnerIdsForParent({
      parentId: req.parent.id,
      userCreatedBy: req.user.created_by,
    });
    if (ownerIds.length === 0) {
      return res.json({ events: [] });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
    const from = req.query.from || new Date().toISOString().split('T')[0];
    const to = req.query.to || null;

    if (!to) {
      let query = `
        SELECT
          e.*,
          er.status AS parent_rsvp_status,
          er.responded_at AS parent_rsvp_responded_at
        FROM events e
        LEFT JOIN event_rsvps er
          ON er.event_id = e.id
         AND er.parent_id = $4
        WHERE e.created_by = ANY($1::int[])
          AND e.event_date >= $2
          AND COALESCE(e.audience, 'ALL') <> ALL($3::text[])
      `;
      const params = [ownerIds, from, PARENT_HIDDEN_AUDIENCES, req.parent.id];

      query += ` ORDER BY e.event_date ASC, e.start_time ASC NULLS LAST LIMIT $${params.length + 1}`;
      params.push(limit);

      let result;
      try {
        result = await pool.query(query, params);
      } catch (error) {
        if (!isMissingRsvpTableError(error)) {
          throw error;
        }

        // Backward-compatible fallback while RSVP migration is being applied.
        const fallback = await pool.query(
          `SELECT
             e.*,
             NULL::text AS parent_rsvp_status,
             NULL::timestamp with time zone AS parent_rsvp_responded_at
           FROM events e
           WHERE e.created_by = ANY($1::int[])
             AND e.event_date >= $2
             AND COALESCE(e.audience, 'ALL') <> ALL($3::text[])
           ORDER BY e.event_date ASC, e.start_time ASC NULLS LAST
           LIMIT $4`,
          [ownerIds, from, PARENT_HIDDEN_AUDIENCES, limit]
        );
        result = fallback;
      }
      return res.json({ events: result.rows });
    }

    let rangeQuery = `
      SELECT
        e.*,
        er.status AS parent_rsvp_status,
        er.responded_at AS parent_rsvp_responded_at
      FROM events e
      LEFT JOIN event_rsvps er
        ON er.event_id = e.id
       AND er.parent_id = $5
      WHERE e.created_by = ANY($1::int[])
        AND COALESCE(e.audience, 'ALL') <> ALL($4::text[])
        AND (
          (e.event_date >= $2 AND e.event_date <= $3)
          OR (COALESCE(e.recurrence, 'NONE') IN ('MONTHLY', 'ANNUAL') AND e.event_date <= $3)
        )
    `;
    const rangeParams = [ownerIds, from, to, PARENT_HIDDEN_AUDIENCES, req.parent.id];

    rangeQuery += ' ORDER BY e.event_date ASC, e.start_time ASC NULLS LAST';

    let rangeResult;
    try {
      rangeResult = await pool.query(rangeQuery, rangeParams);
    } catch (error) {
      if (!isMissingRsvpTableError(error)) {
        throw error;
      }

      // Backward-compatible fallback while RSVP migration is being applied.
      rangeResult = await pool.query(
        `SELECT
           e.*,
           NULL::text AS parent_rsvp_status,
           NULL::timestamp with time zone AS parent_rsvp_responded_at
         FROM events e
         WHERE e.created_by = ANY($1::int[])
           AND COALESCE(e.audience, 'ALL') <> ALL($4::text[])
           AND (
             (e.event_date >= $2 AND e.event_date <= $3)
             OR (COALESCE(e.recurrence, 'NONE') IN ('MONTHLY', 'ANNUAL') AND e.event_date <= $3)
           )
         ORDER BY e.event_date ASC, e.start_time ASC NULLS LAST`,
        [ownerIds, from, to, PARENT_HIDDEN_AUDIENCES]
      );
    }
    const expandedEvents = expandEventsForRange(rangeResult.rows, { from, to, limit });

    return res.json({ events: expandedEvents });
  } catch (error) {
    console.error('Get parent events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.post('/:id/rsvp', async (req, res) => {
  try {
    const ownerIds = await loadOwnerIdsForParent({
      parentId: req.parent.id,
      userCreatedBy: req.user.created_by,
    });
    if (ownerIds.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventId = parseInt(req.params.id, 10);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ error: 'Invalid event id' });
    }

    const normalizedStatus = String(req.body?.status || '').trim().toUpperCase();
    if (!ALLOWED_RSVP_STATUSES.has(normalizedStatus)) {
      return res.status(400).json({ error: 'Invalid RSVP status' });
    }

    const visibleEvent = await pool.query(
      `SELECT e.id, e.requires_rsvp
       FROM events e
       WHERE e.id = $1
         AND e.created_by = ANY($2::int[])
         AND COALESCE(e.audience, 'ALL') <> ALL($3::text[])
       LIMIT 1`,
      [eventId, ownerIds, PARENT_HIDDEN_AUDIENCES]
    );

    if (visibleEvent.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!visibleEvent.rows[0].requires_rsvp) {
      return res.status(400).json({ error: 'RSVP is not required for this event' });
    }

    const upsert = await pool.query(
      `INSERT INTO event_rsvps (event_id, parent_id, status, responded_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (event_id, parent_id)
       DO UPDATE SET
         status = EXCLUDED.status,
         responded_at = EXCLUDED.responded_at,
         updated_at = CURRENT_TIMESTAMP
       RETURNING event_id, parent_id, status, responded_at, updated_at`,
      [eventId, req.parent.id, normalizedStatus]
    );

    return res.json({ rsvp: upsert.rows[0] });
  } catch (error) {
    if (isMissingRsvpTableError(error)) {
      return res.status(503).json({
        error: 'RSVP is temporarily unavailable. Please run backend migrations and try again.',
      });
    }
    console.error('Parent RSVP error:', error);
    return res.status(500).json({ error: 'Failed to save RSVP' });
  }
});

module.exports = router;
