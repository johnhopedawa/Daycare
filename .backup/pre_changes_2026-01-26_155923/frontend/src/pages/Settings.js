import { useState } from 'react';
import api from '../utils/api';

function Settings() {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [attendanceMode, setAttendanceMode] = useState(
    localStorage.getItem('attendanceMode') || 'automatic'
  );
  const [settingsMessage, setSettingsMessage] = useState('');
  const [businessHours, setBusinessHours] = useState({
    openTime: localStorage.getItem('businessOpenTime') || '07:00',
    closeTime: localStorage.getItem('businessCloseTime') || '18:00',
    daysOpen: JSON.parse(localStorage.getItem('businessDaysOpen') || '["Monday","Tuesday","Wednesday","Thursday","Friday"]')
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setMessage('Password changed successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceModeChange = (mode) => {
    setAttendanceMode(mode);
    localStorage.setItem('attendanceMode', mode);
    setSettingsMessage('Attendance mode updated successfully');
    setTimeout(() => setSettingsMessage(''), 3000);
  };

  const handleBusinessHoursChange = (field, value) => {
    const updated = { ...businessHours, [field]: value };
    setBusinessHours(updated);
    localStorage.setItem('businessOpenTime', updated.openTime);
    localStorage.setItem('businessCloseTime', updated.closeTime);
    localStorage.setItem('businessDaysOpen', JSON.stringify(updated.daysOpen));
    setSettingsMessage('Business hours updated successfully');
    setTimeout(() => setSettingsMessage(''), 3000);
  };

  const toggleDay = (day) => {
    const days = businessHours.daysOpen.includes(day)
      ? businessHours.daysOpen.filter(d => d !== day)
      : [...businessHours.daysOpen, day];
    handleBusinessHoursChange('daysOpen', days);
  };

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <main className="main">
      <div className="header">
        <h1>Settings</h1>
      </div>

      <div className="card">
        <h2>Attendance Settings</h2>

        {settingsMessage && (
          <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px' }}>
            {settingsMessage}
          </div>
        )}

        <div className="form-group">
          <label>Attendance Entry Mode</label>
          <div style={{ marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="attendanceMode"
                value="automatic"
                checked={attendanceMode === 'automatic'}
                onChange={(e) => handleAttendanceModeChange(e.target.value)}
                style={{ marginRight: '0.5rem' }}
              />
              <div>
                <strong>Automatic Time Entry</strong>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>
                  Check-in/check-out times are automatically set to the current time
                </div>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="attendanceMode"
                value="manual"
                checked={attendanceMode === 'manual'}
                onChange={(e) => handleAttendanceModeChange(e.target.value)}
                style={{ marginRight: '0.5rem' }}
              />
              <div>
                <strong>Manual Entry</strong>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>
                  Select check-in/check-out times manually (defaults: 7:00 AM - 6:00 PM)
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>Business Hours</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
            <div>
              <label style={{ fontSize: '0.875rem', color: '#666' }}>Opening Time</label>
              <input
                type="time"
                value={businessHours.openTime}
                onChange={(e) => handleBusinessHoursChange('openTime', e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', color: '#666' }}>Closing Time</label>
              <input
                type="time"
                value={businessHours.closeTime}
                onChange={(e) => handleBusinessHoursChange('closeTime', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Days Open</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            {allDays.map((day) => (
              <label
                key={day}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: businessHours.daysOpen.includes(day) ? '#e3f2fd' : '#fff',
                }}
              >
                <input
                  type="checkbox"
                  checked={businessHours.daysOpen.includes(day)}
                  onChange={() => toggleDay(day)}
                  style={{ marginRight: '0.5rem' }}
                />
                {day}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Change Password</h2>

        {message && (
          <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px' }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handlePasswordChange}>
          <div className="form-group">
            <label>Current Password *</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>New Password *</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              required
              minLength="6"
            />
            <small style={{ color: '#666' }}>Must be at least 6 characters</small>
          </div>

          <div className="form-group">
            <label>Confirm New Password *</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              required
              minLength="6"
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default Settings;
