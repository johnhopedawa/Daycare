import { useState, useEffect } from 'react';
import api from '../utils/api';

function AdminBusinessExpenses() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [syncLimit, setSyncLimit] = useState(null);

  // Form state
  const [setupToken, setSetupToken] = useState('');
  const [accountName, setAccountName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(null); // ID of connection being synced

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const res = await api.get('/business-expenses/connections');
      setConnections(res.data.connections || []);
      setSyncLimit(res.data.syncLimit || null);
    } catch (err) {
      setError('Failed to load connections');
      setSyncLimit(null);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectCard = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await api.post('/business-expenses/simplefin/claim', {
        setupToken,
        accountName
      });

      setSuccess('Bank account connected successfully');
      setSetupToken('');
      setAccountName('');
      loadConnections();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to connect account';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSync = async (connectionId) => {
    setSyncing(connectionId);
    setError('');
    setSuccess('');

    try {
      const res = await api.post(`/business-expenses/sync/${connectionId}`);
      const limitInfo = res.data?.syncLimit || null;
      if (limitInfo) {
        setSyncLimit(limitInfo);
      }
      const imported = Number(res.data?.imported || 0);
      const skipped = Number(res.data?.skipped || 0);
      const total = Number.isFinite(res.data?.total) ? res.data.total : imported + skipped;
      const remainingText = limitInfo
        ? ` (${limitInfo.remaining} of ${limitInfo.limit} left today)`
        : '';

      if (total === 0) {
        setSuccess(`Sync complete. No transactions returned.${remainingText}`);
      } else if (imported === 0) {
        setSuccess(`Sync complete. No new transactions (${skipped} already synced).${remainingText}`);
      } else {
        setSuccess(`Sync complete. Imported ${imported} transaction(s), skipped ${skipped}.${remainingText}`);
      }
      loadConnections();
    } catch (err) {
      const limitInfo = err.response?.data?.syncLimit || null;
      if (limitInfo) {
        setSyncLimit(limitInfo);
      }
      const message = err.response?.data?.error || 'Sync failed';
      const remainingText = limitInfo
        ? ` (${limitInfo.remaining} of ${limitInfo.limit} left today)`
        : '';
      setError(`${message}${remainingText}`);
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (connectionId) => {
    if (!window.confirm('Disconnect this bank account? Historical transaction data will be preserved.')) {
      return;
    }

    try {
      await api.delete(`/business-expenses/connections/${connectionId}`);
      setSuccess('Account disconnected');
      loadConnections();
    } catch (err) {
      setError('Failed to disconnect');
    }
  };

  if (loading) {
    return (
      <div className="main">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <main className="main">
      <div className="header">
        <h1>Bank Accounts</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '8px' }}>
          Connect your daycare's bank accounts to automatically import transactions
        </p>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      {syncLimit && (
        <div className="card" style={{ padding: '0.75rem 1rem' }}>
          <strong>Daily sync limit:</strong>{' '}
          {syncLimit.remaining} of {syncLimit.limit} remaining today.
        </div>
      )}

      {/* Instructions Card */}
      <div className="card">
        <h2>How to Connect Your Bank Account</h2>
        <ol style={{ marginLeft: '1.5rem', lineHeight: '1.8', color: 'var(--text)' }}>
          <li>
            <strong>Authorize Your Bank:</strong> Visit{' '}
            <a
              href="https://bridge.simplefin.org/simplefin/create"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--primary)' }}
            >
              SimpleFIN Bridge
            </a>{' '}
            to securely authorize access to your bank account and receive a connection token
          </li>
          <li>
            <strong>Connect Account:</strong> Paste your connection token below and give the account a descriptive name
          </li>
          <li>
            <strong>Automatic Import:</strong> Transactions are automatically imported daily at 2:00 AM
          </li>
          <li>
            <strong>Manual Sync:</strong> Use the "Sync Now" button to import transactions immediately
          </li>
        </ol>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '1rem', lineHeight: '1.6' }}>
          <strong>Security:</strong> Your bank credentials are never stored in this system.
          SimpleFIN Bridge handles all authentication securely, and you can revoke access at any time
          through SimpleFIN's website.
        </p>
      </div>

      {/* Connect Account Form */}
      <div className="card">
        <h2>Connect Bank Account</h2>
        <form onSubmit={handleConnectCard}>
          <div className="form-group">
            <label>Account Name</label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g., Main Business Checking"
              required
              maxLength={255}
            />
            <small style={{ color: 'var(--muted)', fontSize: '13px' }}>
              A friendly name to identify this account in your daycare's records
            </small>
          </div>

          <div className="form-group">
            <label>Connection Token</label>
            <input
              type="text"
              value={setupToken}
              onChange={(e) => setSetupToken(e.target.value)}
              placeholder="Paste the connection token from SimpleFIN Bridge"
              required
            />
            <small style={{ color: 'var(--muted)', fontSize: '13px' }}>
              This token is used once to establish the secure connection, then securely stored
            </small>
          </div>

          <button type="submit" disabled={submitting} className="btn primary">
            {submitting ? 'Connecting...' : 'Connect Account'}
          </button>
        </form>
      </div>

      {/* Connected Accounts */}
      {connections.length > 0 && (
        <div className="card">
          <h2>Connected Accounts</h2>
          <table>
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Last Synced</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {connections.map((conn) => (
                <tr key={conn.id}>
                  <td>{conn.account_name}</td>
                  <td>
                    {conn.last_sync_at
                      ? new Date(conn.last_sync_at).toLocaleString()
                      : 'Never'}
                  </td>
                  <td>
                    <span className={`badge ${conn.is_active ? 'active' : 'closed'}`}>
                      {conn.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        onClick={() => handleSync(conn.id)}
                        disabled={syncing === conn.id || !conn.is_active || (syncLimit && syncLimit.remaining <= 0)}
                        className="btn small"
                      >
                        {syncing === conn.id ? 'Syncing...' : 'Sync Now'}
                      </button>
                      <button
                        onClick={() => handleDisconnect(conn.id)}
                        className="btn small danger"
                      >
                        Disconnect
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {connections.length === 0 && !loading && (
        <div className="card">
          <p style={{ textAlign: 'center', color: 'var(--muted)' }}>
            No bank accounts connected yet. Connect your first account above to get started.
          </p>
        </div>
      )}
    </main>
  );
}

export default AdminBusinessExpenses;
