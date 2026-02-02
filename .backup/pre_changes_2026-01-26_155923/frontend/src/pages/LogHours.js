import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { EducatorLayout } from '../components/EducatorLayout';

function LogHours() {
  const [mode, setMode] = useState('manual'); // 'manual' or 'schedule'
  const [acceptedSchedules, setAcceptedSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const [entryDate, setEntryDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [totalHours, setTotalHours] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (mode === 'schedule') {
      loadAcceptedSchedules();
    }
  }, [mode]);

  const loadAcceptedSchedules = async () => {
    try {
      const today = new Date();
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(today.getDate() - 14);

      const params = new URLSearchParams({
        from: twoWeeksAgo.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
        status: 'ACCEPTED',
      });

      const response = await api.get(`/schedules/my-schedules?${params}`);
      setAcceptedSchedules(response.data.schedules);
    } catch (error) {
      console.error('Load schedules error:', error);
    }
  };

  const handleScheduleSelect = (schedule) => {
    setSelectedSchedule(schedule);
    setEntryDate(schedule.shift_date.split('T')[0]);
    setStartTime(schedule.start_time.substring(0, 5));
    setEndTime(schedule.end_time.substring(0, 5));
    setTotalHours(schedule.hours);
    setNotes(schedule.notes || '');
  };

  const calculateHours = () => {
    if (startTime && endTime) {
      const start = new Date(`2000-01-01 ${startTime}`);
      const end = new Date(`2000-01-01 ${endTime}`);
      const diff = (end - start) / (1000 * 60 * 60);
      if (diff > 0) {
        setTotalHours(diff.toFixed(2));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.post('/time-entries', {
        entryDate,
        startTime: startTime || null,
        endTime: endTime || null,
        totalHours: parseFloat(totalHours),
        notes,
      });

      setSuccess('Time entry created successfully!');

      // Reset form
      setEntryDate('');
      setStartTime('');
      setEndTime('');
      setTotalHours('');
      setNotes('');

      setTimeout(() => navigate('/my-hours'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create time entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <EducatorLayout title="Log Hours" subtitle="Submit a new time entry">

      <div className="card mb-2">
        <h2>Choose Logging Method</h2>
        <div className="flex flex-gap">
          <button
            className={mode === 'manual' ? '' : 'secondary'}
            onClick={() => setMode('manual')}
          >
            Manual Entry
          </button>
          <button
            className={mode === 'schedule' ? '' : 'secondary'}
            onClick={() => setMode('schedule')}
          >
            Log from Accepted Schedule
          </button>
        </div>
      </div>

      {mode === 'schedule' && acceptedSchedules.length > 0 && (
        <div className="card mb-2">
          <h2>Select Accepted Shift</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {acceptedSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className={`card ${selectedSchedule?.id === schedule.id ? 'selected-schedule' : ''}`}
                style={{
                  cursor: 'pointer',
                  border: selectedSchedule?.id === schedule.id ? '2px solid #3498db' : '1px solid #ddd',
                  padding: '1rem',
                }}
                onClick={() => handleScheduleSelect(schedule)}
              >
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                  {new Date(schedule.shift_date).toLocaleDateString()}
                </div>
                <div>
                  {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                </div>
                <div style={{ color: '#27ae60', fontWeight: '600' }}>
                  {schedule.hours} hours
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'schedule' && acceptedSchedules.length === 0 && (
        <div className="card mb-2">
          <p>No accepted schedules found from the past 2 weeks. You can switch to manual entry or check your schedule.</p>
        </div>
      )}

      <div className="form-container">
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
              disabled={mode === 'schedule' && !selectedSchedule}
            />
          </div>

          <div className="form-group">
            <label>Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                if (endTime) calculateHours();
              }}
              disabled={mode === 'schedule' && !selectedSchedule}
            />
          </div>

          <div className="form-group">
            <label>End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value);
                if (startTime) calculateHours();
              }}
              onBlur={calculateHours}
              disabled={mode === 'schedule' && !selectedSchedule}
            />
          </div>

          <div className="form-group">
            <label>Total Hours *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={totalHours}
              onChange={(e) => setTotalHours(e.target.value)}
              required
              disabled={mode === 'schedule' && !selectedSchedule}
            />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this time entry"
              disabled={mode === 'schedule' && !selectedSchedule}
            />
          </div>

          <div className="flex flex-gap">
            <button type="submit" disabled={loading || (mode === 'schedule' && !selectedSchedule)}>
              {loading ? 'Saving...' : 'Log Hours'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => navigate('/my-hours')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </EducatorLayout>
  );
}

export default LogHours;
