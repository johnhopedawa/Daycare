import { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatTime12Hour } from '../utils/timeFormat';

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

function AdminAttendance() {
  const [children, setChildren] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendanceMode, setAttendanceMode] = useState(() => {
    return localStorage.getItem('attendanceMode') || 'automatic';
  });
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [manualTime, setManualTime] = useState('07:00');
  const [parentName, setParentName] = useState('');
  const [error, setError] = useState(null);
  const [submittingChildId, setSubmittingChildId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());
  const [pendingDate, setPendingDate] = useState(new Date());
  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [absentStatus, setAbsentStatus] = useState('ABSENT');
  const [absentNotes, setAbsentNotes] = useState('');
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');

  // Generate time options in 15-minute increments (reuse from AdminSchedule pattern)
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

  // Format date as YYYY-MM-DD for API calls
  const formatDateForAPI = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Navigate to previous day
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  // Navigate to next day
  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  // Go to today
  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Check if selected date is today
  const isToday = () => {
    const today = new Date();
    return formatDateForAPI(selectedDate) === formatDateForAPI(today);
  };

  const openDatePicker = () => {
    const current = new Date(selectedDate);
    setPendingDate(current);
    setDatePickerMonth(new Date(current.getFullYear(), current.getMonth(), 1));
    setShowDatePicker(true);
  };

  const goToPreviousMonthPicker = () => {
    setDatePickerMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonthPicker = () => {
    setDatePickerMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleApplyDateSelection = () => {
    setSelectedDate(new Date(pendingDate));
    setShowDatePicker(false);
  };

  const handleCancelDateSelection = () => {
    setShowDatePicker(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setError(null);
      const dateStr = formatDateForAPI(selectedDate);

      const [childrenRes, attendanceRes] = await Promise.all([
        api.get('/children'),
        api.get(`/attendance?start_date=${dateStr}&end_date=${dateStr}`)
      ]);

      setChildren(childrenRes.data.children.filter(c => c.status === 'ACTIVE'));
      setTodayAttendance(attendanceRes.data.attendance);
    } catch (error) {
      console.error('Load data error:', error);
      setError('Failed to load attendance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (childId) => {
    setSelectedChild(childId);
    setParentName('');
    setCheckInNotes('');
    if (attendanceMode === 'manual') {
      setManualTime('07:00');
    }
    setShowCheckInModal(true);
  };

  const handleCheckOut = async (childId) => {
    setSelectedChild(childId);
    setParentName('');
    setCheckOutNotes('');
    if (attendanceMode === 'manual') {
      setManualTime('18:00');
    }
    setShowCheckOutModal(true);
  };

  const handleManualCheckIn = async () => {
    if (!parentName.trim()) {
      alert('Please enter parent/guardian name');
      return;
    }

    try {
      setSubmittingChildId(selectedChild);
      setError(null);

      const payload = {
        child_id: selectedChild,
        parent_name: parentName,
        attendance_date: formatDateForAPI(selectedDate),
        notes: checkInNotes || null,
      };

      if (attendanceMode === 'manual') {
        payload.check_in_time = `${manualTime}:00`;
      }

      await api.post('/attendance/check-in', payload);
      setShowCheckInModal(false);
      loadData();
    } catch (error) {
      console.error('Check-in error:', error);
      alert('Failed to check in');
      setError('Failed to update attendance. Please try again.');
    } finally {
      setSubmittingChildId(null);
    }
  };

  const handleManualCheckOut = async () => {
    if (!parentName.trim()) {
      alert('Please enter parent/guardian name');
      return;
    }

    try {
      setSubmittingChildId(selectedChild);
      setError(null);

      const payload = {
        child_id: selectedChild,
        parent_name: parentName,
        attendance_date: formatDateForAPI(selectedDate),
        notes: checkOutNotes || null,
      };

      if (attendanceMode === 'manual') {
        payload.check_out_time = `${manualTime}:00`;
      }

      await api.post('/attendance/check-out', payload);
      setShowCheckOutModal(false);
      loadData();
    } catch (error) {
      console.error('Check-out error:', error);
      alert('Failed to check out');
      setError('Failed to update attendance. Please try again.');
    } finally {
      setSubmittingChildId(null);
    }
  };

  const getAttendanceStatus = (childId) => {
    return todayAttendance.find(a => a.child_id === childId);
  };

  const handleMarkAbsent = (childId) => {
    setSelectedChild(childId);
    setAbsentStatus('ABSENT');
    setAbsentNotes('');
    setShowAbsentModal(true);
  };

  const handleSubmitAbsent = async () => {
    try {
      setSubmittingChildId(selectedChild);
      setError(null);

      await api.post('/attendance/mark-absent', {
        child_id: selectedChild,
        attendance_date: formatDateForAPI(selectedDate),
        status: absentStatus,
        notes: absentNotes
      });

      setShowAbsentModal(false);
      loadData();
    } catch (error) {
      console.error('Mark absent error:', error);
      alert('Failed to mark absence');
      setError('Failed to update attendance. Please try again.');
    } finally {
      setSubmittingChildId(null);
    }
  };

  if (loading) return <main className="main"><div className="loading">Loading...</div></main>;

  return (
    <main className="main">
      <div className="header">
        <h1>Daily Attendance</h1>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>
            {selectedDate.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
            {isToday() && <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#666' }}>(Today)</span>}
          </h2>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={goToPreviousDay}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: '#fff',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                minWidth: '85px'
              }}
              title="Previous day"
            >
              Prev Day
            </button>

            <button
              onClick={goToToday}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: isToday() ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                minWidth: '85px'
              }}
              disabled={isToday()}
            >
              Today
            </button>

            <button
              onClick={goToNextDay}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: '#fff',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                minWidth: '85px'
              }}
              title="Next day"
            >
              Next Day
            </button>

            <button
              onClick={openDatePicker}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                marginLeft: '0.5rem'
              }}
            >
              Choose Date
            </button>
          </div>
        </div>

        {showDatePicker && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
            }}
          >
            <div className="card" style={{ width: 'min(420px, 95vw)', padding: '1.5rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Select Date</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <button type="button" className="btn-sm secondary" style={{ padding: '0.35rem 0.75rem' }} onClick={goToPreviousMonthPicker}>
                  ‹
                </button>
                <span style={{ fontWeight: 600, fontSize: '1rem', color: '#1f2937' }}>
                  {datePickerMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button type="button" className="btn-sm secondary" style={{ padding: '0.35rem 0.75rem' }} onClick={goToNextMonthPicker}>
                  ›
                </button>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: '0.35rem',
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#6b7280',
                  marginBottom: '0.35rem',
                }}
              >
                {weekdayLabels.map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: '0.35rem',
                }}
              >
                {getCalendarGrid(datePickerMonth).map((day, idx) => {
                  if (!day) {
                    return <div key={`empty-${idx}`} />;
                  }
                  const dayKey = formatDateForAPI(day);
                  const selectedKey = formatDateForAPI(pendingDate);
                  const todayKey = formatDateForAPI(new Date());
                  const isSelected = dayKey === selectedKey;
                  const isTodayDay = dayKey === todayKey;

                  return (
                    <button
                      type="button"
                      key={dayKey}
                      onClick={() => setPendingDate(new Date(day))}
                      style={{
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #2d6cdf' : '1px solid #e5e7eb',
                        background: isSelected ? '#edf2ff' : '#fff',
                        color: '#1f2937',
                        fontWeight: isTodayDay ? 700 : 500,
                        padding: '0.5rem 0',
                        minHeight: '2.5rem',
                        boxShadow: isSelected ? '0 1px 4px rgba(45,108,223,0.25)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
              <div className="flex" style={{ gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="button" className="secondary" onClick={handleCancelDateSelection}>
                  Cancel
                </button>
                <button type="button" onClick={handleApplyDateSelection}>
                  Apply Date
                </button>
              </div>
            </div>
          </div>
        )}


        <table>
          <thead>
            <tr>
              <th>Child Name</th>
              <th>Status</th>
              <th>Check-In Time</th>
              <th>Dropped Off By</th>
              <th>Check-Out Time</th>
              <th>Picked Up By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {children.map((child) => {
              const attendance = getAttendanceStatus(child.id);
              const isCheckedIn = attendance && attendance.check_in_time && !attendance.check_out_time;
              const isCheckedOut = attendance && attendance.check_out_time;
              const isAbsent = attendance && !attendance.check_in_time && attendance.status && ['ABSENT', 'SICK', 'VACATION'].includes(attendance.status);

              // Helper to get status badge
              const renderStatusBadge = () => {
                if (!attendance) {
                  return <span className="badge" style={{ backgroundColor: '#999', color: 'white' }}>Not Recorded</span>;
                }
                if (isCheckedIn) {
                  return <span className="badge badge-approved">Present</span>;
                }
                if (isCheckedOut) {
                  return <span className="badge badge-sent">Checked Out</span>;
                }
                if (attendance.status === 'ABSENT') {
                  return <span className="badge" style={{ backgroundColor: '#dc3545', color: 'white' }}>Absent</span>;
                }
                if (attendance.status === 'SICK') {
                  return <span className="badge" style={{ backgroundColor: '#ff9800', color: 'white' }}>Sick</span>;
                }
                if (attendance.status === 'VACATION') {
                  return <span className="badge" style={{ backgroundColor: '#9c27b0', color: 'white' }}>Vacation</span>;
                }
                return <span className="badge badge-draft">Unknown</span>;
              };

              return (
                <tr key={child.id}>
                  <td>{child.first_name} {child.last_name}</td>
                  <td>{renderStatusBadge()}</td>
                  <td>{formatTime12Hour(attendance?.check_in_time)}</td>
                  <td>{attendance?.parent_dropped_off || '-'}</td>
                  <td>{formatTime12Hour(attendance?.check_out_time)}</td>
                  <td>{attendance?.parent_picked_up || '-'}</td>
                  <td>
                    {!attendance && (
                      <>
                        <button
                          onClick={() => handleCheckIn(child.id)}
                          className="btn-sm"
                          style={{ marginRight: '0.5rem', fontSize: '0.875rem', padding: '0.4rem 0.75rem' }}
                          disabled={submittingChildId === child.id}
                        >
                          Check In
                        </button>
                        <button
                          onClick={() => handleMarkAbsent(child.id)}
                          style={{
                            fontSize: '0.875rem',
                            padding: '0.4rem 0.75rem',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          disabled={submittingChildId === child.id}
                        >
                          Mark Absent
                        </button>
                      </>
                    )}
                    {isCheckedIn && (
                      <button
                        onClick={() => handleCheckOut(child.id)}
                        className="btn-sm secondary"
                        style={{ fontSize: '0.875rem', padding: '0.4rem 0.75rem' }}
                        disabled={submittingChildId === child.id}
                      >
                        Check Out
                      </button>
                    )}
                    {(isCheckedOut || isAbsent) && (
                      <span style={{ color: '#666', fontSize: '0.875rem' }}>Complete</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Summary</h2>
        <div className="card-grid">
          <div className="card">
            <h3>Total Enrolled</h3>
            <p style={{ fontSize: '2rem', margin: '1rem 0' }}>
              {children.length}
            </p>
          </div>
          <div className="card">
            <h3>Present</h3>
            <p style={{ fontSize: '2rem', margin: '1rem 0', color: '#27ae60' }}>
              {todayAttendance.filter(a => a.check_in_time && !a.check_out_time).length}
            </p>
          </div>
          <div className="card">
            <h3>Checked Out</h3>
            <p style={{ fontSize: '2rem', margin: '1rem 0', color: '#3498db' }}>
              {todayAttendance.filter(a => a.check_out_time).length}
            </p>
          </div>
          <div className="card">
            <h3>Absent/Sick</h3>
            <p style={{ fontSize: '2rem', margin: '1rem 0', color: '#e67e22' }}>
              {todayAttendance.filter(a => a.status && ['ABSENT', 'SICK', 'VACATION'].includes(a.status)).length}
            </p>
          </div>
          <div className="card">
            <h3>Not Recorded</h3>
            <p style={{ fontSize: '2rem', margin: '1rem 0', color: '#999' }}>
              {children.length - todayAttendance.length}
            </p>
          </div>
        </div>
      </div>

      {/* Manual Check-In Modal */}
      {showCheckInModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ maxWidth: '600px', margin: '1rem', width: '100%' }}>
            <h2>Check In</h2>
            <div className="form-group">
              <label>Parent/Guardian Name *</label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Enter parent or guardian name"
              />
            </div>
            {attendanceMode === 'manual' ? (
              <div className="form-group">
                <label>Check-In Time *</label>
                <select value={manualTime} onChange={(e) => setManualTime(e.target.value)}>
                  {timeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ padding: '0.75rem', background: '#f5f5f5', borderRadius: '4px', marginBottom: '1rem' }}>
                <strong>Check-In Time: </strong>
                <span>{new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
              </div>
            )}

            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                placeholder="Add any additional notes (e.g., late drop-off, special instructions)..."
                rows="3"
              />
            </div>

            <div className="flex" style={{ gap: '1rem' }}>
              <button onClick={handleManualCheckIn}>
                Check In
              </button>
              <button
                className="secondary"
                onClick={() => setShowCheckInModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Check-Out Modal */}
      {showCheckOutModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ maxWidth: '600px', margin: '1rem', width: '100%' }}>
            <h2>Check Out</h2>
            <div className="form-group">
              <label>Parent/Guardian Name *</label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Enter parent or guardian name"
              />
            </div>
            {attendanceMode === 'manual' ? (
              <div className="form-group">
                <label>Check-Out Time *</label>
                <select value={manualTime} onChange={(e) => setManualTime(e.target.value)}>
                  {timeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ padding: '0.75rem', background: '#f5f5f5', borderRadius: '4px', marginBottom: '1rem' }}>
                <strong>Check-Out Time: </strong>
                <span>{new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
              </div>
            )}

            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea
                value={checkOutNotes}
                onChange={(e) => setCheckOutNotes(e.target.value)}
                placeholder="Add any additional notes (e.g., picked up early, alternate pickup)..."
                rows="3"
              />
            </div>

            <div className="flex" style={{ gap: '1rem' }}>
              <button onClick={handleManualCheckOut}>
                Check Out
              </button>
              <button
                className="secondary"
                onClick={() => setShowCheckOutModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Absent Modal */}
      {showAbsentModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ maxWidth: '600px', margin: '1rem', width: '100%' }}>
            <h2>Mark Absence</h2>
            <div className="form-group">
              <label>Absence Type *</label>
              <select
                value={absentStatus}
                onChange={(e) => setAbsentStatus(e.target.value)}
                style={{ fontSize: '0.875rem' }}
              >
                <option value="ABSENT">Absent (No Reason)</option>
                <option value="SICK">Sick</option>
                <option value="VACATION">Vacation/Holiday</option>
              </select>
            </div>
            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea
                value={absentNotes}
                onChange={(e) => setAbsentNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows="3"
              />
            </div>
            <div className="flex" style={{ gap: '1rem' }}>
              <button onClick={handleSubmitAbsent}>
                Submit
              </button>
              <button
                className="secondary"
                onClick={() => setShowAbsentModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminAttendance;
