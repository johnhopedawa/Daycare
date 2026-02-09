import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

function ParentResetPassword() {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const token = searchParams.get('token');
  const isForcedReset = useMemo(() => !token, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (isForcedReset && !user) {
      setMessage({ type: 'error', text: 'Please sign in to reset your password.' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    try {
      setLoading(true);
      if (isForcedReset) {
        await api.post('/auth/force-reset-password', { newPassword });
        if (user) {
          updateUser({ ...user, must_reset_password: false });
        }
        setMessage({ type: 'success', text: 'Password updated successfully.' });
        setTimeout(() => navigate('/parent/dashboard', { replace: true }), 1200);
      } else {
        await api.post('/auth/parent-reset-password', { token, newPassword });
        setMessage({ type: 'success', text: 'Password reset successfully. You can now log in.' });
        setTimeout(() => navigate('/parents', { replace: true }), 1500);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to reset password.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="parent-portal-shell min-h-screen flex items-center justify-center px-4 py-12"
    >
      <div
        className="parent-card w-full max-w-md rounded-xl border border-gray-100 p-8"
      >
        <h1 className="parent-text text-2xl font-bold mb-2">
          {isForcedReset ? 'Set a New Password' : 'Reset Your Password'}
        </h1>
        <p className="parent-text-muted text-sm mb-6">
          {isForcedReset
            ? 'For security, update your temporary password before continuing.'
            : 'Enter a new password for your parent portal account.'}
        </p>

        {message && (
          <div
            className={`mb-4 px-4 py-3 rounded-xl text-sm border ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="parent-text block text-sm font-semibold mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="parent-input w-full px-4 py-3 rounded-xl themed-ring"
              required
            />
          </div>
          <div>
            <label className="parent-text block text-sm font-semibold mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="parent-input w-full px-4 py-3 rounded-xl themed-ring"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="parent-button-primary w-full px-4 py-3 font-bold rounded-xl shadow-md transition-colors disabled:opacity-60"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default ParentResetPassword;
