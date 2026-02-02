const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireStaff } = require('../middleware/auth');
const { getOwnerId } = require('../utils/owner');
const { queueNotification } = require('../utils/notifications');

const router = express.Router();

router.use(requireAuth, requireStaff);

const getStaffIdsForOwner = async (ownerId) => {
  const staffResult = await pool.query(
    'SELECT id FROM users WHERE id = $1 OR created_by = $1',
    [ownerId]
  );
  return staffResult.rows.map(row => row.id);
};

// Get recent messages for staff inbox
router.get('/inbox', async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const staffIds = await getStaffIdsForOwner(ownerId);

    if (staffIds.length === 0) {
      return res.json({ messages: [] });
    }

    const result = await pool.query(
      `SELECT m.*,
              pf.first_name as parent_first_name,
              pf.last_name as parent_last_name,
              pt.first_name as to_parent_first_name,
              pt.last_name as to_parent_last_name,
              u.first_name as staff_first_name,
              u.last_name as staff_last_name
       FROM messages m
       LEFT JOIN parents pf ON m.from_parent_id = pf.id
       LEFT JOIN parents pt ON m.to_parent_id = pt.id
       LEFT JOIN users u ON m.from_user_id = u.id
       WHERE m.to_user_id = ANY($1::int[])
          OR m.from_user_id = ANY($1::int[])
       ORDER BY m.created_at DESC
       LIMIT $2`,
      [staffIds, limit]
    );

    const messages = result.rows.map((row) => {
      const parentFirst = row.parent_first_name || row.to_parent_first_name || '';
      const parentLast = row.parent_last_name || row.to_parent_last_name || '';
      return {
        ...row,
        parent_name: `${parentFirst} ${parentLast}`.trim()
      };
    });

    res.json({ messages });
  } catch (error) {
    console.error('Get inbox error:', error);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// Send message to parents
router.post('/send', async (req, res) => {
  const client = await pool.connect();
  try {
    const ownerId = getOwnerId(req.user);
    const { recipientType, parentId, subject, message, sendEmail } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let parents = [];

    if (recipientType === 'all') {
      const parentsResult = await client.query(
        `SELECT DISTINCT p.id, p.email, p.first_name, p.last_name
         FROM parents p
         JOIN parent_children pc ON p.id = pc.parent_id
         JOIN children c ON pc.child_id = c.id
         WHERE c.created_by = $1`,
        [ownerId]
      );
      parents = parentsResult.rows;
    } else if (recipientType === 'parent') {
      if (!parentId) {
        return res.status(400).json({ error: 'Parent ID is required' });
      }

      const parentResult = await client.query(
        `SELECT DISTINCT p.id, p.email, p.first_name, p.last_name
         FROM parents p
         JOIN parent_children pc ON p.id = pc.parent_id
         JOIN children c ON pc.child_id = c.id
         WHERE p.id = $1 AND c.created_by = $2`,
        [parentId, ownerId]
      );

      if (parentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Parent not found' });
      }

      parents = parentResult.rows;
    } else {
      return res.status(400).json({ error: 'Invalid recipient type' });
    }

    await client.query('BEGIN');
    const created = [];
    const messageSubject = subject && subject.trim() ? subject.trim() : 'Message from Daycare';
    const messageBody = message.trim();

    for (const parent of parents) {
      const insertResult = await client.query(
        `INSERT INTO messages (from_user_id, to_parent_id, subject, message)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [req.user.id, parent.id, messageSubject, messageBody]
      );
      created.push(insertResult.rows[0]);

      if (sendEmail && parent.email) {
        try {
          await queueNotification({
            type: 'EMAIL',
            recipientType: 'PARENT',
            recipientId: parent.id,
            email: parent.email,
            phone: null,
            subject: messageSubject,
            message: `Hello ${parent.first_name} ${parent.last_name},\n\n${messageBody}\n\nThank you,\nYour Daycare Team`
          });
        } catch (error) {
          console.error('Queue message notification error:', error);
        }
      }
    }

    await client.query('COMMIT');
    res.json({ messages: created, count: created.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  } finally {
    client.release();
  }
});

// Mark message as read (staff)
router.patch('/:id/read', async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const staffIds = await getStaffIdsForOwner(ownerId);

    if (staffIds.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const result = await pool.query(
      `UPDATE messages
       SET is_read = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND to_user_id = ANY($2::int[])
       RETURNING *`,
      [req.params.id, staffIds]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: result.rows[0] });
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

module.exports = router;
