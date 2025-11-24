import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function ParentDashboard() {
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) return <div className="main-content">Loading...</div>;

  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Parent Dashboard</h1>
        <button onClick={handleLogout} className="btn-secondary">Logout</button>
      </div>

      <div className="card-grid">
        <div className="card">
          <h3>Children Enrolled</h3>
          <p style={{ fontSize: '2rem', margin: '1rem 0' }}>
            {dashboard?.children_count || 0}
          </p>
        </div>

        <div className="card">
          <h3>Outstanding Balance</h3>
          <p style={{ fontSize: '2rem', margin: '1rem 0', color: dashboard?.outstanding_balance > 0 ? '#d32f2f' : '#2e7d32' }}>
            ${dashboard?.outstanding_balance?.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="card">
          <h3>Unread Messages</h3>
          <p style={{ fontSize: '2rem', margin: '1rem 0' }}>
            {dashboard?.unread_messages_count || 0}
          </p>
        </div>
      </div>

      <div className="card">
        <h2>Quick Links</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <button onClick={() => navigate('/parent/children')} className="btn">My Children</button>
          <button onClick={() => navigate('/parent/invoices')} className="btn">Invoices</button>
          <button onClick={() => navigate('/parent/messages')} className="btn">Messages</button>
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
    </div>
  );
}

export default ParentDashboard;
