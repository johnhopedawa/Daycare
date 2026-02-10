const express = require('express');
const pool = require('../db/pool');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All children routes require admin authentication
router.use(requireAuth, requireAdmin);

const childPhotoUploadDir = path.join(__dirname, '../../uploads/child-photos');

const childPhotoStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fsPromises.mkdir(childPhotoUploadDir, { recursive: true });
      cb(null, childPhotoUploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const childId = String(req.params.id || 'unknown');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `child-${childId}-${uniqueSuffix}${ext}`);
  }
});

const childPhotoUpload = multer({
  storage: childPhotoStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Invalid file type. Only JPG, PNG, and WEBP are allowed.'));
  },
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

// === CHILDREN MANAGEMENT ===

// Get all children
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;

    let query = `
      SELECT c.*,
             array_agg(
               DISTINCT jsonb_build_object(
                 'parent_id', p.id,
                 'parent_name', p.first_name || ' ' || p.last_name,
                 'parent_email', p.email,
                 'parent_phone', p.phone,
                 'relationship', pc.relationship,
                 'is_primary_contact', pc.is_primary_contact,
                 'has_billing_responsibility', pc.has_billing_responsibility
               )
             ) FILTER (WHERE p.id IS NOT NULL) as parents,
             (
               SELECT json_agg(
                 json_build_object(
                   'id', ec.id,
                   'name', ec.name,
                   'phone', ec.phone,
                   'relationship', ec.relationship,
                   'is_primary', ec.is_primary
                 ) ORDER BY ec.is_primary DESC, ec.id ASC
               )
               FROM emergency_contacts ec
               WHERE ec.child_id = c.id
             ) as emergency_contacts,
             (
               SELECT json_agg(
                 p2.first_name || ' ' || p2.last_name
                 ORDER BY pc2.is_primary_contact DESC, p2.last_name
               )
               FROM parent_children pc2
               JOIN parents p2 ON pc2.parent_id = p2.id
               WHERE pc2.child_id = c.id AND pc2.can_pickup = true
             ) as authorized_pickup
      FROM children c
      LEFT JOIN parent_children pc ON c.id = pc.child_id
      LEFT JOIN parents p ON pc.parent_id = p.id
      WHERE c.created_by = $1
    `;
    const params = [req.user.id];

    if (status) {
      params.push(status);
      query += ` AND c.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (c.first_name ILIKE $${params.length}
                      OR c.last_name ILIKE $${params.length})`;
    }

    query += ` GROUP BY c.id
               ORDER BY
                 CASE
                   WHEN c.status = 'WAITLIST' THEN c.waitlist_priority
                   ELSE NULL
                 END NULLS LAST,
                 c.last_name, c.first_name`;

    const result = await pool.query(query, params);
    res.json({ children: result.rows });
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

// Get single child with full details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const childResult = await pool.query(
      'SELECT * FROM children WHERE id = $1 AND created_by = $2',
      [id, req.user.id]
    );

    if (childResult.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const parentsResult = await pool.query(
      `SELECT p.*, pc.relationship, pc.is_primary_contact, pc.can_pickup, pc.has_billing_responsibility
       FROM parents p
       JOIN parent_children pc ON p.id = pc.parent_id
       WHERE pc.child_id = $1
       ORDER BY pc.is_primary_contact DESC, p.last_name`,
      [id]
    );

    res.json({
      child: childResult.rows[0],
      parents: parentsResult.rows
    });
  } catch (error) {
    console.error('Get child error:', error);
    res.status(500).json({ error: 'Failed to fetch child' });
  }
});

// Upload/replace child profile photo (separate from documents/files)
router.post('/:id/photo', childPhotoUpload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    const childResult = await pool.query(
      `SELECT id, profile_photo_path
       FROM children
       WHERE id = $1 AND created_by = $2`,
      [id, req.user.id]
    );

    if (childResult.rows.length === 0) {
      try {
        await fsPromises.unlink(req.file.path);
      } catch (unlinkError) {
        // ignore cleanup failures
      }
      return res.status(404).json({ error: 'Child not found' });
    }

    const previousPhotoPath = childResult.rows[0].profile_photo_path;

    await pool.query(
      `UPDATE children
       SET profile_photo_path = $1,
           profile_photo_original_filename = $2,
           profile_photo_mime_type = $3,
           profile_photo_updated_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND created_by = $5`,
      [req.file.path, req.file.originalname, req.file.mimetype, id, req.user.id]
    );

    if (previousPhotoPath && previousPhotoPath !== req.file.path) {
      try {
        await fsPromises.unlink(previousPhotoPath);
      } catch (unlinkError) {
        // ignore cleanup failures
      }
    }

    return res.json({
      message: 'Profile photo updated',
      profile_photo: {
        has_photo: true,
        original_filename: req.file.originalname,
        mime_type: req.file.mimetype
      }
    });
  } catch (error) {
    if (req.file?.path) {
      try {
        await fsPromises.unlink(req.file.path);
      } catch (unlinkError) {
        // ignore cleanup failures
      }
    }
    console.error('Upload child profile photo error:', error);
    return res.status(500).json({ error: 'Failed to upload profile photo' });
  }
});

// Download child profile photo
router.get('/:id/photo', async (req, res) => {
  try {
    const { id } = req.params;

    const childResult = await pool.query(
      `SELECT id, profile_photo_path, profile_photo_mime_type, profile_photo_original_filename
       FROM children
       WHERE id = $1 AND created_by = $2`,
      [id, req.user.id]
    );

    if (childResult.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const child = childResult.rows[0];
    if (!child.profile_photo_path) {
      return res.status(404).json({ error: 'No profile photo found' });
    }

    try {
      await fsPromises.access(child.profile_photo_path);
    } catch (accessError) {
      await pool.query(
        `UPDATE children
         SET profile_photo_path = NULL,
             profile_photo_original_filename = NULL,
             profile_photo_mime_type = NULL,
             profile_photo_updated_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND created_by = $2`,
        [id, req.user.id]
      );
      return res.status(404).json({ error: 'Profile photo missing from storage. Please upload again.' });
    }

    if (child.profile_photo_mime_type) {
      res.setHeader('Content-Type', child.profile_photo_mime_type);
    }

    return res.sendFile(path.resolve(child.profile_photo_path), (sendError) => {
      if (!sendError) return;
      if (res.headersSent) return;
      if (sendError.code === 'ENOENT') {
        return res.status(404).json({ error: 'Profile photo missing from storage. Please upload again.' });
      }
      console.error('Send child profile photo error:', sendError);
      return res.status(500).json({ error: 'Failed to load profile photo' });
    });
  } catch (error) {
    console.error('Get child profile photo error:', error);
    return res.status(500).json({ error: 'Failed to load profile photo' });
  }
});

// Remove child profile photo
router.delete('/:id/photo', async (req, res) => {
  try {
    const { id } = req.params;

    const childResult = await pool.query(
      `SELECT id, profile_photo_path
       FROM children
       WHERE id = $1 AND created_by = $2`,
      [id, req.user.id]
    );

    if (childResult.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const existingPhotoPath = childResult.rows[0].profile_photo_path;

    await pool.query(
      `UPDATE children
       SET profile_photo_path = NULL,
           profile_photo_original_filename = NULL,
           profile_photo_mime_type = NULL,
           profile_photo_updated_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND created_by = $2`,
      [id, req.user.id]
    );

    if (existingPhotoPath) {
      try {
        await fsPromises.unlink(existingPhotoPath);
      } catch (unlinkError) {
        // ignore cleanup failures
      }
    }

    return res.json({ message: 'Profile photo removed' });
  } catch (error) {
    console.error('Delete child profile photo error:', error);
    return res.status(500).json({ error: 'Failed to remove profile photo' });
  }
});

// Create child
router.post('/', async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      date_of_birth,
      enrollment_start_date,
      enrollment_end_date,
      status,
      monthly_rate,
      billing_cycle,
      allergies,
      medical_notes,
      notes,
      parent_ids // Array of parent IDs to link
    } = req.body;

    if (!first_name || !last_name || !date_of_birth || !enrollment_start_date) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const childStatus = status || 'ACTIVE';
      let waitlistPriority = null;

      // Auto-assign waitlist priority if status is WAITLIST
      if (childStatus === 'WAITLIST') {
        const maxPriorityResult = await client.query(
          'SELECT MAX(waitlist_priority) as max_priority FROM children WHERE status = $1 AND created_by = $2',
          ['WAITLIST', req.user.id]
        );
        const maxPriority = maxPriorityResult.rows[0].max_priority;
        waitlistPriority = (maxPriority || 0) + 1;
      }

      // Create child
      const childResult = await client.query(
        `INSERT INTO children (
          first_name, last_name, date_of_birth, enrollment_start_date,
          enrollment_end_date, status, monthly_rate, billing_cycle,
          allergies, medical_notes, notes, waitlist_priority, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          first_name, last_name, date_of_birth, enrollment_start_date,
          enrollment_end_date || null, childStatus,
          monthly_rate || null, billing_cycle || 'MONTHLY',
          allergies || null, medical_notes || null, notes || null,
          waitlistPriority, req.user.id
        ]
      );

      const child = childResult.rows[0];

      // Link to parents if provided
      if (parent_ids && Array.isArray(parent_ids) && parent_ids.length > 0) {
        for (let i = 0; i < parent_ids.length; i++) {
          const parentId = parent_ids[i];
          const isPrimary = i === 0; // First parent is primary by default

          await client.query(
            `INSERT INTO parent_children (
              parent_id, child_id, relationship, is_primary_contact,
              can_pickup, has_billing_responsibility
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [parentId, child.id, 'Parent', isPrimary, true, isPrimary]
          );
        }
      }

      await client.query('COMMIT');
      res.json({ child });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create child error:', error);
    res.status(500).json({ error: 'Failed to create child' });
  }
});

// Update child
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      date_of_birth,
      enrollment_start_date,
      enrollment_end_date,
      status,
      monthly_rate,
      billing_cycle,
      allergies,
      medical_notes,
      notes,
      waitlist_priority
    } = req.body;

    const updates = [];
    const params = [];

    if (first_name !== undefined) {
      params.push(first_name);
      updates.push(`first_name = $${params.length}`);
    }
    if (last_name !== undefined) {
      params.push(last_name);
      updates.push(`last_name = $${params.length}`);
    }
    if (date_of_birth !== undefined) {
      params.push(date_of_birth);
      updates.push(`date_of_birth = $${params.length}`);
    }
    if (enrollment_start_date !== undefined) {
      params.push(enrollment_start_date);
      updates.push(`enrollment_start_date = $${params.length}`);
    }
    if (enrollment_end_date !== undefined) {
      params.push(enrollment_end_date || null);
      updates.push(`enrollment_end_date = $${params.length}`);
    }
    if (status !== undefined) {
      params.push(status);
      updates.push(`status = $${params.length}`);
    }
    if (monthly_rate !== undefined) {
      params.push(monthly_rate || null);
      updates.push(`monthly_rate = $${params.length}`);
    }
    if (billing_cycle !== undefined) {
      params.push(billing_cycle);
      updates.push(`billing_cycle = $${params.length}`);
    }
    if (allergies !== undefined) {
      params.push(allergies || null);
      updates.push(`allergies = $${params.length}`);
    }
    if (medical_notes !== undefined) {
      params.push(medical_notes || null);
      updates.push(`medical_notes = $${params.length}`);
    }
    if (notes !== undefined) {
      params.push(notes || null);
      updates.push(`notes = $${params.length}`);
    }
    if (waitlist_priority !== undefined) {
      params.push(waitlist_priority || null);
      updates.push(`waitlist_priority = $${params.length}`);
    }

    // If changing TO waitlist status and priority not provided, auto-assign
    if (status === 'WAITLIST' && waitlist_priority === undefined) {
      const maxPriorityResult = await pool.query(
        'SELECT MAX(waitlist_priority) as max_priority FROM children WHERE status = $1 AND created_by = $2',
        ['WAITLIST', req.user.id]
      );
      const maxPriority = maxPriorityResult.rows[0].max_priority;
      const newPriority = (maxPriority || 0) + 1;
      params.push(newPriority);
      updates.push(`waitlist_priority = $${params.length}`);
    }

    // If changing FROM waitlist to another status, clear priority
    if (status !== undefined && status !== 'WAITLIST') {
      params.push(null);
      updates.push(`waitlist_priority = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(id);
    params.push(req.user.id);
    const query = `
      UPDATE children
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${params.length - 1} AND created_by = $${params.length}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    res.json({ child: result.rows[0] });
  } catch (error) {
    console.error('Update child error:', error);
    res.status(500).json({ error: 'Failed to update child' });
  }
});

// Delete child
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    // Get the child being deleted to check if on waitlist
    const childCheck = await client.query(
      'SELECT status, waitlist_priority, profile_photo_path FROM children WHERE id = $1 AND created_by = $2',
      [id, req.user.id]
    );

    if (childCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Child not found' });
    }

    const deletedChild = childCheck.rows[0];

    // Delete the child (CASCADE will handle related records)
    await client.query(
      'DELETE FROM children WHERE id = $1 AND created_by = $2',
      [id, req.user.id]
    );

    if (deletedChild.profile_photo_path) {
      try {
        await fsPromises.unlink(deletedChild.profile_photo_path);
      } catch (unlinkError) {
        // ignore cleanup failures
      }
    }

    // If child was on waitlist, reorder the priorities
    if (deletedChild.status === 'WAITLIST' && deletedChild.waitlist_priority) {
      // Decrement priority for all children with higher priority numbers (lower in the queue)
      await client.query(
        `UPDATE children
         SET waitlist_priority = waitlist_priority - 1
         WHERE status = 'WAITLIST'
         AND waitlist_priority > $1
         AND created_by = $2`,
        [deletedChild.waitlist_priority, req.user.id]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Child deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete child error:', error);
    res.status(500).json({ error: 'Failed to delete child' });
  } finally {
    client.release();
  }
});

// === PARENT-CHILD RELATIONSHIPS ===

// Link parent to child
router.post('/:childId/parents/:parentId', async (req, res) => {
  try {
    const { childId, parentId } = req.params;
    const {
      relationship,
      is_primary_contact,
      can_pickup,
      has_billing_responsibility
    } = req.body;

    // Verify child belongs to admin
    const childCheck = await pool.query(
      'SELECT id FROM children WHERE id = $1 AND created_by = $2',
      [childId, req.user.id]
    );

    if (childCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Verify parent exists
    const parentCheck = await pool.query(
      'SELECT id FROM parents WHERE id = $1',
      [parentId]
    );

    if (parentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    await pool.query(
      `INSERT INTO parent_children (
        parent_id, child_id, relationship, is_primary_contact,
        can_pickup, has_billing_responsibility
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (parent_id, child_id)
      DO UPDATE SET
        relationship = EXCLUDED.relationship,
        is_primary_contact = EXCLUDED.is_primary_contact,
        can_pickup = EXCLUDED.can_pickup,
        has_billing_responsibility = EXCLUDED.has_billing_responsibility`,
      [
        parentId,
        childId,
        relationship || 'Parent',
        is_primary_contact || false,
        can_pickup !== undefined ? can_pickup : true,
        has_billing_responsibility !== undefined ? has_billing_responsibility : true
      ]
    );

    res.json({ message: 'Parent linked to child successfully' });
  } catch (error) {
    console.error('Link parent to child error:', error);
    res.status(500).json({ error: 'Failed to link parent to child' });
  }
});

// Unlink parent from child
router.delete('/:childId/parents/:parentId', async (req, res) => {
  try {
    const { childId, parentId } = req.params;

    // Verify child belongs to admin
    const childCheck = await pool.query(
      'SELECT id FROM children WHERE id = $1 AND created_by = $2',
      [childId, req.user.id]
    );

    if (childCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    await pool.query(
      'DELETE FROM parent_children WHERE parent_id = $1 AND child_id = $2',
      [parentId, childId]
    );

    res.json({ message: 'Parent unlinked from child successfully' });
  } catch (error) {
    console.error('Unlink parent from child error:', error);
    res.status(500).json({ error: 'Failed to unlink parent from child' });
  }
});

module.exports = router;
