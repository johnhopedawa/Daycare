const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/contact', contactLimiter, async (req, res) => {
  const { firstName, lastName, email, message } = req.body || {};

  if (!firstName || !lastName || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Lightweight capture for now; wire up storage/notifications later.
  console.log('[Contact]', {
    firstName,
    lastName,
    email,
    message,
    receivedAt: new Date().toISOString(),
  });

  return res.json({ status: 'ok' });
});

module.exports = router;
