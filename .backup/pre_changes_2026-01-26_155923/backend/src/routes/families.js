const express = require('express');
const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require admin
router.use(requireAuth, requireAdmin);

// Get all families (aggregated view of parents + children)
router.get('/', async (req, res) => {
  try {
    // Get all children with their parents
    const result = await pool.query(`
      SELECT
        c.id as child_id,
        c.first_name as child_first_name,
        c.last_name as child_last_name,
        c.date_of_birth,
        c.status as child_status,
        c.monthly_rate,
        c.billing_cycle,
        c.allergies,
        c.medical_notes,
        c.notes,
        json_agg(
          json_build_object(
            'parent_id', p.id,
            'parent_first_name', p.first_name,
            'parent_last_name', p.last_name,
            'parent_email', p.email,
            'parent_phone', p.phone,
            'user_id', p.user_id,
            'is_primary_contact', pc.is_primary_contact,
            'has_billing_responsibility', pc.has_billing_responsibility,
            'is_active', p.is_active
          ) ORDER BY pc.is_primary_contact DESC
        ) FILTER (WHERE p.id IS NOT NULL) as parents
      FROM children c
      LEFT JOIN parent_children pc ON c.id = pc.child_id
      LEFT JOIN parents p ON pc.parent_id = p.id
      WHERE c.created_by = $1
      GROUP BY c.id
      ORDER BY c.last_name, c.first_name
    `, [req.user.id]);

    // Group children by family (using parent combinations as family identifier)
    const familiesMap = new Map();

    result.rows.forEach(child => {
      // Create a family key based on parent IDs (sorted for consistency)
      const parentIds = (child.parents || [])
        .map(p => p.parent_id)
        .sort()
        .join('-');

      const familyKey = parentIds || `orphan-${child.child_id}`;

      if (!familiesMap.has(familyKey)) {
        familiesMap.set(familyKey, {
          family_id: familyKey,
          parents: child.parents || [],
          children: [],
          primary_parent: (child.parents || []).find(p => p.is_primary_contact) || (child.parents || [])[0],
          total_monthly_rate: 0,
          all_accounts_active: true
        });
      }

      const family = familiesMap.get(familyKey);
      family.children.push({
        id: child.child_id,
        first_name: child.child_first_name,
        last_name: child.child_last_name,
        date_of_birth: child.date_of_birth,
        status: child.child_status,
        monthly_rate: child.monthly_rate,
        billing_cycle: child.billing_cycle,
        allergies: child.allergies,
        medical_notes: child.medical_notes,
        notes: child.notes
      });

      if (child.monthly_rate) {
        family.total_monthly_rate += parseFloat(child.monthly_rate);
      }

      // Check if any parent account is inactive
      if (child.parents && child.parents.some(p => !p.is_active)) {
        family.all_accounts_active = false;
      }
    });

    const families = Array.from(familiesMap.values());

    res.json({ families });
  } catch (error) {
    console.error('Get families error:', error);
    res.status(500).json({ error: 'Failed to fetch families' });
  }
});

// Create new family (parent(s) + child)
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      parent1FirstName,
      parent1LastName,
      parent1Email,
      parent1Phone,
      parent2FirstName,
      parent2LastName,
      parent2Email,
      parent2Phone,
      childFirstName,
      childLastName,
      childDob,
      childStatus,
      childMonthlyRate,
      allergies,
      medical_notes,
      notes,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship
    } = req.body;

    // Validate required fields
    if (!parent1FirstName || !parent1LastName || !parent1Email || !childFirstName || !childLastName || !childDob) {
      return res.status(400).json({ error: 'Parent 1 and child information are required' });
    }

    // Generate default password from child DOB (MMYYYY format)
    const dob = new Date(childDob);
    const month = String(dob.getMonth() + 1).padStart(2, '0');
    const year = dob.getFullYear();
    const defaultPassword = `${month}${year}`;

    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const passwords = [];
    const parentIds = [];

    // Create Parent 1
    const existingUser1 = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [parent1Email]
    );

    if (existingUser1.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Email ${parent1Email} already in use` });
    }

    const userResult1 = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, 'PARENT', true)
       RETURNING id`,
      [parent1Email, passwordHash, parent1FirstName, parent1LastName]
    );

    const userId1 = userResult1.rows[0].id;

    const parentResult1 = await client.query(
      `INSERT INTO parents (first_name, last_name, email, phone, notes, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [parent1FirstName, parent1LastName, parent1Email, parent1Phone || null, notes || null, userId1]
    );

    parentIds.push(parentResult1.rows[0].id);
    passwords.push({ email: parent1Email, password: defaultPassword });

    // Create Parent 2 (optional)
    if (parent2FirstName && parent2LastName && parent2Email) {
      const existingUser2 = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [parent2Email]
      );

      if (existingUser2.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Email ${parent2Email} already in use` });
      }

      const userResult2 = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
         VALUES ($1, $2, $3, $4, 'PARENT', true)
         RETURNING id`,
        [parent2Email, passwordHash, parent2FirstName, parent2LastName]
      );

      const userId2 = userResult2.rows[0].id;

      const parentResult2 = await client.query(
        `INSERT INTO parents (first_name, last_name, email, phone, notes, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [parent2FirstName, parent2LastName, parent2Email, parent2Phone || null, notes || null, userId2]
      );

      parentIds.push(parentResult2.rows[0].id);
      passwords.push({ email: parent2Email, password: defaultPassword });
    }

    // Create Child
    // Convert allergies object to JSON string if provided
    const allergiesJson = allergies ? JSON.stringify(allergies) : null;
    const status = childStatus || 'ACTIVE';

    // Auto-assign waitlist priority if status is WAITLIST
    let waitlistPriority = null;
    if (status === 'WAITLIST') {
      const maxPriorityResult = await client.query(
        'SELECT MAX(waitlist_priority) as max_priority FROM children WHERE status = $1 AND created_by = $2',
        ['WAITLIST', req.user.id]
      );
      const maxPriority = maxPriorityResult.rows[0].max_priority;
      waitlistPriority = (maxPriority || 0) + 1;
    }

    const childResult = await client.query(
      `INSERT INTO children (
        first_name, last_name, date_of_birth, enrollment_start_date,
        status, billing_cycle, monthly_rate, allergies, medical_notes, notes, waitlist_priority, created_by
      ) VALUES ($1, $2, $3, CURRENT_DATE, $4, 'MONTHLY', $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        childFirstName,
        childLastName,
        childDob,
        status,
        childMonthlyRate ? parseFloat(childMonthlyRate) : null,
        allergiesJson,
        medical_notes || null,
        notes || null,
        waitlistPriority,
        req.user.id
      ]
    );

    const child = childResult.rows[0];

    // Link parents to child
    for (let i = 0; i < parentIds.length; i++) {
      const isPrimary = i === 0; // First parent is primary
      await client.query(
        `INSERT INTO parent_children (
          parent_id, child_id, relationship, is_primary_contact,
          can_pickup, has_billing_responsibility
        ) VALUES ($1, $2, 'Parent', $3, true, $4)`,
        [parentIds[i], child.id, isPrimary, isPrimary]
      );
    }

    // Create emergency contact in new table if provided
    if (emergency_contact_name || emergency_contact_phone) {
      await client.query(
        `INSERT INTO emergency_contacts (
          child_id, name, phone, relationship, is_primary
        ) VALUES ($1, $2, $3, $4, true)`,
        [
          child.id,
          emergency_contact_name || null,
          emergency_contact_phone || null,
          emergency_contact_relationship || null
        ]
      );
    }

    await client.query('COMMIT');
    res.json({
      message: 'Family created successfully',
      passwords: passwords,
      child: child
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create family error:', error);
    res.status(500).json({ error: 'Failed to create family' });
  } finally {
    client.release();
  }
});

// Toggle family account status (activate/deactivate all parent accounts in family)
router.patch('/:familyId/toggle-status', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { familyId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    // Parse family ID (format: "parentId1-parentId2" or "orphan-childId")
    if (familyId.startsWith('orphan-')) {
      return res.status(400).json({ error: 'Cannot toggle status for families without parent accounts' });
    }

    const parentIds = familyId.split('-').map(id => parseInt(id));

    // Update all parent accounts
    for (const parentId of parentIds) {
      // Get user_id from parent
      const parentResult = await client.query(
        'SELECT user_id FROM parents WHERE id = $1',
        [parentId]
      );

      if (parentResult.rows.length === 0) {
        continue;
      }

      const userId = parentResult.rows[0].user_id;

      if (userId) {
        // Update user account status
        await client.query(
          'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [isActive, userId]
        );

        // Update parent record status
        await client.query(
          'UPDATE parents SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [isActive, parentId]
        );
      }
    }

    await client.query('COMMIT');
    res.json({
      message: `Family accounts ${isActive ? 'activated' : 'deactivated'} successfully`,
      isActive
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Toggle family status error:', error);
    res.status(500).json({ error: 'Failed to toggle family status' });
  } finally {
    client.release();
  }
});

// Delete family (removes all children and optionally parent accounts)
router.delete('/:familyId', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { familyId } = req.params;
    const { deleteParents } = req.query; // ?deleteParents=true to also delete parent records

    // Parse family ID
    let childIds = [];
    let parentIds = [];

    if (familyId.startsWith('orphan-')) {
      const childId = parseInt(familyId.replace('orphan-', ''));
      childIds.push(childId);
    } else {
      parentIds = familyId.split('-').map(id => parseInt(id));

      // Get all children for these parents
      const childrenResult = await client.query(
        `SELECT DISTINCT c.id
         FROM children c
         JOIN parent_children pc ON c.id = pc.child_id
         WHERE pc.parent_id = ANY($1)
         AND c.created_by = $2`,
        [parentIds, req.user.id]
      );

      childIds = childrenResult.rows.map(row => row.id);
    }

    // Delete children (CASCADE will handle parent_children links)
    if (childIds.length > 0) {
      await client.query(
        'DELETE FROM children WHERE id = ANY($1) AND created_by = $2',
        [childIds, req.user.id]
      );
    }

    // Optionally delete parent records and user accounts
    if (deleteParents === 'true' && parentIds.length > 0) {
      for (const parentId of parentIds) {
        const parentResult = await client.query(
          'SELECT user_id FROM parents WHERE id = $1',
          [parentId]
        );

        if (parentResult.rows.length > 0) {
          const userId = parentResult.rows[0].user_id;

          // Delete user account if it exists
          if (userId) {
            await client.query(
              'DELETE FROM users WHERE id = $1',
              [userId]
            );
          }

          // Also delete the parent record itself (since CASCADE only sets user_id to NULL)
          await client.query(
            'DELETE FROM parents WHERE id = $1',
            [parentId]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({
      message: 'Family deleted successfully',
      childrenDeleted: childIds.length,
      parentsDeleted: deleteParents === 'true' ? parentIds.length : 0
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete family error:', error);
    res.status(500).json({ error: 'Failed to delete family' });
  } finally {
    client.release();
  }
});

module.exports = router;
