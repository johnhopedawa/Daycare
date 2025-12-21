import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

function ParentDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await api.get('/parent/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Load dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="main"><div className="loading">Loading...</div></div>;

  return (
    <main className="main">
      <div className="header">
        <h1>Dashboard</h1>
        <div className="header-welcome">Welcome back, {user.first_name}</div>
      </div>

      <div className="card-grid">
        <div className="card">
          <h3>Children Enrolled</h3>
          <div className="metric" style={{ color: '#2563eb' }}>
            {dashboard?.children_count || 0} <span>children</span>
          </div>
        </div>

        <div className="card">
          <h3>Outstanding Balance</h3>
          <div className="metric" style={{ color: dashboard?.outstanding_balance > 0 ? '#ef4444' : '#22c55e' }}>
            ${dashboard?.outstanding_balance?.toFixed(2) || '0.00'} <span>balance</span>
          </div>
        </div>

        <div className="card">
          <h3>Unread Messages</h3>
          <div className="metric" style={{ color: '#a855f7' }}>
            {dashboard?.unread_messages_count || 0} <span>messages</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Quick Links</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <button onClick={() => navigate('/parent/children')}>My Children</button>
          <button onClick={() => navigate('/parent/invoices')}>Invoices</button>
          <button onClick={() => navigate('/parent/messages')}>Messages</button>
        </div>
      </div>

      {dashboard?.recent_invoices && dashboard.recent_invoices.length > 0 && (
        <div className="card">
          <h2>Recent Invoices</h2>
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recent_invoices.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number}</td>
                  <td>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                  <td>${parseFloat(inv.total_amount).toFixed(2)}</td>
                  <td>${parseFloat(inv.balance_due).toFixed(2)}</td>
                  <td><span className={`badge badge-${inv.status.toLowerCase()}`}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default ParentDashboard;
