import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Check, Clock, AlertCircle, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import { BaseModal } from '../components/modals/BaseModal';
import api from '../utils/api';

export function AttendancePage({ layout: LayoutComponent = Layout, title = 'Attendance', subtitle = 'Track daily check-ins and absences' }) {
  const [children, setChildren] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ present: 0, checkedOut: 0, absent: 0, total: 0 });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendanceError, setAttendanceError] = useState('');
  const [attendanceMode, setAttendanceMode] = useState(() => {
    return localStorage.getItem('attendanceMode') || 'automatic';
  });
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());
  const [pendingDate, setPendingDate] = useState(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [isAbsentOpen, setIsAbsentOpen] = useState(false);
  const [parentName, setParentName] = useState('');
  const [parentOptions, setParentOptions] = useState([]);
  const [selectedParentOption, setSelectedParentOption] = useState('custom');
  const [customParentName, setCustomParentName] = useState('');
  const [manualTime, setManualTime] = useState('07:00');
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [absentNotes, setAbsentNotes] = useState('');
  const [absentStatus, setAbsentStatus] = useState('ABSENT');
  const [submittingChildId, setSubmittingChildId] = useState(null);

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setAttendanceError('');
      const dateStr = formatDateForAPI(selectedDate);
      const [attendanceRes, childrenRes] = await Promise.all([
        api.get(`/attendance?start_date=${dateStr}&end_date=${dateStr}`),
        api.get(`/attendance/children?status=ACTIVE&date=${dateStr}`),
      ]);

      const attendanceData = attendanceRes.data.attendance || [];
      const childrenData = childrenRes.data.children || [];

      setAttendance(attendanceData);
      setChildren(childrenData);

      const present = attendanceData.filter(a => a.check_in_time && !a.check_out_time).length;
      const checkedOut = attendanceData.filter(a => a.check_out_time).length;
      const absent = attendanceData.filter(a => ['ABSENT', 'SICK', 'VACATION'].includes(a.status)).length;
      const total = childrenData.length;

      setStats({ present, checkedOut, absent, total });
    } catch (error) {
      if (error.response?.status === 403) {
        setAttendanceError(error.response?.data?.error || 'You are not scheduled for today.');
        setAttendance([]);
        setChildren([]);
        setStats({ present: 0, checkedOut: 0, absent: 0, total: 0 });
      } else {
        console.error('Failed to load attendance:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const formatDateForAPI = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getCalendarGrid = (monthDate) => {
    const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const startOffset = firstOfMonth.getDay();

    const grid = [];
    for (let i = 0; i < startOffset; i++) {
      grid.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      grid.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
    }
    while (grid.length % 7 !== 0) {
      grid.push(null);
    }
    return grid;
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const h = hour.toString().padStart(2, '0');
        const m = minute.toString().padStart(2, '0');
        const period = hour < 12 ? 'AM' : 'PM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        options.push({
          value: `${h}:${m}`,
          label: `${displayHour}:${m} ${period}`,
        });
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  const formatTime = (time24) => {
    if (!time24) return '-';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const parseAttendanceNotes = (rawNotes) => {
    const parsed = { dropOff: '', pickUp: '', general: '' };
    const value = String(rawNotes || '').trim();
    if (!value) {
      return parsed;
    }

    const generalLines = [];
    value.split('\n').forEach((line) => {
      const entry = line.trim();
      if (!entry) return;
      if (entry.startsWith('DROP_OFF_NOTE::')) {
        parsed.dropOff = entry.replace('DROP_OFF_NOTE::', '').trim();
        return;
      }
      if (entry.startsWith('PICK_UP_NOTE::')) {
        parsed.pickUp = entry.replace('PICK_UP_NOTE::', '').trim();
        return;
      }
      generalLines.push(entry);
    });

    parsed.general = generalLines.join('\n').trim();
    return parsed;
  };

  const buildAttendanceNotes = ({ dropOff = '', pickUp = '', general = '' }) => {
    const lines = [];
    if (dropOff) lines.push(`DROP_OFF_NOTE::${dropOff}`);
    if (pickUp) lines.push(`PICK_UP_NOTE::${pickUp}`);
    if (general) lines.push(general);
    return lines.join('\n').trim() || null;
  };

  const getStatusBadge = (record) => {
    if (!record) {
      return <span className="text-stone-400 text-sm">Not recorded</span>;
    }
    if (record.check_in_time && !record.check_out_time) {
      return (
        <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
          <Check size={16} /> Present
        </span>
      );
    }
    if (record.check_out_time) {
      return (
        <span className="flex items-center gap-1.5 text-amber-600 text-sm font-medium">
          <Clock size={16} /> Checked Out
        </span>
      );
    }
    if (record.status === 'ABSENT') {
      return (
        <span className="flex items-center gap-1.5 text-red-500 text-sm font-medium">
          <AlertCircle size={16} /> Absent
        </span>
      );
    }
    if (record.status === 'SICK') {
      return (
        <span className="flex items-center gap-1.5 text-purple-500 text-sm font-medium">
          <AlertCircle size={16} /> Sick
        </span>
      );
    }
    if (record.status === 'VACATION') {
      return (
        <span className="flex items-center gap-1.5 text-blue-500 text-sm font-medium">
          <AlertCircle size={16} /> Vacation
        </span>
      );
    }
    return <span className="text-stone-400 text-sm">-</span>;
  };

  const toggleAttendanceMode = () => {
    const nextMode = attendanceMode === 'automatic' ? 'manual' : 'automatic';
    setAttendanceMode(nextMode);
    localStorage.setItem('attendanceMode', nextMode);
  };

  const getParentChoicesForChild = useCallback((childId) => {
    const child = children.find((entry) => String(entry.id) === String(childId));
    const rawParents = Array.isArray(child?.parents) ? child.parents : [];
    const uniqueParents = Array.from(
      new Map(
        rawParents
          .filter((parent) => parent && parent.id)
          .map((parent) => [String(parent.id), parent])
      ).values()
    );

    const sortedParents = [...uniqueParents].sort((a, b) => {
      const aPrimary = Boolean(a.is_primary_contact);
      const bPrimary = Boolean(b.is_primary_contact);
      if (aPrimary !== bPrimary) {
        return aPrimary ? -1 : 1;
      }
      const aName = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
      const bName = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
      return aName.localeCompare(bName);
    });

    const options = sortedParents.map((parent) => ({
      value: String(parent.id),
      label: `${parent.first_name || ''} ${parent.last_name || ''}`.trim() || `Parent ${parent.id}`,
      isPrimary: Boolean(parent.is_primary_contact),
    }));

    const defaultValue = options.find((option) => option.isPrimary)?.value || options[0]?.value || 'custom';
    return { options, defaultValue };
  }, [children]);

  const initializeParentSelection = useCallback((childId) => {
    const { options, defaultValue } = getParentChoicesForChild(childId);
    setParentOptions(options);
    setSelectedParentOption(defaultValue);
    setCustomParentName('');

    if (defaultValue === 'custom') {
      setParentName('');
      return;
    }

    const selected = options.find((option) => option.value === defaultValue);
    setParentName(selected?.label || '');
  }, [getParentChoicesForChild]);

  const handleParentOptionChange = (nextValue) => {
    setSelectedParentOption(nextValue);
    if (nextValue === 'custom') {
      setParentName(customParentName.trim());
      return;
    }
    const selected = parentOptions.find((option) => option.value === nextValue);
    setParentName(selected?.label || '');
  };

  const handleCustomParentNameChange = (value) => {
    setCustomParentName(value);
    if (selectedParentOption === 'custom') {
      setParentName(value);
    }
  };

  const openDatePicker = () => {
    setPendingDate(new Date(selectedDate));
    setDatePickerMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    setIsDatePickerOpen(true);
  };

  const handleDateSelect = () => {
    setSelectedDate(new Date(pendingDate));
    setIsDatePickerOpen(false);
  };

  const handleCheckIn = (childId) => {
    setSelectedChildId(childId);
    initializeParentSelection(childId);
    setCheckInNotes('');
    if (attendanceMode === 'manual') {
      setManualTime('07:00');
    }
    setIsCheckInOpen(true);
  };

  const handleCheckOut = (childId) => {
    setSelectedChildId(childId);
    initializeParentSelection(childId);
    setCheckOutNotes('');
    if (attendanceMode === 'manual') {
      setManualTime('18:00');
    }
    setIsCheckOutOpen(true);
  };

  const handleSubmitCheckIn = async () => {
    if (!parentName.trim()) {
      alert('Please select or enter a parent/guardian name');
      return;
    }

    try {
      setSubmittingChildId(selectedChildId);
      const existingRecord = attendance.find((entry) => entry.child_id === selectedChildId);
      const existingNotes = parseAttendanceNotes(existingRecord?.notes);
      const nextNotes = buildAttendanceNotes({
        dropOff: checkInNotes.trim() || existingNotes.dropOff,
        pickUp: existingNotes.pickUp,
        general: existingNotes.general,
      });

      const payload = {
        child_id: selectedChildId,
        parent_name: parentName,
        attendance_date: formatDateForAPI(selectedDate),
        notes: nextNotes,
      };

      if (attendanceMode === 'manual') {
        payload.check_in_time = `${manualTime}:00`;
      }

      await api.post('/attendance/check-in', payload);
      setIsCheckInOpen(false);
      loadAttendance();
    } catch (error) {
      console.error('Check-in error:', error);
      alert(error.response?.data?.error || 'Failed to check in');
    } finally {
      setSubmittingChildId(null);
    }
  };

  const handleSubmitCheckOut = async () => {
    if (!parentName.trim()) {
      alert('Please select or enter a parent/guardian name');
      return;
    }

    try {
      setSubmittingChildId(selectedChildId);
      const existingRecord = attendance.find((entry) => entry.child_id === selectedChildId);
      const existingNotes = parseAttendanceNotes(existingRecord?.notes);
      const fallbackDropOffNote = !existingNotes.dropOff && !existingNotes.pickUp && existingNotes.general && existingRecord?.check_in_time
        ? existingNotes.general
        : '';
      const generalNotes = fallbackDropOffNote ? '' : existingNotes.general;
      const nextNotes = buildAttendanceNotes({
        dropOff: existingNotes.dropOff || fallbackDropOffNote,
        pickUp: checkOutNotes.trim() || existingNotes.pickUp,
        general: generalNotes,
      });

      const payload = {
        child_id: selectedChildId,
        parent_name: parentName,
        attendance_date: formatDateForAPI(selectedDate),
        notes: nextNotes,
      };

      if (attendanceMode === 'manual') {
        payload.check_out_time = `${manualTime}:00`;
      }

      await api.post('/attendance/check-out', payload);
      setIsCheckOutOpen(false);
      loadAttendance();
    } catch (error) {
      console.error('Check-out error:', error);
      alert(error.response?.data?.error || 'Failed to check out');
    } finally {
      setSubmittingChildId(null);
    }
  };

  const handleMarkAbsent = (childId) => {
    setSelectedChildId(childId);
    setAbsentStatus('ABSENT');
    setAbsentNotes('');
    setIsAbsentOpen(true);
  };

  const handleSubmitAbsent = async () => {
    try {
      setSubmittingChildId(selectedChildId);
      await api.post('/attendance/mark-absent', {
        child_id: selectedChildId,
        attendance_date: formatDateForAPI(selectedDate),
        status: absentStatus,
        notes: absentNotes || null,
      });
      setIsAbsentOpen(false);
      loadAttendance();
    } catch (error) {
      console.error('Mark absent error:', error);
      alert(error.response?.data?.error || 'Failed to mark absence');
    } finally {
      setSubmittingChildId(null);
    }
  };

  const getAttendanceRecord = (childId) => {
    return attendance.find((record) => record.child_id === childId);
  };

  const selectedDateKey = formatDateForAPI(selectedDate);
  const todayKey = formatDateForAPI(new Date());
  const isSelectedDateToday = selectedDateKey === todayKey;
  const recordedCount = stats.present + stats.checkedOut + stats.absent;
  const completionPercent = stats.total > 0
    ? Math.min(100, Math.round((recordedCount / stats.total) * 100))
    : 0;

  if (loading) {
    return (
      <LayoutComponent title={title} subtitle={subtitle}>
        <div className="flex min-h-[320px] items-center justify-center">
          <div className="rounded-3xl border themed-border bg-white px-8 py-10 text-center shadow-sm">
            <div
              className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4"
              style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
            />
            <div className="text-sm font-semibold text-stone-600">Loading attendance workspace...</div>
          </div>
        </div>
      </LayoutComponent>
    );
  }

  return (
    <LayoutComponent title={title} subtitle={subtitle}>
      <div className="mb-8 overflow-hidden rounded-3xl border themed-border bg-white p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-stone-500">Attendance Workspace</p>
            <h2 className="text-2xl font-black text-stone-800 md:text-3xl">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              {isSelectedDateToday ? 'Live day view. Updates are reflected in real time.' : 'Historical date selected. You can still update attendance records.'}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-stone-700">
                {recordedCount}/{stats.total} recorded
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-stone-700">
                {completionPercent}% completion
              </span>
              {!isSelectedDateToday && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  Historical mode
                </span>
              )}
            </div>
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto">
            <button
              onClick={openDatePicker}
              className="rounded-2xl border themed-border bg-[var(--background)] px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:brightness-95"
            >
              <span className="inline-flex items-center gap-2">
                <Calendar size={16} />
                Choose Date
              </span>
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="rounded-2xl border themed-border bg-[var(--background)] px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSelectedDateToday}
            >
              Today
            </button>
            <button
              onClick={toggleAttendanceMode}
              className="rounded-2xl border themed-border bg-[var(--background)] px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:brightness-95"
            >
              <span className="inline-flex items-center gap-2">
                {attendanceMode === 'manual' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                {attendanceMode === 'manual' ? 'Manual Time' : 'Auto Time'}
              </span>
            </button>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-stone-600">
            <span>Roster Completion</span>
            <span>{completionPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${completionPercent}%`, backgroundColor: 'var(--primary)' }}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border themed-border bg-white shadow-[0_16px_30px_-18px_var(--menu-shadow)]">
        <div className="border-b themed-border px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-quicksand text-xl font-bold text-stone-800">Attendance Log</h3>
              <p className="mt-1 text-sm text-stone-500">Manage check-ins, check-outs, and absence statuses.</p>
            </div>
            <span className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-semibold text-[var(--primary-dark)]">
              {attendanceMode === 'manual' ? 'Manual timing enabled' : 'Automatic timing enabled'}
            </span>
          </div>
        </div>

        {attendanceError ? (
          <div className="px-6 py-12 text-center">
            <p className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
              {attendanceError}
            </p>
          </div>
        ) : children.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-stone-500">No active children found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px]">
              <thead className="bg-[var(--background)]">
                <tr>
                  <th className="w-[220px] px-4 py-3 text-left font-quicksand text-xs font-bold uppercase tracking-wider text-stone-500">
                    Child
                  </th>
                  <th className="px-6 py-3 text-left font-quicksand text-xs font-bold uppercase tracking-wider text-stone-500">
                    Check-in
                  </th>
                  <th className="px-6 py-3 text-left font-quicksand text-xs font-bold uppercase tracking-wider text-stone-500">
                    Check-out
                  </th>
                  <th className="px-6 py-3 text-left font-quicksand text-xs font-bold uppercase tracking-wider text-stone-500">
                    Drop-off
                  </th>
                  <th className="px-6 py-3 text-left font-quicksand text-xs font-bold uppercase tracking-wider text-stone-500">
                    Pick-up
                  </th>
                  <th className="px-6 py-3 text-right font-quicksand text-xs font-bold uppercase tracking-wider text-stone-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y themed-border">
                {children.map((child) => {
                  const record = getAttendanceRecord(child.id);
                  const isCheckedIn = record && record.check_in_time && !record.check_out_time;
                  const isCheckedOut = record && record.check_out_time;
                  const isAbsent = record && ['ABSENT', 'SICK', 'VACATION'].includes(record.status);
                  const hasCheckIn = Boolean(record?.check_in_time);
                  const hasCheckOut = Boolean(record?.check_out_time);
                  const noteParts = parseAttendanceNotes(record?.notes);
                  const dropOffNote = noteParts.dropOff
                    || ((!noteParts.dropOff && !noteParts.pickUp && noteParts.general && record?.check_in_time && !record?.check_out_time)
                      ? noteParts.general
                      : '');
                  const pickUpNote = noteParts.pickUp
                    || ((!noteParts.dropOff && !noteParts.pickUp && noteParts.general && record?.check_out_time)
                      ? noteParts.general
                      : '');

                  return (
                    <tr key={child.id} className="transition-colors hover:bg-[var(--background)]">
                      <td className="w-[220px] px-4 py-3">
                        <div className="flex items-center">
                          <div className="mr-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--card-1)] font-bold text-[var(--card-text-1)]">
                            {child.first_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-stone-800">
                              {child.first_name} {child.last_name}
                            </div>
                            <div className="mt-1">{getStatusBadge(record)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-700">
                        {hasCheckIn ? (
                          formatTime(record?.check_in_time)
                        ) : !record ? (
                          <button
                            onClick={() => handleCheckIn(child.id)}
                            className="rounded-lg bg-[var(--background)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-dark)] transition hover:brightness-95"
                            disabled={submittingChildId === child.id}
                          >
                            Check In
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-700">
                        {hasCheckOut ? (
                          formatTime(record?.check_out_time)
                        ) : !isAbsent ? (
                          <button
                            onClick={() => handleCheckOut(child.id)}
                            className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={submittingChildId === child.id || !hasCheckIn}
                            title={!hasCheckIn ? 'Check-in required before check-out' : 'Check out'}
                          >
                            Check Out
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-600">
                        <div className="space-y-1">
                          <div className="font-medium text-stone-700">{record?.parent_dropped_off || '-'}</div>
                          {dropOffNote ? (
                            <div className="max-w-[220px] text-xs text-stone-500 line-clamp-2">{dropOffNote}</div>
                          ) : (
                            <div className="text-xs text-stone-400">No drop-off note</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-600">
                        <div className="space-y-1">
                          <div className="font-medium text-stone-700">{record?.parent_picked_up || '-'}</div>
                          {pickUpNote ? (
                            <div className="max-w-[220px] text-xs text-stone-500 line-clamp-2">{pickUpNote}</div>
                          ) : (
                            <div className="text-xs text-stone-400">No pick-up note</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!record && (
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleMarkAbsent(child.id)}
                              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                              disabled={submittingChildId === child.id}
                            >
                              Mark Absent
                            </button>
                          </div>
                        )}
                        {isCheckedIn && (
                          <span className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                            In Progress
                          </span>
                        )}
                        {(isCheckedOut || isAbsent) && (
                          <span className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-500">
                            Complete
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Date Picker */}
      <BaseModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        title="Select Date"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() - 1, 1))}
              className="px-3 py-1 rounded-xl border themed-border text-stone-600"
            >
              Prev
            </button>
            <div className="font-bold text-stone-700">
              {datePickerMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button
              type="button"
              onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + 1, 1))}
              className="px-3 py-1 rounded-xl border themed-border text-stone-600"
            >
              Next
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-stone-500 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {getCalendarGrid(datePickerMonth).map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} />;
              }
              const dayKey = formatDateForAPI(day);
              const selectedKey = formatDateForAPI(pendingDate);
              const isSelected = dayKey === selectedKey;
              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => setPendingDate(new Date(day))}
                  className={`h-10 rounded-xl border text-sm ${
                    isSelected
                      ? 'border-[var(--primary)] bg-[var(--background)] text-[var(--primary-dark)]'
                      : 'themed-border text-stone-600'
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsDatePickerOpen(false)}
              className="flex-1 px-4 py-2 rounded-xl border themed-border text-stone-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDateSelect}
              className="flex-1 px-4 py-2 rounded-xl bg-[var(--primary)] text-white font-semibold"
            >
              Apply
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Check In Modal */}
      <BaseModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        title="Check In"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Parent/Guardian *
            </label>
            <select
              value={selectedParentOption || 'custom'}
              onChange={(e) => handleParentOptionChange(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
            >
              {parentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}{option.isPrimary ? ' (Primary)' : ''}
                </option>
              ))}
              <option value="custom">Custom / Other...</option>
            </select>
            {selectedParentOption === 'custom' && (
              <input
                type="text"
                value={customParentName}
                onChange={(e) => handleCustomParentNameChange(e.target.value)}
                placeholder="Enter parent/guardian name"
                className="w-full mt-2 px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
            )}
          </div>
          {attendanceMode === 'manual' ? (
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Check-In Time *
              </label>
              <select
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              >
                {timeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-[var(--background)] text-stone-600 text-sm">
              Check-In Time: {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Drop-Off Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={checkInNotes}
              onChange={(e) => setCheckInNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCheckInOpen(false)}
              className="flex-1 px-4 py-2 rounded-xl border themed-border text-stone-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitCheckIn}
              className="flex-1 px-4 py-2 rounded-xl bg-[var(--primary)] text-white font-semibold"
              disabled={submittingChildId === selectedChildId}
            >
              Check In
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Check Out Modal */}
      <BaseModal
        isOpen={isCheckOutOpen}
        onClose={() => setIsCheckOutOpen(false)}
        title="Check Out"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Parent/Guardian *
            </label>
            <select
              value={selectedParentOption || 'custom'}
              onChange={(e) => handleParentOptionChange(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
            >
              {parentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}{option.isPrimary ? ' (Primary)' : ''}
                </option>
              ))}
              <option value="custom">Custom / Other...</option>
            </select>
            {selectedParentOption === 'custom' && (
              <input
                type="text"
                value={customParentName}
                onChange={(e) => handleCustomParentNameChange(e.target.value)}
                placeholder="Enter parent/guardian name"
                className="w-full mt-2 px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              />
            )}
          </div>
          {attendanceMode === 'manual' ? (
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
                Check-Out Time *
              </label>
              <select
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
              >
                {timeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-[var(--background)] text-stone-600 text-sm">
              Check-Out Time: {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Pick-Up Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={checkOutNotes}
              onChange={(e) => setCheckOutNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCheckOutOpen(false)}
              className="flex-1 px-4 py-2 rounded-xl border themed-border text-stone-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitCheckOut}
              className="flex-1 px-4 py-2 rounded-xl bg-[var(--primary)] text-white font-semibold"
              disabled={submittingChildId === selectedChildId}
            >
              Check Out
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Mark Absent Modal */}
      <BaseModal
        isOpen={isAbsentOpen}
        onClose={() => setIsAbsentOpen(false)}
        title="Mark Absence"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Absence Type *
            </label>
            <select
              value={absentStatus}
              onChange={(e) => setAbsentStatus(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
            >
              <option value="ABSENT">Absent</option>
              <option value="SICK">Sick</option>
              <option value="VACATION">Vacation</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 font-quicksand">
              Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={absentNotes}
              onChange={(e) => setAbsentNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAbsentOpen(false)}
              className="flex-1 px-4 py-2 rounded-xl border themed-border text-stone-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitAbsent}
              className="flex-1 px-4 py-2 rounded-xl bg-[var(--primary)] text-white font-semibold"
              disabled={submittingChildId === selectedChildId}
            >
              Submit
            </button>
          </div>
        </div>
      </BaseModal>
    </LayoutComponent>
  );
}


