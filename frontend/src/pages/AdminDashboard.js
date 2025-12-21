import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

function AdminDashboard() {
  const { user } = useAuth();
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

  if (loading) return <div className="main"><div className="loading">Loading...</div></div>;

  return (
    <main className="main">
      <div className="header">
        <h1>Dashboard</h1>
        <div className="header-welcome">Welcome back, {user.first_name}</div>
      </div>

      <div className="card-grid">
        <div className="card">
          <h3>Pending Hours</h3>
          <div className="metric" style={{ color: '#ef4444' }}>
            {stats.pendingHours} <span>to review</span>
          </div>
        </div>

        <div className="card">
          <h3>Open Pay Periods</h3>
          <div className="metric" style={{ color: '#2563eb' }}>
            {stats.openPayPeriods} <span>active</span>
          </div>
        </div>

        <div className="card">
          <h3>Active Educators</h3>
          <div className="metric" style={{ color: '#22c55e' }}>
            {stats.educators} <span>staff</span>
          </div>
        </div>

        <div className="card">
          <h3>Pending Payments</h3>
          <div className="metric" style={{ color: '#a855f7' }}>
            {stats.pendingPayments} <span>outstanding</span>
          </div>
        </div>
      </div>
    </main>
  );
}

export default AdminDashboard;
