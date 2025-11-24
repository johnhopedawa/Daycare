const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Get all messages for parent
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*,
              u.first_name as staff_first_name,
              u.last_name as staff_last_name
       FROM messages m
       LEFT JOIN users u ON m.from_user_id = u.id
       WHERE m.to_parent_id = $1
       ORDER BY m.created_at DESC`,
      [req.parent.id]
    );

    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM messages WHERE to_parent_id = $1 AND parent_read = false',
      [req.parent.id]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Send message to staff
router.post('/', async (req, res) => {
  try {
    const { subject, message, to_user_id } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // If no specific user specified, send to first admin
    let recipientId = to_user_id;

    if (!recipientId) {
      const adminResult = await pool.query(
        "SELECT id FROM users WHERE role = 'ADMIN' AND is_active = true LIMIT 1"
      );

      if (adminResult.rows.length === 0) {
        return res.status(400).json({ error: 'No admin available to receive message' });
      }

      recipientId = adminResult.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO messages (from_parent_id, to_user_id, subject, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.parent.id, recipientId, subject || 'Message from Parent', message]
    );

    res.json({ message: result.rows[0] });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark message as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE messages
       SET parent_read = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND to_parent_id = $2
       RETURNING *`,
      [id, req.parent.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: result.rows[0] });
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// Mark all messages as read
router.patch('/read-all', async (req, res) => {
  try {
    await pool.query(
      `UPDATE messages
       SET parent_read = true, updated_at = CURRENT_TIMESTAMP
       WHERE to_parent_id = $1 AND parent_read = false`,
      [req.parent.id]
    );

    res.json({ message: 'All messages marked as read' });
  } catch (error) {
    console.error('Mark all messages as read error:', error);
    res.status(500).json({ error: 'Failed to mark all messages as read' });
  }
});

module.exports = router;
