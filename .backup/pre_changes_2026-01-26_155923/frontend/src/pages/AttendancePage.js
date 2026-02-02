import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { motion } from 'framer-motion';
import { Check, Clock, AlertCircle, UserCheck, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import { BaseModal } from '../components/modals/BaseModal';
import api from '../utils/api';

export function AttendancePage() {
  const [children, setChildren] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ present: 0, checkedOut: 0, absent: 0, total: 0 });
  const [selectedDate, setSelectedDate] = useState(new Date());
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
  const [manualTime, setManualTime] = useState('07:00');
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [absentNotes, setAbsentNotes] = useState('');
  const [absentStatus, setAbsentStatus] = useState('ABSENT');
  const [submittingChildId, setSubmittingChildId] = useState(null);

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const dateStr = formatDateForAPI(selectedDate);
      const [attendanceRes, childrenRes] = await Promise.all([
        api.get(`/attendance?start_date=${dateStr}&end_date=${dateStr}`),
        api.get('/children?status=ACTIVE'),
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
      console.error('Failed to load attendance:', error);
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
    setParentName('');
    setCheckInNotes('');
    if (attendanceMode === 'manual') {
      setManualTime('07:00');
    }
    setIsCheckInOpen(true);
  };

  const handleCheckOut = (childId) => {
    setSelectedChildId(childId);
    setParentName('');
    setCheckOutNotes('');
    if (attendanceMode === 'manual') {
      setManualTime('18:00');
    }
    setIsCheckOutOpen(true);
  };

  const handleSubmitCheckIn = async () => {
    if (!parentName.trim()) {
      alert('Please enter parent/guardian name');
      return;
    }

    try {
      setSubmittingChildId(selectedChildId);
      const payload = {
        child_id: selectedChildId,
        parent_name: parentName,
        attendance_date: formatDateForAPI(selectedDate),
        notes: checkInNotes || null,
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
      alert('Please enter parent/guardian name');
      return;
    }

    try {
      setSubmittingChildId(selectedChildId);
      const payload = {
        child_id: selectedChildId,
        parent_name: parentName,
        attendance_date: formatDateForAPI(selectedDate),
        notes: checkOutNotes || null,
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

  if (loading) {
    return (
      <Layout title="Attendance" subtitle="Track daily check-ins and absences">
        <div className="flex items-center justify-center h-64">
          <div className="text-stone-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Attendance" subtitle="Track daily check-ins and absences">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-3xl shadow-sm border themed-border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-400 font-medium uppercase mb-1">Total Children</p>
              <p className="text-3xl font-bold text-stone-800">{stats.total}</p>
            </div>
            <div className="p-3 bg-[var(--card-1)] rounded-2xl">
              <UserCheck size={24} className="text-[var(--card-text-1)]" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl shadow-sm border themed-border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-400 font-medium uppercase mb-1">Present</p>
              <p className="text-3xl font-bold text-green-600">{stats.present}</p>
            </div>
            <div className="p-3 bg-[var(--card-2)] rounded-2xl">
              <Check size={24} className="text-[var(--card-text-2)]" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-3xl shadow-sm border themed-border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-400 font-medium uppercase mb-1">Checked Out</p>
              <p className="text-3xl font-bold text-amber-600">{stats.checkedOut}</p>
            </div>
            <div className="p-3 bg-[var(--card-3)] rounded-2xl">
              <Clock size={24} className="text-[var(--card-text-3)]" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-3xl shadow-sm border themed-border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-400 font-medium uppercase mb-1">Absent</p>
              <p className="text-3xl font-bold text-red-500">{stats.absent}</p>
            </div>
            <div className="p-3 bg-[var(--card-4)] rounded-2xl">
              <AlertCircle size={24} className="text-[var(--card-text-4)]" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-3xl shadow-[0_12px_20px_-12px_var(--menu-shadow)] border themed-border overflow-hidden">
        <div className="p-6 border-b themed-border flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-quicksand font-bold text-xl text-stone-800">
            Attendance for {selectedDate.toLocaleDateString()}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={openDatePicker}
              className="px-4 py-2 rounded-xl bg-[var(--background)] text-[var(--primary-dark)] font-medium text-sm themed-hover transition-colors flex items-center gap-2"
            >
              <Calendar size={16} /> Choose Date
            </button>
            <button
              onClick={toggleAttendanceMode}
              className="px-4 py-2 rounded-xl bg-[var(--background)] text-[var(--primary-dark)] font-medium text-sm themed-hover transition-colors flex items-center gap-2"
            >
              {attendanceMode === 'manual' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              {attendanceMode === 'manual' ? 'Manual Time' : 'Auto Time'}
            </button>
          </div>
        </div>

        {children.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-stone-500">No active children found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--background)]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Child
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Check-in Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Check-out Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Parent Drop-off
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Parent Pick-up
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
                    Notes
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-stone-500 uppercase tracking-wider font-quicksand">
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

                  return (
                    <tr
                      key={child.id}
                      className="themed-row transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-[var(--card-1)] flex items-center justify-center text-[var(--card-text-1)] font-bold mr-3">
                            {child.first_name.charAt(0)}
                          </div>
                          <div className="text-sm font-bold text-stone-800">
                            {child.first_name} {child.last_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 font-medium">
                        {formatTime(record?.check_in_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 font-medium">
                        {formatTime(record?.check_out_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(record)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                        {record?.parent_dropped_off || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                        {record?.parent_picked_up || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-500 max-w-xs truncate">
                        {record?.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {!record && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleCheckIn(child.id)}
                              className="text-[var(--primary-dark)] hover:text-[var(--card-text-4)]"
                              disabled={submittingChildId === child.id}
                            >
                              Check In
                            </button>
                            <button
                              onClick={() => handleMarkAbsent(child.id)}
                              className="text-red-500 hover:text-red-600"
                              disabled={submittingChildId === child.id}
                            >
                              Mark Absent
                            </button>
                          </div>
                        )}
                        {isCheckedIn && (
                          <button
                            onClick={() => handleCheckOut(child.id)}
                            className="text-[var(--primary-dark)] hover:text-[var(--card-text-4)]"
                            disabled={submittingChildId === child.id}
                          >
                            Check Out
                          </button>
                        )}
                        {(isCheckedOut || isAbsent) && (
                          <span className="text-stone-400">Complete</span>
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
              Parent/Guardian Name *
            </label>
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
            />
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
              Notes (Optional)
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
              Parent/Guardian Name *
            </label>
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border themed-border themed-ring bg-white"
            />
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
              Notes (Optional)
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
    </Layout>
  );
}

