import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Baby } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { fetchPublicTheme } from '../utils/themeLoader';

function PortalLanding() {
  const { setTheme } = useTheme();
  const hasLoadedThemeRef = useRef(false);

  useEffect(() => {
    if (hasLoadedThemeRef.current) {
      return undefined;
    }
    hasLoadedThemeRef.current = true;
    let cancelled = false;
    const loadStaffTheme = async () => {
      try {
        const theme = await fetchPublicTheme('staff');
        if (!cancelled && theme) {
          setTheme(theme);
        }
      } catch (error) {
        // Keep current theme if public theme lookup fails.
      }
    };

    loadStaffTheme();
    return () => {
      cancelled = true;
    };
  }, [setTheme]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--background)', color: 'var(--text)' }}
    >
      <div
        className="w-full max-w-xl rounded-[32px] border themed-border p-10"
        style={{
          backgroundColor: 'var(--surface)',
          boxShadow: 'var(--panel-shadow)',
        }}
      >
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--on-primary)',
              boxShadow: '0 10px 24px -14px rgba(var(--primary-rgb), 0.7)',
            }}
          >
            <Baby size={28} />
          </div>
          <div>
            <h1 className="font-quicksand text-2xl sm:text-3xl font-bold whitespace-nowrap" style={{ color: 'var(--text)' }}>
              Little Sparrows Academy
            </h1>
            <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Choose your portal to continue.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            to="/staff"
            className="group rounded-2xl border themed-border themed-hover p-5 text-left transition"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <p className="text-xs uppercase tracking-[0.2em] font-semibold" style={{ color: 'var(--muted)' }}>Staff</p>
            <h2 className="text-xl font-bold mt-2" style={{ color: 'var(--text)' }}>
              Staff Portal
            </h2>
            <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>Admin and educator access.</p>
          </Link>

          <Link
            to="/parents"
            className="group rounded-2xl border themed-border themed-hover p-5 text-left transition"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <p className="text-xs uppercase tracking-[0.2em] font-semibold" style={{ color: 'var(--muted)' }}>Families</p>
            <h2 className="text-xl font-bold mt-2" style={{ color: 'var(--text)' }}>
              Parent Portal
            </h2>
            <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>Invoices, messages, and updates.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PortalLanding;
