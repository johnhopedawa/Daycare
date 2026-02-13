const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireAdmin, requireStaff } = require('../middleware/auth');
const { getOwnerId } = require('../utils/owner');
const { expandEventsForRange } = require('../utils/eventRecurrence');

const router = express.Router();
const ALLOWED_AUDIENCES = new Set(['ALL', 'PARENTS', 'STAFF', 'CHILDREN', 'PRIVATE']);
const ALLOWED_ENTRY_TYPES = new Set(['EVENT', 'MAINTENANCE']);
const ALLOWED_RECURRENCE = new Set(['NONE', 'MONTHLY', 'ANNUAL']);
const ALLOWED_STATUS = new Set(['OPEN', 'DONE']);
const FAMILY_RSVP_AUDIENCES = new Set(['ALL', 'PARENTS', 'CHILDREN']);
const isMissingRsvpTableError = (error) => (
  error?.code === '42P01' && /event_rsvps/i.test(String(error?.message || ''))
);

const normalizeValue = (value, fallback, allowedSet) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const normalized = String(value).trim().toUpperCase();
  if (!allowedSet.has(normalized)) {
    return null;
  }
  return normalized;
};

// Get events (staff)
router.get('/', requireAuth, requireStaff, async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
    const from = req.query.from || new Date().toISOString().split('T')[0];
    const to = req.query.to || null;

    if (!to) {
      let query = `
        SELECT *
        FROM events
        WHERE created_by = $1
          AND event_date >= $2
      `;
      const params = [ownerId, from];

      // Admin-only items are hidden from non-admin staff.
      if (req.user.role !== 'ADMIN') {
        query += ` AND COALESCE(audience, 'ALL') <> 'PRIVATE'`;
      }

      params.push(limit);
      query += ` ORDER BY event_date ASC, start_time ASC NULLS LAST LIMIT $${params.length}`;

      const result = await pool.query(query, params);
      return res.json({ events: result.rows });
    }

    let rangeQuery = `
      SELECT *
      FROM events
      WHERE created_by = $1
        AND (
          (event_date >= $2 AND event_date <= $3)
          OR (COALESCE(recurrence, 'NONE') IN ('MONTHLY', 'ANNUAL') AND event_date <= $3)
        )
    `;
    const rangeParams = [ownerId, from, to];

    // Admin-only items are hidden from non-admin staff.
    if (req.user.role !== 'ADMIN') {
      rangeQuery += ` AND COALESCE(audience, 'ALL') <> 'PRIVATE'`;
    }

    rangeQuery += ' ORDER BY event_date ASC, start_time ASC NULLS LAST';

    const rangeResult = await pool.query(rangeQuery, rangeParams);
    const expandedEvents = expandEventsForRange(rangeResult.rows, { from, to, limit });

    return res.json({ events: expandedEvents });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get RSVP responses for one event (admin)
router.get('/:id/rsvps', requireAuth, requireAdmin, async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const eventId = parseInt(req.params.id, 10);

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ error: 'Invalid event id' });
    }

    const eventResult = await pool.query(
      `SELECT id, audience, requires_rsvp, entry_type
       FROM events
       WHERE id = $1 AND created_by = $2
       LIMIT 1`,
      [eventId, ownerId]
    );
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];
    const audience = String(event.audience || 'ALL').toUpperCase();
    const isFamilyAudience = FAMILY_RSVP_AUDIENCES.has(audience);
    const requiresRsvp = Boolean(event.requires_rsvp) && isFamilyAudience;

    if (!requiresRsvp) {
      return res.json({
        eventId,
        requiresRsvp: false,
        totals: {
          totalFamilies: 0,
          going: 0,
          notGoing: 0,
          noReply: 0,
        },
        responses: [],
      });
    }

    const responsesResult = await pool.query(
      `WITH owner_parent_ids AS (
         SELECT DISTINCT p.id
         FROM parents p
         JOIN parent_children pc ON pc.parent_id = p.id
         JOIN children c ON c.id = pc.child_id
         WHERE c.created_by = $1

         UNION

         SELECT DISTINCT p.id
         FROM parents p
         JOIN parent_invoices pi ON pi.parent_id = p.id
         WHERE pi.created_by = $1

         UNION

         SELECT DISTINCT p.id
         FROM parents p
         WHERE p.created_by = $1
       )
       SELECT
         p.id AS parent_id,
         p.first_name,
         p.last_name,
         p.email,
         er.status,
         er.responded_at
       FROM owner_parent_ids op
       JOIN parents p ON p.id = op.id
       LEFT JOIN event_rsvps er
         ON er.event_id = $2
        AND er.parent_id = p.id
       WHERE p.is_active = true
       ORDER BY p.last_name ASC, p.first_name ASC, p.id ASC`,
      [ownerId, eventId]
    );

    const responses = responsesResult.rows.map((row) => {
      const normalizedStatus = String(row.status || '').toUpperCase();
      const status = normalizedStatus === 'GOING' || normalizedStatus === 'NOT_GOING'
        ? normalizedStatus
        : 'NO_REPLY';
      return {
        parent_id: row.parent_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        status,
        responded_at: row.responded_at || null,
      };
    });

    const totals = responses.reduce((acc, row) => {
      acc.totalFamilies += 1;
      if (row.status === 'GOING') {
        acc.going += 1;
      } else if (row.status === 'NOT_GOING') {
        acc.notGoing += 1;
      } else {
        acc.noReply += 1;
      }
      return acc;
    }, {
      totalFamilies: 0,
      going: 0,
      notGoing: 0,
      noReply: 0,
    });

    return res.json({
      eventId,
      requiresRsvp: true,
      totals,
      responses,
    });
  } catch (error) {
    if (isMissingRsvpTableError(error)) {
      return res.status(503).json({
        error: 'RSVP is temporarily unavailable. Please run backend migrations and try again.',
      });
    }
    console.error('Get event RSVPs error:', error);
    return res.status(500).json({ error: 'Failed to fetch event RSVPs' });
  }
});

// Create event (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const {
      title,
      eventDate,
      startTime,
      endTime,
      location,
      audience,
      entryType,
      recurrence,
      status,
      completedAt,
      description,
      requiresRsvp
    } = req.body;

    if (!title || !eventDate) {
      return res.status(400).json({ error: 'Title and date are required' });
    }

    const normalizedEntryType = normalizeValue(entryType, 'EVENT', ALLOWED_ENTRY_TYPES);
    const normalizedRecurrence = normalizeValue(recurrence, 'NONE', ALLOWED_RECURRENCE);
    const normalizedStatus = normalizeValue(status, 'OPEN', ALLOWED_STATUS);
    const normalizedAudience = normalizeValue(audience, 'STAFF', ALLOWED_AUDIENCES);

    if (!normalizedEntryType || !normalizedRecurrence || !normalizedStatus || !normalizedAudience) {
      return res.status(400).json({ error: 'Invalid event metadata values' });
    }

    const resolvedRecurrence = normalizedEntryType === 'MAINTENANCE' ? normalizedRecurrence : 'NONE';
    const resolvedStatus = normalizedStatus;
    const canRequestFamilyRsvp = (
      normalizedEntryType !== 'MAINTENANCE'
      && FAMILY_RSVP_AUDIENCES.has(normalizedAudience)
    );
    const resolvedCompletedAt = resolvedStatus === 'DONE'
      ? (completedAt || new Date().toISOString())
      : null;

    const result = await pool.query(
      `INSERT INTO events
       (created_by, title, event_date, start_time, end_time, location, audience, description, requires_rsvp, entry_type, recurrence, status, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        ownerId,
        title.trim(),
        eventDate,
        startTime || null,
        endTime || null,
        location || null,
        normalizedAudience,
        description || null,
        canRequestFamilyRsvp ? Boolean(requiresRsvp) : false,
        normalizedEntryType,
        resolvedRecurrence,
        resolvedStatus,
        resolvedCompletedAt
      ]
    );

    res.json({ event: result.rows[0] });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event (admin)
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = getOwnerId(req.user);
    const {
      title,
      eventDate,
      startTime,
      endTime,
      location,
      audience,
      entryType,
      recurrence,
      status,
      completedAt,
      description,
      requiresRsvp
    } = req.body;

    const existing = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND created_by = $2',
      [id, ownerId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const current = existing.rows[0];

    const updates = [];
    const params = [];

    if (title !== undefined) {
      params.push(title.trim());
      updates.push(`title = $${params.length}`);
    }
    if (eventDate !== undefined) {
      params.push(eventDate);
      updates.push(`event_date = $${params.length}`);
    }
    if (startTime !== undefined) {
      params.push(startTime || null);
      updates.push(`start_time = $${params.length}`);
    }
    if (endTime !== undefined) {
      params.push(endTime || null);
      updates.push(`end_time = $${params.length}`);
    }
    if (location !== undefined) {
      params.push(location || null);
      updates.push(`location = $${params.length}`);
    }
    const nextEntryType = entryType !== undefined
      ? normalizeValue(entryType, 'EVENT', ALLOWED_ENTRY_TYPES)
      : (current.entry_type || 'EVENT');
    if (!nextEntryType) {
      return res.status(400).json({ error: 'Invalid entry type' });
    }

    if (entryType !== undefined) {
      params.push(nextEntryType);
      updates.push(`entry_type = $${params.length}`);
    }

    const hasAudienceUpdate = audience !== undefined;
    let nextAudience = current.audience || 'STAFF';
    if (hasAudienceUpdate) {
      const resolvedAudience = normalizeValue(audience, current.audience || 'STAFF', ALLOWED_AUDIENCES);
      if (!resolvedAudience) {
        return res.status(400).json({ error: 'Invalid audience value' });
      }
      nextAudience = resolvedAudience;
      params.push(resolvedAudience);
      updates.push(`audience = $${params.length}`);
    }

    const hasRecurrenceUpdate = recurrence !== undefined || entryType !== undefined;
    if (hasRecurrenceUpdate) {
      const normalizedRecurrence = normalizeValue(
        recurrence,
        current.recurrence || 'NONE',
        ALLOWED_RECURRENCE
      );
      if (!normalizedRecurrence) {
        return res.status(400).json({ error: 'Invalid recurrence value' });
      }
      const resolvedRecurrence = nextEntryType === 'MAINTENANCE' ? normalizedRecurrence : 'NONE';
      params.push(resolvedRecurrence);
      updates.push(`recurrence = $${params.length}`);
    }

    if (description !== undefined) {
      params.push(description || null);
      updates.push(`description = $${params.length}`);
    }
    if (requiresRsvp !== undefined) {
      const canRequestFamilyRsvp = (
        nextEntryType !== 'MAINTENANCE'
        && FAMILY_RSVP_AUDIENCES.has(String(nextAudience || '').toUpperCase())
      );
      params.push(canRequestFamilyRsvp ? Boolean(requiresRsvp) : false);
      updates.push(`requires_rsvp = $${params.length}`);
    } else if (entryType !== undefined || hasAudienceUpdate) {
      const canRequestFamilyRsvp = (
        nextEntryType !== 'MAINTENANCE'
        && FAMILY_RSVP_AUDIENCES.has(String(nextAudience || '').toUpperCase())
      );
      if (!canRequestFamilyRsvp) {
        params.push(false);
        updates.push(`requires_rsvp = $${params.length}`);
      }
    }
    if (status !== undefined) {
      const normalizedStatus = normalizeValue(status, current.status || 'OPEN', ALLOWED_STATUS);
      if (!normalizedStatus) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      params.push(normalizedStatus);
      updates.push(`status = $${params.length}`);

      const resolvedCompletedAt = normalizedStatus === 'DONE'
        ? (completedAt === undefined ? new Date().toISOString() : (completedAt || null))
        : null;
      params.push(resolvedCompletedAt);
      updates.push(`completed_at = $${params.length}`);
    } else if (completedAt !== undefined) {
      params.push(completedAt || null);
      updates.push(`completed_at = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(id);
    params.push(ownerId);

    const result = await pool.query(
      `UPDATE events
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${params.length - 1} AND created_by = $${params.length}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event: result.rows[0] });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = getOwnerId(req.user);

    const result = await pool.query(
      'DELETE FROM events WHERE id = $1 AND created_by = $2 RETURNING id',
      [id, ownerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
