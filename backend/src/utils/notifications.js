const pool = require('../db/pool');
const { sendEmail } = require('../services/emailService');

// Queue a notification
async function queueNotification({ type, recipientType, recipientId, email, phone, subject, message }) {
  try {
    const result = await pool.query(
      `INSERT INTO notifications
       (notification_type, recipient_type, recipient_id, recipient_email, recipient_phone, subject, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [type, recipientType, recipientId, email, phone, subject, message]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Queue notification error:', error);
    throw error;
  }
}

// Send overdue invoice notifications
async function sendOverdueInvoiceNotifications() {
  try {
    // Get overdue invoices
    const overdueInvoices = await pool.query(
      `SELECT
        pi.id,
        pi.invoice_number,
        pi.balance_due,
        pi.due_date,
        p.id as parent_id,
        p.email,
        p.first_name,
        p.last_name
      FROM parent_invoices pi
      JOIN parents p ON pi.parent_id = p.id
      WHERE pi.status != 'PAID'
        AND pi.balance_due > 0
        AND pi.due_date < CURRENT_DATE
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.recipient_id = p.id
            AND n.subject LIKE '%Overdue%'
            AND n.created_at > CURRENT_DATE - 7
        )`
    );

    const notifications = [];

    for (const invoice of overdueInvoices.rows) {
      const daysOverdue = Math.floor((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24));

      const message = `Dear ${invoice.first_name} ${invoice.last_name},

This is a reminder that invoice ${invoice.invoice_number} is ${daysOverdue} days overdue.

Amount Due: $${parseFloat(invoice.balance_due).toFixed(2)}
Due Date: ${new Date(invoice.due_date).toLocaleDateString()}

Please submit payment at your earliest convenience.

Thank you,
Daycare Management`;

      const notification = await queueNotification({
        type: 'EMAIL',
        recipientType: 'PARENT',
        recipientId: invoice.parent_id,
        email: invoice.email,
        phone: null,
        subject: `Overdue Invoice Reminder - ${invoice.invoice_number}`,
        message
      });

      notifications.push(notification);
    }

    return notifications;
  } catch (error) {
    console.error('Send overdue notifications error:', error);
    throw error;
  }
}

// Process pending notifications
async function processPendingNotifications() {
  try {
    const pending = await pool.query(
      `SELECT * FROM notifications
       WHERE status = 'PENDING'
         AND retry_count < 3
       ORDER BY created_at ASC
       LIMIT 20`
    );

    for (const notification of pending.rows) {
      try {
        if (notification.notification_type === 'EMAIL') {
          if (!notification.recipient_email) {
            throw new Error('Missing recipient email');
          }

          await sendEmail({
            to: notification.recipient_email,
            subject: notification.subject || 'Daycare Notification',
            text: notification.message,
          });
        } else {
          throw new Error(`Unsupported notification type: ${notification.notification_type}`);
        }

        await pool.query(
          `UPDATE notifications
           SET status = 'SENT',
               sent_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [notification.id]
        );
      } catch (error) {
        const nextRetryCount = notification.retry_count + 1;
        const nextStatus = nextRetryCount >= 3 ? 'FAILED' : 'PENDING';

        await pool.query(
          `UPDATE notifications
           SET status = $1,
               retry_count = $2,
               error_message = $3
           WHERE id = $4`,
          [nextStatus, nextRetryCount, error.message, notification.id]
        );
      }
    }

    return pending.rows.length;
  } catch (error) {
    console.error('Process notifications error:', error);
    throw error;
  }
}

module.exports = {
  queueNotification,
  sendOverdueInvoiceNotifications,
  processPendingNotifications
};
