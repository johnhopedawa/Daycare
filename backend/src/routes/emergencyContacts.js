const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

// Get all emergency contacts for a child
router.get('/children/:childId/emergency-contacts', requireAuth, async (req, res) => {
  try {
    const { childId } = req.params;

    const result = await pool.query(
      `SELECT * FROM emergency_contacts
       WHERE child_id = $1
       ORDER BY is_primary DESC, id ASC`,
      [childId]
    );

    res.json({ emergencyContacts: result.rows });
  } catch (error) {
    console.error('Get emergency contacts error:', error);
    res.status(500).json({ error: 'Failed to fetch emergency contacts' });
  }
});

// Add emergency contact
router.post('/children/:childId/emergency-contacts', requireAuth, async (req, res) => {
  try {
    const { childId } = req.params;
    const { name, phone, relationship, is_primary } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // If this is being set as primary, unset any other primary contacts
    if (is_primary) {
      await pool.query(
        'UPDATE emergency_contacts SET is_primary = false WHERE child_id = $1',
        [childId]
      );
    }

    const result = await pool.query(
      `INSERT INTO emergency_contacts (child_id, name, phone, relationship, is_primary)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [childId, name, phone, relationship, is_primary || false]
    );

    res.json({ emergencyContact: result.rows[0] });
  } catch (error) {
    console.error('Create emergency contact error:', error);
    res.status(500).json({ error: 'Failed to create emergency contact' });
  }
});

// Update emergency contact
router.patch('/emergency-contacts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, relationship, is_primary } = req.body;

    // Get the child_id for this contact
    const contactResult = await pool.query(
      'SELECT child_id FROM emergency_contacts WHERE id = $1',
      [id]
    );

    if (contactResult.rows.length === 0) {
      return res.status(404).json({ error: 'Emergency contact not found' });
    }

    const childId = contactResult.rows[0].child_id;

    // If this is being set as primary, unset any other primary contacts
    if (is_primary) {
      await pool.query(
        'UPDATE emergency_contacts SET is_primary = false WHERE child_id = $1 AND id != $2',
        [childId, id]
      );
    }

    const result = await pool.query(
      `UPDATE emergency_contacts
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           relationship = COALESCE($3, relationship),
           is_primary = COALESCE($4, is_primary),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [name, phone, relationship, is_primary, id]
    );

    res.json({ emergencyContact: result.rows[0] });
  } catch (error) {
    console.error('Update emergency contact error:', error);
    res.status(500).json({ error: 'Failed to update emergency contact' });
  }
});

// Delete emergency contact
router.delete('/emergency-contacts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM emergency_contacts WHERE id = $1', [id]);

    res.json({ message: 'Emergency contact deleted' });
  } catch (error) {
    console.error('Delete emergency contact error:', error);
    res.status(500).json({ error: 'Failed to delete emergency contact' });
  }
});

module.exports = router;
