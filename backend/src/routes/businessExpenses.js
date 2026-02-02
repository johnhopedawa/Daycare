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
const DEFAULT_EXPENSE_DAYS = 30;
const DEFAULT_EXPENSE_LIMIT = 50;
const MAX_EXPENSE_LIMIT = 1000;
const SYNC_LIMIT_PER_DAY = 10;
const SYNC_TIMEZONE = process.env.SYNC_TIMEZONE || 'UTC';
const RULE_MATCH_FIELDS = new Set(['description', 'vendor', 'both']);
const RULE_TRANSACTION_TYPES = new Set(['expense', 'income', 'both']);
const ACCOUNT_TYPES = new Set(['credit', 'debit']);

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

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function normalizeTransactionDate(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().split('T')[0];
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

function normalizeBalanceForAccountType(value, accountType) {
  if (value === null || value === undefined) {
    return null;
  }
  if (accountType === 'credit') {
    return Math.abs(value);
  }
  return value;
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

function normalizeDateParam(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function isDateInRange(dateKey, startKey, endKey) {
  if (!dateKey) {
    return false;
  }
  if (startKey && dateKey < startKey) {
    return false;
  }
  if (endKey && dateKey > endKey) {
    return false;
  }
  return true;
}

function normalizeDirection(type) {
  if (type === 'deposit') {
    return 'income';
  }
  if (type === 'withdrawal') {
    return 'expense';
  }
  return 'other';
}

function toExpenseRecord(transaction, connection, fallbackId) {
  const parsedAmount = Number.parseFloat(transaction.amount ?? transaction.amount_float ?? 0);
  const amount = Number.isFinite(parsedAmount) ? Math.abs(parsedAmount) : 0;

  const transactionDate = normalizeTransactionDate(transaction.date || transaction.transaction_date);
  const vendor =
    transaction.opposing_name
    || transaction.payee_name
    || transaction.payee
    || transaction.description
    || transaction.source_name
    || transaction.destination_name
    || null;
  const description =
    transaction.description
    || transaction.group_title
    || vendor
    || connection.account_name
    || 'Business expense';
  const category = transaction.category_name || transaction.category || null;
  const rawId = transaction.external_id || transaction.transaction_journal_id || transaction.id;
  const id = rawId ? `${connection.id}-${rawId}` : `${connection.id}-${fallbackId}`;
  const direction = normalizeDirection(transaction.type);

  return {
    id,
    connection_id: connection.id,
    transaction_date: transactionDate,
    description,
    vendor,
    category,
    amount,
    direction,
    account_name: connection.account_name,
    category_source: category ? 'firefly' : null
  };
}

function applyCategoryRules(records, rules) {
  if (!records.length || !rules.length) {
    records.forEach((record) => {
      if (!record.category_source) {
        record.category_source = record.category ? 'firefly' : 'uncategorized';
      }
    });
    return;
  }

  records.forEach((record) => {
    if (record.category) {
      record.category_source = 'firefly';
      return;
    }

    const direction = record.direction || 'expense';
    const description = (record.description || '').toLowerCase();
    const vendor = (record.vendor || '').toLowerCase();

    const matchedRule = rules.find((rule) => {
      if (!RULE_TRANSACTION_TYPES.has(rule.transaction_type)) {
        return false;
      }
      if (rule.transaction_type !== 'both' && rule.transaction_type !== direction) {
        return false;
      }
      const keyword = (rule.keyword || '').toLowerCase();
      if (!keyword) {
        return false;
      }
      if (rule.match_field === 'vendor') {
        return vendor.includes(keyword);
      }
      if (rule.match_field === 'both') {
        return description.includes(keyword) || vendor.includes(keyword);
      }
      return description.includes(keyword);
    });

    if (matchedRule) {
      record.category = matchedRule.category;
      record.category_source = 'rule';
      record.category_rule_id = matchedRule.id;
    } else {
      record.category_source = 'uncategorized';
    }
  });
}

async function getSyncLimitStatus(userId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS used
     FROM simplefin_sync_attempts
     WHERE user_id = $1
       AND (created_at AT TIME ZONE $2) >= DATE_TRUNC('day', NOW() AT TIME ZONE $2)`,
    [userId, SYNC_TIMEZONE]
  );
  const used = result.rows[0]?.used || 0;
  const remaining = Math.max(0, SYNC_LIMIT_PER_DAY - used);
  return {
    limit: SYNC_LIMIT_PER_DAY,
    used,
    remaining
  };
}

// All routes require ADMIN role
router.use(requireAuth, requireAdmin);

// =====================================================
// SIMPLEFIN CONNECTIONS
// =====================================================

/**
 * GET /api/business-expenses
 * Recent transactions feed from Firefly III.
 */
router.get('/', async (req, res) => {
  try {
    if (!process.env.FIREFLY_SERVICE_PAT) {
      return res.status(503).json({ error: 'Firefly III is not configured' });
    }

    const days = parsePositiveInt(req.query.days, DEFAULT_EXPENSE_DAYS);
    const limit = Math.min(
      parsePositiveInt(req.query.limit, DEFAULT_EXPENSE_LIMIT),
      MAX_EXPENSE_LIMIT
    );
    const typeFilter = req.query.type;
    const startParam = normalizeDateParam(req.query.start);
    const endParam = normalizeDateParam(req.query.end);

    const connectionResult = await pool.query(
      `SELECT id, account_name, firefly_account_id
       FROM simplefin_connections
       WHERE user_id = $1 AND is_active = true`,
      [req.user.id]
    );

    const connections = connectionResult.rows.filter((row) => row.firefly_account_id);

    if (connections.length === 0) {
      return res.json({ transactions: [], expenses: [] });
    }

    let endDate = endParam || new Date();
    let startDate = startParam;

    if (startParam && endParam && startParam > endParam) {
      return res.status(400).json({ error: 'Invalid date range' });
    }

    if (!startDate) {
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - days);
    }

    const rulesResult = await pool.query(
      `SELECT id, keyword, category, match_field, transaction_type
       FROM business_expense_category_rules
       WHERE user_id = $1
       ORDER BY id`,
      [req.user.id]
    );

    const results = await Promise.allSettled(
      connections.map((connection) =>
        fireflyService.fetchAccountTransactions(connection.firefly_account_id, {
          startDate,
          endDate,
          limit
        })
      )
    );

    const transactions = [];
    let successCount = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount += 1;
        const connection = connections[index];
        result.value.forEach((transaction, txnIndex) => {
          transactions.push(toExpenseRecord(transaction, connection, `${index}-${txnIndex}`));
        });
      } else {
        const connection = connections[index];
        console.error(
          `[BusinessExpenses] Firefly fetch failed for account ${connection.firefly_account_id}:`,
          result.reason?.message || result.reason
        );
      }
    });

    if (successCount === 0) {
      return res.status(502).json({ error: 'Failed to load expenses from Firefly III' });
    }

    applyCategoryRules(transactions, rulesResult.rows);

    const startKey = normalizeTransactionDate(startDate);
    const endKey = normalizeTransactionDate(endDate);
    const dateFiltered = startKey || endKey
      ? transactions.filter((txn) => isDateInRange(txn.transaction_date, startKey, endKey))
      : transactions;

    const filtered = typeFilter && typeFilter !== 'all'
      ? dateFiltered.filter((txn) => txn.direction === typeFilter)
      : dateFiltered;

    filtered.sort((a, b) => {
      const dateA = a.transaction_date ? new Date(a.transaction_date).getTime() : 0;
      const dateB = b.transaction_date ? new Date(b.transaction_date).getTime() : 0;
      return dateB - dateA;
    });

    const limited = filtered.slice(0, limit);
    const expenses = limited.filter((txn) => txn.direction === 'expense');
    res.json({ transactions: limited, expenses });
  } catch (error) {
    console.error('[BusinessExpenses] Load expenses error:', error);
    res.status(500).json({ error: error.message || 'Failed to load expenses' });
  }
});

// =====================================================
// CATEGORY RULES
// =====================================================

/**
 * GET /api/business-expenses/rules
 * List keyword-based category rules.
 */
router.get('/rules', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, keyword, category, match_field, transaction_type, created_at
       FROM business_expense_category_rules
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC`,
      [req.user.id]
    );

    res.json({ rules: result.rows });
  } catch (error) {
    console.error('[BusinessExpenses] Load rules error:', error);
    res.status(500).json({ error: 'Failed to load rules' });
  }
});

/**
 * POST /api/business-expenses/rules
 * Create a keyword-based category rule.
 */
router.post('/rules', async (req, res) => {
  try {
    const keyword = (req.body.keyword || '').trim();
    const category = (req.body.category || '').trim();
    const matchField = (req.body.matchField || 'description').trim();
    const transactionType = (req.body.transactionType || 'expense').trim();

    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required' });
    }
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }
    if (keyword.length > 120) {
      return res.status(400).json({ error: 'Keyword too long (max 120 characters)' });
    }
    if (category.length > 120) {
      return res.status(400).json({ error: 'Category too long (max 120 characters)' });
    }
    if (!RULE_MATCH_FIELDS.has(matchField)) {
      return res.status(400).json({ error: 'Invalid match field' });
    }
    if (!RULE_TRANSACTION_TYPES.has(transactionType)) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    const result = await pool.query(
      `INSERT INTO business_expense_category_rules
       (user_id, keyword, category, match_field, transaction_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, keyword, category, match_field, transaction_type, created_at`,
      [req.user.id, keyword, category, matchField, transactionType]
    );

    res.json({ rule: result.rows[0] });
  } catch (error) {
    console.error('[BusinessExpenses] Create rule error:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

/**
 * PATCH /api/business-expenses/rules/:id
 * Update a keyword-based category rule.
 */
router.patch('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const keyword = (req.body.keyword || '').trim();
    const category = (req.body.category || '').trim();
    const matchField = (req.body.matchField || 'description').trim();
    const transactionType = (req.body.transactionType || 'expense').trim();

    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required' });
    }
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }
    if (keyword.length > 120) {
      return res.status(400).json({ error: 'Keyword too long (max 120 characters)' });
    }
    if (category.length > 120) {
      return res.status(400).json({ error: 'Category too long (max 120 characters)' });
    }
    if (!RULE_MATCH_FIELDS.has(matchField)) {
      return res.status(400).json({ error: 'Invalid match field' });
    }
    if (!RULE_TRANSACTION_TYPES.has(transactionType)) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    const result = await pool.query(
      `UPDATE business_expense_category_rules
       SET keyword = $1,
           category = $2,
           match_field = $3,
           transaction_type = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6
       RETURNING id, keyword, category, match_field, transaction_type, created_at`,
      [keyword, category, matchField, transactionType, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({ rule: result.rows[0] });
  } catch (error) {
    console.error('[BusinessExpenses] Update rule error:', error);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

/**
 * DELETE /api/business-expenses/rules/:id
 * Remove a keyword-based category rule.
 */
router.delete('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM business_expense_category_rules
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({ message: 'Rule deleted' });
  } catch (error) {
    console.error('[BusinessExpenses] Delete rule error:', error);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
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
      claimToken,
      accountType
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
              return '';
            };

            const rawName = account.name || account.nickname || account.account_name || '';
            const name = toSafeString(rawName);
            const org = account.org || account.institution || null;
            const institution = org
              ? toSafeString(org.name || org.domain || org['sfin-url'] || org)
              : '';
            const type = toSafeString(account.type || account.account_type);
            const currency = toSafeString(account.currency);
            const rawNumber = account.account || account.number || account.account_number || account.accountNumber || '';
            const digits = String(rawNumber).replace(/\D/g, '');
            const masked = digits.length >= 4 ? `****${digits.slice(-4)}` : '';
            const balance = parseSimplefinNumber(account.balance);
            const availableBalance = parseSimplefinNumber(
              account['available-balance'] || account.available_balance || account.availableBalance
            );
            const balanceDate = normalizeSimplefinDate(
              account['balance-date'] || account.balance_date || account.balanceDate
            );
            const availableBalanceDate = normalizeSimplefinDate(
              account['available-balance-date']
              || account.available_balance_date
              || account.availableBalanceDate
            ) || balanceDate;
            const displayName = [name, institution, type, masked, currency].filter(Boolean).join(' | ') || account.id;

            return {
              id: account.id,
              name,
              institution: institution || null,
              type: type || null,
              maskedAccount: masked || null,
              currency: currency || null,
              balance,
              availableBalance,
              balanceDate,
              availableBalanceDate,
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

    // Step 3: Create Firefly III asset account
    // Format: "[User Name] - [Card Name]"
    const fireflyAccountName = `${req.user.first_name} ${req.user.last_name} - ${accountName}`;

    let fireflyAccount;
    try {
      fireflyAccount = await fireflyService.createAssetAccount(fireflyAccountName);
    } catch (error) {
      console.error('[BusinessExpenses] Firefly account creation failed:', error.message);
      return res.status(500).json({ error: 'Failed to create Firefly III account' });
    }

    console.log(`[BusinessExpenses] Firefly account created: ${fireflyAccount.id}`);

    const normalizedAccountType = ACCOUNT_TYPES.has(accountType) ? accountType : 'credit';
    const openingBalance = normalizeBalanceForAccountType(
      parseSimplefinNumber(simplefinAccount.balance),
      normalizedAccountType
    );
    const openingBalanceDate = normalizeSimplefinDate(
      simplefinAccount['balance-date'] || simplefinAccount.balance_date || simplefinAccount.balanceDate
    );
    const currentBalance = normalizeBalanceForAccountType(
      parseSimplefinNumber(simplefinAccount.balance),
      normalizedAccountType
    );
    const currentBalanceDate = openingBalanceDate;
    const availableBalance = normalizeBalanceForAccountType(
      parseSimplefinNumber(
        simplefinAccount['available-balance']
        || simplefinAccount.available_balance
        || simplefinAccount.availableBalance
      ),
      normalizedAccountType
    );
    const availableBalanceDate = normalizeSimplefinDate(
      simplefinAccount['available-balance-date']
      || simplefinAccount.available_balance_date
      || simplefinAccount.availableBalanceDate
    ) || openingBalanceDate;
    const creditLimit = normalizedAccountType === 'credit'
      ? normalizeBalanceForAccountType(extractCreditLimit(simplefinAccount), normalizedAccountType)
      : null;

    // Step 4: Store encrypted Access URL in database
    const encryptedAccessUrl = encrypt(accessUrl);

    try {
      const result = await pool.query(
        `INSERT INTO simplefin_connections
         (user_id, access_url, account_name, simplefin_account_id, firefly_account_id, is_active, account_type,
          opening_balance, opening_balance_date, balance, balance_date,
          available_balance, available_balance_date, credit_limit)
         VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id, account_name, created_at, opening_balance, opening_balance_date,
                   balance, balance_date, available_balance, available_balance_date, credit_limit`,
        [
          req.user.id,
          encryptedAccessUrl,
          accountName,
          simplefinAccount.id,
          fireflyAccount.id,
          normalizedAccountType,
          openingBalance,
          openingBalanceDate,
          currentBalance,
          currentBalanceDate,
          availableBalance,
          availableBalanceDate,
          creditLimit
        ]
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
      `SELECT id, account_name, last_sync_at, is_active, created_at, updated_at,
              account_type, opening_balance, opening_balance_date,
              balance, balance_date,
              available_balance, available_balance_date, credit_limit
       FROM simplefin_connections
       WHERE user_id = $1
         AND is_active = true
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    const syncLimit = await getSyncLimitStatus(req.user.id);
    res.json({ connections: result.rows, syncLimit });
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
      `SELECT id, account_name, last_sync_at, is_active, created_at, updated_at,
              account_type, opening_balance, opening_balance_date,
              balance, balance_date,
              available_balance, available_balance_date, credit_limit
       FROM simplefin_connections
       WHERE id = $1 AND user_id = $2 AND is_active = true`,
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
 * PATCH /api/business-expenses/connections/:id
 * Update connection metadata (account type and opening balance)
 *
 * Body: { accountName?, accountType?, openingBalance?, openingBalanceDate? }
 */
router.patch('/connections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = [];
    const values = [];

    if (req.body.accountName !== undefined) {
      const accountName = String(req.body.accountName || '').trim();
      if (!accountName) {
        return res.status(400).json({ error: 'Account name required' });
      }
      if (accountName.length > 255) {
        return res.status(400).json({ error: 'Account name too long (max 255 characters)' });
      }
      values.push(accountName);
      updates.push(`account_name = $${values.length}`);
    }

    if (req.body.accountType !== undefined) {
      const accountType = String(req.body.accountType || '').trim();
      if (!ACCOUNT_TYPES.has(accountType)) {
        return res.status(400).json({ error: 'Invalid account type' });
      }
      values.push(accountType);
      updates.push(`account_type = $${values.length}`);
    }

    if (req.body.openingBalance !== undefined) {
      const rawBalance = req.body.openingBalance;
      let openingBalance = null;
      if (rawBalance !== null && rawBalance !== '') {
        const parsedBalance = Number.parseFloat(rawBalance);
        if (!Number.isFinite(parsedBalance)) {
          return res.status(400).json({ error: 'Opening balance must be a number' });
        }
        openingBalance = parsedBalance;
      }
      values.push(openingBalance);
      updates.push(`opening_balance = $${values.length}`);
    }

    if (req.body.openingBalanceDate !== undefined) {
      const normalizedDate = normalizeTransactionDate(req.body.openingBalanceDate);
      if (req.body.openingBalanceDate && !normalizedDate) {
        return res.status(400).json({ error: 'Invalid opening balance date' });
      }
      values.push(normalizedDate);
      updates.push(`opening_balance_date = $${values.length}`);
    }

    if (req.body.creditLimit !== undefined) {
      const rawLimit = req.body.creditLimit;
      let creditLimit = null;
      if (rawLimit !== null && rawLimit !== '') {
        const parsedLimit = Number.parseFloat(rawLimit);
        if (!Number.isFinite(parsedLimit)) {
          return res.status(400).json({ error: 'Credit limit must be a number' });
        }
        creditLimit = Math.abs(parsedLimit);
      }
      values.push(creditLimit);
      updates.push(`credit_limit = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(id, req.user.id);

    const result = await pool.query(
      `UPDATE simplefin_connections
       SET ${updates.join(', ')},
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $${values.length - 1} AND user_id = $${values.length}
       RETURNING id, account_name, last_sync_at, is_active, created_at, updated_at,
                 account_type, opening_balance, opening_balance_date,
                 balance, balance_date, available_balance, available_balance_date, credit_limit`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    res.json({ connection: result.rows[0] });
  } catch (error) {
    console.error('[BusinessExpenses] Update connection error:', error);
    res.status(500).json({ error: 'Failed to update connection' });
  }
});

/**
 * DELETE /api/business-expenses/connections/:id
 * Disconnect a business card (soft disconnect).
 * Optional query: deleteHistory=true to clear sync history.
 *
 * Returns: { message }
 */
router.delete('/connections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleteHistory = ['1', 'true', 'yes'].includes(String(req.query.deleteHistory || '').toLowerCase());

    const result = await pool.query(
      `UPDATE simplefin_connections
       SET is_active = false,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING id, account_name`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    if (deleteHistory) {
      await pool.query(
        'DELETE FROM transaction_sync_log WHERE connection_id = $1',
        [id]
      );
      await pool.query(
        'UPDATE simplefin_connections SET last_sync_at = NULL WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );
    }

    console.log(
      `[BusinessExpenses] Connection disconnected: ${result.rows[0].account_name} (history ${deleteHistory ? 'cleared' : 'kept'})`
    );

    res.json({
      message: deleteHistory
        ? 'Connection disconnected. Saved transactions removed.'
        : 'Connection disconnected successfully'
    });
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
    const debug = req.query.debug === '1' || req.query.debug === 'true' || req.body?.debug === true;
    const force = req.query.force === '1' || req.query.force === 'true' || req.body?.force === true;

    // Verify ownership
    const check = await pool.query(
      'SELECT id FROM simplefin_connections WHERE id = $1 AND user_id = $2',
      [connectionId, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const syncLimit = await getSyncLimitStatus(req.user.id);
    if (syncLimit.remaining <= 0) {
      return res.status(429).json({
        error: `Daily sync limit reached (${syncLimit.limit} per day).`,
        syncLimit
      });
    }

    await pool.query(
      `INSERT INTO simplefin_sync_attempts
       (user_id, connection_id)
       VALUES ($1, $2)`,
      [req.user.id, connectionId]
    );

    console.log(`[BusinessExpenses] Manual sync requested for connection ${connectionId}`);

    // Import sync service here to avoid circular dependencies
    const syncService = require('../services/syncService');

    const result = await syncService.syncConnection(parseInt(connectionId, 10), { debug, force });
    const updatedSyncLimit = await getSyncLimitStatus(req.user.id);

    res.json({
      message: 'Sync completed',
      imported: result.imported,
      skipped: result.skipped,
      total: result.total,
      syncLimit: updatedSyncLimit,
      ...(debug ? { debug: result.debug || null } : {})
    });
  } catch (error) {
    console.error('[BusinessExpenses] Manual sync error:', error);
    res.status(500).json({ error: error.message || 'Sync failed' });
  }
});

/**
 * POST /api/business-expenses/sync-reset
 * Reset manual sync attempt counter for current user
 *
 * Returns: { message, syncLimit }
 */
router.post('/sync-reset', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM simplefin_sync_attempts WHERE user_id = $1',
      [req.user.id]
    );

    const syncLimit = await getSyncLimitStatus(req.user.id);
    res.json({ message: 'Sync limit reset', syncLimit });
  } catch (error) {
    console.error('[BusinessExpenses] Sync reset error:', error);
    res.status(500).json({ error: 'Failed to reset sync limit' });
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
    const syncLimit = await getSyncLimitStatus(req.user.id);

    res.json({
      configured: fireflyConfigured,
      connectionCount: connectionCount,
      syncLimit
    });
  } catch (error) {
    console.error('[BusinessExpenses] Status check error:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

module.exports = router;




