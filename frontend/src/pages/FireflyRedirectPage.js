import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  DEVELOPER_PASSWORD,
  isDeveloperUnlocked,
  setDeveloperUnlocked,
} from '../utils/developerAccess';

export function FireflyRedirectPage() {
  const [error, setError] = useState('');
  const [developerPassword, setDeveloperPassword] = useState('');
  const [developerUnlocked, setDeveloperUnlockedState] = useState(isDeveloperUnlocked());
  const fallbackFireflyUrl = () => {
    if (typeof window === 'undefined') {
      return '/firefly';
    }
    const { hostname, port, protocol } = window.location;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
    if (isLocalHost || port === '3000') {
      return `${protocol}//${hostname}:8080`;
    }
    if (hostname.endsWith('littlesparrowsacademy.com')) {
      return 'https://firefly.littlesparrowsacademy.com';
    }
    return '/firefly';
  };
  const envFireflyUrl = process.env.REACT_APP_FIREFLY_URL;
  const fireflyUrl = !envFireflyUrl || envFireflyUrl === '/firefly'
    ? fallbackFireflyUrl()
    : envFireflyUrl;

  useEffect(() => {
    if (!developerUnlocked) {
      return;
    }

    let isActive = true;

    const verifyAndRedirect = async () => {
      try {
        const response = await api.get('/auth/me');
        const user = response.data?.user;
        if (!user || user.role !== 'ADMIN') {
          if (isActive) {
            setError('Admin access is required to open Firefly.');
          }
          return;
        }
        window.location.assign(fireflyUrl);
      } catch (err) {
        if (isActive) {
          setError(err.response?.data?.error || 'Failed to validate your session.');
        }
      }
    };

    verifyAndRedirect();

    return () => {
      isActive = false;
    };
  }, [developerUnlocked, fireflyUrl]);

  const handleDeveloperUnlock = async (event) => {
    event.preventDefault();
    if (developerPassword !== DEVELOPER_PASSWORD) {
      setError('Incorrect developer password.');
      return;
    }

    try {
      await api.post('/developer/unlock', { password: developerPassword });
      setDeveloperUnlocked();
      setDeveloperUnlockedState(true);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to unlock developer access.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8F3] px-6">
      <div className="max-w-md w-full bg-white border border-[#FFE5D9]/60 shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] rounded-3xl p-8">
        {!developerUnlocked ? (
          <form onSubmit={handleDeveloperUnlock} className="space-y-4 text-center">
            <h1 className="font-quicksand font-bold text-2xl text-stone-800 mb-2">
              Developer Access Required
            </h1>
            <p className="text-sm text-stone-600">
              Enter the developer password to open Firefly.
            </p>
            <input
              type="password"
              value={developerPassword}
              onChange={(e) => setDeveloperPassword(e.target.value)}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9B85] focus:border-transparent"
              placeholder="Developer password"
            />
            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full px-6 py-3 bg-[#FF9B85] text-white font-bold rounded-xl shadow-md hover:bg-[#E07A5F] transition-colors"
            >
              Unlock Developer Access
            </button>
          </form>
        ) : (
          <div className="text-center">
            <h1 className="font-quicksand font-bold text-2xl text-stone-800 mb-2">
              {error ? 'Unable to Open Firefly' : 'Opening Firefly'}
            </h1>
            <p className="text-sm text-stone-600">
              {error || 'Verifying your session and redirecting...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
