import React, { useState, useEffect } from 'react';
import api from '../utils/api';

function EducatorDashboard() {
  const [stats, setStats] = useState({ totalHours: 0, recentEntries: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/time-entries/mine');
      const entries = response.data.timeEntries;

      // Calculate current period total (last 14 days)
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const recentTotal = entries
        .filter(e => new Date(e.entry_date) >= twoWeeksAgo && e.status === 'APPROVED')
        .reduce((sum, e) => sum + parseFloat(e.total_hours), 0);

      setStats({
        totalHours: recentTotal,
        recentEntries: entries.slice(0, 5),
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
      <h1>Dashboard</h1>

      <div className="card-grid">
        <div className="card">
          <h3>Recent Hours (Last 14 Days)</h3>
          <p style={{ fontSize: '2rem', margin: '1rem 0' }}>
            {stats.totalHours.toFixed(2)} hrs
          </p>
        </div>
      </div>

      <div className="card">
        <h2>Recent Entries</h2>
        {stats.recentEntries.length === 0 ? (
          <p>No time entries yet</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.entry_date).toLocaleDateString()}</td>
                  <td>{entry.total_hours}</td>
                  <td>
                    <span className={`badge ${entry.status.toLowerCase()}`}>
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default EducatorDashboard;
