import { useEffect, useMemo, useState } from 'react';
import { Clock, CalendarRange } from 'lucide-react';
import api from '../utils/api';
import { EducatorLayout } from '../components/EducatorLayout';
import { formatTime12Hour } from '../utils/timeFormat';

const getTodayString = () => new Date().toISOString().split('T')[0];

const getDefaultRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return {
    start: start.toISOString().split('T')[0],
    end: getTodayString(),
  };
};

function MyHours() {
  const [dateRange, setDateRange] = useState(getDefaultRange);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [schedules, setSchedules] = useState([]);
  const [balances, setBalances] = useState({ sick_days_remaining: 0, vacation_days_remaining: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHours = async () => {
      try {
        setLoading(true);
        const [schedulesRes, balancesRes] = await Promise.all([
          api.get('/schedules/my-schedules', {
            params: { from: dateRange.start, to: dateRange.end },
          }),
          api.get('/auth/me'),
        ]);
        setSchedules(schedulesRes.data.schedules || []);
        setBalances({
          sick_days_remaining: balancesRes.data.user.sick_days_remaining || 0,
          vacation_days_remaining: balancesRes.data.user.vacation_days_remaining || 0,
        });
      } catch (error) {
        console.error('Load hours error:', error);
        setSchedules([]);
        setBalances({ sick_days_remaining: 0, vacation_days_remaining: 0 });
      } finally {
        setLoading(false);
      }
    };

    loadHours();
  }, [dateRange]);

  const filteredSchedules = useMemo(() => {
    if (statusFilter === 'ALL') {
      return schedules;
    }
    return schedules.filter((shift) => shift.status === statusFilter);
  }, [schedules, statusFilter]);

  const totals = useMemo(() => {
    const totalHours = filteredSchedules.reduce(
      (sum, shift) => sum + (parseFloat(shift.hours) || 0),
      0
    );
    return totalHours.toFixed(2);
  }, [filteredSchedules]);

  const todayKey = getTodayString();
  const scheduledFutureHours = useMemo(() => {
    return schedules
      .filter((shift) => shift.status !== 'DECLINED' && String(shift.shift_date).split('T')[0] >= todayKey)
      .reduce((sum, shift) => sum + (parseFloat(shift.hours) || 0), 0)
      .toFixed(2);
  }, [schedules, todayKey]);

  const completedHours = useMemo(() => {
    return schedules
      .filter((shift) => shift.status === 'ACCEPTED' && String(shift.shift_date).split('T')[0] < todayKey)
      .reduce((sum, shift) => sum + (parseFloat(shift.hours) || 0), 0)
      .toFixed(2);
  }, [schedules, todayKey]);

  const vacationHoursRemaining = parseFloat(balances.vacation_days_remaining || 0).toFixed(1);
  const sickHoursRemaining = parseFloat(balances.sick_days_remaining || 0).toFixed(1);

  const summaryCards = [
    {
      label: 'Scheduled Hours',
      value: scheduledFutureHours,
      tone: 'var(--card-1)',
      text: 'var(--card-text-1)',
    },
    {
      label: 'Completed Hours',
      value: completedHours,
      tone: 'var(--card-2)',
      text: 'var(--card-text-2)',
    },
    {
      label: 'Vacation Hours',
      value: vacationHoursRemaining,
      tone: 'var(--card-3)',
      text: 'var(--card-text-3)',
    },
    {
      label: 'Sick Hours',
      value: sickHoursRemaining,
      tone: 'var(--card-4)',
      text: 'var(--card-text-4)',
    },
  ];

  return (
    <EducatorLayout title="My Hours" subtitle="Track your schedule-based hours">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl p-4 border shadow-sm"
            style={{ backgroundColor: card.tone, borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">
                  {card.label}
                </p>
                <p className="text-2xl font-bold" style={{ color: card.text }}>
                  {card.value}
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/70">
                <Clock size={18} style={{ color: card.text }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="themed-surface rounded-3xl p-5 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-4 py-2 rounded-2xl border themed-border bg-white text-sm text-stone-600"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            End Date
          </label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-4 py-2 rounded-2xl border themed-border bg-white text-sm text-stone-600"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-2xl border themed-border bg-white text-sm text-stone-600"
          >
            <option value="ALL">All</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="PENDING">Pending</option>
            <option value="DECLINED">Declined</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-stone-500 ml-auto">
          <CalendarRange size={16} />
          {dateRange.start} to {dateRange.end}
        </div>
      </div>

      {loading ? (
        <div className="themed-surface rounded-3xl p-10 text-center text-stone-500">
          Loading hours...
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="themed-surface rounded-3xl p-10 text-center text-stone-500">
          No shifts found for this period.
        </div>
      ) : (
        <div className="themed-surface rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b themed-border flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-700">Shifts</p>
              <p className="text-xs text-stone-500">{filteredSchedules.length} shifts</p>
            </div>
            <div className="text-sm text-stone-500">
              Total hours: <span className="font-semibold text-stone-700">{totals}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--background)' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y themed-border">
                {filteredSchedules.map((shift) => (
                  <tr key={shift.id} className="themed-row">
                    <td className="px-6 py-4 text-sm text-stone-600">
                      {new Date(shift.shift_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">
                      {formatTime12Hour(shift.start_time)} - {formatTime12Hour(shift.end_time)}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">{shift.hours}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-white border themed-border">
                        {shift.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-500">
                      {shift.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </EducatorLayout>
  );
}

export default MyHours;
