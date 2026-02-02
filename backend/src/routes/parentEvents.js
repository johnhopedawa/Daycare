const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireParent } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireParent);

const loadOwnerIdForParent = async (parentId) => {
  const result = await pool.query(
    `SELECT DISTINCT c.created_by
     FROM parent_children pc
     JOIN children c ON pc.child_id = c.id
     WHERE pc.parent_id = $1
     LIMIT 1`,
    [parentId]
  );
  return result.rows[0]?.created_by || null;
};

router.get('/', async (req, res) => {
  try {
    const ownerId = await loadOwnerIdForParent(req.parent.id);
    if (!ownerId) {
      return res.json({ events: [] });
    }

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

    query += ` ORDER BY event_date ASC, start_time ASC NULLS LAST LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json({ events: result.rows });
  } catch (error) {
    console.error('Get parent events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

module.exports = router;
