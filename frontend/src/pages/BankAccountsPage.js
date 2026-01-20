import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { motion } from 'framer-motion';
import { Building2, DollarSign, TrendingDown, Calendar } from 'lucide-react';
import api from '../utils/api';
import { BaseModal } from '../components/modals/BaseModal';

export function BankAccountsPage() {
  const [connections, setConnections] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState({ totalExpenses: 0, transactionCount: 0 });
  const [loading, setLoading] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const [accountName, setAccountName] = useState('');
  const [simplefinAccounts, setSimplefinAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [pendingClaimToken, setPendingClaimToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expensesError, setExpensesError] = useState('');

  const resetConnectForm = () => {
    setSetupToken('');
    setAccountName('');
    setSimplefinAccounts([]);
    setSelectedAccountId('');
    setPendingClaimToken('');
    setError('');
  };

  useEffect(() => {
    loadBankingData();
  }, []);

  const loadBankingData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      setError('');
      setExpensesError('');
      const [connectionsRes, expensesRes] = await Promise.allSettled([
        api.get('/business-expenses/connections'),
        api.get('/business-expenses'),
      ]);

      if (connectionsRes.status === 'fulfilled') {
        setConnections(connectionsRes.value.data.connections || []);
      } else {
        console.error('Failed to load connections:', connectionsRes.reason);
        setConnections([]);
        setError('Failed to load connected accounts.');
      }

      if (expensesRes.status === 'fulfilled') {
        const expenseData = expensesRes.value.data.expenses || [];
        setExpenses(expenseData);

        const totalExpenses = expenseData.reduce(
          (sum, exp) => sum + parseFloat(exp.amount || 0),
          0
        );

        setStats({
          totalExpenses,
          transactionCount: expenseData.length,
        });
      } else {
        console.error('Failed to load expenses:', expensesRes.reason);
        setExpenses([]);
        setStats({ totalExpenses: 0, transactionCount: 0 });
        setExpensesError('Expense feed unavailable.');
      }
    } catch (error) {
      console.error('Failed to load banking data:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const cardStyles = [
    { backgroundColor: 'var(--card-1)', color: 'var(--card-text-1)' },
    { backgroundColor: 'var(--card-2)', color: 'var(--card-text-2)' },
    { backgroundColor: 'var(--card-3)', color: 'var(--card-text-3)' },
    { backgroundColor: 'var(--card-4)', color: 'var(--card-text-4)' },
  ];
  const categoryIndexMap = {
    supplies: 0,
    utilities: 1,
    payroll: 2,
    rent: 3,
  };
  const hashString = (value) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  };
  const getCategoryStyle = (category) => {
    const normalized = (category || '').toLowerCase().trim();
    if (!normalized) {
      return cardStyles[0];
    }
    const mappedIndex = categoryIndexMap[normalized];
    const index = Number.isInteger(mappedIndex)
      ? mappedIndex
      : hashString(normalized) % cardStyles.length;
    return cardStyles[index];
  };

  const handleConnectAccount = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setConnecting(true);

    try {
      if (pendingClaimToken && !selectedAccountId) {
        setError('Please choose an account to connect.');
        return;
      }

      const payload = pendingClaimToken
        ? {
          claimToken: pendingClaimToken,
          accountName,
          simplefinAccountId: selectedAccountId,
        }
        : {
          setupToken,
          accountName,
        };

      const response = await api.post('/business-expenses/simplefin/claim', payload);

      if (response.data?.requiresAccountSelection) {
        const accounts = response.data.accounts || [];
        setSimplefinAccounts(accounts);
        setPendingClaimToken(response.data.claimToken || '');
        if (accounts.length === 1) {
          setSelectedAccountId(accounts[0].id);
        }
        return;
      }

      setSuccess('Bank account connected successfully.');
      resetConnectForm();
      setShowConnectModal(false);
      loadBankingData(false);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to connect account.';
      setError(message);
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async (connectionId) => {
    setError('');
    setSuccess('');
    setSyncingId(connectionId);

    try {
      const res = await api.post(`/business-expenses/sync/${connectionId}`);
      setSuccess(`Sync complete. Imported ${res.data.imported} transaction(s).`);
      loadBankingData(false);
    } catch (err) {
      const message = err.response?.data?.error || 'Sync failed.';
      setError(message);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async (connectionId) => {
    if (!window.confirm('Disconnect this bank account? Historical data will remain.')) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      await api.delete(`/business-expenses/connections/${connectionId}`);
      setSuccess('Account disconnected.');
      loadBankingData(false);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to disconnect account.';
      setError(message);
    }
  };

  if (loading) {
    return (
      <Layout title="Bank Accounts" subtitle="Manage connected accounts and transactions">
        <div className="flex items-center justify-center h-64">
          <div className="text-stone-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Bank Accounts" subtitle="Manage connected accounts and transactions">
      <div className="space-y-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-sm">
            {success}
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="themed-surface p-6 rounded-3xl"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: cardStyles[3].backgroundColor }}
              >
                <TrendingDown size={20} style={{ color: cardStyles[3].color }} />
              </div>
              <div>
                <p className="text-stone-500 text-sm">Total Expenses</p>
                <p className="font-bold text-2xl text-stone-800">
                  ${stats.totalExpenses.toFixed(2)}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="themed-surface p-6 rounded-3xl"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: cardStyles[1].backgroundColor }}
              >
                <Calendar size={20} style={{ color: cardStyles[1].color }} />
              </div>
              <div>
                <p className="text-stone-500 text-sm">Transactions</p>
                <p className="font-bold text-2xl text-stone-800">
                  {stats.transactionCount}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Connected Accounts */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-quicksand font-bold text-xl text-stone-800">
              Connected Accounts
            </h3>
            <button
              onClick={() => setShowConnectModal(true)}
              className="px-4 py-2 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Connect Account
            </button>
          </div>

          {connections.length === 0 ? (
            <div className="themed-surface rounded-3xl p-12 text-center">
              <Building2 size={48} className="mx-auto mb-4 text-stone-300" />
              <h3 className="font-quicksand font-bold text-xl text-stone-800 mb-2">
                No Connected Accounts
              </h3>
              <p className="text-stone-500">
                Connect your bank account to automatically track business expenses
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connections.map((connection, i) => (
                <div
                  key={connection.id}
                  className="themed-surface p-6 rounded-3xl"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: cardStyles[0].backgroundColor }}
                      >
                        <Building2 size={20} style={{ color: cardStyles[0].color }} />
                      </div>
                      <div>
                        <h4 className="font-bold text-stone-800">
                          {connection.account_name}
                        </h4>
                        <p className="text-stone-500 text-xs">
                          {connection.is_active ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        connection.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {connection.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Last synced:</span>
                    <span className="font-medium text-stone-700">
                      {formatDateTime(connection.last_sync_at)}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleSync(connection.id)}
                      disabled={syncingId === connection.id || !connection.is_active}
                      className="flex-1 px-3 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-60"
                      style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                    >
                      {syncingId === connection.id ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button
                      onClick={() => handleDisconnect(connection.id)}
                      className="flex-1 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Recent Expenses */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="font-quicksand font-bold text-xl text-stone-800 mb-4">
            Recent Expenses
          </h3>

          {expensesError && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm">
              {expensesError}
            </div>
          )}

          {expenses.length === 0 ? (
            <div className="themed-surface rounded-3xl p-12 text-center">
              <DollarSign size={48} className="mx-auto mb-4 text-stone-300" />
              <p className="text-stone-500">No expenses recorded yet</p>
            </div>
          ) : (
            <div className="themed-surface rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: 'var(--background)' }}>
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">
                        Description
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-stone-700">
                        Category
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-stone-700">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y themed-border">
                    {expenses.map((expense, i) => (
                      <tr key={expense.id} className="themed-row transition-colors">
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {formatDate(expense.transaction_date)}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-stone-800">
                            {expense.description}
                          </p>
                          {expense.vendor && (
                            <p className="text-xs text-stone-500">{expense.vendor}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="px-3 py-1 rounded-full text-xs font-bold"
                            style={getCategoryStyle(expense.category)}
                          >
                            {expense.category || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-stone-800">
                            ${parseFloat(expense.amount).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.section>
      </div>

      <BaseModal
        isOpen={showConnectModal}
        onClose={() => {
          resetConnectForm();
          setShowConnectModal(false);
        }}
        title="Connect Bank Account"
      >
        <form onSubmit={handleConnectAccount} className="space-y-5">
          <div className="text-sm text-stone-600 space-y-2">
            <p>
              Get a SimpleFIN connection token at{' '}
              <a
                href="https://bridge.simplefin.org/simplefin/create"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:underline"
                style={{ color: 'var(--primary-dark)' }}
              >
                SimpleFIN Bridge
              </a>.
            </p>
            <p className="text-xs text-stone-500">
              This token is used once to establish the connection. Credentials are not stored.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Account Name
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Main Business Checking"
              maxLength={255}
              required
              className="w-full px-4 py-3 rounded-2xl border themed-border focus:outline-none focus:ring-2 bg-white"
            />
          </div>

          {pendingClaimToken ? (
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Choose Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl border themed-border focus:outline-none focus:ring-2 bg-white"
              >
                <option value="">Select an account</option>
                {simplefinAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.displayName || account.name || account.id}
                  </option>
                ))}
              </select>
              <p className="text-xs text-stone-500 mt-2">
                Pick the specific account you want to sync into Firefly.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Connection Token
              </label>
              <input
                type="text"
                value={setupToken}
                onChange={(e) => setSetupToken(e.target.value)}
                placeholder="Paste your SimpleFIN token"
                required
                className="w-full px-4 py-3 rounded-2xl border themed-border focus:outline-none focus:ring-2 bg-white"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                resetConnectForm();
                setShowConnectModal(false);
              }}
              disabled={connecting}
              className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={connecting}
              className="flex-1 px-6 py-3 rounded-2xl text-white font-bold shadow-lg transition-all disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
            >
              {connecting ? 'Connecting...' : pendingClaimToken ? 'Confirm Account' : 'Connect Account'}
            </button>
          </div>
        </form>
      </BaseModal>
    </Layout>
  );
}
