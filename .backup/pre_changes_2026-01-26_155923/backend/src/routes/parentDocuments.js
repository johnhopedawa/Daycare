const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireParent } = require('../middleware/auth');
const path = require('path');

const router = express.Router();

// All routes require authentication
router.use(requireAuth, requireParent);

// Get documents accessible to parent
router.get('/', async (req, res) => {
  try {
    // Get parent's children IDs
    const childrenResult = await pool.query(
      'SELECT child_id FROM parent_children WHERE parent_id = $1',
      [req.parent.id]
    );

    const childIds = childrenResult.rows.map(row => row.child_id);

    if (childIds.length === 0) {
      return res.json({ documents: [] });
    }

    // Get documents linked to parent's children or parent themselves
    // that have 'PARENT' in can_view_roles
    const result = await pool.query(
      `SELECT d.*, dc.name as category_name
       FROM documents d
       LEFT JOIN document_categories dc ON d.category_id = dc.id
       WHERE (d.linked_child_id = ANY($1) OR d.linked_parent_id = $2)
       AND d.can_view_roles::jsonb ? 'PARENT'
       ORDER BY d.created_at DESC`,
      [childIds, req.parent.id]
    );

    res.json({ documents: result.rows });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get documents for a specific child
router.get('/child/:childId', async (req, res) => {
  try {
    const { childId } = req.params;

    // Verify parent has access to this child
    const accessCheck = await pool.query(
      'SELECT 1 FROM parent_children WHERE parent_id = $1 AND child_id = $2',
      [req.parent.id, childId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Get documents for this child
    const result = await pool.query(
      `SELECT d.*, dc.name as category_name
       FROM documents d
       LEFT JOIN document_categories dc ON d.category_id = dc.id
       WHERE d.linked_child_id = $1
       AND d.can_view_roles::jsonb ? 'PARENT'
       ORDER BY d.created_at DESC`,
      [childId]
    );

    res.json({ documents: result.rows });
  } catch (error) {
    console.error('Get child documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Download document
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    // Get parent's children IDs
    const childrenResult = await pool.query(
      'SELECT child_id FROM parent_children WHERE parent_id = $1',
      [req.parent.id]
    );

    const childIds = childrenResult.rows.map(row => row.child_id);

    // Get document and verify access
    const result = await pool.query(
      `SELECT * FROM documents
       WHERE id = $1
       AND (linked_child_id = ANY($2) OR linked_parent_id = $3)
       AND can_view_roles::jsonb ? 'PARENT'`,
      [id, childIds, req.parent.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = result.rows[0];

    res.download(document.file_path, document.original_filename);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

module.exports = router;
