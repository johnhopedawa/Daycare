/**
 * SimpleFIN -> Firefly III Transaction Sync Service
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

const DEFAULT_SYNC_DAYS = 30;
const DEFAULT_LOOKBACK_DAYS = 7;
const SYNC_TIMEZONE = process.env.SYNC_TIMEZONE || 'UTC';

function getLookbackDays() {
  const raw = Number.parseInt(process.env.SYNC_LOOKBACK_DAYS, 10);
  if (Number.isFinite(raw) && raw >= 0) {
    return raw;
  }
  return DEFAULT_LOOKBACK_DAYS;
}

function parseSimplefinNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSimplefinDate(value) {
  if (!value && value !== 0) {
    return null;
  }
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return null;
    }
    const ms = num < 1e12 ? num * 1000 : num;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
}

function formatDateInTimeZone(seconds) {
  if (!Number.isFinite(seconds)) {
    return null;
  }
  const date = new Date(seconds * 1000);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SYNC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

function coerceSimplefinTimestamp(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return null;
    }
    const ms = num < 1e12 ? num * 1000 : num;
    return Math.floor(ms / 1000);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return Math.floor(date.getTime() / 1000);
}

function getSimplefinPostedSeconds(txn) {
  if (!txn || typeof txn !== 'object') {
    return null;
  }
  const candidates = [
    txn.transacted,
    txn.transacted_at,
    txn.transactedAt,
    txn.date,
    txn.transaction_date,
    txn.transactionDate,
    txn['transaction-date'],
    txn.posted,
    txn.posted_at,
    txn.postedAt
  ];

  for (const candidate of candidates) {
    const seconds = coerceSimplefinTimestamp(candidate);
    if (seconds !== null) {
      return seconds;
    }
  }
  return null;
}

function extractCreditLimit(account) {
  return parseSimplefinNumber(
    account['credit-limit']
    || account.credit_limit
    || account.creditLimit
    || account.creditLimitAmount
    || account.limit
  );
}

/**
 * Sync transactions for a single SimpleFIN connection
 *
 * @param {number} connectionId - SimpleFIN connection ID
 * @returns {Promise<object>} - Sync results: { imported, skipped, total }
 */
async function syncConnection(connectionId, options = {}) {
  const debugEnabled = options && options.debug;
  const forceSync = options && options.force;
  const debugInfo = debugEnabled
    ? {
        connectionId,
        force: !!forceSync,
        lookbackDays: null,
        hasSyncHistory: false,
        lastSyncAtBefore: null,
        startDate: null,
        startDateUnix: null,
        transactionsFetched: 0,
        latestPosted: null,
        lastSyncAtAfter: null,
        skippedDuplicates: 0,
        skippedInvalid: 0,
        skippedErrors: 0,
        errorSamples: [],
      }
    : null;

  try {
    console.log(`[Sync] Starting sync for connection ${connectionId}`);

    // Fetch connection details
    const connResult = await pool.query(
      `SELECT sc.id, sc.user_id, sc.access_url, sc.simplefin_account_id,
              sc.firefly_account_id, sc.last_sync_at, sc.account_name, sc.account_type,
              u.first_name, u.last_name
       FROM simplefin_connections sc
       JOIN users u ON u.id = sc.user_id
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

    const ownerName = `${connection.first_name || ''} ${connection.last_name || ''}`.trim();
    const fireflyAccountName = ownerName
      ? `${ownerName} - ${connection.account_name}`
      : connection.account_name;

    try {
      const assetAccount = await fireflyService.ensureAssetAccount(
        connection.firefly_account_id,
        fireflyAccountName
      );

      if (assetAccount && assetAccount.id && assetAccount.id !== connection.firefly_account_id) {
        await pool.query(
          'UPDATE simplefin_connections SET firefly_account_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [connectionId, assetAccount.id]
        );
        connection.firefly_account_id = assetAccount.id;
      }
    } catch (error) {
      console.error('[Sync] Firefly account validation failed:', error.message);
      throw new Error('Failed to verify Firefly III account');
    }

    const syncHistoryResult = await pool.query(
      'SELECT 1 FROM transaction_sync_log WHERE connection_id = $1 LIMIT 1',
      [connectionId]
    );
    const hasSyncHistory = syncHistoryResult.rows.length > 0;
    if (debugInfo) {
      debugInfo.hasSyncHistory = hasSyncHistory;
    }

    // Determine start date (last sync with history or fallback window), as UNIX timestamp seconds
    const now = new Date();
    const lookbackDays = getLookbackDays();
    if (debugInfo) {
      debugInfo.lookbackDays = lookbackDays;
      debugInfo.lastSyncAtBefore = connection.last_sync_at || null;
    }
    let lastSync = null;

    if (connection.last_sync_at && hasSyncHistory) {
      const parsed = new Date(connection.last_sync_at);
      if (Number.isNaN(parsed.getTime())) {
        console.warn(`[Sync] Invalid last_sync_at for connection ${connectionId}, falling back to default window`);
      } else if (parsed > now) {
        console.warn(`[Sync] last_sync_at is in the future for connection ${connectionId}, falling back to default window`);
      } else {
        lastSync = parsed;
      }
    }

    let startDate;
    let startDateUnix;
    if (lastSync) {
      const lookbackDate = new Date(lastSync);
      if (lookbackDays > 0) {
        lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);
      }
      startDate = lookbackDate.toISOString().split('T')[0];
      startDateUnix = Math.floor(lookbackDate.getTime() / 1000);
    } else {
      // First sync or no history: get last N days
      const fallbackDate = new Date(now);
      fallbackDate.setDate(fallbackDate.getDate() - DEFAULT_SYNC_DAYS);
      startDate = fallbackDate.toISOString().split('T')[0];
      startDateUnix = Math.floor(fallbackDate.getTime() / 1000);
    }

    console.log(`[Sync] Fetching transactions since ${startDate} for "${connection.account_name}"`);
    if (debugInfo) {
      debugInfo.startDate = startDate;
      debugInfo.startDateUnix = startDateUnix;
    }

    // Fetch transactions from SimpleFIN
    let syncPayload;
    try {
      syncPayload = await simplefinService.fetchTransactions(
        accessUrl,
        connection.simplefin_account_id,
        startDateUnix
      );
    } catch (error) {
      console.error(`[Sync] SimpleFIN fetch failed for connection ${connectionId}:`, error.message);
      throw new Error(`SimpleFIN sync failed: ${error.message}`);
    }

    const transactions = syncPayload?.transactions || [];
    const account = syncPayload?.account || null;
    if (debugInfo) {
      debugInfo.transactionsFetched = transactions.length;
    }

    if (account) {
      const rawBalance = parseSimplefinNumber(
        account.balance || account.current_balance || account.currentBalance
      );
      const balanceDate = normalizeSimplefinDate(
        account['balance-date'] || account.balance_date || account.balanceDate
      );
      const rawAvailableBalance = parseSimplefinNumber(
        account['available-balance'] || account.available_balance || account.availableBalance
      );
      const availableBalanceDate = normalizeSimplefinDate(
        account['available-balance-date']
        || account.available_balance_date
        || account.availableBalanceDate
        || account['balance-date']
        || account.balance_date
        || account.balanceDate
      );
      const creditLimit = extractCreditLimit(account);
      const normalizedBalance = connection.account_type === 'credit' && rawBalance !== null
        ? Math.abs(rawBalance)
        : rawBalance;
      const normalizedAvailableBalance = connection.account_type === 'credit' && rawAvailableBalance !== null
        ? Math.abs(rawAvailableBalance)
        : rawAvailableBalance;

      const balanceUpdates = [];
      const balanceValues = [];

      if (normalizedBalance !== null) {
        balanceValues.push(normalizedBalance);
        balanceUpdates.push(`balance = $${balanceValues.length}`);
      }
      if (balanceDate) {
        balanceValues.push(balanceDate);
        balanceUpdates.push(`balance_date = $${balanceValues.length}`);
      }
      if (normalizedAvailableBalance !== null) {
        balanceValues.push(normalizedAvailableBalance);
        balanceUpdates.push(`available_balance = $${balanceValues.length}`);
      }
      if (availableBalanceDate) {
        balanceValues.push(availableBalanceDate);
        balanceUpdates.push(`available_balance_date = $${balanceValues.length}`);
      }
      if (creditLimit !== null) {
        balanceValues.push(Math.abs(creditLimit));
        balanceUpdates.push(`credit_limit = $${balanceValues.length}`);
      }

      if (balanceUpdates.length) {
        balanceValues.push(connectionId);
        await pool.query(
          `UPDATE simplefin_connections
           SET ${balanceUpdates.join(', ')},
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $${balanceValues.length}`,
          balanceValues
        );
      }
    }

    console.log(`[Sync] Found ${transactions.length} transaction(s)`);

    let imported = 0;
    let skipped = 0;
    let latestPosted = null;
    let skippedDuplicates = 0;
    let skippedInvalid = 0;
    let skippedErrors = 0;

    for (const txn of transactions) {
      let postedSeconds = null;
      try {
        postedSeconds = getSimplefinPostedSeconds(txn);
        if (!postedSeconds) {
          console.warn('[Sync] Transaction missing posted date, skipping');
          skipped++;
          skippedInvalid++;
          continue;
        }

        latestPosted = latestPosted === null
          ? postedSeconds
          : Math.max(latestPosted, postedSeconds);

        // SimpleFIN transaction ID (for deduplication)
        const simplefinTxnId = txn.id;

        if (!simplefinTxnId) {
          console.warn('[Sync] Transaction missing ID, skipping');
          skipped++;
          skippedInvalid++;
          continue;
        }

        // Check if already synced (deduplication)
        if (!forceSync) {
          const existingCheck = await pool.query(
            'SELECT id FROM transaction_sync_log WHERE connection_id = $1 AND simplefin_transaction_id = $2',
            [connectionId, simplefinTxnId]
          );

          if (existingCheck.rows.length > 0) {
            // Already imported
            skipped++;
            skippedDuplicates++;
            continue;
          }
        }

        // SimpleFIN transaction fields:
        // - id: unique transaction ID
        // - posted: Unix timestamp (seconds since epoch)
        // - amount: amount in account currency (negative for debits)
        // - description: transaction description
        // - payee: merchant/payee name
        // - memo: additional notes

        // Convert Unix timestamp to YYYY-MM-DD
        const transactionDate = formatDateInTimeZone(postedSeconds);

        // Amount (SimpleFIN: negative for debits/expenses, positive for credits)
        const rawAmount = Number(txn.amount || 0);
        if (!Number.isFinite(rawAmount) || rawAmount === 0) {
          console.warn('[Sync] Transaction amount missing or zero, skipping');
          skipped++;
          skippedInvalid++;
          continue;
        }
        const amount = Math.abs(rawAmount);
        const direction = rawAmount < 0 ? 'withdrawal' : 'deposit';

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
          assetAccountId: connection.firefly_account_id,
          externalId: simplefinTxnId,
          direction,
          notes: notes
        });

        if (fireflyTxn) {
          // Log successful sync
          await pool.query(
            `INSERT INTO transaction_sync_log
             (connection_id, simplefin_transaction_id, synced_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT (connection_id, simplefin_transaction_id) DO NOTHING`,
            [connectionId, simplefinTxnId]
          );

          imported++;
        } else {
          // Firefly returned null (duplicate)
          skipped++;
          skippedDuplicates++;
        }
      } catch (txnError) {
        console.error('[Sync] Error processing transaction:', txnError.message);
        skipped++;
        skippedErrors++;
        if (debugInfo && debugInfo.errorSamples.length < 10) {
          debugInfo.errorSamples.push({
            id: txn.id || null,
            posted: postedSeconds,
            amount: txn.amount ?? null,
            description: txn.payee || txn.description || null,
            error: txnError.message || 'Unknown error'
          });
        }
        // Continue with next transaction
      }
    }

    if (debugInfo) {
      debugInfo.latestPosted = latestPosted;
    }

    const syncCompletedAt = new Date();

    await pool.query(
      'UPDATE simplefin_connections SET last_sync_at = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [connectionId, syncCompletedAt]
    );

    if (debugInfo) {
      debugInfo.lastSyncAtAfter = syncCompletedAt
        ? syncCompletedAt.toISOString()
        : connection.last_sync_at || null;
      debugInfo.skippedDuplicates = skippedDuplicates;
      debugInfo.skippedInvalid = skippedInvalid;
      debugInfo.skippedErrors = skippedErrors;
    }

    console.log(`[Sync] Completed for connection ${connectionId}: ${imported} imported, ${skipped} skipped`);

    return {
      imported,
      skipped,
      total: transactions.length,
      ...(debugInfo ? { debug: debugInfo } : {})
    };
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
