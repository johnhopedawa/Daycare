const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireAdmin);

// List recent notifications
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);

    const result = await pool.query(
      `SELECT *
       FROM app_notifications
       WHERE recipient_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.user.id, limit]
    );

    res.json({ notifications: result.rows });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Unread count
router.get('/unread-count', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM app_notifications
       WHERE recipient_id = $1 AND is_read = false`,
      [req.user.id]
    );

    res.json({ count: result.rows[0]?.count || 0 });
  } catch (error) {
    console.error('Get notifications unread count error:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Mark as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE app_notifications
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND recipient_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ notification: result.rows[0] });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification read' });
  }
});

// Mark all as read
router.patch('/read-all', async (req, res) => {
  try {
    await pool.query(
      `UPDATE app_notifications
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE recipient_id = $1 AND is_read = false`,
      [req.user.id]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
});

module.exports = router;
