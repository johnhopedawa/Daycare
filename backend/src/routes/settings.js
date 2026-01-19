const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getDaycareSettings } = require('../services/settingsService');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const settings = await getDaycareSettings(pool);
    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.patch('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { tax_rate, tax_enabled } = req.body;
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

    if (tax_rate === undefined && tax_enabled === undefined) {
      return res.status(400).json({ error: 'No settings updates provided' });
    }

    const finalTaxRate = tax_rate !== undefined ? parseFloat(tax_rate) : current.tax_rate;
    const finalTaxEnabled = tax_enabled !== undefined ? !!tax_enabled : current.tax_enabled;

    const query = `
      UPDATE daycare_settings
      SET tax_rate = $1,
          tax_enabled = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
      RETURNING *
    `;

    const result = await pool.query(query, [finalTaxRate, finalTaxEnabled]);

    res.json({ settings: result.rows[0] });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
