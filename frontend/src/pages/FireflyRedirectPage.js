import React, { useEffect, useState } from 'react';
import api from '../utils/api';

export function FireflyRedirectPage() {
  const [error, setError] = useState('');
  const fallbackFireflyUrl = () => {
    if (typeof window === 'undefined') {
      return '/firefly';
    }
    const { hostname, port, protocol } = window.location;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
    if (isLocalHost || port === '3000') {
      return `${protocol}//${hostname}:8080`;
    }
    return '/firefly';
  };
  const envFireflyUrl = process.env.REACT_APP_FIREFLY_URL;
  const fireflyUrl = !envFireflyUrl || envFireflyUrl === '/firefly'
    ? fallbackFireflyUrl()
    : envFireflyUrl;

  useEffect(() => {
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
  }, [fireflyUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8F3] px-6">
      <div className="max-w-md text-center bg-white border border-[#FFE5D9]/60 shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] rounded-3xl p-8">
        <h1 className="font-quicksand font-bold text-2xl text-stone-800 mb-2">
          {error ? 'Unable to Open Firefly' : 'Opening Firefly'}
        </h1>
        <p className="text-sm text-stone-600">
          {error || 'Verifying your session and redirecting...'}
        </p>
      </div>
    </div>
  );
}
