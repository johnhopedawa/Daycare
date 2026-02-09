const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  getAllThemes,
  getActiveTheme,
  getThemeById,
  updateThemeById,
} = require('../services/themesService');

const router = express.Router();
const THEME_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const parseJsonObjectField = (value) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  return null;
};

const parseExistingJsonObject = (value) => {
  if (!value) {
    return {};
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  return {};
};

// Active theme for authenticated users; parents can have a dedicated portal theme.
router.get('/active', requireAuth, async (req, res) => {
  try {
    const theme = await getActiveTheme(null, { role: req.user?.role });
    res.json({ theme });
  } catch (error) {
    console.error('Get active theme error:', error);
    res.status(500).json({ error: 'Failed to fetch active theme' });
  }
});

// Active theme for unauthenticated portal entry pages (login/landing).
router.get('/public-active', async (req, res) => {
  try {
    const scope = String(req.query.scope || 'staff').toLowerCase();
    const role = scope === 'parent' ? 'PARENT' : 'ADMIN';
    const theme = await getActiveTheme(null, { role });
    res.json({ theme, scope });
  } catch (error) {
    console.error('Get public active theme error:', error);
    res.status(500).json({ error: 'Failed to fetch public active theme' });
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

// Update theme metadata/palette/fonts (admin only)
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const themeId = parseInt(req.params.id, 10);
    if (!Number.isFinite(themeId)) {
      return res.status(400).json({ error: 'Theme id must be a number' });
    }

    const existingTheme = await getThemeById(null, themeId);
    if (!existingTheme) {
      return res.status(404).json({ error: 'Theme not found' });
    }

    const updates = {};

    if (req.body.name !== undefined) {
      const normalizedName = String(req.body.name || '').trim();
      if (!normalizedName) {
        return res.status(400).json({ error: 'Theme name cannot be empty' });
      }
      updates.name = normalizedName;
    }

    if (req.body.slug !== undefined) {
      const normalizedSlug = String(req.body.slug || '').trim().toLowerCase();
      if (!THEME_SLUG_REGEX.test(normalizedSlug)) {
        return res.status(400).json({ error: 'Theme slug must use lowercase letters, numbers, and hyphens only' });
      }
      updates.slug = normalizedSlug;
    }

    if (req.body.description !== undefined) {
      const normalizedDescription = req.body.description === null
        ? null
        : String(req.body.description).trim();
      updates.description = normalizedDescription;
    }

    if (req.body.palette !== undefined) {
      const palettePatch = parseJsonObjectField(req.body.palette);
      if (!palettePatch) {
        return res.status(400).json({ error: 'Theme palette must be a JSON object' });
      }
      const existingPalette = parseExistingJsonObject(existingTheme.palette);
      updates.palette = { ...existingPalette, ...palettePatch };
    }

    if (req.body.fonts !== undefined) {
      const fontsPatch = parseJsonObjectField(req.body.fonts);
      if (!fontsPatch) {
        return res.status(400).json({ error: 'Theme fonts must be a JSON object' });
      }
      const existingFonts = parseExistingJsonObject(existingTheme.fonts);
      updates.fonts = { ...existingFonts, ...fontsPatch };
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid theme updates provided' });
    }

    const theme = await updateThemeById(null, themeId, updates);
    return res.json({ theme });
  } catch (error) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Theme slug already exists' });
    }
    console.error('Update theme error:', error);
    return res.status(500).json({ error: 'Failed to update theme' });
  }
});

module.exports = router;
