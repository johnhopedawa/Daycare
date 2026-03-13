import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Settings, ShieldCheck, Smartphone, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api, { clearApiBaseUrlOverride, getApiBaseUrl, getApiHealthUrl, setApiBaseUrl } from '../utils/api';
import ParentResetPassword from '../pages/ParentResetPassword';
import { getRoleHomePath, getRoleSettingsLabel, roleTabConfig } from './mobileConfig';
import {
  MobileAdminEventsScreen,
  MobileAdminMessagesScreen,
  MobileAdminMoreScreen,
  MobileAdminTodayScreen,
} from './MobileAdminScreens';
import {
  MobileEducatorAttendanceScreen,
  MobileEducatorCareScreen,
  MobileEducatorHomeScreen,
  MobileEducatorMessagesScreen,
  MobileEducatorScheduleScreen,
} from './MobileEducatorScreens';
import { MobileAttendanceScreen } from './MobileAttendanceScreen';
import {
  MobileParentBillingScreen,
  MobileParentChildScreen,
  MobileParentEventsScreen,
  MobileParentHomeScreen,
  MobileParentMessagesScreen,
} from './MobileParentScreens';

const MOBILE_LOGIN_KEY = 'mobile-app-saved-login';
const MOBILE_NOTIFICATION_PREFS_KEY = 'mobileNotificationPrefs';

const getConnectionStatusMeta = (status) => {
  if (status === 'connected') {
    return {
      badgeClassName: 'bg-emerald-100 text-emerald-700',
      label: 'Connected',
    };
  }

  if (status === 'error') {
    return {
      badgeClassName: 'bg-rose-100 text-rose-700',
      label: 'Offline',
    };
  }

  if (status === 'loading') {
    return {
      badgeClassName: 'bg-amber-100 text-amber-700',
      label: 'Checking',
    };
  }

  return {
    badgeClassName: 'bg-stone-100 text-stone-600',
    label: 'Unknown',
  };
};

const buildConnectionErrorMessage = (testedUrl) => {
  return `Cannot reach ${testedUrl}. Emulator uses http://10.0.2.2:5000/api. A physical Samsung phone needs your computer LAN IP instead of 10.0.2.2.`;
};

const checkBackendConnection = async (targetUrl) => {
  const nextUrl = (targetUrl || '').trim() || getApiBaseUrl();

  try {
    const response = await fetch(getApiHealthUrl(nextUrl));
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const payload = await response.json().catch(() => null);
    return {
      status: 'connected',
      message: payload?.status === 'ok' ? 'Backend is reachable.' : 'Backend responded successfully.',
      checkedUrl: nextUrl,
    };
  } catch (error) {
    return {
      status: 'error',
      message: buildConnectionErrorMessage(nextUrl),
      checkedUrl: nextUrl,
    };
  }
};

function MobileApiConnectionCard() {
  const [apiBaseUrl, setApiBaseUrlState] = useState(() => getApiBaseUrl());
  const [connectionState, setConnectionState] = useState({
    status: 'idle',
    message: '',
    checkedUrl: getApiBaseUrl(),
  });

  const runConnectionCheck = async (targetUrl = apiBaseUrl) => {
    const nextUrl = (targetUrl || '').trim() || getApiBaseUrl();
    setConnectionState({
      status: 'loading',
      message: 'Checking backend connection...',
      checkedUrl: nextUrl,
    });

    const nextState = await checkBackendConnection(nextUrl);
    setConnectionState(nextState);
  };

  useEffect(() => {
    const initialUrl = getApiBaseUrl();
    setApiBaseUrlState(initialUrl);
    setConnectionState({
      status: 'loading',
      message: 'Checking backend connection...',
      checkedUrl: initialUrl,
    });

    let cancelled = false;
    checkBackendConnection(initialUrl).then((nextState) => {
      if (!cancelled) {
        setConnectionState(nextState);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveApiUrl = async () => {
    const nextBaseUrl = setApiBaseUrl(apiBaseUrl);
    setApiBaseUrlState(nextBaseUrl);
    await runConnectionCheck(nextBaseUrl);
  };

  const handleResetApiUrl = async () => {
    const defaultBaseUrl = clearApiBaseUrlOverride();
    setApiBaseUrlState(defaultBaseUrl);
    await runConnectionCheck(defaultBaseUrl);
  };

  const statusMeta = getConnectionStatusMeta(connectionState.status);

  return (
    <section className="rounded-[28px] bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Connection</p>
          <p className="mt-1 text-sm font-semibold text-stone-900">API endpoint</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusMeta.badgeClassName}`}>
          {statusMeta.label}
        </span>
      </div>

      <p className="mt-3 break-all rounded-[20px] bg-stone-50 px-4 py-3 font-mono text-xs text-stone-600">
        {connectionState.checkedUrl}
      </p>

      <div className="mt-3 grid gap-3">
        <input
          type="text"
          value={apiBaseUrl}
          onChange={(event) => setApiBaseUrlState(event.target.value)}
          placeholder="http://10.0.2.2:5000/api"
          className="w-full rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]"
        />
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => runConnectionCheck(apiBaseUrl)}
            className="rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600"
          >
            Test URL
          </button>
          <button
            type="button"
            onClick={handleSaveApiUrl}
            className="rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white"
          >
            Save URL
          </button>
          <button
            type="button"
            onClick={handleResetApiUrl}
            className="rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600"
          >
            Use Default
          </button>
        </div>
      </div>

      <p className={`mt-3 text-xs leading-5 ${connectionState.status === 'error' ? 'text-rose-600' : 'text-stone-500'}`}>
        {connectionState.message}
      </p>
      <p className="mt-2 text-xs leading-5 text-stone-500">
        Emulator: <span className="font-mono">http://10.0.2.2:5000/api</span>. Physical Samsung phone:
        {' '}
        <span className="font-mono">http://YOUR-COMPUTER-LAN-IP:5000/api</span>.
      </p>
    </section>
  );
}

function MobileShell({ children, role }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tabs = roleTabConfig[role] || [];

  return (
    <div className={`mobile-app-shell ${role === 'PARENT' ? 'mobile-app-shell--parent' : 'mobile-app-shell--staff'} min-h-screen`}>
      <header className="mobile-app-header sticky top-0 z-30 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.9rem)]">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              {role === 'PARENT' ? 'Family App' : role === 'EDUCATOR' ? 'Educator App' : 'Admin App'}
            </p>
            <h1 className="font-quicksand text-xl font-bold text-stone-900">Little Sparrows Academy</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm"
            aria-label="Open settings"
          >
            <Settings size={18} />
          </button>
        </div>
        <div className="mx-auto mt-3 max-w-md rounded-full bg-white/90 px-3 py-2 text-xs text-stone-500 shadow-sm">
          Signed in as <span className="font-semibold text-stone-800">{user?.first_name || 'User'}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] pt-2">
        {children}
      </main>

      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3">
        <div className="mx-auto grid max-w-md grid-cols-5 rounded-[30px] bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => navigate(tab.path)}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[22px] px-2 py-2 text-[11px] font-semibold transition-all ${isActive ? 'text-stone-900' : 'text-stone-400'}`}
                style={isActive ? {
                  backgroundColor: role === 'PARENT' ? 'var(--parent-soft-bg)' : 'var(--background)',
                  color: role === 'PARENT' ? 'var(--parent-button-bg)' : 'var(--primary-dark)',
                } : undefined}
              >
                <tab.icon size={18} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function MobileAuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, login } = useAuth();

  useEffect(() => {
    if (user) {
      navigate(getRoleHomePath(user), { replace: true });
    }
  }, [navigate, user]);

  useEffect(() => {
    try {
      const rawSavedCredentials = localStorage.getItem(MOBILE_LOGIN_KEY);
      if (!rawSavedCredentials) return;
      const parsedCredentials = JSON.parse(rawSavedCredentials);
      if (parsedCredentials?.email && parsedCredentials?.password) {
        setEmail(parsedCredentials.email);
        setPassword(parsedCredentials.password);
        setStayLoggedIn(true);
      }
    } catch (error) {
      localStorage.removeItem(MOBILE_LOGIN_KEY);
    }
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim();
      const nextUser = await login(normalizedEmail, password);
      if (stayLoggedIn) {
        localStorage.setItem(MOBILE_LOGIN_KEY, JSON.stringify({ email: normalizedEmail, password }));
      } else {
        localStorage.removeItem(MOBILE_LOGIN_KEY);
      }
      navigate(getRoleHomePath(nextUser), { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-auth-shell min-h-screen px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 shadow-sm">
            <Smartphone size={14} />
            Unified Mobile App
          </div>
          <h1 className="mt-5 font-quicksand text-4xl font-bold text-stone-900">Little Sparrows Academy</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-stone-600">
            One app for Admin, Educator, and Parent roles. Sign in once and we&apos;ll take you to the correct mobile workspace.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-semibold text-[var(--primary-dark)]">Admin</span>
            <span className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-semibold text-[var(--primary-dark)]">Educator</span>
            <span className="rounded-full bg-[var(--parent-soft-bg)] px-3 py-1 text-xs font-semibold text-[var(--parent-button-bg)]">Parent</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 rounded-[32px] bg-white p-5 shadow-[0_18px_52px_rgba(15,23,42,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Sign In</p>
          <div className="mt-4 grid gap-3">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              autoComplete="username"
              className="w-full rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="w-full rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]"
              required
            />
            <label className="inline-flex items-center gap-2 text-sm text-stone-500">
              <input
                type="checkbox"
                checked={stayLoggedIn}
                onChange={(event) => setStayLoggedIn(event.target.checked)}
                style={{ accentColor: 'var(--primary)' }}
              />
              Stay logged in
            </label>

            {error ? (
              <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(224,122,95,0.28)] disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Continue'}
            </button>
          </div>
        </form>

        <div className="mt-4">
          <MobileApiConnectionCard />
        </div>
      </div>
    </div>
  );
}

function MobileSettingsPage() {
  const { user, logout } = useAuth();
  const { density, setDensity } = useTheme();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordState, setPasswordState] = useState({ error: '', success: '', saving: false });
  const [notificationPrefs, setNotificationPrefs] = useState(() => {
    try {
      const rawValue = localStorage.getItem(MOBILE_NOTIFICATION_PREFS_KEY);
      if (!rawValue) {
        return {
          pushUpdates: true,
          messageAlerts: true,
          billingReminders: true,
        };
      }
      return JSON.parse(rawValue);
    } catch (error) {
      return {
        pushUpdates: true,
        messageAlerts: true,
        billingReminders: true,
      };
    }
  });

  useEffect(() => {
    localStorage.setItem(MOBILE_NOTIFICATION_PREFS_KEY, JSON.stringify(notificationPrefs));
  }, [notificationPrefs]);

  const handlePasswordSave = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordState({ error: 'New passwords do not match.', success: '', saving: false });
      return;
    }

    try {
      setPasswordState({ error: '', success: '', saving: true });
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordState({ error: '', success: 'Password updated successfully.', saving: false });
    } catch (error) {
      setPasswordState({
        error: error.response?.data?.message || error.response?.data?.error || 'Failed to update password.',
        success: '',
        saving: false,
      });
    }
  };

  return (
    <MobileShell role={user?.role}>
      <div className="space-y-4">
        <section className="rounded-[28px] bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{getRoleSettingsLabel(user?.role)}</p>
          <h1 className="mt-1 font-quicksand text-3xl font-bold text-stone-900">Settings</h1>
          <p className="mt-1 text-sm text-stone-600">Profile visibility, password, notifications, and display preferences.</p>
        </section>

        <section className="rounded-[28px] bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-[var(--background)] text-[var(--primary-dark)]">
              <UserRound size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-stone-500">{user?.email}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-[22px] bg-stone-50 px-4 py-3 text-sm text-stone-600">
              Full name, email, and role are shown here for quick reference in mobile. Profile editing remains a web-heavy workflow for now.
            </div>
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--primary-dark)]" />
            <h2 className="font-quicksand text-xl font-bold text-stone-900">Security</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" placeholder="Current password" className="w-full rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]" />
            <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" placeholder="New password" className="w-full rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]" />
            <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" placeholder="Confirm new password" className="w-full rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none focus:border-[var(--primary)]" />
            {passwordState.error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{passwordState.error}</div> : null}
            {passwordState.success ? <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{passwordState.success}</div> : null}
            <div className="rounded-[20px] bg-stone-50 px-4 py-3 text-xs text-stone-500">
              Two-factor authentication is not included here because backend support is not implemented yet.
            </div>
            <button type="button" onClick={handlePasswordSave} disabled={passwordState.saving} className="rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {passwordState.saving ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-[var(--primary-dark)]" />
            <h2 className="font-quicksand text-xl font-bold text-stone-900">Notifications</h2>
          </div>
          <div className="mt-4 space-y-3">
            {[
              ['pushUpdates', 'Push updates'],
              ['messageAlerts', 'Message alerts'],
              ['billingReminders', 'Billing reminders'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-[22px] bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(notificationPrefs[key])}
                  onChange={(event) => setNotificationPrefs((prev) => ({ ...prev, [key]: event.target.checked }))}
                  style={{ accentColor: 'var(--primary)' }}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
          <h2 className="font-quicksand text-xl font-bold text-stone-900">Display</h2>
          <div className="mt-4 inline-flex overflow-hidden rounded-full border border-stone-200">
            <button
              type="button"
              onClick={() => setDensity('comfortable')}
              className={`px-4 py-2 text-sm font-semibold ${density === 'comfortable' ? 'text-white' : 'text-stone-600'}`}
              style={density === 'comfortable' ? { backgroundColor: 'var(--primary)' } : undefined}
            >
              Comfortable
            </button>
            <button
              type="button"
              onClick={() => setDensity('compact')}
              className={`px-4 py-2 text-sm font-semibold ${density === 'compact' ? 'text-white' : 'text-stone-600'}`}
              style={density === 'compact' ? { backgroundColor: 'var(--primary)' } : undefined}
            >
              Compact
            </button>
          </div>
        </section>

        <MobileApiConnectionCard />

        <section className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate(getRoleHomePath(user), { replace: true })}
            className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-600 shadow-[0_12px_34px_rgba(15,23,42,0.08)]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(239,68,68,0.25)]"
          >
            <LogOut size={16} />
            Switch Account
          </button>
        </section>
      </div>
    </MobileShell>
  );
}

function MobileRequireAuth({ children, roles }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === 'PARENT' && user.must_reset_password) {
    return <Navigate to="/reset-password" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getRoleHomePath(user)} replace />;
  }
  return children;
}

function MobileRoleRedirect() {
  const { user } = useAuth();
  return <Navigate to={getRoleHomePath(user)} replace />;
}

function LegacyRedirect() {
  const { user } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const adminMap = {
    '/today': '/admin/today',
    '/dashboard': '/admin/today',
    '/attendance': '/admin/attendance',
    '/events': '/admin/events',
    '/finance': '/admin/messages',
    '/newsletters': '/admin/more',
  };

  const educatorMap = {
    '/educator/dashboard': '/educator/home',
    '/educator/attendance': '/educator/attendance',
    '/educator/messages': '/educator/messages',
    '/educator/my-schedule': '/educator/schedule',
    '/educator/my-hours': '/educator/schedule',
    '/educator/my-paystubs': '/educator/schedule',
    '/attendance': '/educator/attendance',
  };

  const parentMap = {
    '/parent/dashboard': '/parent/home',
    '/parent/children': '/parent/child',
    '/parent/messages': '/parent/messages',
    '/parent/invoices': '/parent/billing',
    '/parent/events': '/parent/events',
  };

  const nextPath = user.role === 'ADMIN'
    ? adminMap[path]
    : user.role === 'EDUCATOR'
      ? educatorMap[path]
      : parentMap[path];

  return <Navigate to={nextPath || getRoleHomePath(user)} replace />;
}

function MobileRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <MobileRoleRedirect /> : <Navigate to="/login" replace />} />
      <Route path="/login" element={<MobileAuthPage />} />
      <Route path="/staff" element={<Navigate to="/login" replace />} />
      <Route path="/parents" element={<Navigate to="/login" replace />} />
      <Route path="/reset-password" element={<ParentResetPassword />} />

      <Route
        path="/admin/today"
        element={(
          <MobileRequireAuth roles={['ADMIN']}>
            <MobileShell role="ADMIN">
              <MobileAdminTodayScreen />
            </MobileShell>
          </MobileRequireAuth>
        )}
      />
      <Route
        path="/admin/attendance"
        element={(
          <MobileRequireAuth roles={['ADMIN']}>
            <MobileShell role="ADMIN">
              <MobileAttendanceScreen role="ADMIN" title="Attendance" subtitle="Live center-wide attendance and follow-up" />
            </MobileShell>
          </MobileRequireAuth>
        )}
      />
      <Route
        path="/admin/messages"
        element={(
          <MobileRequireAuth roles={['ADMIN']}>
            <MobileShell role="ADMIN">
              <MobileAdminMessagesScreen />
            </MobileShell>
          </MobileRequireAuth>
        )}
      />
      <Route
        path="/admin/events"
        element={(
          <MobileRequireAuth roles={['ADMIN']}>
            <MobileShell role="ADMIN">
              <MobileAdminEventsScreen />
            </MobileShell>
          </MobileRequireAuth>
        )}
      />
      <Route
        path="/admin/more"
        element={(
          <MobileRequireAuth roles={['ADMIN']}>
            <MobileShell role="ADMIN">
              <MobileAdminMoreScreen />
            </MobileShell>
          </MobileRequireAuth>
        )}
      />

      <Route
        path="/educator/home"
        element={(
          <MobileRequireAuth roles={['EDUCATOR', 'ADMIN']}>
            <MobileShell role="EDUCATOR">
              <MobileEducatorHomeScreen />
            </MobileShell>
          </MobileRequireAuth>
        )}
      />
      <Route
        path="/educator/attendance"
        element={(
          <MobileRequireAuth roles={['EDUCATOR', 'ADMIN']}>
            <MobileShell role="EDUCATOR">
              <MobileEducatorAttendanceScreen />
            </MobileShell>
          </MobileRequireAuth>
        )}
      />
      <Route
        path="/educator/care"
        element={(
          <MobileRequireAuth roles={['EDUCATOR', 'ADMIN']}>
            <MobileShell role="EDUCATOR">
              <MobileEducatorCareScreen />
            </MobileShell>
          </MobileRequireAuth>
        )}
      />
      <Route
        path="/educator/messages"
        element={(
          <MobileRequireAuth roles={['EDUCATOR', 'ADMIN']}>
            <MobileShell role="EDUCATOR">
              <MobileEducatorMessagesScreen />
            </MobileShell>
          </MobileRequireAuth>
        )}
      />
      <Route
        path="/educator/schedule"
        element={(
          <MobileRequireAuth roles={['EDUCATOR', 'ADMIN']}>
            <MobileShell role="EDUCATOR">
              <MobileEducatorScheduleScreen />
            </MobileShell>
          </MobileRequireAuth>
        )}
      />

      <Route
        path="/parent/home"
        element={(
          <MobileRequireAuth roles={['PARENT']}>
            <MobileShell role="PARENT">
              <MobileParentHomeScreen />
            </MobileShell>
          </MobileRequireAuth>
        )}
      />
      <Route
        path="/parent/child"
        element={(
          <MobileRequireAuth roles={['PARENT']}>
            <MobileShell role="PARENT">
              <MobileParentChildScreen />
            </MobileShell>
          </MobileRequireAuth>
        )}
      />
      <Route
        path="/parent/messages"
        element={(
          <MobileRequireAuth roles={['PARENT']}>
            <MobileShell role="PARENT">
              <MobileParentMessagesScreen />
            </MobileShell>
          </MobileRequireAuth>
        )}
      />
      <Route
        path="/parent/billing"
        element={(
          <MobileRequireAuth roles={['PARENT']}>
            <MobileShell role="PARENT">
              <MobileParentBillingScreen />
            </MobileShell>
          </MobileRequireAuth>
        )}
      />
      <Route
        path="/parent/events"
        element={(
          <MobileRequireAuth roles={['PARENT']}>
            <MobileShell role="PARENT">
              <MobileParentEventsScreen />
            </MobileShell>
          </MobileRequireAuth>
        )}
      />

      <Route
        path="/settings"
        element={(
          <MobileRequireAuth>
            <MobileSettingsPage />
          </MobileRequireAuth>
        )}
      />

      <Route path="/today" element={<LegacyRedirect />} />
      <Route path="/dashboard" element={<LegacyRedirect />} />
      <Route path="/attendance" element={<LegacyRedirect />} />
      <Route path="/events" element={<LegacyRedirect />} />
      <Route path="/finance" element={<LegacyRedirect />} />
      <Route path="/newsletters" element={<LegacyRedirect />} />
      <Route path="/educator/dashboard" element={<LegacyRedirect />} />
      <Route path="/educator/my-schedule" element={<LegacyRedirect />} />
      <Route path="/educator/my-hours" element={<LegacyRedirect />} />
      <Route path="/educator/my-paystubs" element={<LegacyRedirect />} />
      <Route path="/parent/dashboard" element={<LegacyRedirect />} />
      <Route path="/parent/children" element={<LegacyRedirect />} />
      <Route path="/parent/invoices" element={<LegacyRedirect />} />

      <Route path="*" element={<Navigate to={user ? getRoleHomePath(user) : '/login'} replace />} />
    </Routes>
  );
}

export function MobileApp() {
  return (
    <BrowserRouter>
      <MobileRoutes />
    </BrowserRouter>
  );
}

export default MobileApp;
