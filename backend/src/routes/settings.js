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
    const activeTheme = await getActiveTheme(pool, { role: 'ADMIN' });
    const activeParentTheme = await getActiveTheme(pool, { role: 'PARENT' });
    res.json({ settings, themes, active_theme: activeTheme, active_parent_theme: activeParentTheme });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.patch('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      tax_rate,
      tax_enabled,
      theme_id,
      parent_theme_id,
      daycare_name,
      address_line1,
      address_line2,
      city,
      province,
      postal_code,
      phone1,
      phone2,
      contact_name,
      contact_phone,
      contact_email,
      signature_name,
      signature_image,
      signature_mode
    } = req.body;
    await getDaycareSettings(pool);

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

    let parsedThemeId = null;
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

    let parsedParentThemeId = null;
    if (parent_theme_id !== undefined) {
      const parsed = parseInt(parent_theme_id, 10);
      if (!Number.isFinite(parsed)) {
        return res.status(400).json({ error: 'Parent theme id must be a number' });
      }
      const theme = await getThemeById(pool, parsed);
      if (!theme) {
        return res.status(400).json({ error: 'Selected parent theme does not exist' });
      }
      parsedParentThemeId = parsed;
    }

    const normalizeText = (value) => {
      if (value === undefined) {
        return undefined;
      }
      if (value === null) {
        return null;
      }
      const trimmed = String(value).trim();
      return trimmed === '' ? null : trimmed;
    };

    const updates = [];
    const params = [];

    const addUpdate = (field, value) => {
      params.push(value);
      updates.push(`${field} = $${params.length}`);
    };

    if (tax_rate !== undefined) {
      addUpdate('tax_rate', parseFloat(tax_rate));
    }

    if (tax_enabled !== undefined) {
      addUpdate('tax_enabled', !!tax_enabled);
    }

    if (theme_id !== undefined) {
      addUpdate('theme_id', parsedThemeId);
    }

    if (parent_theme_id !== undefined) {
      addUpdate('parent_theme_id', parsedParentThemeId);
    }

    const textFields = {
      daycare_name,
      address_line1,
      address_line2,
      city,
      province,
      postal_code,
      phone1,
      phone2,
      contact_name,
      contact_phone,
      contact_email,
      signature_name
    };

    Object.entries(textFields).forEach(([field, value]) => {
      const normalized = normalizeText(value);
      if (normalized !== undefined) {
        addUpdate(field, normalized);
      }
    });

    if (signature_image !== undefined) {
      if (signature_image === null || signature_image === '') {
        addUpdate('signature_image', null);
      } else {
        const normalizedImage = String(signature_image).trim();
        if (!normalizedImage.startsWith('data:image/')) {
          return res.status(400).json({ error: 'Signature image must be a data URL' });
        }
        if (normalizedImage.length > 200000) {
          return res.status(400).json({ error: 'Signature image is too large' });
        }
        addUpdate('signature_image', normalizedImage);
      }
    }

    if (signature_mode !== undefined) {
      const allowedModes = ['signature', 'name', 'both'];
      const normalizedMode = String(signature_mode).trim().toLowerCase();
      if (!allowedModes.includes(normalizedMode)) {
        return res.status(400).json({ error: 'Invalid signature mode' });
      }
      addUpdate('signature_mode', normalizedMode);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No settings updates provided' });
    }

    const query = `
      UPDATE daycare_settings
      SET ${updates.join(', ')},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
      RETURNING *
    `;

    const result = await pool.query(query, params);
    const activeTheme = await getActiveTheme(pool, { role: 'ADMIN' });
    const activeParentTheme = await getActiveTheme(pool, { role: 'PARENT' });

    res.json({ settings: result.rows[0], active_theme: activeTheme, active_parent_theme: activeParentTheme });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
