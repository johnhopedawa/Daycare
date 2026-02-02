const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { generateToken } = require('../utils/jwt');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

// Register (for initial setup - can be restricted later)
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingCount = await pool.query('SELECT COUNT(*) FROM users');
    const isBootstrap = parseInt(existingCount.rows[0].count, 10) === 0;

    if (!isBootstrap) {
      return res.status(403).json({ error: 'Registration is disabled' });
    }

    // Check if user exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create first user as ADMIN only
    const assignedRole = isBootstrap ? 'ADMIN' : 'EDUCATOR';
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, role`,
      [email, passwordHash, firstName, lastName, assignedRole]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.json({ user, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Get user from users table (all users including parents are in users table)
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if active
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate unified token
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    // For PARENT users, get the parent record ID and include it in the token
    if (user.role === 'PARENT') {
      const parentResult = await pool.query(
        'SELECT id FROM parents WHERE user_id = $1',
        [user.id]
      );

      if (parentResult.rows.length > 0) {
        tokenPayload.parentId = parentResult.rows[0].id;
      }
    }

    const token = generateToken(tokenPayload);

    // Return user without password
    const { password_hash, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

// Self-service password change
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get user with password hash
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Admin reset user password
router.post('/admin/reset-password', requireAuth, async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    // Only admins can reset passwords
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'User ID and new password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, first_name, last_name',
      [passwordHash, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Password reset successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Admin reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Parent password reset via token
router.post('/parent-reset-password', authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const resetResult = await pool.query(
      `SELECT id, parent_id, expires_at, used
       FROM parent_password_resets
       WHERE reset_token = $1`,
      [token]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const reset = resetResult.rows[0];
    if (reset.used) {
      return res.status(400).json({ error: 'Reset token has already been used' });
    }

    if (new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    const parentResult = await pool.query(
      'SELECT id, user_id FROM parents WHERE id = $1',
      [reset.parent_id]
    );

    if (parentResult.rows.length === 0 || !parentResult.rows[0].user_id) {
      return res.status(400).json({ error: 'Parent account not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, parentResult.rows[0].user_id]
    );

    await pool.query(
      'UPDATE parent_password_resets SET used = true WHERE id = $1',
      [reset.id]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Parent reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
