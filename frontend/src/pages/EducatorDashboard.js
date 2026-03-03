import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { EducatorLayout } from '../components/EducatorLayout';

function dateKey(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function EducatorDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [upcomingShifts, setUpcomingShifts] = useState([]);
  const [recentShifts, setRecentShifts] = useState([]);
  const [careChildren, setCareChildren] = useState([]);
  const [careLogs, setCareLogs] = useState([]);
  const [careForm, setCareForm] = useState({
    child_id: '',
    log_type: 'NAP',
    occurred_at: '',
    notes: '',
  });
  const [careSaving, setCareSaving] = useState(false);
  const [careError, setCareError] = useState('');
  const [loading, setLoading] = useState(true);

  const sortedCareLogs = useMemo(
    () =>
      [...careLogs].sort((a, b) => {
        const aKey = `${a.log_date || ''} ${a.occurred_at || ''} ${a.created_at || ''}`;
        const bKey = `${b.log_date || ''} ${b.occurred_at || ''} ${b.created_at || ''}`;
        return aKey < bKey ? 1 : -1;
      }),
    [careLogs]
  );

  useEffect(() => {
    loadStats();
    loadCareLogs();
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
      console.error('Load educator stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCareLogs = async () => {
    try {
      const today = dateKey();
      setCareError('');
      const [childrenRes, logsRes] = await Promise.all([
        api.get('/attendance/children', { params: { status: 'ACTIVE', date: today } }),
        api.get('/care-logs', { params: { date: today } }),
      ]);

      const loadedChildren = childrenRes.data.children || [];
      setCareChildren(loadedChildren);
      setCareLogs(logsRes.data.logs || []);

      const firstChildId = loadedChildren[0]?.id;
      setCareForm((prev) => ({
        ...prev,
        child_id: prev.child_id || (firstChildId ? String(firstChildId) : ''),
      }));
    } catch (error) {
      if (error.response?.status === 403) {
        setCareError(error.response?.data?.error || 'You must be scheduled to access daily care logs.');
        setCareChildren([]);
        setCareLogs([]);
      } else {
        console.error('Load care logs error:', error);
        setCareError(error.response?.data?.error || 'Failed to load care logs');
      }
    }
  };

  const submitCareLog = async (event) => {
    event.preventDefault();

    if (!careForm.child_id) {
      setCareError('Please select a child.');
      return;
    }

    try {
      setCareSaving(true);
      setCareError('');
      await api.post('/care-logs', {
        child_id: Number.parseInt(careForm.child_id, 10),
        log_type: careForm.log_type,
        occurred_at: careForm.occurred_at || null,
        notes: careForm.notes.trim() || null,
        log_date: dateKey(),
      });

      setCareForm((prev) => ({
        ...prev,
        occurred_at: '',
        notes: '',
      }));

      await loadCareLogs();
    } catch (error) {
      console.error('Create care log error:', error);
      setCareError(error.response?.data?.error || 'Failed to save care log');
    } finally {
      setCareSaving(false);
    }
  };

  if (loading) {
    return (
      <EducatorLayout title="Dashboard" subtitle="Your educator overview">
        <div className="themed-surface rounded-3xl p-6 text-center">Loading...</div>
      </EducatorLayout>
    );
  }

  return (
    <EducatorLayout title="Dashboard" subtitle={`Welcome back, ${user.first_name}`}>
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="themed-surface rounded-3xl p-6">
          <h3 className="mb-3 font-quicksand text-lg font-bold">Hours Worked YTD</h3>
          <div className="text-3xl font-bold">
            {parseFloat(summary?.completed_hours || 0).toFixed(2)}{' '}
            <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
              hours completed
            </span>
          </div>
        </div>

        <div className="themed-surface rounded-3xl p-6">
          <h3 className="mb-3 font-quicksand text-lg font-bold">Upcoming Shifts</h3>
          <div className="text-3xl font-bold">
            {upcomingShifts.length}{' '}
            <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
              next 30 days
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6 themed-surface rounded-3xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-quicksand text-xl font-bold">Today&apos;s Naps, Pees, and Poos</h2>
          <span className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-semibold text-[var(--primary-dark)]">
            {dateKey()}
          </span>
        </div>

        <form onSubmit={submitCareLog} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            value={careForm.child_id}
            onChange={(e) => setCareForm((prev) => ({ ...prev, child_id: e.target.value }))}
            className="rounded-xl border themed-border px-3 py-2 text-sm"
            disabled={careChildren.length === 0}
          >
            <option value="">Select child</option>
            {careChildren.map((child) => (
              <option key={child.id} value={child.id}>
                {child.first_name} {child.last_name}
              </option>
            ))}
          </select>
          <select
            value={careForm.log_type}
            onChange={(e) => setCareForm((prev) => ({ ...prev, log_type: e.target.value }))}
            className="rounded-xl border themed-border px-3 py-2 text-sm"
          >
            <option value="NAP">Nap</option>
            <option value="PEE">Pee</option>
            <option value="POO">Poo</option>
          </select>
          <input
            type="time"
            value={careForm.occurred_at}
            onChange={(e) => setCareForm((prev) => ({ ...prev, occurred_at: e.target.value }))}
            className="rounded-xl border themed-border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={careSaving || careChildren.length === 0}
            className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {careSaving ? 'Saving...' : 'Add Entry'}
          </button>
          <textarea
            value={careForm.notes}
            onChange={(e) => setCareForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="min-h-[84px] rounded-xl border themed-border px-3 py-2 text-sm md:col-span-4"
            placeholder="Optional notes..."
          />
        </form>

        {careError ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {careError}
          </div>
        ) : null}

        {sortedCareLogs.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No care logs recorded yet for today.</p>
        ) : (
          <div className="space-y-2">
            {sortedCareLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border px-4 py-3"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    {log.child_name} - {log.log_type}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>
                    {log.occurred_at ? String(log.occurred_at).slice(0, 5) : '-'}
                  </span>
                </div>
                {log.notes ? <p className="mt-1 text-sm">{log.notes}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="themed-surface rounded-3xl p-6">
        <h2 className="mb-4 font-quicksand text-xl font-bold">Recent Shifts</h2>
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
