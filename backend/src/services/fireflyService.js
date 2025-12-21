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
 * Create or get expense account in Firefly III
 *
 * Creates an expense account for a business card.
 * Account name format: "[User Name] - [Card Name]"
 *
 * @param {string} accountName - Full account name (e.g., "John Doe - Chase Business Visa")
 * @returns {Promise<object>} - Firefly account object with id
 * @throws {Error} - If creation fails
 */
async function createExpenseAccount(accountName) {
  const client = createClient();

  try {
    console.log(`[Firefly] Creating expense account: ${accountName}`);

    // Firefly III API expects nested data structure
    const response = await client.post('/accounts', {
      name: accountName,
      type: 'expense', // Expense account type
      active: true,
      account_role: null // No specific role for expense accounts
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
            params: { type: 'expense' }
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
 * Import transaction into Firefly III
 *
 * @param {object} transaction - Transaction data
 * @param {string} transaction.date - Transaction date (YYYY-MM-DD)
 * @param {number} transaction.amount - Transaction amount (negative for expense)
 * @param {string} transaction.description - Transaction description
 * @param {string} transaction.sourceAccountId - Firefly III source account ID
 * @param {string} transaction.externalId - SimpleFIN transaction ID (for deduplication)
 * @param {string} [transaction.notes] - Optional notes
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
      sourceAccountId,
      externalId,
      notes
    } = transaction;

    // Validate required fields
    if (!date || !amount || !description || !sourceAccountId || !externalId) {
      throw new Error('Missing required transaction fields');
    }

    console.log(`[Firefly] Importing transaction: ${description} (${date})`);

    // Firefly III transaction structure
    const payload = {
      error_if_duplicate_hash: true, // Firefly handles deduplication
      apply_rules: true, // Apply user-configured Firefly rules
      fire_webhooks: true, // Trigger Firefly webhooks if configured
      transactions: [
        {
          type: 'withdrawal', // Expense transaction
          date: date,
          amount: Math.abs(amount).toFixed(2), // Always positive, Firefly uses type for direction
          description: description || 'Business expense',
          source_id: sourceAccountId, // Firefly account ID for business card
          destination_name: 'Business Expenses', // Generic expense category
          external_id: externalId, // SimpleFIN transaction ID
          notes: notes || null
        }
      ]
    };

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
        throw new Error('Transaction validation failed');
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

module.exports = {
  createExpenseAccount,
  importTransaction
};
