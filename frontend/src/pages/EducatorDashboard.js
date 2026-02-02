import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { EducatorLayout } from '../components/EducatorLayout';

function EducatorDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [upcomingShifts, setUpcomingShifts] = useState([]);
  const [recentShifts, setRecentShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const rangeStart = startOfYear.toISOString().split('T')[0];
      const rangeEnd = today.toISOString().split('T')[0];

      const upcomingEnd = new Date(today);
      upcomingEnd.setDate(upcomingEnd.getDate() + 30);

      const [summaryRes, upcomingRes, recentRes] = await Promise.all([
        api.get('/reports/staff/hours', { params: { start_date: rangeStart, end_date: rangeEnd } }),
        api.get('/schedules/my-schedules', {
          params: { from: rangeEnd, to: upcomingEnd.toISOString().split('T')[0] },
        }),
        api.get('/schedules/my-schedules', {
          params: { from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30).toISOString().split('T')[0], to: rangeEnd },
        }),
      ]);

      const recentAccepted = (recentRes.data.schedules || [])
        .filter((shift) => shift.status === 'ACCEPTED' && shift.shift_date < rangeEnd)
        .slice(0, 5);

      setSummary(summaryRes.data.summary || {});
      setUpcomingShifts(upcomingRes.data.schedules || []);
      setRecentShifts(recentAccepted);
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
          <h3 className="font-quicksand font-bold text-lg mb-3">Hours Worked YTD</h3>
          <div className="text-3xl font-bold">
            {parseFloat(summary?.completed_hours || 0).toFixed(2)}{' '}
            <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
              hours completed
            </span>
          </div>
        </div>

        <div className="themed-surface p-6 rounded-3xl">
          <h3 className="font-quicksand font-bold text-lg mb-3">Upcoming Shifts</h3>
          <div className="text-3xl font-bold">
            {upcomingShifts.length}{' '}
            <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
              next 30 days
            </span>
          </div>
        </div>
      </div>

      <div className="themed-surface p-6 rounded-3xl">
        <h2 className="font-quicksand font-bold text-xl mb-4">Recent Shifts</h2>
        {recentShifts.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No recent shifts yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--background)' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Hours</th>
                </tr>
              </thead>
              <tbody>
                {recentShifts.map((shift) => (
                  <tr key={shift.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3 text-sm">{new Date(shift.shift_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">
                      {shift.start_time ? `${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">{shift.hours}</td>
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
