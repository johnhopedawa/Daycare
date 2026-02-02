import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Pencil, Plus, Trash2, User } from 'lucide-react';
import { AddShiftModal } from '../components/modals/AddShiftModal';
import { BaseModal } from '../components/modals/BaseModal';
import api from '../utils/api';

const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeScheduleDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return getDateKey(value);
  }
  const raw = String(value);
  if (raw.includes('T')) {
    return raw.split('T')[0];
  }
  if (raw.length === 10 && raw[4] === '-' && raw[7] === '-') {
    return raw;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return getDateKey(parsed);
};

const parseDateKey = (dateKey) => {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatTimeCompact = (time24) => {
  if (!time24) return '';
  const [hoursRaw, minutesRaw] = String(time24).split(':');
  const hour24 = parseInt(hoursRaw, 10);
  if (!Number.isFinite(hour24)) return '';
  const hour12 = hour24 % 12 || 12;
  const minutes = minutesRaw || '00';
  if (minutes === '00') {
    return `${hour12}`;
  }
  return `${hour12}:${minutes}`;
};

const formatRequestType = (type) => {
  const value = String(type || '').toUpperCase();
  if (value === 'SICK') return 'Sick';
  if (value === 'VACATION') return 'Vacation';
  if (value === 'UNPAID') return 'Unpaid';
  return value || 'Time Off';
};

const getMonthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const getMonthRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { from: getDateKey(start), to: getDateKey(end) };
};

const getMonthGrid = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = firstDay.getDay();
  const totalSlots = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;
  const days = [];

  for (let i = 0; i < totalSlots; i += 1) {
    const dayNumber = i - startDayOfWeek + 1;
    days.push(dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null);
  }

  return days;
};

export function StaffSchedulingPage() {
  const [schedules, setSchedules] = useState([]);
  const [educators, setEducators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [selectedEducator, setSelectedEducator] = useState('all');
  const [currentMonth, setCurrentMonth] = useState(() => getMonthStart(new Date()));
  const [presetShiftDate, setPresetShiftDate] = useState(null);
  const [activeDateKey, setActiveDateKey] = useState(null);
  const [timeOffRequests, setTimeOffRequests] = useState([]);

  const [editForm, setEditForm] = useState({
    shiftDate: '',
    startTime: '',
    endTime: '',
    hours: '',
    notes: ''
  });

  const loadEducators = useCallback(async () => {
    try {
      const response = await api.get('/admin/users?role=EDUCATOR');
      setEducators(response.data.users || []);
    } catch (error) {
      console.error('Failed to load educators:', error);
    }
  }, []);

  const monthRange = useMemo(() => getMonthRange(currentMonth), [currentMonth]);

  const monthDays = useMemo(() => getMonthGrid(currentMonth), [currentMonth]);

  const monthTitle = useMemo(
    () => currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    [currentMonth]
  );

  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (monthRange.from) params.append('from', monthRange.from);
      if (monthRange.to) params.append('to', monthRange.to);
      if (selectedEducator !== 'all') params.append('user_id', selectedEducator);

      const response = await api.get(`/schedules/admin/schedules?${params.toString()}`);
      setSchedules(response.data.schedules || []);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    } finally {
      setLoading(false);
    }
  }, [monthRange, selectedEducator]);

  const loadTimeOffRequests = useCallback(async () => {
    try {
      const response = await api.get('/time-off-requests', { params: { status: 'APPROVED' } });
      setTimeOffRequests(response.data.requests || []);
    } catch (error) {
      console.error('Failed to load time off requests:', error);
      setTimeOffRequests([]);
    }
  }, []);

  useEffect(() => {
    loadEducators();
  }, [loadEducators]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  useEffect(() => {
    loadTimeOffRequests();
  }, [loadTimeOffRequests]);

  const calculateHours = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const hours = (endH + endM / 60) - (startH + startM / 60);
    return Number.isFinite(hours) ? hours.toFixed(2) : '';
  };

  const groupSchedulesByDate = (items) => {
    const grouped = {};
    items.forEach((schedule) => {
      const dateKey = normalizeScheduleDate(schedule.shift_date);
      if (!dateKey) {
        return;
      }
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(schedule);
    });
    return grouped;
  };

  const cardStyles = [
    { backgroundColor: 'var(--card-1)', color: 'var(--card-text-1)' },
    { backgroundColor: 'var(--card-2)', color: 'var(--card-text-2)' },
    { backgroundColor: 'var(--card-3)', color: 'var(--card-text-3)' },
    { backgroundColor: 'var(--card-4)', color: 'var(--card-text-4)' },
  ];
  const getColorForEducator = (index) => cardStyles[index % cardStyles.length];

  const openAddShift = (dateOverride) => {
    setPresetShiftDate(dateOverride || null);
    setIsAddShiftOpen(true);
  };

  const openDayDetails = (dateKey) => {
    setActiveDateKey(dateKey);
    setIsDayDetailOpen(true);
  };

  const openEditModal = (schedule) => {
    setEditingSchedule(schedule);
    setEditForm({
      shiftDate: normalizeScheduleDate(schedule.shift_date) || '',
      startTime: schedule.start_time || '',
      endTime: schedule.end_time || '',
      hours: schedule.hours || '',
      notes: schedule.notes || ''
    });
    setIsEditOpen(true);
  };

  const handleEditTimeChange = (field, value) => {
    const next = { ...editForm, [field]: value };
    if (field === 'startTime' || field === 'endTime') {
      next.hours = calculateHours(next.startTime, next.endTime);
    }
    setEditForm(next);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingSchedule) return;

    try {
      await api.patch(`/schedules/admin/schedules/${editingSchedule.id}`, editForm);
      setIsEditOpen(false);
      setEditingSchedule(null);
      loadSchedules();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update schedule');
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Delete this shift?')) return;
    try {
      await api.delete(`/schedules/admin/schedules/${id}`);
      loadSchedules();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete schedule');
    }
  };

  const groupedSchedules = groupSchedulesByDate(schedules);
  const todayKey = getDateKey(new Date());
  const filteredTimeOffRequests = useMemo(() => {
    if (selectedEducator === 'all') {
      return timeOffRequests;
    }
    return timeOffRequests.filter(
      (request) => String(request.user_id) === String(selectedEducator)
    );
  }, [timeOffRequests, selectedEducator]);
  const timeOffByDate = useMemo(() => {
    const map = new Map();
    filteredTimeOffRequests.forEach((request) => {
      if (String(request.status || '').toUpperCase() !== 'APPROVED') return;
      const startKey = normalizeScheduleDate(request.start_date);
      const endKey = normalizeScheduleDate(request.end_date);
      if (!startKey || !endKey) return;
      const start = parseDateKey(startKey);
      const end = parseDateKey(endKey);
      if (!start || !end) return;
      for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const key = getDateKey(cursor);
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key).push({
          id: request.id,
          first_name: request.first_name,
          last_name: request.last_name,
          request_type: request.request_type,
          reason: request.reason,
        });
      }
    });
    return map;
  }, [filteredTimeOffRequests]);

  const activeDayDetails = useMemo(() => {
    if (!activeDateKey) return null;
    const date = parseDateKey(activeDateKey);
    if (!date) return null;
    return {
      key: activeDateKey,
      label: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      shifts: groupedSchedules[activeDateKey] || [],
      timeOff: timeOffByDate.get(activeDateKey) || [],
    };
  }, [activeDateKey, groupedSchedules, timeOffByDate]);

  return (
    <Layout title="Staff Scheduling" subtitle="Manage educator shifts and coverage">
      <div className="themed-surface rounded-3xl p-4 mb-8 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl border themed-border bg-white">
            <button
              type="button"
              onClick={() => {
                const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
                setCurrentMonth(prev);
              }}
              className="px-3 py-2 rounded-xl text-sm font-medium text-stone-600 hover:text-stone-800"
            >
              Prev
            </button>
            <div className="text-sm font-semibold text-stone-700 min-w-[140px] text-center">
              {monthTitle}
            </div>
            <button
              type="button"
              onClick={() => {
                const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
                setCurrentMonth(next);
              }}
              className="px-3 py-2 rounded-xl text-sm font-medium text-stone-600 hover:text-stone-800"
            >
              Next
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCurrentMonth(getMonthStart(new Date()))}
            className="px-4 py-2 rounded-2xl border themed-border text-sm font-semibold text-stone-600 bg-white"
          >
            This Month
          </button>

          <div className="relative">
            <select
              value={selectedEducator}
              onChange={(e) => setSelectedEducator(e.target.value)}
              className="appearance-none pl-10 pr-8 py-2.5 rounded-2xl border themed-border themed-ring bg-white text-sm font-medium text-stone-600 cursor-pointer themed-hover transition-colors"
            >
              <option value="all">All Educators</option>
              {educators.map((edu) => (
                <option key={edu.id} value={edu.id}>
                  {edu.first_name} {edu.last_name}
                </option>
              ))}
            </select>
            <User
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
            />
          </div>
        </div>

        <div className="flex gap-3 w-full lg:w-auto">
          <button
            onClick={() => openAddShift()}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-white font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            style={{ backgroundColor: 'var(--primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
          >
            <Plus size={18} />
            Add Shift
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
          {monthTitle}
        </span>
        <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-stone-400">
          <div
            className="w-10 h-10 border-4 rounded-full animate-spin mb-4"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
          />
          <p className="font-quicksand font-medium">Loading schedules...</p>
        </div>
      ) : (
        <div className="themed-surface rounded-3xl p-4">
          {schedules.length === 0 && filteredTimeOffRequests.length === 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 text-stone-600">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--background)', color: 'var(--primary)' }}
                >
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-700">No shifts this month</p>
                  <p className="text-xs text-stone-500">Click a date to add a shift.</p>
                </div>
              </div>
              <button
                onClick={() => openAddShift()}
                className="px-4 py-2 text-white font-semibold rounded-2xl shadow-sm hover:opacity-90 transition-colors text-sm"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                Add Shift
              </button>
            </div>
          )}

          <div className="calendar-grid">
            <div className="calendar-header">Sun</div>
            <div className="calendar-header">Mon</div>
            <div className="calendar-header">Tue</div>
            <div className="calendar-header">Wed</div>
            <div className="calendar-header">Thu</div>
            <div className="calendar-header">Fri</div>
            <div className="calendar-header">Sat</div>

            <AnimatePresence>
              {monthDays.map((dayNumber, index) => {
                if (!dayNumber) {
                  return (
                    <div key={`empty-${index}`} className="calendar-day calendar-day--empty" />
                  );
                }
                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNumber);
                const dateKey = getDateKey(date);
                const daySchedules = groupedSchedules[dateKey] || [];
                const dayTimeOff = timeOffByDate.get(dateKey) || [];
                const isToday = dateKey === todayKey;
                const hasShifts = daySchedules.length > 0;
                const hasEvents = hasShifts || dayTimeOff.length > 0;
                const eventCount = daySchedules.length + dayTimeOff.length;
                const dayProps = {
                  role: 'button',
                  tabIndex: 0,
                  onClick: () => openDayDetails(dateKey),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openDayDetails(dateKey);
                    }
                  },
                  'aria-label': `View details for ${date.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}`,
                };

                return (
                  <div
                    key={dateKey}
                    className={`calendar-day ${hasEvents ? 'calendar-day--scheduled' : ''} ${
                      isToday ? 'calendar-day--today' : ''
                    } cursor-pointer`}
                    {...dayProps}
                  >
                    <div className="flex items-center justify-between calendar-day-header">
                      <span className="calendar-day-number">{dayNumber}</span>
                      {eventCount > 0 && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                          style={{ backgroundColor: 'var(--background)', color: 'var(--primary-dark)' }}
                        >
                          {eventCount}
                        </span>
                      )}
                    </div>

                    <div className="hidden md:flex flex-col gap-1 text-[11px] text-stone-600">
                      {daySchedules.map((schedule, i) => {
                        const start = formatTimeCompact(schedule.start_time);
                        const end = formatTimeCompact(schedule.end_time);
                        const timeLabel = start && end ? `${start}-${end}` : start || end;
                        return (
                          <div key={schedule.id} className="flex items-center gap-1 truncate">
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: getColorForEducator(i).backgroundColor }}
                            />
                            <span className="font-semibold text-stone-700 truncate">
                              {schedule.first_name}
                            </span>
                            {timeLabel && (
                              <span className="text-stone-500">{timeLabel}</span>
                            )}
                          </div>
                        );
                      })}
                      {dayTimeOff.map((request) => (
                        <div key={`timeoff-${request.id}`} className="flex items-center gap-1 truncate">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-300" />
                          <span className="font-semibold text-stone-700 truncate">
                            {request.first_name}
                          </span>
                          <span className="text-emerald-700">{formatRequestType(request.request_type)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
      <AddShiftModal
        isOpen={isAddShiftOpen}
        onClose={() => {
          setIsAddShiftOpen(false);
          setPresetShiftDate(null);
        }}
        onSuccess={loadSchedules}
        initialDate={presetShiftDate}
      />

      <BaseModal
        isOpen={isDayDetailOpen}
        onClose={() => setIsDayDetailOpen(false)}
        title={activeDayDetails ? `Schedule Details - ${activeDayDetails.label}` : 'Schedule Details'}
      >
        <div className="space-y-4">
          {activeDayDetails && (activeDayDetails.shifts.length > 0 || activeDayDetails.timeOff.length > 0) ? (
            <>
              {activeDayDetails.shifts.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-stone-500 mb-2">Shifts</p>
                  <div className="space-y-2">
                    {activeDayDetails.shifts.map((shift) => {
                      const start = formatTimeCompact(shift.start_time);
                      const end = formatTimeCompact(shift.end_time);
                      return (
                        <div key={shift.id} className="rounded-xl border themed-border bg-white p-3">
                          <div className="flex items-center justify-between gap-3 text-sm font-semibold text-stone-800">
                            <span>{shift.first_name}</span>
                            <div className="flex items-center gap-2 text-stone-600">
                              <span>{start && end ? `${start}-${end}` : start || end}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsDayDetailOpen(false);
                                  openEditModal(shift);
                                }}
                                className="p-1 text-stone-400 hover:text-[color:var(--primary-dark)]"
                                aria-label="Edit shift"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsDayDetailOpen(false);
                                  handleDeleteSchedule(shift.id);
                                }}
                                className="p-1 text-stone-400 hover:text-red-500"
                                aria-label="Delete shift"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          {shift.notes && (
                            <div className="text-xs text-stone-500 mt-1">{shift.notes}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeDayDetails.timeOff.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-stone-500 mb-2">Approved Time Off</p>
                  <div className="space-y-2">
                    {activeDayDetails.timeOff.map((request) => (
                      <div key={`timeoff-${request.id}`} className="rounded-xl border themed-border bg-white p-3">
                        <div className="flex items-center justify-between text-sm font-semibold text-stone-800">
                          <span>{request.first_name}</span>
                          <span className="text-emerald-700">{formatRequestType(request.request_type)}</span>
                        </div>
                        {request.reason && (
                          <div className="text-xs text-stone-500 mt-1">{request.reason}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-stone-500">No shifts or approved time off for this day.</div>
          )}

          <div className="flex gap-3 pt-2 border-t themed-border">
            <button
              type="button"
              onClick={() => {
                if (activeDayDetails) {
                  openAddShift(parseDateKey(activeDayDetails.key));
                } else {
                  openAddShift();
                }
                setIsDayDetailOpen(false);
              }}
              className="flex-1 px-4 py-2 rounded-xl text-white font-semibold"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Add Shift
            </button>
            <button
              type="button"
              onClick={() => setIsDayDetailOpen(false)}
              className="flex-1 px-4 py-2 rounded-xl border themed-border text-stone-600 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </BaseModal>

      <BaseModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingSchedule(null);
        }}
        title="Edit Schedule"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Date *
            </label>
            <input
              type="date"
              value={editForm.shiftDate}
              onChange={(e) => setEditForm({ ...editForm, shiftDate: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Start Time *
              </label>
              <input
                type="time"
                value={editForm.startTime}
                onChange={(e) => handleEditTimeChange('startTime', e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                End Time *
              </label>
              <input
                type="time"
                value={editForm.endTime}
                onChange={(e) => handleEditTimeChange('endTime', e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Hours *
            </label>
            <input
              type="number"
              step="0.01"
              value={editForm.hours}
              onChange={(e) => setEditForm({ ...editForm, hours: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Notes
            </label>
            <textarea
              rows={3}
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white resize-none"
            />
          </div>
          <div className="flex gap-3 pt-4 border-t themed-border">
            <button
              type="button"
              onClick={() => {
                setIsEditOpen(false);
                setEditingSchedule(null);
              }}
              className="flex-1 px-6 py-3 rounded-2xl border themed-border text-stone-600 font-bold themed-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-2xl text-white font-bold shadow-lg hover:opacity-90 transition-all"
              style={{ backgroundColor: 'var(--primary)', boxShadow: '0 12px 20px -12px var(--menu-shadow)' }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </BaseModal>

    </Layout>
  );
}







