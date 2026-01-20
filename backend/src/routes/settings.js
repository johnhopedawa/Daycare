const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getDaycareSettings } = require('../services/settingsService');
const { getAllThemes, getThemeById, getActiveTheme } = require('../services/themesService');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const settings = await getDaycareSettings(pool);
    const themes = await getAllThemes(pool);
    const activeTheme = await getActiveTheme(pool);
    res.json({ settings, themes, active_theme: activeTheme });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.patch('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { tax_rate, tax_enabled, theme_id } = req.body;
    const current = await getDaycareSettings(pool);

    if (tax_rate !== undefined) {
      const parsed = parseFloat(tax_rate);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
        return res.status(400).json({ error: 'Tax rate must be between 0 and 1' });
      }
      // validated below
    }

    if (tax_enabled !== undefined) {
      // validated below
    }

    let parsedThemeId = current.theme_id || 1;
    if (theme_id !== undefined) {
      const parsed = parseInt(theme_id, 10);
      if (!Number.isFinite(parsed)) {
        return res.status(400).json({ error: 'Theme id must be a number' });
      }
      const theme = await getThemeById(pool, parsed);
      if (!theme) {
        return res.status(400).json({ error: 'Selected theme does not exist' });
      }
      parsedThemeId = parsed;
    }

    if (tax_rate === undefined && tax_enabled === undefined && theme_id === undefined) {
      return res.status(400).json({ error: 'No settings updates provided' });
    }

    const finalTaxRate = tax_rate !== undefined ? parseFloat(tax_rate) : current.tax_rate;
    const finalTaxEnabled = tax_enabled !== undefined ? !!tax_enabled : current.tax_enabled;

    const query = `
      UPDATE daycare_settings
      SET tax_rate = $1,
          tax_enabled = $2,
          theme_id = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
      RETURNING *
    `;

    const result = await pool.query(query, [finalTaxRate, finalTaxEnabled, parsedThemeId]);
    const activeTheme = await getActiveTheme(pool);

    res.json({ settings: result.rows[0], active_theme: activeTheme });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
