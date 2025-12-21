/**
 * SimpleFIN Bridge API Service
 *
 * Implements SimpleFIN Protocol for bank transaction access
 * Official docs: https://www.simplefin.org/protocol.html
 *
 * Flow:
 * 1. User obtains Setup Token from SimpleFIN Bridge (https://bridge.simplefin.org/simplefin/create)
 * 2. Setup Token is Base64-encoded URL
 * 3. POST to decoded URL → receive Access URL
 * 4. Access URL contains embedded Basic Auth credentials
 * 5. Use Access URL for API calls
 *
 * Rate Limit: 24 requests per day maximum
 */

const axios = require('axios');

/**
 * Exchange SimpleFIN Setup Token for Access URL
 *
 * Per SimpleFIN protocol: Setup Token IS the Access URL (Base64-encoded)
 * No POST required - just decode and validate
 *
 * @param {string} setupToken - Base64-encoded setup token from user
 * @returns {Promise<string>} - Access URL (includes Basic Auth credentials)
 * @throws {Error} - If decoding fails
 */
async function claimSetupToken(setupToken) {
  try {
    // Validate input
    if (!setupToken || typeof setupToken !== 'string') {
      throw new Error('Setup token is required');
    }

    // Decode the Base64 setup token to get the Access URL
    let accessUrl;
    try {
      accessUrl = Buffer.from(setupToken, 'base64').toString('utf8');
    } catch (decodeError) {
      throw new Error('Invalid setup token format (must be Base64)');
    }

    // Validate Access URL format
    // SimpleFIN Access URLs have embedded credentials: https://user:pass@host/path
    if (!accessUrl.startsWith('http://') && !accessUrl.startsWith('https://')) {
      throw new Error('Invalid setup token (decoded URL is invalid)');
    }

    console.log('[SimpleFIN] Setup token decoded successfully');

    // The decoded token IS the Access URL - return it directly
    return accessUrl;
  } catch (error) {
    console.error('[SimpleFIN] Setup token error:', error.message);
    throw error;
  }
}

/**
 * Fetch accounts from SimpleFIN using Access URL
 *
 * @param {string} accessUrl - SimpleFIN Access URL (includes Basic Auth)
 * @returns {Promise<Array>} - Array of account objects
 * @throws {Error} - If fetch fails
 */
async function fetchAccounts(accessUrl) {
  try {
    if (!accessUrl || typeof accessUrl !== 'string') {
      throw new Error('Access URL is required');
    }

    console.log('[SimpleFIN] Fetching accounts...');

    // Access URL includes Basic Auth credentials
    // SimpleFIN format: https://username:password@bridge.simplefin.org/simplefin/accounts
    const response = await axios.get(accessUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Daycare-SimpleFIN/1.0'
      },
      timeout: 10000
    });

    // SimpleFIN returns: { "accounts": [...] }
    if (!response.data || !Array.isArray(response.data.accounts)) {
      console.error('[SimpleFIN] Invalid accounts response:', response.data);
      throw new Error('Invalid response from SimpleFIN accounts endpoint');
    }

    const accounts = response.data.accounts;
    console.log(`[SimpleFIN] Found ${accounts.length} account(s)`);

    return accounts;
  } catch (error) {
    if (error.response) {
      console.error('[SimpleFIN] Fetch accounts error:', {
        status: error.response.status,
        data: error.response.data
      });

      if (error.response.status === 401) {
        throw new Error('SimpleFIN access revoked or expired');
      } else {
        throw new Error(`SimpleFIN API error: ${error.response.status}`);
      }
    } else if (error.request) {
      console.error('[SimpleFIN] Network error:', error.message);
      throw new Error('Unable to connect to SimpleFIN Bridge');
    } else {
      console.error('[SimpleFIN] Error:', error.message);
      throw error;
    }
  }
}

/**
 * Fetch transactions from SimpleFIN for a specific account
 *
 * @param {string} accessUrl - SimpleFIN Access URL
 * @param {string} accountId - SimpleFIN account ID
 * @param {string} startDate - ISO date (YYYY-MM-DD) for transaction start
 * @returns {Promise<Array>} - Array of transaction objects
 * @throws {Error} - If fetch fails
 */
async function fetchTransactions(accessUrl, accountId, startDate) {
  try {
    if (!accessUrl || !accountId) {
      throw new Error('Access URL and account ID are required');
    }

    console.log(`[SimpleFIN] Fetching transactions for account ${accountId} since ${startDate}`);

    // SimpleFIN returns all accounts with transactions
    // We filter by start date using query parameter
    const params = {};
    if (startDate) {
      params['start-date'] = startDate; // SimpleFIN uses 'start-date' query param
    }

    const response = await axios.get(accessUrl, {
      params,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Daycare-SimpleFIN/1.0'
      },
      timeout: 15000 // 15 seconds for transactions (can be larger response)
    });

    if (!response.data || !Array.isArray(response.data.accounts)) {
      console.error('[SimpleFIN] Invalid transactions response:', response.data);
      throw new Error('Invalid response from SimpleFIN');
    }

    // Find the specific account
    const account = response.data.accounts.find(a => a.id === accountId);

    if (!account) {
      console.warn(`[SimpleFIN] Account ${accountId} not found in response`);
      return [];
    }

    const transactions = account.transactions || [];
    console.log(`[SimpleFIN] Found ${transactions.length} transaction(s)`);

    return transactions;
  } catch (error) {
    if (error.response) {
      console.error('[SimpleFIN] Fetch transactions error:', {
        status: error.response.status,
        data: error.response.data
      });

      if (error.response.status === 401) {
        throw new Error('SimpleFIN access revoked or expired');
      } else if (error.response.status === 429) {
        throw new Error('SimpleFIN rate limit exceeded (max 24 requests/day)');
      } else {
        throw new Error(`SimpleFIN API error: ${error.response.status}`);
      }
    } else if (error.request) {
      console.error('[SimpleFIN] Network error:', error.message);
      throw new Error('Unable to connect to SimpleFIN Bridge');
    } else {
      console.error('[SimpleFIN] Error:', error.message);
      throw error;
    }
  }
}

module.exports = {
  claimSetupToken,
  fetchAccounts,
  fetchTransactions
};
