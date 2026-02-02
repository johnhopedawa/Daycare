import { useEffect, useMemo, useState } from 'react';
import { Bandage, Briefcase, CalendarPlus, Plane, X } from 'lucide-react';
import api from '../utils/api';
import { EducatorLayout } from '../components/EducatorLayout';
import { BaseModal } from '../components/modals/BaseModal';
import { formatTime12Hour } from '../utils/timeFormat';

const statusStyles = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-emerald-100 text-emerald-700',
  DECLINED: 'bg-rose-100 text-rose-700',
};

const selectionHours = {
  FULL: 8,
  HALF: 4,
};

const parseDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const isConsecutiveDay = (leftKey, rightKey) => {
  const left = parseDateKey(leftKey);
  const right = parseDateKey(rightKey);
  return (right - left) / (1000 * 60 * 60 * 24) === 1;
};

const formatDateLabel = (dateKey, includeYear) => {
  const date = parseDateKey(dateKey);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
  });
};

const formatRangeLabel = (startKey, endKey) => {
  if (startKey === endKey) {
    return formatDateLabel(startKey, false);
  }

  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const currentYear = new Date().getFullYear();
  const includeYear = start.getFullYear() !== currentYear || end.getFullYear() !== currentYear;

  if (sameMonth) {
    const monthLabel = start.toLocaleDateString('en-US', { month: 'long' });
    const startDay = start.getDate();
    const endDay = end.getDate();
    return `${monthLabel} ${startDay} - ${endDay}${includeYear ? `, ${start.getFullYear()}` : ''}`;
  }

  const startLabel = formatDateLabel(startKey, includeYear);
  const endLabel = formatDateLabel(endKey, includeYear);
  return `${startLabel} - ${endLabel}`;
};

const getDateKey = (date) => date.toISOString().split('T')[0];

const getRangeForMonth = (monthDate) => {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth() - 6, 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 6, 0);
  return {
    from: getDateKey(start),
    to: getDateKey(end),
  };
};

function MySchedule() {
  const [schedules, setSchedules] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [balances, setBalances] = useState({ sick_days_remaining: 0, vacation_days_remaining: 0 });
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineId, setDeclineId] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineType, setDeclineType] = useState('UNPAID');

  const [selectedDates, setSelectedDates] = useState({});
  const [requestType, setRequestType] = useState('VACATION');
  const [requestNote, setRequestNote] = useState('');
  const [requestError, setRequestError] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [activeDateKey, setActiveDateKey] = useState(null);

  useEffect(() => {
    loadSchedules();
    loadBalances();
    loadRequests();
  }, [currentMonth]);

  const loadSchedules = async () => {
    try {
      const range = getRangeForMonth(currentMonth);
      const params = new URLSearchParams({ from: range.from, to: range.to });
      const response = await api.get(`/schedules/my-schedules?${params}`);
      setSchedules(response.data.schedules || []);
    } catch (error) {
      console.error('Load schedules error:', error);
    }
  };

  const loadBalances = async () => {
    try {
      const response = await api.get('/auth/me');
      setBalances({
        sick_days_remaining: response.data.user.sick_days_remaining || 0,
        vacation_days_remaining: response.data.user.vacation_days_remaining || 0,
      });
    } catch (error) {
      console.error('Load balances error:', error);
    }
  };

  const loadRequests = async () => {
    try {
      setRequestsLoading(true);
      const response = await api.get('/time-off-requests/mine');
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error('Load time off requests error:', error);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleDeclineClick = (id) => {
    setDeclineId(id);
    setShowDeclineModal(true);
  };

  const handleDeclineSubmit = async () => {
    if (!declineReason.trim()) {
      alert('Please provide a reason for declining');
      return;
    }

    try {
      const response = await api.post(`/schedules/my-schedules/${declineId}/decline`, {
        reason: declineReason,
        declineType: declineType,
      });

      if (response.data.balances) {
        setBalances(response.data.balances);
      }

      setShowDeclineModal(false);
      setDeclineId(null);
      setDeclineReason('');
      setDeclineType('UNPAID');
      loadSchedules();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to decline schedule');
    }
  };

  const handleAccept = async (id) => {
    try {
      await api.post(`/schedules/my-schedules/${id}/accept`);
      loadSchedules();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to accept schedule');
    }
  };

  const handleCancelRequest = async (id) => {
    try {
      await api.delete(`/time-off-requests/${id}`);
      loadRequests();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to cancel request');
    }
  };

  const toggleDateSelection = (dateKey) => {
    setSelectedDates((prev) => {
      const current = prev[dateKey];
      if (!current) {
        return { ...prev, [dateKey]: 'FULL' };
      }
      if (current === 'FULL') {
        return { ...prev, [dateKey]: 'HALF' };
      }
      const next = { ...prev };
      delete next[dateKey];
      return next;
    });
  };

  const clearSelections = () => {
    setSelectedDates({});
  };

  const handleRequestSubmit = async () => {
    setRequestError('');
    const entries = Object.entries(selectedDates);
    if (entries.length === 0) {
      return;
    }

    try {
      setRequestLoading(true);
      const sorted = entries
        .map(([dateKey, value]) => ({ dateKey, value }))
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
      const batches = [];

      sorted.forEach(({ dateKey, value }) => {
        if (value !== 'FULL') {
          batches.push({ startKey: dateKey, endKey: dateKey, value });
          return;
        }

        const last = batches[batches.length - 1];
        if (last && last.value === 'FULL' && isConsecutiveDay(last.endKey, dateKey)) {
          last.endKey = dateKey;
          return;
        }
        batches.push({ startKey: dateKey, endKey: dateKey, value: 'FULL' });
      });

      await Promise.all(
        batches.map((batch) =>
          api.post('/time-off-requests', {
            startDate: batch.startKey,
            endDate: batch.endKey,
            requestType,
            hours: batch.value === 'FULL' ? null : selectionHours[batch.value],
            reason: requestNote || null,
          })
        )
      );
      setSelectedDates({});
      setRequestNote('');
      loadRequests();
    } catch (error) {
      setRequestError(error.response?.data?.error || 'Failed to submit request.');
    } finally {
      setRequestLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i += 1) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i += 1) {
      days.push(i);
    }
    return days;
  };

  const schedulesByDate = useMemo(() => {
    const map = new Map();
    schedules.forEach((schedule) => {
      const key = String(schedule.shift_date).split('T')[0];
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(schedule);
    });
    return map;
  }, [schedules]);

  const timeOffRequestsByDate = useMemo(() => {
    const map = new Map();
    requests.forEach((request) => {
      if (!request?.start_date || !request?.end_date) return;
      if (request.status === 'REJECTED') return;
      const startKey = String(request.start_date).split('T')[0];
      const endKey = String(request.end_date).split('T')[0];
      if (!startKey || !endKey) return;
      const start = parseDateKey(startKey);
      const end = parseDateKey(endKey);
      for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const dayKey = getDateKey(cursor);
        if (!map.has(dayKey)) {
          map.set(dayKey, []);
        }
        map.get(dayKey).push(request);
      }
    });
    return map;
  }, [requests]);

  const selectedSummary = useMemo(() => {
    const entries = Object.entries(selectedDates);
    const totalHours = entries.reduce((sum, [, value]) => sum + (selectionHours[value] || 0), 0);
    const sorted = entries
      .map(([dateKey, value]) => ({ dateKey, value }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    const ranges = [];
    sorted.forEach(({ dateKey, value }) => {
      const last = ranges[ranges.length - 1];
      if (last && last.value === value && isConsecutiveDay(last.endKey, dateKey)) {
        last.endKey = dateKey;
        last.count += 1;
        return;
      }
      ranges.push({ startKey: dateKey, endKey: dateKey, value, count: 1 });
    });

    const formatted = ranges.map((range) => ({
      label: formatRangeLabel(range.startKey, range.endKey),
      value: range.value,
      hours: range.count * (selectionHours[range.value] || 0),
    }));

    return { totalHours, entries: formatted };
  }, [selectedDates]);

  const activeDaySummary = useMemo(() => {
    if (!activeDateKey) return null;
    const shiftsForDay = schedulesByDate.get(activeDateKey) || [];
    const requestsForDay = timeOffRequestsByDate.get(activeDateKey) || [];
    if (shiftsForDay.length === 0 && requestsForDay.length === 0) {
      return null;
    }
    return {
      dateKey: activeDateKey,
      label: formatDateLabel(activeDateKey, true),
      shifts: shiftsForDay,
      requests: requestsForDay,
    };
  }, [activeDateKey, schedulesByDate, timeOffRequestsByDate]);

  const timeOffByDate = useMemo(() => {
    const map = new Map();
    requests.forEach((request) => {
      if (!request?.start_date || !request?.end_date) return;
      if (request.status === 'REJECTED') return;
      const startKey = String(request.start_date).split('T')[0];
      const endKey = String(request.end_date).split('T')[0];
      if (!startKey || !endKey) return;
      const start = parseDateKey(startKey);
      const end = parseDateKey(endKey);
      for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const dayKey = getDateKey(cursor);
        const status = String(request.status || '').toUpperCase();
        const position = startKey === endKey
          ? 'single'
          : dayKey === startKey
            ? 'start'
            : dayKey === endKey
              ? 'end'
              : 'middle';
        const entry = {
          type: String(request.request_type || '').toUpperCase(),
          position,
          status,
        };
        const existing = map.get(dayKey);
        if (!existing || (existing.status !== 'PENDING' && status === 'PENDING')) {
          map.set(dayKey, entry);
        }
      }
    });
    return map;
  }, [requests]);

  const vacationHoursRemaining = parseFloat(balances.vacation_days_remaining || 0);
  const sickHoursRemaining = parseFloat(balances.sick_days_remaining || 0);

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <EducatorLayout title="My Schedule" subtitle="Review shifts and request time off">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
        <div className="themed-surface rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-quicksand font-bold text-xl text-stone-800">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-xs text-stone-500">Click the date number to select time off.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={prevMonth}
                className="px-3 py-1.5 rounded-xl border themed-border text-sm text-stone-600"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="px-3 py-1.5 rounded-xl border themed-border text-sm text-stone-600"
              >
                Next
              </button>
            </div>
          </div>

          <div className="calendar-grid">
            <div className="calendar-header">Sun</div>
            <div className="calendar-header">Mon</div>
            <div className="calendar-header">Tue</div>
            <div className="calendar-header">Wed</div>
            <div className="calendar-header">Thu</div>
            <div className="calendar-header">Fri</div>
            <div className="calendar-header">Sat</div>

            {getDaysInMonth().map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="calendar-day calendar-day--empty" />;
              }
              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const dateStr = getDateKey(date);
              const shiftsForDay = schedulesByDate.get(dateStr) || [];
              const isScheduledDay = shiftsForDay.length > 0;
              const simpleScheduled = isScheduledDay && shiftsForDay.every((shift) => shift.status === 'ACCEPTED');
              const timeOff = timeOffByDate.get(dateStr);
              const hasExisting = Boolean(timeOff) || shiftsForDay.length > 0;
              const selectionState = hasExisting ? null : selectedDates[dateStr];
              let DayIcon = null;
              let iconLabel = '';
              let iconTone = '';
              let selectionFill = null;

              if (selectionState) {
                if (requestType === 'SICK') {
                  DayIcon = Bandage;
                  iconLabel = 'Sick day';
                  iconTone = 'sick';
                } else if (requestType === 'VACATION') {
                  DayIcon = Plane;
                  iconLabel = 'Vacation';
                  iconTone = 'vacation';
                } else {
                  DayIcon = Plane;
                  iconLabel = 'Unpaid day';
                  iconTone = 'unpaid';
                }
                selectionFill = selectionState;
              } else if (timeOff?.type === 'SICK') {
                DayIcon = Bandage;
                iconLabel = 'Sick day';
                iconTone = 'sick';
              } else if (timeOff?.type === 'VACATION') {
                DayIcon = Plane;
                iconLabel = 'Vacation';
                iconTone = 'vacation';
              } else if (timeOff?.type === 'UNPAID') {
                DayIcon = Plane;
                iconLabel = 'Unpaid day';
                iconTone = 'unpaid';
              } else if (simpleScheduled) {
                DayIcon = Briefcase;
                iconLabel = 'Scheduled';
                iconTone = 'scheduled';
              }
              const showCenteredIndicator = Boolean(DayIcon);
              const iconClasses = [
                'calendar-day-icon',
                iconTone ? `calendar-day-icon--${iconTone}` : '',
                selectionFill ? `calendar-day-icon--${selectionFill.toLowerCase()}` : '',
              ]
                .filter(Boolean)
                .join(' ');
              const isPending = timeOff?.status === 'PENDING';

              return (
                <div
                  key={dateStr}
                  className={`calendar-day ${isScheduledDay ? 'calendar-day--scheduled' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={Boolean(selectionState)}
                  onClick={() => {
                    setActiveDateKey(dateStr);
                    if (!hasExisting) {
                      toggleDateSelection(dateStr);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setActiveDateKey(dateStr);
                      if (!hasExisting) {
                        toggleDateSelection(dateStr);
                      }
                    }
                  }}
                >
                  <div className="flex items-center justify-between calendar-day-header">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveDateKey(dateStr);
                        if (!hasExisting) {
                          toggleDateSelection(dateStr);
                        }
                      }}
                      className="calendar-day-number"
                    >
                      {day}
                    </button>
                  </div>
                  {showCenteredIndicator && (
                    <span className={`calendar-day-icon-overlay ${iconClasses}`} aria-label={iconLabel}>
                      <DayIcon size={16} aria-hidden="true" />
                      {isPending && <span className="calendar-day-icon-badge">Pending</span>}
                      {selectionFill && (
                        <span className="calendar-day-icon-badge calendar-day-icon-badge--hours">
                          {selectionHours[selectionState]}h
                        </span>
                      )}
                    </span>
                  )}
                  {!showCenteredIndicator && (
                    <div className="calendar-shifts">
                      {shiftsForDay.map((shift) => (
                        <div key={shift.id} className="calendar-shift">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              statusStyles[shift.status] || 'bg-stone-100 text-stone-500'
                            }`}
                          >
                            {shift.status}
                          </span>
                          {shift.status === 'PENDING' && (
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleAccept(shift.id);
                                }}
                                className="flex-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-white"
                                style={{ backgroundColor: 'var(--primary)' }}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeclineClick(shift.id);
                                }}
                                className="flex-1 px-2 py-1 rounded-lg text-[10px] font-semibold border themed-border text-stone-600"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                          {shift.status === 'ACCEPTED' && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeclineClick(shift.id);
                              }}
                              className="mt-2 w-full px-2 py-1 rounded-lg text-[10px] font-semibold border themed-border text-stone-600"
                            >
                              Cancel Shift
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="themed-surface rounded-3xl p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500">Balances</p>
              <h3 className="font-quicksand font-bold text-lg text-stone-800">Time Off</h3>
            </div>
            <CalendarPlus size={18} className="text-stone-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl border themed-border bg-white">
              <p className="text-xs uppercase tracking-wide text-stone-500">Vacation Hours</p>
              <p className="text-lg font-semibold text-stone-800">{vacationHoursRemaining.toFixed(1)}</p>
            </div>
            <div className="p-3 rounded-2xl border themed-border bg-white">
              <p className="text-xs uppercase tracking-wide text-stone-500">Sick Hours</p>
              <p className="text-lg font-semibold text-stone-800">{sickHoursRemaining.toFixed(1)}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 mb-2 font-quicksand">
              Request Type
            </label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl border themed-border themed-ring bg-white text-sm"
            >
              <option value="VACATION">Vacation</option>
              <option value="SICK">Sick</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 mb-2 font-quicksand">
              Selected Dates
            </label>
            {selectedSummary.entries.length === 0 ? (
              <div className="text-xs text-stone-500 border themed-border rounded-2xl p-3">
                Click a date in the calendar to add time off.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedSummary.entries.map((entry) => (
                  <div
                    key={`${entry.label}-${entry.value}`}
                    className="flex items-center justify-between text-xs border themed-border rounded-2xl px-3 py-2 bg-white"
                  >
                    <div>
                      <div className="font-semibold text-stone-700">{entry.label}</div>
                      <div className="text-stone-500">{selectionHours[entry.value]}h</div>
                    </div>
                    <div className="text-stone-600">{entry.hours}h</div>
                  </div>
                ))}
              </div>
            )}
            {selectedSummary.entries.length > 0 && (
              <div className="flex items-center justify-between mt-3 text-xs text-stone-500">
                <span>Total: {selectedSummary.totalHours}h</span>
                <button
                  type="button"
                  onClick={clearSelections}
                  className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-700"
                >
                  <X size={12} /> Clear
                </button>
              </div>
            )}
          </div>

          {activeDaySummary && (
            <div className="border themed-border rounded-2xl p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-stone-500">Day Details</p>
                  <p className="text-sm font-semibold text-stone-800">{activeDaySummary.label}</p>
                </div>
              </div>

              {activeDaySummary.shifts.length > 0 && (
                <div className="space-y-3 mb-4">
                  {activeDaySummary.shifts.map((shift) => (
                    <div key={shift.id} className="border themed-border rounded-xl p-3">
                      <div className="flex items-center justify-between text-xs">
                        <div className="font-semibold text-stone-700">
                          {formatTime12Hour(shift.start_time)} - {formatTime12Hour(shift.end_time)}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            statusStyles[shift.status] || 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {shift.status}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        {shift.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => handleAccept(shift.id)}
                            className="flex-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-white"
                            style={{ backgroundColor: 'var(--primary)' }}
                          >
                            Accept
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeclineClick(shift.id)}
                          className="flex-1 px-2 py-1 rounded-lg text-[10px] font-semibold border themed-border text-stone-600"
                        >
                          Reject Shift
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeDaySummary.requests.length > 0 && (
                <div className="space-y-3">
                  {activeDaySummary.requests.map((request) => (
                    <div key={request.id} className="border themed-border rounded-xl p-3">
                      <div className="flex items-center justify-between text-xs">
                        <div className="font-semibold text-stone-700">{request.request_type}</div>
                        <span className="text-[10px] font-semibold text-stone-500">
                          {request.status === 'PENDING' ? 'Pending approval' : request.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-500 mt-1">
                        {request.start_date} to {request.end_date}
                      </div>
                      {request.created_at && (
                        <div className="text-[10px] text-stone-400 mt-1">
                          Requested on {new Date(request.created_at).toLocaleDateString()}
                        </div>
                      )}
                      {request.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleCancelRequest(request.id)}
                          className="mt-2 w-full px-2 py-1 rounded-lg text-[10px] font-semibold border themed-border text-stone-600"
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-500 mb-2 font-quicksand">
              Note (Optional)
            </label>
            <textarea
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-2xl border themed-border themed-ring bg-white text-sm resize-none"
              placeholder="Add details for admin"
            />
          </div>

          {requestError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-2xl px-3 py-2">
              {requestError}
            </div>
          )}

          {selectedSummary.entries.length > 0 && (
            <button
              type="button"
              onClick={handleRequestSubmit}
              disabled={requestLoading}
              className="w-full px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {requestLoading ? 'Submitting...' : 'Request Time Off'}
            </button>
          )}
        </div>
      </div>

      <div className="themed-surface rounded-3xl p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-quicksand font-bold text-lg text-stone-800">Time Off Requests</h3>
          <span className="text-xs text-stone-500">{requests.length} total</span>
        </div>
        {requestsLoading ? (
          <div className="text-sm text-stone-500">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="text-sm text-stone-500">No requests yet.</div>
        ) : (
          <div className="space-y-3">
            {requests.slice(0, 6).map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border themed-border bg-white"
              >
                <div>
                  <p className="text-sm font-semibold text-stone-800">
                    {request.request_type} - {request.start_date} to {request.end_date}
                  </p>
                  <p className="text-xs text-stone-500">
                    {request.hours ? `${request.hours} hours` : 'Full day'}
                  </p>
                  <p className="text-xs text-stone-500">{request.reason || 'No reason provided'}</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    statusStyles[request.status] || 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {request.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <BaseModal
        isOpen={showDeclineModal}
        onClose={() => {
          setShowDeclineModal(false);
          setDeclineId(null);
          setDeclineReason('');
          setDeclineType('UNPAID');
        }}
        title="Decline Shift"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Decline Type *
            </label>
            <select
              value={declineType}
              onChange={(e) => setDeclineType(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
            >
              <option value="UNPAID">Unpaid</option>
              <option value="SICK_DAY">Sick Hours ({parseFloat(balances.sick_days_remaining || 0).toFixed(1)} remaining)</option>
              <option value="VACATION_DAY">Vacation Hours ({parseFloat(balances.vacation_days_remaining || 0).toFixed(1)} remaining)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Reason *
            </label>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows="4"
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white resize-none"
              placeholder="Please explain why you cannot work this shift."
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowDeclineModal(false);
                setDeclineId(null);
                setDeclineReason('');
                setDeclineType('UNPAID');
              }}
              className="flex-1 px-4 py-2 rounded-xl border themed-border text-stone-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeclineSubmit}
              className="flex-1 px-4 py-2 rounded-xl text-white font-semibold"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Submit
            </button>
          </div>
        </div>
      </BaseModal>
    </EducatorLayout>
  );
}

export default MySchedule;
