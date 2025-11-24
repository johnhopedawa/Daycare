const { verifyToken } = require('../utils/jwt');
const pool = require('../db/pool');

/**
 * Unified authentication middleware for all user types (ADMIN, EDUCATOR, PARENT)
 * Attaches req.user for all types
 * For PARENT users, also attaches req.parent with parent-specific data
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Fetch full user info from users table
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, hourly_rate, is_active,
              annual_sick_days, annual_vacation_days, sick_days_remaining, vacation_days_remaining,
              carryover_enabled, date_employed, created_by
       FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = result.rows[0];

    // For PARENT users, also fetch parent-specific data
    if (req.user.role === 'PARENT' && decoded.parentId) {
      const parentResult = await pool.query(
        'SELECT id, first_name, last_name, email, phone, is_active FROM parents WHERE id = $1',
        [decoded.parentId]
      );

      if (parentResult.rows.length > 0) {
        req.parent = parentResult.rows[0];
      }
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
