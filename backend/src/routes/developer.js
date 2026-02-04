const express = require('express');
const jwt = require('jsonwebtoken');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const DEVELOPER_PASSWORD = '123';
const FIREFLY_COOKIE_NAME = 'firefly_access';
const FIREFLY_TOKEN_EXPIRES_IN = '8h';
const FIREFLY_COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

const parseCookies = (cookieHeader) => {
  if (!cookieHeader) {
    return {};
  }
  return cookieHeader.split(';').reduce((acc, part) => {
    const trimmed = part.trim();
    if (!trimmed) {
      return acc;
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      return acc;
    }
    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
};

const getCookieDomain = () => {
  if (process.env.DEVELOPER_COOKIE_DOMAIN) {
    return process.env.DEVELOPER_COOKIE_DOMAIN;
  }

  if (!process.env.FRONTEND_URL) {
    return undefined;
  }

  try {
    const { hostname } = new URL(process.env.FRONTEND_URL);
    return hostname ? `.${hostname}` : undefined;
  } catch (error) {
    return undefined;
  }
};

router.post('/unlock', requireAuth, requireAdmin, (req, res) => {
  const { password } = req.body || {};

  if (password !== DEVELOPER_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect developer password.' });
  }

  const token = jwt.sign(
    {
      scope: 'firefly',
      userId: req.user.id,
      role: req.user.role,
    },
    JWT_SECRET,
    { expiresIn: FIREFLY_TOKEN_EXPIRES_IN }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: FIREFLY_COOKIE_MAX_AGE_MS,
  };

  const domain = getCookieDomain();
  if (domain) {
    cookieOptions.domain = domain;
  }

  res.cookie(FIREFLY_COOKIE_NAME, token, cookieOptions);
  return res.json({ status: 'ok', expiresIn: FIREFLY_TOKEN_EXPIRES_IN });
});

router.post('/lock', (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  };

  const domain = getCookieDomain();
  if (domain) {
    cookieOptions.domain = domain;
  }

  res.cookie(FIREFLY_COOKIE_NAME, '', cookieOptions);
  return res.json({ status: 'ok' });
});

router.get('/authorize', (req, res) => {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[FIREFLY_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: 'Developer access required.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.scope !== 'firefly' || payload?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    return res.json({ status: 'ok' });
  } catch (error) {
    return res.status(401).json({ error: 'Developer access required.' });
  }
});

module.exports = router;
