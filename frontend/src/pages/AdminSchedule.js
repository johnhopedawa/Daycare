import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatTime12Hour } from '../utils/timeFormat';

function AdminSchedule() {
  const [educators, setEducators] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEducator, setSelectedEducator] = useState('all');

  const [singleForm, setSingleForm] = useState({
    userId: '',
    shiftDate: '',
    startTime: '09:00',
    endTime: '17:00',
    hours: '8.00',
    notes: '',
  });

  const [recurringForm, setRecurringForm] = useState({
    userId: '',
    dayOfWeek: '1',
    startTime: '09:00',
    endTime: '17:00',
    hours: '8.00',
    startDate: '',
    endDate: '',
    notes: '',
  });

  // Generate time options in 15-minute increments
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

  useEffect(() => {
    loadEducators();
    loadSchedules();
  }, [currentMonth, selectedEducator]);

  const loadEducators = async () => {
    try {
      const response = await api.get('/admin/users?role=EDUCATOR');
      setEducators(response.data.users);
    } catch (error) {
      console.error('Load educators error:', error);
    }
  };

  const loadSchedules = async () => {
    try {
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const params = new URLSearchParams({
        from: firstDay.toISOString().split('T')[0],
        to: lastDay.toISOString().split('T')[0],
      });

      if (selectedEducator !== 'all') {
        params.append('user_id', selectedEducator);
      }

      const response = await api.get(`/schedules/admin/schedules?${params}`);
      setSchedules(response.data.schedules);
    } catch (error) {
      console.error('Load schedules error:', error);
    }
  };

  const handleCreateSingle = async (e) => {
    e.preventDefault();

    if (!singleForm.userId) {
      alert('Please select an educator');
      return;
    }

    try {
      await api.post('/schedules/admin/schedules', singleForm);
      setShowForm(false);
      setSingleForm({ userId: '', shiftDate: '', startTime: '09:00', endTime: '17:00', hours: '8.00', notes: '' });
      loadSchedules();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create schedule');
    }
  };

  const handleCreateRecurring = async (e) => {
    e.preventDefault();

    if (!recurringForm.userId) {
      alert('Please select an educator');
      return;
    }

    try {
      const response = await api.post('/schedules/admin/schedules/recurring', recurringForm);
      alert(`Created ${response.data.count} recurring shifts`);
      setShowRecurringForm(false);
      setRecurringForm({
        userId: '',
        dayOfWeek: '1',
        startTime: '09:00',
        endTime: '17:00',
        hours: '8.00',
        startDate: '',
        endDate: '',
        notes: '',
      });
      loadSchedules();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create recurring schedule');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this shift?')) return;

    try {
      await api.delete(`/schedules/admin/schedules/${id}`);
      loadSchedules();
    } catch (error) {
      alert('Failed to delete schedule');
    }
  };

  const calculateHours = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const hours = (endH + endM / 60) - (startH + startM / 60);
    return hours.toFixed(2);
  };

  const handleSingleTimeChange = (field, value) => {
    const newForm = { ...singleForm, [field]: value };
    if (field === 'startTime' || field === 'endTime') {
      const hours = calculateHours(newForm.startTime, newForm.endTime);
      newForm.hours = hours;
    }
    setSingleForm(newForm);
  };

  const handleRecurringTimeChange = (field, value) => {
    const newForm = { ...recurringForm, [field]: value };
    if (field === 'startTime' || field === 'endTime') {
      const hours = calculateHours(newForm.startTime, newForm.endTime);
      newForm.hours = hours;
    }
    setRecurringForm(newForm);
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getSchedulesForDate = (day) => {
    if (!day) return [];
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter((s) => s.shift_date.startsWith(dateStr));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const getStatusBadge = (status) => {
    return <span className={`badge ${status.toLowerCase()}`}>{status}</span>;
  };

  return (
    <div className="main-content">
      <div className="flex-between mb-2">
        <h1>Manage Schedules</h1>
        <div className="flex" style={{ gap: '1rem' }}>
          <button onClick={() => {
            setShowForm(!showForm);
            if (!showForm) setShowRecurringForm(false);
          }}>
            {showForm ? 'Cancel' : 'Create Single Shift'}
          </button>
          <button onClick={() => {
            setShowRecurringForm(!showRecurringForm);
            if (!showRecurringForm) setShowForm(false);
          }}>
            {showRecurringForm ? 'Cancel' : 'Create Recurring'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card mb-2">
          <h2>Create Single Shift</h2>
          <form onSubmit={handleCreateSingle}>
            <div className="form-group">
              <label>Educator *</label>
              <select
                value={singleForm.userId}
                onChange={(e) => setSingleForm({ ...singleForm, userId: e.target.value })}
                required
              >
                <option value="">Select Educator</option>
                {educators.map((edu) => (
                  <option key={edu.id} value={edu.id}>
                    {edu.first_name} {edu.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={singleForm.shiftDate}
                onChange={(e) => setSingleForm({ ...singleForm, shiftDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Start Time *</label>
              <select
                value={singleForm.startTime}
                onChange={(e) => handleSingleTimeChange('startTime', e.target.value)}
                required
              >
                {timeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>End Time *</label>
              <select
                value={singleForm.endTime}
                onChange={(e) => handleSingleTimeChange('endTime', e.target.value)}
                required
              >
                {timeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Hours *</label>
              <input
                type="number"
                step="0.01"
                value={singleForm.hours}
                onChange={(e) => setSingleForm({ ...singleForm, hours: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={singleForm.notes}
                onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })}
              />
            </div>
            <button type="submit">Create Shift</button>
          </form>
        </div>
      )}

      {showRecurringForm && (
        <div className="card mb-2">
          <h2>Create Recurring Schedule</h2>
          <form onSubmit={handleCreateRecurring}>
            <div className="form-group">
              <label>Educator *</label>
              <select
                value={recurringForm.userId}
                onChange={(e) => setRecurringForm({ ...recurringForm, userId: e.target.value })}
                required
              >
                <option value="">Select Educator</option>
                {educators.map((edu) => (
                  <option key={edu.id} value={edu.id}>
                    {edu.first_name} {edu.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Day of Week *</label>
              <select
                value={recurringForm.dayOfWeek}
                onChange={(e) => setRecurringForm({ ...recurringForm, dayOfWeek: e.target.value })}
                required
              >
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
            </div>
            <div className="form-group">
              <label>Start Time *</label>
              <select
                value={recurringForm.startTime}
                onChange={(e) => handleRecurringTimeChange('startTime', e.target.value)}
                required
              >
                {timeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>End Time *</label>
              <select
                value={recurringForm.endTime}
                onChange={(e) => handleRecurringTimeChange('endTime', e.target.value)}
                required
              >
                {timeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Hours *</label>
              <input
                type="number"
                step="0.01"
                value={recurringForm.hours}
                onChange={(e) => setRecurringForm({ ...recurringForm, hours: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                value={recurringForm.startDate}
                onChange={(e) => setRecurringForm({ ...recurringForm, startDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>End Date (optional, defaults to 3 months)</label>
              <input
                type="date"
                value={recurringForm.endDate}
                onChange={(e) => setRecurringForm({ ...recurringForm, endDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={recurringForm.notes}
                onChange={(e) => setRecurringForm({ ...recurringForm, notes: e.target.value })}
              />
            </div>
            <button type="submit">Create Recurring Schedule</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex-between mb-2">
          <h2>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex" style={{ gap: '1rem', alignItems: 'center' }}>
            <select
              value={selectedEducator}
              onChange={(e) => setSelectedEducator(e.target.value)}
            >
              <option value="all">All Educators</option>
              {educators.map((edu) => (
                <option key={edu.id} value={edu.id}>
                  {edu.first_name} {edu.last_name}
                </option>
              ))}
            </select>
            <button onClick={prevMonth}>&lt; Prev</button>
            <button onClick={nextMonth}>Next &gt;</button>
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

          {getDaysInMonth().map((day, index) => (
            <div key={index} className="calendar-day">
              {day && (
                <>
                  <div className="calendar-day-number">{day}</div>
                  <div className="calendar-shifts">
                    {getSchedulesForDate(day).map((shift) => (
                      <div key={shift.id} className="calendar-shift">
                        <div>
                          <strong>{shift.first_name} {shift.last_name}</strong>
                        </div>
                        <div>
                          {formatTime12Hour(shift.start_time)} - {formatTime12Hour(shift.end_time)} ({shift.hours}h)
                        </div>
                        <div>{getStatusBadge(shift.status)}</div>
                        {shift.status === 'DECLINED' && shift.decline_reason && (
                          <div style={{ fontSize: '0.75rem', color: '#721c24' }}>
                            Reason: {shift.decline_reason}
                          </div>
                        )}
                        <button
                          onClick={() => handleDelete(shift.id)}
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', marginTop: '0.25rem' }}
                          className="danger"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminSchedule;
