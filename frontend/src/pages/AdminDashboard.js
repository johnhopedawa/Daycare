import React, { useState, useEffect } from 'react';
import api from '../utils/api';

function AdminDashboard() {
  const [stats, setStats] = useState({
    pendingHours: 0,
    openPayPeriods: 0,
    educators: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [entriesRes, periodsRes, usersRes, paymentsRes] = await Promise.all([
        api.get('/admin/time-entries?status=PENDING'),
        api.get('/pay-periods'),
        api.get('/admin/users?role=EDUCATOR'),
        api.get('/parents/payments?status=PENDING'),
      ]);

      setStats({
        pendingHours: entriesRes.data.timeEntries.length,
        openPayPeriods: periodsRes.data.payPeriods.filter(p => p.status === 'OPEN').length,
        educators: usersRes.data.users.filter(u => u.is_active).length,
        pendingPayments: paymentsRes.data.payments.length,
      });
    } catch (error) {
      console.error('Load stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="main-content">Loading...</div>;

  return (
    <div className="main-content">
      <h1>Admin Dashboard</h1>

      <div className="card-grid">
        <div className="card">
          <h3>Pending Hours</h3>
          <p style={{ fontSize: '2rem', margin: '1rem 0', color: '#e67e22' }}>
            {stats.pendingHours}
          </p>
        </div>

        <div className="card">
          <h3>Open Pay Periods</h3>
          <p style={{ fontSize: '2rem', margin: '1rem 0', color: '#3498db' }}>
            {stats.openPayPeriods}
          </p>
        </div>

        <div className="card">
          <h3>Active Educators</h3>
          <p style={{ fontSize: '2rem', margin: '1rem 0', color: '#27ae60' }}>
            {stats.educators}
          </p>
        </div>

        <div className="card">
          <h3>Pending Payments</h3>
          <p style={{ fontSize: '2rem', margin: '1rem 0', color: '#9b59b6' }}>
            {stats.pendingPayments}
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
