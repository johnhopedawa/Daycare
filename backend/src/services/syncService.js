/**
 * SimpleFIN → Firefly III Transaction Sync Service
 *
 * Handles:
 * - Fetching transactions from SimpleFIN
 * - Importing to Firefly III
 * - Deduplication via transaction_sync_log
 * - Scheduled daily sync (via scheduler.js)
 */

const pool = require('../db/pool');
const { decrypt } = require('../utils/encryption');
const simplefinService = require('./simplefinService');
const fireflyService = require('./fireflyService');

/**
 * Sync transactions for a single SimpleFIN connection
 *
 * @param {number} connectionId - SimpleFIN connection ID
 * @returns {Promise<object>} - Sync results: { imported, skipped, total }
 */
async function syncConnection(connectionId) {
  try {
    console.log(`[Sync] Starting sync for connection ${connectionId}`);

    // Fetch connection details
    const connResult = await pool.query(
      `SELECT sc.id, sc.user_id, sc.access_url, sc.simplefin_account_id,
              sc.firefly_account_id, sc.last_sync_at, sc.account_name
       FROM simplefin_connections sc
       WHERE sc.id = $1 AND sc.is_active = true`,
      [connectionId]
    );

    if (connResult.rows.length === 0) {
      console.log(`[Sync] Connection ${connectionId} not found or inactive`);
      return { imported: 0, skipped: 0, total: 0 };
    }

    const connection = connResult.rows[0];

    // Decrypt Access URL
    let accessUrl;
    try {
      accessUrl = decrypt(connection.access_url);
    } catch (decryptError) {
      console.error(`[Sync] Failed to decrypt access URL for connection ${connectionId}:`, decryptError.message);
      throw new Error('Failed to decrypt connection credentials');
    }

    // Determine start date (last sync or 30 days ago)
    let startDate;
    if (connection.last_sync_at) {
      startDate = new Date(connection.last_sync_at).toISOString().split('T')[0];
    } else {
      // First sync: get last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
    }

    console.log(`[Sync] Fetching transactions since ${startDate} for "${connection.account_name}"`);

    // Fetch transactions from SimpleFIN
    let transactions;
    try {
      transactions = await simplefinService.fetchTransactions(
        accessUrl,
        connection.simplefin_account_id,
        startDate
      );
    } catch (error) {
      console.error(`[Sync] SimpleFIN fetch failed for connection ${connectionId}:`, error.message);
      throw new Error(`SimpleFIN sync failed: ${error.message}`);
    }

    console.log(`[Sync] Found ${transactions.length} transaction(s)`);

    let imported = 0;
    let skipped = 0;

    for (const txn of transactions) {
      try {
        // SimpleFIN transaction ID (for deduplication)
        const simplefinTxnId = txn.id;

        if (!simplefinTxnId) {
          console.warn('[Sync] Transaction missing ID, skipping');
          skipped++;
          continue;
        }

        // Check if already synced (deduplication)
        const existingCheck = await pool.query(
          'SELECT id FROM transaction_sync_log WHERE connection_id = $1 AND simplefin_transaction_id = $2',
          [connectionId, simplefinTxnId]
        );

        if (existingCheck.rows.length > 0) {
          // Already imported
          skipped++;
          continue;
        }

        // SimpleFIN transaction fields:
        // - id: unique transaction ID
        // - posted: Unix timestamp (seconds since epoch)
        // - amount: amount in account currency (negative for debits)
        // - description: transaction description
        // - payee: merchant/payee name
        // - memo: additional notes

        // Convert Unix timestamp to YYYY-MM-DD
        const transactionDate = new Date(txn.posted * 1000).toISOString().split('T')[0];

        // Amount (SimpleFIN: negative for debits/expenses)
        const amount = Math.abs(txn.amount || 0);

        // Description (use payee or description)
        const description = txn.payee || txn.description || 'Business expense';

        // Notes (combine description + memo if available)
        let notes = null;
        if (txn.description && txn.memo) {
          notes = `${txn.description}\n${txn.memo}`;
        } else if (txn.memo) {
          notes = txn.memo;
        }

        // Import to Firefly III
        const fireflyTxn = await fireflyService.importTransaction({
          date: transactionDate,
          amount: amount,
          description: description,
          sourceAccountId: connection.firefly_account_id,
          externalId: simplefinTxnId,
          notes: notes
        });

        if (fireflyTxn) {
          // Log successful sync
          await pool.query(
            `INSERT INTO transaction_sync_log
             (connection_id, simplefin_transaction_id, synced_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP)`,
            [connectionId, simplefinTxnId]
          );

          imported++;
        } else {
          // Firefly returned null (duplicate)
          skipped++;
        }
      } catch (txnError) {
        console.error('[Sync] Error processing transaction:', txnError.message);
        skipped++;
        // Continue with next transaction
      }
    }

    // Update last sync timestamp
    await pool.query(
      'UPDATE simplefin_connections SET last_sync_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [connectionId]
    );

    console.log(`[Sync] Completed for connection ${connectionId}: ${imported} imported, ${skipped} skipped`);

    return { imported, skipped, total: transactions.length };
  } catch (error) {
    console.error(`[Sync] Error syncing connection ${connectionId}:`, error);
    throw error;
  }
}

/**
 * Sync all active connections
 * Called by daily scheduler
 *
 * @returns {Promise<object>} - Overall sync results
 */
async function syncAllConnections() {
  try {
    const result = await pool.query(
      'SELECT id FROM simplefin_connections WHERE is_active = true'
    );

    const connectionIds = result.rows.map(row => row.id);

    console.log(`[Sync] Found ${connectionIds.length} active connection(s)`);

    let totalImported = 0;
    let totalSkipped = 0;
    let totalTransactions = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const connectionId of connectionIds) {
      try {
        const syncResult = await syncConnection(connectionId);
        totalImported += syncResult.imported;
        totalSkipped += syncResult.skipped;
        totalTransactions += syncResult.total;
        successCount++;
      } catch (error) {
        console.error(`[Sync] Failed to sync connection ${connectionId}:`, error.message);
        failureCount++;
        // Continue with next connection
      }
    }

    console.log(`[Sync] All connections synced: ${successCount} succeeded, ${failureCount} failed`);
    console.log(`[Sync] Total: ${totalImported} imported, ${totalSkipped} skipped, ${totalTransactions} total`);

    return {
      connectionsProcessed: connectionIds.length,
      successCount,
      failureCount,
      totalImported,
      totalSkipped,
      totalTransactions
    };
  } catch (error) {
    console.error('[Sync] Error in syncAllConnections:', error);
    throw error;
  }
}

module.exports = {
  syncConnection,
  syncAllConnections
};
