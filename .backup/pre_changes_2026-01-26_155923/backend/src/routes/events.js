const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireAdmin, requireStaff } = require('../middleware/auth');
const { getOwnerId } = require('../utils/owner');

const router = express.Router();

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
    const {
      title,
      eventDate,
      startTime,
      endTime,
      location,
      audience,
      description,
      requiresRsvp
    } = req.body;

    if (!title || !eventDate) {
      return res.status(400).json({ error: 'Title and date are required' });
    }

    const result = await pool.query(
      `INSERT INTO events
       (created_by, title, event_date, start_time, end_time, location, audience, description, requires_rsvp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.user.id,
        title.trim(),
        eventDate,
        startTime || null,
        endTime || null,
        location || null,
        audience ? audience.toUpperCase() : 'ALL',
        description || null,
        Boolean(requiresRsvp)
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
    const {
      title,
      eventDate,
      startTime,
      endTime,
      location,
      audience,
      description,
      requiresRsvp
    } = req.body;

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
    if (audience !== undefined) {
      params.push(audience ? audience.toUpperCase() : 'ALL');
      updates.push(`audience = $${params.length}`);
    }
    if (description !== undefined) {
      params.push(description || null);
      updates.push(`description = $${params.length}`);
    }
    if (requiresRsvp !== undefined) {
      params.push(Boolean(requiresRsvp));
      updates.push(`requires_rsvp = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(id);
    params.push(req.user.id);

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

    const result = await pool.query(
      'DELETE FROM events WHERE id = $1 AND created_by = $2 RETURNING id',
      [id, req.user.id]
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
