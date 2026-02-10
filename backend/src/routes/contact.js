const express = require('express');
const rateLimit = require('express-rate-limit');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || process.env.SMTP_FROM;
const CONTACT_TIME_ZONE = process.env.CONTACT_TIME_ZONE || 'America/Vancouver';
const CONTACT_LOCALE = process.env.CONTACT_LOCALE || 'en-CA';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createDateTimeFormatter = (options) => {
  try {
    return new Intl.DateTimeFormat(CONTACT_LOCALE, {
      timeZone: CONTACT_TIME_ZONE,
      ...options,
    });
  } catch (error) {
    console.error(
      `[Contact] Invalid CONTACT_TIME_ZONE "${CONTACT_TIME_ZONE}" or CONTACT_LOCALE "${CONTACT_LOCALE}". Falling back to UTC.`,
      error
    );
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      ...options,
    });
  }
};

const contactDateFormatter = createDateTimeFormatter({
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const contactTimeFormatter = createDateTimeFormatter({
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short',
});

const sanitize = (value, maxLen) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLen);
};

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

router.post('/contact', contactLimiter, async (req, res) => {
  const { firstName, lastName, email, phone, message } = req.body || {};

  const safeFirstName = sanitize(firstName, 80);
  const safeLastName = sanitize(lastName, 80);
  const safeEmail = sanitize(email, 320).toLowerCase();
  const safePhone = sanitize(phone, 50);
  const safeMessage = typeof message === 'string' ? message.trim().slice(0, 5000) : '';

  if (!safeFirstName || !safeLastName || !safeEmail || !safeMessage) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!EMAIL_REGEX.test(safeEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  if (!CONTACT_TO_EMAIL) {
    console.error('[Contact] CONTACT_TO_EMAIL/SMTP_FROM is not configured');
    return res.status(500).json({ error: 'Contact form is temporarily unavailable.' });
  }

  const submittedAt = new Date();
  const submittedDate = contactDateFormatter.format(submittedAt);
  const submittedTime = contactTimeFormatter.format(submittedAt);
  const subject = `New Form Submission: ${safeFirstName} ${safeLastName}`;
  const escapedName = escapeHtml(`${safeFirstName} ${safeLastName}`);
  const escapedEmail = escapeHtml(safeEmail);
  const escapedMessage = escapeHtml(safeMessage);
  const textBody = [
    `New Form Submission: ${safeFirstName} ${safeLastName}`,
    '',
    `Name: ${safeFirstName} ${safeLastName}`,
    `Email: ${safeEmail}`,
    `Phone: ${safePhone || 'Not provided'}`,
    `When: ${submittedDate}`,
    `Time: ${submittedTime}`,
    '',
    'Message:',
    safeMessage,
  ].join('\n');

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;color:#1f2937;max-width:640px;margin:0 auto;padding:20px;background:#f8fafc;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;">
        <h1 style="margin:0 0 18px;font-size:26px;line-height:1.2;color:#0f172a;">
          New Form Submission: ${escapedName}
        </h1>
        <div style="font-size:17px;line-height:1.7;color:#111827;">
          <p style="margin:0 0 8px;"><strong>Name:</strong> ${escapedName}</p>
          <p style="margin:0 0 8px;"><strong>Email:</strong> ${escapedEmail}</p>
          <p style="margin:0 0 8px;"><strong>Phone:</strong> ${escapeHtml(safePhone || 'Not provided')}</p>
          <p style="margin:0 0 8px;"><strong>When:</strong> ${escapeHtml(submittedDate)}</p>
          <p style="margin:0 0 16px;"><strong>Time:</strong> ${escapeHtml(submittedTime)}</p>
        </div>
        <div style="margin-top:16px;padding:16px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
          <p style="margin:0 0 10px;font-size:14px;letter-spacing:0.04em;text-transform:uppercase;color:#475569;">
            Message
          </p>
          <p style="margin:0;font-size:16px;line-height:1.65;white-space:pre-wrap;">${escapedMessage}</p>
        </div>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: CONTACT_TO_EMAIL,
      subject,
      text: textBody,
      html: htmlBody,
      replyTo: safeEmail,
    });
  } catch (error) {
    console.error('[Contact] Failed to send message', error);
    return res.status(500).json({ error: 'Unable to send your message right now. Please try again later.' });
  }

  return res.json({ status: 'ok' });
});

module.exports = router;
