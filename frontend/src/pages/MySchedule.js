import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatTime12Hour } from '../utils/timeFormat';

function MySchedule() {
  const [schedules, setSchedules] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineId, setDeclineId] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineType, setDeclineType] = useState('UNPAID');
  const [balances, setBalances] = useState({ sick_days_remaining: 0, vacation_days_remaining: 0 });

  useEffect(() => {
    loadSchedules();
    loadBalances();
  }, [currentMonth]);

  const loadSchedules = async () => {
    try {
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const params = new URLSearchParams({
        from: firstDay.toISOString().split('T')[0],
        to: lastDay.toISOString().split('T')[0],
      });

      const response = await api.get(`/schedules/my-schedules?${params}`);
      setSchedules(response.data.schedules);
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

      // Update balances
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

  const getWeekStart = (day) => {
    if (!day) return null;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dayOfWeek = date.getDay();
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - dayOfWeek);
    return weekStart;
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
        <h1>My Schedule</h1>
        <div className="flex" style={{ gap: '2rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', color: '#666' }}>Sick Days: <strong>{parseFloat(balances.sick_days_remaining || 0).toFixed(1)}</strong></div>
            <div style={{ fontSize: '0.875rem', color: '#666' }}>Vacation Days: <strong>{parseFloat(balances.vacation_days_remaining || 0).toFixed(1)}</strong></div>
          </div>
        </div>
      </div>

      {showDeclineModal && (
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
          <div className="card" style={{ maxWidth: '500px', margin: '1rem' }}>
            <h2>Decline Shift</h2>
            <div className="form-group">
              <label>Decline Type *</label>
              <select
                value={declineType}
                onChange={(e) => setDeclineType(e.target.value)}
              >
                <option value="UNPAID">Unpaid</option>
                <option value="SICK_DAY">Sick Day ({parseFloat(balances.sick_days_remaining || 0).toFixed(1)} remaining)</option>
                <option value="VACATION_DAY">Vacation Day ({parseFloat(balances.vacation_days_remaining || 0).toFixed(1)} remaining)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Reason for declining *</label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Please explain why you cannot work this shift..."
                rows="4"
              />
            </div>
            <div className="flex" style={{ gap: '1rem' }}>
              <button className="danger" onClick={handleDeclineSubmit}>
                Submit Decline
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineId(null);
                  setDeclineReason('');
                  setDeclineType('UNPAID');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex-between mb-2">
          <h2>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex" style={{ gap: '1rem' }}>
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

          {getDaysInMonth().map((day, index) => {
            const shiftsForDay = getSchedulesForDate(day);

            return (
              <div key={index} className="calendar-day">
                {day && (
                  <>
                    <div className="calendar-day-number">{day}</div>
                    <div className="calendar-shifts">
                      {shiftsForDay.map((shift) => (
                        <div key={shift.id} className={`calendar-shift ${shift.status.toLowerCase()}`}>
                          <div>
                            {formatTime12Hour(shift.start_time)} - {formatTime12Hour(shift.end_time)}
                          </div>
                          <div style={{ fontWeight: '600' }}>{shift.hours} hours</div>
                          <div>{getStatusBadge(shift.status)}</div>
                          {shift.notes && (
                            <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', fontStyle: 'italic' }}>
                              {shift.notes}
                            </div>
                          )}
                          {shift.status === 'ACCEPTED' && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <button
                                onClick={() => handleDeclineClick(shift.id)}
                                className="danger"
                                style={{ fontSize: '0.7rem', padding: '0.5rem 0.75rem', width: '100%' }}
                              >
                                Decline Shift
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card mt-2">
        <h2>Legend</h2>
        <div className="flex" style={{ gap: '2rem', flexWrap: 'wrap' }}>
          <div className="flex" style={{ gap: '0.5rem', alignItems: 'center' }}>
            <span className="badge pending">PENDING</span>
            <span>Awaiting your response</span>
          </div>
          <div className="flex" style={{ gap: '0.5rem', alignItems: 'center' }}>
            <span className="badge accepted">ACCEPTED</span>
            <span>You confirmed this shift</span>
          </div>
          <div className="flex" style={{ gap: '0.5rem', alignItems: 'center' }}>
            <span className="badge declined">DECLINED</span>
            <span>You declined this shift</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MySchedule;
