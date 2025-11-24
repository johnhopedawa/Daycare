const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All file routes require admin authentication
router.use(requireAuth, requireAdmin);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword' // .doc
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, PNG, and DOCX files are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  }
});

// === DOCUMENT MANAGEMENT ===

// Get all documents
router.get('/', async (req, res) => {
  try {
    const { category_id, search, linked_child_id, linked_parent_id } = req.query;

    let query = `
      SELECT d.*, dc.name as category_name,
             u.first_name as uploaded_by_first_name,
             u.last_name as uploaded_by_last_name
      FROM documents d
      LEFT JOIN document_categories dc ON d.category_id = dc.id
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.created_by = $1
    `;
    const params = [req.user.id];

    if (category_id) {
      params.push(category_id);
      query += ` AND d.category_id = $${params.length}`;
    }

    if (linked_child_id) {
      params.push(linked_child_id);
      query += ` AND d.linked_child_id = $${params.length}`;
    }

    if (linked_parent_id) {
      params.push(linked_parent_id);
      query += ` AND d.linked_parent_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (d.original_filename ILIKE $${params.length}
                      OR d.description ILIKE $${params.length}
                      OR EXISTS (SELECT 1 FROM unnest(d.tags) AS tag WHERE tag ILIKE $${params.length}))`;
    }

    query += ' ORDER BY d.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ documents: result.rows });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Upload document
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { category_id, tags, description, linked_child_id, linked_parent_id } = req.body;

    // Parse tags if provided
    let tagsArray = [];
    if (tags) {
      try {
        tagsArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        tagsArray = typeof tags === 'string' ? [tags] : [];
      }
    }

    const result = await pool.query(
      `INSERT INTO documents (
        original_filename, stored_filename, file_path, file_size, mime_type,
        category_id, tags, description, linked_child_id, linked_parent_id,
        uploaded_by, created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        req.file.originalname,
        req.file.filename,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        category_id || null,
        tagsArray,
        description || null,
        linked_child_id || null,
        linked_parent_id || null,
        req.user.id,
        req.user.id
      ]
    );

    res.json({ document: result.rows[0] });
  } catch (error) {
    console.error('Upload document error:', error);
    // Delete file if database insert failed
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Download/view document
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM documents WHERE id = $1 AND created_by = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = result.rows[0];

    // Send file
    res.download(document.file_path, document.original_filename);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// Update document metadata
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, tags, description, linked_child_id, linked_parent_id } = req.body;

    const updates = [];
    const params = [];

    if (category_id !== undefined) {
      params.push(category_id || null);
      updates.push(`category_id = $${params.length}`);
    }

    if (tags !== undefined) {
      let tagsArray = [];
      if (tags) {
        try {
          tagsArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
        } catch (e) {
          tagsArray = typeof tags === 'string' ? [tags] : [];
        }
      }
      params.push(tagsArray);
      updates.push(`tags = $${params.length}`);
    }

    if (description !== undefined) {
      params.push(description || null);
      updates.push(`description = $${params.length}`);
    }

    if (linked_child_id !== undefined) {
      params.push(linked_child_id || null);
      updates.push(`linked_child_id = $${params.length}`);
    }

    if (linked_parent_id !== undefined) {
      params.push(linked_parent_id || null);
      updates.push(`linked_parent_id = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(id);
    params.push(req.user.id);
    const query = `
      UPDATE documents
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${params.length - 1} AND created_by = $${params.length}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ document: result.rows[0] });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM documents WHERE id = $1 AND created_by = $2 RETURNING file_path',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from disk
    try {
      await fs.unlink(result.rows[0].file_path);
    } catch (unlinkError) {
      console.error('Error deleting file from disk:', unlinkError);
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// === CATEGORY MANAGEMENT ===

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM document_categories WHERE created_by = $1 ORDER BY name',
      [req.user.id]
    );
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category
router.post('/categories', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const result = await pool.query(
      'INSERT INTO document_categories (name, created_by) VALUES ($1, $2) RETURNING *',
      [name, req.user.id]
    );

    res.json({ category: result.rows[0] });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.patch('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const result = await pool.query(
      `UPDATE document_categories
       SET name = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND created_by = $3
       RETURNING *`,
      [name, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ category: result.rows[0] });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM document_categories WHERE id = $1 AND created_by = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
