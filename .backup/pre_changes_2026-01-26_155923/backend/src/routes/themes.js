const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getAllThemes, getActiveTheme } = require('../services/themesService');

const router = express.Router();

// Active theme for all authenticated users (admin, educator, parent)
router.get('/active', requireAuth, async (req, res) => {
  try {
    const theme = await getActiveTheme();
    res.json({ theme });
  } catch (error) {
    console.error('Get active theme error:', error);
    res.status(500).json({ error: 'Failed to fetch active theme' });
  }
});

// Theme list (admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const themes = await getAllThemes();
    res.json({ themes });
  } catch (error) {
    console.error('Get themes error:', error);
    res.status(500).json({ error: 'Failed to fetch themes' });
  }
});

module.exports = router;
