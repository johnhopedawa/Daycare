const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireStaff } = require('../middleware/auth');
const { getOwnerId } = require('../utils/owner');

const router = express.Router();

const getLimit = (rawLimit, fallback = 20, max = 100) => {
  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
};

const normalizeText = (value) => {
  const text = String(value || '').trim();
  return text.length > 0 ? text : null;
};

const normalizeTimestamp = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) {
    return Number.NaN;
  }
  return new Date(parsed).toISOString();
};

const loadOwnerIdsForParent = async ({ parentId, userCreatedBy }) => {
  const ownerIds = new Set();

  const childOwners = await pool.query(
    `SELECT DISTINCT c.created_by
     FROM parent_children pc
     JOIN children c ON pc.child_id = c.id
     WHERE pc.parent_id = $1
       AND c.created_by IS NOT NULL`,
    [parentId]
  );
  childOwners.rows.forEach((row) => ownerIds.add(row.created_by));

  if (userCreatedBy) {
    ownerIds.add(userCreatedBy);
  }

  if (ownerIds.size === 0) {
    const adminOwners = await pool.query(
      `SELECT id
       FROM users
       WHERE role = 'ADMIN' AND is_active = true
       ORDER BY id ASC`
    );
    if (adminOwners.rows.length === 1) {
      ownerIds.add(adminOwners.rows[0].id);
    }
  }

  return Array.from(ownerIds);
};

router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = getLimit(req.query.limit, 20, 200);
    let query;
    let params;

    if (req.user.role === 'PARENT') {
      if (!req.parent) {
        return res.status(403).json({ error: 'Parent access required' });
      }

      const ownerIds = await loadOwnerIdsForParent({
        parentId: req.parent.id,
        userCreatedBy: req.user.created_by,
      });

      if (ownerIds.length === 0) {
        return res.json({ newsletters: [] });
      }

      query = `
        SELECT
          n.*,
          u.first_name AS created_by_first_name,
          u.last_name AS created_by_last_name,
          uu.first_name AS updated_by_first_name,
          uu.last_name AS updated_by_last_name
        FROM newsletters n
        LEFT JOIN users u ON u.id = n.created_by
        LEFT JOIN users uu ON uu.id = n.updated_by
        WHERE n.owner_id = ANY($1::int[])
          AND n.is_published = true
        ORDER BY COALESCE(n.published_at, n.created_at) DESC
        LIMIT $2
      `;
      params = [ownerIds, limit];
    } else if (['ADMIN', 'EDUCATOR'].includes(req.user.role)) {
      const ownerId = getOwnerId(req.user);
      query = `
        SELECT
          n.*,
          u.first_name AS created_by_first_name,
          u.last_name AS created_by_last_name,
          uu.first_name AS updated_by_first_name,
          uu.last_name AS updated_by_last_name
        FROM newsletters n
        LEFT JOIN users u ON u.id = n.created_by
        LEFT JOIN users uu ON uu.id = n.updated_by
        WHERE n.owner_id = $1
        ORDER BY COALESCE(n.published_at, n.created_at) DESC
        LIMIT $2
      `;
      params = [ownerId, limit];
    } else {
      return res.status(403).json({ error: 'Unauthorized role' });
    }

    const result = await pool.query(query, params);
    return res.json({ newsletters: result.rows });
  } catch (error) {
    console.error('Get newsletters error:', error);
    return res.status(500).json({ error: 'Failed to fetch newsletters' });
  }
});

router.post('/', requireAuth, requireStaff, async (req, res) => {
  try {
    const title = normalizeText(req.body.title);
    const body = normalizeText(req.body.body);
    const imageUrl = normalizeText(req.body.image_url);
    const ownerId = getOwnerId(req.user);

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!body) {
      return res.status(400).json({ error: 'Body is required' });
    }

    const isPublished = req.body.is_published === undefined ? true : Boolean(req.body.is_published);
    const requestedPublishedAt = normalizeTimestamp(req.body.published_at);
    if (Number.isNaN(requestedPublishedAt)) {
      return res.status(400).json({ error: 'published_at must be a valid datetime' });
    }
    const publishedAt = isPublished
      ? (requestedPublishedAt || new Date().toISOString())
      : null;

    const result = await pool.query(
      `INSERT INTO newsletters (
         owner_id,
         title,
         body,
         image_url,
         is_published,
         published_at,
         created_by,
         updated_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
       RETURNING *`,
      [ownerId, title, body, imageUrl, isPublished, publishedAt, req.user.id]
    );

    return res.status(201).json({ newsletter: result.rows[0] });
  } catch (error) {
    console.error('Create newsletter error:', error);
    return res.status(500).json({ error: 'Failed to create newsletter' });
  }
});

router.patch('/:id', requireAuth, requireStaff, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid newsletter id' });
    }

    const ownerId = getOwnerId(req.user);
    const existing = await pool.query(
      'SELECT * FROM newsletters WHERE id = $1 AND owner_id = $2 LIMIT 1',
      [id, ownerId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    const current = existing.rows[0];
    const nextTitle = req.body.title === undefined ? current.title : normalizeText(req.body.title);
    const nextBody = req.body.body === undefined ? current.body : normalizeText(req.body.body);
    const nextImageUrl = req.body.image_url === undefined ? current.image_url : normalizeText(req.body.image_url);
    const nextIsPublished = req.body.is_published === undefined
      ? current.is_published
      : Boolean(req.body.is_published);

    if (!nextTitle) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!nextBody) {
      return res.status(400).json({ error: 'Body is required' });
    }

    let nextPublishedAt = current.published_at;
    if (req.body.published_at !== undefined) {
      const requestedPublishedAt = normalizeTimestamp(req.body.published_at);
      if (Number.isNaN(requestedPublishedAt)) {
        return res.status(400).json({ error: 'published_at must be a valid datetime' });
      }
      nextPublishedAt = requestedPublishedAt;
    } else if (nextIsPublished && !current.published_at) {
      nextPublishedAt = new Date().toISOString();
    } else if (!nextIsPublished) {
      nextPublishedAt = null;
    }

    const result = await pool.query(
      `UPDATE newsletters
       SET title = $1,
           body = $2,
           image_url = $3,
           is_published = $4,
           published_at = $5,
           updated_by = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [nextTitle, nextBody, nextImageUrl, nextIsPublished, nextPublishedAt, req.user.id, id]
    );

    return res.json({ newsletter: result.rows[0] });
  } catch (error) {
    console.error('Update newsletter error:', error);
    return res.status(500).json({ error: 'Failed to update newsletter' });
  }
});

router.delete('/:id', requireAuth, requireStaff, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid newsletter id' });
    }

    const ownerId = getOwnerId(req.user);
    const result = await pool.query(
      'DELETE FROM newsletters WHERE id = $1 AND owner_id = $2 RETURNING id',
      [id, ownerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete newsletter error:', error);
    return res.status(500).json({ error: 'Failed to delete newsletter' });
  }
});

module.exports = router;
