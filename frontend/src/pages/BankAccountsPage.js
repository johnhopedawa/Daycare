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
  const [connecting, setConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expensesError, setExpensesError] = useState('');

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

  const handleConnectAccount = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setConnecting(true);

    try {
      await api.post('/business-expenses/simplefin/claim', {
        setupToken,
        accountName,
      });

      setSuccess('Bank account connected successfully.');
      setSetupToken('');
      setAccountName('');
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

  const getCategoryColor = (category) => {
    const colors = {
      supplies: 'bg-[#E5D4ED] text-[#8E55A5]',
      utilities: 'bg-[#B8E6D5] text-[#2D6A4F]',
      payroll: 'bg-[#FFF4CC] text-[#B45309]',
      rent: 'bg-[#FFDCC8] text-[#E07A5F]',
      insurance: 'bg-blue-100 text-blue-700',
      maintenance: 'bg-green-100 text-green-700',
    };
    return colors[category?.toLowerCase()] || 'bg-gray-100 text-gray-700';
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
            className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#FFDCC8] flex items-center justify-center">
                <TrendingDown size={20} className="text-[#E07A5F]" />
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
            className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#B8E6D5] flex items-center justify-center">
                <Calendar size={20} className="text-[#2D6A4F]" />
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
              className="px-4 py-2 bg-[#FF9B85] text-white font-bold text-sm rounded-xl shadow-md hover:bg-[#E07A5F] transition-colors"
            >
              Connect Account
            </button>
          </div>

          {connections.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
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
                  className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#E5D4ED] flex items-center justify-center">
                        <Building2 size={20} className="text-[#8E55A5]" />
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
                      className="flex-1 px-3 py-2 rounded-xl bg-[#FFF8F3] text-[#E07A5F] text-sm font-bold hover:bg-[#FFE5D9] transition-colors disabled:opacity-60"
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
            <div className="bg-white rounded-3xl p-12 text-center shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
              <DollarSign size={48} className="mx-auto mb-4 text-stone-300" />
              <p className="text-stone-500">No expenses recorded yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl overflow-hidden shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#FFF8F3]">
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
                  <tbody className="divide-y divide-stone-100">
                    {expenses.map((expense, i) => (
                      <tr key={expense.id} className="hover:bg-[#FFF8F3] transition-colors">
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
                            className={`px-3 py-1 rounded-full text-xs font-bold ${getCategoryColor(
                              expense.category
                            )}`}
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
        onClose={() => setShowConnectModal(false)}
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
                className="text-[#E07A5F] font-semibold hover:underline"
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
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
            />
          </div>

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
              className="w-full px-4 py-3 rounded-2xl border border-[#FFE5D9] focus:outline-none focus:ring-2 focus:ring-[#FF9B85]/50 bg-white"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowConnectModal(false)}
              disabled={connecting}
              className="flex-1 px-6 py-3 rounded-2xl border border-[#FFE5D9] text-stone-600 font-bold hover:bg-[#FFF8F3] transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={connecting}
              className="flex-1 px-6 py-3 rounded-2xl bg-[#FF9B85] text-white font-bold shadow-lg shadow-[#FF9B85]/30 hover:bg-[#E07A5F] transition-all disabled:opacity-60"
            >
              {connecting ? 'Connecting...' : 'Connect Account'}
            </button>
          </div>
        </form>
      </BaseModal>
    </Layout>
  );
}
