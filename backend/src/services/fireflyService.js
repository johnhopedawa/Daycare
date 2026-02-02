/**
 * Firefly III API Service
 *
 * Implements Firefly III API for expense tracking
 * Official docs: https://docs.firefly-iii.org/how-to/firefly-iii/features/api/
 * API Reference: https://api-docs.firefly-iii.org/
 *
 * Authentication: Bearer token (Personal Access Token)
 * API Base: http://firefly:8080/api/v1
 */

const axios = require('axios');

const FIREFLY_BASE_URL = process.env.FIREFLY_BASE_URL || 'http://firefly:8080';
const FIREFLY_SERVICE_PAT = process.env.FIREFLY_SERVICE_PAT;

// Validate service PAT on module load
if (!FIREFLY_SERVICE_PAT) {
  console.warn('[Firefly] FIREFLY_SERVICE_PAT not configured. Firefly III integration will not work.');
}

/**
 * Create Firefly III API client with Bearer token
 *
 * @returns {object} - Axios instance with auth header
 */
function createClient() {
  if (!FIREFLY_SERVICE_PAT) {
    throw new Error('Firefly III service PAT not configured');
  }

  return axios.create({
    baseURL: `${FIREFLY_BASE_URL}/api/v1`,
    headers: {
      'Authorization': `Bearer ${FIREFLY_SERVICE_PAT}`,
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });
}

/**
 * Create or get asset account in Firefly III
 *
 * Creates an asset account for a business card.
 * Account name format: "[User Name] - [Card Name]"
 *
 * @param {string} accountName - Full account name (e.g., "John Doe - Chase Business Visa")
 * @returns {Promise<object>} - Firefly account object with id
 * @throws {Error} - If creation fails
 */
async function createAssetAccount(accountName) {
  const client = createClient();

  try {
    console.log(`[Firefly] Creating asset account: ${accountName}`);

    // Firefly III API expects nested data structure
    const response = await client.post('/accounts', {
      name: accountName,
      type: 'asset', // Asset account type for withdrawals
      active: true,
      account_role: 'sharedAsset' // Required for asset accounts
    });

    // Firefly returns: { data: { id: "123", attributes: {...} } }
    if (!response.data || !response.data.data || !response.data.data.id) {
      console.error('[Firefly] Invalid create account response:', response.data);
      throw new Error('Invalid response from Firefly III');
    }

    const accountId = response.data.data.id;
    console.log(`[Firefly] Account created successfully: ID ${accountId}`);

    return {
      id: accountId,
      name: response.data.data.attributes?.name || accountName
    };
  } catch (error) {
    if (error.response) {
      console.error('[Firefly] Create account error:', {
        status: error.response.status,
        data: error.response.data
      });

      // Handle duplicate account name (409 or 422)
      if (error.response.status === 422 || error.response.status === 409) {
        // Account may already exist - try to find it
        console.log('[Firefly] Account may already exist, searching...');
        try {
          const searchResponse = await client.get('/accounts', {
            params: { type: 'asset' }
          });

          const existingAccount = searchResponse.data.data.find(
            acc => acc.attributes.name === accountName
          );

          if (existingAccount) {
            console.log(`[Firefly] Found existing account: ID ${existingAccount.id}`);
            return {
              id: existingAccount.id,
              name: existingAccount.attributes.name
            };
          }

          const fallbackName = `${accountName} (Card)`;
          console.log(`[Firefly] Creating account with fallback name: ${fallbackName}`);
          const fallbackResponse = await client.post('/accounts', {
            name: fallbackName,
            type: 'asset',
            active: true,
            account_role: 'sharedAsset'
          });

          if (!fallbackResponse.data || !fallbackResponse.data.data || !fallbackResponse.data.data.id) {
            console.error('[Firefly] Invalid fallback account response:', fallbackResponse.data);
            throw new Error('Invalid response from Firefly III');
          }

          const fallbackId = fallbackResponse.data.data.id;
          console.log(`[Firefly] Account created successfully: ID ${fallbackId}`);

          return {
            id: fallbackId,
            name: fallbackResponse.data.data.attributes?.name || fallbackName
          };
        } catch (searchError) {
          console.error('[Firefly] Error searching for existing account:', searchError.message);
        }

        throw new Error('Account name already exists');
      } else if (error.response.status === 401) {
        throw new Error('Firefly III authentication failed (check service PAT)');
      } else {
        throw new Error(`Firefly III API error: ${error.response.status}`);
      }
    } else if (error.request) {
      console.error('[Firefly] Network error:', error.message);
      throw new Error('Unable to connect to Firefly III');
    } else {
      console.error('[Firefly] Error:', error.message);
      throw error;
    }
  }
}

/**
 * Create or get revenue account in Firefly III
 *
 * @param {string} accountName - Revenue account name
 * @returns {Promise<object>} - Firefly account object with id
 * @throws {Error} - If creation fails
 */
async function createRevenueAccount(accountName) {
  const client = createClient();

  try {
    console.log(`[Firefly] Creating revenue account: ${accountName}`);

    const response = await client.post('/accounts', {
      name: accountName,
      type: 'revenue',
      active: true
    });

    if (!response.data || !response.data.data || !response.data.data.id) {
      console.error('[Firefly] Invalid create revenue response:', response.data);
      throw new Error('Invalid response from Firefly III');
    }

    const accountId = response.data.data.id;
    console.log(`[Firefly] Revenue account created successfully: ID ${accountId}`);

    return {
      id: accountId,
      name: response.data.data.attributes?.name || accountName
    };
  } catch (error) {
    if (error.response) {
      console.error('[Firefly] Create revenue account error:', {
        status: error.response.status,
        data: error.response.data
      });

      if (error.response.status === 422 || error.response.status === 409) {
        console.log('[Firefly] Revenue account may already exist, searching...');
        try {
          const searchResponse = await client.get('/accounts', {
            params: { type: 'revenue' }
          });

          const existingAccount = searchResponse.data.data.find(
            acc => acc.attributes.name === accountName
          );

          if (existingAccount) {
            console.log(`[Firefly] Found existing revenue account: ID ${existingAccount.id}`);
            return {
              id: existingAccount.id,
              name: existingAccount.attributes.name
            };
          }
        } catch (searchError) {
          console.error('[Firefly] Error searching for revenue account:', searchError.message);
        }

        throw new Error('Revenue account name already exists');
      } else if (error.response.status === 401) {
        throw new Error('Firefly III authentication failed (check service PAT)');
      } else {
        throw new Error(`Firefly III API error: ${error.response.status}`);
      }
    } else if (error.request) {
      console.error('[Firefly] Network error:', error.message);
      throw new Error('Unable to connect to Firefly III');
    } else {
      console.error('[Firefly] Error:', error.message);
      throw error;
    }
  }
}

async function getAccountById(accountId) {
  const client = createClient();

  try {
    const response = await client.get(`/accounts/${accountId}`);

    if (!response.data || !response.data.data || !response.data.data.id) {
      console.error('[Firefly] Invalid account response:', response.data);
      throw new Error('Invalid response from Firefly III');
    }

    return {
      id: response.data.data.id,
      name: response.data.data.attributes?.name,
      type: response.data.data.attributes?.type
    };
  } catch (error) {
    if (error.response) {
      if (error.response.status === 404) {
        return null;
      }
      if (error.response.status === 401) {
        throw new Error('Firefly III authentication failed');
      }
      console.error('[Firefly] Account fetch error:', {
        status: error.response.status,
        data: error.response.data
      });
      throw new Error(`Firefly III API error: ${error.response.status}`);
    }
    if (error.request) {
      console.error('[Firefly] Network error:', error.message);
      throw new Error('Unable to connect to Firefly III');
    }
    console.error('[Firefly] Error:', error.message);
    throw error;
  }
}

async function findAccountByName(name, type) {
  const client = createClient();

  try {
    const response = await client.get('/accounts', {
      params: type ? { type } : undefined
    });

    if (!response.data || !Array.isArray(response.data.data)) {
      console.error('[Firefly] Invalid accounts response:', response.data);
      throw new Error('Invalid response from Firefly III');
    }

    const account = response.data.data.find(
      acc => acc.attributes?.name === name
    );

    if (!account) {
      return null;
    }

    return {
      id: account.id,
      name: account.attributes?.name,
      type: account.attributes?.type
    };
  } catch (error) {
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('Firefly III authentication failed');
      }
      console.error('[Firefly] Account search error:', {
        status: error.response.status,
        data: error.response.data
      });
      throw new Error(`Firefly III API error: ${error.response.status}`);
    }
    if (error.request) {
      console.error('[Firefly] Network error:', error.message);
      throw new Error('Unable to connect to Firefly III');
    }
    console.error('[Firefly] Error:', error.message);
    throw error;
  }
}

async function ensureAssetAccount(accountId, accountName) {
  let account = null;
  if (accountId) {
    account = await getAccountById(accountId);
  }

  if (account && account.type === 'asset') {
    return account;
  }

  const desiredName = accountName || account?.name || 'Business Card';
  const existingAsset = await findAccountByName(desiredName, 'asset');
  if (existingAsset) {
    return existingAsset;
  }

  return createAssetAccount(desiredName);
}

async function ensureRevenueAccount(accountName) {
  const desiredName = accountName || 'Business Income';
  const existingRevenue = await findAccountByName(desiredName, 'revenue');
  if (existingRevenue) {
    return existingRevenue;
  }

  return createRevenueAccount(desiredName);
}

/**
 * Import transaction into Firefly III
 *
 * @param {object} transaction - Transaction data
 * @param {string} transaction.date - Transaction date (YYYY-MM-DD)
 * @param {number} transaction.amount - Absolute transaction amount
 * @param {string} transaction.description - Transaction description
 * @param {string} transaction.assetAccountId - Firefly III asset account ID
 * @param {string} transaction.externalId - SimpleFIN transaction ID (for deduplication)
 * @param {string} transaction.direction - "withdrawal" or "deposit"
 * @param {string} [transaction.notes] - Optional notes
 * @param {string} [transaction.incomeAccountName] - Optional revenue account name
 * @returns {Promise<object|null>} - Firefly transaction object, or null if duplicate
 * @throws {Error} - If import fails (except duplicates)
 */
async function importTransaction(transaction) {
  const client = createClient();

  try {
    const {
      date,
      amount,
      description,
      assetAccountId,
      externalId,
      direction,
      notes,
      incomeAccountName
    } = transaction;

    // Validate required fields
    if (!date || !amount || !description || !assetAccountId || !externalId) {
      throw new Error('Missing required transaction fields');
    }

    const normalizedDirection = direction === 'deposit' ? 'deposit' : 'withdrawal';
    console.log(`[Firefly] Importing ${normalizedDirection}: ${description} (${date})`);

    // Firefly III transaction structure
    const payload = {
      error_if_duplicate_hash: true, // Firefly handles deduplication
      apply_rules: true, // Apply user-configured Firefly rules
      fire_webhooks: true, // Trigger Firefly webhooks if configured
      transactions: [
        {
          type: normalizedDirection,
          date: date,
          amount: Math.abs(amount).toFixed(2), // Always positive, Firefly uses type for direction
          description: description || 'Business transaction',
          external_id: externalId, // SimpleFIN transaction ID
          notes: notes || null
        }
      ]
    };

    if (normalizedDirection === 'withdrawal') {
      payload.transactions[0].source_id = assetAccountId;
      payload.transactions[0].destination_name = 'Business Expenses';
    } else {
      const revenueAccount = await ensureRevenueAccount(incomeAccountName);
      payload.transactions[0].source_id = revenueAccount.id;
      payload.transactions[0].destination_id = assetAccountId;
    }

    const response = await client.post('/transactions', payload);

    if (!response.data || !response.data.data || !response.data.data.id) {
      console.error('[Firefly] Invalid transaction response:', response.data);
      throw new Error('Invalid response from Firefly III');
    }

    const transactionId = response.data.data.id;
    console.log(`[Firefly] Transaction imported: ID ${transactionId}`);

    return {
      id: transactionId,
      description: description
    };
  } catch (error) {
    if (error.response) {
      // Duplicate transactions return 422 with specific error
      if (error.response.status === 422) {
        const errorData = error.response.data;

        // Check if it's a duplicate error
        if (errorData && errorData.message && errorData.message.includes('duplicate')) {
          console.log(`[Firefly] Duplicate transaction skipped: ${transaction.externalId}`);
          return null; // Return null for duplicates (expected behavior)
        }

        // Other 422 errors
        console.error('[Firefly] Validation error:', errorData);
        let detail = '';
        if (errorData && typeof errorData.message === 'string') {
          detail = errorData.message.trim();
        }
        if (!detail && errorData && typeof errorData.errors === 'object') {
          const entries = Object.entries(errorData.errors);
          if (entries.length > 0) {
            const [field, messages] = entries[0];
            if (Array.isArray(messages) && messages.length > 0) {
              detail = `${field}: ${messages[0]}`;
            } else if (messages) {
              detail = `${field}: ${messages}`;
            }
          }
        }
        const suffix = detail ? ` (${detail})` : '';
        throw new Error(`Transaction validation failed${suffix}`);
      } else if (error.response.status === 401) {
        throw new Error('Firefly III authentication failed');
      } else {
        console.error('[Firefly] Import error:', {
          status: error.response.status,
          data: error.response.data
        });
        throw new Error(`Firefly III API error: ${error.response.status}`);
      }
    } else if (error.request) {
      console.error('[Firefly] Network error:', error.message);
      throw new Error('Unable to connect to Firefly III');
    } else {
      console.error('[Firefly] Error:', error.message);
      throw error;
    }
  }
}

function toDateParam(value) {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  return null;
}

function normalizeTransactionGroups(data) {
  if (!Array.isArray(data)) {
    return [];
  }

  const transactions = [];

  data.forEach((entry) => {
    const attributes = entry && entry.attributes ? entry.attributes : null;
    if (!attributes) {
      return;
    }

    const base = {
      group_id: entry.id || null,
      group_title: attributes.group_title || null
    };

    if (Array.isArray(attributes.transactions) && attributes.transactions.length > 0) {
      attributes.transactions.forEach((transaction) => {
        transactions.push({
          ...base,
          ...transaction
        });
      });
    } else {
      transactions.push({
        ...base,
        ...attributes
      });
    }
  });

  return transactions;
}

/**
 * Fetch transactions for a specific Firefly account.
 *
 * @param {string} accountId - Firefly III account ID
 * @param {object} [options]
 * @param {Date|string} [options.startDate] - Start date YYYY-MM-DD
 * @param {Date|string} [options.endDate] - End date YYYY-MM-DD
 * @param {string} [options.type] - Transaction type filter
 * @param {number} [options.limit] - Max results per page
 * @param {number} [options.page] - Page number
 * @returns {Promise<Array>} - Flattened Firefly transaction list
 */
async function fetchAccountTransactions(accountId, options = {}) {
  const client = createClient();
  const params = {};

  const startDate = toDateParam(options.startDate);
  const endDate = toDateParam(options.endDate);

  if (startDate) {
    params.start = startDate;
  }
  if (endDate) {
    params.end = endDate;
  }
  if (options.type) {
    params.type = options.type;
  }
  if (options.limit) {
    params.limit = options.limit;
  }
  const overallLimit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : null;
  const maxPages = Number.isFinite(Number(options.maxPages))
    ? Number(options.maxPages)
    : 100;
  let page = Number.isFinite(Number(options.page)) ? Number(options.page) : 1;

  const collected = [];

  try {
    while (true) {
      params.page = page;
      const response = await client.get(`/accounts/${accountId}/transactions`, { params });

      if (!response.data || !Array.isArray(response.data.data)) {
        console.error('[Firefly] Invalid transactions response:', response.data);
        throw new Error('Invalid response from Firefly III');
      }

      const normalized = normalizeTransactionGroups(response.data.data);
      collected.push(...normalized);

      if (overallLimit && collected.length >= overallLimit) {
        return collected.slice(0, overallLimit);
      }

      const pagination = response.data.meta?.pagination;
      if (pagination && Number.isFinite(Number(pagination.current_page))) {
        const currentPage = Number(pagination.current_page);
        const totalPages = Number.isFinite(Number(pagination.total_pages))
          ? Number(pagination.total_pages)
          : currentPage;
        if (currentPage >= totalPages) {
          break;
        }
        page = currentPage + 1;
      } else {
        const pageCount = response.data.data.length;
        if (pageCount === 0) {
          break;
        }
        page += 1;
      }

      if (page > maxPages) {
        console.warn('[Firefly] Pagination limit reached, stopping fetch.');
        break;
      }
    }

    return collected;
  } catch (error) {
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('Firefly III authentication failed');
      }
      console.error('[Firefly] Transaction fetch error:', {
        status: error.response.status,
        data: error.response.data
      });
      throw new Error(`Firefly III API error: ${error.response.status}`);
    }
    if (error.request) {
      console.error('[Firefly] Network error:', error.message);
      throw new Error('Unable to connect to Firefly III');
    }
    console.error('[Firefly] Error:', error.message);
    throw error;
  }
}

module.exports = {
  createAssetAccount,
  ensureAssetAccount,
  createRevenueAccount,
  ensureRevenueAccount,
  importTransaction,
  fetchAccountTransactions
};
