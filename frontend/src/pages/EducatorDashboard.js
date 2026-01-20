import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { EducatorLayout } from '../components/EducatorLayout';

function EducatorDashboard() {
  const { user } = useAuth();
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

  if (loading) {
    return (
      <EducatorLayout title="Dashboard" subtitle="Your educator overview">
        <div className="themed-surface p-6 rounded-3xl text-center">Loading...</div>
      </EducatorLayout>
    );
  }

  return (
    <EducatorLayout title="Dashboard" subtitle={`Welcome back, ${user.first_name}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="themed-surface p-6 rounded-3xl">
          <h3 className="font-quicksand font-bold text-lg mb-3">Recent Hours (Last 14 Days)</h3>
          <div className="text-3xl font-bold">
            {stats.totalHours.toFixed(2)} <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>hours logged</span>
          </div>
        </div>

        <div className="themed-surface p-6 rounded-3xl">
          <h3 className="font-quicksand font-bold text-lg mb-3">Recent Entries</h3>
          <div className="text-3xl font-bold">
            {stats.recentEntries.length} <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>entries</span>
          </div>
        </div>
      </div>

      <div className="themed-surface p-6 rounded-3xl">
        <h2 className="font-quicksand font-bold text-xl mb-4">Recent Time Entries</h2>
        {stats.recentEntries.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No time entries yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--background)' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentEntries.map((entry) => (
                  <tr key={entry.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3 text-sm">{new Date(entry.entry_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">{entry.total_hours}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--accent)', color: 'var(--primary-dark)' }}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </EducatorLayout>
  );
}

export default EducatorDashboard;
