/**
 * Business Expenses Routes (ADMIN only)
 *
 * Manages SimpleFIN Bridge connections and Firefly III integration
 * for business expense tracking
 */

const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encryption');
const simplefinService = require('../services/simplefinService');
const fireflyService = require('../services/fireflyService');

const router = express.Router();

// All routes require ADMIN role
router.use(requireAuth, requireAdmin);

// =====================================================
// SIMPLEFIN CONNECTIONS
// =====================================================

/**
 * POST /api/business-expenses/simplefin/claim
 * Exchange SimpleFIN Setup Token for Access URL and create connection
 *
 * Body: { setupToken, accountName }
 * Returns: { message, connection }
 */
router.post('/simplefin/claim', async (req, res) => {
  try {
    const { setupToken, accountName } = req.body;

    // Validate input
    if (!setupToken || !accountName) {
      return res.status(400).json({ error: 'Setup token and account name required' });
    }

    if (accountName.length > 255) {
      return res.status(400).json({ error: 'Account name too long (max 255 characters)' });
    }

    console.log(`[BusinessExpenses] User ${req.user.id} claiming SimpleFIN setup token`);

    // Step 1: Claim SimpleFIN setup token → get Access URL
    let accessUrl;
    try {
      accessUrl = await simplefinService.claimSetupToken(setupToken);
    } catch (error) {
      console.error('[BusinessExpenses] SimpleFIN claim failed:', error.message);
      return res.status(400).json({ error: error.message });
    }

    // Step 2: Fetch accounts to verify connection and get account ID
    let accounts;
    try {
      accounts = await simplefinService.fetchAccounts(accessUrl);
    } catch (error) {
      console.error('[BusinessExpenses] SimpleFIN fetch accounts failed:', error.message);
      return res.status(400).json({ error: 'Failed to verify SimpleFIN connection' });
    }

    if (!accounts || accounts.length === 0) {
      return res.status(400).json({ error: 'No accounts found in SimpleFIN connection' });
    }

    // Use first account (future enhancement: let user choose)
    const simplefinAccount = accounts[0];
    const simplefinAccountId = simplefinAccount.id;

    console.log(`[BusinessExpenses] SimpleFIN account: ${simplefinAccountId}`);

    // Step 3: Create Firefly III expense account
    // Format: "[User Name] - [Card Name]"
    const fireflyAccountName = `${req.user.first_name} ${req.user.last_name} - ${accountName}`;

    let fireflyAccount;
    try {
      fireflyAccount = await fireflyService.createExpenseAccount(fireflyAccountName);
    } catch (error) {
      console.error('[BusinessExpenses] Firefly account creation failed:', error.message);
      return res.status(500).json({ error: 'Failed to create Firefly III account' });
    }

    console.log(`[BusinessExpenses] Firefly account created: ${fireflyAccount.id}`);

    // Step 4: Store encrypted Access URL in database
    const encryptedAccessUrl = encrypt(accessUrl);

    try {
      const result = await pool.query(
        `INSERT INTO simplefin_connections
         (user_id, access_url, account_name, simplefin_account_id, firefly_account_id, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING id, account_name, created_at`,
        [req.user.id, encryptedAccessUrl, accountName, simplefinAccountId, fireflyAccount.id]
      );

      const connection = result.rows[0];

      console.log(`[BusinessExpenses] Connection created: ID ${connection.id}`);

      res.json({
        message: 'Business card connected successfully',
        connection: {
          id: connection.id,
          accountName: connection.account_name,
          createdAt: connection.created_at
        }
      });
    } catch (dbError) {
      console.error('[BusinessExpenses] Database error:', dbError);
      res.status(500).json({ error: 'Failed to save connection' });
    }
  } catch (error) {
    console.error('[BusinessExpenses] Claim error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/business-expenses/connections
 * List all SimpleFIN connections for current ADMIN user
 *
 * Returns: { connections: [...] }
 */
router.get('/connections', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, account_name, last_sync_at, is_active, created_at, updated_at
       FROM simplefin_connections
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ connections: result.rows });
  } catch (error) {
    console.error('[BusinessExpenses] Get connections error:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

/**
 * GET /api/business-expenses/connections/:id
 * Get single connection details
 *
 * Returns: { connection: {...} }
 */
router.get('/connections/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, account_name, last_sync_at, is_active, created_at, updated_at
       FROM simplefin_connections
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    res.json({ connection: result.rows[0] });
  } catch (error) {
    console.error('[BusinessExpenses] Get connection error:', error);
    res.status(500).json({ error: 'Failed to fetch connection' });
  }
});

/**
 * DELETE /api/business-expenses/connections/:id
 * Disconnect a business card
 *
 * Returns: { message }
 */
router.delete('/connections/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM simplefin_connections
       WHERE id = $1 AND user_id = $2
       RETURNING id, account_name`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    console.log(`[BusinessExpenses] Connection deleted: ${result.rows[0].account_name}`);

    res.json({ message: 'Connection disconnected successfully' });
  } catch (error) {
    console.error('[BusinessExpenses] Delete connection error:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// =====================================================
// MANUAL SYNC
// =====================================================

/**
 * POST /api/business-expenses/sync/:connectionId
 * Manually trigger sync for a specific connection
 *
 * Returns: { message, imported, skipped, total }
 */
router.post('/sync/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;

    // Verify ownership
    const check = await pool.query(
      'SELECT id FROM simplefin_connections WHERE id = $1 AND user_id = $2',
      [connectionId, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    console.log(`[BusinessExpenses] Manual sync requested for connection ${connectionId}`);

    // Import sync service here to avoid circular dependencies
    const syncService = require('../services/syncService');

    const result = await syncService.syncConnection(parseInt(connectionId));

    res.json({
      message: 'Sync completed',
      imported: result.imported,
      skipped: result.skipped,
      total: result.total
    });
  } catch (error) {
    console.error('[BusinessExpenses] Manual sync error:', error);
    res.status(500).json({ error: error.message || 'Sync failed' });
  }
});

// =====================================================
// STATUS & INFO
// =====================================================

/**
 * GET /api/business-expenses/status
 * Check if business expenses feature is configured
 *
 * Returns: { configured, connectionCount }
 */
router.get('/status', async (req, res) => {
  try {
    // Check if Firefly service PAT is configured
    const fireflyConfigured = !!process.env.FIREFLY_SERVICE_PAT;

    // Count user's connections
    const result = await pool.query(
      'SELECT COUNT(*) FROM simplefin_connections WHERE user_id = $1 AND is_active = true',
      [req.user.id]
    );

    const connectionCount = parseInt(result.rows[0].count);

    res.json({
      configured: fireflyConfigured,
      connectionCount: connectionCount
    });
  } catch (error) {
    console.error('[BusinessExpenses] Status check error:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

module.exports = router;
