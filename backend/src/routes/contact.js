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
const CONTACT_SUBJECT_PREFIX = process.env.CONTACT_SUBJECT_PREFIX || 'Website Contact';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const { firstName, lastName, email, message } = req.body || {};

  const safeFirstName = sanitize(firstName, 80);
  const safeLastName = sanitize(lastName, 80);
  const safeEmail = sanitize(email, 320).toLowerCase();
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

  const subject = `${CONTACT_SUBJECT_PREFIX}: ${safeFirstName} ${safeLastName}`;
  const escapedName = escapeHtml(`${safeFirstName} ${safeLastName}`);
  const escapedEmail = escapeHtml(safeEmail);
  const escapedMessage = escapeHtml(safeMessage);
  const textBody = [
    'New contact form submission',
    '',
    `Name: ${safeFirstName} ${safeLastName}`,
    `Email: ${safeEmail}`,
    '',
    'Message:',
    safeMessage,
  ].join('\n');

  const htmlBody = `
    <h2>New contact form submission</h2>
    <p><strong>Name:</strong> ${escapedName}</p>
    <p><strong>Email:</strong> ${escapedEmail}</p>
    <p><strong>Message:</strong></p>
    <pre style="white-space:pre-wrap;font-family:inherit">${escapedMessage}</pre>
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
