const pool = require('../db/pool');

async function createAppNotification({ recipientId, type, title, message, actionUrl, metadata }) {
  if (!recipientId || !type || !title) {
    return null;
  }

  const result = await pool.query(
    `INSERT INTO app_notifications
     (recipient_id, notification_type, title, message, action_url, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [recipientId, type, title, message || null, actionUrl || null, metadata || null]
  );

  return result.rows[0];
}

module.exports = {
  createAppNotification
};
