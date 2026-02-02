/**
 * SimpleFIN Bridge API Service
 *
 * Implements SimpleFIN Protocol for bank transaction access
 * Official docs: https://www.simplefin.org/protocol.html
 *
 * Flow:
 * 1. User obtains Setup Token from SimpleFIN Bridge (https://bridge.simplefin.org/simplefin/create)
 * 2. Setup Token is Base64-encoded URL
 * 3. POST to decoded URL -> receive Access URL
 * 4. Access URL contains embedded Basic Auth credentials
 * 5. Use Access URL for API calls
 *
 * Rate Limit: 24 requests per day maximum
 */

const axios = require('axios');

function normalizeAccessUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const pathname = url.pathname.replace(/\/+$/, '');
    if (!pathname.endsWith('/simplefin/accounts')) {
      if (pathname.endsWith('/simplefin')) {
        url.pathname = `${pathname}/accounts`;
      } else if (!pathname || pathname === '/') {
        url.pathname = '/simplefin/accounts';
      }
    }
    return url.toString();
  } catch (error) {
    return rawUrl;
  }
}

/**
 * Exchange SimpleFIN Setup Token for Access URL
 *
 * Per SimpleFIN protocol: Setup Token decodes to a claim URL.
 * You must POST to that URL to receive the Access URL.
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

    // Decode the Base64 setup token to get the claim URL
    let claimUrl;
    try {
      const normalized = setupToken.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      claimUrl = Buffer.from(padded, 'base64').toString('utf8');
    } catch (decodeError) {
      throw new Error('Invalid setup token format (must be Base64)');
    }

    // Validate claim URL format
    if (!claimUrl.startsWith('http://') && !claimUrl.startsWith('https://')) {
      throw new Error('Invalid setup token (decoded URL is invalid)');
    }

    console.log('[SimpleFIN] Setup token decoded. Claiming access URL...');

    const response = await axios.post(claimUrl, null, {
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Daycare-SimpleFIN/1.0'
      },
      timeout: 10000
    });

    let accessUrl = response.data;
    if (typeof accessUrl === 'object' && accessUrl !== null) {
      accessUrl = accessUrl.access_url || accessUrl.url || '';
    }

    if (typeof accessUrl === 'string') {
      accessUrl = accessUrl.trim();
    }

    if (!accessUrl || (!accessUrl.startsWith('http://') && !accessUrl.startsWith('https://'))) {
      throw new Error('Invalid SimpleFIN claim response');
    }

    const normalizedAccessUrl = normalizeAccessUrl(accessUrl);
    try {
      const safeUrl = new URL(normalizedAccessUrl);
      console.log(`[SimpleFIN] Access URL claimed for ${safeUrl.host}${safeUrl.pathname}`);
    } catch (logError) {
      console.log('[SimpleFIN] Access URL claimed successfully');
    }

    return normalizedAccessUrl;
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

    const normalizedAccessUrl = normalizeAccessUrl(accessUrl);

    // Access URL includes Basic Auth credentials
    // SimpleFIN format: https://username:password@bridge.simplefin.org/simplefin/accounts
    let response;
    try {
      response = await axios.get(normalizedAccessUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Daycare-SimpleFIN/1.0'
        },
        timeout: 30000
      });
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.warn('[SimpleFIN] Accounts request timed out, retrying...');
        response = await axios.get(normalizedAccessUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Daycare-SimpleFIN/1.0'
          },
          timeout: 30000
        });
      } else {
        throw error;
      }
    }

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
 * @param {number} startDate - Unix timestamp in seconds for transaction start
 * @returns {Promise<object>} - { transactions, account }
 * @throws {Error} - If fetch fails
 */
async function fetchTransactions(accessUrl, accountId, startDate) {
  try {
    if (!accessUrl || !accountId) {
      throw new Error('Access URL and account ID are required');
    }

    console.log(`[SimpleFIN] Fetching transactions for account ${accountId} since ${startDate}`);

    const normalizedAccessUrl = normalizeAccessUrl(accessUrl);

    // SimpleFIN returns all accounts with transactions
    // We filter by start date using query parameter
    const params = {};
    if (startDate) {
      params['start-date'] = startDate; // SimpleFIN uses 'start-date' query param
    }

    let response;
    try {
      response = await axios.get(normalizedAccessUrl, {
        params,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Daycare-SimpleFIN/1.0'
        },
        timeout: 30000
      });
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.warn('[SimpleFIN] Transactions request timed out, retrying...');
        response = await axios.get(normalizedAccessUrl, {
          params,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Daycare-SimpleFIN/1.0'
          },
          timeout: 30000
        });
      } else {
        throw error;
      }
    }

    if (!response.data || !Array.isArray(response.data.accounts)) {
      console.error('[SimpleFIN] Invalid transactions response:', response.data);
      throw new Error('Invalid response from SimpleFIN');
    }

    // Find the specific account (normalize ID types for safety)
    const accountIdKey = String(accountId);
    const account = response.data.accounts.find((a) => {
      const candidateId = a?.id ?? a?.account_id ?? a?.accountId;
      if (candidateId === null || candidateId === undefined) {
        return false;
      }
      return String(candidateId) === accountIdKey;
    });

    if (!account) {
      console.warn(`[SimpleFIN] Account ${accountId} not found in response`);
      return { transactions: [], account: null };
    }

    const transactions = account.transactions || [];
    console.log(`[SimpleFIN] Found ${transactions.length} transaction(s)`);

    return { transactions, account };
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

