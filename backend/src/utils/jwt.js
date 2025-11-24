const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

/**
 * Generate a unified JWT token for all user types
 * @param {Object} payload - Must include: id, email, role
 * @param {Number} payload.parentId - Optional, only for PARENT role users
 * @returns {String} JWT token
 */
function generateToken(payload) {
  const tokenData = {
    id: payload.id,
    email: payload.email,
    role: payload.role,
  };

  // For PARENT users, include parentId for parent-specific data lookups
  if (payload.parentId) {
    tokenData.parentId = payload.parentId;
  }

  return jwt.sign(tokenData, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

module.exports = { generateToken, verifyToken };
