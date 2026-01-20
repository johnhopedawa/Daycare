/**
 * Business Expenses Routes (ADMIN only)
 *
 * Manages SimpleFIN Bridge connections and Firefly III integration
 * for business expense tracking
 */

const express = require('express');
const crypto = require('crypto');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encryption');
const simplefinService = require('../services/simplefinService');
const fireflyService = require('../services/fireflyService');

const router = express.Router();

const CLAIM_TTL_MINUTES = 10;

async function storePendingClaim(userId, accessUrl) {
  const claimToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + CLAIM_TTL_MINUTES * 60 * 1000);
  const encryptedAccessUrl = encrypt(accessUrl);

  await pool.query(
    `INSERT INTO simplefin_pending_claims
     (claim_token, user_id, access_url, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [claimToken, userId, encryptedAccessUrl, expiresAt]
  );

  return claimToken;
}

async function loadPendingClaim(userId, claimToken) {
  const result = await pool.query(
    `SELECT access_url
     FROM simplefin_pending_claims
     WHERE claim_token = $1 AND user_id = $2 AND expires_at > NOW()`,
    [claimToken, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Claim token expired or invalid. Please reconnect.');
  }

  return decrypt(result.rows[0].access_url);
}

async function deletePendingClaim(claimToken) {
  await pool.query(
    'DELETE FROM simplefin_pending_claims WHERE claim_token = $1',
    [claimToken]
  );
}

// All routes require ADMIN role
router.use(requireAuth, requireAdmin);

// =====================================================
// SIMPLEFIN CONNECTIONS
// =====================================================

/**
 * GET /api/business-expenses
 * Placeholder recent expenses feed.
 *
 * Note: Transactions are imported into Firefly III and not stored locally yet.
 * This keeps the UI working without a 404 until read access is implemented.
 */
router.get('/', async (req, res) => {
  res.json({ expenses: [] });
});

/**
 * POST /api/business-expenses/simplefin/claim
 * Exchange SimpleFIN Setup Token for Access URL and create connection
 *
 * Body: { setupToken, accountName, simplefinAccountId? } or { claimToken, accountName, simplefinAccountId }
 * Returns: { message, connection } or { requiresAccountSelection, claimToken, accounts }
 */
router.post('/simplefin/claim', async (req, res) => {
  try {
    const {
      setupToken,
      accountName,
      simplefinAccountId,
      claimToken
    } = req.body;

    // Validate input
    if (!accountName) {
      return res.status(400).json({ error: 'Account name required' });
    }

    if (!setupToken && !claimToken) {
      return res.status(400).json({ error: 'Setup token required' });
    }

    if (accountName.length > 255) {
      return res.status(400).json({ error: 'Account name too long (max 255 characters)' });
    }

    console.log(`[BusinessExpenses] User ${req.user.id} claiming SimpleFIN setup token`);

    // Step 1: Claim SimpleFIN setup token -> get Access URL
    let accessUrl;
    if (claimToken) {
      try {
        accessUrl = await loadPendingClaim(req.user.id, claimToken);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
    } else {
      try {
        accessUrl = await simplefinService.claimSetupToken(setupToken);
      } catch (error) {
        console.error('[BusinessExpenses] SimpleFIN claim failed:', error.message);
        return res.status(400).json({ error: error.message });
      }
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

    let selectedAccountId = simplefinAccountId;

    if (!selectedAccountId) {
      if (accounts.length === 1) {
        selectedAccountId = accounts[0].id;
      } else {
        const pendingClaimToken = claimToken || await storePendingClaim(req.user.id, accessUrl);
        return res.json({
          requiresAccountSelection: true,
          claimToken: pendingClaimToken,
          accounts: accounts.map((account) => {
            const toSafeString = (value) => {
              if (value === null || value === undefined) {
                return '';
              }
              if (typeof value === 'string') {
                return value.trim();
              }
              if (typeof value === 'number') {
                return String(value);
              }
              try {
                return JSON.stringify(value);
              } catch (error) {
                return String(value);
              }
            };

            const rawName = account.name || account.nickname || account.account_name || '';
            const name = toSafeString(rawName);
            const institution = toSafeString(account.institution?.name || account.institution || account.org);
            const type = toSafeString(account.type || account.account_type);
            const rawNumber = account.account || account.number || account.account_number || account.accountNumber || '';
            const digits = String(rawNumber).replace(/\D/g, '');
            const masked = digits.length >= 4 ? `****${digits.slice(-4)}` : '';
            const displayName = [name, institution, type, masked].filter(Boolean).join(' • ') || account.id;

            return {
              id: account.id,
              name,
              institution: institution || null,
              type: type || null,
              maskedAccount: masked || null,
              displayName
            };
          })
        });
      }
    }

    const simplefinAccount = accounts.find((account) => account.id === selectedAccountId);

    if (!simplefinAccount) {
      return res.status(400).json({ error: 'Selected account not found in SimpleFIN connection' });
    }

    console.log(`[BusinessExpenses] SimpleFIN account: ${simplefinAccount.id}`);

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
        [req.user.id, encryptedAccessUrl, accountName, simplefinAccount.id, fireflyAccount.id]
      );

      const connection = result.rows[0];

      if (claimToken) {
        await deletePendingClaim(claimToken);
      }

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

