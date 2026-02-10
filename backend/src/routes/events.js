const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireAdmin, requireStaff } = require('../middleware/auth');
const { getOwnerId } = require('../utils/owner');

const router = express.Router();
const ALLOWED_AUDIENCES = new Set(['ALL', 'PARENTS', 'STAFF', 'CHILDREN', 'PRIVATE']);
const ALLOWED_ENTRY_TYPES = new Set(['EVENT', 'MAINTENANCE']);
const ALLOWED_RECURRENCE = new Set(['NONE', 'MONTHLY', 'ANNUAL']);
const ALLOWED_STATUS = new Set(['OPEN', 'DONE']);

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

    if (to) {
      params.push(to);
      query += ` AND event_date <= $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY event_date ASC, start_time ASC NULLS LAST LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    res.json({ events: result.rows });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
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
        normalizedEntryType === 'MAINTENANCE' ? false : Boolean(requiresRsvp),
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
    if (hasAudienceUpdate) {
      const resolvedAudience = normalizeValue(audience, current.audience || 'STAFF', ALLOWED_AUDIENCES);
      if (!resolvedAudience) {
        return res.status(400).json({ error: 'Invalid audience value' });
      }
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
      params.push(nextEntryType === 'MAINTENANCE' ? false : Boolean(requiresRsvp));
      updates.push(`requires_rsvp = $${params.length}`);
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
